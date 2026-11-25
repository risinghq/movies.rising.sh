import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { listUserImports } from "@/domain/import/store";
import type { ImportReport, ImportSummary } from "@/shared/import";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);
  const rows = await listUserImports(user.id);
  const imports = rows.map((row) => ({
    id: row.id,
    source: row.source,
    state: row.state,
    error: row.error,
    createdAt: row.createdAt,
    summary: row.summary ? (JSON.parse(row.summary) as ImportSummary) : null,
    report: row.report ? (JSON.parse(row.report) as ImportReport) : null,
  }));
  const selectedId = c.req.query("id") ?? null;
  return { imports, selected: imports.find((i) => i.id === selectedId) ?? null };
});
