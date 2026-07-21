import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { getSeoReport, getPageInspection } from "@/lib/gsc";
import { addToContentQueue } from "@/lib/supabase/content-queue";
import { getInstagramPerformance } from "@/lib/supabase/instagram-performance";

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
    return { token: bearerToken, clientId: "graham", scopes: ["seo:read", "content_queue:write", "instagram_performance:read"] };
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: "https://www.footballparent.co.uk",
  }
);

export { authHandler as GET, authHandler as POST };
