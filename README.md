# Code Battle Arena

A competitive programming platform in development. M0 provides the app boundaries and development tooling; the original C++ judge is working. Authentication, problems, persistence, battles, and the final web design are planned in [PLAN.md](PLAN.md).

## Applications

| App             | Runtime           | Local address         | Responsibility                             |
| --------------- | ----------------- | --------------------- | ------------------------------------------ |
| apps/web        | React + Vite      | http://localhost:5173 | Web client foundation                      |
| apps/server     | Node 24 + Express | http://localhost:4000 | Public API foundation, health endpoint     |
| apps/judge      | Bun + Express     | http://localhost:3001 | C++ compilation and judging through Docker |
| packages/shared | TypeScript + Zod  |                       | Shared contracts and validation            |

## Development

Requires Node 24+, Bun 1.4.0, and Docker for real code execution.

```bash
bun install --frozen-lockfile
bun run dev
```

All apps start with local defaults. Optional overrides are documented in each app's `.env.example`; copy it to `.env` in that app. No Clerk or Neon credentials are needed for M0.

Build the existing sandbox image before running C++:

```bash
docker build -t cpp-runner .
```

The judge currently retains the original isolation gaps recorded in PLAN.md. Keep development local until M1 hardening is complete.

## Checks

```bash
bun run typecheck
bun run lint
bun run test
bun run test:integration  # Docker and cpp-runner required
bun run build
bun run format:check
```

`bun run build` produces `dist/` output for the web, server, judge, and shared contracts. Start the built server or judge with `bun run --cwd apps/server start` or `bun run --cwd apps/judge start`.

CI runs installation, type checking, lint, unit/HTTP contract tests, build, and formatting checks. Full Docker security testing follows in M1.

## Existing judge API

`POST /api/execution/run` on port 3001:

```json
{
  "code": "#include <iostream>\nint main(){ int a,b; std::cin>>a>>b; std::cout<<a+b; }",
  "testCases": [{ "id": "1", "input": "3 5", "expectedOutput": "8" }]
}
```

```json
{
  "overallStatus": "AC",
  "passedCount": 1,
  "totalCount": 1,
  "results": [
    {
      "testCaseId": "1",
      "status": "AC",
      "actualOutput": "8",
      "expectedOutput": "8",
      "executionTimeMs": 412
    }
  ]
}
```

Supported verdicts: AC, WA, TLE, CE, RE. `overallStatus` remains the first non-AC verdict. Reported execution time includes runtime container startup; the example is illustrative. See [judge API](docs/JUDGE_API.md).

Both services expose `GET /health`.

## Documentation

Start with [AGENTS.md](AGENTS.md), [PLAN.md](PLAN.md), and [architecture](docs/ARCHITECTURE.md). The confirmed design reference is [the owner's published Lenis Framer site](https://serious-job-517948.framer.app/); measurement and motion implementation belong to M5.
