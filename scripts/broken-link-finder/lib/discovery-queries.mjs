// Seed queries for Stage 1 discovery. Starts from the exact list the brief
// gave, then adds generated variants covering the same topic areas from
// different angles (resource/list framing, question framing, org-type
// framing) so discovery isn't limited to near-duplicate phrasings.

const GIVEN_QUERIES = [
  "grassroots football UK",
  "youth football UK",
  "junior football UK",
  "football academy parents",
  "football academy trials UK",
  "grassroots football coaching",
  "youth football coaching",
  "junior football resources",
  "children's football UK",
  "football development centres",
  "county football association youth football",
  "grassroots football parents",
  "youth football development",
  "football academy pathway UK",
];

const TOPIC_AREAS = [
  "grassroots football",
  "youth football",
  "junior football",
  "children's football",
  "football academy",
  "academy trials",
  "football coaching",
  "football development centre",
  "county FA youth football",
  "youth football league",
  "football charity children",
  "girls football UK",
  "5-a-side football kids",
  "football club junior section",
  "FA coaching courses parents",
  "grassroots football volunteer",
  "football scouting children UK",
  "school football clubs UK",
];

const FRAMINGS = [
  (t) => `${t} guide`,
  (t) => `${t} resources`,
  (t) => `${t} advice for parents`,
  (t) => `best ${t} websites UK`,
  (t) => `${t} tips`,
  (t) => `how does ${t} work`,
];

export function buildDiscoveryQueries() {
  const generated = new Set();
  for (const topic of TOPIC_AREAS) {
    for (const framing of FRAMINGS) {
      generated.add(framing(topic));
    }
  }
  const all = [...GIVEN_QUERIES, ...generated];
  return [...new Set(all.map((q) => q.trim().toLowerCase()))];
}

// Targeted at the actual link-rot magnets: "useful links" / "resources"
// list pages, which accumulate dead outbound links over years far more than
// a site's actively-maintained homepage/nav does. Google operators
// (intitle:/inurl:/exact phrase) bias results toward genuine list pages
// rather than any page that happens to mention the topic.
const RESOURCE_FRAMINGS = [
  (t) => `intitle:"useful links" ${t} uk`,
  (t) => `intitle:"resources" ${t} uk`,
  (t) => `"useful links" ${t} uk`,
  (t) => `"further reading" ${t} uk`,
  (t) => `inurl:links ${t} uk`,
  (t) => `inurl:resources ${t} uk`,
];

export function buildResourcePageQueries() {
  const generated = new Set();
  for (const topic of TOPIC_AREAS) {
    for (const framing of RESOURCE_FRAMINGS) {
      generated.add(framing(topic));
    }
  }
  return [...generated];
}
