# PROBLEMS.md

The user does not want to add problems by hand. Problems are imported. This document says what is possible, what is not, and how to build it without getting blocked or into trouble.

## The honest constraints

1. **Hidden test cases are not available from LeetCode or Codeforces.** Neither platform publishes them. Importing a statement gives you something to read, not something you can judge. A judge without tests can only run the samples.
2. **Statements are copyrighted** by the platform or the authors. Showing metadata and linking out is safe. Copying full statements needs a license that allows it.
3. **LeetCode has no official public API.** Its GraphQL endpoint is private and its terms forbid scraping. Do not build on it.
4. **Codeforces has an official API** for metadata (problems, ratings, tags, user submissions). It does not return statements or tests. The API docs ask for at most one request per two seconds.

So "fetch everything from LeetCode and Codeforces and judge it" is not possible as stated. What is possible is below.

## Three tiers

| Tier                | What you get                                      | Judged here?                         | Source                                                   |
| ------------------- | ------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| 1. Catalog          | title, rating, tags, link to the original         | no, user solves on the original site | Codeforces API, AtCoder Problems API (community, cached) |
| 2. Judgeable import | statement + tests                                 | yes                                  | open datasets that include tests (see below)             |
| 3. Own problems     | statement, generator, reference solution, checker | yes                                  | written by you or the faculty                            |

Recommended for v1: tier 1 for breadth, tier 2 for a few hundred judgeable problems, and the battle feature uses only tier 2 and 3.

## Tier 2 source: CodeContests

`google-deepmind/code_contests` is a dataset of competitive programming problems with public, private and generated tests. Its repository states a CC BY 4.0 license; read the current license text before use and keep the attribution. It is large, so import a filtered subset.

Filters for a clean, judgeable subset:

- stdin/stdout problems only, no interactive problems
- time limit and memory limit within what the judge supports
- total test size under the storage cap in `docs/DATABASE.md`
- skip problems that accept many different answers (a checker would be needed). Heuristic: statement contains phrases like "any of them", "if there are multiple", "print any". Mark these `judgeable = false` until checkers exist.
- cap rating (for example up to 1800) so the catalog is approachable for students

## Tier 1 source: Codeforces API

- `problemset.problems` gives contestId, index, name, rating, tags.
- Optional feature: user links a Codeforces handle and the server reads `user.status` to mark problems as solved on the original site. Public endpoint, no password needed.
- Cache responses; refresh daily at most. Identify the app in the `User-Agent`.

## AtCoder

AtCoder Problems (kenkoooo.com) exposes JSON for problems and difficulty. It is a community project, so cache aggressively and be gentle. Check AtCoder's terms before importing statements or tests.

## Adapter interface

```ts
type ImportedProblem = {
  source: string;
  sourceId: string;
  title: string;
  url: string;
  rating?: number;
  tags: string[];
  statementMd?: string;
  limits?: { timeMs: number; memoryMb: number };
  tests?: { input: string; expected: string; sample: boolean }[];
  license: string;
  attribution: string;
};

interface SourceAdapter {
  name: string;
  fetch(opts: { limit?: number }): AsyncIterable<ImportedProblem>;
}
```

The runner upserts by `(source, source_id)`, so re-running is safe. It records an `import_runs` row with counts and the first error. One adapter per file in `apps/server/src/importers/`.

## Rules

- Use official APIs and published datasets. No HTML scraping of sites that forbid it.
- Rate limit per source. Back off on 429 and 5xx.
- Store `license` and `attribution` for every problem and show the attribution on its page, with a link to the original.
- Keep an `unpublish` switch so a problem can be removed fast if a rights holder asks.
- Sanitize statement HTML or convert to Markdown before storing. Render with a safe Markdown renderer, never `dangerouslySetInnerHTML` on raw source HTML.
- Import is admin-only and never runs on a public endpoint without auth.

## Tasks (see `PLAN.md` M3)

- [ ] Schema and runner
- [ ] Codeforces metadata adapter
- [ ] CodeContests adapter with the filters above
- [ ] Admin import endpoint and CLI
- [ ] Search and filter endpoints
- [ ] Attribution UI
