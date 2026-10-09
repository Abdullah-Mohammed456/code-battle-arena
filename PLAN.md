# PLAN.md

Milestones in order. Tick boxes as work lands. Each milestone has a "done when" that can be checked by running something.

## Audit findings

Filled in M0 by the agent.

- [x] Audit reviewed with the owner before implementation.
- [ ] Judge: compiler mounts the whole working directory writable; compiler and runtime sandbox restrictions are incomplete (M1).
- [ ] Judge: timestamp-based filenames can collide; synchronous I/O blocks the process (M1).
- [ ] Judge: Docker client timeout does not guarantee container cleanup; no orphan reaper (M1).
- [ ] Judge: no bounded queue or explicit output limits; infrastructure failures are classified as submission errors (M1).
- [ ] Judge: reported runtime includes container startup; comparison trims output rather than supporting documented modes (M1).
- [ ] Judge: no API-key authentication, rate limits, or full request size limits (M1).
- [x] Foundation: only apps/api exists; shared TS config is unused; build emits nothing; lint downgrades errors; no tests, env examples, or CI (M0).
- [x] Documentation: files were ignored under markdown-files; links expect root AGENTS.md/PLAN.md and docs/ (M0).
- [x] Contracts: legacy first-failure ordering is preserved; proposed verdict precedence belongs to a future versioned contract.
- [ ] Battles: PLAN expects rated invite duels but BATTLE specifies unrated invites; resolve before M7.
- [ ] Hosting: zero budget conflicts with paid server/VPS recommendations; confirm available free hosting before M9.
- [x] Design: monochrome assumption is unsupported; primary reference is https://serious-job-517948.framer.app/ and exact tokens remain to be measured in M5.
- [x] Architecture corrected to describe the current judge; shim and one-container execution remain M1. Compilation already happens once per submission.

## Open questions (human to answer)

- [x] Deadline: none. Goal is to finish fast and use it for CV and portfolio (see Fast path)
- [x] UI language: English only (decided)
- [ ] Problem sources for v1: confirm the policy in `docs/PROBLEMS.md`
- [ ] First battle mode: confirm 1v1 duel with invite code, then matchmaking
- [x] Budget is zero: free tiers only. Judge hosting plan is in docs/DEPLOYMENT.md, "No VPS yet"
- [ ] Is the owner a currently enrolled student with a university email (unlocks free cloud credits)?

## Fast path (what to build first)

The goal is a deployed, impressive, finished project for the CV, then move on. So the order is MVP first and everything else waits.

Build in this order and stop at "Ship":

1. M0 foundations (keep it light: restructure, strict TS, lint, env)
2. M1 essentials only: sandbox flags, timeouts, orphan reaper, compile once, a small malicious fixture suite. Skip the shim, compile cache and benchmarks until later
3. M2 server core
4. M3 problems: Codeforces metadata adapter plus a small judgeable set (50 to 100 problems) from the dataset
5. M4 submissions and progress
6. M5 and M6 web, with the Lenis style motion
7. M7 duel with invite code, Elo
8. Ship: M9 deploy, README with an architecture diagram, a short demo video

Cut for now (moved to Later): matchmaking, race mode, spectators, group rooms, shim and cache tuning, Codeforces handle sync.

What makes this strong on a CV: the live duel, the sandboxed judge with a security test suite, measured judge performance, tests, CI, a clean README, a live link and a demo video. Keep those and skip the rest.

---

## M0 Foundations

- [x] Audit current code against the docs; fill "Audit findings"
- [x] Restructure monorepo: rename `apps/api` to `apps/judge`; add `apps/web`, `apps/server`, `packages/shared`
- [x] Strict TypeScript, shared `tsconfig.base.json`, ESLint + Prettier
- [x] Typed env loading per app (zod), `.env.example` per app
- [x] CI: install, typecheck, lint, unit tests
- [x] Root scripts (`dev`, `typecheck`, `lint`, `test`) via Turborepo

Done when: a clean clone runs `bun install && bun run dev` and all apps boot; CI is green.

Local verification (2026-10-10): 21 unit/HTTP contract tests and one real Docker compatibility test pass. Typecheck, lint (zero warnings), build, and formatting pass. A clean source snapshot with no dependencies or build output installs from the frozen lockfile and starts all three apps; both health endpoints and the web entry return 200. The GitHub workflow is created, but its remote run awaits a push.

## M1 Judge: correct, safe, fast

Details in `docs/SECURITY.md`, `docs/PERFORMANCE.md`, `docs/TESTING.md`.

- [ ] Compile once, run all tests in one container
- [ ] `judge-shim` for CPU time, memory, signals
- [ ] Verdicts: AC, WA, TLE, MLE, OLE, RE, CE, IE
- [ ] Compare modes: exact, token (default), float
- [ ] Full sandbox flags, orphan reaper, malicious fixture suite
- [ ] Job queue with concurrency cap and backpressure
- [ ] Compile cache
- [ ] Shared-secret auth between server and judge
- [ ] Baseline and final benchmark numbers recorded

Done when: malicious suite is green and the budgets in `docs/PERFORMANCE.md` are met.

## M2 Server core

- [ ] Express app, zod validation, error handler, request id, pino logs
- [ ] Neon connection (pooled for app, direct for migrations), Drizzle schema and first migration
- [ ] Clerk middleware, lazy user upsert, `GET /api/me`
- [ ] Health endpoint, CORS from env, rate limiting, helmet
- [ ] Judge client (`runOnJudge`) with timeout and retry on network errors only

Done when: an authenticated request creates a user row and `GET /api/me` returns it.

## M3 Problems

Details in `docs/PROBLEMS.md`.

- [ ] Tables: problems, test_cases, import_runs
- [ ] `SourceAdapter` interface and the import runner (idempotent upserts)
- [ ] Codeforces metadata adapter (official API, rate limited)
- [ ] Dataset adapter for judgeable problems (CodeContests subset, filtered)
- [ ] Admin-only import endpoint and a CLI command
- [ ] `GET /api/problems` (search, filter by tag, rating, source, pagination) and `GET /api/problems/:slug`
- [ ] Attribution and license fields shown on every imported problem

Done when: running the import fills at least 200 problems and 50 of them are judgeable with tests.

## M4 Submissions and progress

- [ ] `POST /api/problems/:slug/run` (samples or custom input)
- [ ] `POST /api/problems/:slug/submit` (all tests), stored with per-test results
- [ ] Per-user progress (attempted, solved, first solved time)
- [ ] Submission history and detail endpoints
- [ ] Per-user rate limit on run and submit
- [ ] Optional: link a Codeforces handle and sync solved status through the official API

Done when: a user submits a solution and sees verdicts; progress survives a refresh.

## M5 Web foundation

Details in `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/MOTION.md`.

- [ ] Vite + React + TS, router, TanStack Query, Clerk provider
- [ ] Extract design tokens from the reference site and fill `docs/DESIGN.md`
- [ ] Tokens, fonts, base layout, primitives (button, link, tag, input)
- [ ] Lenis wired to the GSAP ticker; disabled on workspace routes
- [ ] Custom cursor and animated background, both with reduced-motion and touch fallbacks
- [ ] Page transition between routes
- [ ] Typed API client using `packages/shared`

Done when: the landing page matches the reference feel on desktop at 60fps and passes Lighthouse accessibility >= 90.

## M6 Web product

- [ ] Landing
- [ ] Problem list (search, filters, progress marks)
- [ ] Problem workspace: statement, CodeMirror editor, run, submit, results panel
- [ ] Profile with progress and history
- [ ] Empty, loading and error states for every screen

Done when: a new user can sign up, solve a problem, and see it on their profile.

## M7 Battle MVP

Details in `docs/BATTLE.md`.

- [ ] Battle tables, WebSocket server with Clerk auth on handshake
- [ ] Duel by invite code: create, join, ready, countdown, play, finish
- [ ] Server-authoritative timer, scoring, tie-breaks
- [ ] Live opponent progress (tests passed, no code)
- [ ] Reconnect handling
- [ ] Result screen and Elo update
- [ ] Battle UI (lobby, room, result)

Done when: two browsers can finish a rated duel and both ratings change correctly.

## M8 Battle plus

- [ ] Matchmaking queue by rating band
- [ ] Multi-player rooms (N players, several problems, points with decay, penalty)
- [ ] Leaderboard (global and per room)
- [ ] Spectator mode
- [ ] Group rooms for the faculty (named, invite link)

## M9 Launch

- [ ] Deploy: Vercel, Render, Neon, VPS (`docs/DEPLOYMENT.md`)
- [ ] Monitoring and alerts
- [ ] Security review against `docs/SECURITY.md`
- [ ] Performance pass on web and judge
- [ ] Seed content, README, short demo video
- [ ] Portfolio write-up

---

## Later

- Matchmaking, race mode, spectators, group rooms (M8)
- Judge shim, compile cache, benchmark tuning (rest of M1)
- Codeforces handle sync
- More languages (Python, Java) with separate runner images
- Special judges (checkers) for problems with many valid answers
- Plagiarism checks between battle submissions
