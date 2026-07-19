import { SupabaseClient } from "@supabase/supabase-js";
import { PostRow, ContentStatus } from "../supabase/render-pipeline";

export interface AccountCredentials {
  accountRowId: string;
  igUserId: string;
  accessToken: string;
  tokenExpiresAt: string | null;
}

// accounts table is the source of truth (it's what a deployed cron job can
// read - .env.local only exists locally). IG_ACCOUNT_ID/IG_ACCESS_TOKEN env
// vars are a fallback for bootstrapping before the DB row is populated.
export async function getAccountCredentials(supabase: SupabaseClient, accountName = "Football Parent"): Promise<AccountCredentials> {
  const { data: account, error } = await supabase
    .from("accounts")
    .select("id, instagram_account_id, instagram_access_token, token_expires_at")
    .ilike("name", accountName)
    .maybeSingle();
  if (error) throw new Error("Failed to look up account: " + error.message);
  if (!account) throw new Error(`No account found with name "${accountName}"`);

  const igUserId = account.instagram_account_id || process.env.IG_ACCOUNT_ID;
  const accessToken = account.instagram_access_token || process.env.IG_ACCESS_TOKEN;
  if (!igUserId || !accessToken) {
    throw new Error(
      `Account "${accountName}" has no Instagram credentials (checked accounts.instagram_account_id/instagram_access_token and IG_ACCOUNT_ID/IG_ACCESS_TOKEN env vars)`
    );
  }
  return { accountRowId: account.id, igUserId, accessToken, tokenExpiresAt: account.token_expires_at };
}

export async function updateAccountToken(
  supabase: SupabaseClient,
  accountRowId: string,
  accessToken: string,
  tokenExpiresAt: string
): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .update({ instagram_access_token: accessToken, token_expires_at: tokenExpiresAt })
    .eq("id", accountRowId);
  if (error) throw new Error("Failed to persist refreshed Instagram token: " + error.message);
}

// Only posts with a scheduled_time that has actually passed - a
// status='scheduled' post with no scheduled_time set is left alone rather
// than treated as "due immediately", since that almost certainly means the
// schedule was never assigned rather than "publish ASAP".
export async function getPostsDueToPublish(supabase: SupabaseClient, limit = 5): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, post_slides(*)")
    .eq("status", "scheduled")
    .not("scheduled_time", "is", null)
    .lte("scheduled_time", new Date().toISOString())
    .order("scheduled_time", { ascending: true })
    .limit(limit);
  if (error) throw new Error("Failed to query posts due to publish: " + error.message);
  return (data ?? []) as PostRow[];
}

export async function markPublished(supabase: SupabaseClient, postId: string, igMediaId: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ status: "published" satisfies ContentStatus, ig_media_id: igMediaId, published_at: new Date().toISOString(), error_message: null })
    .eq("id", postId);
  if (error) throw new Error(`Failed to mark post ${postId} published: ${error.message}`);
}

export async function markPublishFailed(supabase: SupabaseClient, postId: string, message: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ status: "failed" satisfies ContentStatus, error_message: message })
    .eq("id", postId);
  if (error) throw new Error(`Failed to mark post ${postId} failed: ${error.message}`);
}

export async function saveParentContainerId(supabase: SupabaseClient, postId: string, containerId: string | null): Promise<void> {
  const { error } = await supabase.from("posts").update({ ig_container_id: containerId }).eq("id", postId);
  if (error) throw new Error(`Failed to save container id for post ${postId}: ${error.message}`);
}

export async function saveChildContainerId(supabase: SupabaseClient, slideId: string, containerId: string | null): Promise<void> {
  const { error } = await supabase.from("post_slides").update({ ig_child_container_id: containerId }).eq("id", slideId);
  if (error) throw new Error(`Failed to save child container id for slide ${slideId}: ${error.message}`);
}
