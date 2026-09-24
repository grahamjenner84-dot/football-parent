---
name: football-parent-outreach
description: "Weekly link-building run for Football Parent: finds and vets new UK prospects, drafts up to 15 personal outreach emails, queues chase-ups and spots links won, all into the /admin/outreach queue. Use for the Monday outreach routine or any 'fill the outreach queue' / 'draft outreach emails' request. Never sends email."
---

# Football Parent weekly outreach run

Fills the queue Graham works through at `/admin/outreach`. He edits and
sends every email himself from footballparentuk@gmail.com. **You never send
anything, never email anyone and never submit a contact form.**

All reads and writes go through `npx tsx scripts/outreach/cli.ts`. That
writes to the `football-parent-social` Supabase project and never touches
the Coach App one. Working JSON files go in the scratchpad, never the repo.

Target: 2 to 3 links a month from about 15 new emails a week. A bad
prospect wastes one of Graham's 15 slots and trains him to distrust the
list. **Quality over volume: send him 9 good drafts rather than 15 padded
ones.**

## 0. Preflight

- `npx tsx scripts/outreach/cli.ts stats`. If this fails on credentials
  or network, stop and report exactly what failed. Don't carry on half-done.
- `npx tsx scripts/outreach/cli.ts close-expired` closes anything past its
  second chase.

## 1. Links won and chase-ups

`npx tsx scripts/outreach/cli.ts queue` returns `toDraft`, `chaseDue` and
`linkChecks`.

- For each item in **linkChecks**, WebFetch the prospect URL and look for
  a link to `footballparent.co.uk`. If one is there:
  `cli.ts link-result <id> <page-url>`. If not: `cli.ts link-result <id>`.
- For each item in **chaseDue**, the admin page already builds the generic
  chase from `chaseBody()` in `lib/outreach/lifecycle.ts`. You only need to
  refresh the optional one-line `chase_line` when you have something
  genuinely new to say (for example, a new article on the exact topic they
  covered). Save it via `save-drafts` with the same id, subject and body.
  Otherwise leave it alone.

## 2. Discover new prospects

Stop once the backlog holds about 3 weeks of good prospects (45 or more).
Beyond that, discovery is just noise. Work these sources in order of hit
rate:

1. **Warm contacts.** Experts interviewed on the site (search `content/`
   for interview articles), partners (Football DNA, see
   `lib/outbound-partners.ts`) and brands we review. Add their own site's
   relevant page as `expert` or `business`. The ask is a link from their
   bio, press or "as featured in" page, or from a post about the
   collaboration.
2. **UK club and league parent pages.** WebSearch for pages such as
   `"junior football club" "parents" "useful links"`,
   `"youth football club" "new parents" welcome`,
   `"football league" "parents" resources site:.co.uk` and
   `"under 7s" OR "under 8s" football club parents information`. The
   pitch is one of our guides, or the equal playing time calculator, as a
   resource for their parents.
3. **Equal playing time and club policy pages.** UK clubs and leagues that
   publish a playing-time policy as a web page (not a PDF) are a natural
   fit for `/coaching/equal-playing-time-in-grassroots-football`.
4. **UK grassroots blogs and resource roundups** covering topics we have
   strong articles on: academy trials, development centres, boots and
   gear, parent behaviour. Use `lib/routes.ts` to see what we have.
5. **Unlinked mentions.** WebSearch `"Football Parent" -site:footballparent.co.uk`
   and `"footballparent.co.uk"` for pages that mention us without a link.
   These are the easiest wins of all.
6. **Competitor overlap** (costs DataForSEO credit, so at most one query a
   run). See the `seo-links` skill.

For each candidate, WebFetch the page before adding it. **Only add it if all
of these are true:**

- It's a live HTML page about football, and a UK audience is plausible.
- It's editorial: an article, a resource page, or a club or league
  information page. Not a PDF, shop, forum, directory entry or homepage.
- It already links out to other sites, or it's a page that naturally would.
- You can name the exact Football Parent page that improves it, and say
  why in one sentence.

Write candidates to a scratch JSON file and run `cli.ts add <file>`:

```json
[{
  "url": "https://example-jfc.co.uk/parents",
  "source": "discovery:junior football club parents useful links",
  "title": "Information for parents",
  "context": "Club parent info page, links to FA Respect and the club's kit shop",
  "fit": 8,
  "fit_note": "Parent info page for U7-U12 with no guidance on trials or kit sizing",
  "fp_page": "/parent-guides/<slug>",
  "angle": "Offer our shin pad sizing guide as a parent resource for their kit list",
  "contact_name": "Jo Smith (club secretary)",
  "contact_email": "secretary@example-jfc.co.uk",
  "contact_url": "https://example-jfc.co.uk/contact"
}]
```

`add` runs the hard quality gate (`lib/outreach/quality.ts`) again and
stores any rejects as `rejected`, so they are never proposed again. Rows the
gate parks (FA, homepage and partner links, national press) belong in the
Parked tab for a partnership conversation, not in the email queue.

**Governing bodies:** don't pitch county FAs or thefa.com for editorial
links. Their outbound links go to commercial partners (TeamStats' county
links come from hosting FA leagues). Note a real partnership route in the
run report if you spot one.

## 3. Draft this week's emails

`queue` lists `toDraft`: the top of the rescored backlog, one per domain,
enough to bring the drafted pile up to 15. For each one:

1. WebFetch the page again and re-check it against the list in step 2. If
   it fails, or you can't find anything specific and true to say about it,
   don't draft it. Leave it for Graham to skip, and mention it in the report.
2. Find a contact: a named person (club secretary, welfare officer, blog
   author, editor) with an email address, from the page, the contact page
   or the committee page. A contact form URL is the fallback. **Never guess
   an email address.**
3. Write the email:
   - **Subject:** specific to their page, under 60 characters, no clickbait.
   - **Opening:** one sentence showing you read their actual page (quote or
     name something specific on it).
   - **The offer:** what their readers gain from our page, and exactly where
     it would sit (for example, "under the kit list on your new parents
     page"). Offer the resource. Don't "ask for a backlink".
   - **Credibility:** one line on who Graham is (a grassroots football
     parent and coach who runs Football Parent) only if it helps.
   - **Close:** `Thanks,` / `Graham` / `Football Parent`. No opt-out or
     unsubscribe line: these are individual, personal emails, not a
     marketing send, and a footer like that makes them read as bulk.
   - **Length:** 70 to 130 words in total, plain text, no links other than
     the one page being pitched.
   - Follow the CLAUDE.md editorial rules: UK English, **no em dashes**, no
     "badge" or "name on the box" cliches, no AI filler ("I hope this email
     finds you well", "I came across your amazing...", "delve", "game-changer").
   - Clubs are run by volunteers, so be brief and warm and never salesy.
     Experts and partners are warm contacts, so write accordingly.
   - `chase_line`: optional, one sentence to add personal context to the
     chase-ups later.
4. Save everything with `cli.ts save-drafts <file>`:
   `[{id, subject, body, contact_name, contact_email, contact_url, fp_page, angle, fit, fit_note, chase_line}]`.
   This moves each prospect to `drafted`.

## 4. Report

Finish with a short summary. The routine's session is what Graham reads, so
include:

- drafts written, and prospects left undrafted with the reason
- chase-ups due this week
- links found (with URLs)
- how many new prospects were added, parked and rejected, and which
  sources produced them
- any partnership or press opportunities spotted (for the Parked tab)
- the result of `cli.ts stats`

Don't commit anything. The run changes Supabase rows, not the repo.
