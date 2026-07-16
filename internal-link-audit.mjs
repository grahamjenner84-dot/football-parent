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

    const paragraphs = content
      .split(/\n{2,}/)
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

function relevanceScore(a, b) {
  if (a.urlPath === b.urlPath) return -1;
  let score = 0;
  if (a.categoryFolder === b.categoryFolder) score += 3;

  const textA = `${a.title} ${a.description}`.toLowerCase();
  const textB = `${b.title} ${b.description}`.toLowerCase();
  const wordsA = new Set(textA.split(/\W+/).filter((w) => w.length > 3));
  const wordsB = new Set(textB.split(/\W+/).filter((w) => w.length > 3));
  const overlap = [...wordsA].filter((w) => wordsB.has(w));
  score += overlap.length * 0.5;

  return score;
}

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

function inlineAnchorPhrase(target) {
  let phrase = target.title.replace(/\s*\|.*$/, '').trim();
  phrase = phrase.replace(/[?!:]+$/, '');
  if (phrase.length === 0) return target.urlPath.split('/').pop().replace(/-/g, ' ');
  return phrase.charAt(0).toLowerCase() + phrase.slice(1);
}

function findBestParagraph(source, target) {
  const targetSlugWords = target.urlPath.split('/').pop().replace(/-/g, ' ');
  const targetWords = new Set(
    `${target.title} ${targetSlugWords} ${target.description}`
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
  );

  let best = null;
  source.paragraphs.forEach((para, idx) => {
    const paraWords = new Set(para.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const overlap = [...paraWords].filter((w) => targetWords.has(w));
    if (overlap.length > 0 && (!best || overlap.length > best.score)) {
      best = { paragraphIndex: idx + 1, score: overlap.length, paragraphText: para };
    }
  });

  const anchor = inlineAnchorPhrase(target);
  const pasteReadySentence = `This is covered in more detail in our guide on [${anchor}](${target.urlPath}).`;

  if (!best) {
    return {
      paragraphIndex: null,
      excerpt: 'No obvious paragraph match. Add where it naturally fits.',
      nearestSentence: null,
      pasteReadySentence,
    };
  }

  const sentences = splitSentences(best.paragraphText);
  let bestSentence = sentences[0] || best.paragraphText.slice(0, 140);
  let bestSentenceScore = -1;
  for (const s of sentences) {
    const sWords = new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const overlap = [...sWords].filter((w) => targetWords.has(w));
    if (overlap.length > bestSentenceScore) {
      bestSentenceScore = overlap.length;
      bestSentence = s;
    }
  }

  return {
    paragraphIndex: best.paragraphIndex,
    excerpt: best.paragraphText.slice(0, 140).replace(/\s+/g, ' '),
    nearestSentence: bestSentence.replace(/\s+/g, ' '),
    pasteReadySentence,
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
      .map((other) => ({ other, score: relevanceScore(page, other) }))
      .filter((r) => r.score > 0 && !excludePaths.has(r.other.urlPath))
      .sort((a, b) => b.score - a.score);
  }

  const csvRows = [];

  // ---------- 1. Pages with too few (total) inbound links ----------
  const underlinked = pages
    .filter((p) => inboundStats(p.urlPath).total < UNDERLINKED_THRESHOLD)
    .sort((a, b) => inboundStats(a.urlPath).total - inboundStats(b.urlPath).total);

  const underlinkedReport = underlinked.map((target) => {
    const stats = inboundStats(target.urlPath);
    const already = new Set(stats.sources.map((l) => l.from));
    already.add(target.urlPath);
    const candidates = rankedCandidates(target, already).slice(0, 4);
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
        Reason: `Only ${r.stats.total} total inbound link(s) (${r.stats.contextual} contextual)`,
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
    const candidates = rankedCandidates(r.page, already).slice(0, 2);
    for (const c of candidates) {
      const location = findBestParagraph(c.other, r.page);
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
          r.stats.total === 0
            ? 'Zero inbound links from anywhere on the site'
            : `${r.stats.total} inbound link(s) but none in body text (all footer/related only)`,
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
    // Each tier-3 duplicate on this page needs its own distinct replacement -
    // recommending the same single best alternative for two different related-
    // articles slots would just trade one duplicate for another.
    const claimedReplacements = new Set();

    const items = [];
    for (const [targetPath, count] of duplicated) {
      const ctxCount = contextualCounts[targetPath] || 0;
      const target = byPath[targetPath];
      const title = target?.title || targetPath;
      const currentScore = target ? relevanceScore(page, target) : 0;

      if (count >= 3) {
        items.push({ targetPath, title, count, tier: 1, currentScore });
      } else if (ctxCount === 1) {
        const better = alternativesPool.find(
          (c) => c.score > currentScore && !claimedReplacements.has(c.other.urlPath)
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
        csvRows.push({
          Priority: priorityFromLevel('High', r.from, gscMap),
          Type: 'Overlinking (3+ mentions)',
          Source: r.from,
          Target: d.targetPath,
          'Suggested Anchor': '',
          'Suggested Location': 'Body text (multiple mentions)',
          'Nearest Existing Sentence': '',
          'Paste-Ready Sentence': '',
          Reason: `Linked ${d.count} times in this article - trim to 1-2 mentions`,
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
    const candidates = rankedCandidates(page, linkedPaths).slice(0, Math.max(needed, 0));
    if (candidates.length) {
      sparseOutboundReport.push({ page, stats, candidates });
    }
  }

  for (const r of sparseOutboundReport) {
    for (const c of r.candidates.slice(0, 2)) {
      const location = findBestParagraph(r.page, c.other);
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
        Reason: `Only ${r.stats.total} outbound link(s) currently (aiming for ~${TARGET_OUTBOUND_LINKS})`,
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
      if (score < 3) continue;
      reciprocalOpportunities.push({ from: target.urlPath, fromTitle: target.title, to: page.urlPath, toTitle: page.title, score });
    }
  }
  reciprocalOpportunities.sort((a, b) => b.score - a.score);
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
    for (const p of r.missingLinks.slice(0, 3)) {
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
    md += `_Unconditionally worth trimming back to one or two mentions._\n\n`;
    if (tier1.length === 0) md += `_None found._\n\n`;
    for (const d of tier1) {
      md += `- **${d.fromTitle}** (\`${d.from}\`) links to **${d.title}** (\`${d.targetPath}\`) ${d.count} times\n`;
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
      md += `- **${p.title}** (\`${p.urlPath}\`)\n`;
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
