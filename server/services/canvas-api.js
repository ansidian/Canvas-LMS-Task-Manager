import { getNextLink } from "../utils/pagination.js";

export const CONCURRENT_ASSIGNMENT_FETCHES = 5;

const isJsonResponse = (res) => {
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json");
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

export const fetchAllPages = async (url, headers) => {
  const results = [];
  let nextUrl = url;

  while (nextUrl) {
    let res;
    try {
      res = await fetch(nextUrl, { headers });
    } catch (err) {
      throw new Error("Canvas API error: network");
    }
    if (!res.ok) {
      throw new Error(`Canvas API error: ${res.status}`);
    }
    if (!isJsonResponse(res)) {
      throw new Error("Canvas API error: invalid response");
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
