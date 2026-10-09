# CODEX_PROMPTS.md

Prompts for the human to paste into Codex. Codex reads `AGENTS.md` automatically. It replies in Egyptian Arabic.

## Habits that work

1. One milestone task per session.
2. Ask for a plan, approve, then code.
3. Demand tests and a doc update in the same change.
4. Make it run typecheck, lint and tests and show the output.
5. Review anything touching the sandbox, auth, or battle scoring yourself.
6. Commit after every green step.
7. If it drifts: "Follow AGENTS.md and CODE_STYLE.md. Stay inside the scope above."

## Session starter

```text
Read AGENTS.md, PLAN.md and the docs it points to. Summarize the repo state in 10 lines and say
which PLAN.md task you will do. No code yet.
```

## M0

```text
Audit the repo against docs/ARCHITECTURE.md, docs/SECURITY.md and docs/JUDGE_API.md. Do not change code.
List mismatches with file, issue and severity, and write them under "Audit findings" in PLAN.md.
```

```text
Restructure the monorepo as in docs/ARCHITECTURE.md: rename apps/api to apps/judge, scaffold apps/web
(Vite React TS), apps/server (Express TS) and packages/shared. Strict TS, ESLint, Prettier, typed env
per app, turbo scripts, CI workflow. Keep the judge working. No features yet.
```

## M1

```text
Follow docs/PERFORMANCE.md and docs/SECURITY.md for the judge. Do compile-once and one container
per submission first, with the shim. Show a before and after benchmark. Plan first, wait for approval.
```

```text
Create the malicious fixture suite from docs/TESTING.md and fix every uncontained case.
```

## M2

```text
Build the server core from PLAN.md M2: express app, zod, error handler, Drizzle on Neon, Clerk
middleware with lazy user upsert, GET /api/me, judge client. Follow docs/AUTH.md and docs/DATABASE.md.
Keep it short; follow docs/CODE_STYLE.md.
```

## M3

```text
Implement problem import from docs/PROBLEMS.md: schema, SourceAdapter, runner, Codeforces metadata
adapter, CodeContests adapter with the filters, admin endpoint, search endpoint. Tell me which
licenses and attributions you stored.
```

## M4

```text
Implement run and submit with progress tracking per docs/API.md. Hidden test data must never reach
the client. Add tests for that.
```

## M5

```text
Read docs/DESIGN.md and docs/MOTION.md. First write a Playwright script that visits lenis.dev, dumps
computed styles, fonts, colors, spacing and takes screenshots at 1440 and 390 into docs/reference/.
Fill the tokens table in docs/DESIGN.md. Do not build UI yet. Do not copy their text or assets.
```

```text
Scaffold apps/web providers and the motion layer: Lenis driven by the GSAP ticker (off on workspace
routes), custom cursor, canvas background, route transition, reduced motion support. Use the tokens
from docs/DESIGN.md. Report 60fps evidence from the Performance panel.
```

## M6

```text
Build the problem list and problem workspace with CodeMirror, run, submit and the results panel.
Native scroll on the workspace. Loading, empty and error states everywhere.
```

## M7

```text
Implement the duel battle from docs/BATTLE.md: tables, in-memory room manager with the state machine,
ws server with Clerk auth, submit endpoint, scoring and Elo as pure functions with unit tests,
reconnect handling. Server authoritative, no problem text before startsAt.
```

## Review prompts

```text
Review the last commit as a hostile security reviewer using docs/SECURITY.md and docs/AUTH.md. List
concrete exploits and locations. Do not modify code.
```

```text
Review the last commit against docs/CODE_STYLE.md. Flag emojis, needless comments, dead code and code
that can be shorter. Propose the shorter version.
```

## Recovery

```text
Stop. Run git status and git diff --stat. Summarize what you changed and why, list anything outside
the scope, and propose a minimal revert. No more changes until I approve.
```
