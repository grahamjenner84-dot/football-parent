import { CONFIG } from "../config.mjs";

// 0-100 composite. Referring-domain COUNT drives the biggest slice
// deliberately (see brief: "a dead page with 8 genuinely strong referring
// domains is more interesting than one with 5,000 junk backlinks") - raw
// backlink volume never enters this function at all.
export function computeOpportunityScore({
  referringDomains,
  dofollowRatio, // 0-1
  ukRelevant,
  topicalRelevanceScore, // 0-1
  replacementClassification,
  editorialScore, // 0-1
  sourceActive = true,
}) {
  const referringDomainScore = Math.min(30, referringDomains * 3);
  const topicalUkScore = topicalRelevanceScore * 14 + (ukRelevant ? 6 : 0);
  const replacementScore = { exact_replacement: 20, close_replacement: 12, new_article_opportunity: 5, not_relevant: 0 }[replacementClassification] ?? 0;
  const editorialWeighted = editorialScore * 15;
  const dofollowWeighted = dofollowRatio * 10;
  const activityScore = sourceActive ? 5 : 0;

  // Backlink-quality signals (referring domains, editorial context, dofollow,
  // source activity) are topic-agnostic on their own - a dead link with 20
  // referring domains scores the same whether it's a football resource or a
  // random dead sponsor link. Gate that whole cluster by topical relevance
  // so a genuinely unrelated page (a BMW dealership, a drainage company -
  // real examples from a live run) can't out-score a real football resource
  // purely on backlink count. Floored at 0.15, not 0, so a thin/uncertain
  // topic_summary (e.g. Wayback unreachable) doesn't zero out an otherwise
  // strong acquisition-candidate signal from Stage 6.
  const relevanceGate = Math.max(0.15, topicalRelevanceScore);
  const backlinkQualityCluster = (referringDomainScore + editorialWeighted + dofollowWeighted + activityScore) * relevanceGate;

  const total = backlinkQualityCluster + topicalUkScore + replacementScore;
  return Math.round(Math.max(0, Math.min(100, total)));
}

export function recommendedAction({ referringDomains, replacementClassification, domainAppearsDead, acquisitionSignal }) {
  if (replacementClassification === "not_relevant" && !domainAppearsDead) return "Ignore";

  const meetsBacklinkBar = referringDomains >= CONFIG.minReferringDomains;

  if (domainAppearsDead && acquisitionSignal) {
    return meetsBacklinkBar ? "Investigate both acquisition and broken-link outreach" : "Investigate domain acquisition";
  }

  if (!meetsBacklinkBar) return "Ignore";

  if (replacementClassification === "exact_replacement" || replacementClassification === "close_replacement") {
    return "Contact linking site and suggest existing Football Parent article";
  }
  if (replacementClassification === "new_article_opportunity") {
    return "Create replacement article then outreach";
  }
  return "Ignore";
}
