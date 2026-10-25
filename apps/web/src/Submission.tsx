import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { submissionDetailSchema } from "@repo/shared";
import type { Api } from "./api";
import { ErrorMessage } from "./ErrorMessage";
import { Results } from "./Results";

export function Submission({ api, userId }: { api: Api; userId: string }) {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["profile", userId, "submission", id],
    queryFn: () => api(`/api/submissions/${id}`, submissionDetailSchema),
  });
  if (query.isPending) return <p className="message">Loading submission…</p>;
  if (query.isError) return <ErrorMessage error={query.error} />;
  const item = query.data;
  return (
    <section className="profile-page" data-reveal>
      <p className="eyebrow">SUBMISSION / C++17</p>
      <h1>{item.problemTitle}</h1>
      <Link className="source-link" to={`/problems/${item.problemSlug}`}>
        Back to problem
      </Link>
      <p className="limits">
        <time dateTime={item.createdAt}>
          {new Date(item.createdAt).toLocaleString()}
        </time>
      </p>
      <Results value={item} />
      <section className="result-panel">
        <h2>Submitted code</h2>
        <pre>
          <code>{item.code}</code>
        </pre>
      </section>
    </section>
  );
}
