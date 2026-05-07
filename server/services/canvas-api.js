import { getNextLink } from "../utils/pagination.js";

export const CONCURRENT_ASSIGNMENT_FETCHES = 5;
const DEFAULT_FETCH_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;
const TRANSIENT_CANVAS_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export class CanvasApiError extends Error {
  constructor(message, { status = null, code = null, transient = false } = {}) {
    super(message);
    this.name = "CanvasApiError";
    this.status = status;
    this.code = code;
    this.transient = transient;
  }
}

export const isTransientCanvasError = (err) => err?.transient === true;

const isJsonResponse = (res) => {
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryAfterMs = (retryAfter) => {
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const retryDate = Date.parse(retryAfter);
  if (Number.isNaN(retryDate)) return null;

  return Math.max(0, retryDate - Date.now());
};

const retryDelayMs = (attemptIndex, retryAfter) => {
  const retryAfterMs = parseRetryAfterMs(retryAfter);
  if (retryAfterMs !== null) return Math.min(retryAfterMs, MAX_RETRY_DELAY_MS);

  return Math.min(BASE_RETRY_DELAY_MS * 2 ** attemptIndex, MAX_RETRY_DELAY_MS);
};

export const normalizeCanvasBaseUrl = (canvasUrl, { stripApiPath } = {}) => {
  let baseUrl = canvasUrl.trim().replace(/\/+$/, "");
  if (stripApiPath) {
    baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  }
  return baseUrl;
};

export const normalizeCanvasToken = (canvasToken) =>
  canvasToken.trim().replace(/^Bearer\s+/i, "");

export const fetchAllPages = async (
  url,
  headers,
  { maxAttempts = DEFAULT_FETCH_ATTEMPTS } = {},
) => {
  const results = [];
  let nextUrl = url;

  while (nextUrl) {
    let res;
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        res = await fetch(nextUrl, { headers });
      } catch (err) {
        lastError = new CanvasApiError("Canvas API error: network", {
          code: "network",
          transient: true,
        });
      }

      if (res?.ok) break;

      if (res && !res.ok) {
        lastError = new CanvasApiError(`Canvas API error: ${res.status}`, {
          status: res.status,
          transient: TRANSIENT_CANVAS_STATUSES.has(res.status),
        });
      }

      const hasMoreAttempts = attempt < maxAttempts - 1;
      if (!lastError?.transient || !hasMoreAttempts) break;

      const delayMs = retryDelayMs(attempt, res?.headers.get("retry-after"));
      console.warn(
        `${lastError.message}; retrying in ${delayMs}ms (attempt ${attempt + 2}/${maxAttempts})`,
      );
      await sleep(delayMs);
      res = null;
    }

    if (!res?.ok) {
      throw lastError;
    }
    if (!isJsonResponse(res)) {
      throw new CanvasApiError("Canvas API error: invalid response", {
        code: "invalid_response",
      });
    }
    const data = await res.json();
    results.push(...data);
    nextUrl = getNextLink(res.headers.get("link"));
  }

  return results;
};

export const mapLimit = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (index < items.length) {
        const currentIndex = index;
        index += 1;
        results[currentIndex] = await mapper(items[currentIndex]);
      }
    })(),
  );

  await Promise.all(workers);
  return results;
};
