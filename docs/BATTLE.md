# BATTLE.md

The battle is the core feature. This is a design proposal built from how Codeforces, LeetCode, AtCoder and CodinGame run competitions, trimmed to what one developer can ship and what fits a faculty audience.

## What the references do

| Platform                | Idea worth borrowing                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Codeforces              | Elo-style rating, points that decay with time, penalty for wrong submissions, hidden tests judged after submit |
| LeetCode contests       | Few problems, fixed points per problem, 5 minute penalty per wrong try, rank by score then finish time         |
| AtCoder                 | Simple points per problem, penalty used only as tie-break                                                      |
| CodinGame Clash of Code | Short 5 to 15 minute rooms, join by code, results in the same screen, fun variants (fastest, shortest code)    |

## Modes

| Mode       | Players | Problems | When                                        |
| ---------- | ------- | -------- | ------------------------------------------- |
| Duel       | 2       | 1        | M7. Invite code first, matchmaking in M8    |
| Race       | 3 to 20 | 3        | M8. Points with decay, penalty              |
| Group room | any     | 1 to 5   | M8. Faculty classes and clubs, link to join |

Start with Duel. It is the smallest thing that is still a real battle.

## Duel rules

- 1 problem, judgeable only, duration 10 to 20 minutes (default 15).
- Winner: first player with a fully accepted submission.
- If time runs out with no accepted solution: compare best result (most tests passed); tie goes to the earlier time of that best result; still tied is a draw.
- A submission cooldown of 10 seconds per player prevents spamming the judge.
- Opponents see status and tests passed (for example `7/12`), never code and never which test failed.
- Invite-code rooms are unrated by default. Only matchmaking games are rated. This stops two friends from farming rating.

## Race rules (M8)

- Per problem points: `max(0.3 * base, base - 0.7 * base * elapsed / duration)`. Base is 100, 200, 300 by difficulty order.
- Wrong accepted-attempt count adds 5 minutes of penalty time to that problem, used only to break ties.
- Rank: total points desc, then total penalty time asc, then earliest last accepted submission.
- Verdicts `CE` and `IE` do not count as a wrong attempt.

## Rating

Elo, start 1200.

```text
expected = 1 / (1 + 10 ^ ((opponent - me) / 400))
new = old + K * (score - expected)
K = 48 for the first 5 rated games, then 32
score: win 1, draw 0.5, loss 0
```

For Race, compare every pair by rank, average the results, apply the same formula. Ratings update once, when the battle finishes, in a single transaction.

## Matchmaking (M8)

- Queue entry holds user, rating, joinedAt.
- Match players within 100 rating points. Widen by 50 every 10 seconds, up to 400.
- Problem pick: judgeable, unsolved by both players, rating close to the average player rating, random among candidates.
- If no match after 60 seconds, offer a bot-free fallback: create an invite room.

## State machine

```text
waiting -> countdown (5s) -> running -> finished
   |           |                |
   +-----------+----------------+--> cancelled
```

- `waiting`: players join, each presses ready. Creator can start when all are ready.
- `countdown`: server sets `startsAt` and `endsAt` (epoch ms). Problems are revealed at `startsAt`, not before.
- `running`: submissions accepted. Server closes the battle at `endsAt` or when the duel is decided.
- `finished`: results and rating changes persisted, then broadcast.

## Server authority

- The server owns time. Clients get `startsAt`, `endsAt` and `serverNow`, compute an offset, and only display a timer.
- Submissions are accepted only while `running` and before `endsAt`. A submission already sent to the judge at the deadline still counts if it was received before `endsAt`.
- Scores come from judge results stored by the server, never from client messages.
- Problem text is not sent to a client before `startsAt`.

## Transport

- Server to client events over WebSocket (`ws`, a plain library; Socket.IO is not needed).
- Submissions go through HTTP: `POST /api/battles/:id/submit`. Large code bodies and rate limiting are simpler there, and the result is also pushed over the socket.
- Auth: Clerk token as the first socket message (see `docs/AUTH.md`).

### Client to server

| Message | Payload              |
| ------- | -------------------- |
| `auth`  | `{ token }`          |
| `join`  | `{ battleId }`       |
| `ready` | `{ ready: boolean }` |
| `ping`  | `{}`                 |

### Server to client

| Event                           | Payload                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `state`                         | full snapshot: status, players, problems if revealed, times. Sent on join and on reconnect |
| `player.joined` / `player.left` | `{ userId }`                                                                               |
| `player.ready`                  | `{ userId, ready }`                                                                        |
| `countdown`                     | `{ startsAt, endsAt, serverNow }`                                                          |
| `started`                       | `{ problems }`                                                                             |
| `progress`                      | `{ userId, problemIdx, status, passed, total }`                                            |
| `finished`                      | `{ results, ratingChanges }`                                                               |
| `error`                         | `{ code, message }`                                                                        |

Define these as zod schemas in `packages/shared` and use the same types in web and server.

## Failure cases

| Case                                   | Behavior                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| Player disconnects                     | 60 second grace, state restored on reconnect. After grace in a duel, the player forfeits |
| Server restarts mid battle             | On boot, mark running battles `cancelled`, unrated                                       |
| Judge down                             | Submission returns `IE`, no penalty, player can retry                                    |
| Both players submit near the same time | Order by the server receive time of the submission, stored in the row                    |
| Creator leaves in `waiting`            | Cancel the room                                                                          |
| Duplicate tab                          | Newest socket wins, older one is closed                                                  |

## Anti-cheat basics

- Per-player submission cooldown and body size limit.
- Log tab blur events as information only; do not punish on them.
- After a battle, compare the two accepted solutions with a simple similarity check (later). Flag, do not auto ban.
- No chat in v1 (also avoids moderation work).

## Tasks (see `PLAN.md` M7 and M8)

- [ ] Tables and queries (`battles`, `battle_problems`, `battle_players`)
- [ ] Room manager in memory with the state machine
- [ ] Socket server with auth and reconnect
- [ ] Submit endpoint tied to a battle
- [ ] Scoring and Elo with unit tests (pure functions)
- [ ] UI: lobby, room, result
- [ ] Matchmaking queue
- [ ] Race mode
