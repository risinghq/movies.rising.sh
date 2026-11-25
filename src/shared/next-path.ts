/** A same-origin path to return to, or `/`. Rejects absolute and
 * protocol-relative URLs so `?next=` cannot send a visitor off-site. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}
