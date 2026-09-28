# Code Battle Arena - Backend Engine

A code execution and judging API for competitive programming. Submits C++, compiles it in a
sandboxed container, runs it against test cases, and returns a verdict per test case.

## Tech Stack

- Runtime: Bun
- Language: TypeScript
- Framework: Express.js
- Monorepo Tool: Turborepo
- Execution Engine: `g++` inside a Docker container (`cpp-runner`)

## Setup

The API shells out to Docker, so the sandbox image must exist first:

```bash
docker build -t cpp-runner .
bun install
bun dev
```

The server listens on `PORT` (default `3001`).

## API

`POST /api/execution/run`

```json
{
  "code": "#include <iostream>\nint main(){ int a,b; std::cin>>a>>b; std::cout<<a+b; }",
  "testCases": [
    { "id": "1", "input": "3 5", "expectedOutput": "8" }
  ]
}
```

Response:

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

`overallStatus` is the first non-`AC` status encountered, defaulting to `AC`.

### Verdict statuses

| Status | Meaning                                      |
| ------ | -------------------------------------------- |
| `AC`   | Accepted - output matched expected output     |
| `WA`   | Wrong Answer - output did not match           |
| `TLE`  | Time Limit Exceeded - run exceeded the limit  |
| `CE`   | Compilation Error - `g++` failed              |
| `RE`   | Runtime Error - process failed                |

## Project Architecture

```text
apps/api/src/
├── controllers/   # Request and response handlers
├── routes/        # API endpoints
├── services/      # Core business logic (compile, run, judge)
└── types/         # TypeScript definitions
```
