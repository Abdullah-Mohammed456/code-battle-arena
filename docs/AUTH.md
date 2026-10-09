# AUTH.md

Provider: Clerk. The app never stores passwords.

> Package names and helper functions below match Clerk's docs at the time of writing. Check the current Clerk docs before coding; the SDKs change.

## Web

- `@clerk/clerk-react`: `ClerkProvider` at the root, `SignedIn`, `SignedOut`, `UserButton`, `useAuth`.
- Protected routes redirect to sign-in. Public routes: landing, problem list, problem page (read only).
- API calls attach the session token: `const token = await getToken()` and `Authorization: Bearer <token>`.
- Restyle Clerk components with the `appearance` prop so they match `docs/DESIGN.md`. Do not leave the default look.

## Server (Express)

- `@clerk/express`: `clerkMiddleware()` globally, then a small `requireUser` guard that reads `getAuth(req).userId`, returns 401 if missing, and loads or creates the row in `users`.
- Lazy upsert: on the first authenticated request, insert the user by `clerk_id` using data from the Clerk session or `clerkClient.users.getUser`. This avoids webhooks for the basic case.
- Optional webhook (Svix-signed) for `user.updated` and `user.deleted`, to keep profile data fresh and delete data on account removal.

## Roles

- `admin` is stored in `users.role` and set manually in the database for now. Admin routes: problem import, moderation.
- Do not trust a role sent by the client.

## WebSocket auth

The browser cannot set headers on a WebSocket, so:

1. Client opens the socket and sends `{ type: "auth", token }` as the first message (or passes the token in the query string over TLS).
2. Server verifies it with `verifyToken` from `@clerk/backend` using the secret key.
3. Unauthenticated sockets are closed after 5 seconds.
4. Tokens are short lived. On reconnect, fetch a fresh token first.

## Judge auth

The server calls the judge with `Authorization: Bearer <JUDGE_SECRET>`. The judge refuses everything else. Rotate the secret on leak. The judge is not reachable from browsers.

## Env

| App    | Variable                                                                                 |
| ------ | ---------------------------------------------------------------------------------------- |
| web    | `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`, `VITE_WS_URL`                              |
| server | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `JUDGE_URL`, `JUDGE_SECRET`, `CORS_ORIGINS` |
| judge  | `JUDGE_SECRET`                                                                           |

## Checklist

- [ ] Production Clerk instance with the real domains
- [ ] CORS only allows the Vercel domain and localhost in dev
- [ ] Every non-public route goes through `requireUser`
- [ ] Admin routes check `role === "admin"` from the database
- [ ] Socket closes without a valid token
