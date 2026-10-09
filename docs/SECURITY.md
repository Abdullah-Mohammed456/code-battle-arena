# SECURITY.md

This service runs **arbitrary untrusted C++ code**. Treat every submission as hostile.

## Threat model

| Attacker goal               | Example                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Escape the sandbox          | container breakout, kernel exploits, abusing the Docker socket                            |
| Exhaust host resources      | fork bomb, memory bomb, disk fill, CPU burn, huge stdout                                  |
| Reach the network           | exfiltrate data, scan internal network, SSRF-like abuse, mining                           |
| Read host/other users' data | `#include "/etc/passwd"`, reading other submissions' dirs                                 |
| Abuse the compiler          | template/constexpr bombs, `#include "/dev/zero"`, giant arrays                            |
| Abuse the API               | request floods, giant bodies, malformed JSON, ID injection                                |
| Cheat the judge             | print expected output by reading test files, timing side channels, crash the judge itself |
| Leak info                   | stack traces, host paths, Docker errors in responses                                      |

## Biggest risk: the Docker socket

An API that can call `docker run` is effectively **root on the host**. Mitigations, in order of preference:

1. Run Docker **rootless** (or Podman rootless) for the user that runs the API.
2. Run the API on a **dedicated VM/host** with nothing else valuable on it.
3. Never expose the Docker socket to any container that touches user input.
4. Future: stronger isolation runtime (**gVisor `runsc`** or **Firecracker**) for the sandbox.

## Required `docker run` flags for sandbox containers

```text
--network none
--memory 256m --memory-swap 256m      # no swap
--cpus 1                              # or 0.5; pin with --cpuset-cpus for stable timing
--pids-limit 64
--read-only
--tmpfs /work:rw,nosuid,size=64m,exec # exec only if running binaries from here; prefer a separate noexec tmpfs for output
--tmpfs /tmp:rw,noexec,nosuid,size=16m
--cap-drop ALL
--security-opt no-new-privileges
--security-opt seccomp=<profile.json> # start from Docker default, tighten
--user 65534:65534                    # non-root
--ulimit nofile=64:64
--ulimit nproc=64:64
--ulimit core=0
--ulimit fsize=<bytes>                # cap file writes
--stop-timeout 0
--name sbx-<uuid>                     # server-generated only
--rm                                  # plus explicit `docker rm -f` in finally
```

Do not remove a flag to "make something work" without an ADR. Fix the cause instead.

## Rules for the code

- **No shell interpolation.** Spawn with argument arrays. Code is delivered via file in a server-created dir or via stdin, never via `-c "echo '$code' > ..."`.
- **IDs are server-generated** (`crypto.randomUUID()`); client-provided `id` fields are echoed back only after validation against `[A-Za-z0-9_-]{1,64}`.
- Mount only the per-submission work dir, never the repo or home directory. Prefer copying the file in over bind mounts. Mounted dirs are `ro` where possible.
- Hidden test data must never be readable inside the container that runs user code beyond what is piped to stdin.
- Cap everything: body size, code size, test count, per-test I/O, output size, compile output length.
- Host-side watchdog: if the container is still alive at `limit + grace`, `docker kill` then `docker rm -f`.
- Always clean up in `finally`. Run an **orphan reaper** at startup and every minute: remove containers named `sbx-*` older than N minutes and stale work dirs.
- Sanitize compiler output: strip absolute paths, cap at ~4 KB, drop control characters.
- Return generic messages for internal errors; log details server-side with the request ID.

## Compiler hardening

- Compile in its own time- and memory-limited step (e.g. 10 s, 512 MB).
- Flags: `-O2 -std=c++17 -pipe -fno-plt -ftemplate-depth=512 -fconstexpr-ops-limit=33554432 -fmax-errors=20`
- Disallow `#include` of absolute paths and device files: either reject by regex before compiling
  (`#\s*include\s*["<]\s*/`, `/dev/`, `/proc/`, `..`) and also rely on the sandbox having nothing sensitive.
- Do not allow `-include`, `-I`, `-D` or any extra flags from the client.
- `#pragma` and inline asm are allowed only because the sandbox must be safe regardless; do not rely on filtering for safety.

## Image hardening (`Dockerfile`)

- Minimal base (e.g. `gcc:<pinned-version>` or `debian:stable-slim` + `g++`), **pinned digest**.
- Remove `apt`, `curl`, `wget`, `git`, `ssh`, package caches, and unneeded setuid binaries.
- Create a non-root user with no shell and no home directory contents.
- Only `/work` and `/tmp` writable (via tmpfs at runtime).
- Rebuild weekly to pick up security patches; scan with Trivy/Grype in CI.

## API hardening

- `helmet`, strict CORS (explicit origins from env), JSON body size limit, schema validation (zod).
- Rate limit per IP and per API key. Lower limit for compile+run endpoints.
- API-key auth (Bearer). Keys stored hashed if persisted. Rotate on leak.
- Disable `x-powered-by`. Bind `/metrics` and `/ready` to internal network or protect them.
- Timeouts: server `headersTimeout`, `requestTimeout`; abort job if client disconnects.
- Dependency hygiene: lockfile committed, `bun audit` / `npm audit` or Renovate in CI.

## Logging and privacy

- Do not log source code or test data at `info`. Log sizes and hashes instead.
- Log verdicts, durations, request IDs, client key ID (not the key).
- Retain logs for a bounded time.

## Security checklist (tick before each release)

- [ ] All required Docker flags applied and covered by an integration test that inspects `docker inspect`
- [ ] Malicious fixture suite green (`docs/TESTING.md`)
- [ ] No `exec`/`shell: true`/template-string commands anywhere (`grep` in CI)
- [ ] Orphan reaper tested (kill API mid-run, restart, containers gone)
- [ ] Rate limits and size limits tested
- [ ] Docker running rootless or on isolated host
- [ ] Runner image rebuilt and scanned within the last 7 days
- [ ] Secrets only via env/secret manager; `.env` is gitignored
- [ ] Error responses leak no paths or stack traces

## Reporting vulnerabilities

Do not open public issues for security bugs. Contact the maintainer privately (add email here) with
reproduction steps. Expect an acknowledgement within 72 hours.

## Main server and web

The sections above describe the judge. The main server and web client add these rules.

- Judge is reachable only with `JUDGE_SECRET` and never from browsers. The main server never holds a Docker socket.
- CORS allows only the known web origins. No wildcard with credentials.
- Every request body and WebSocket message is validated with zod. Close sockets that send invalid messages repeatedly.
- Hidden test cases and expected outputs never leave the server. Strip them from every response.
- Problem statements are sanitized Markdown. No raw HTML from external sources.
- Admin routes check the role in the database, not in the token alone.
- Per-user rate limits on run, submit, battle creation and join.
- Secrets live in provider env settings (Vercel, Render, VPS). `.env` files are gitignored. Rotate on any leak.
- Import jobs use official APIs only, with rate limits and a User-Agent that identifies the project.
- Battle fairness: server clock only, cooldown on submissions, problem text hidden until start.
- Dependencies: lockfile committed, automated update PRs, audit in CI.
