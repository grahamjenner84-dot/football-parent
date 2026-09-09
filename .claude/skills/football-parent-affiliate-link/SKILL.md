---
name: football-parent-affiliate-link
description: "Turns a pasted Amazon URL into a canonical tagged Football Parent affiliate link and writes it into an article as a GearPicks entry or inline MDX recommendation. Use whenever an Amazon link, ASIN or product name is pasted, or the user wants to add a product pick, gear recommendation, affiliate link or monetise an article - even if they don't say 'affiliate'."
---

# Football Parent Affiliate Link

Converts whatever Amazon gives you (a full share URL, a SiteStripe link, a
bare ASIN) into the canonical form this site uses, then places it in an
article with a recommendation that earns its place.

The link itself is the easy half. The reason a pick exists is the part that
decides whether anyone clicks it, so most of this skill is about that.

## The tracking ID

```
footballpar09-21
```

Canonical link format, which is what should end up in the MDX:

```
https://www.amazon.co.uk/dp/<ASIN>?tag=footballpar09-21
```

This is a UK Associates tag, so links belong on `amazon.co.uk`. If someone
pastes an `amazon.com` URL, say so rather than silently rewriting the
domain: the ASIN often differs between marketplaces and a same-ASIN guess
can land on a different product.

## Workflow

1. **Extract the ASIN.** It is 10 characters, `[A-Z0-9]{10}`, and non-book
   products almost always start `B0`. It appears after any of these:

   ```
   /dp/<ASIN>          /gp/product/<ASIN>     /gp/aw/d/<ASIN>
   /product/<ASIN>     /exec/obidos/ASIN/<ASIN>     ?asin=<ASIN>
   ```

2. **Drop everything else.** Amazon share URLs carry a long tail of session
   and referral junk that does nothing for attribution and dates the link:
   `ref`, `ref_`, `th`, `psc`, `sr`, `qid`, `keywords`, `sprefix`, `crid`,
   `dib`, `dib_tag`, `content-id`, `sp_csd`, `pd_rd_*`, `pf_rd_*`,
   `linkCode`, `linkId`, `creative`, `creativeASIN`, `camp`, `smid`,
   `_encoding`. Rebuild from the ASIN rather than editing the pasted string
   - it is shorter, and you can see at a glance which product it points at.

3. **Handle short links honestly.** `amzn.to` and `amazon.co.uk` are both
   blocked by the sandbox proxy, so a short link cannot be resolved or
   verified from here. Ask for the ASIN, or for SiteStripe's **Full Link**
   option instead of Short Link. Existing `amzn.to` links already in the
   repo work fine and carry real click history - leave them alone.

   Never reconstruct an ASIN from a product name or a web search result.
   Nothing is verifiable from this environment, and a wrong ASIN sends a
   parent to the wrong product with our tag on it.

4. **Pick the placement.**

   **`GearPicks`** for a set of two to four parallel options the reader is
   choosing between (budget vs step up, slip-in vs ankle guard). It renders
   a bordered card with buttons, and it is what a reader scanning for "which
   one do I buy" actually stops on.

   **Inline markdown link** for a single product named inside a paragraph
   that is already making an argument about it. A one-item `GearPicks` card
   reads as an advert; a sentence reads as advice.

5. **Write the reason, not the spec.** A pick is worth including when you
   can say who it suits and what trade-off it carries. "Lightweight and
   durable" is filler that could describe anything. "Sold in a genuine W
   width, so it fits without sizing up" is a reason. Where a pick has a real
   drawback, say it: the drawbacks are what make the rest credible.

6. **Verify and record.** Run `npm run build` (the real correctness check
   here, and the only thing that catches malformed MDX). Commit the change
   on its own, then log it to whichever `seo-changes-*.md` file in the repo
   root has the most recent date - what changed, which page, and the commit
   hash.

## GearPicks syntax

`data` is a JSON string in a single-quoted attribute:

```mdx
<GearPicks data='[
  {"label":"Budget pick","name":"Product Name","href":"https://www.amazon.co.uk/dp/B0XXXXXXXX?tag=footballpar09-21","note":"Who it suits and the one trade-off."},
  {"label":"Step up","name":"Other Product","href":"https://www.amazon.co.uk/dp/B0YYYYYYYY?tag=footballpar09-21","note":"Why you would pay more."}
]' />
```

`label` and `note` are optional; `name` and `href` are required, and items
missing either are silently dropped at render time, so a typo in a key name
shows up as a missing row rather than an error.

**Apostrophes break it.** The attribute is single-quoted, so an apostrophe
anywhere in `note` or `name` ends the attribute early and the JSON parse
fails silently, rendering nothing at all. Rewrite the phrase, or use
`&apos;`.

## What the repo already handles

Do not hand-write any of this - it is applied automatically, and duplicating
it by hand is how the two rendering paths drift apart:

- `rel="sponsored nofollow noopener noreferrer"` and `target="_blank"` come
  from `lib/affiliate.ts`, applied both by the `a` override in
  `lib/MDXContent.tsx` and by `GearPicks`. `AFFILIATE_HOSTS` already covers
  `amzn.to`, `amazon.co.uk` and `amazon.com`, so long-form tagged links are
  treated identically to short ones.
- `GearPicks` renders its own `AffiliateDisclosure` line. A section that
  recommends products only through inline prose links does not, so add the
  disclosure there yourself - CMA/ASA guidance expects it visible where the
  links are, not only on the policy page.
- Click tracking is a single delegated listener in
  `app/components/AffiliateClickTracker.tsx`, mounted once in the layout. It
  beacons to `/api/affiliate-click` and reports at `/admin/seo` under Amazon
  clicks.
- `data-affiliate-placement="gear-picks"` is set by `GearPicks`. Anything
  else reports as `inline`. If you build a new component that renders
  affiliate links, set that attribute on it or its clicks are mislabelled.

## Judging whether a product deserves a pick

The commercial instinct is to link whatever is linkable. Resist it, because
these articles rank on being right about fit and sizing, and one bad
recommendation costs more trust than one extra click earns.

- **Check size coverage first.** A listing down to one or two sizes is worse
  than no pick on a fit-related page, where the entire audience is people
  who already struggle to find their size. This is the most common reason to
  reject an otherwise good product.
- **A SiteStripe refusal is information.** If Amazon declines to generate a
  link for high return rate, that usually means a sizing problem on exactly
  the kind of product these articles cover. Pick something else rather than
  hand-building a link around the refusal, and flag it - whether to promote
  a restricted product is the account holder's call, not ours.
- **Prefer stable, deeply stocked products.** Shin pads, balls and gloves
  are sized in broad bands and restock predictably. Boots are size x width x
  colourway and churn constantly, so boot links need re-checking and are
  worth fewer picks.
- **Three good picks beat five with a dud.** A section is not improved by
  padding it out to fill the card.

## House style

The site's editorial rules apply in full, and two of them get broken
constantly in product copy:

- **No em dashes.** Use commas, colons, or restructure.
- **No "name on the box" or "badge" framing.** It reads as AI filler, and it
  is exactly the register product recommendations drift into.

Prices go stale and are a maintenance burden, so keep them out of the prose.
Point readers to check current price at the retailer instead. Where a
product's real-world size band or fit differs from its marketing, say so:
that specificity is the reason someone trusts the pick.

## SEO guardrails

Adding a product section to a page that already ranks counts as a change to
a live page, so `CLAUDE.md`'s SEO rules apply:

- One lever per page per change. The product section is the lever - don't
  bundle a title or meta rewrite into the same commit, or nothing can be
  attributed afterwards.
- Additive only. Never remove an existing heading, internal link or section
  to make room.
- Never change the slug of a page that already has impressions.
- After publishing, that page waits 10 to 14 days before the next change.
