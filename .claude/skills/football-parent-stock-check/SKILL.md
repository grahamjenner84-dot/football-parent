---
name: football-parent-stock-check
description: Weekly Amazon stock and dead-link sweep of every affiliate product link on Football Parent. Checks each linked variant and stock across all its sizes and colours in Graham's Chrome, then swaps sold-out or dead links for in-stock variants or equivalent products. Use when Graham asks to check stock, check affiliate links, run the weekly stock check, or says a product looks sold out.
---

# Amazon stock check

Amazon serves scripted requests (curl, WebFetch, Node) a bot-check page, so
this only works through Claude in Chrome (`mcp__claude-in-chrome__*`). No
Amazon sign-in is needed. If the Chrome tools are not loaded, say so and stop:
`/chrome` must be enabled and the session restarted.

## 1. List the links

```bash
grep -rhoE "amazon\.co\.uk/(dp/[A-Z0-9]{10}|s\?k=[^\"&)]+)" content | sort | uniq -c
```

Note which files each ASIN appears in (`grep -rln <ASIN> content`): one
product is often linked from several guides (gifts guide especially).

## 2. Check stock in Chrome

Open one tab on `https://www.amazon.co.uk/` (fetches must be same-origin),
then define this in the page with `javascript_tool`:

```js
window.chk = async (a) => {
  const html = await fetch('/dp/'+a+'?th=1&psc=1').then(r=>r.text());
  const d = new DOMParser().parseFromString(html,'text/html');
  const title = (d.querySelector('#productTitle')?.textContent||d.title).trim().replace(/\s+/g,' ').slice(0,70);
  const price = d.querySelector('#corePrice_feature_div .a-offscreen')?.textContent||'';
  const av = (d.querySelector('#availability')?.textContent||'').trim();
  const n = (av.match(/Only (\d+) left/)||[])[1];
  const st = !price ? 'OUT' : n ? 'low'+n : 'ok';
  const m = html.match(/"dimensionToAsinMap"\s*:\s*(\{[^}]*\})/);
  const kids = m ? [...new Set(Object.values(JSON.parse(m[1])))] : [];
  let vs = '';
  if (kids.length > 1) {
    const r = await Promise.all(kids.map(async k => {
      const dd = new DOMParser().parseFromString(await fetch('/dp/'+k+'?th=1&psc=1').then(r=>r.text()),'text/html');
      const p = dd.querySelector('#corePrice_feature_div .a-offscreen')?.textContent;
      return !p ? 'out' : /Only \d+ left/.test(dd.querySelector('#availability')?.textContent||'') ? 'low' : 'ok';
    }));
    vs = ` | variants ${kids.length}: ok ${r.filter(x=>x=='ok').length}, low ${r.filter(x=>x=='low').length}, out ${r.filter(x=>x=='out').length}`;
  }
  return `${a} ${st} ${price} | ${title} | ${d.querySelector('#acrCustomerReviewText')?.textContent||''}${vs}`;
};
```

Run the ASIN list in the background and poll, because one call over ~45s
times out the tab:

```js
window.__res=[]; (async()=>{ for (const a of [/* ASINs */]) { try { __res.push(await chk(a)); } catch(e) { __res.push(a+' ERR'); } } __res.push('END'); })(); 'started'
```

Then `computer` wait 10s a few times in one `browser_batch` and read
`__res`. Tool output truncates around 1,000 characters, so read it in
slices. A page titled "Page Not Found" is a dead link.

To find an in-stock variant of a product, list its variants (the
`dimensionValuesDisplayData` JSON gives each child ASIN's size/colour) and
pick an `ok` one in a mid-range size. To find a replacement product, fetch
`/s?k=<query>`, skip "Sponsored" results, and run `chk` on the top few.

## 3. Decide

- **Linked variant OUT, others in stock:** swap to an in-stock variant of the
  same product. No copy change.
- **Product mostly out (most sizes OUT) or page dead:** replace with the
  nearest equivalent that is well stocked (same brand and tier first, then
  the next tier, then another brand). Update `name` and any note claim that
  no longer holds (sizes, colours, closure, price). Prefer more reviews.
- **No in-stock equivalent:** a tagged `/s?k=` search link beats a dead
  product link. Say so in the report.
- **Search links in guides:** replace with a verified product when a good,
  well-reviewed match exists.
- **Low stock only:** leave it, list it in the report as one to watch.
- Never change a pick Graham owns or wrote a ParentNote about to a different
  product without asking. Swapping the variant of the same product is fine.

Follow `football-parent-affiliate-link` for link format (full tagged `/dp/`
link, never `amzn.to`).

For every `/dp/` link you remove, add the old one to
`lib/affiliate-retired-links.json` (key: `amazon.co.uk/dp/<asin>` in lower
case, value: the product name it had). Clicks already logged against it are
named from that file in the `/admin/seo` Amazon clicks report; without it they
show as a raw URL.

## 4. Ship

Branch from `main`, one commit for the link changes, log it in the latest
`seo-changes-*.md` as link maintenance (which links, why, old and new
ASINs), `npm run build`, and report to Graham in a table: page, product,
problem, fix. Merge only when he says to put it live.
