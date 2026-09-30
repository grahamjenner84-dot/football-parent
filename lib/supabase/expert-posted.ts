import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key, same pattern as
// lib/supabase/partner-clicks.ts - this must never be imported from client
// code. football-parent-social project only.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// { "paul-barry-category-1": "2026-09-30", ... }
export async function getPostedExpertPosts(): Promise<Record<string, string>> {
  const { data, error } = await adminClient()
    .from("expert_posts_posted")
    .select("post_id, posted_on");
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.post_id] = row.posted_on;
  return out;
}

export async function setExpertPostPosted(
  postId: string,
  postedOn: string | null
): Promise<void> {
  const supabase = adminClient();
  const { error } = postedOn
    ? await supabase
        .from("expert_posts_posted")
        .upsert({ post_id: postId, posted_on: postedOn })
    : await supabase.from("expert_posts_posted").delete().eq("post_id", postId);
  if (error) throw new Error(error.message);
}
