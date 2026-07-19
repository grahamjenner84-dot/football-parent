import { SupabaseClient } from "@supabase/supabase-js";
import { getArticleBySlug, Article } from "../content";
import { SeoReport } from "../gsc";
import { Opportunity, IdeationConfig, getIdeationConfig, selectOpportunities } from "./ideation-pipeline";
import { extractCarouselPoints, CarouselExtraction } from "./ideation-extract";
import { addToContentQueue } from "../supabase/content-queue";

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// Don't requeue the same page's carousel idea every week just because a
// slow-moving GSC signal is still present - see CLAUDE.md's "10-14 day watch
// list" convention for SEO changes; 30 days is deliberately longer than that
// since this is a content queue, not a live edit, and the queue item may sit
// unpublished for a while before it's acted on.
const DEFAULT_DEDUP_DAYS = 30;

export function getDedupDays(): number {
  return envNumber("IDEATION_DEDUP_DAYS", DEFAULT_DEDUP_DAYS);
}

// GSC page URLs are full URLs (https://www.footballparent.co.uk/<category>/<slug>);
// the content system only has exactly two path segments per article
// (category/slug - see CLAUDE.md's content-system section), so anything else
// (homepage, category index pages, etc.) has no matching MDX file.
export function resolveArticle(pathname: string): Article | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return null;
  const [category, slug] = segments;
  try {
    return getArticleBySlug(category, slug);
  } catch {
    return null;
  }
}

export async function isAlreadyQueued(supabase: SupabaseClient, pathname: string, dedupDays: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - dedupDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("content_queue")
    .select("id")
    .eq("source", "gsc")
    .eq("source_ref->>page", pathname)
    .gte("created_at", cutoff)
    .limit(1);
  if (error) throw new Error(`Failed to check content_queue for existing gsc item on ${pathname}: ${error.message}`);
  return (data ?? []).length > 0;
}

function buildTopic(opportunity: Opportunity, extraction: CarouselExtraction): string {
  const topQuery = opportunity.queries[0];
  const pointsList = extraction.points.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return [
    extraction.hook,
    "",
    "Points:",
    pointsList,
    "",
    `Source: ${opportunity.pathname}, targeting "${topQuery.query}" (${topQuery.impressions} impressions${
      topQuery.position !== null ? `, position ${topQuery.position}` : ""
    })`,
  ].join("\n");
}

export type IdeationResultStatus = "queued" | "skipped_no_article" | "skipped_duplicate" | "skipped_not_grounded" | "error";

export interface IdeationResult {
  status: IdeationResultStatus;
  opportunity: Opportunity;
  article?: Article;
  extraction?: CarouselExtraction;
  queueItemId?: string;
  topic?: string;
  error?: string;
}

export interface RunIdeationOptions {
  config?: IdeationConfig;
  dedupDays?: number;
  account?: string;
}

export async function runIdeationBatch(supabase: SupabaseClient, report: SeoReport, options: RunIdeationOptions = {}): Promise<IdeationResult[]> {
  const config = options.config ?? getIdeationConfig();
  const dedupDays = options.dedupDays ?? getDedupDays();
  const opportunities = selectOpportunities(report, config);

  const results: IdeationResult[] = [];

  for (const opportunity of opportunities) {
    const article = resolveArticle(opportunity.pathname);
    if (!article) {
      results.push({ status: "skipped_no_article", opportunity });
      continue;
    }

    try {
      if (await isAlreadyQueued(supabase, opportunity.pathname, dedupDays)) {
        results.push({ status: "skipped_duplicate", opportunity, article });
        continue;
      }

      const extraction = await extractCarouselPoints(opportunity, article);
      if (!extraction.grounded || extraction.points.length < 2) {
        results.push({ status: "skipped_not_grounded", opportunity, article, extraction });
        continue;
      }

      const topic = buildTopic(opportunity, extraction);
      const queued = await addToContentQueue({
        contentType: "education",
        topic,
        account: options.account,
        source: "gsc",
        sourceRef: {
          page: opportunity.pathname,
          queries: opportunity.queries.map((q) => q.query),
          opportunityType: opportunity.dominantType,
          totalImpressions: opportunity.totalImpressions,
          reportPeriodEnd: report.periodEnd,
          extractedAt: new Date().toISOString(),
        },
      });

      results.push({ status: "queued", opportunity, article, extraction, queueItemId: queued.id, topic });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ status: "error", opportunity, article, error: message });
    }
  }

  return results;
}
