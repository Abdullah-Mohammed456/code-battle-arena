# TESTING.md

## Test layers

| Layer              | Needs Docker      | Command                    | What it covers                                                                                  |
| ------------------ | ----------------- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| Unit               | no                | `bun test`                 | output comparison, verdict mapping, validation schemas, limit checks, cache LRU, queue behavior |
| Integration        | yes               | `bun run test:integration` | real sandbox: compile, run, limits, cleanup                                                     |
| Malicious fixtures | yes               | part of integration        | hostile programs must be contained                                                              |
| API contract       | no/mocked sandbox | `bun test`                 | HTTP status codes, error format, auth, rate limits                                              |
| Benchmark          | yes               | `bun run bench`            | performance budgets                                                                             |

Use `bun:test`. Run unit and HTTP contract checks with `bun run test`; real Docker compatibility checks run separately with `bun run test:integration`. Keep unit tests fast (< 5 s total). Mock the sandbox in unit tests via an interface.

## Unit test must-haves

- Compare modes: `exact`, `token` (trailing spaces/newlines, CRLF vs LF, multiple spaces), `float` (epsilon, scientific notation)
- Verdict mapping table in `docs/ARCHITECTURE.md`, including precedence
- `overallStatus` = first non-`AC`
- Validation: oversized code, too many tests, bad `id` characters, missing fields, wrong types
- Compile output sanitizer: strips paths, caps length
- Queue: concurrency cap respected, backpressure when full, FIFO, cancellation
- Cache: hit/miss, eviction order, size cap

## Integration fixtures

Directory: `apps/judge/tests/fixtures/` with one `.cpp` per case and an `expected.json`.

### Functional

| Fixture                         | Expected                                                  |
| ------------------------------- | --------------------------------------------------------- |
| `ok_sum.cpp` (a+b)              | `AC`                                                      |
| `wrong_answer.cpp`              | `WA`                                                      |
| `compile_error.cpp`             | `CE`, sanitized output, no host paths                     |
| `runtime_segfault.cpp`          | `RE`                                                      |
| `runtime_div_zero.cpp`          | `RE`                                                      |
| `nonzero_exit.cpp` (`return 1`) | `RE`                                                      |
| `infinite_loop.cpp`             | `TLE`, container gone afterwards                          |
| `sleep_forever.cpp`             | `TLE` (wall-clock backstop)                               |
| `big_input.cpp` (1 MB stdin)    | `AC` within budget                                        |
| `multi_test_mixed.cpp`          | per-test verdicts correct, `overallStatus` = first non-AC |
| `trailing_whitespace.cpp`       | `AC` in `token` mode, `WA` in `exact` mode                |

### Malicious (must all be contained, API stays healthy, no orphans)

| Fixture                      | Attack                                                   | Expected                                    |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| `fork_bomb.cpp`              | spawn processes in a loop                                | `RE`/`TLE`, pids limit hit, host unaffected |
| `memory_bomb.cpp`            | allocate until OOM                                       | `MLE`                                       |
| `stack_bomb.cpp`             | infinite recursion                                       | `RE`                                        |
| `output_flood.cpp`           | print forever                                            | `OLE`, API memory flat                      |
| `disk_fill.cpp`              | write huge file in `/tmp` and `/work`                    | blocked by `fsize`/tmpfs size, `RE`         |
| `network_access.cpp`         | `socket`/`connect` to 1.1.1.1 and to the Docker bridge   | fails (no network)                          |
| `read_etc_passwd.cpp`        | read `/etc/passwd`, `/proc/self/environ`, host paths     | contains nothing sensitive                  |
| `read_other_submission.cpp`  | list `/work/..`, `/tmp` of others                        | nothing found                               |
| `write_readonly_fs.cpp`      | write to `/usr`, `/etc`                                  | fails                                       |
| `ptrace_escape.cpp`          | `ptrace`, `mount`, `unshare`, `setns`, `reboot` syscalls | blocked by seccomp/caps                     |
| `setuid_attempt.cpp`         | `setuid(0)`                                              | fails                                       |
| `compile_bomb_template.cpp`  | deep template recursion                                  | `CE` fast, compile limits hit               |
| `compile_bomb_constexpr.cpp` | huge `constexpr` loop                                    | `CE` fast                                   |
| `include_dev_zero.cpp`       | `#include "/dev/zero"`                                   | rejected or `CE`, no hang                   |
| `giant_static_array.cpp`     | `static int a[1<<30]`                                    | `MLE`/`CE`/`RE`, no host impact             |
| `kill_parent.cpp`            | try to kill pid 1 / other pids                           | no effect outside container                 |
| `time_cheat_sleep_cpu.cpp`   | sleep to fake low CPU time                               | wall-clock backstop yields `TLE`            |

After the malicious suite: assert **zero** `sbx-*` containers remain and the API still answers `/health` and a normal submission.

### Sandbox flag test

Run one container and `docker inspect` it in a test; assert `NetworkMode=none`, memory/pids/cpu limits,
`ReadonlyRootfs=true`, `CapDrop=[ALL]`, `no-new-privileges`, non-root user. This guards against flag regressions.

## Contract tests

- `400` with the documented error shape for invalid bodies
- `413` for oversize bodies
- `401` without a key when `API_KEYS` is set
- `429` after exceeding the rate limit (with `Retry-After`)
- `503` when queue is full or Docker is unavailable (simulate)
- No stack traces or file paths in any error response

## Conventions

- Test files: `*.test.ts` next to the code (unit), `tests/integration/*.test.ts` (Docker).
- Use deterministic tests. No sleeping for arbitrary durations; poll with timeouts.
- Each integration test cleans up its containers in `afterEach`.
- A bug fix starts with a failing test that reproduces it.

## CI

1. install, typecheck, lint, unit tests (every push)
2. build `cpp-runner`, run integration + malicious suite (every PR; Docker-enabled runner)
3. benchmark smoke (nightly) and compare with the results log in `docs/PERFORMANCE.md`

## M0 coverage

- Shared request validation and environment limits.
- Server health endpoint without database or authentication credentials.
- Judge legacy response, malformed requests, compile-once behavior, first-failure ordering, and temporary source cleanup using a mocked Docker command.
- Web API and WebSocket URL validation.
- An opt-in real Docker test compiling one C++ program and judging two cases. It requires the existing `cpp-runner` image and is skipped by plain `bun test`.

These are compatibility tests, not proof of sandbox security. The malicious fixture suite and inspection of sandbox restrictions belong to M1.
