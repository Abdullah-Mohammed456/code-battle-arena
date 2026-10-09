# API.md

Public API of `apps/server`. Base URL in dev: `http://localhost:4000`. JSON only. Auth: `Authorization: Bearer <Clerk session token>` unless marked public. Request and response schemas live in `packages/shared`.

## Conventions

- Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "requestId": "..." } }`. No stack traces, no internal paths.
- Pagination: `?page=1&limit=20`, response `{ items, total, page, limit }`. Max limit 50.
- Rate limits: general 120 per minute per IP; run and submit have their own per-user limits (see below).
- Ids in URLs: problems by `slug`, everything else by uuid.

## Endpoints

### Me

| Method | Path               | Notes                               |
| ------ | ------------------ | ----------------------------------- |
| GET    | `/api/me`          | profile, rating, counts             |
| PATCH  | `/api/me`          | `handle`, `displayName`, `cfHandle` |
| GET    | `/api/me/progress` | solved and attempted per problem    |

### Problems

| Method | Path                         | Notes                                                                                    |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/api/problems`              | public. `query`, `tag`, `minRating`, `maxRating`, `source`, `judgeable`, `page`, `limit` |
| GET    | `/api/problems/:slug`        | public. Statement, limits, samples, attribution. Never returns hidden tests              |
| POST   | `/api/problems/:slug/run`    | `{ code, input? }`. Runs samples, or custom input. 20 per minute per user                |
| POST   | `/api/problems/:slug/submit` | `{ code }`. Runs all tests. 6 per minute per user                                        |

### Submissions

| Method | Path                   | Notes                               |
| ------ | ---------------------- | ----------------------------------- |
| GET    | `/api/submissions`     | own, filter by `problem`, paginated |
| GET    | `/api/submissions/:id` | own only                            |

### Battles

| Method | Path                      | Notes                                                                 |
| ------ | ------------------------- | --------------------------------------------------------------------- |
| POST   | `/api/battles`            | create. `{ mode, durationS, problemSlug? }`, returns id and join code |
| POST   | `/api/battles/join`       | `{ code }`                                                            |
| GET    | `/api/battles/:id`        | snapshot (same shape as the socket `state`)                           |
| POST   | `/api/battles/:id/submit` | `{ problemIdx, code }`. Only while running                            |
| POST   | `/api/battles/queue`      | join matchmaking (M8)                                                 |
| DELETE | `/api/battles/queue`      | leave matchmaking                                                     |

### Leaderboard

| Method | Path               | Notes                 |
| ------ | ------------------ | --------------------- |
| GET    | `/api/leaderboard` | public. Top by rating |

### Admin

| Method | Path                        | Notes                                              |
| ------ | --------------------------- | -------------------------------------------------- |
| POST   | `/api/admin/import/:source` | `{ limit? }`, starts an import, returns the run id |
| GET    | `/api/admin/import/:id`     | status and stats                                   |
| PATCH  | `/api/admin/problems/:slug` | publish or unpublish                               |

### Ops

| Method | Path      | Notes                                          |
| ------ | --------- | ---------------------------------------------- |
| GET    | `/health` | public, process alive                          |
| GET    | `/ready`  | public, database reachable and judge reachable |

## Result shape for run and submit

```json
{
  "status": "WA",
  "passed": 3,
  "total": 12,
  "timeMs": 48,
  "memoryKb": 3500,
  "results": [
    {
      "idx": 1,
      "status": "AC",
      "timeMs": 12,
      "sample": true,
      "actual": "8",
      "expected": "8"
    },
    { "idx": 4, "status": "WA", "timeMs": 11, "sample": false }
  ],
  "compileOutput": null
}
```

For hidden tests, `actual` and `expected` are omitted.

## WebSocket

`wss://<server>/ws`. First message must be `{ "type": "auth", "token": "..." }`. Events are listed in `docs/BATTLE.md`.
