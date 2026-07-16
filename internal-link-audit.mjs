#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

// ---------- CONFIG ----------
const CONTENT_DIR = 'content';
const UNDERLINKED_THRESHOLD = 3;   // pages with fewer TOTAL inbound links than this get flagged
const MIN_OUTBOUND_LINKS = 3;      // pages with this many outbound internal links or fewer get flagged
const TARGET_OUTBOUND_LINKS = 5;   // suggestions top up to roughly this many
const RECIPROCAL_LIMIT = 50;       // cap on reciprocal-link-opportunity rows in the report
// Minimum relevanceScore for a reciprocal-link suggestion, matching
// MIN_CONFIDENT_SCORE. Checked against the real distribution with
// DEBUG_SCORE_DIST=1 (cosine similarity scale): p90=2.1, max=3.24 across 281
// unlinked-back pairs, so 3 left only a single suggestion site-wide - too
// strict for what's meant to be a top-10%-ish opportunity list. Re-check this
// if the content set changes a lot.
const RECIPROCAL_MIN_SCORE = 2;
const GSC_CSV_PATH = 'gsc-pages.csv';
const SITEMAP_FILE = 'app/sitemap.ts'; // used as the source of truth for real URLs where possible

// Flat list of pillar/hub article URL paths. A cluster (folder) can have more
// than one pillar - each is checked independently against the other pages in
// its folder.
const PILLAR_ARTICLES = [
  '/academy-pathway/how-academy-football-works',
  '/academy-pathway/uk-football-development-centres-explained',
  '/academy-pathway/development-centres-vs-academies',
  '/academy-pathway/academy-categories-explained',
  '/academy-pathway/what-is-eppp',
  '/academy-trials/football-academy-trials-uk',
  '/parent-guides/what-is-the-junior-premier-league',
  '/parent-guides/what-is-grassroots-football',
  '/girls-football/how-girls-football-academies-work',
];

// Headings that mark the start of a "Related Articles" style footer section.
// Links found BEFORE this heading count as contextual (more valuable).
// Links found AFTER it count as related/footer links.
const RELATED_HEADING_REGEX = /^#{1,4}\s*(Related Articles|Related Reading|Further Reading|You Might Also Like)\s*$/im;

// Generic anchor text worth flagging and improving.
const WEAK_ANCHORS = [
  'here', 'click here', 'read more', 'this article', 'this guide', 'this page',
  'learn more', 'find out more',
];
// -----------------------------

function normaliseAnchor(text) {
  return text.toLowerCase().replace(/[.!?]+$/, '').trim();
}

function isWeakAnchor(anchor) {
  return WEAK_ANCHORS.includes(normaliseAnchor(anchor));
}

// ---------- optional Search Console CSV ----------
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length === 0) return [];
  const splitLine = (line) => {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

function loadGSCData() {
  if (!fs.existsSync(GSC_CSV_PATH)) {
    console.log(`No ${GSC_CSV_PATH} found - skipping Search Console weighting.`);
    return null;
  }
  const raw = fs.readFileSync(GSC_CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  const map = {};
  for (const row of rows) {
    const rawUrl = row.page || row.url || row.landing_page || '';
    if (!rawUrl) continue;
    let urlPath = rawUrl.trim();
    if (urlPath.includes('footballparent.co.uk')) {
      urlPath = urlPath.replace(/^https?:\/\/(www\.)?[^/]+/, '');
    }
    urlPath = urlPath.split('#')[0].replace(/\/$/, '');
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
    map[urlPath] = {
      clicks: Number(row.clicks || 0) || 0,
      impressions: Number(row.impressions || 0) || 0,
    };
  }
  console.log(`Loaded Search Console data for ${Object.keys(map).length} URL(s) from ${GSC_CSV_PATH}.`);
  return map;
}

function loadSitemapRoutes() {
  if (!fs.existsSync(SITEMAP_FILE)) {
    console.log(`No ${SITEMAP_FILE} found - falling back to folder-based URL guessing for every page.`);
    return null;
  }
  const raw = fs.readFileSync(SITEMAP_FILE, 'utf8');
  const arrayMatch = raw.match(/const\s+routes\s*=\s*\[([\s\S]*?)\]/);
  if (!arrayMatch) {
    console.log(`Could not find a "routes" array in ${SITEMAP_FILE} - falling back to folder-based URL guessing.`);
    return null;
  }
  const routes = [];
  const strRe = /'([^']*)'|"([^"]*)"/g;
  let m;
  while ((m = strRe.exec(arrayMatch[1]))) {
    let r = (m[1] ?? m[2]).trim();
    if (r === '') continue; // skip homepage
    if (!r.startsWith('/')) r = '/' + r; // fix any missing leading slash
    routes.push(r);
  }
  console.log(`Loaded ${routes.length} route(s) from ${SITEMAP_FILE}.`);
  return routes;
}

// ---------- page loading ----------
function loadPages(sitemapRoutes) {
  const files = glob.sync(`${CONTENT_DIR}/**/*.mdx`);
  const pages = [];

  // slug -> list of full sitemap routes ending in that slug
  const slugToRoutes = {};
  if (sitemapRoutes) {
    for (const r of sitemapRoutes) {
      const slug = r.split('/').filter(Boolean).pop();
      if (!slug) continue;
      (slugToRoutes[slug] ||= []).push(r);
    }
  }

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);

    const rel = path.relative(CONTENT_DIR, file).replace(/\.mdx$/, '');
    const parts = rel.split(path.sep);
    const categoryFolder = parts[0];
    const guessedUrlPath = '/' + parts.join('/');
    const slug = parts[parts.length - 1];

    let urlPath = guessedUrlPath;
    if (sitemapRoutes) {
      const candidates = (slugToRoutes[slug] || []).filter((r) => r.startsWith('/' + categoryFolder + '/'));
      if (candidates.length === 1) {
        urlPath = candidates[0];
        if (urlPath !== guessedUrlPath) {
          console.log(`URL corrected from sitemap: ${guessedUrlPath} -> ${urlPath}`);
        }
      } else if (candidates.length === 0) {
        console.log(`Warning: no sitemap route found for ${file} (slug "${slug}") - using guessed URL ${guessedUrlPath}. Check this is correct.`);
      } else {
        console.log(`Warning: multiple sitemap routes match slug "${slug}" for ${file} - using guessed URL ${guessedUrlPath}. Check manually.`);
      }
    }

    const relatedMatch = RELATED_HEADING_REGEX.exec(content);
    const relatedSectionIndex = relatedMatch ? relatedMatch.index : Infinity;

    const headings = [];
    const headingRe = /^#{2,3}\s+(.+)$/gm;
    let hm;
    while ((hm = headingRe.exec(content))) {
      headings.push({ text: hm[1].trim(), index: hm.index });
    }

    // (?:\r?\n){2,} rather than \n{2,} - CRLF files (23 of 65 in this repo) have a
    // \r between every \n, so two consecutive blank-line newlines are "\r\n\r\n",
    // which \n{2,} never matches. Getting this wrong silently treated the entire
    // rest of the article as one giant paragraph for every CRLF file.
    const paragraphs = content
      .split(/(?:\r?\n){2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20 && !p.startsWith('import ') && !p.startsWith('export '));

    pages.push({
      file,
      urlPath,
      title: data.title || rel,
      description: data.description || '',
      categoryFolder,
      categoryLabel: data.category || categoryFolder,
      content,
      relatedSectionIndex,
      headings,
      paragraphs,
      outboundLinks: [],
    });
  }
  return pages;
}

function extractInternalLinks(page, pages) {
  const found = [];
  const patterns = [
    /\[([^\]]+)\]\(([^)]+)\)/g,
    /<Link[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</g,
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(page.content))) {
      const isMarkdown = re === patterns[0];
      let href = isMarkdown ? m[2] : m[1];
      const anchorText = isMarkdown ? m[1] : m[2];

      href = href.trim();
      if (href.includes('footballparent.co.uk')) {
        href = href.replace(/^https?:\/\/(www\.)?[^/]+/, '');
      }
      if (!href.startsWith('/')) continue; // external, mailto, anchor-only
      href = href.split('#')[0].replace(/\/$/, '');

      const target = pages.find((p) => p.urlPath === href);
      if (target && target.urlPath !== page.urlPath) {
        found.push({
          anchorText: anchorText.trim(),
          targetPath: href,
          index: m.index,
          contextual: m.index < page.relatedSectionIndex,
        });
      }
    }
  }
  return found;
}

// Common English function words - filtered out before scoring alongside the
// site-wide-generic-word handling below (that part is statistical, not a list).
const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'will', 'your', 'their', 'about', 'there',
  'which', 'would', 'should', 'could', 'into', 'than', 'then', 'when', 'what', 'where',
  'while', 'some', 'more', 'most', 'such', 'only', 'also', 'been', 'being', 'were',
  'they', 'them', 'these', 'those', 'just', 'like', 'over', 'under', 'after', 'before',
  'both', 'each', 'every', 'through', 'because', 'other', 'still', 'even', 'much',
  'many', 'very', 'really', 'around', 'again', 'without', 'between', 'during',
  'however', 'among', 'across', 'within', 'toward', 'towards', 'once', 'here', 'above',
  'below', 'same', 'does', 'doing', 'having', 'ours', 'yours', 'theirs',
]);

function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

// Relevance is judged on full article body content (not just title/description -
// one sentence rarely has enough distinctive vocabulary to tell two genuinely
// related articles apart from two that just happen to share a category and some
// generic phrasing), weighted by how RARE each word is across the whole site -
// standard TF-IDF. DOC_FREQ/TOTAL_PAGES are populated once by buildDocFrequency()
// before any scoring happens.
//
// Scoring is cosine similarity between each page's TF-IDF vector, not a raw sum
// of shared words' IDF. The raw sum was tried first and had a real flaw: two
// long articles inevitably share hundreds of moderately-rare words (site-wide)
// that are still just same-genre boilerplate between them specifically ("tiers",
// "booking", "regulations", "geography" showed up as top contributors between a
// JPL explainer and a West Ham development centre guide - real words, no genuine
// connection). Cosine similarity normalises by each document's own vector length,
// so raw word-count no longer inflates the score just because both articles are
// long - only the *proportion* of a page's distinctive vocabulary that's shared
// counts. It still can't understand meaning, only word statistics, so two
// same-cluster articles in the same format (e.g. two club development-centre
// guides) can still score moderately even when not specifically about each
// other - see MIN_CONFIDENT_SCORE below, which exists specifically so the
// report doesn't state a suggestion with more confidence than the signal
// actually supports.
let DOC_FREQ = {};
let TOTAL_PAGES = 0;

function pageWordSet(page) {
  if (!page._wordSet) {
    page._wordSet = new Set(tokenize(`${page.title} ${page.description} ${page.content}`));
  }
  return page._wordSet;
}

function buildDocFrequency(pages) {
  TOTAL_PAGES = pages.length;
  DOC_FREQ = {};
  for (const page of pages) {
    for (const w of pageWordSet(page)) {
      DOC_FREQ[w] = (DOC_FREQ[w] || 0) + 1;
    }
  }
}

// Term-frequency-weighted TF-IDF vector for a page, with sublinear TF scaling
// (1 + log(count)) so a word mentioned 20 times isn't 20x as important as one
// mentioned once, and words present in every page (idf <= 0) are dropped
// entirely rather than diluting the vector with zero-signal terms.
function pageTfIdfVector(page) {
  if (page._tfidfVector) return page._tfidfVector;
  const counts = {};
  for (const w of tokenize(`${page.title} ${page.description} ${page.content}`)) {
    counts[w] = (counts[w] || 0) + 1;
  }
  const vector = {};
  let magnitudeSq = 0;
  for (const [w, count] of Object.entries(counts)) {
    const df = DOC_FREQ[w] || TOTAL_PAGES;
    const idf = Math.log(TOTAL_PAGES / df);
    if (idf <= 0) continue;
    const weight = (1 + Math.log(count)) * idf;
    vector[w] = weight;
    magnitudeSq += weight * weight;
  }
  page._tfidfVector = { vector, magnitude: Math.sqrt(magnitudeSq) };
  return page._tfidfVector;
}

function relevanceScore(a, b) {
  if (a.urlPath === b.urlPath) return -1;
  // Same-category is a light nudge, not the dominant signal - real content
  // overlap (via cosine similarity below) does the actual work.
  let score = a.categoryFolder === b.categoryFolder ? 0.3 : 0;

  const vecA = pageTfIdfVector(a);
  const vecB = pageTfIdfVector(b);
  if (vecA.magnitude > 0 && vecB.magnitude > 0) {
    const [smaller, larger] = Object.keys(vecA.vector).length <= Object.keys(vecB.vector).length
      ? [vecA.vector, vecB.vector]
      : [vecB.vector, vecA.vector];
    let dot = 0;
    for (const w in smaller) {
      if (larger[w]) dot += smaller[w] * larger[w];
    }
    score += (dot / (vecA.magnitude * vecB.magnitude)) * 10; // scale cosine (0-1) to a readable 0-10-ish range
  }
  return Math.round(score * 100) / 100;
}

// Below this, a candidate is "the best available" rather than "clearly related" -
// the report says so explicitly instead of naming a pick with false confidence.
// Calibrated against the real score distribution (DEBUG_SCORE_DIST=1) after
// switching to cosine similarity.
const MIN_CONFIDENT_SCORE = 2;

function suggestAnchors(page) {
  const options = new Set();
  if (page.title) options.add(page.title.replace(/\s*\|.*$/, '').trim());
  const slug = page.urlPath.split('/').pop().replace(/-/g, ' ');
  const slugPhrase = slug.charAt(0).toUpperCase() + slug.slice(1);
  options.add(slugPhrase);
  for (const h of page.headings.slice(0, 3)) {
    if (h.text && h.text.toLowerCase() !== page.title.toLowerCase()) options.add(h.text);
  }
  return [...options].slice(0, 3);
}

function splitSentences(paragraph) {
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Same split/filter rules as loadPages()'s page.paragraphs, but keeping each
// paragraph's character offset in the raw content so a link's raw-content
// index (from extractInternalLinks) can be mapped back to a paragraph number -
// needed to tell the coach exactly which of several duplicate mentions to remove.
function paragraphsWithOffsets(content) {
  // Same (?:\r?\n){2,} reasoning as loadPages() - must match loadPages()'s split
  // exactly (paragraph text/order/count) or paragraphIndex numbers here would
  // point at the wrong paragraph relative to page.paragraphs everywhere else.
  const pieces = content.split(/((?:\r?\n){2,})/); // capturing group keeps separators in the array
  const result = [];
  let offset = 0;
  for (const piece of pieces) {
    const trimmed = piece.trim();
    if (trimmed.length > 20 && !trimmed.startsWith('import ') && !trimmed.startsWith('export ')) {
      const start = offset + piece.indexOf(trimmed);
      result.push({ text: trimmed, start, end: start + trimmed.length });
    }
    offset += piece.length;
  }
  return result;
}

function paragraphNumberForIndex(page, charIndex) {
  if (!page._paragraphOffsets) page._paragraphOffsets = paragraphsWithOffsets(page.content);
  const list = page._paragraphOffsets;
  for (let i = 0; i < list.length; i++) {
    if (charIndex >= list[i].start && charIndex <= list[i].end) return i + 1;
  }
  let nearest = null;
  for (let i = 0; i < list.length; i++) {
    if (list[i].start <= charIndex) nearest = i + 1;
  }
  return nearest;
}

function paragraphExcerpt(page, paragraphIndex) {
  const para = page.paragraphs[paragraphIndex - 1];
  return para ? para.slice(0, 160).replace(/\s+/g, ' ') : null;
}

function inlineAnchorPhrase(target) {
  let phrase = target.title.replace(/\s*\|.*$/, '').trim();
  phrase = phrase.replace(/[?!:]+$/, '');
  if (phrase.length === 0) return target.urlPath.split('/').pop().replace(/-/g, ' ');
  return phrase.charAt(0).toLowerCase() + phrase.slice(1);
}

function paragraphHasLink(text) {
  return /\[[^\]]+\]\([^)]+\)/.test(text);
}

// The target's most distinctive vocabulary (by TF-IDF weight), reusing the
// same vector relevanceScore() already computes. Matching a source paragraph
// against this - instead of just the target's title/description - is what
// makes "which paragraph" reflect what the target article is actually about
// in depth, not just its headline framing.
function targetTopicWords(target, limit = 25) {
  if (target._topicWords) return target._topicWords;
  const { vector } = pageTfIdfVector(target);
  const sorted = Object.entries(vector).sort((a, b) => b[1] - a[1]).slice(0, limit);
  target._topicWords = new Map(sorted); // word -> weight
  return target._topicWords;
}

// A paragraph needs at least this much weighted overlap with the target's
// topic words to count as a genuine match, not a coincidental one-word hit.
// Below this, forcing a "best" paragraph produces a technically-non-empty but
// substantively unrelated insertion point - which is worse than admitting no
// good spot was found.
const MIN_PARAGRAPH_OVERLAP_WEIGHT = 3;

// Finds the best paragraph to add a new link in. Prefers a paragraph that
// doesn't already contain a link - two links in one paragraph reads as spammy -
// and only falls back to a linked paragraph if no link-free paragraph clears
// the overlap floor. If nothing clears it anywhere, says so explicitly rather
// than pointing at a paragraph that doesn't actually relate to the target.
function findBestParagraph(source, target) {
  const targetWords = targetTopicWords(target);

  let best = null; // best among paragraphs with no existing link
  let bestAny = null; // best overall, regardless of existing links (fallback)
  source.paragraphs.forEach((para, idx) => {
    const paraWords = new Set(para.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    let weight = 0;
    for (const w of paraWords) {
      if (targetWords.has(w)) weight += targetWords.get(w);
    }
    if (weight === 0) return;
    const candidate = { paragraphIndex: idx + 1, score: weight, paragraphText: para };
    if (!bestAny || weight > bestAny.score) bestAny = candidate;
    if (!paragraphHasLink(para) && (!best || weight > best.score)) best = candidate;
  });

  const strongest = best || bestAny;
  const confident = !!strongest && strongest.score >= MIN_PARAGRAPH_OVERLAP_WEIGHT;
  const chosen = confident ? strongest : null;
  const crowded = confident && !best && !!bestAny;

  const anchor = inlineAnchorPhrase(target);

  if (!chosen) {
    return {
      paragraphIndex: null,
      excerpt: 'No paragraph has strong enough overlap with what this article actually covers - add manually where it fits, or reconsider whether this pairing belongs at all.',
      nearestSentence: null,
      pasteReadySentence: `You may want to link to our guide on [${anchor}](${target.urlPath}) somewhere relevant.`,
      crowded: false,
      confident: false,
    };
  }

  const sentences = splitSentences(chosen.paragraphText);
  let bestSentence = sentences[0] || chosen.paragraphText.slice(0, 140);
  let bestSentenceScore = -1;
  for (const s of sentences) {
    const sWords = new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    let sWeight = 0;
    for (const w of sWords) {
      if (targetWords.has(w)) sWeight += targetWords.get(w);
    }
    if (sWeight > bestSentenceScore) {
      bestSentenceScore = sWeight;
      bestSentence = s;
    }
  }

  const pasteReadySentence = `This is covered in more detail in our guide on [${anchor}](${target.urlPath}).`;

  return {
    paragraphIndex: chosen.paragraphIndex,
    excerpt: chosen.paragraphText.slice(0, 140).replace(/\s+/g, ' '),
    nearestSentence: bestSentence.replace(/\s+/g, ' '),
    pasteReadySentence,
    crowded,
    confident: true,
  };
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function priorityFromLevel(level, urlPath, gscMap) {
  const order = ['Low', 'Medium', 'High'];
  let idx = order.indexOf(level);
  if (gscMap && gscMap[urlPath]) {
    const { clicks, impressions } = gscMap[urlPath];
    if (clicks > 0 || impressions > 50) idx = Math.min(idx + 1, order.length - 1);
  }
  return order[idx];
}

function run() {
  const sitemapRoutes = loadSitemapRoutes();
  const pages = loadPages(sitemapRoutes);
  if (pages.length === 0) {
    console.error(`No .mdx files found under "${CONTENT_DIR}". Check you're running this from your project root.`);
    process.exit(1);
  }

  const gscMap = loadGSCData();
  buildDocFrequency(pages);

  const inboundLinks = {}; // urlPath -> [{ from, anchorText, contextual }]
  pages.forEach((p) => (inboundLinks[p.urlPath] = []));

  for (const page of pages) {
    page.outboundLinks = extractInternalLinks(page, pages);
    for (const link of page.outboundLinks) {
      if (inboundLinks[link.targetPath]) {
        inboundLinks[link.targetPath].push({
          from: page.urlPath,
          anchorText: link.anchorText,
          contextual: link.contextual,
        });
      }
    }
  }

  const byPath = Object.fromEntries(pages.map((p) => [p.urlPath, p]));

  function inboundStats(urlPath) {
    const list = inboundLinks[urlPath] || [];
    return {
      total: list.length,
      contextual: list.filter((l) => l.contextual).length,
      related: list.filter((l) => !l.contextual).length,
      sources: list,
    };
  }

  function outboundStats(page) {
    return {
      total: page.outboundLinks.length,
      contextual: page.outboundLinks.filter((l) => l.contextual).length,
      related: page.outboundLinks.filter((l) => !l.contextual).length,
    };
  }

  function rankedCandidates(page, excludePaths) {
    return pages
      .map((other) => {
        const score = relevanceScore(page, other);
        return { other, score, confident: score >= MIN_CONFIDENT_SCORE };
      })
      .filter((r) => r.score > 0 && !excludePaths.has(r.other.urlPath))
      .sort((a, b) => b.score - a.score);
  }

  // Prefers candidates that clear the confidence floor; only falls back to a
  // weak one if nothing does, so a genuinely link-starved page still gets a
  // suggestion instead of silence - callers must check `.confident` and flag
  // it in their reasoning text rather than stating a weak pick as certain.
  function confidentFirst(ranked) {
    const confident = ranked.filter((c) => c.confident);
    return confident.length ? confident : ranked;
  }

  // Computed early so section 3's overlinking fixes can prioritise a missing
  // pillar link over a generic alternative when one applies to the same page -
  // one edit then fixes two findings at once. Reused as-is by section 7.
  const missingPillarsByPage = {}; // urlPath -> [{ pillarPath, pillarTitle }]
  for (const pillarPath of PILLAR_ARTICLES) {
    const pillar = byPath[pillarPath];
    if (!pillar) continue;
    const clusterPages = pages.filter(
      (p) => p.categoryFolder === pillar.categoryFolder && p.urlPath !== pillarPath && !PILLAR_ARTICLES.includes(p.urlPath)
    );
    for (const p of clusterPages) {
      const alreadyLinks = p.outboundLinks.some((l) => l.targetPath === pillarPath);
      if (!alreadyLinks) {
        (missingPillarsByPage[p.urlPath] ||= []).push({ pillarPath, pillarTitle: pillar.title });
      }
    }
  }
  // (sourceUrlPath|pillarPath) pairs resolved via a section-3 suggestion instead of
  // getting their own standalone "missing link to pillar" task in section 7.
  const pillarGapHandledByOverlink = new Set();

  const csvRows = [];

  // ---------- 1. Pages with too few (total) inbound links ----------
  const underlinked = pages
    .filter((p) => inboundStats(p.urlPath).total < UNDERLINKED_THRESHOLD)
    .sort((a, b) => inboundStats(a.urlPath).total - inboundStats(b.urlPath).total);

  const underlinkedReport = underlinked.map((target) => {
    const stats = inboundStats(target.urlPath);
    const already = new Set(stats.sources.map((l) => l.from));
    already.add(target.urlPath);
    const candidates = confidentFirst(rankedCandidates(target, already)).slice(0, 4);
    const suggestions = candidates.map((c) => ({
      ...c,
      anchors: suggestAnchors(target),
      location: findBestParagraph(c.other, target),
    }));
    return { target, stats, suggestions };
  });

  for (const r of underlinkedReport) {
    const level = r.stats.total === 0 ? 'High' : 'Medium';
    for (const s of r.suggestions.slice(0, 2)) {
      const weakNote = s.confident ? '' : ' - weak content overlap, verify relevance manually';
      csvRows.push({
        Priority: priorityFromLevel(level, r.target.urlPath, gscMap),
        Type: 'Underlinked page',
        Source: s.other.urlPath,
        Target: r.target.urlPath,
        'Suggested Anchor': s.anchors[0] || r.target.title,
        'Suggested Location': s.location.paragraphIndex
          ? `Paragraph ${s.location.paragraphIndex}`
          : 'No obvious paragraph match',
        'Nearest Existing Sentence': s.location.nearestSentence || '',
        'Paste-Ready Sentence': s.location.pasteReadySentence,
        Reason: `Only ${r.stats.total} total inbound link(s) (${r.stats.contextual} contextual)${weakNote}`,
        Done: '',
      });
    }
  }

  // ---------- 2. Orphan / near-orphan pages ----------
  const orphanReport = pages
    .map((p) => ({ page: p, stats: inboundStats(p.urlPath) }))
    .filter((r) => r.stats.total === 0 || r.stats.contextual === 0)
    .sort((a, b) => a.stats.total - b.stats.total);

  for (const r of orphanReport) {
    if (csvRows.some((row) => row.Target === r.page.urlPath && row.Type === 'Underlinked page')) continue;
    const already = new Set(r.stats.sources.map((l) => l.from));
    already.add(r.page.urlPath);
    const candidates = confidentFirst(rankedCandidates(r.page, already)).slice(0, 2);
    for (const c of candidates) {
      const location = findBestParagraph(c.other, r.page);
      const weakNote = c.confident ? '' : ' - weak content overlap, verify relevance manually';
      csvRows.push({
        Priority: 'High',
        Type: r.stats.total === 0 ? 'Orphan page' : 'Zero contextual links',
        Source: c.other.urlPath,
        Target: r.page.urlPath,
        'Suggested Anchor': suggestAnchors(r.page)[0] || r.page.title,
        'Suggested Location': location.paragraphIndex
          ? `Paragraph ${location.paragraphIndex}`
          : 'No obvious paragraph match',
        'Nearest Existing Sentence': location.nearestSentence || '',
        'Paste-Ready Sentence': location.pasteReadySentence,
        Reason:
          (r.stats.total === 0
            ? 'Zero inbound links from anywhere on the site'
            : `${r.stats.total} inbound link(s) but none in body text (all footer/related only)`) + weakNote,
        Done: '',
      });
    }
  }

  // ---------- 3. Overlinking ----------
  // Tiered by how likely the duplicate actually hurts the page, not just whether
  // one exists:
  //   Tier 1 (high):   3+ mentions of the same target - unconditionally worth trimming.
  //   Tier 2 (medium):  exactly 2 mentions, both in the body (contextual) - worth a
  //                      look, but not automatically wrong.
  //   Tier 3 (low):     exactly 2 mentions, one contextual + one in Related Articles -
  //                      only flagged if a genuinely better candidate exists for that
  //                      related-articles slot. If the duplicated target is already the
  //                      most relevant thing to put there, having it in both places is
  //                      fine (e.g. a recruitment article linking to both trials and
  //                      "what coaches look for" in-body and in Related Articles), so
  //                      it's left alone rather than flagged.
  const overlinkReport = [];
  for (const page of pages) {
    const counts = {};
    const contextualCounts = {};
    for (const link of page.outboundLinks) {
      counts[link.targetPath] = (counts[link.targetPath] || 0) + 1;
      if (link.contextual) contextualCounts[link.targetPath] = (contextualCounts[link.targetPath] || 0) + 1;
    }
    const duplicated = Object.entries(counts).filter(([, count]) => count > 1);
    if (duplicated.length === 0) continue;

    const linkedPaths = new Set(page.outboundLinks.map((l) => l.targetPath));
    const alternativesPool = rankedCandidates(page, linkedPaths);
    // Every duplicate fixed on this page (tier 1 or tier 3) needs its own distinct
    // replacement - recommending the same single best alternative for two
    // different slots would just trade one duplicate for another.
    const claimedReplacements = new Set();
    const pillarOptions = (missingPillarsByPage[page.urlPath] || []).filter(
      (opt) => !linkedPaths.has(opt.pillarPath)
    );

    const items = [];
    for (const [targetPath, count] of duplicated) {
      const ctxCount = contextualCounts[targetPath] || 0;
      const target = byPath[targetPath];
      const title = target?.title || targetPath;
      const currentScore = target ? relevanceScore(page, target) : 0;

      if (count >= 3) {
        // Which of the 3+ mentions to remove: a Related Articles occurrence is
        // the least disruptive to cut (no prose to rewrite), so prefer that if
        // one exists; otherwise cut the latest contextual mention and keep the
        // first (usually the one that first introduces the topic naturally).
        const occurrences = page.outboundLinks
          .filter((l) => l.targetPath === targetPath)
          .map((l) => ({ ...l, paragraphIndex: paragraphNumberForIndex(page, l.index) }));
        const nonContextualOccurrence = occurrences.find((o) => !o.contextual);
        const toRemove = nonContextualOccurrence || [...occurrences].sort((a, b) => b.index - a.index)[0];
        const removeExcerpt = toRemove.contextual && toRemove.paragraphIndex
          ? paragraphExcerpt(page, toRemove.paragraphIndex)
          : null;

        // Trimming this down to 1-2 mentions frees up a slot - prefer filling it
        // with a pillar this page doesn't yet link to (fixes section 7's gap at
        // the same time) over a generic best-scoring alternative.
        let replacement = null;
        const pillarPick = pillarOptions.find((opt) => !claimedReplacements.has(opt.pillarPath));
        if (pillarPick) {
          replacement = { other: { title: pillarPick.pillarTitle, urlPath: pillarPick.pillarPath }, score: null, viaPillarGap: true };
          claimedReplacements.add(pillarPick.pillarPath);
          pillarGapHandledByOverlink.add(`${page.urlPath}|${pillarPick.pillarPath}`);
        } else {
          // Only a candidate that clears the confidence floor is worth naming -
          // otherwise "no strong alternative found" (below) is more honest than
          // a specific-sounding pick backed by a weak signal.
          const alt = alternativesPool.find((c) => c.confident && !claimedReplacements.has(c.other.urlPath));
          if (alt) {
            replacement = alt;
            claimedReplacements.add(alt.other.urlPath);
          }
        }
        const insertLocation = replacement ? findBestParagraph(page, byPath[replacement.other.urlPath] || replacement.other) : null;
        items.push({ targetPath, title, count, tier: 1, currentScore, replacement, toRemove, removeExcerpt, insertLocation });
      } else if (ctxCount === 1) {
        const better = alternativesPool.find(
          (c) => c.confident && c.score > currentScore && !claimedReplacements.has(c.other.urlPath)
        );
        if (!better) continue; // already the best pick for that related-articles slot
        claimedReplacements.add(better.other.urlPath);
        items.push({ targetPath, title, count, tier: 3, currentScore, replacement: better });
      } else {
        items.push({ targetPath, title, count, tier: 2, currentScore });
      }
    }
    if (items.length === 0) continue;
    items.sort((a, b) => a.tier - b.tier);

    overlinkReport.push({
      from: page.urlPath,
      title: page.title,
      worstTier: Math.min(...items.map((i) => i.tier)),
      duplicates: items,
    });
  }
  overlinkReport.sort((a, b) => a.worstTier - b.worstTier);

  for (const r of overlinkReport) {
    for (const d of r.duplicates) {
      if (d.tier === 1) {
        const removalNote = d.toRemove.contextual
          ? (d.removeExcerpt
              ? `remove the mention in paragraph ${d.toRemove.paragraphIndex} ("${d.removeExcerpt}")`
              : `remove one contextual mention (paragraph ${d.toRemove.paragraphIndex})`)
          : 'remove the Related Articles entry for this link';
        const additionNote = d.replacement
          ? d.replacement.viaPillarGap
            ? `use the freed slot for pillar "${d.replacement.other.title}", which this page doesn't link to yet (also resolves a section 7 gap)`
            : `use the freed slot for "${d.replacement.other.title}" (relevance ${d.replacement.score}) instead`
          : 'no strong alternative found - just cut back to 1-2 mentions';
        const suggestedLocation = d.insertLocation && d.insertLocation.paragraphIndex
          ? `Paragraph ${d.insertLocation.paragraphIndex}${d.insertLocation.crowded ? ' (already has a link in it - check it still reads cleanly)' : ''}`
          : d.insertLocation ? d.insertLocation.excerpt : '';
        csvRows.push({
          Priority: priorityFromLevel('High', r.from, gscMap),
          Type: 'Overlinking (3+ mentions)',
          Source: r.from,
          Target: d.targetPath,
          'Suggested Anchor': d.replacement ? d.replacement.other.title : '',
          'Suggested Location': suggestedLocation,
          'Nearest Existing Sentence': d.insertLocation ? d.insertLocation.nearestSentence || '' : '',
          'Paste-Ready Sentence': d.insertLocation ? d.insertLocation.pasteReadySentence : '',
          Reason: `Linked ${d.count} times - ${removalNote}, then ${additionNote}`,
          Done: '',
        });
      } else if (d.tier === 3) {
        csvRows.push({
          Priority: priorityFromLevel('Low', r.from, gscMap),
          Type: 'Overlinking (related-slot swap)',
          Source: r.from,
          Target: d.targetPath,
          'Suggested Anchor': d.replacement.other.title,
          'Suggested Location': 'Related Articles list',
          'Nearest Existing Sentence': '',
          'Paste-Ready Sentence': `Replace the Related Articles entry for "${d.title}" (${d.targetPath}) with [${d.replacement.other.title}](${d.replacement.other.urlPath}).`,
          Reason: `Already linked contextually to "${d.title}" (relevance ${d.currentScore}) - "${d.replacement.other.title}" (relevance ${d.replacement.score}) is a better fit for the remaining related-articles slot`,
          Done: '',
        });
      }
      // tier 2 stays report-only - which of the two mentions to trim is an editorial call
    }
  }

  // ---------- 4. Pages with too few outbound links ----------
  const sparseOutboundReport = [];
  for (const page of pages) {
    const stats = outboundStats(page);
    if (stats.total > MIN_OUTBOUND_LINKS) continue;
    const linkedPaths = new Set(page.outboundLinks.map((l) => l.targetPath));
    const needed = TARGET_OUTBOUND_LINKS - stats.total;
    const candidates = confidentFirst(rankedCandidates(page, linkedPaths)).slice(0, Math.max(needed, 0));
    if (candidates.length) {
      sparseOutboundReport.push({ page, stats, candidates });
    }
  }

  for (const r of sparseOutboundReport) {
    for (const c of r.candidates.slice(0, 2)) {
      const location = findBestParagraph(r.page, c.other);
      const weakNote = c.confident ? '' : ' - weak content overlap, verify relevance manually';
      csvRows.push({
        Priority: priorityFromLevel('Medium', r.page.urlPath, gscMap),
        Type: 'Too few outbound links',
        Source: r.page.urlPath,
        Target: c.other.urlPath,
        'Suggested Anchor': suggestAnchors(c.other)[0] || c.other.title,
        'Suggested Location': location.paragraphIndex
          ? `Paragraph ${location.paragraphIndex}`
          : 'No obvious paragraph match',
        'Nearest Existing Sentence': location.nearestSentence || '',
        'Paste-Ready Sentence': location.pasteReadySentence,
        Reason: `Only ${r.stats.total} outbound link(s) currently (aiming for ~${TARGET_OUTBOUND_LINKS})${weakNote}`,
        Done: '',
      });
    }
  }

  // ---------- 5. Weak anchor text ----------
  const weakAnchorReport = [];
  for (const page of pages) {
    for (const link of page.outboundLinks) {
      if (!isWeakAnchor(link.anchorText)) continue;
      const target = byPath[link.targetPath];
      weakAnchorReport.push({
        from: page.urlPath,
        fromTitle: page.title,
        to: link.targetPath,
        toTitle: target?.title || link.targetPath,
        anchor: link.anchorText,
        suggestions: target ? suggestAnchors(target) : [],
      });
    }
  }

  // ---------- 6. Reciprocal link opportunities ----------
  const reciprocalOpportunities = [];
  for (const page of pages) {
    // Iterate unique targets, not every raw link occurrence - a page linking to
    // the same target twice (see section 3) would otherwise push the identical
    // reciprocal suggestion once per occurrence.
    const uniqueTargetPaths = new Set(page.outboundLinks.map((l) => l.targetPath));
    for (const targetPath of uniqueTargetPaths) {
      const target = byPath[targetPath];
      if (!target) continue;
      const targetLinksBack = target.outboundLinks.some((l) => l.targetPath === page.urlPath);
      if (targetLinksBack) continue;
      const score = relevanceScore(target, page);
      if (score < RECIPROCAL_MIN_SCORE) continue;
      reciprocalOpportunities.push({ from: target.urlPath, fromTitle: target.title, to: page.urlPath, toTitle: page.title, score });
    }
  }
  reciprocalOpportunities.sort((a, b) => b.score - a.score);
  if (process.env.DEBUG_SCORE_DIST) {
    const scores = [...reciprocalOpportunities].map((r) => r.score).sort((a, b) => a - b);
    const pct = (p) => scores[Math.floor((scores.length - 1) * p)];
    console.log('reciprocal candidate count (pre-cap):', scores.length);
    console.log('score percentiles: p10=%s p25=%s p50=%s p75=%s p90=%s max=%s', pct(0.1), pct(0.25), pct(0.5), pct(0.75), pct(0.9), scores[scores.length - 1]);
  }
  const reciprocalReport = reciprocalOpportunities.slice(0, RECIPROCAL_LIMIT);

  // ---------- 7. Pillar articles and cluster coverage ----------
  const pillarReport = PILLAR_ARTICLES.map((pillarPath) => {
    const pillar = byPath[pillarPath];
    if (!pillar) {
      return { pillarPath, missing: true };
    }
    const clusterPages = pages.filter(
      (p) => p.categoryFolder === pillar.categoryFolder && p.urlPath !== pillarPath && !PILLAR_ARTICLES.includes(p.urlPath)
    );
    const stats = inboundStats(pillarPath);
    const missingLinks = clusterPages.filter(
      (p) => !p.outboundLinks.some((l) => l.targetPath === pillarPath)
    );
    return { pillarPath, folder: pillar.categoryFolder, title: pillar.title, stats, clusterSize: clusterPages.length, missingLinks };
  });

  for (const r of pillarReport) {
    if (r.missing) continue;
    // Pairs already picked up by a section-3 overlinking fix get one task, not two.
    const remainingMissingLinks = r.missingLinks.filter(
      (p) => !pillarGapHandledByOverlink.has(`${p.urlPath}|${r.pillarPath}`)
    );
    for (const p of remainingMissingLinks.slice(0, 3)) {
      const location = findBestParagraph(p, byPath[r.pillarPath]);
      csvRows.push({
        Priority: priorityFromLevel('Medium', p.urlPath, gscMap),
        Type: 'Missing link to pillar',
        Source: p.urlPath,
        Target: r.pillarPath,
        'Suggested Anchor': suggestAnchors(byPath[r.pillarPath])[0] || r.title,
        'Suggested Location': location.paragraphIndex
          ? `Paragraph ${location.paragraphIndex}`
          : 'No obvious paragraph match',
        'Nearest Existing Sentence': location.nearestSentence || '',
        'Paste-Ready Sentence': location.pasteReadySentence,
        Reason: `${r.folder} cluster page does not link to pillar "${r.title}" (${r.pillarPath})`,
        Done: '',
      });
    }
  }

  // ================= WRITE MARKDOWN REPORT =================
  let md = `# Internal Link Audit\n\n_Generated ${new Date().toISOString()}_\n\n`;
  if (!gscMap) md += `_No Search Console data found (${GSC_CSV_PATH} not present) - priorities are based on link structure only._\n\n`;

  md += `## 1. Pages with too few inbound links\n\n`;
  md += `_Threshold: fewer than ${UNDERLINKED_THRESHOLD} total inbound links. Contextual (in-body) links are worth more than footer/related links._\n\n`;
  if (underlinkedReport.length === 0) md += `_None found._\n`;
  for (const r of underlinkedReport) {
    md += `### ${r.target.title} (\`${r.target.urlPath}\`)\n`;
    md += `Total inbound: ${r.stats.total} | Contextual: ${r.stats.contextual} | Related/footer: ${r.stats.related}\n\n`;
    if (r.suggestions.length === 0) {
      md += `_No strong candidates found to link from._\n\n`;
      continue;
    }
    for (const s of r.suggestions) {
      md += `- Add a link from **${s.other.title}** (\`${s.other.urlPath}\`) — relevance ${s.score}\n`;
      if (s.location.nearestSentence) {
        md += `  - Near this existing sentence (paragraph ${s.location.paragraphIndex}): "${s.location.nearestSentence}"\n`;
      } else {
        md += `  - ${s.location.excerpt}\n`;
      }
      md += `  - Paste this sentence in: "${s.location.pasteReadySentence}"\n`;
    }
    md += `\n`;
  }

  md += `\n## 2. Orphan or near-orphan pages\n\n`;
  md += `_High priority: pages with zero total inbound links, or zero contextual (in-body) inbound links._\n\n`;
  if (orphanReport.length === 0) md += `_None found._\n`;
  for (const r of orphanReport) {
    const tag = r.stats.total === 0 ? 'ORPHAN (0 inbound links)' : 'NEAR-ORPHAN (0 contextual inbound links)';
    md += `### ${r.page.title} (\`${r.page.urlPath}\`) — ${tag}\n`;
    md += `Total inbound: ${r.stats.total} | Contextual: ${r.stats.contextual} | Related/footer: ${r.stats.related}\n\n`;
  }

  md += `\n## 3. Overlinking (same target linked more than once in an article)\n\n`;
  md += `_Grouped by how likely the duplicate actually hurts the page - see each group's note before acting on it._\n\n`;
  {
    const tier1 = [];
    const tier2 = [];
    const tier3 = [];
    for (const r of overlinkReport) {
      for (const d of r.duplicates) {
        const row = { from: r.from, fromTitle: r.title, ...d };
        (d.tier === 1 ? tier1 : d.tier === 2 ? tier2 : tier3).push(row);
      }
    }

    md += `### 3a. High priority — 3 or more links to the same target (${tier1.length})\n\n`;
    md += `_Unconditionally worth trimming back to one or two mentions. Where this page also has a missing pillar link (section 7), the freed-up slot is suggested for that first — one edit resolves both findings. The suggested insertion spot avoids paragraphs that already have a link, so this never trades one duplicate for a different kind of overlinking._\n\n`;
    if (tier1.length === 0) md += `_None found._\n\n`;
    for (const d of tier1) {
      md += `- **${d.fromTitle}** (\`${d.from}\`) links to **${d.title}** (\`${d.targetPath}\`) ${d.count} times\n`;
      if (d.toRemove.contextual && d.removeExcerpt) {
        md += `  - Remove: the mention in paragraph ${d.toRemove.paragraphIndex} — "${d.removeExcerpt}"\n`;
      } else if (d.toRemove.contextual) {
        md += `  - Remove: the contextual mention in paragraph ${d.toRemove.paragraphIndex}\n`;
      } else {
        md += `  - Remove: the Related Articles entry for this link\n`;
      }
      if (d.replacement && d.replacement.viaPillarGap) {
        md += `  - Add instead: pillar **${d.replacement.other.title}** (\`${d.replacement.other.urlPath}\`) — this page doesn't link to it yet, so this also fixes a section 7 gap\n`;
      } else if (d.replacement) {
        md += `  - Add instead: **${d.replacement.other.title}** (\`${d.replacement.other.urlPath}\`, relevance ${d.replacement.score})\n`;
      } else {
        md += `  - Add instead: no strong alternative found — just cut back to one or two mentions\n`;
      }
      if (d.insertLocation && d.insertLocation.paragraphIndex) {
        md += `    - Paragraph ${d.insertLocation.paragraphIndex}${d.insertLocation.crowded ? ' (already has a link in it — check it still reads cleanly)' : ''}: "${d.insertLocation.nearestSentence}"\n`;
        md += `    - Paste this sentence in: "${d.insertLocation.pasteReadySentence}"\n`;
      }
    }
    if (tier1.length) md += `\n`;

    md += `### 3b. Medium priority — 2 links, both in the body (${tier2.length})\n\n`;
    md += `_Might be overlinking, but not automatically wrong — e.g. one early mention and one nearer a directly relevant section can both earn their place. Use judgement._\n\n`;
    if (tier2.length === 0) md += `_None found._\n\n`;
    for (const d of tier2) {
      md += `- **${d.fromTitle}** (\`${d.from}\`) links to **${d.title}** (\`${d.targetPath}\`) twice in the body\n`;
    }
    if (tier2.length) md += `\n`;

    md += `### 3c. Low priority — 1 contextual + 1 Related Articles mention, better related pick available (${tier3.length})\n\n`;
    md += `_Only listed when swapping in the alternative would genuinely improve the related-articles slot. If the duplicated link is already the most relevant thing to put there (e.g. a recruitment article pointing to both trials and what coaches look for, in-body and in Related Articles), it's left alone and won't appear here._\n\n`;
    if (tier3.length === 0) md += `_None found._\n\n`;
    for (const d of tier3) {
      md += `- **${d.fromTitle}** (\`${d.from}\`): Related Articles repeats the in-body link to **${d.title}** (relevance ${d.currentScore}) — swap it for **${d.replacement.other.title}** (\`${d.replacement.other.urlPath}\`, relevance ${d.replacement.score})\n`;
    }
    if (tier3.length) md += `\n`;
  }

  md += `\n## 4. Pages with too few outbound links\n\n`;
  md += `_Pages with ${MIN_OUTBOUND_LINKS} or fewer outbound internal links, with suggestions to bring them up to roughly ${TARGET_OUTBOUND_LINKS}._\n\n`;
  if (sparseOutboundReport.length === 0) md += `_None found._\n`;
  for (const r of sparseOutboundReport) {
    md += `### ${r.page.title} (\`${r.page.urlPath}\`)\n`;
    md += `Total outbound: ${r.stats.total} | Contextual: ${r.stats.contextual} | Related/footer: ${r.stats.related}\n\n`;
    for (const c of r.candidates) {
      const location = findBestParagraph(r.page, c.other);
      md += `- Add a link to **${c.other.title}** (\`${c.other.urlPath}\`) — relevance ${c.score}\n`;
      if (location.nearestSentence) {
        md += `  - Near this existing sentence (paragraph ${location.paragraphIndex}): "${location.nearestSentence}"\n`;
      } else {
        md += `  - ${location.excerpt}\n`;
      }
      md += `  - Paste this sentence in: "${location.pasteReadySentence}"\n`;
    }
    md += `\n`;
  }

  md += `\n## 5. Weak anchor text\n\n`;
  md += `_Generic anchors like "click here" or "read more" waste an SEO opportunity - swap for descriptive text._\n\n`;
  if (weakAnchorReport.length === 0) md += `_None found._\n`;
  for (const r of weakAnchorReport) {
    md += `- **${r.fromTitle}** (\`${r.from}\`) links to **${r.toTitle}** (\`${r.to}\`) using the anchor "${r.anchor}"\n`;
    if (r.suggestions.length) {
      md += `  - Suggested anchors: ${r.suggestions.map((s) => `"${s}"`).join(', ')}\n`;
    }
  }

  md += `\n## 6. Reciprocal link opportunities\n\n`;
  md += `_Cases where A links to B but B doesn't link back, and the two are clearly related. Capped at ${RECIPROCAL_LIMIT} entries._\n\n`;
  if (reciprocalReport.length === 0) md += `_None found._\n`;
  for (const r of reciprocalReport) {
    md += `- Add a link from **${r.fromTitle}** (\`${r.from}\`) back to **${r.toTitle}** (\`${r.to}\`) — relevance ${r.score}\n`;
  }

  md += `\n## 7. Pillar articles and cluster coverage\n\n`;
  md += `_Each pillar is checked against the other pages in its own folder (excluding other configured pillars)._\n\n`;
  for (const r of pillarReport) {
    if (r.missing) {
      md += `### \`${r.pillarPath}\` — not found\n`;
      md += `_Check this path matches a real file, or update PILLAR_ARTICLES at the top of the script._\n\n`;
      continue;
    }
    md += `### ${r.title} (\`${r.pillarPath}\`) — pillar for "${r.folder}"\n`;
    md += `Total inbound: ${r.stats.total} | Contextual inbound: ${r.stats.contextual} | Cluster size: ${r.clusterSize} page(s)\n\n`;
    if (r.missingLinks.length === 0) {
      md += `_Every page in this cluster already links to the pillar._\n\n`;
      continue;
    }
    md += `Pages in this cluster that don't yet link to the pillar:\n`;
    for (const p of r.missingLinks) {
      const handled = pillarGapHandledByOverlink.has(`${p.urlPath}|${r.pillarPath}`);
      md += `- **${p.title}** (\`${p.urlPath}\`)${handled ? ' — fix suggested in section 3a (trimming an overlinked mention)' : ''}\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync('link-audit-report.md', md);

  // ================= WRITE CSV =================
  const headers = ['Priority', 'Type', 'Source', 'Target', 'Suggested Anchor', 'Suggested Location', 'Nearest Existing Sentence', 'Paste-Ready Sentence', 'Reason', 'Done'];
  const csvLines = [headers.join(',')];
  for (const row of csvRows) {
    csvLines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  fs.writeFileSync('link-audit-tasks.csv', csvLines.join('\n'));

  console.log(`Audit complete. ${pages.length} pages scanned.`);
  console.log(`Report written to link-audit-report.md`);
  console.log(`Task list written to link-audit-tasks.csv (${csvRows.length} row(s))`);
}

run();
