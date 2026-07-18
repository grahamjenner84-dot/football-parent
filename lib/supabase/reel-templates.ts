import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_REEL_TEMPLATES_BUCKET || "reel-templates";

// Server-only client using the service role key — never import this from
// client code. Uploads/deletes always go through the API routes in
// app/api/reel-templates/, not directly from the browser.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadReelTemplateAsset(
  storagePath: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  const supabase = adminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: true });
  if (error) throw new Error("Supabase upload failed: " + error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteReelTemplateAssets(storagePathPrefix: string): Promise<void> {
  const supabase = adminClient();
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(storagePathPrefix);
  if (listError) throw new Error("Supabase list failed: " + listError.message);
  if (!files || !files.length) return;
  const paths = files.map((f) => storagePathPrefix + "/" + f.name);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw new Error("Supabase delete failed: " + error.message);
}
