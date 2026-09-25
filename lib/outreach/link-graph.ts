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

import { assessProspect, hostOf, isInstitutionalLink, OUR_DOMAIN } from "./quality";

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
  if (isInstitutionalLink({ url: `https://${host}/`, anchor: "" })) return true;
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
    peers.push({ url: r.url, domain, title: r.title ?? null, position: r.position, rank, pitchable: q.verdict === "ok", gateReasons: q.reasons });
  }
  // Pages 2-3 first when trimming: smaller, hungrier sites are the ones
  // Graham expects to be open to linking, and page-1 peers are often
  // established competitors.
  return peers.sort((a, b) => bucket(a.position) - bucket(b.position) || a.position - b.position).slice(0, max);
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
