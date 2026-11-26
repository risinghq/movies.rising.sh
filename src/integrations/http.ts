// A 429 carries Retry-After in seconds. A scan stays well under each source's
// limit, so one short wait is retried and a longer one fails the request.
const MAX_RETRY_WAIT_SECONDS = 10;

export async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 429) return response;
  const wait = Number(response.headers.get("Retry-After"));
  if (!Number.isFinite(wait) || wait > MAX_RETRY_WAIT_SECONDS) return response;
  await new Promise((resolve) => setTimeout(resolve, Math.max(wait, 1) * 1000));
  return fetch(url, init);
}
