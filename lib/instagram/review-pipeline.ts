import { SupabaseClient } from "@supabase/supabase-js";
import { PostRow, ContentStatus } from "../supabase/render-pipeline";
import { AccountCredentials } from "./publish-pipeline";
import { listRecentMedia } from "./graph-client";

// A post is "ready for Phase G review" once it's rendered (status='scheduled'
// - see the migration comment on posts.status: this value is repurposed to
// mean "rendered, files uploaded" for posts specifically) but nobody has set
// a scheduled_time yet. Once a human approves it here, scheduled_time gets
// set and the post drops out of this query - the existing publish cron
// (getPostsDueToPublish) picks it up from there with no further status
// change needed.
export async function getPostsReadyForReview(supabase: SupabaseClient): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, post_slides(*)")
    .eq("status", "scheduled")
    .is("scheduled_time", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Failed to query posts ready for review: " + error.message);
  return ((data ?? []) as PostRow[]).map((p) => ({ ...p, post_slides: [...p.post_slides].sort((a, b) => a.slide_order - b.slide_order) }));
}

export async function rejectPost(supabase: SupabaseClient, postId: string, reason: string | null): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ status: "rejected" satisfies ContentStatus, error_message: reason })
    .eq("id", postId);
  if (error) throw new Error(`Failed to reject post ${postId}: ${error.message}`);
}

export interface ScheduleSettings {
  postingTime: string; // "HH:MM"
  cadenceDays: number;
  timezone: string;
}

const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  postingTime: "18:00",
  cadenceDays: 1,
  timezone: "Europe/London",
};

export async function getScheduleSettings(supabase: SupabaseClient, accountId: string): Promise<ScheduleSettings> {
  const { data, error } = await supabase
    .from("schedule_settings")
    .select("posting_time, cadence_days, timezone")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw new Error("Failed to load schedule settings: " + error.message);
  if (!data) return DEFAULT_SCHEDULE_SETTINGS;
  return { postingTime: data.posting_time, cadenceDays: Number(data.cadence_days), timezone: data.timezone };
}

export async function upsertScheduleSettings(supabase: SupabaseClient, accountId: string, settings: ScheduleSettings): Promise<void> {
  const { error } = await supabase.from("schedule_settings").upsert(
    {
      account_id: accountId,
      posting_time: settings.postingTime,
      cadence_days: settings.cadenceDays,
      timezone: settings.timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );
  if (error) throw new Error("Failed to save schedule settings: " + error.message);
}

// "YYYY-MM-DD" for `date` as seen in `timeZone` - en-CA gives that format
// directly, avoiding a manual part-reassembly.
function formatDateInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// Reads the UTC offset `timeZone` observes at `date` directly from ICU
// (e.g. "GMT+01:00" during British Summer Time), in minutes east of UTC.
// Deliberately NOT the common round-trip-through-toLocaleString trick: that
// trick parses the formatted string back with `new Date(string)`, which
// applies the *system's* local timezone to the ambiguous format - correct
// only when the system timezone happens to be UTC. `timeZoneName:
// "longOffset"` gives the offset as a labelled string with no such
// dependency on the host machine's own timezone.
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset", hour: "2-digit" }).formatToParts(date);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = offset.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
}

// Converts a wall-clock "HH:MM on dateStr, in timeZone" into the correct UTC
// instant, without a date library.
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60 * 1000);
}

export interface AutoScheduleParams {
  count: number;
  settings: ScheduleSettings;
  occupiedTimes: string[]; // ISO strings of posts already scheduled (any status/time)
  now?: Date;
}

// Assigns `count` future slots at settings.postingTime, spaced
// settings.cadenceDays apart, skipping any slot within an hour of an
// existing occupied time (already-scheduled posts, or an earlier slot
// already chosen in this same batch).
//
// Integer cadence advances by calendar day (via addCalendarDays +
// zonedTimeToUtc), which is DST-correct - the wall-clock posting time stays
// fixed even across a clock change. Fractional cadence (e.g. 0.5 for
// twice-daily) falls back to fixed millisecond increments, which can drift
// an hour of wall-clock time across a DST boundary; accepted as a known v1
// limitation since there's no date library in this project and the primary
// use case (the UI only exposes whole-day presets) never hits it.
export function computeAutoScheduleSlots(params: AutoScheduleParams): Date[] {
  const now = params.now ?? new Date();
  const { postingTime, cadenceDays, timezone } = params.settings;
  const isIntegerCadence = Number.isInteger(cadenceDays);
  const cadenceMs = cadenceDays * 24 * 60 * 60 * 1000;
  const COLLISION_BUFFER_MS = 60 * 60 * 1000;

  const occupied = params.occupiedTimes.map((t) => new Date(t)).filter((d) => d.getTime() > now.getTime());

  let anchorDateStr = formatDateInZone(now, timezone);
  let candidate = zonedTimeToUtc(anchorDateStr, postingTime, timezone);
  if (candidate.getTime() <= now.getTime()) {
    if (isIntegerCadence) {
      anchorDateStr = addCalendarDays(anchorDateStr, 1);
      candidate = zonedTimeToUtc(anchorDateStr, postingTime, timezone);
    } else {
      candidate = new Date(candidate.getTime() + cadenceMs);
    }
  }

  function advance() {
    if (isIntegerCadence) {
      anchorDateStr = addCalendarDays(anchorDateStr, cadenceDays);
      candidate = zonedTimeToUtc(anchorDateStr, postingTime, timezone);
    } else {
      candidate = new Date(candidate.getTime() + cadenceMs);
    }
  }

  const chosen: Date[] = [];
  const allOccupied = [...occupied];
  for (let i = 0; i < params.count; i++) {
    while (allOccupied.some((d) => Math.abs(d.getTime() - candidate.getTime()) < COLLISION_BUFFER_MS)) {
      advance();
    }
    chosen.push(candidate);
    allOccupied.push(candidate);
    advance();
  }
  return chosen;
}

export interface ApprovalItem {
  postId: string;
  mode: "auto" | "manual";
  manualTime?: string; // ISO string, required when mode === "manual"
}

export interface ScheduleResult {
  postId: string;
  scheduledTime: string;
}

// Approving must never publish instantly and must never fire a batch all at
// once - this only ever sets posts.scheduled_time (status stays
// 'scheduled', which it already is post-render); the existing 15-min publish
// cron is what actually posts, once scheduled_time arrives.
export async function schedulePosts(
  supabase: SupabaseClient,
  accountId: string,
  items: ApprovalItem[]
): Promise<ScheduleResult[]> {
  if (!items.length) return [];

  const settings = await getScheduleSettings(supabase, accountId);

  const { data: existing, error } = await supabase
    .from("posts")
    .select("scheduled_time")
    .eq("status", "scheduled")
    .not("scheduled_time", "is", null);
  if (error) throw new Error("Failed to load existing scheduled posts: " + error.message);

  const occupiedTimes: string[] = (existing ?? []).map((r) => r.scheduled_time as string);

  const manualResults = new Map<string, Date>();
  for (const item of items) {
    if (item.mode !== "manual") continue;
    if (!item.manualTime) throw new Error(`Post ${item.postId}: manual mode requires manualTime`);
    const parsed = new Date(item.manualTime);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Post ${item.postId}: invalid manualTime "${item.manualTime}"`);
    manualResults.set(item.postId, parsed);
    occupiedTimes.push(parsed.toISOString());
  }

  const autoItems = items.filter((i) => i.mode === "auto");
  const autoSlots = computeAutoScheduleSlots({ count: autoItems.length, settings, occupiedTimes });

  const autoResults = new Map<string, Date>();
  autoItems.forEach((item, i) => autoResults.set(item.postId, autoSlots[i]));

  const results: ScheduleResult[] = [];
  for (const item of items) {
    const scheduledDate = manualResults.get(item.postId) ?? autoResults.get(item.postId)!;
    const scheduledTime = scheduledDate.toISOString();
    const { error: updateError } = await supabase.from("posts").update({ scheduled_time: scheduledTime }).eq("id", item.postId);
    if (updateError) throw new Error(`Failed to schedule post ${item.postId}: ${updateError.message}`);
    results.push({ postId: item.postId, scheduledTime });
  }
  return results;
}

// Instagram permalinks vary in host (www vs not), protocol, trailing slash
// and tracking query params (?igsh=...) depending on how they were shared -
// only the path (the shortcode) is a stable identifier.
export function normalizePermalink(url: string): string {
  const trimmed = url.trim();
  try {
    return new URL(trimmed).pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
}

export interface MarkPostedResult {
  matched: boolean;
  igMediaId: string | null;
}

// Reels are posted manually (to add trending audio, which the API can't
// do), so no creation_id/container was ever tracked for them the way
// carousels get one from Phase B's publish flow. To keep insights working,
// the human pastes the post URL after posting and this matches it against
// the account's own recent media (official Graph API, using credentials
// already on file) by permalink - no undocumented shortcode<->id
// conversion. If Meta hasn't indexed the post yet (a few seconds' lag), no
// match is found and the caller should offer a retry; `skipMatch` lets the
// human give up on insights for this one post rather than being blocked.
export async function markManualReelPosted(
  supabase: SupabaseClient,
  creds: AccountCredentials,
  postId: string,
  permalink: string,
  opts: { skipMatch?: boolean } = {}
): Promise<MarkPostedResult> {
  if (opts.skipMatch) {
    const { error } = await supabase
      .from("posts")
      .update({
        status: "published" satisfies ContentStatus,
        published_at: new Date().toISOString(),
        manual_permalink: permalink || null,
        error_message: null,
      })
      .eq("id", postId);
    if (error) throw new Error(`Failed to mark post ${postId} published: ${error.message}`);
    return { matched: false, igMediaId: null };
  }

  const normalized = normalizePermalink(permalink);
  const response = await listRecentMedia(creds.igUserId, creds.accessToken);
  const match = response.data.find((m) => m.permalink && normalizePermalink(m.permalink) === normalized);

  if (!match) {
    throw new Error(
      "No matching post found in the account's recent media yet - Instagram can take a few seconds to index a new post. Wait a moment and try again, or use \"mark as posted without tracking\" to skip insights for this one."
    );
  }

  const { error } = await supabase
    .from("posts")
    .update({
      status: "published" satisfies ContentStatus,
      ig_media_id: match.id,
      published_at: match.timestamp ?? new Date().toISOString(),
      manual_permalink: permalink,
      error_message: null,
    })
    .eq("id", postId);
  if (error) throw new Error(`Failed to mark post ${postId} published: ${error.message}`);

  return { matched: true, igMediaId: match.id };
}
