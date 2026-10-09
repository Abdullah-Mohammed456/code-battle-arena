# FRONTEND.md

## Stack

| Concern      | Choice                                                             |
| ------------ | ------------------------------------------------------------------ |
| Build        | Vite, React 18+, TypeScript                                        |
| Routing      | React Router                                                       |
| Server state | TanStack Query                                                     |
| Auth         | `@clerk/clerk-react`                                               |
| Styling      | Tailwind CSS with design tokens as CSS variables                   |
| Motion       | GSAP (`gsap`, `@gsap/react`, ScrollTrigger), Lenis (`lenis`)       |
| Editor       | CodeMirror 6 (`@uiw/react-codemirror` with `@codemirror/lang-cpp`) |
| Markdown     | `react-markdown` with `rehype-sanitize` for problem statements     |
| Realtime     | native `WebSocket` wrapped in one small hook                       |

Why Vite and not Next.js: the app sits behind login, needs no SSR, and the backend is a separate service. Fewer moving parts.

Why CodeMirror and not Monaco: much smaller bundle, enough features for a judge editor, easier to theme.

## Structure

```text
apps/web/src/
  main.tsx
  app/            router, providers, layout shell
  routes/         landing, problems, problem, battle, profile
  components/     ui (button, tag, input), editor, results, battle
  motion/         lenis.ts, cursor.ts, background.ts, transitions.ts
  lib/            api client, ws client, format helpers
  styles/         tokens.css, base.css
```

## Rules

- Routes fetch with TanStack Query. No data fetching in `useEffect`.
- The API client is typed from `packages/shared`. No `any` responses.
- Smooth scroll and the custom cursor are decorative. The app must work fully without them (reduced motion, touch, keyboard only).
- Workspace routes (`/problems/:slug`, `/battle/:id`) use native scroll. Lenis is on for landing, problem list, profile. See `docs/MOTION.md`.
- Every screen has loading, empty and error states.
- Keyboard: `Ctrl/Cmd+Enter` runs, `Ctrl/Cmd+Shift+Enter` submits.
- Store the draft code per problem in `localStorage` (try/catch around it).
- Bundle: lazy-load the editor and the battle route; keep first load JS small.

## Environment

`VITE_API_URL`, `VITE_WS_URL`, `VITE_CLERK_PUBLISHABLE_KEY`. Read through one `env.ts` that validates them.

## Tasks (see `PLAN.md` M5 and M6)

- [ ] Scaffold and providers
- [ ] Tokens and primitives
- [ ] Motion layer (`docs/MOTION.md`)
- [ ] API client and hooks
- [ ] Landing
- [ ] Problem list
- [ ] Problem workspace
- [ ] Profile
- [ ] Battle screens
