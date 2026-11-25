import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { logger } from "void/log";
import { findCompany } from "@/domain/catalog/metadata";
import { listCompanyTitles, type CompanyTitle } from "@/services/company-titles";
import { parseCompanyFilter, parseCompanySlug } from "@/shared/company";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const ref = parseCompanySlug(c.req.param("slug") as string);
  const company = ref ? await findCompany(ref.kind, ref.tmdbId) : null;
  if (!company) return c.notFound();

  const filter = parseCompanyFilter(c.req.query("type"));
  const user = getUser();
  let titles: CompanyTitle[] = [];
  let hasMore = false;
  let failed = false;
  try {
    ({ titles, hasMore } = await listCompanyTitles({
      kind: company.kind,
      tmdbId: company.tmdbId,
      filter,
      page: 1,
      userId: user?.id ?? null,
    }));
  } catch (error) {
    logger.warn("company titles failed", { tmdbId: company.tmdbId, error: String(error) });
    failed = true;
  }

  return { company, filter, titles, hasMore, failed, signedIn: Boolean(user) };
});
