import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvLocal(path.resolve(__dirname, ".."));

import { createAdminClient } from "../lib/supabase/render-pipeline";

const ids = [
  "c784a1fc-f31f-485e-8bde-4842d64c15ec",
  "fc01faa8-4f76-4aae-8427-7d3d1b548bf4",
  "413c285a-ae5c-4441-be2b-801b5d5b23c4",
  "236a2c1a-f781-4a86-ac35-41c2eacf90ec",
];

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ status: "approved", error_message: null })
    .in("id", ids)
    .select("id, status");
  if (error) throw new Error(error.message);
  console.log(`Reset ${data?.length ?? 0} post(s) back to 'approved':`, data);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
