// Low-level client for the Instagram API with Instagram Login
// (graph.instagram.com) - NOT the Facebook Page flow (graph.facebook.com).
// This account authenticates via Instagram Login, so every call below must
// stay on graph.instagram.com; most tutorials online assume the Page flow
// and will lead you to the wrong host if you go looking for reference.

const GRAPH_API_VERSION = process.env.IG_GRAPH_API_VERSION || "v23.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

export class IgApiError extends Error {
  code?: number;
  errorSubcode?: number;
  type?: string;
  fbtraceId?: string;
  httpStatus: number;

  constructor(message: string, httpStatus: number, details?: { code?: number; errorSubcode?: number; type?: string; fbtraceId?: string }) {
    super(message);
    this.name = "IgApiError";
    this.httpStatus = httpStatus;
    this.code = details?.code;
    this.errorSubcode = details?.errorSubcode;
    this.type = details?.type;
    this.fbtraceId = details?.fbtraceId;
  }
}

// Transient = worth an automatic retry (network blip, IG's own "please retry"
// class of errors, 5xx). NOT transient = auth errors, validation errors,
// bad-request shaped errors - retrying those just burns quota for the same
// guaranteed failure.
export function isTransientError(err: unknown): boolean {
  if (!(err instanceof IgApiError)) return err instanceof TypeError; // network-level fetch failure
  if (err.httpStatus >= 500) return true;
  // Meta's generic "unknown error, try again" and "service temporarily
  // unavailable" codes.
  if (err.code === 1 || err.code === 2) return true;
  return false;
}

async function igRequest<T>(
  path: string,
  accessToken: string,
  opts: { method?: "GET" | "POST"; params?: Record<string, string | number | boolean | undefined> } = {}
): Promise<T> {
  const method = opts.method ?? "GET";
  const params = { ...opts.params, access_token: accessToken };
  const url = new URL(`${GRAPH_BASE}${path}`);

  let res: Response;
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    res = await fetch(url.toString(), { method: "GET" });
  } else {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) body.set(k, String(v));
    }
    res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = json.error as Record<string, unknown> | undefined;
    const message = (err?.message as string) || `Instagram API request failed (HTTP ${res.status})`;
    throw new IgApiError(message, res.status, {
      code: err?.code as number | undefined,
      errorSubcode: err?.error_subcode as number | undefined,
      type: err?.type as string | undefined,
      fbtraceId: err?.fbtrace_id as string | undefined,
    });
  }
  return json as T;
}

export interface CreatedContainer {
  id: string;
}

export async function createImageChildContainer(igUserId: string, accessToken: string, imageUrl: string): Promise<CreatedContainer> {
  return igRequest<CreatedContainer>(`/${igUserId}/media`, accessToken, {
    method: "POST",
    params: { image_url: imageUrl, is_carousel_item: true },
  });
}

export async function createSingleImageContainer(igUserId: string, accessToken: string, imageUrl: string, caption: string): Promise<CreatedContainer> {
  return igRequest<CreatedContainer>(`/${igUserId}/media`, accessToken, {
    method: "POST",
    params: { image_url: imageUrl, caption },
  });
}

// children must be a comma-separated string of container ids, NOT a JSON
// array - the API silently rejects (or mis-parses) an array here.
export async function createCarouselContainer(
  igUserId: string,
  accessToken: string,
  childContainerIds: string[],
  caption: string
): Promise<CreatedContainer> {
  return igRequest<CreatedContainer>(`/${igUserId}/media`, accessToken, {
    method: "POST",
    params: { media_type: "CAROUSEL", children: childContainerIds.join(","), caption },
  });
}

export async function createReelsContainer(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
  coverUrl?: string | null
): Promise<CreatedContainer> {
  return igRequest<CreatedContainer>(`/${igUserId}/media`, accessToken, {
    method: "POST",
    params: { media_type: "REELS", video_url: videoUrl, caption, cover_url: coverUrl ?? undefined },
  });
}

export type ContainerStatusCode = "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

export interface ContainerStatus {
  status_code: ContainerStatusCode;
  status?: string;
}

export async function getContainerStatus(containerId: string, accessToken: string): Promise<ContainerStatus> {
  return igRequest<ContainerStatus>(`/${containerId}`, accessToken, {
    method: "GET",
    params: { fields: "status_code,status" },
  });
}

export interface PublishedMedia {
  id: string;
}

export async function publishContainer(igUserId: string, accessToken: string, creationId: string): Promise<PublishedMedia> {
  return igRequest<PublishedMedia>(`/${igUserId}/media_publish`, accessToken, {
    method: "POST",
    params: { creation_id: creationId },
  });
}

// A single insights metric as Meta returns it - lifetime/day metrics come
// back as a `values` array (usually one entry), but some aggregate metrics
// (e.g. total_interactions) have been observed returning `total_value`
// instead. Callers should check both rather than assuming one shape.
export interface MediaInsightMetric {
  name: string;
  period?: string;
  values?: { value: number }[];
  total_value?: { value: number };
}

export interface MediaInsightsResponse {
  data: MediaInsightMetric[];
}

// `impressions` is retired platform-wide (2025) - never pass it here, use
// `reach`/`views` instead. Which metrics are valid depends on media type
// (reels vs carousel/feed) - see metricsForFormat() in
// lib/instagram/insights-pipeline.ts. Requesting a metric the media type
// doesn't support gets a non-transient 400 from Meta, not a silently
// ignored field.
export async function getMediaInsights(mediaId: string, accessToken: string, metrics: string[]): Promise<MediaInsightsResponse> {
  return igRequest<MediaInsightsResponse>(`/${mediaId}/insights`, accessToken, {
    method: "GET",
    params: { metric: metrics.join(",") },
  });
}

export interface MediaListItem {
  id: string;
  permalink?: string;
  timestamp?: string;
}

export interface MediaListResponse {
  data: MediaListItem[];
}

// Used to resolve ig_media_id for a reel posted manually (outside this
// pipeline, so no creation_id/container was ever tracked) - see
// markManualReelPosted in lib/instagram/review-pipeline.ts, which matches a
// human-pasted post URL against `permalink` here rather than attempting any
// shortcode-to-media-id conversion (undocumented, not part of the Graph API).
export async function listRecentMedia(igUserId: string, accessToken: string, limit = 50): Promise<MediaListResponse> {
  return igRequest<MediaListResponse>(`/${igUserId}/media`, accessToken, {
    method: "GET",
    params: { fields: "id,permalink,timestamp", limit },
  });
}

export interface TokenIdentity {
  id: string;
  username?: string;
}

// Cheapest possible authenticated call - if the token is dead/expired this
// fails with a clear 190 (OAuthException) instead of the caller discovering
// it midway through a container-creation flow.
export async function validateToken(accessToken: string): Promise<TokenIdentity> {
  return igRequest<TokenIdentity>(`/me`, accessToken, { method: "GET", params: { fields: "id,username" } });
}

export interface RefreshedToken {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

// Long-lived IG tokens (60 days) can be refreshed once they're at least 24h
// old, extending them another 60 days. This hits graph.instagram.com
// directly (not the versioned Graph API path) per Meta's documented
// refresh endpoint.
export async function refreshLongLivedToken(accessToken: string): Promise<RefreshedToken> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = json.error as Record<string, unknown> | undefined;
    throw new IgApiError((err?.message as string) || `Token refresh failed (HTTP ${res.status})`, res.status, {
      code: err?.code as number | undefined,
    });
  }
  return json as unknown as RefreshedToken;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Overridable via env so tests can run retry-backoff logic in milliseconds
// instead of waiting on real 2s/4s/8s delays - production default unchanged.
const DEFAULT_RETRY_BASE_DELAY_MS = Number(process.env.PUBLISH_RETRY_BASE_DELAY_MS) || 2000;

export async function withRetry<T>(fn: () => Promise<T>, opts: { retries?: number; baseDelayMs?: number } = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransientError(err)) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}
