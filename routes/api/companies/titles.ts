import { defineHandler } from "void";
import { getUser } from "void/auth";
import { logger } from "void/log";
import { listCompanyTitles } from "@/services/company-titles";
import { parseCompanyFilter, parseCompanySlug } from "@/shared/company";

// One more page of a company's titles, for "load more" on the company page.
export const GET = defineHandler(async (c) => {
  const company = parseCompanySlug(c.req.query("company") ?? "");
  const page = Number(c.req.query("page"));
  if (!company || !Number.isInteger(page) || page < 1 || page > 500) {
    return c.json({ error: "a company slug and a page from 1 to 500 are required" }, 400);
  }

  try {
    const result = await listCompanyTitles({
      ...company,
      filter: parseCompanyFilter(c.req.query("type")),
      page,
      userId: getUser()?.id ?? null,
    });
    return c.json(result);
  } catch (error) {
    logger.warn("company titles failed", { ...company, page, error: String(error) });
    return c.json({ error: "tmdb_unavailable" }, 502);
  }
});
