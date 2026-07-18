import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { getSeoReport, getPageInspection } from "@/lib/gsc";

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
    return { token: bearerToken, clientId: "graham", scopes: ["seo:read"] };
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: "https://www.footballparent.co.uk",
  }
);

export { authHandler as GET, authHandler as POST };
