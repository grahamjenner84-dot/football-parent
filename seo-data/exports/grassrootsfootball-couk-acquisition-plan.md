# grassrootsfootball.co.uk: decision and acquisition plan

Written 2026-09-23. Companion to the same-day exports in this folder:
`grassrootsfootball-couk-link-audit-2026-09-23.md` (the numbers),
`grassrootsfootball-couk-redirect-map-2026-09-23.csv` (the filled page map) and
`grassrootsfootball-couk-disavow-draft.txt` (the spam list). Re-run
`scripts/seo/cli/grassrootsfootball-couk-redirect-map.ts` to refresh all of them.

## Decision

Offer the £200 GoDaddy minimum. Walk away above £300.

Why that range and not more: the domain's own link profile is thin. Of 110
third-party referring domains, about a dozen are genuine (FourFourTwo with 35
dofollow links, the Mirror and Birmingham Mail as nofollow, Sportsister,
Saintsweb, Armagard, ThinkFitness and a few football blogs). The rest are
scraper directories, URL shorteners and gambling sites, most first seen in
2026, thirteen of them in the week of 18 to 23 September. The old site was
the Grass Roots Football Show, a 2009 to 2010 event, so the editorial links
are fifteen years old and Google has long since consolidated them onto
teamstats.net, which the domain redirects to.

Why it is still worth £200 to £300: footballparent.co.uk's own profile is
10 backlinks from 10 referring domains, domain rank 0, spam score 56, all
junk directories. FourFourTwo alone would be a bigger link asset than
everything the site has today. Redirected equity from a domain that changed
hands is heavily discounted, but a fraction of something beats a fraction of
nothing. There is also the defensive angle: TeamStats competes with the Coach
App and currently receives whatever the domain passes, and any other
coach-app company could point it at their own pages.

What not to expect: no measurable change on
`/parent-guides/what-is-grassroots-football` (its limit is AI Overview CTR,
not authority) and at best an indirect lift on
`/coaching/best-grassroots-football-apps` through the coaching hub. Treat
any ranking gain as a bonus. Do not build a second site on the domain.

## Before paying

1. Confirm the seller controls the Nominet registration (Nominet WHOIS) and
   that the sale transfers the domain by IPS tag or GoDaddy push. RDAP on
   2026-09-23 showed it at Cloudflare Registrar, expiring 2027-01-23.
2. The social accounts (Instagram, Facebook, X) are almost certainly not
   included. Do not pay extra for them.
3. Pay through GoDaddy or escrow, not by bank transfer to an individual.

## If the offer is accepted: order of work

1. **Transfer in.** Move the domain to the registrar you already use for
   footballparent.co.uk. Do not put any DNS on it until the redirects are
   ready; a parked page invites another wave of directory scrapers.
2. **Add the domain to the Vercel project** (both `grassrootsfootball.co.uk`
   and `www.grassrootsfootball.co.uk`) so it serves the same deployment as
   the main site. Vercel issues the certificate.
3. **Ship the redirects** (below) in one commit, in its own commit, logged to
   the current `seo-changes-*.md` with the hash. Then test every row of the
   redirect map with `curl -I` against the live domain.
4. **Verify the old domain in Search Console** as its own Domain property.
   Do not use Change of Address: that tool is for moving a site you have
   been running, and it also carries the whole profile across without
   letting you exclude anything.
5. **Upload the disavow file** (below) against the grassrootsfootball.co.uk
   property, never against footballparent.co.uk.
6. **Watch for 90 days.** Once a fortnight: Search Console links report on
   the old domain, and GSC impressions on `/coaching` and
   `/coaching/best-grassroots-football-apps`. Do not touch those pages for
   other reasons in the same window, so any movement is attributable.
7. **Renew for multiple years** once it is in. The point is that nobody else
   ever gets it.

## Where the redirects go

The page map is the filled `redirect_to` column in the redirect-map CSV.
The principle: every old URL redirects once, to one genuinely matching page,
or returns 410. Nothing is pointed at the homepage as a catch-all, and
nothing unrelated is pointed at a strong page to chase its links. That is
the line between a legitimate migration and the expired-domain repurposing
pattern in Google's spam policy.

| Old URL | Target | Reason |
|---|---|---|
| `/` (170 of 192 links, every Mirror link, 31 of FourFourTwo's 35) | `/coaching` | The old site was a coaches' event and FourFourTwo links from coaching-tips pages. The hub is the closest real match and feeds the Coach App. |
| `/tickets`, `/event-news`, `/ffttickets`, `/fftpreview`, `/fftexhib`, `/fftppass` | 410 | Show ticket and exhibitor pages for a 2009 to 2010 event. No equivalent. Pointing FourFourTwo's four deep links at an unrelated page would read as a soft 404. |
| `/article/how-to-become-a-pro-footballer` | `/football-development/how-to-become-a-professional-footballer` | Direct topic match. |
| `/article/common-mistakes-of-junior-football-coaches` | `/coaching` | Coach-facing, no coach-mistakes article yet. |
| `/article/many-benefits-of-your-child-playing-junior-football` | `/parent-guides/what-is-grassroots-football` | Parent-facing grassroots overview. |
| `/article/building-mental-resilience-in-young-footballers` | `/football-development/build-confidence-young-footballers` | Closest match. |
| `/article/why-dont-my-players-listen-at-training` | `/coaching` | Coach-facing, no equivalent article. |
| `/article/the-vital-role-of-facilities-in-uk-junior-grassroots-football` | `/parent-guides/what-is-grassroots-football` | Loose match, covers who runs grassroots football. |
| `/files/juliandicks_backtograssroots.pdf`, `/assets/Downloads/FATheatre10.pdf`, `/page.cfm/...`, `/pix/eh.jpg` | 410 | Old PDFs, a seminar listing and an image hotlink. |
| Anything else | 410 | Unknown paths get an honest gone, not a guess. |

Two follow-ups that would let two of the 410s and two hub redirects become
real page matches later: a coach-mistakes article and a "why don't my
players listen" article are both natural Coaching pieces. If either gets
written, update the map and the redirect config, and log it.

### Implementation notes

Host-matched rules belong in `next.config.ts` `redirects()` using
`has: [{ type: "host", value: "(www\\.)?grassrootsfootball\\.co\\.uk" }]`,
one entry per mapped path plus a root entry, each `permanent: true` and each
`destination` an absolute `https://www.footballparent.co.uk/...` URL so the
redirect changes host. Next's redirect config cannot return a 410, so the
catch-all lives in `proxy.ts`: if the request host is the old domain and the
path is not in the map, return an empty response with status 410. Keep the
map in one place (a small array in `lib/` imported by both) so the two
cannot drift. The old domain should never serve a Football Parent page under
its own name, so the proxy rule must come before everything else for that
host.

## How to shed the spam links

The problem: 79 of the 110 referring domains are directories, link farms,
URL shorteners and gambling sites, and new ones are being added weekly.
Google largely ignores links like these, but footballparent.co.uk already
carries a spam score of 56 from its own ten junk links, and a redirect
carries the old domain's profile with it.

The fix is a disavow file, uploaded against the old domain's own Search
Console property, so the exclusion applies to the links before they follow
the redirect. `grassrootsfootball-couk-disavow-draft.txt` is that file,
generated from the backlink export with this rule: max backlink spam score
of 40 or more, or an obvious directory, link-farm, shortener or gambling
name, and not on the keep list.

Keep list (never disavow): mirror.co.uk, birminghammail.co.uk,
fourfourtwo.com, armagard.pl, armagard.fr, sportsister.com, saintsweb.co.uk,
interalex.net, o-posts.com, thinkfitness.net, odp.org, punjab2000.com,
statc.co.uk, goosemoor-lane.com, scottliddell.com, the football Blogspot
blogs, and the harmless tool pages (piclur.com, prlog.ru, dnpric.es,
tntcode.com, screenshots.wiki, linkmetrics.pro, prospeo.io). Three were left
off both lists for a manual look: fijin.com, ahrefs-links.com, reelmind.ai.

Process:

1. After the domain is verified in Search Console, re-run the redirect-map
   script so the export is current, regenerate the draft (the rule above is
   easy to re-apply by hand or in a few lines), and check any new domain
   against the keep list.
2. Upload the file in the Disavow links tool for the grassrootsfootball.co.uk
   property. Google reads it on its next crawl of each link; allow a few
   weeks.
3. Do not upload anything against footballparent.co.uk unless its own
   profile starts showing the same pattern. Its ten existing junk links are
   not worth a disavow on their own.
4. Re-check the old domain's referring domains once a month for the first
   quarter, then quarterly, and append new junk to the file. A disavow file
   is replaced on each upload, not merged, so always upload the full list.

## If the offer is refused

Nothing changes. The site's link work stays with the prospecting scripts
(`seo-links` skill, `backlink-prospects-2026-09-17.csv`). Keep an eye on
whether the domain is relisted or expires: RDAP expiry 2027-01-23, and a
lapsed .co.uk goes through Nominet's suspension window before release.
