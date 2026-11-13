import { createClient } from "@supabase/supabase-js";

// Server-only service-role client for the SEO research tables, in the
// football-parent-social project. Refuses to start against any other
// project: the Coach App and Progress projects hold children's data and
// nothing in the SEO system may ever point at them (CLAUDE.md, "Supabase
// projects").
const SOCIAL_PROJECT_REF = "jwlwzoklgrzharqvazeg";

export function seoAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  if (!url.includes(SOCIAL_PROJECT_REF)) {
    throw new Error("SUPABASE_URL is not the football-parent-social project; refusing to read or write SEO data there");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
