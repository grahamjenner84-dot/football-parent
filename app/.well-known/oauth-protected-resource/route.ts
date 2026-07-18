import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from "mcp-handler";

// RFC 9728 protected resource metadata - tells an MCP client which
// authorization server protects /api/mcp, so it knows where to go to
// obtain a token (see the .well-known/oauth-authorization-server route).
const handler = protectedResourceHandler({
  authServerUrls: ["https://www.footballparent.co.uk"],
  resourceUrl: "https://www.footballparent.co.uk/api/mcp",
});

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
