---
name: football-parent-expert-interview
description: Turns an expert's Q&A answers plus a photo URL into a published Football Parent interview article AND sets that expert up in the Expert Opinion Instagram builder (photo, logo, bio, role, handle), so a carousel can be made from any device. Use whenever Graham pastes or uploads interview questions and answers from a coach or expert, or asks to write up an interview, even if he doesn't mention Instagram.
---

# Football Parent Expert Interview

Graham's input is usually: the questions and answers (pasted or a file) and a
URL with the expert's photo on it. The job has two outputs, both required:

1. The interview article on footballparent.co.uk.
2. The expert saved in the Expert Opinion builder (`/expert-quote-builder.html`),
   so when Graham wants an Instagram post he just picks them from the
   "Saved experts" dropdown, on desktop or phone.

The article follows every rule in the `football-parent-articles` skill
(editorial rules, `page.tsx`, `lib/routes.ts`, the `seo-changes-*.md` log,
`npm run build`). Read it. This skill only adds what is specific to interviews
and to the builder.

## 1. Gather the expert details

Pull these from the Q&A, the photo page and the expert's own site or
Instagram. Ask Graham only for what you genuinely can't find:

- Full name, job title, organisation.
- The Instagram handle the builder should tag (the organisation's account if
  they post from it, e.g. `@footballdna_` for Paul Barry, otherwise their own).
- Website / Instagram URLs for the article's links.
- A photo, and an organisation logo if one exists.

## 2. Save the images to the repo

- Photo: `public/images/people/<first>-<last>[-<org>].jpg|png`. If the URL is a
  web page rather than an image, take the page's `og:image` or the obvious
  headshot. Check the downloaded file is a real image (not an HTML error page)
  and roughly square-croppable around the face. Keep it under ~150 KB.
- Logo, if the organisation has one: `public/images/people/<org>-logo.png`.
  If there's no logo, the photo doubles as the logo (the builder's credit
  circle crops it round).

These files serve both the article and the builder, so the builder works on
any device without uploading anything.

## 3. Write the interview article

`content/parent-guides/<expert-or-topic>-interview.mdx`, matching the existing
interviews (`matt-baxter-young-footballer-mindset-interview.mdx` is the
cleanest reference; the JPL and Future Fit ones are two-part examples):

- Title in the form "Topic: Name on X, Y and Z"; a description in the
  meta-description style from memory (~150-165 chars, no slop words).
- Opening `##` section: why these questions matter to parents, who the expert
  is, "his/her answers are below, in their own words".
- `## About <Name>`: the photo card (image, name, title, full bio paragraph
  with their links).
- One `##` per question: the "Football Parent asks" box with the question,
  the `Name • Title` attribution line, then the answer.
- **Answers stay in the expert's words.** Fix typos, split long paragraphs and
  add formatting (lists) only. Don't rewrite, reorder or add claims to them.
  The one exception: em dashes become commas or full stops, as in every
  existing interview (the no-em-dash rule applies site-wide).
- `## Final Thoughts` in Football Parent's voice, with paste-ready internal
  links into relevant guides.
- The Editor's Note box, then `## Related Articles`.
- Reusable lines go into
  `.claude/skills/football-parent-articles/references/expert-quotes.md`
  under a heading for this expert, the same way the Paul Barry and Martin Brock
  quotes are logged. Don't insert `ExpertQA` boxes into other articles unless
  Graham asks: that's a separate SEO change per page.

## 4. Add the expert to the Instagram builder

Add (or update, if the `id` already exists; never duplicate) an entry in
`public/expert-presets.json`:

```json
{
  "id": "first-last",
  "label": "First Last (Organisation)",
  "name": "Organisation or brand, as the credit sub-line shows it",
  "handle": "@instagramhandle",
  "person": "First Last",
  "role": "Title · Organisation",
  "logoSrc": "/images/people/<org>-logo.png",
  "bioSrc": "/images/people/<photo file>",
  "bio": "One or two sentences, third person."
}
```

Fit limits, because the builder draws these onto fixed-size slides:

- `role` is drawn on one line with no wrapping: keep it to about 32
  characters. Shorten long titles ("Head of Coaching, Content & Club Support"
  becomes "Head of Coaching · Football DNA").
- `bio` must fit the 4:5 bio slide: about 220 characters, which is 3 to 4
  lines. Use the short bio (the same one as the article's `ExpertQA` `bio`),
  not the long About paragraph.
- `name` is the account or organisation (the credit reads "PERSON" over
  "NAME · @HANDLE"), not the person again.
- Paths are site-root paths starting with `/`, pointing at the files from
  step 2.

Check it: with the dev server running, open
`http://localhost:3000/expert-quote-builder.html`, pick the expert from
"Saved experts", switch to "Feed post 4:5" and step through the cover and bio
slides. The photo and logo should load, the role should sit on one line, and
the bio shouldn't run into the footer handles.

## 5. Ship

Follow CLAUDE.md: build, commit the article, images and preset together, and
log the new article in the latest `seo-changes-*.md`. When Graham says to put
it live, merge to `main` and confirm the deploy.

Tell Graham in the summary that the expert is now in the builder's
"Saved experts" list.

## 6. Instagram posts

Once the article exists, run the `football-parent-expert-carousel` skill on
it to harvest 2-3 carousels (one angle each, exact words only) into the
builder's "Saved posts" list.
