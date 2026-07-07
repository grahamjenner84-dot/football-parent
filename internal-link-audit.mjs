#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

// ---------- CONFIG ----------
const CONTENT_DIR = 'content';
const UNDERLINKED_THRESHOLD = 3;   // pages with fewer inbound links than this get flagged, and get source suggestions
const MIN_OUTBOUND_LINKS = 3;      // pages with this many outbound links or fewer get flagged for more "related articles"
const TARGET_OUTBOUND_LINKS = 5;   // suggestions top up to this many

// List the URL paths of your pillar / hub articles here (the ones you want acting as
// hubs for a topic cluster). Example:
// const PILLAR_PATHS = ['/parent-guides/what-is-grassroots-football', '/academy-pathway/development-centres-vs-academies'];
const PILLAR_PATHS = [];
// -----------------------------

function loadPages() {
  const files = glob.sync(`${CONTENT_DIR}/**/*.mdx`);
  const pages = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);

    const rel = path.relative(CONTENT_DIR, file).replace(/\.mdx$/, '');
    const parts = rel.split(path.sep);
    const categoryFolder = parts[0];
    const urlPath = '/' + parts.join('/');

    pages.push({
      file,
      urlPath,
      title: data.title || rel,
      description: data.description || '',
      categoryFolder,
      categoryLabel: data.category || categoryFolder,
      content,
      outboundLinks: [],
    });
  }
  return pages;
}

function extractInternalLinks(content, pages, ownPath) {
  const found = [];
  const patterns = [
    /\[([^\]]+)\]\(([^)]+)\)/g,
    /<Link[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</g,
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) {
      const isMarkdown = re === patterns[0];
      let href = isMarkdown ? m[2] : m[1];
      const anchorText = isMarkdown ? m[1] : m[2];

      href = href.trim();
      if (href.includes('footballparent.co.uk')) {
        href = href.replace(/^https?:\/\/(www\.)?[^/]+/, '');
      }
      if (!href.startsWith('/')) continue;
      href = href.split('#')[0].replace(/\/$/, '');

      const target = pages.find((p) => p.urlPath === href);
      if (target && target.urlPath !== ownPath) {
        found.push({ anchorText: anchorText.trim(), targetPath: href });
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

function run() {
  const pages = loadPages();
  if (pages.length === 0) {
    console.error(`No .mdx files found under "${CONTENT_DIR}". Check you're running this from your project root.`);
    process.exit(1);
  }

  const inboundLinks = {}; // urlPath -> [{ from, anchorText }]
  pages.forEach((p) => (inboundLinks[p.urlPath] = []));

  for (const page of pages) {
    page.outboundLinks = extractInternalLinks(page.content, pages, page.urlPath);
    for (const link of page.outboundLinks) {
      if (inboundLinks[link.targetPath]) {
        inboundLinks[link.targetPath].push({ from: page.urlPath, anchorText: link.anchorText });
      }
    }
  }

  const byPath = Object.fromEntries(pages.map((p) => [p.urlPath, p]));

  function rankedCandidates(page, excludePaths) {
    return pages
      .map((other) => ({ other, score: relevanceScore(page, other) }))
      .filter((r) => r.score > 0 && !excludePaths.has(r.other.urlPath))
      .sort((a, b) => b.score - a.score);
  }

  // ---------- 1. Underlinked pages + who should link to them ----------
  const underlinked = pages
    .filter((p) => inboundLinks[p.urlPath].length < UNDERLINKED_THRESHOLD)
    .sort((a, b) => inboundLinks[a.urlPath].length - inboundLinks[b.urlPath].length);

  const underlinkedReport = underlinked.map((target) => {
    const alreadyLinkingFrom = new Set(inboundLinks[target.urlPath].map((l) => l.from));
    alreadyLinkingFrom.add(target.urlPath);
    const sources = rankedCandidates(target, alreadyLinkingFrom).slice(0, 4);
    return {
      target,
      inboundCount: inboundLinks[target.urlPath].length,
      sources,
    };
  });

  // ---------- 2. Overlinking (same target linked more than once from one page) ----------
  const overlinkReport = [];
  for (const page of pages) {
    const counts = {};
    for (const link of page.outboundLinks) {
      counts[link.targetPath] = (counts[link.targetPath] || 0) + 1;
    }
    const duplicated = Object.entries(counts).filter(([, count]) => count > 1);
    if (duplicated.length === 0) continue;

    const linkedPaths = new Set(page.outboundLinks.map((l) => l.targetPath));
    const alternatives = rankedCandidates(page, linkedPaths).slice(0, 3);

    overlinkReport.push({
      from: page.urlPath,
      title: page.title,
      duplicates: duplicated.map(([targetPath, count]) => ({
        targetPath,
        count,
        title: byPath[targetPath]?.title || targetPath,
      })),
      alternatives,
    });
  }

  // ---------- 3. Pages with too few related articles ----------
  const sparseOutboundReport = [];
  for (const page of pages) {
    const currentOutbound = page.outboundLinks.length;
    if (currentOutbound > MIN_OUTBOUND_LINKS) continue;
    const linkedPaths = new Set(page.outboundLinks.map((l) => l.targetPath));
    const needed = TARGET_OUTBOUND_LINKS - currentOutbound;
    const candidates = rankedCandidates(page, linkedPaths).slice(0, Math.max(needed, 0));
    if (candidates.length) {
      sparseOutboundReport.push({ from: page.urlPath, title: page.title, currentOutbound, candidates });
    }
  }

  // ---------- 4. Pillar articles ----------
  const pillarReport = PILLAR_PATHS.map((pillarPath) => {
    const pillar = byPath[pillarPath];
    if (!pillar) return { pillarPath, missing: true };

    const currentSources = new Set(inboundLinks[pillarPath].map((l) => l.from));
    currentSources.add(pillarPath);
    const candidates = rankedCandidates(pillar, currentSources).slice(0, 6);

    return {
      pillarPath,
      title: pillar.title,
      inboundCount: inboundLinks[pillarPath].length,
      candidates,
    };
  });

  // ---------- write report ----------
  let md = `# Internal Link Audit\n\n_Generated ${new Date().toISOString()}_\n\n`;

  md += `## 1. Pages with too few (or no) inbound links\n\n`;
  md += `_Add a link to these from the source articles listed below, wherever it fits naturally in the text._\n\n`;
  if (underlinkedReport.length === 0) md += `_None found._\n`;
  for (const r of underlinkedReport) {
    md += `### ${r.target.title} (\`${r.target.urlPath}\`) — ${r.inboundCount} inbound link(s)\n`;
    if (r.sources.length === 0) {
      md += `_No strong candidates found to link from._\n\n`;
      continue;
    }
    for (const s of r.sources) {
      md += `- Add a link from **${s.other.title}** (\`${s.other.urlPath}\`) — relevance ${s.score}\n`;
    }
    md += `\n`;
  }

  md += `\n## 2. Overlinking (same page linked to more than once)\n\n`;
  md += `_These pages link to the same target multiple times in the body. Consider swapping one occurrence for a different, relevant article instead._\n\n`;
  if (overlinkReport.length === 0) md += `_None found._\n`;
  for (const r of overlinkReport) {
    md += `### ${r.title} (\`${r.from}\`)\n`;
    for (const d of r.duplicates) {
      md += `- Links to **${d.title}** (\`${d.targetPath}\`) ${d.count} times\n`;
    }
    if (r.alternatives.length) {
      md += `  Consider linking one of those mentions to instead:\n`;
      for (const alt of r.alternatives) {
        md += `  - **${alt.other.title}** (\`${alt.other.urlPath}\`) — relevance ${alt.score}\n`;
      }
    }
    md += `\n`;
  }

  md += `\n## 3. Pages with 3 or fewer related articles linked\n\n`;
  md += `_Room to add more internal links here, aiming for ${TARGET_OUTBOUND_LINKS} total._\n\n`;
  if (sparseOutboundReport.length === 0) md += `_None found._\n`;
  for (const r of sparseOutboundReport) {
    md += `### ${r.title} (\`${r.from}\`) — currently ${r.currentOutbound} outbound link(s)\n`;
    for (const c of r.candidates) {
      md += `- Add a link to **${c.other.title}** (\`${c.other.urlPath}\`) — relevance ${c.score}\n`;
    }
    md += `\n`;
  }

  md += `\n## 4. Pillar articles\n\n`;
  if (PILLAR_PATHS.length === 0) {
    md += `_No pillar articles configured yet. Add their URL paths to the PILLAR_PATHS array at the top of this script and re-run._\n`;
  } else {
    for (const r of pillarReport) {
      if (r.missing) {
        md += `### \`${r.pillarPath}\` — not found, check the path matches a real file\n\n`;
        continue;
      }
      md += `### ${r.title} (\`${r.pillarPath}\`) — ${r.inboundCount} inbound link(s) currently\n`;
      for (const c of r.candidates) {
        md += `- Add a link from **${c.other.title}** (\`${c.other.urlPath}\`) — relevance ${c.score}\n`;
      }
      md += `\n`;
    }
  }

  fs.writeFileSync('link-audit-report.md', md);
  console.log(`Audit complete. ${pages.length} pages scanned.`);
  console.log(`Report written to link-audit-report.md`);
}

run();
