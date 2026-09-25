// Link-graph prospecting: Graham's method. For a keyword we care about, look
// past the big sites in the results to the small content sites ranking on
// pages 1-3 ("peers"), then map who links to them and who they link out to.
//
//   - A peer that already links out to other small content sites is open to
//     linking (or a link exchange): pitch it directly.
//   - A site that links to two or more peers is a hub for this topic: the
//     strongest prospect of all, it demonstrably links to sites like ours.
//   - A site linking to one peer is a weaker lead, still worth a read.
//
// Pure: takes already-fetched SERP, rank, page and backlink data and scores
// it. The DataForSEO calls live in scripts/outreach/research.ts link-graph.

import { assessProspect, hostOf, isCommercialRival, isInstitutionalLink, OUR_DOMAIN } from "./quality";

// Sites too big (or too institutional) to be a peer or a realistic prospect.
// Their presence in the results says nothing about who links to small sites.
const BIG_HOSTS = [
  "bbc.co.uk",
  "bbc.com",
  "theguardian.com",
  "telegraph.co.uk",
  "independent.co.uk",
  "thetimes.co.uk",
  "mirror.co.uk",
  "dailymail.co.uk",
  "thesun.co.uk",
  "express.co.uk",
  "standard.co.uk",
  "skysports.com",
  "goal.com",
  "espn.co.uk",
  "espn.com",
  "wikipedia.org",
  "reddit.com",
  "quora.com",
  "mumsnet.com",
  "netmums.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "pinterest.com",
  "amazon.co.uk",
  "amazon.com",
  "ebay.co.uk",
  "argos.co.uk",
  "decathlon.co.uk",
  "sportsdirect.com",
  "prodirectsport.com",
  "jdsports.co.uk",
  "nike.com",
  "adidas.co.uk",
  "puma.com",
  "nhs.uk",
  "gov.uk",
  "premierleague.com",
  "efl.com",
  "uefa.com",
  "fifa.com",
];

// DataForSEO domain rank (0-1000) above which a site is treated as big.
// Small blogs and club sites sit well under this; national brands above.
export const BIG_RANK = 550;

export function isBigSite(host: string, rank?: number | null): boolean {
  if (!host) return true;
  if (BIG_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  // Commercial rivals (TeamStats, Spond...) are on the institutional list for
  // judging outbound links, but as ranking sites they belong in the
  // competitor map, labelled commercial, not silently dropped.
  if (!isCommercialRival(host) && isInstitutionalLink({ url: `https://${host}/`, anchor: "" })) return true;
  return rank != null && rank > BIG_RANK;
}

export interface SerpResult {
  url: string;
  title?: string | null;
  position: number;
}

export interface Peer {
  url: string;
  domain: string;
  title: string | null;
  position: number;
  rank: number | null;
  // Pitchable ourselves? Competitor apps and parent sites are mined for
  // their links but never pitched (lib/outreach/quality.ts rejects them).
  pitchable: boolean;
  gateReasons: string[];
  // Commercial rivals (apps, club software, paid services) vs content sites.
  // Content peers are pitchable even though they rank against us: a one-person
  // site has no product to protect.
  kind: "commercial" | "content";
  // Rough size from domain rank: small sites are the likeliest to be one
  // person, and the likeliest to say yes.
  size: "small" | "established" | "unknown";
}

export function pickPeers(results: SerpResult[], ranks: Map<string, number | null>, max: number): Peer[] {
  const seen = new Set<string>();
  const peers: Peer[] = [];
  for (const r of [...results].sort((a, b) => a.position - b.position)) {
    const domain = hostOf(r.url);
    if (!domain || domain === OUR_DOMAIN || seen.has(domain)) continue;
    seen.add(domain);
    const rank = ranks.get(domain) ?? null;
    if (isBigSite(domain, rank)) continue;
    const q = assessProspect({ url: r.url, title: r.title });
    const commercial = q.reasons.some((x) => /commercial rival/.test(x)) || q.type === "business";
    peers.push({
      url: r.url,
      domain,
      title: r.title ?? null,
      position: r.position,
      rank,
      pitchable: q.verdict === "ok",
      gateReasons: q.reasons,
      kind: commercial ? "commercial" : "content",
      size: sizeOf(rank),
    });
  }
  // Pages 2-3 first when trimming: smaller, hungrier sites are the ones
  // Graham expects to be open to linking, and page-1 peers are often
  // established competitors.
  return peers.sort((a, b) => bucket(a.position) - bucket(b.position) || a.position - b.position).slice(0, max);
}

export function sizeOf(rank: number | null): Peer["size"] {
  if (rank == null) return "unknown";
  return rank <= 250 ? "small" : "established";
}

function bucket(position: number): number {
  return position > 10 ? 0 : 1;
}

export interface PeerLinks {
  peer: Peer;
  // Independent outbound links from the peer's ranking page (after the
  // page-content check's institutional filter).
  outbound: { url: string; anchor: string }[];
  // Pages linking to the peer's ranking page.
  inbound: { url: string; domain: string; anchor?: string; dofollow?: boolean; rank?: number | null }[];
}

export interface GraphProspect {
  domain: string;
  url: string;
  kind: "open_peer" | "hub" | "linker";
  score: number;
  why: string[];
  // Peers this site links to (hubs/linkers) or small sites it links out to (open peers).
  connections: string[];
}

export function buildLinkGraph(data: PeerLinks[], exclude: Set<string> = new Set()): GraphProspect[] {
  const out = new Map<string, GraphProspect>();
  const peerDomains = new Set(data.map((d) => d.peer.domain));

  // Open peers: small ranking sites that already link out to other small
  // content sites.
  for (const d of data) {
    if (!d.peer.pitchable || exclude.has(d.peer.domain)) continue;
    const smallOut = [...new Set(d.outbound.map((l) => hostOf(l.url)).filter((h) => h && h !== d.peer.domain && !isBigSite(h)))];
    if (!smallOut.length) continue;
    const toOtherPeers = smallOut.filter((h) => peerDomains.has(h));
    const why = [
      `ranks #${d.peer.position} for this keyword`,
      `links out to ${smallOut.length} small site${smallOut.length === 1 ? "" : "s"} (${smallOut.slice(0, 4).join(", ")}${smallOut.length > 4 ? "..." : ""})`,
    ];
    if (toOtherPeers.length) why.push(`including ${toOtherPeers.length} other site${toOtherPeers.length === 1 ? "" : "s"} ranking for the same keyword`);
    if (d.peer.position > 10) why.push("on page 2-3, so likely hungry for links");
    if (d.peer.size === "small") why.push("small site, likely one person");
    if (d.peer.gateReasons.some((x) => /pitch as a mutual/.test(x))) why.push("ranks against us: pitch as a mutual, peers helping each other");
    out.set(d.peer.domain, {
      domain: d.peer.domain,
      url: d.peer.url,
      kind: "open_peer",
      score: 20 + Math.min(smallOut.length, 6) * 5 + toOtherPeers.length * 5 + (d.peer.position > 10 ? 10 : 0),
      why,
      connections: smallOut,
    });
  }

  // Linkers: who links in to the peers. Count distinct peers per domain.
  const linkedPeers = new Map<string, { url: string; peers: Set<string>; dofollow: boolean; rank: number | null }>();
  for (const d of data) {
    for (const l of d.inbound) {
      const domain = l.domain.replace(/^www\./, "");
      if (!domain || domain === OUR_DOMAIN || domain === d.peer.domain || exclude.has(domain)) continue;
      if (isBigSite(domain, l.rank ?? null)) continue;
      const q = assessProspect({ url: l.url, context: l.anchor });
      if (q.verdict === "rejected") continue;
      const cur = linkedPeers.get(domain) ?? { url: l.url, peers: new Set<string>(), dofollow: false, rank: l.rank ?? null };
      cur.peers.add(d.peer.domain);
      cur.dofollow ||= Boolean(l.dofollow);
      linkedPeers.set(domain, cur);
    }
  }
  for (const [domain, v] of linkedPeers) {
    const n = v.peers.size;
    const existing = out.get(domain);
    const why = [`links to ${n} site${n === 1 ? "" : "s"} ranking for this keyword (${[...v.peers].slice(0, 4).join(", ")})`];
    if (v.dofollow) why.push("followed link");
    const score = (n >= 2 ? 40 : 15) + (n - 1) * 10 + (v.dofollow ? 5 : 0);
    if (existing) {
      // A peer that is also a hub: the best of both.
      existing.score += score;
      existing.why.push(...why);
      continue;
    }
    out.set(domain, { domain, url: v.url, kind: n >= 2 ? "hub" : "linker", score, why, connections: [...v.peers] });
  }

  return [...out.values()].sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Competitor map: every link-graph run is saved, and this folds them into one
// view of who keeps turning up for our keywords, how big they are, whether
// they're commercial or independent content, and whether they link out.

export interface SavedGraphRun {
  keyword: string;
  ranAt: string;
  peers: {
    domain: string;
    url: string;
    position: number;
    rank: number | null;
    pitchable: boolean;
    kind: Peer["kind"];
    size: Peer["size"];
    smallSitesLinkedOut: number;
    linkersFound: number;
  }[];
}

export interface CompetitorRow {
  domain: string;
  kind: Peer["kind"];
  size: Peer["size"];
  rank: number | null;
  keywords: { keyword: string; position: number }[];
  bestPosition: number;
  linksOut: boolean;
  linkersSeen: number;
  pitchable: boolean;
  verdict: string;
}

export function buildCompetitorMap(runs: SavedGraphRun[]): CompetitorRow[] {
  const by = new Map<string, CompetitorRow>();
  for (const run of runs) {
    for (const p of run.peers) {
      const row =
        by.get(p.domain) ??
        ({ domain: p.domain, kind: p.kind, size: p.size, rank: p.rank, keywords: [], bestPosition: 999, linksOut: false, linkersSeen: 0, pitchable: p.pitchable, verdict: "" } as CompetitorRow);
      if (!row.keywords.some((k) => k.keyword === run.keyword)) row.keywords.push({ keyword: run.keyword, position: p.position });
      row.bestPosition = Math.min(row.bestPosition, p.position);
      row.linksOut ||= p.smallSitesLinkedOut > 0;
      row.linkersSeen = Math.max(row.linkersSeen, p.linkersFound);
      row.rank ??= p.rank;
      by.set(p.domain, row);
    }
  }
  for (const row of by.values()) {
    row.verdict =
      row.kind === "commercial"
        ? "commercial rival: study, don't pitch"
        : row.linksOut
          ? row.size === "small"
            ? "independent and links out: good prospect for a link or a mutual"
            : "established content site that links out: worth a pitch"
          : "doesn't link out on its ranking page: low odds, watch as a competitor";
  }
  // Most overlap first: the sites competing with us on the most keywords.
  return [...by.values()].sort((a, b) => b.keywords.length - a.keywords.length || a.bestPosition - b.bestPosition);
}
