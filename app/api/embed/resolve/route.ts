import { oEmbedRequest, parseOEmbedResponse } from "../../../content/embed-oembed";

const MAX_REQUEST_BYTES = 4096;
const MAX_RESPONSE_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 5000;
const REQUEST_BODY_TIMEOUT_MS = 2000;
const ALLOWED_FETCH_ERROR_NAMES = new Set(["AbortError", "Error", "NetworkError", "TypeError"]);
const ALLOWED_FETCH_CAUSE_CODES = new Set([
  "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND", "ETIMEDOUT",
]);

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function upstreamFailure(error: string, diagnostic: string, details: Record<string, string | number> = {}): Response {
  const body: { error: string; diagnostic?: { code: string; [key: string]: string | number } } = { error };
  if (process.env.NODE_ENV === "development") body.diagnostic = { code: diagnostic, ...details };
  return json(body, 502);
}

function fetchErrorDetails(error: unknown): Record<string, string> {
  if (!error || typeof error !== "object") return { errorName: "Error" };
  const candidate = error as { name?: unknown; cause?: { code?: unknown } | unknown };
  const errorName = typeof candidate.name === "string" && ALLOWED_FETCH_ERROR_NAMES.has(candidate.name)
    ? candidate.name
    : "Error";
  const cause = candidate.cause;
  const causeCode = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
  if (typeof causeCode === "string" && ALLOWED_FETCH_CAUSE_CODES.has(causeCode)) return { errorName, causeCode };
  return { errorName };
}

function approvedPinterestRegionalTarget(location: string | null, originalEndpoint: URL): URL | null {
  if (!location || location.length > 4096 || location.trim() !== location || location.includes("#")) return null;
  const authority = /^https:\/\/([^/?#]*)/i.exec(location)?.[1];
  if (!authority) return null;
  let target: URL;
  try { target = new URL(location); } catch { return null; }
  if (target.protocol !== "https:" || target.username || target.password || target.port
    || authority !== target.hostname || !/^(?:[a-z]{2}|www)\.pinterest\.com(?:\.(?:au|mx))?$/.test(target.hostname)
    || target.pathname !== "/oembed.json" || target.search !== originalEndpoint.search
    || target.hash !== "") return null;
  return target;
}

async function readBounded(stream: ReadableStream<Uint8Array> | null, maximum: number, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<Uint8Array | null> {
  if (!stream) return null;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const read = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maximum) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      return true;
    };
    const boundedRead = await Promise.race([
      read(),
      new Promise<null>(resolve => { timeout = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
    if (!boundedRead) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
  } finally {
    if (timeout) clearTimeout(timeout);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return json({ error: "Same-origin requests only." }, 403);
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") ?? "")) {
    return json({ error: "Expected a JSON request." }, 415);
  }
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_REQUEST_BYTES)) return json({ error: "Request is too large." }, 413);

  const requestBytes = await readBounded(request.body, MAX_REQUEST_BYTES, REQUEST_BODY_TIMEOUT_MS);
  if (!requestBytes) return json({ error: "Request is too large or empty." }, 413);
  let sourceUrl: unknown;
  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(requestBytes));
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, "url")) {
      return json({ error: "Expected one source URL." }, 400);
    }
    sourceUrl = body.url;
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  const upstream = oEmbedRequest(sourceUrl);
  if (!upstream) return json({ error: "This provider URL is not supported." }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const fetchOptions: RequestInit = {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: controller.signal,
    };
    let response = await fetch(upstream.url, fetchOptions);
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      const location = response.headers.get("location");
      const regionalTarget = upstream.provider === "Pinterest"
        ? approvedPinterestRegionalTarget(location, upstream.url)
        : null;
      await response.body?.cancel();
      if (!regionalTarget) {
        return upstreamFailure("The provider could not resolve this item.", "provider-redirect-rejected", { httpStatus: response.status });
      }
      response = await fetch(regionalTarget, fetchOptions);
    }
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      await response.body?.cancel();
      return upstreamFailure("The provider could not resolve this item.", "provider-redirect-rejected", { httpStatus: response.status });
    }
    if (!response.ok) return upstreamFailure("The provider could not resolve this item.", "provider-http-error", { httpStatus: response.status });
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^application\/(?:json|oembed\+json)(?:\s*;|\s*$)/i.test(contentType)) {
      await response.body?.cancel();
      return upstreamFailure("The provider returned an unsupported response.", "provider-content-type-error");
    }
    const responseLength = response.headers.get("content-length");
    if (responseLength && (!/^\d+$/.test(responseLength) || Number(responseLength) > MAX_RESPONSE_BYTES)) {
      await response.body?.cancel();
      return upstreamFailure("The provider response is too large.", "provider-response-too-large");
    }
    const responseBytes = await readBounded(response.body, MAX_RESPONSE_BYTES);
    if (!responseBytes) return upstreamFailure("The provider response could not be read or is too large.", "provider-response-unavailable-or-too-large");
    let data: unknown;
    try { data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(responseBytes)); }
    catch { return upstreamFailure("The provider returned invalid JSON.", "provider-invalid-json"); }
    const embed = parseOEmbedResponse(upstream.provider, data, sourceUrl);
    return embed ? json(embed) : upstreamFailure("The provider response is not a supported embed.", "provider-unsupported-payload");
  } catch (error) {
    return upstreamFailure("The provider could not resolve this item.", "provider-fetch-error", fetchErrorDetails(error));
  } finally {
    clearTimeout(timeout);
  }
}
