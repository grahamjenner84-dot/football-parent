import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { getSeoReport, getPageInspection, comparePeriods } from "@/lib/gsc";
import { addToContentQueue } from "@/lib/supabase/content-queue";
import { getInstagramPerformance } from "@/lib/supabase/instagram-performance";
import { getPageViewStats, getPageViewCountryStats, getBannerVariantStats } from "@/lib/supabase/page-views";
import { getCoachAppFunnel } from "@/lib/supabase/coach-app-funnel";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_seo_report",
      {
        title: "Get SEO report",
        description:
          "Full Search Console opportunity report for footballparent.co.uk: pages gone quiet, striking-distance keywords, low-CTR pages, decaying pages, query cannibalisation, and a rank tracker (position today vs 7 days ago per query).",
        inputSchema: {},
      },
      async () => {
        const report = await getSeoReport();
        return { content: [{ type: "text", text: JSON.stringify(report) }] };
      }
    );

    server.registerTool(
      "inspect_page",
      {
        title: "Inspect a page's Search Console history",
        description:
          "Full GSC history for one specific page on footballparent.co.uk: monthly and weekly position/impressions/clicks trend, top queries driving it, a 28-vs-28-day summary, and its current title/meta description. Use this to answer 'why is this page doing X' questions with real data. Pass an absolute path like /academy-pathway/how-much-does-academy-football-cost.",
        inputSchema: {
          path: z.string().describe("Absolute path on footballparent.co.uk, e.g. /academy-pathway/how-much-does-academy-football-cost"),
        },
      },
      async ({ path }) => {
        const inspection = await getPageInspection(path);
        return { content: [{ type: "text", text: JSON.stringify(inspection) }] };
      }
    );

    server.registerTool(
      "compare_search_console_periods",
      {
        title: "Compare two date ranges in Search Console",
        description:
          "Ad-hoc site-wide comparison between any two date ranges for footballparent.co.uk - answers 'why was Friday down vs Wednesday' or 'this week vs last week' type questions that get_seo_report and inspect_page can't, since those only cover fixed rolling windows (get_seo_report) or a single page (inspect_page). Returns total impressions/clicks/position for each period, then the specific pages and queries that account for the biggest drops and gains between them. Each period can be a single day (same start/end) or a wider range. The response's dataFreshnessWarning field is non-null whenever either requested range reaches into GSC's own 2-3 day reporting lag - surface that warning to the user rather than reporting a drop in that period as confirmed.",
        inputSchema: {
          startA: z.string().describe("Start date of period A, YYYY-MM-DD. Use the same value as endA for a single day."),
          endA: z.string().describe("End date of period A, YYYY-MM-DD."),
          startB: z.string().describe("Start date of period B (the comparison/baseline period), YYYY-MM-DD."),
          endB: z.string().describe("End date of period B, YYYY-MM-DD."),
        },
      },
      async ({ startA, endA, startB, endB }) => {
        const comparison = await comparePeriods(startA, endA, startB, endB);
        return { content: [{ type: "text", text: JSON.stringify(comparison) }] };
      }
    );

    server.registerTool(
      "add_to_content_queue",
      {
        title: "Add an item to the Instagram content queue",
        description:
          "Adds a draft item to the Instagram content_queue for the Football Parent account (football-parent-social Supabase project), e.g. 'queue a joke post about pre-season nerves'. The item lands with status='draft' and source='chat' so it's traceable back to this conversation. This only queues the idea — it does not render, QC, or publish anything.",
        inputSchema: {
          content_type: z
            .enum(["joke", "education", "interview"])
            .describe("The kind of content this queue item is for."),
          topic: z
            .string()
            .min(1)
            .describe("The topic or brief for the content, e.g. 'pre-season nerves'."),
          priority: z
            .number()
            .int()
            .optional()
            .describe("Optional queue priority, higher sorts first. Defaults to 0."),
        },
      },
      async ({ content_type, topic, priority }) => {
        const result = await addToContentQueue({ contentType: content_type, topic, priority });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    );

    server.registerTool(
      "get_instagram_performance",
      {
        title: "Get Instagram post performance",
        description:
          "Read-only: how the Football Parent Instagram account's posts have actually performed (from post_metrics, collected by the Phase C insights pipeline). Per post: content type, topic, caption/hook, publish date, reach/views/likes/comments/saves/shares/total_interactions, and for reels the average watch time. IMPORTANT ceiling on retention granularity: Instagram's API does not expose per-second (reel) or per-slide (carousel) drop-off/retention data to any third-party app, including this one - only whole-post/whole-video aggregates exist via the Graph API. For reels this tool derives avgWatchTimePctOfDuration (avg watch time ÷ total reel length) as the closest available proxy for 'how much of the reel people watched on average' - it cannot show WHERE viewers dropped off. Carousels have no retention signal at all via the API, not even an aggregate one. Follows-attributed-to-a-post is also not available via the API and isn't collected. The response's retentionCapabilities field spells out these limits every time so this is never mistaken for granular drop-off data.",
        inputSchema: {
          limit: z.number().int().min(1).max(50).optional().describe("Max posts to return after sorting/filtering. Defaults to 10."),
          days: z.number().int().min(0).optional().describe("Only include posts published in the last N days. Defaults to 90. Pass 0 to disable the window."),
          format: z.enum(["reel", "carousel"]).optional().describe("Restrict to one post format. Omit for both."),
          sortBy: z
            .enum(["recent", "reach", "views", "likes", "comments", "saves", "shares", "total_interactions", "avg_watch_time_sec"])
            .optional()
            .describe("What to sort by. Defaults to 'recent' (publish date)."),
          order: z.enum(["desc", "asc"]).optional().describe("'desc' (default) = best/most-recent first, 'asc' = worst/oldest first."),
        },
      },
      async ({ limit, days, format, sortBy, order }) => {
        const result = await getInstagramPerformance({ limit, days, format, sortBy, order });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    );

    server.registerTool(
      "get_page_view_stats",
      {
        title: "Get first-party page view stats",
        description:
          "Actual page views for footballparent.co.uk from our own first-party tracking (the page_views Supabase table, football-parent-social project), not Search Console. Fires on every page load regardless of cookie consent state or traffic source, so unlike get_seo_report/inspect_page this includes direct, social and referral visits, not just Google search clicks. Returns total views for the window, a per-day breakdown (each with its own top paths and traffic-source groups), overall top paths, and overall source groups. Logging only started 2026-08-19, so a wide 'days' value won't return more history than that, it'll just come back thin for the earlier days in the window.",
        inputSchema: {
          days: z.number().int().min(1).optional().describe("How many days back to include. Defaults to 30. Logging started 2026-08-19, so there's no data before that regardless of this value."),
        },
      },
      async ({ days }) => {
        const result = await getPageViewStats(days ?? 30);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    );

    server.registerTool(
      "get_coach_app_funnel",
      {
        title: "Get the Coach App funnel",
        description:
          "The Coach App funnel on footballparent.co.uk, the same numbers as the 'Coach App funnel' tab on /admin/seo, all from the football-parent-social project. Returns: (1) channels: for each channel (Google Ads, Shared link, Article banner, Search, Site link, Direct, Other, Unknown) the views of the Coach App landing pages, views of the app's sign-in screen, and sign-ups; (2) recent sign-ups, anonymous, each with its channel, the page signed up on, the page the visit began on and the banner or campaign; (3) SEO: views of the /coaching/ articles and how many came from search; (4) sharing: taps on 'Send it to your child's coach', sent vs cancelled, and visits to the shared link; (5) the in-article banner test (impressions, clicks, CTR per creative/audience/placement); (6) landing and sign-in views by path and by day; (7) activeDays: daily active coaches, i.e. devices where a signed-in coach opened the app, each counted once per UK day however often it was opened, with today's count so far (devices not people; Graham's own excluded; reported from 2026-09-26, not clamped to the funnel start). Sign-ups are reported to this site by the Coach App itself as anonymous events (no account, email or name) and, like every number from this tool's funnel section, are counted from when the funnel went live (2026-09-25 21:30 UTC); earlier sign-ups exist only in the separate Coach App database, which this server has no access to by design.",
        inputSchema: {
          days: z.number().int().min(1).optional().describe("How many days back to include. Defaults to 30. The banner test is clamped to when banners went live (2026-09-04) and sharing to 2026-09-25."),
        },
      },
      async ({ days }) => {
        const windowDays = days ?? 30;
        const [funnel, views, banners] = await Promise.all([
          getCoachAppFunnel(windowDays),
          getPageViewStats(windowDays, { pathPrefixes: ["/football-parent-coach-app", "/coach-app"] }),
          getBannerVariantStats(windowDays),
        ]);
        const result = {
          ...funnel,
          bannerTest: {
            since: banners.since,
            totalClicks: banners.totalClicks,
            enoughData: banners.enoughData,
            rows: banners.rows,
          },
          views: {
            totalViews: views.totalViews,
            byPath: views.topPaths,
            byDay: views.byDay.map((d) => ({ date: d.date, count: d.count })),
          },
        };
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    );

    server.registerTool(
      "get_page_view_countries",
      {
        title: "Get page views by country and hour of day",
        description:
          "Where footballparent.co.uk's readers are and when in the UK day they arrive, from the same first-party page_views table as get_page_view_stats (same bot exclusions, so the totals reconcile). Country is the ISO 3166-1 alpha-2 code Vercel geolocated the request to. The window starts no earlier than the first view with a country recorded (2026-09-24), so older, country-less traffic doesn't dilute the split; 'since' in the response says where it actually starts. Returns views and estimated visits by country, the views landing before 06:30 UK time split by country and by page, views by hour of day in Europe/London time (each hour split UK / overseas / unknown), and the pages overseas readers open. Backs the Countries tab on /admin/seo.",
        inputSchema: {
          days: z.number().int().min(1).optional().describe("How many days back to include. Defaults to 30. Clamped to start at the first view with a country recorded (2026-09-24)."),
        },
      },
      async ({ days }) => {
        const result = await getPageViewCountryStats(days ?? 30);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
  }
);

const authHandler = withMcpAuth(
  handler,
  (req, bearerToken) => {
    const expected = process.env.MCP_ACCESS_TOKEN;
    if (!expected || bearerToken !== expected) return undefined;
    return { token: bearerToken, clientId: "graham", scopes: ["seo:read", "content_queue:write", "instagram_performance:read", "page_views:read"] };
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: "https://www.footballparent.co.uk",
  }
);

export { authHandler as GET, authHandler as POST };
