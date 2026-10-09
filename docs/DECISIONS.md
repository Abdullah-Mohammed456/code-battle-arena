# DECISIONS.md

ADRs. Add one for every significant choice, especially on security, data, or infrastructure. Do not delete old ones; supersede them.

Template: Status, Date, Context, Options, Decision, Consequences.

## ADR-001: Monorepo with Turborepo

- Status: accepted
- Decision: `apps/web`, `apps/server`, `apps/judge`, `packages/shared`.
- Consequences: shared zod schemas keep web and server in sync.

## ADR-002: Docker sandbox for the judge

- Status: accepted, revisit before public launch
- Decision: g++ in a locked-down Docker container, rules in `docs/SECURITY.md`.
- Consequences: shared kernel. Plan rootless Docker now and gVisor or isolate later if opened to the public.

## ADR-003: Judge is a separate service on a VPS

- Status: accepted
- Context: Render cannot provide Docker access, and the main server should not hold a Docker socket.
- Options: Judge on the same host as the server (not possible on Render); hosted Judge0 or Piston; own VPS.
- Decision: own VPS running `apps/judge`, called over HTTPS with a shared secret. `runOnJudge` is the only place that knows.
- Consequences: one more thing to operate, but a clean security boundary and swappable backend.

## ADR-004: Problem sources

- Status: proposed (needs owner confirmation)
- Decision: official APIs and open datasets only. Catalog from Codeforces and AtCoder metadata, judgeable set from CodeContests, own problems later. No scraping of LeetCode. See `docs/PROBLEMS.md`.
- Consequences: no LeetCode content, and judged problems come from a dataset, not live from Codeforces.

## ADR-005: Drizzle ORM on Neon Postgres

- Status: proposed
- Decision: Drizzle with `drizzle-kit` migrations. Pooled URL for the app, direct for migrations.
- Consequences: typed queries with little code. Raw SQL stays possible.

## ADR-006: Vite SPA instead of Next.js

- Status: proposed
- Decision: React with Vite. No SSR.
- Consequences: simple hosting on Vercel. Landing page SEO is limited; acceptable for this project.

## ADR-007: Clerk with lazy user creation

- Status: proposed
- Decision: create the `users` row on first authenticated request; add webhooks only for deletes and profile sync.
- Consequences: no webhook dependency to get started.

## ADR-008: Battles are server-authoritative, state in memory first

- Status: proposed
- Decision: one server instance holds room state in memory, persisted to Postgres at create and finish. `ws` library, submissions over HTTP.
- Consequences: simple and fast. Needs Redis only if the server must scale to several instances.

## ADR-009: Lenis driven by the GSAP ticker, off on workspace routes

- Status: proposed
- Decision: one shared frame loop. Smooth scroll on marketing and list pages, native scroll in the editor screens.
- Consequences: editor panes stay predictable; animations stay in sync.

## ADR-010: Node runtime for the Render server

- Status: proposed
- Context: the repo started on Bun. Render's native runtimes cover Node; Bun would need a Dockerfile.
- Decision: server targets Node 24 with `tsx` in dev. Bun may stay as package manager and for the judge.
- Consequences: fewer deployment surprises. Verify Render's current Bun support first, this could change.

## ADR-011: M0 foundations and compatibility

- Status: accepted for M0 implementation
- Date: 2026-10-10
- Decision: root AGENTS.md and PLAN.md, tracked docs/, apps/judge, apps/server, apps/web, and packages/shared. Shared strict TypeScript; Node 24 server, Bun judge, Vite web.
- Compatibility: keep legacy execution fields and first-failure ordering; validate request types and sanitize internal HTTP errors. Docker uses argument arrays; full sandbox hardening stays M1.
- New dependencies: Zod validates shared requests and app environments; React/react-dom boot the web client; Vite and its React plugin build it; tsx runs the Node server during development; React/Bun/Node types support strict checks. Clerk, Drizzle, GSAP, and Lenis are deferred to their milestones.
- Tooling: TypeScript 7 checks/builds the project; the ESLint config retains the existing TypeScript 6 compatibility alias because typescript-eslint does not yet support the TypeScript 7 API. Lint errors now fail CI.
- Consequences: all applications boot locally without cloud credentials. The web page is only a foundation check, not the final design. Public judge exposure waits for M1 hardening.
