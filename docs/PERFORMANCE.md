# PERFORMANCE.md

Performance is a feature. Measure first, optimize second, document the result here.

## Where the time goes (hypothesis, verify with the benchmark)

The README example shows ~400 ms for a trivial `a+b` test. The current timer includes **runtime container startup** and program execution, but excludes compilation. This is not a CPU-time measurement. Likely hotspots in the current design:

1. `docker run` per test case (startup 150-400 ms each) ; compilation already happens once per submission
2. `g++` cost, especially with `bits/stdc++.h` (1-2 s cold)
3. No concurrency control (a burst can spawn dozens of containers and thrash the host)
4. Timing measured on the host wall clock (includes Docker overhead and scheduler noise)

## Budgets (reference machine: 4 cores, 8 GB RAM, SSD, Linux)

| Metric                                            | Target                        |
| ------------------------------------------------- | ----------------------------- |
| Trivial program, 1 test, cold compile             | p50 < 1.2 s, p95 < 2.0 s      |
| Same program, compile cache hit                   | p50 < 400 ms                  |
| 20 test cases, program runs 10 ms each, cache hit | p50 < 800 ms                  |
| API overhead (validation + queue + response)      | < 10 ms                       |
| Throughput at saturation (cold compile)           | >= 2 submissions/s on 4 cores |
| Queue wait under normal load                      | p95 < 500 ms                  |
| Memory of API process                             | < 300 MB steady               |
| Orphan containers after 1 h load test             | 0                             |

Update this table with real numbers after Phase 0 and keep it honest.

## Optimizations, in priority order

### 1. Compile once, run many (biggest win)

Compile one time per submission; run the binary for every test case. Never recompile per test.

### 2. One container per submission, not per test

Start one container, compile + run all tests inside it through `judge-shim`. Saves
`(N-1) x startup` per submission.

### 3. Bounded job queue

- Global concurrency = `MAX_CONCURRENT_JOBS` (default `cores - 1`).
- Queue max length (default 100). Beyond that return `503` + `Retry-After`.
- FIFO per priority; optional short-job priority later.

### 4. Compile cache

- Key: `sha256(normalizedCode + compilerVersion + flags)`.
- Store the binary in a host cache dir; mount **read-only** into the run container.
- LRU by count and total size (`CACHE_MAX_ENTRIES`, `CACHE_MAX_MB`).
- Cache hit skips compile entirely. Expect many hits for repeated runs on the same code.
- Never cache `CE` results for longer than the compile cache TTL; they are cheap to re-derive but fine to cache.

### 5. Precompiled headers

Build PCH for `bits/stdc++.h` (and common ones) into the image at build time. Cuts cold compile a lot.

### 6. Compile flags

`-O2 -pipe -std=c++17`. Avoid `-g`. Consider `-fno-diagnostics-color`. Test whether `-O1` compiles
fast enough to matter; keep `-O2` for judging fairness.

### 7. tmpfs work dirs

Write source/binary on tmpfs (RAM) to avoid disk I/O and make cleanup instant.

### 8. Accurate timing

Measure CPU time via `wait4` rusage inside `judge-shim`; report `cpuTimeMs`. Use wall time only as a backstop.
Optional: pin containers to CPUs (`--cpuset-cpus`) so timings are stable.

### 9. Warm container pool (only if benchmarks justify it)

Keep K idle containers (`sleep infinity`) and `docker exec` into them.

- Pros: skips ~150-300 ms startup.
- Cons: cross-submission contamination risk, complex cleanup, leaked processes.
- Rules if adopted: kill all processes, wipe `/work` and `/tmp`, and recycle the container after
  every job (so "warm" means pre-created, not reused). Document in an ADR.

### 10. Streaming and early exit

- Stop running remaining tests on first failure when `stopOnFirstFailure=true` (opt-in).
- Stream per-test results over SSE so the client shows progress immediately.

### 11. Node/Bun side

- Avoid reading whole stdout into memory beyond the output cap; stream with a byte limit.
- Use `Bun.spawn` with piped stdio; do not buffer in strings repeatedly.
- Keep JSON bodies small; compress responses (`gzip`) only for large result sets.
- Reuse one logger instance; avoid sync logging in the hot path.

## Benchmarking

Add `apps/judge/bench/` with:

- `bench:single` runs N=50 sequential submissions of: hello world, a+b, heavy-include (`bits/stdc++.h`), 20-test program. Reports min/p50/p95/max per phase (`queueMs`, `compileMs`, `runMs`, `totalMs`).
- `bench:load` uses `autocannon` or `k6`: concurrency 1, 4, 16, 64 for 60 s. Reports throughput, error rate, p95, queue depth, and checks for orphan containers afterward.

Rules:

- Run on an otherwise idle machine; record CPU model, cores, RAM, Docker version, kernel.
- Warm up with 5 runs before measuring.
- A PR touching the execution path must paste before/after numbers.

## Results log

| Date  | Change                  | Machine | p50 cold | p50 cached | Throughput | Notes |
| ----- | ----------------------- | ------- | -------- | ---------- | ---------- | ----- |
| _TBD_ | Baseline (current code) |         |          |            |            |       |

## Anti-patterns (do not do these)

- Spawning containers without going through the queue
- Re-compiling inside a loop over test cases
- Using `setTimeout` on the host as the only timeout (leaks containers on crash)
- Reading unbounded stdout into memory
- Optimizing without a benchmark number
