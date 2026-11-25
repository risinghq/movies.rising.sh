import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { mediaHead } from "@/shared/head";
import { loadMedia } from "@/services/media-hydration";
import { capDepartments, groupByDepartment, listAllCrew, rankCrew } from "@/domain/catalog/credits";

export type Props = InferProps<typeof loader>;

// A long show credits hundreds of people per department; the page lists the
// top of each and opens one department in full through `?department=`.
const DEPARTMENT_PREVIEW = 12;

export const loader = defineHandler(async (c) => {
  const item = await loadMedia(c.req.param("slug") as string);
  if (!item) return c.notFound();

  const expanded = c.req.query("department") ?? null;
  const groups = groupByDepartment(await listAllCrew(item.id)).map(({ department, members }) => ({
    department,
    members: rankCrew(members),
  }));
  const crewGroups = capDepartments(groups, DEPARTMENT_PREVIEW, expanded);
  return { media: item, crewGroups, expanded };
});

export const head = defineHead<Props>((_c, props) => mediaHead(props.media, "crew"));
