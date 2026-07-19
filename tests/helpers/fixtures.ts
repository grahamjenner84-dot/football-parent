import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostRow, PostSlideRow } from "../../lib/supabase/render-pipeline";
import type { AccountCredentials } from "../../lib/instagram/publish-pipeline";

export function makeSlide(overrides: Partial<PostSlideRow> = {}): PostSlideRow {
  return {
    id: `slide-${Math.random().toString(36).slice(2, 8)}`,
    post_id: "post-1",
    slide_order: 1,
    image_url: "https://example.com/img.png",
    video_url: null,
    alt_text: null,
    text_content: null,
    ig_child_container_id: null,
    duration_sec: null,
    ...overrides,
  };
}

export function makePost(overrides: Partial<PostRow> = {}): PostRow {
  return {
    id: "post-1",
    account_id: "acct-1",
    content_queue_id: null,
    content_type: "interview",
    format: "carousel",
    caption: "Test caption",
    hook_text: null,
    scheduled_time: new Date().toISOString(),
    status: "scheduled",
    render_payload: {},
    created_at: new Date().toISOString(),
    post_slides: [],
    ig_media_id: null,
    ig_container_id: null,
    published_at: null,
    error_message: null,
    ...overrides,
  };
}

export const fakeCreds: AccountCredentials = {
  accountRowId: "acct-row-1",
  igUserId: "ig-user-1",
  accessToken: "token-1",
  tokenExpiresAt: null,
};

export interface FakeSupabaseCall {
  table: string;
  payload: Record<string, unknown>;
  match: Record<string, unknown>;
}

// Covers exactly the shape every publish-pipeline.ts mutation helper uses:
// supabase.from(table).update(payload).eq(col, val). Good enough for these
// tests since none of the code under test does anything more elaborate.
export function createFakeSupabase(): { client: SupabaseClient; calls: FakeSupabaseCall[] } {
  const calls: FakeSupabaseCall[] = [];
  const client = {
    from(table: string) {
      return {
        update(payload: Record<string, unknown>) {
          return {
            eq(col: string, val: unknown) {
              calls.push({ table, payload, match: { [col]: val } });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

export interface FakePostMetricsRow {
  post_id: string;
  pull_window: string;
  [key: string]: unknown;
}

// Covers exactly the shape insights-pipeline.ts uses: posts.select().eq()
// .not().not().order() and post_metrics.select().in() / .upsert(). An
// in-memory postMetrics array backs both the select and the upsert, so a
// test can seed(), call getDueInsightsPulls/recordMetricsPull, then call
// getDueInsightsPulls again against the SAME state to prove idempotency
// end-to-end, the same way a real cron tick would see the effect of the
// previous one.
export function createFakeInsightsSupabase(seed: { posts: PostRow[]; postMetrics?: FakePostMetricsRow[] }): {
  client: SupabaseClient;
  state: { posts: PostRow[]; postMetrics: FakePostMetricsRow[] };
  upsertCalls: FakePostMetricsRow[];
} {
  const state = { posts: seed.posts, postMetrics: [...(seed.postMetrics ?? [])] };
  const upsertCalls: FakePostMetricsRow[] = [];

  const client = {
    from(table: string) {
      if (table === "posts") {
        return {
          select(_cols: string) {
            const query = {
              eq: () => query,
              not: () => query,
              order: () => Promise.resolve({ data: state.posts, error: null }),
            };
            return query;
          },
        };
      }
      if (table === "post_metrics") {
        return {
          select(_cols: string) {
            return {
              in: (_col: string, ids: string[]) => Promise.resolve({ data: state.postMetrics.filter((r) => ids.includes(r.post_id)), error: null }),
            };
          },
          upsert(row: FakePostMetricsRow, _opts: unknown) {
            upsertCalls.push(row);
            const idx = state.postMetrics.findIndex((r) => r.post_id === row.post_id && r.pull_window === row.pull_window);
            if (idx >= 0) state.postMetrics[idx] = { ...state.postMetrics[idx], ...row };
            else state.postMetrics.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`createFakeInsightsSupabase: unexpected table "${table}"`);
    },
  };
  return { client: client as unknown as SupabaseClient, state, upsertCalls };
}
