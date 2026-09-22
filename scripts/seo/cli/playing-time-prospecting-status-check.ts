// Step 6 of the playing-time prospecting brief: HTTP status check for every
// A/B/C graded prospect URL. No DataForSEO cost - plain HTTP HEAD/GET.
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../shared/env";

type Result = { url: string; domain: string; fit: string; [k: string]: unknown };

async function checkUrl(url: string): Promise<{ status: number | null; note: string }> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    return { status: res.status, note: res.redirected && res.url !== url ? `redirected to ${res.url}` : "" };
  } catch (err) {
    return { status: null, note: `fetch error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function main() {
  const inPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-abc.json");
  const items = JSON.parse(fs.readFileSync(inPath, "utf8")) as Result[];

  const out: Array<Result & { httpStatus: number | null; httpNote: string }> = [];
  for (const item of items) {
    const { status, note } = await checkUrl(item.url);
    console.log(`${status ?? "ERR"}  ${item.url}${note ? "  [" + note + "]" : ""}`);
    out.push({ ...item, httpStatus: status, httpNote: note });
  }

  const outPath = path.join(REPO_ROOT, "seo-data", "raw", "playing-time-prospecting-abc-status.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length} status-checked rows to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
