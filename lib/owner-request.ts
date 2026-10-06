import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, NO_TRACK_COOKIE, hasAdminSession } from "@/lib/admin-session";

// "Is this request Graham's own device?" for every first-party tracking
// endpoint (page views, affiliate and partner clicks, Coach App shares and
// sign-ups, Progress joins). Server-only: reads the service role key.
//
// Two signals, either is enough:
//
// 1. The admin cookies set by /admin login (fp_admin_session, or the
//    year-long fp_no_track). Reliable in a browser profile that keeps
//    cookies; useless in incognito, which is how he actually browses.
// 2. The request's source network is in the owner_networks table, managed
//    from /admin/seo. Covers every browser on his connection, incognito
//    included, and Playwright screenshots run from his PC. Not his phone on
//    mobile data: that address changes daily, and the cookie is the answer
//    there.
//
// Addresses are compared and discarded, never stored: visitors' never were,
// and his own go into the table only as a keyed hash (see networkHash), so
// the table holds nothing readable.

export type OwnerMatch = {
  owner: boolean;
  by: "cookie" | "network" | null;
  // The network key of the request (see networkKey), for the admin panel to
  // show. Null locally, where Vercel's headers are absent. Never persisted.
  network: string | null;
};

// The client's address as Vercel reports it. Vercel sets x-real-ip and
// x-forwarded-for from the connection and overwrites anything the client
// sent, so these cannot be spoofed to match an owner network from outside.
// Both are absent on localhost.
export function requestIp(req: Request): string | null {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || null;
}

// The comparison key for an address. IPv4 is used whole. IPv6 is reduced to
// its /64 prefix, because privacy extensions give each device a fresh
// interface identifier (the second half) daily, while the prefix is what
// the ISP assigns to the router and stays put for weeks or months.
export function networkKey(ip: string): string {
  if (!ip.includes(":")) return ip;

  let addr = ip.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);
  // Expand "::" so the first four groups can be read off reliably.
  const [head, tail = ""] = addr.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const missing = Math.max(0, 8 - headGroups.length - tailGroups.length);
  const groups = [...headGroups, ...Array(missing).fill("0"), ...tailGroups].map(
    (g) => g.replace(/^0+(?=.)/, "") || "0"
  );
  return `${groups.slice(0, 4).join(":")}::/64`;
}

// What actually goes in the table. Keyed on the admin secret so a leaked
// table cannot be reversed by hashing the IPv4 space, which is small enough
// to brute-force unkeyed. Null when the secret is unset, which disables the
// network layer rather than storing an unkeyed hash.
export function networkHash(network: string): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`owner-network:${network}`).digest("hex");
}

export function hasOwnerCookie(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  if (parts.some((part) => part === `${NO_TRACK_COOKIE}=1`)) return true;
  const sessionValue = parts
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return hasAdminSession(sessionValue);
}

// Per-instance cache of the owner_networks hashes. The write endpoints are
// hit on every page view, so this cannot be a round trip each time; a
// minute's staleness after a change on /admin/seo is fine. A failed read
// keeps the last known set and retries sooner. It never throws: a missing
// table or a blip must not stop a real visitor's row being written.
const CACHE_TTL_MS = 60_000;
const ERROR_RETRY_MS = 10_000;
let cache: { hashes: Set<string>; expires: number } | null = null;

export async function getOwnerNetworkHashes(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.hashes;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return cache?.hashes ?? new Set();

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.from("owner_networks").select("network_hash");
    if (error) throw error;
    cache = {
      hashes: new Set((data ?? []).map((row: { network_hash: string }) => row.network_hash)),
      expires: now + CACHE_TTL_MS,
    };
  } catch {
    cache = { hashes: cache?.hashes ?? new Set(), expires: now + ERROR_RETRY_MS };
  }
  return cache.hashes;
}

// After an add or remove on /admin/seo. Only clears this instance's cache;
// other serverless instances pick the change up within CACHE_TTL_MS.
export function invalidateOwnerNetworkCache(): void {
  cache = null;
}

export async function matchOwner(req: Request): Promise<OwnerMatch> {
  const ip = requestIp(req);
  const network = ip ? networkKey(ip) : null;
  if (hasOwnerCookie(req)) return { owner: true, by: "cookie", network };
  const hash = network ? networkHash(network) : null;
  if (hash && (await getOwnerNetworkHashes()).has(hash)) {
    return { owner: true, by: "network", network };
  }
  return { owner: false, by: null, network };
}

// The one call every tracking endpoint makes before writing a row.
export async function isOwnerRequest(req: Request): Promise<boolean> {
  return (await matchOwner(req)).owner;
}
