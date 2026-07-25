// UK/English defaults used everywhere a keyword or DataForSEO request is
// created, per the task brief's "Default settings: country: United Kingdom;
// language: English; search engine: Google; association football meaning."
export const DEFAULT_LOCATION_CODE = 2826; // United Kingdom (DataForSEO/Google Ads geo target)
export const DEFAULT_LANGUAGE_CODE = "en";
export const DEFAULT_SEARCH_ENGINE = "google";

// A keyword is uniquely identified by (normalised_keyword, search_engine,
// location, language) - see scripts/seo/database/schema.sql. Normalisation
// is deliberately conservative: lowercase, collapse whitespace, trim
// surrounding punctuation. It must NOT strip apostrophes or hyphens, which
// change meaning for terms like "boys'" vs "boy" or "5-a-side".
export function normaliseKeyword(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\w]+|[^\w]+$/g, (match) => match.replace(/['-]/g, ""));
}

export type KeywordIdentity = {
  normalisedKeyword: string;
  searchEngine: string;
  locationCode: number;
  languageCode: string;
};

export function keywordIdentity(
  raw: string,
  opts: Partial<Pick<KeywordIdentity, "searchEngine" | "locationCode" | "languageCode">> = {}
): KeywordIdentity {
  return {
    normalisedKeyword: normaliseKeyword(raw),
    searchEngine: opts.searchEngine ?? DEFAULT_SEARCH_ENGINE,
    locationCode: opts.locationCode ?? DEFAULT_LOCATION_CODE,
    languageCode: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
  };
}
