# AGENTS.md

Rules for AI coding agents (Codex and others) in this repository. Read this fully before changing anything.

## Language

- Talk to the user in **Egyptian Arabic**. Technical terms, code, comments, commit messages and docs stay in English.
- The user writes to you in English. Answer in Arabic anyway.
- The product UI is English only. No Arabic copy, no RTL layout.

## Hard style rules (the user cares about these more than anything)

1. **No emojis. Anywhere.** Not in code, comments, docs, commit messages, logs, UI copy, or chat replies.
2. **Short code.** Smallest correct solution. No speculative abstractions, no unused helpers, no config knobs nobody asked for, no dead code. Prefer a well-known library over 80 lines of custom code.
3. **Few comments.** Write a comment only when the why is not obvious from the code. Never restate what a line does, never add banner comments, never put JSDoc on every function.
4. **Human tone.** Plain names, Do not write marketing language in docs or UI copy.
5. Details and examples: `docs/CODE_STYLE.md`.

## Project

**Code Battle Arena**: a competitive programming platform. Users browse problems that are imported from external sources, solve them in a browser editor, track progress, and fight in real-time battles.

| Part          | Path              | Stack                                          | Deploys to               |
| ------------- | ----------------- | ---------------------------------------------- | ------------------------ |
| Web client    | `apps/web`        | React, Vite, TypeScript, GSAP, Lenis, Clerk    | Vercel                   |
| Main server   | `apps/server`     | Express, TypeScript, Drizzle, WebSocket, Clerk | Render                   |
| Database      |                   | Postgres                                       | Neon                     |
| Judge service | `apps/judge`      | Express, Docker sandbox (g++)                  | a small VPS (not Render) |
| Shared code   | `packages/shared` | zod schemas, types                             |                          |

The judge service is the original API (the old `apps/api`). It has to run on a machine where Docker is available, which Render does not provide. See `docs/ARCHITECTURE.md`.

## Commands

Verify against `package.json`; add missing scripts.

```bash
bun install
bun run dev            # all apps via turbo
bun run typecheck
bun run lint
bun run test
bun run test:integration   # needs Docker
```

## Document map

| File                    | Read when                                        |
| ----------------------- | ------------------------------------------------ |
| `PLAN.md`               | picking the next task; tick boxes when done      |
| `docs/ARCHITECTURE.md`  | touching services, flow, boundaries              |
| `docs/API.md`           | public server API and WebSocket events           |
| `docs/JUDGE_API.md`     | judge service contract                           |
| `docs/DATABASE.md`      | schema, migrations, queries                      |
| `docs/AUTH.md`          | Clerk, sessions, roles, WebSocket auth           |
| `docs/PROBLEMS.md`      | importing problems, sources, licensing           |
| `docs/BATTLE.md`        | battle modes, scoring, rating, realtime protocol |
| `docs/FRONTEND.md`      | web structure, libraries, data fetching          |
| `docs/DESIGN.md`        | look and feel, page map                          |
| `docs/MOTION.md`        | Lenis, GSAP, cursor, background                  |
| `docs/CODE_STYLE.md`    | writing code and comments                        |
| `docs/SECURITY.md`      | sandbox, API, secrets                            |
| `docs/PERFORMANCE.md`   | judge speed, queueing, caching                   |
| `docs/TESTING.md`       | tests, fixtures                                  |
| `docs/DEPLOYMENT.md`    | envs, hosting, CI                                |
| `docs/DECISIONS.md`     | add an ADR for any significant choice            |
| `docs/CODEX_PROMPTS.md` | reference prompts (for the human)                |

## Non-negotiable rules

- Never run user code outside the sandbox. Never build shell commands from strings; use argument arrays. See `docs/SECURITY.md`.
- Never trust the client for battle state, scores, or timers. The server decides.
- Every request body is validated with a zod schema from `packages/shared`.
- Secrets only from env. Never commit `.env`. Never log tokens or source code.
- Respect the problem source rules in `docs/PROBLEMS.md` (official APIs, rate limits, licenses). Do not scrape sites that forbid it.
- Do not add a dependency without saying why in the commit.

## Workflow

1. Read `PLAN.md`, take the next unchecked task (or the one the user names).
2. For anything larger than a small change, post a short plan first (files, risks, tests) and wait if asked.
3. Small commits, one concern each.
4. Tests with every behavior change. Run typecheck, lint, tests before saying done.
5. Update the affected doc and tick `PLAN.md` in the same change.

## First session

The docs were written without reading the code. Audit the repo against them first, list every mismatch in `PLAN.md` under "Audit findings", and do nothing else until the user has seen the list.
