import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key — content_queue and accounts
// have no anon/authenticated grants, so this must never be imported from
// client code. See supabase/migrations/20260718192716_instagram_content_automation_grants.sql.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type ContentType = "joke" | "education" | "interview";

export interface AddToContentQueueInput {
  contentType: ContentType;
  topic: string;
  priority?: number;
  account?: string;
}

export interface AddToContentQueueResult {
  id: string;
  accountId: string;
  accountName: string;
  contentType: ContentType;
  topic: string;
  priority: number;
  status: string;
  source: string;
  createdAt: string;
}

export async function addToContentQueue(
  input: AddToContentQueueInput
): Promise<AddToContentQueueResult> {
  const supabase = adminClient();
  const accountName = input.account?.trim() || "Football Parent";

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, name")
    .ilike("name", accountName)
    .maybeSingle();

  if (accountError) {
    throw new Error("Failed to look up account: " + accountError.message);
  }
  if (!account) {
    throw new Error(`No account found with name "${accountName}"`);
  }

  const { data, error } = await supabase
    .from("content_queue")
    .insert({
      account_id: account.id,
      content_type: input.contentType,
      topic: input.topic,
      priority: input.priority ?? 0,
      source: "chat",
    })
    .select("id, content_type, topic, priority, status, source, created_at")
    .single();

  if (error) {
    throw new Error("Failed to insert content_queue row: " + error.message);
  }

  return {
    id: data.id,
    accountId: account.id,
    accountName: account.name,
    contentType: data.content_type,
    topic: data.topic,
    priority: data.priority,
    status: data.status,
    source: data.source,
    createdAt: data.created_at,
  };
}
