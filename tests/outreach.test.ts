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
