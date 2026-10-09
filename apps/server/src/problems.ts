import { Router } from "express";
import { z, problemQuerySchema, problemSourceSchema, importRequestSchema, publishProblemSchema } from "@repo/shared";
import type { Database } from "./db/index.js";
import { problemStore } from "./db/queries/problems.js";
import type { authentication } from "./auth.js";
import { adapters, type importRunner } from "./importers/runner.js";
import { ApiError } from "./errors.js";

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, "VALIDATION_ERROR", "Invalid request");
  return result.data;
}
const slugSchema = z.string().regex(/^[a-z0-9-]{1,160}$/);
export function problemRouter(connection: () => Database) {
  const router = Router();
  router.get("/", async (req, res) => {
    const query = parse(problemQuerySchema, req.query);
    res.json(await problemStore(connection()).list(query));
  });
  router.get("/:slug", async (req, res) => {
    res.json(await problemStore(connection()).detail(parse(slugSchema, req.params.slug)));
  });
  return router;
}
export function adminRouter(connection: () => Database, auth: ReturnType<typeof authentication>, imports: () => ReturnType<typeof importRunner>) {
  const router = Router();
  router.use(async (req, _res, next) => {
    await problemStore(connection()).requireAdmin(auth.userId(req));
    next();
  });
  router.post("/import/:source", async (req, res) => {
    const source = parse(problemSourceSchema, req.params.source);
    const body = parse(importRequestSchema, req.body);
    const run = await imports().start(adapters[source], body.limit ?? (source === "codeforces" ? 200 : 50));
    res.status(202).json({ id: run.id, source, status: run.status });
  });
  router.get("/import/:id", async (req, res) => {
    res.json(await imports().status(parse(z.uuid(), req.params.id)));
  });
  router.patch("/problems/:slug", async (req, res) => {
    const body = parse(publishProblemSchema, req.body);
    await problemStore(connection()).publish(parse(slugSchema, req.params.slug), body.published);
    res.status(204).end();
  });
  return router;
}
