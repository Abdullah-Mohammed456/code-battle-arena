import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { problemDetailSchema } from "@repo/shared";
import { request } from "./api";
import { ErrorMessage } from "./ErrorMessage";
import { ArrowIcon } from "./ArrowIcon";
import { readDraft, saveDraft } from "./draft";

const CodeEditor = lazy(() => import("./CodeEditor"));
export function WorkspaceRoute(props: { signedIn?: boolean; userId?: string }) {
  const { slug = "" } = useParams();
  return (
    <ProblemWorkspace key={`${props.userId ?? "guest"}:${slug}`} {...props} />
  );
}

function ProblemWorkspace({
  signedIn = false,
  userId,
}: {
  signedIn?: boolean;
  userId?: string;
}) {
  const { slug = "" } = useParams();
  const draftKey = `${userId ?? "guest"}:${slug}`;
  const [code, setCode] = useState(() => readDraft(draftKey));
  const [draftSaved, setDraftSaved] = useState(true);
  const [input, setInput] = useState("");
  const [executionNotice, setExecutionNotice] = useState(false);
  const detail = useQuery({
    queryKey: ["problem", slug],
    queryFn: ({ signal }) =>
      request(`/api/problems/${slug}`, problemDetailSchema, { signal }),
  });
  if (detail.isPending) return <p className="message">Loading problem…</p>;
  if (detail.isError) return <ErrorMessage error={detail.error} />;
  const problem = detail.data;
  return (
    <section
      className="workspace"
      onKeyDownCapture={(event) => {
        if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
        event.preventDefault();
        setExecutionNotice(true);
      }}
    >
      <div className="workspace-heading" data-reveal>
        <div>
          <p className="eyebrow">
            {problem.source.toUpperCase()} / {problem.sourceId}
          </p>
          <h1>{problem.title}</h1>
          <div className="tag-list">
            {problem.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <Link
          className="source-link"
          to={problem.url}
          target="_blank"
          rel="noreferrer"
        >
          Original problem <ArrowIcon />
        </Link>
      </div>
      <div className="workspace-grid">
        <article className="statement" data-reveal>
          <h2>Problem</h2>
          {problem.statementMd ? (
            <div className="markdown">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {problem.statementMd}
              </ReactMarkdown>
            </div>
          ) : (
            <p>
              The full statement is available at the original source — review
              the samples below before submitting
            </p>
          )}
          {problem.samples.map((sample, index) => (
            <div className="sample" key={index}>
              <h3>Sample {index + 1}</h3>
              <div>
                <strong>Input</strong>
                <pre>{sample.input}</pre>
              </div>
              <div>
                <strong>Output</strong>
                <pre>{sample.expected}</pre>
              </div>
            </div>
          ))}
          <p className="limits">
            Time limit: {problem.timeLimitMs} ms · Memory:{" "}
            {problem.memoryLimitMb} MB
          </p>
          <p className="limits">
            {problem.attribution} · License: {problem.license}
          </p>
        </article>
        <section className="editor-panel" data-reveal>
          <div className="editor-toolbar">
            <span>C++17</span>
            <span>EXECUTION PAUSED</span>
          </div>
          <Suspense fallback={<p className="message">Loading editor…</p>}>
            <CodeEditor
              value={code}
              onChange={(value) => {
                setCode(value);
                setDraftSaved(saveDraft(draftKey, value));
              }}
            />
          </Suspense>
          {!draftSaved && (
            <p role="status" className="error-message">
              Your browser could not save this draft — copy your code before
              leaving
            </p>
          )}
          <label className="custom-input">
            <span>Custom input, optional</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Input for a custom run"
            />
          </label>
          {!signedIn && (
            <p>
              <Link className="source-link" to="/sign-in">
                Sign in to use your profile
              </Link>
            </p>
          )}
          <div className="editor-actions">
            <button onClick={() => setExecutionNotice(true)}>
              {input ? "Run custom input" : "Run samples"}
            </button>
            <button
              className="submit-button"
              onClick={() => setExecutionNotice(true)}
            >
              Submit solution
            </button>
          </div>
          {executionNotice && (
            <div className="execution-notice" role="status">
              <h3>Execution is temporarily unavailable</h3>
              <p>
                Sorry, we do not have a live judge service yet, so code cannot
                be compiled or run. You can still browse problems and save a
                draft in this browser.
              </p>
              <button onClick={() => setExecutionNotice(false)}>Close</button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
