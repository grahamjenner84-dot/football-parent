-- This project's Postgres role does not auto-expose newly created tables to
-- Data API roles (see supabase/config.toml api.auto_expose_new_tables) -
-- GRANTs are required in addition to RLS. service_role bypasses RLS but
-- still needs table-level GRANTs to be reachable at all; anon/authenticated
-- intentionally get nothing, so RLS has no policies to enforce for them.

grant select, insert, update, delete on
  accounts,
  content_queue,
  posts,
  post_slides,
  post_metrics,
  hook_library,
  ai_suggestions
to service_role;
