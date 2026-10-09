# CODE_STYLE.md

The goal is code that looks like a careful person wrote it, not a generator.

## Rules

- No emojis, ever.
- Smallest correct solution. If a feature needs 20 lines, do not write 80.
- No abstraction until the second real use. No base classes, factories, or "manager" objects without a clear need.
- Delete dead code, unused exports, unused deps. Do not leave TODO graveyards.
- Early returns over nested ifs. Plain `async/await`. Small files (aim under 150 lines; split by responsibility, not by layer count).
- Trust types. Do not add runtime checks for things TypeScript or zod already guarantee. Validate only at boundaries (HTTP, WebSocket, env, external APIs).
- Errors: throw a small `HttpError(status, code, message)` in the server and let one handler format it. No try/catch that only rethrows.
- Names are short and plain: `getProblem`, `joinBattle`, `ratingDelta`. No `Manager`, `Helper`, `Utils`, `Impl`.
- Formatting by Prettier. No manual alignment.

## Comments

Comment the why, never the what. A comment is justified by a surprise: a workaround, a hidden constraint, a non-obvious formula, a link to an external spec.

Bad:

```ts
// Get the user by id
const user = await getUser(id)

// Loop over problems
for (const p of problems) { ... }
```

Good:

```ts
// Codeforces asks for at most one request per 2 seconds
await sleep(2000);

// Elo with K=32; new players are unrated until 5 games to avoid wild swings
const k = games < 5 ? 48 : 32;
```

No file header comments. No section banners. No JSDoc unless a public package API needs it. Do not comment out code; delete it.

## Commits

Short, lowercase, imperative: `add problem importer`, `fix timer drift in battle room`. No prefixes required. No emojis.

## Docs

Plain, direct sentences. Tables and code blocks when they help. No filler, no hype words.

## React

- Function components, hooks, no class components.
- Server state in TanStack Query. Local state in `useState`. A tiny store only for the battle socket.
- One component per file, props typed inline for small ones.
- Do not memoize by default. Add `useMemo`/`useCallback` only after measuring.
- Animations live in `src/motion/` and in effects via `useGSAP`; keep them out of data logic.

## Express

- One router per resource, handlers are thin: parse with zod, call a function, send JSON.
- Queries live in `src/db/queries/*.ts`, not inside handlers.
- Never build SQL from strings; use Drizzle's query builder or parameterized `sql`.
