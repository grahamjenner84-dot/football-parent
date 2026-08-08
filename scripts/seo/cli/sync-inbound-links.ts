// Reads link-audit-inbound.json (written by `node internal-link-audit.mjs`
// at the repo root) and upserts each page's inbound internal-link count into
// the content-status tracker. Run manually after an internal-link-audit.mjs
// pass - not wired into the build.
// Run: npx tsx scripts/seo/cli/sync-inbound-links.ts
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../database/migrate";
import { setInboundLinks } from "../database/content-status";
import { REPO_ROOT } from "../shared/env";

const INBOUND_JSON_PATH = path.join(REPO_ROOT, "link-audit-inbound.json");

function main(): void {
  if (!fs.existsSync(INBOUND_JSON_PATH)) {
    console.error(
      `${INBOUND_JSON_PATH} not found - run \`node internal-link-audit.mjs\` first.`
    );
    process.exitCode = 1;
    return;
  }

  migrate();
  const counts = JSON.parse(fs.readFileSync(INBOUND_JSON_PATH, "utf8")) as Record<string, number>;
  let updated = 0;
  for (const [urlPath, count] of Object.entries(counts)) {
    setInboundLinks(urlPath, count);
    updated++;
  }

  console.log(`Synced inbound link counts for ${updated} page(s).`);
}

main();
