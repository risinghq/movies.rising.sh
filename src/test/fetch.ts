export function requestUrl(input: RequestInfo | URL | undefined): URL {
  if (input === undefined) throw new Error("no request was made");
  return new URL(input instanceof Request ? input.url : input);
}
