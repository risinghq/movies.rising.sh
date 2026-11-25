import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { listUserImports } from "@/domain/import/store";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  return c.json({ imports: await listUserImports(user.id) });
});
