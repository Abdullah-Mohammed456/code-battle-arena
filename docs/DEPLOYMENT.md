# DEPLOYMENT.md

## Targets

| Part          | Host               | Notes                                                              |
| ------------- | ------------------ | ------------------------------------------------------------------ |
| `apps/web`    | Vercel             | Vite static build, SPA rewrite to `index.html`                     |
| `apps/server` | Render web service | WebSockets work. Free instances sleep, use a paid one for the demo |
| Database      | Neon               | Pooled string for the app, direct string for migrations            |
| Auth          | Clerk              | Production instance with real domains                              |
| `apps/judge`  | small VPS          | Docker is required. Not possible on Render                         |

## Why a VPS for the judge

Render does not give a web service access to a Docker daemon. The judge needs one. Pick any small Linux VPS (Hetzner, DigitalOcean, Oracle Always Free ARM, a spare machine at the faculty). If the VPS is ARM, build the runner image for arm64. Alternative: replace the judge with a hosted Judge0 or Piston instance behind `runOnJudge`.

## No VPS yet: free options for the judge

Budget is zero, so only free options are listed. Local development needs nothing extra: run the judge on your own machine with Docker.

| Option                                                          | Cost                        | Trade-off                                                                          |
| --------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| Own PC or laptop plus Cloudflare Tunnel                         | free                        | Works only while the machine is on. See the safety notes below                     |
| GitHub Student Developer Pack credits (DigitalOcean and others) | free credits while enrolled | Needs current student status. Gives a real always-on VPS. Check the current offer  |
| Oracle Cloud Always Free                                        | free                        | Needs a card for verification and capacity varies by region. Check availability    |
| Hosted execution API free tier (Judge0 on RapidAPI, others)     | free, small quota           | Daily limits, so a battle with many submissions can hit them. Check current limits |

Plan: develop locally, deploy web, server, database and auth on free tiers (Vercel, Render, Neon, Clerk), and run the judge on the own machine behind a tunnel while demoing, or on student credits if available. When the judge is unreachable, the server returns a clear "judge offline" status and the UI shows it. Record a demo video so the project can still be shown when the machine is off.

### Safety when the judge runs on your own PC

The judge executes strangers' code, so contain it:

- Run it inside a Linux VM or WSL2, not directly on your daily system, with nothing personal inside.
- Rootless Docker, all sandbox flags from `docs/SECURITY.md`, no network for sandbox containers.
- Only accept requests with `JUDGE_SECRET`, and only the main server knows it. Submissions require a signed-in user.
- Turn the tunnel off when you are not demoing.

Whatever is chosen, the server talks to the judge only through `runOnJudge`, so switching hosts later is a small change.

## Environment variables

### web (Vercel)

`VITE_API_URL`, `VITE_WS_URL`, `VITE_CLERK_PUBLISHABLE_KEY`

### server (Render)

| Variable                                    | Notes                                  |
| ------------------------------------------- | -------------------------------------- |
| `NODE_ENV`                                  | `production`                           |
| `PORT`                                      | provided by Render                     |
| `DATABASE_URL`                              | Neon pooled string                     |
| `DATABASE_URL_DIRECT`                       | Neon direct string, used by migrations |
| `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |                                        |
| `CORS_ORIGINS`                              | the Vercel domain(s)                   |
| `JUDGE_URL`                                 | `https://judge.example.com`            |
| `JUDGE_SECRET`                              | shared secret                          |
| `LOG_LEVEL`                                 | `info`                                 |

### judge (VPS)

Same variables as in the original judge docs (limits, cache, queue), plus `JUDGE_SECRET`. See `docs/JUDGE_API.md` and `docs/PERFORMANCE.md`.

Provide `.env.example` in each app. Validate env at startup and refuse to boot on invalid config.

## Vercel

- Root directory `apps/web`, build `bun run build` (or the package manager in use), output `dist`.
- `vercel.json` rewrite: all paths to `/index.html`.
- Set the three `VITE_` variables for Production and Preview.

## Render

- Root `apps/server` (or a Dockerfile at the repo root with turbo prune).
- Runtime: Node. Render's native runtimes cover Node; if the server stays on Bun, use a Dockerfile. Verify Render's current Bun support before choosing.
- Health check path `/health`.
- `app.set('trust proxy', 1)` so rate limiting sees real IPs.
- Run migrations as a pre-deploy command with the direct database URL.

## Neon

- One project, `main` branch for production, a branch per developer or per PR for schema work.
- Free tier has small storage and compute limits that scale to zero; the first query after idle is slower. Keep test case storage under control (`docs/DATABASE.md`).

## Judge VPS

- Rootless Docker, a non-root user, firewall allowing only 443 (and SSH from your IP).
- Caddy or Nginx in front for TLS. The judge only accepts requests with `JUDGE_SECRET`.
- Run with systemd, `Restart=always`, memory cap on the service.
- Rebuild the runner image weekly and scan it. Full sandbox rules in `docs/SECURITY.md`.

## CI

1. Install, typecheck, lint, unit tests on every push.
2. Integration and malicious suite on every PR, on a runner with Docker.
3. Deploy: Vercel and Render deploy from `main`. The judge deploys by a small script or a GitHub Action over SSH.

## Release checklist

- [ ] CI green
- [ ] Migrations tested on a Neon branch
- [ ] `docs/SECURITY.md` checklist ticked
- [ ] Smoke test: sign in, run a sample, submit, finish a duel
- [ ] Rollback: previous Vercel and Render deploys are one click; keep the previous judge image tag

## Monitoring

| Signal                     | Alert when            |
| -------------------------- | --------------------- |
| Server 5xx rate            | over 1%               |
| Judge `IE` rate            | over 1%               |
| Judge queue depth          | over 50 for 2 minutes |
| Submit p95 latency         | over 4 s              |
| WebSocket disconnect spike | sudden jump           |
| Neon storage               | over 80%              |
| VPS disk                   | over 80%              |
