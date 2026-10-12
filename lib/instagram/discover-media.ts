import { SupabaseClient } from "@supabase/supabase-js";
import { AccountCredentials } from "./publish-pipeline";

// Adds a `posts` row for every media item on the account that doesn't have
// one yet, so the insights cron measures posts made by hand in the app
// (including the Expert Opinion collabs) and not only ones the publishing
// pipeline made. Before this ran daily, nothing posted after 19 July 2026 was
// ever measured: the automated publisher was switched off on 21 July and the
// only other way in was running scripts/_backfill-legacy-posts.ts by hand.
//
// Rows are minimal: ig_media_id, format (reel vs everything else, the same
// split the publisher uses), status='published' (so the publisher, which
// only reads status='scheduled', never touches them) and published_at from
// Instagram's own timestamp (so pull windows are timed from the real
// publish). Idempotent via the posts_ig_media_id_key unique constraint.
//
// A collab the other account posted and we accepted may not appear in our
// /media listing; one we posted and invited them to does.

const GRAPH_API_VERSION = process.env.IG_GRAPH_API_VERSION || "v23.0";
const MAX_PAGES = 20; // 50 per page; the account has well under 1,000 posts

export interface IgMedia {
  id: string;
  media_type: string;
  media_product_type?: string;
  caption?: string;
  timestamp: string;
  permalink: string;
}

function mediaListUrl(igUserId: string, accessToken: string): string {
  const u = new URL(`https://graph.instagram.com/${GRAPH_API_VERSION}/${igUserId}/media`);
  u.searchParams.set("fields", "id,media_type,media_product_type,caption,timestamp,permalink");
  u.searchParams.set("limit", "50");
  u.searchParams.set("access_token", accessToken);
  return u.toString();
}

export async function fetchAllMedia(igUserId: string, accessToken: string): Promise<IgMedia[]> {
  const all: IgMedia[] = [];
  let nextUrl: string | null = mediaListUrl(igUserId, accessToken);
  for (let page = 0; nextUrl && page < MAX_PAGES; page++) {
    const res: Response = await fetch(nextUrl);
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(`media list failed: ${JSON.stringify(json.error ?? json)}`);
    all.push(...json.data);
    nextUrl = json.paging?.next ?? null;
  }
  return all;
}

export function formatFor(m: IgMedia): "reel" | "carousel" {
  return m.media_product_type === "REELS" || m.media_type === "VIDEO" ? "reel" : "carousel";
}

export interface DiscoverResult {
  onAccount: number;
  added: number;
}

export async function discoverMedia(supabase: SupabaseClient, creds: AccountCredentials): Promise<DiscoverResult> {
  const media = await fetchAllMedia(creds.igUserId, creds.accessToken);
  if (!media.length) return { onAccount: 0, added: 0 };

  const rows = media.map((m) => ({
    account_id: creds.accountRowId,
    content_queue_id: null,
    format: formatFor(m),
    caption: m.caption ?? null,
    scheduled_time: m.timestamp,
    status: "published" as const,
    ig_media_id: m.id,
    published_at: m.timestamp,
  }));

  // ignoreDuplicates: rows already present are skipped and not returned, so
  // the returned length is the number genuinely added.
  const { data, error } = await supabase.from("posts").upsert(rows, { onConflict: "ig_media_id", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(`media discovery upsert failed: ${error.message}`);
  return { onAccount: media.length, added: data?.length ?? 0 };
}
