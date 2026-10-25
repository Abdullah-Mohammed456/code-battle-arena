import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  problemListSchema,
  problemQuerySchema,
  progressListSchema,
} from "@repo/shared";
import { request, type Api } from "./api";
import { ErrorMessage } from "./ErrorMessage";
import { ArrowIcon } from "./ArrowIcon";

type Problem = ReturnType<typeof problemListSchema.parse>["items"][number];

export function ProblemList({ api, userId }: { api?: Api; userId?: string }) {
  const [params, setParams] = useSearchParams();
  const filterNames = [
    "query",
    "tag",
    "source",
    "judgeable",
    "minRating",
    "maxRating",
    "page",
  ];
  const values = Object.fromEntries(
    filterNames.flatMap((name) =>
      params.get(name) ? [[name, params.get(name)!]] : [],
    ),
  );
  const parsed = problemQuerySchema.safeParse({ ...values, limit: 20 });
  const page = parsed.success ? parsed.data.page : 1;
  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next);
  };
  const query = useQuery({
    queryKey: ["problems", values],
    enabled: parsed.success,
    queryFn: ({ signal }) =>
      request(
        `/api/problems?${new URLSearchParams({ ...values, limit: "20" })}`,
        problemListSchema,
        { signal },
      ),
  });
  const progress = useQuery({
    queryKey: ["profile", userId, "progress"],
    enabled: Boolean(api),
    queryFn: () => api!("/api/me/progress", progressListSchema),
  });
  const statuses = new Map(
    progress.data?.items.map((item) => [item.problemSlug, item.status]),
  );
  return (
    <>
      <section className="intro" data-reveal>
        <div>
          <p className="eyebrow">
            <span className="live-dot" /> PROBLEM SET{" "}
            <span className="eyebrow-index">01 / PRACTICE</span>
          </p>
          <h1>
            PROBLEM
            <br />
            <span>INDEX</span>
          </h1>
          <p className="intro-copy">
            Choose a challenge and write your solution
          </p>
        </div>
        <div className="stats">
          <div>
            <strong>{query.data?.total ?? "—"}</strong>
            <span>AVAILABLE</span>
          </div>
          <p>
            CODEFORCES
            <br />
            CODECONTESTS
          </p>
        </div>
      </section>
      <section className="index-layout" data-reveal>
        <div className="problem-column">
          <div className="list-heading">
            <div>
              <span className="section-index">01—</span>
              <h2>Problem set</h2>
            </div>
            <span className="result-count">
              {query.data?.total ?? 0} PROBLEMS
            </span>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search by name"
              value={params.get("query") ?? ""}
              onChange={(event) => {
                update("query", event.target.value);
              }}
            />
          </label>
          {!parsed.success ? (
            <p className="error-message" role="alert">
              Check your filters — ratings must be between 0 and 5000, with
              minimum no greater than maximum
            </p>
          ) : query.isPending ? (
            <p className="message">Loading problems…</p>
          ) : query.isError ? (
            <ErrorMessage error={query.error} />
          ) : (
            <div className="problem-list">
              {query.data.items.map((problem, index) => (
                <ProblemRow
                  key={problem.id}
                  problem={problem}
                  index={index + (page - 1) * 20}
                  status={statuses.get(problem.slug)}
                />
              ))}
              {query.data.items.length === 0 && (
                <p className="empty-state">No problems match this search</p>
              )}
            </div>
          )}
          <div className="pager">
            <button
              disabled={page <= 1}
              onClick={() => update("page", String(page - 1))}
            >
              Previous
            </button>
            <span>
              PAGE {page} /{" "}
              {Math.max(1, Math.ceil((query.data?.total ?? 0) / 20))}
            </span>
            <button
              disabled={page * 20 >= (query.data?.total ?? 0)}
              onClick={() => update("page", String(page + 1))}
            >
              Next
            </button>
          </div>
        </div>
        <aside className="filter-panel" aria-label="Problem filters">
          <div className="panel-heading">
            <span>REFINE</span>
            <span>+</span>
          </div>
          <fieldset>
            <legend>Problem type</legend>
            {[
              ["", "All problems"],
              ["true", "Judgeable"],
              ["false", "Catalog only"],
            ].map(([value, label]) => (
              <button
                key={label}
                className={`filter-option ${(params.get("judgeable") ?? "") === value ? "selected" : ""}`}
                aria-pressed={(params.get("judgeable") ?? "") === value}
                onClick={() => update("judgeable", value!)}
              >
                {label}
              </button>
            ))}
          </fieldset>
          <label className="custom-input">
            Source
            <select
              value={params.get("source") ?? ""}
              onChange={(event) => update("source", event.target.value)}
            >
              <option value="">All sources</option>
              <option value="codeforces">Codeforces</option>
              <option value="codecontests">CodeContests</option>
            </select>
          </label>
          <label className="custom-input">
            Tag
            <input
              value={params.get("tag") ?? ""}
              onChange={(event) => update("tag", event.target.value)}
              placeholder="For example, greedy"
            />
          </label>
          <label className="custom-input">
            Minimum rating
            <input
              type="number"
              min="0"
              max="5000"
              value={params.get("minRating") ?? ""}
              onChange={(event) => update("minRating", event.target.value)}
            />
          </label>
          <label className="custom-input">
            Maximum rating
            <input
              type="number"
              min="0"
              max="5000"
              value={params.get("maxRating") ?? ""}
              onChange={(event) => update("maxRating", event.target.value)}
            />
          </label>
          <p className="panel-note">
            Judgeable problems include private tests. Catalog-only problems link
            to the original source
          </p>
          <button className="pink-button" onClick={() => setParams({})}>
            RESET FILTERS
          </button>
        </aside>
      </section>
    </>
  );
}

export function ProblemRow({
  problem,
  index,
  status,
}: {
  problem: Problem;
  index: number;
  status?: "solved" | "attempted";
}) {
  return (
    <Link className="problem-row" to={`/problems/${problem.slug}`}>
      <span className="row-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="problem-name">
        <strong>{problem.title}</strong>
        <small>
          {problem.sourceId} <i>/</i> {problem.source}
          {status && (
            <span className={status === "solved" ? "accepted" : ""}>
              {" "}
              / {status.toUpperCase()}
            </span>
          )}
        </small>
      </span>
      <span className="tag-list">
        {problem.tags.slice(0, 3).map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </span>
      <span className="problem-rating">
        {problem.rating ?? "—"}
        <small>RATING</small>
      </span>
      <span className={problem.judgeable ? "status status-ready" : "status"}>
        {problem.judgeable ? "JUDGEABLE" : "CATALOG"}
      </span>
      <span className="row-arrow">
        <ArrowIcon />
      </span>
    </Link>
  );
}
