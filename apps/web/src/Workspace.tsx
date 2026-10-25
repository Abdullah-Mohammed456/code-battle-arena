import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  problemDetailSchema,
  problemRunResponseSchema,
  submissionSchema,
  type z,
} from "@repo/shared";
import { request, type Api } from "./api";
import { ErrorMessage } from "./ErrorMessage";
import { Results } from "./Results";
import { ArrowIcon } from "./ArrowIcon";
import { readDraft, saveDraft } from "./draft";

const CodeEditor = lazy(() => import("./CodeEditor"));
type ExecutionResult =
  z.infer<typeof problemRunResponseSchema> | z.infer<typeof submissionSchema>;

export function WorkspaceRoute(props: {
  api: Api;
  signedIn?: boolean;
  userId?: string;
}) {
  const { slug = "" } = useParams();
  return (
    <ProblemWorkspace key={`${props.userId ?? "guest"}:${slug}`} {...props} />
  );
}

function ProblemWorkspace({
  api,
  signedIn = false,
  userId,
}: {
  api: Api;
  signedIn?: boolean;
  userId?: string;
}) {
  const { slug = "" } = useParams();
  const queryClient = useQueryClient();
  const draftKey = `${userId ?? "guest"}:${slug}`;
  const [code, setCode] = useState(() => readDraft(draftKey));
  const [draftSaved, setDraftSaved] = useState(true);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ExecutionResult>();
  const detail = useQuery({
    queryKey: ["problem", slug],
    queryFn: ({ signal }) =>
      request(`/api/problems/${slug}`, problemDetailSchema, { signal }),
  });
  const run = useMutation({
    mutationFn: () =>
      api(`/api/problems/${slug}/run`, problemRunResponseSchema, {
        method: "POST",
        body: JSON.stringify(input ? { code, input } : { code }),
      }),
    onSuccess: setResult,
  });
  const submit = useMutation({
    mutationFn: () =>
      api(`/api/problems/${slug}/submit`, submissionSchema, {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    onSuccess: (value) => {
      setResult(value);
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
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
        if (!signedIn || run.isPending || submit.isPending) return;
        if (event.shiftKey) {
          if (problem.judgeable) {
            setResult(undefined);
            run.reset();
            submit.mutate();
          }
        } else {
          setResult(undefined);
          submit.reset();
          run.mutate();
        }
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
            <span>
              {problem.judgeable ? "READY TO SUBMIT" : "CATALOG ONLY"}
            </span>
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
                Sign in to run and submit your solution
              </Link>
            </p>
          )}
          <div className="editor-actions">
            <button
              disabled={!signedIn || run.isPending || submit.isPending}
              onClick={() => {
                setResult(undefined);
                submit.reset();
                run.mutate();
              }}
            >
              {run.isPending
                ? "Running…"
                : signedIn
                  ? input
                    ? "Run custom input"
                    : "Run samples"
                  : "Sign in to run"}
            </button>
            <button
              className="submit-button"
              disabled={
                !signedIn ||
                !problem.judgeable ||
                run.isPending ||
                submit.isPending
              }
              onClick={() => {
                setResult(undefined);
                run.reset();
                submit.mutate();
              }}
            >
              {submit.isPending
                ? "Submitting…"
                : signedIn
                  ? "Submit solution"
                  : "Sign in to submit"}
            </button>
          </div>
          {(run.isError || submit.isError) && (
            <ErrorMessage error={run.error ?? submit.error} />
          )}
          {result !== undefined && <Results value={result} />}
        </section>
      </div>
    </section>
  );
}
