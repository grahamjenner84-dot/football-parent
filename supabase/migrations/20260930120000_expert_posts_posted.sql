-- Which saved Expert Opinion carousels (public/expert-posts.json) Graham has
-- already posted to Instagram. The builder (public/expert-quote-builder.html)
-- hides posted ones from its "Saved posts" dropdown; keeping the marks here
-- rather than in one browser's localStorage means marking a post on the phone
-- also hides it on the laptop.
--
-- Read and written only through /api/expert-posted, behind the admin session
-- in proxy.ts. One row per post id; unmarking deletes the row.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- never the Coach App project. See CLAUDE.md "Supabase projects".

create table if not exists expert_posts_posted (
  -- The "id" of the entry in public/expert-posts.json, e.g. paul-barry-category-1.
  post_id text primary key,
  posted_on date not null default current_date,
  created_at timestamptz not null default now()
);

alter table expert_posts_posted enable row level security;

-- Grants-only lockdown, same as every other table in this project.
grant select, insert, update, delete on expert_posts_posted to service_role;
