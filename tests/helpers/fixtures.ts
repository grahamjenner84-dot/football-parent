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
