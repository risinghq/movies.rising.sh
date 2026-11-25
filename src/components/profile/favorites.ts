// A collapsed favorites row shows one line of columns: 4 on a phone, 6 from the
// sm breakpoint, 8 from lg. The breakpoint decides how many items fit, so
// visibility is expressed as responsive classes rather than a JS width check.

export const COLLAPSED_MAX = 8;

const STEPS = [
  { from: 4, show: "sm:block" },
  { from: 6, show: "lg:block" },
] as const;

// Classes for the item at `index` while the row is collapsed.
export function collapsedItemClass(index: number): string {
  const step = STEPS.findLast((s) => index >= s.from);
  return step ? `hidden ${step.show}` : "";
}

// Classes for the "show all" toggle while the row is collapsed: hidden at every
// breakpoint where all `count` items already fit on the line.
export function collapsedToggleClass(count: number): string {
  if (count > COLLAPSED_MAX) return "";
  if (count > 6) return "lg:hidden";
  if (count > 4) return "sm:hidden";
  return "hidden";
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
