# DATABASE.md

Postgres on Neon. ORM: Drizzle (`drizzle-orm`, `drizzle-kit`). Migrations are generated and committed.

## Connections

- App queries: Neon pooled connection string.
- Migrations and `LISTEN/NOTIFY`: direct (non-pooled) string.
- Both come from env, never hardcoded. See `docs/DEPLOYMENT.md`.

## Tables

All ids are `uuid` with `gen_random_uuid()` unless noted. All times are `timestamptz`.

### users

| Column       | Type        | Notes                                     |
| ------------ | ----------- | ----------------------------------------- |
| id           | uuid pk     |                                           |
| clerk_id     | text unique | from Clerk                                |
| handle       | text unique | public name, defaults from Clerk username |
| display_name | text        |                                           |
| avatar_url   | text        |                                           |
| rating       | int         | default 1200                              |
| games        | int         | rated games played, default 0             |
| cf_handle    | text null   | optional Codeforces handle                |
| role         | text        | `user` or `admin`, default `user`         |
| created_at   |             |                                           |

### problems

| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid pk     |                                                |
| source          | text        | `codeforces`, `codecontests`, `atcoder`, `own` |
| source_id       | text        | e.g. `1234A`                                   |
| slug            | text unique | `cf-1234a`                                     |
| title           | text        |                                                |
| statement_md    | text null   | null for link-out only problems                |
| url             | text        | original page                                  |
| rating          | int null    | difficulty number from the source              |
| tags            | text[]      |                                                |
| time_limit_ms   | int         | default 2000                                   |
| memory_limit_mb | int         | default 256                                    |
| judgeable       | bool        | true only when hidden tests exist              |
| compare_mode    | text        | `token`, `exact`, `float`                      |
| license         | text        |                                                |
| attribution     | text        | shown in the UI                                |
| fetched_at      |             |                                                |

Unique `(source, source_id)`. Index on `tags` (GIN), `rating`, `judgeable`, and a trigram or full-text index on `title`.

### test_cases

`id, problem_id fk, idx int, input text, expected text, is_sample bool, bytes int`. Unique `(problem_id, idx)`. Never return non-sample rows to clients.

Neon free storage is small. Cap test size at about 256 KB each, skip problems with huge tests, or move large blobs to object storage later. Decide before importing at scale.

### submissions

`id, user_id fk, problem_id fk, battle_id fk null, language text, code text, status text, passed int, total int, time_ms int, memory_kb int, results jsonb, created_at`. Index `(user_id, created_at desc)` and `(problem_id)`. `results` holds per-test verdicts without expected output for hidden tests.

### progress

`user_id fk, problem_id fk, status text (attempted|solved), attempts int, best_submission_id fk, first_solved_at`. Primary key `(user_id, problem_id)`.

### battles

`id, mode text, status text (waiting|countdown|running|finished|cancelled), created_by fk, join_code text unique, duration_s int, is_rated bool, starts_at, ends_at, created_at`.

### battle_problems

`battle_id fk, problem_id fk, idx int, points int`. Primary key `(battle_id, idx)`.

### battle_players

`battle_id fk, user_id fk, rating_before int, rating_after int null, score int, penalty_s int, solved int, rank int null, joined_at`. Primary key `(battle_id, user_id)`.

### import_runs

`id, source text, status text, stats jsonb, error text null, started_at, finished_at`.

## Rules

- Foreign keys everywhere, `on delete cascade` only where the child is meaningless alone (test cases, battle_problems).
- No business logic in triggers.
- Queries in `src/db/queries/`, one file per table group. Handlers never write SQL.
- Migrations are forward-only in production. Test them against a Neon branch before merging.
- Use a Neon branch per PR or per developer for safe schema work.
