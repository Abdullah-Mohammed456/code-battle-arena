import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  progressListSchema,
  submissionListSchema,
  submissionQuerySchema,
  userProfileSchema,
} from "@repo/shared";
import type { Api } from "./api";
import { ErrorMessage } from "./ErrorMessage";

export function Profile({ api, userId }: { api: Api; userId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = submissionQuerySchema.safeParse({
    page: searchParams.get("page") ?? 1,
  });
  const page = parsed.success ? parsed.data.page : 1;
  const profile = useQuery({
    queryKey: ["profile", userId, "me"],
    queryFn: () => api("/api/me", userProfileSchema),
  });
  const progress = useQuery({
    queryKey: ["profile", userId, "progress"],
    queryFn: () => api("/api/me/progress", progressListSchema),
  });
  const submissions = useQuery({
    queryKey: ["profile", userId, "submissions", page],
    queryFn: () => api(`/api/submissions?page=${page}`, submissionListSchema),
  });
  return (
    <section className="profile-page" data-reveal>
      <p className="eyebrow">YOUR ACCOUNT / PROGRESS</p>
      <h1>{profile.data?.displayName ?? "Profile"}</h1>
      {[profile, progress, submissions].some((item) => item.isError) && (
        <ErrorMessage
          error={profile.error ?? progress.error ?? submissions.error}
        />
      )}
      <div className="profile-stats">
        <div>
          <strong>{progress.data?.solved ?? "—"}</strong>
          <span>SOLVED</span>
        </div>
        <div>
          <strong>{progress.data?.attempted ?? "—"}</strong>
          <span>ATTEMPTED</span>
        </div>
        <div>
          <strong>{profile.data?.rating ?? "—"}</strong>
          <span>RATING</span>
        </div>
      </div>
      <h2>Recent submissions</h2>
      {submissions.isPending ? (
        <p className="message">Loading submissions…</p>
      ) : submissions.data?.items.length ? (
        <div className="submission-list">
          {submissions.data.items.map((item) => (
            <Link
              className="submission-row"
              to={`/submissions/${item.id}`}
              key={item.id}
            >
              <span>{item.problemTitle}</span>
              <strong className={item.status === "AC" ? "accepted" : ""}>
                {item.status}
              </strong>
              <span>
                {item.passed}/{item.total} tests
              </span>
              <time>{new Date(item.createdAt).toLocaleString()}</time>
            </Link>
          ))}
        </div>
      ) : !submissions.isError ? (
        <p className="message">
          No submissions yet — pick a problem to get started
        </p>
      ) : null}
      {submissions.data && (
        <div className="pager">
          <button
            disabled={page <= 1 || submissions.isFetching}
            onClick={() => setSearchParams({ page: String(page - 1) })}
          >
            Previous
          </button>
          <span>
            PAGE {page} /{" "}
            {Math.max(
              1,
              Math.ceil(submissions.data.total / submissions.data.limit),
            )}
          </span>
          <button
            disabled={
              page * submissions.data.limit >= submissions.data.total ||
              submissions.isFetching
            }
            onClick={() => setSearchParams({ page: String(page + 1) })}
          >
            Next
          </button>
        </div>
      )}
      <h2>Problem progress</h2>
      {progress.isPending && <p className="message">Loading progress…</p>}
      {progress.data?.items.length === 0 && (
        <p className="message">No attempted problems yet</p>
      )}
      <div className="submission-list">
        {progress.data?.items.map((item) => (
          <Link
            className="submission-row"
            to={`/problems/${item.problemSlug}`}
            key={item.problemSlug}
          >
            <span>{item.problemTitle}</span>
            <strong>{item.status.toUpperCase()}</strong>
            <span>{item.attempts} attempts</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
