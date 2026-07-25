// Unified import CLI used by the /seo-import skill.
//   npx tsx scripts/seo/imports/cli.ts article <path>
//   npx tsx scripts/seo/imports/cli.ts keyword <path>
//   npx tsx scripts/seo/imports/cli.ts gsc <path> <periodStart YYYY-MM-DD> <periodEnd YYYY-MM-DD>
import { migrate } from "../database/migrate";
import { importArticleTracker } from "./article-tracker";
import { importKeywordTracker } from "./keyword-tracker";
import { importGscExport } from "./gsc-export";

async function main() {
  migrate();
  const [, , kind, filePath, a, b] = process.argv;

  if (!kind || !filePath) {
    console.error("Usage: cli.ts <article|keyword|gsc> <path> [periodStart periodEnd]");
    process.exitCode = 1;
    return;
  }

  if (kind === "article") {
    console.log(JSON.stringify(importArticleTracker(filePath), null, 2));
  } else if (kind === "keyword") {
    console.log(JSON.stringify(importKeywordTracker(filePath), null, 2));
  } else if (kind === "gsc") {
    if (!a || !b) {
      console.error("gsc import requires periodStart and periodEnd (YYYY-MM-DD) - the file itself doesn't state its date range");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(importGscExport(filePath, a, b), null, 2));
  } else {
    console.error(`Unknown import kind "${kind}" - expected article, keyword, or gsc`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
