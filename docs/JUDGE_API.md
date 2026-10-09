# JUDGE_API.md

Internal API of the judge service (`apps/judge`). Only the main server calls it. The public API is in `docs/API.md`.

Base URL (dev): `http://localhost:3001`

## Current endpoint (keep working, backward compatible)

### `POST /api/execution/run`

Request:

```json
{
  "code": "#include <iostream>\nint main(){ int a,b; std::cin>>a>>b; std::cout<<a+b; }",
  "testCases": [{ "id": "1", "input": "3 5", "expectedOutput": "8" }]
}
```

Response `200`:

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
      "executionTimeMs": 12
    }
  ]
}
```

`overallStatus` = first non-`AC` status in test order, else `AC`.

### Planned optional fields (additive, non-breaking)

```json
{
  "language": "cpp17",
  "timeLimitMs": 2000,
  "memoryLimitMb": 256,
  "compareMode": "token",
  "floatEpsilon": 1e-6
}
```

Result additions: `memoryKb`, `cpuTimeMs`, `wallTimeMs`, `message` (sanitized, optional).

## Verdicts

| Status | Meaning                                                 |
| ------ | ------------------------------------------------------- |
| `AC`   | Accepted                                                |
| `WA`   | Wrong Answer                                            |
| `TLE`  | Time Limit Exceeded                                     |
| `MLE`  | Memory Limit Exceeded (planned)                         |
| `OLE`  | Output Limit Exceeded (planned)                         |
| `CE`   | Compilation Error (`compileOutput` returned, sanitized) |
| `RE`   | Runtime Error                                           |
| `IE`   | Internal Error, not the user's fault (planned)          |

## Limits (enforced at validation, all configurable by env)

| Item                          | Default                             | Hard max |
| ----------------------------- | ----------------------------------- | -------- |
| Source code size              | 64 KB                               | 128 KB   |
| Test cases per request        | 20                                  | 100      |
| Input per test case           | 256 KB                              | 1 MB     |
| Total request body            | 2 MB                                | 8 MB     |
| Expected output per test case | 256 KB                              | 1 MB     |
| Time limit per test           | 2000 ms                             | 10000 ms |
| Memory limit                  | 256 MB                              | 512 MB   |
| Output captured per test      | 1 MB                                | 4 MB     |
| Compile time                  | 10 s                                | 20 s     |
| Test case `id`                | string, 1-64 chars, `[A-Za-z0-9_-]` |          |

## Error format (all non-2xx)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "testCases must contain at most 100 items",
    "requestId": "9b2c5c0e-...",
    "details": [{ "path": "testCases", "issue": "too_big" }]
  }
}
```

Never include stack traces, host paths, or Docker output in `message`.

## Planned v1 (async)

### `POST /api/v1/submissions`

Same body as above. Returns `202`:

```json
{ "id": "sub_01H...", "status": "queued", "position": 3 }
```

### `GET /api/v1/submissions/:id`

Returns the full result when `status` is `done`, otherwise `queued` or `running` with progress.

### `GET /api/v1/submissions/:id/events` (SSE)

Events: `queued`, `compiling`, `running` (with `testCaseId`), `result` (per test), `done`.

### Ops endpoints

- `GET /health` -> `200 {"status":"ok"}`
- `GET /ready` -> `200` when Docker reachable and runner image exists, else `503`
- `GET /metrics` -> Prometheus text format (protect or bind to internal network)

## Auth and headers

- `Authorization: Bearer <api-key>` for non-health endpoints (when `API_KEYS` is set).
- Responses include `X-Request-Id`. Rate limit headers: `RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`.
- JSON only. `Content-Type: application/json`.

## Compatibility rule

Never remove or rename a field in a released response. Add fields, deprecate in docs, remove only with a new version prefix.

## M0 status

The legacy endpoint now validates field types using the shared Zod schema. Malformed JSON returns JSON errors and internal controller failures no longer include exception details. Size caps, auth, the structured error envelope, new verdicts, and container hardening remain M1 work.
