-- Graham's own networks, so that his visits stop being counted without a
-- cookie having to survive in his browser.
--
-- The existing owner exclusion (fp_admin_session / fp_no_track cookies, set
-- on /admin login) assumes a persistent browser profile. He browses the
-- site in incognito, where every window starts with no cookies, so on
-- 4-6 Oct 2026 roughly a hundred of his own test visits to the game time
-- calculator landed in page_views and two test sign-ups in
-- coach_app_signups. Screenshots taken by Playwright from his PC have the
-- same shape: a normal Chrome user agent and no cookies.
--
-- Every write endpoint (page views, affiliate and partner clicks, Coach App
-- shares and sign-ups, Progress joins) compares the request's source
-- network against this table through lib/owner-request.ts and drops the
-- row on a match. Visitors' addresses are still never stored anywhere.
--
-- Nor is Graham's: `network_hash` is an HMAC-SHA256 of the network key
-- under ADMIN_SESSION_SECRET, so the table itself holds nothing readable
-- even if it leaked. The key being hashed is an IPv4 address as-is, or the
-- /64 prefix of an IPv6 address (privacy extensions rotate the device half
-- daily; the prefix the ISP hands the router stays put). Managed from
-- /admin/seo ("Exclude this network"), which adds whatever network the
-- dashboard request came from; there is no way to type one in.
--
-- Lives in the football-parent-social project (ref jwlwzoklgrzharqvazeg),
-- never the Coach App project. See CLAUDE.md "Supabase projects".

create table if not exists owner_networks (
  id bigint generated always as identity primary key,
  network_hash text not null unique,
  label text,
  created_at timestamptz not null default now()
);

alter table owner_networks enable row level security;

-- Grants-only lockdown, same as every other table in this project.
grant select, insert, delete on owner_networks to service_role;
