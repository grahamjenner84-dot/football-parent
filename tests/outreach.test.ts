import { test } from "node:test";
import assert from "node:assert/strict";
import { assessProspect } from "../lib/outreach/quality";
import { scoreProspect } from "../lib/outreach/score";
import { applyAction, dueAction, chaseBody, gmailComposeUrl } from "../lib/outreach/lifecycle";

const verdict = (url: string, extra: Record<string, string> = {}) => assessProspect({ url, ...extra }).verdict;

test("quality gate rejects the junk the old lists were full of", () => {
  assert.equal(verdict("https://wythenshaweafc.com/wp-content/uploads/2025/02/policy.pdf"), "rejected");
  assert.equal(verdict("https://www.thefa.com/-/media/cfa/cornwallfa/files/governance/equal-playing-time.ashx"), "rejected");
  assert.equal(verdict("https://www.maldenyouthsoccer.org/playing-time-policy", { country: "US" }), "rejected");
  assert.equal(verdict("https://www.coachesontario.ca/articles/equal-playing-time/"), "rejected");
  assert.equal(verdict("https://firstwhistlesports.net/equal-playing-time-youth-sports/"), "rejected");
  assert.equal(verdict("https://www.examplerugbyclub.co.uk/rugby-parents-guide"), "rejected");
  assert.equal(verdict("https://www.spond.com/blog/anything"), "rejected");
  assert.equal(verdict("https://refchat.co.uk/threads/kids-and-wearing-spectacles-again.16339/page-2"), "rejected");
  assert.equal(verdict("https://bishton.org.uk/author/clerk/page/2/"), "rejected");
  assert.equal(verdict("https://suffolksec.co.uk/products/junior-mannequin"), "rejected");
  assert.equal(verdict("https://www.footballparent.co.uk/parent-guides"), "rejected");
});

test("governing bodies, homepages and partner pages are parked, not pitched", () => {
  assert.equal(verdict("https://www.bedfordshirefa.com/news/2023/sep/27/youth-football-maximum-playing-time"), "parked");
  assert.equal(verdict("https://learn.englandfootball.com/articles-and-resources/coaching"), "parked");
  assert.equal(verdict("https://www.sported.org.uk/"), "parked");
  assert.equal(verdict("https://footballfestivals.co.uk/about-us/esf-partners/"), "parked");
});

test("UK editorial football pages get through", () => {
  const club = assessProspect({ url: "https://www.launtonfc.co.uk/equal-fair-playing-time" });
  assert.equal(club.verdict, "ok");
  assert.equal(club.type, "club");
  assert.equal(club.isUk, true);
  assert.equal(verdict("https://www.parentsinsport.co.uk/2019/02/04/the-dreaded-playing-time-conversation/"), "ok");
  assert.equal(assessProspect({ url: "https://www.tandridgeleague.co.uk/public/page/Laws" }).type, "league");
});

test("score rises with fit, UK and season, and falls with skip rate", () => {
  const base = { type: "blog" as const, isUk: null, hasContact: false, createdAt: "2026-09-01T00:00:00Z", now: new Date("2026-09-24T00:00:00Z") };
  const plain = scoreProspect(base).score;
  assert.ok(scoreProspect({ ...base, isUk: true }).score > plain);
  assert.ok(scoreProspect({ ...base, fit: 9 }).score > plain);
  assert.ok(scoreProspect({ ...base, fpPage: "/football-gear/boots/x" }).score > plain, "September is kit season");
  assert.equal(scoreProspect({ ...base, fpPage: "/academy-trials/x" }).score, plain, "no trials bonus in September");
  assert.ok(scoreProspect({ ...base, skipRate: 0.8 }).score < plain);
});

test("lifecycle: send, two chases a week apart, then close", () => {
  const t0 = new Date("2026-09-28T09:00:00Z");
  const sent = applyAction({ status: "drafted", chase_count: 0, next_action_at: null }, { action: "mark_sent" }, t0);
  assert.equal(sent.status, "sent");
  const row1 = { status: sent.status, chase_count: 0, next_action_at: sent.next_action_at! };
  assert.equal(dueAction(row1, new Date("2026-10-01T00:00:00Z")), null);
  assert.equal(dueAction(row1, new Date("2026-10-05T10:00:00Z")), "chase");

  const c1 = applyAction(row1, { action: "mark_chased" }, new Date("2026-10-05T10:00:00Z"));
  assert.equal(c1.status, "chase_1");
  const c2 = applyAction({ status: c1.status, chase_count: 1, next_action_at: c1.next_action_at! }, { action: "mark_chased" }, new Date("2026-10-12T10:00:00Z"));
  assert.equal(c2.status, "chase_2");
  const row3 = { status: c2.status, chase_count: 2, next_action_at: c2.next_action_at! };
  assert.equal(dueAction(row3, new Date("2026-10-20T10:00:00Z")), "close");
  assert.throws(() => applyAction(row3, { action: "mark_chased" }));
});

test("chase copy and Gmail links", () => {
  assert.match(chaseBody({ n: 1, firstName: "Sam" }), /^Hi Sam,/);
  assert.match(chaseBody({ n: 2 }), /won't follow up again/);
  assert.ok(!/—/.test(chaseBody({ n: 1 }) + chaseBody({ n: 2 })), "no em dashes");
  const url = gmailComposeUrl({ to: "sec@club.co.uk", subject: "Hello", body: "Line one\nLine two" });
  assert.match(url, /authuser=footballparentuk%40gmail\.com/);
  assert.match(url, /to=sec%40club\.co\.uk/);
});

test("page digest pulls text, outbound links, contacts and emails from a content_parsing result", async () => {
  const { digestContentParsing } = await import("../lib/outreach/page-digest");
  const result = [
    {
      crawl_progress: "finished",
      items_count: 1,
      items: [
        {
          type: "content_parsing_element",
          fetch_time: "2026-09-25 09:00:00 +00:00",
          status_code: 200,
          page_content: {
            header: { primary_content: [{ text: "Launton FC", url: "https://www.launtonfc.co.uk/committee", urls: [{ url: "https://www.launtonfc.co.uk/committee", anchor_text: "Committee" }] }] },
            main_topic: [
              {
                h_title: "Equal and fair playing time",
                level: 1,
                primary_content: [
                  { text: "Every player gets equal minutes across the season.", urls: null },
                  { text: "Read the FA Respect guidance.", urls: [{ url: "https://www.englandfootball.com/respect", anchor_text: "FA Respect guidance" }] },
                  { text: "Questions? Email the secretary at secretary@launtonfc.co.uk", urls: [{ url: "mailto:Welfare@LauntonFC.co.uk", anchor_text: "Welfare officer" }] },
                  { text: "Useful guide", urls: [{ url: "https://www.footballparent.co.uk/coaching/equal-playing-time-in-grassroots-football", anchor_text: "Football Parent" }] },
                ],
              },
            ],
            footer: { primary_content: [{ text: "Logo", urls: [{ url: "https://cdn.example.com/logo@2x.png", anchor_text: "" }] }] },
          },
        },
      ],
    },
  ];
  const d = digestContentParsing("https://www.launtonfc.co.uk/equal-fair-playing-time", result);
  assert.equal(d.ok, true);
  assert.equal(d.title, "Equal and fair playing time");
  assert.match(d.text, /equal minutes/);
  assert.deepEqual(d.emails.sort(), ["secretary@launtonfc.co.uk", "welfare@launtonfc.co.uk"]);
  assert.ok(d.externalLinks.some((l) => l.url.includes("englandfootball.com")));
  assert.equal(d.linksToUs.length, 1);
  assert.ok(d.contactPages.some((l) => l.url.endsWith("/committee")));
});

test("page digest reports problems instead of guessing", async () => {
  const { digestContentParsing } = await import("../lib/outreach/page-digest");
  assert.equal(digestContentParsing("https://x.co.uk/a", undefined).ok, false);
  assert.match(digestContentParsing("https://x.co.uk/a", [{ items: [{ status_code: 404 }] }]).problem ?? "", /404/);
  assert.match(digestContentParsing("https://x.co.uk/a", [{ items: [{ status_code: 200, page_content: {} }] }]).problem ?? "", /no readable text/);
});

test("history import reads Graham's sheet: name vs URL columns, yearless dates, notes after the date", async () => {
  const { parseHistory, resolveImportedStatus } = await import("../lib/outreach/import");
  const now = new Date("2026-09-25T10:00:00Z");
  const sheet = [
    "Site\temail\tWhen contacted\tWhat pitched\tDomain Auth\tURL\tStatus",
    "Girls United\tlondon@girlsunitedfa.org\t14/06, replied to their email\tQ/a on girls football and their mission\t37\thttp://www.girlsunitedfa.org\t",
    "Recent Club\t\t20/09\tEqual playing time guide\t\trecentclub.co.uk\t",
    "Linked Blog\t\t01/03/2026\tTrials guide\t22\thttps://linkedblog.co.uk/post\tlinked",
    "Future date\t\t30/12\tx\t\tfuture.co.uk\t",
    "No url\t\t01/01/2026\tx\t\t\t",
  ].join("\n");
  const r = parseHistory(sheet, now);
  assert.equal(r.columns.url, "URL");
  assert.equal(r.columns.title, "Site");
  assert.equal(r.rows.length, 4);
  assert.equal(r.errors.length, 1);

  const [gu, recent, linked, future] = r.rows;
  assert.equal(gu.title, "Girls United");
  assert.equal(gu.domain, "girlsunitedfa.org");
  assert.equal(gu.emailedAt?.slice(0, 10), "2026-06-14");
  assert.equal(gu.domainScore, 37);
  assert.equal(gu.angle, "Q/a on girls football and their mission");
  assert.equal(gu.notes, "replied to their email");
  assert.equal(gu.status, "replied", "a conversation in the notes keeps it in Waiting, not closed");

  const rs = resolveImportedStatus(recent, now);
  assert.equal(rs.status, "sent");
  assert.equal(rs.next_action_at?.slice(0, 10), "2026-09-27");

  assert.equal(linked.status, "won");
  assert.equal(future.emailedAt?.slice(0, 10), "2025-12-30", "a yearless date in the future means last year");
});

test("gate fixes from the first backlog run", () => {
  const girls = assessProspect({ url: "https://championhergame.co.uk/pages/coaching-a-girls-team", title: "Coaching a girls team", context: "New to coaching girls guide, cites Women in Sport and netball crossover" });
  assert.equal(girls.verdict, "ok", "other sport only in context is a note, not a reject");
  assert.match(girls.reasons.join(" "), /check the page is about football/);
  assert.equal(verdict("https://www.example.co.uk/netball-parents-guide"), "rejected");
  assert.equal(verdict("https://wembleyjuniormagpies.com/parents", { title: "Parents info", context: "Wembley Junior Magpies, Perth, Western Australia" }), "rejected");
  assert.equal(verdict("https://www.perthshirejfc.co.uk/parents"), "ok", "UK Perth is fine");
});

test("history import: Graham's real rows, status and dates from free text", async () => {
  const { parseHistory, resolveImportedStatus } = await import("../lib/outreach/import");
  const now = new Date("2026-09-25T10:00:00Z");
  const sheet = [
    "email\tWhen contacted\tWhat pitched\tDomain Auth\tURL",
    "london@girlsunitedfa.org\t14/06, replied to their email 22/6- chased up as realised I hadn't copied in the two people, chased a third time 9 september. Said they would have something w/c 21st Sept\tQ/a on girls football and their mission\t37\thttp://www.girlsunitedfa.org/'",
    "On site\tAricle like 29 June\tArticle live 29 June\t39\thttps://www.teamstats.net/blog",
    "footballparentuk@gmail.com\t26/06, replied and sent questions 26/06\tQ/A live. Have asked for backlink to the article (01 July, will see what happens)- looks likely\t22\thttps://footballdna.co.uk/",
    "enquiries@junior-premier.co.uk\t26/06, tried second time with their contact us form (6th July)\t2 part Q/A first part live 16th August\t25\thttps://www.juniorpremierleague.com/england/about",
    "\temailed 2nd Sept, followed up 16th- Replied saying happy to do something\tpotential link exchange\t5\thttps://12th-man.co.uk/blog/#",
  ].join("\n");
  const r = parseHistory(sheet, now);
  assert.deepEqual(r.errors, []);
  const by = Object.fromEntries(r.rows.map((x) => [x.domain, x]));
  assert.equal(by["girlsunitedfa.org"].url, "http://www.girlsunitedfa.org/", "trailing quote stripped");
  assert.equal(by["girlsunitedfa.org"].status, "replied");
  assert.equal(by["girlsunitedfa.org"].emailedAt?.slice(0, 10), "2026-06-14");
  assert.equal(by["girlsunitedfa.org"].lastContactAt?.slice(0, 10), "2026-09-09", "latest date in the thread");
  assert.equal(by["teamstats.net"].status, "won");
  assert.equal(by["teamstats.net"].emailedAt?.slice(0, 10), "2026-06-29");
  assert.equal(by["footballdna.co.uk"].status, "replied");
  assert.equal(by["footballdna.co.uk"].contactEmail, null, "our own address isn't their contact");
  assert.equal(by["juniorpremierleague.com"].status, null, "our article going live isn't their reply");
  assert.equal(resolveImportedStatus(by["juniorpremierleague.com"], now).status, "no_reply");
  assert.equal(by["12th-man.co.uk"].status, "replied");
  assert.equal(by["12th-man.co.uk"].emailedAt?.slice(0, 10), "2026-09-02");
});

test("history import explains lost cell boundaries instead of failing silently", async () => {
  const { parseHistory } = await import("../lib/outreach/import");
  const r = parseHistory("email When contacted URL\nx 14/06 foo.co.uk");
  assert.equal(r.rows.length, 0);
  assert.match(r.errors[0], /cell boundaries were probably lost/);
});

test("score explanations match the stored reasons and add up", async () => {
  const { explainScore } = await import("../lib/outreach/score-explain");
  const s = scoreProspect({ type: "club", isUk: true, fit: 7, authority: 370, fpPage: "/coaching/x", hasContact: true, createdAt: "2026-07-01T00:00:00Z", now: new Date("2026-09-25T00:00:00Z") });
  const parts = explainScore(s.reasons.join(", "));
  assert.equal(parts.reduce((n, p) => n + p.points, 0), s.score);
  assert.match(parts.find((p) => p.label.startsWith("fit"))!.why, /7\/10 = \+14/);
  assert.match(parts.find((p) => p.label === "club")!.why, /Starting points/);
  assert.ok(parts.every((p) => p.why && p.why !== p.label), "every part has a real explanation");
});

test("targets people writing about a topic, not club rules pages", async () => {
  const { assessPageContent } = await import("../lib/outreach/quality");
  const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
  // Club policy / admin URLs are rejected before reading.
  assert.equal(verdict("https://www.lintonaztecs.co.uk/club-ethos/"), "rejected");
  assert.equal(verdict("https://miltoncoltsfc.com/club-info/managers-handbook-2026"), "rejected");
  assert.equal(verdict("https://www.exampleblog.co.uk/blog/my-coaching-philosophy-for-u9s"), "ok", "a coach writing about philosophy is a target");
  assert.equal(verdict("https://www.exampleblog.co.uk/blog/why-every-club-needs-a-playing-time-policy"), "ok", "an article about policy, under /blog/, is a target");

  // A useful-links page that only points at the FA and the league.
  const linksPage = assessPageContent({
    url: "https://www.ackworthjuniors.co.uk/useful-links/",
    title: "Useful Links",
    headings: ["Useful Links"],
    text: "FA Respect. Full-Time fixtures. Our league.",
    wordCount: 8,
    externalLinks: [
      { url: "https://www.thefa.com/respect", anchor: "FA Respect" },
      { url: "https://fulltime.thefa.com/index.html", anchor: "Full-Time" },
      { url: "https://www.hdjfl.co.uk", anchor: "League" },
      { url: "https://www.facebook.com/ackworth", anchor: "Facebook" },
    ],
  });
  assert.equal(linksPage.verdict, "rejected");
  assert.match(linksPage.reasons.join(" "), /only links to FA, league, social or admin/);

  // An opinion piece with a byline that cites an independent source.
  const article = assessPageContent({
    url: "https://www.grassrootsdad.co.uk/why-equal-game-time-matters",
    title: "Why equal game time matters more than winning at U9",
    headings: ["Why equal game time matters more than winning at U9"],
    text: `By Sam Jones, 12 March 2026. As a parent and coach I think ${words(500)}`,
    wordCount: 520,
    externalLinks: [
      { url: "https://www.thefa.com/respect", anchor: "FA" },
      { url: "https://www.playerdevelopmentproject.com/equal-game-time", anchor: "this piece on equal game time" },
    ],
  });
  assert.equal(article.verdict, "ok");
  assert.equal(article.kind, "article");
  assert.equal(article.independentLinks.length, 1);

  // A club page with lots of words but no author voice and only a sponsor link.
  const clubPage = assessPageContent({
    url: "https://www.club.co.uk/parents",
    title: "Parents",
    headings: ["Parents"],
    text: words(600),
    wordCount: 600,
    externalLinks: [{ url: "https://www.localbuilder.co.uk", anchor: "Our sponsor" }],
  });
  assert.equal(clubPage.verdict, "rejected");
});

test("link graph: drops big sites, prefers page 2-3 peers, finds open peers and hubs", async () => {
  const { pickPeers, buildLinkGraph, isBigSite } = await import("../lib/outreach/link-graph");
  assert.equal(isBigSite("bbc.co.uk"), true);
  assert.equal(isBigSite("thefa.com"), true);
  assert.equal(isBigSite("smallblog.co.uk", 700), true, "high domain rank counts as big");
  assert.equal(isBigSite("smallblog.co.uk", 120), false);

  const results = [
    { url: "https://www.thefa.com/youth", position: 1 },
    { url: "https://www.bbc.co.uk/sport/football/kids", position: 2 },
    { url: "https://www.footballparent.co.uk/parent-guides/x", position: 3 },
    { url: "https://coachblog.co.uk/blog/equal-minutes", position: 5, title: "Equal minutes" },
    { url: "https://dadontheline.co.uk/why-every-kid-plays", position: 24, title: "Why every kid plays" },
    { url: "https://tinyparentblog.co.uk/playing-time", position: 27, title: "Playing time" },
  ];
  const ranks = new Map<string, number | null>([["coachblog.co.uk", 210], ["dadontheline.co.uk", 90], ["tinyparentblog.co.uk", 40]]);
  const peers = pickPeers(results, ranks, 2);
  assert.deepEqual(peers.map((p) => p.domain), ["dadontheline.co.uk", "tinyparentblog.co.uk"], "page 2-3 peers kept first when trimming; FA, BBC and us dropped");

  const all = pickPeers(results, ranks, 10);
  const graph = buildLinkGraph([
    // Page-3 blog that links out to another small site: open to linking.
    { peer: all.find((p) => p.domain === "dadontheline.co.uk")!, outbound: [{ url: "https://tinyparentblog.co.uk/playing-time", anchor: "great post" }, { url: "https://www.thefa.com/x", anchor: "FA" }], inbound: [] },
    { peer: all.find((p) => p.domain === "tinyparentblog.co.uk")!, outbound: [], inbound: [
      { url: "https://grassrootsroundup.co.uk/best-parent-blogs", domain: "grassrootsroundup.co.uk", dofollow: true, rank: 150 },
      { url: "https://www.facebook.com/x", domain: "facebook.com" },
    ] },
    { peer: all.find((p) => p.domain === "coachblog.co.uk")!, outbound: [], inbound: [
      { url: "https://grassrootsroundup.co.uk/best-coaching-blogs", domain: "grassrootsroundup.co.uk", dofollow: true, rank: 150 },
      { url: "https://onelinker.co.uk/post", domain: "onelinker.co.uk" },
    ] },
  ]);
  const by = Object.fromEntries(graph.map((g) => [g.domain, g]));
  assert.equal(by["grassrootsroundup.co.uk"].kind, "hub", "links to two peers");
  assert.equal(by["dadontheline.co.uk"].kind, "open_peer");
  assert.match(by["dadontheline.co.uk"].why.join(" "), /page 2-3/);
  assert.equal(by["onelinker.co.uk"].kind, "linker");
  assert.equal(by["facebook.com"], undefined, "big sites never become prospects");
  assert.equal(graph[0].domain, "grassrootsroundup.co.uk", "hubs rank first");
});

test("content peers are pitchable (as a mutual); commercial rivals aren't", async () => {
  const { pickPeers, buildCompetitorMap } = await import("../lib/outreach/link-graph");
  const jgh = assessProspect({ url: "https://juniorgrassrootshub.com/parents-behaviour-junior-grassroots-football/" });
  assert.equal(jgh.verdict, "ok", "one-person content sites can link to us");
  assert.match(jgh.reasons.join(" "), /pitch as a mutual/);
  assert.equal(verdict("https://www.teamstats.net/blog/the-art-of-parenting"), "rejected", "commercial app stays off limits");

  const peers = pickPeers(
    [
      { url: "https://www.teamstats.net/blog/equal-playing-time", position: 4 },
      { url: "https://juniorgrassrootshub.com/equal-playing-time/", position: 6 },
    ],
    new Map([["teamstats.net", 420], ["juniorgrassrootshub.com", 180]]),
    10
  );
  const by = Object.fromEntries(peers.map((p) => [p.domain, p]));
  assert.equal(by["teamstats.net"].kind, "commercial");
  assert.equal(by["teamstats.net"].pitchable, false);
  assert.equal(by["juniorgrassrootshub.com"].kind, "content");
  assert.equal(by["juniorgrassrootshub.com"].size, "small");
  assert.equal(by["juniorgrassrootshub.com"].pitchable, true);

  const map = buildCompetitorMap([
    { keyword: "equal playing time", ranAt: "2026-09-25", peers: [
      { domain: "juniorgrassrootshub.com", url: "u", position: 6, rank: 180, pitchable: true, kind: "content", size: "small", smallSitesLinkedOut: 3, linkersFound: 5 },
      { domain: "teamstats.net", url: "u", position: 4, rank: 420, pitchable: false, kind: "commercial", size: "established", smallSitesLinkedOut: 0, linkersFound: 20 },
    ] },
    { keyword: "grassroots football parents", ranAt: "2026-09-25", peers: [
      { domain: "juniorgrassrootshub.com", url: "u", position: 12, rank: 180, pitchable: true, kind: "content", size: "small", smallSitesLinkedOut: 1, linkersFound: 2 },
    ] },
  ]);
  assert.equal(map[0].domain, "juniorgrassrootshub.com", "most keyword overlap first");
  assert.equal(map[0].keywords.length, 2);
  assert.match(map[0].verdict, /independent and links out/);
  assert.match(map.find((r) => r.domain === "teamstats.net")!.verdict, /commercial rival/);
});
