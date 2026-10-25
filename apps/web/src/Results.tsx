import {
  type z,
  problemRunResponseSchema,
  submissionSchema,
} from "@repo/shared";

type Result =
  z.infer<typeof problemRunResponseSchema> | z.infer<typeof submissionSchema>;

export function Results({ value }: { value: Result }) {
  return (
    <section
      className="result-panel"
      aria-label="Execution result"
      aria-live="polite"
    >
      <h3 className={value.status === "AC" ? "verdict accepted" : "verdict"}>
        {value.status}
        {"passed" in value ? ` · ${value.passed}/${value.total} tests` : ""}
      </h3>
      <p className="limits">{value.timeMs} ms</p>
      {!("results" in value) ? (
        <>
          {value.error && <pre>{value.error}</pre>}
          {value.output !== undefined && (
            <pre>{value.output || "(no output)"}</pre>
          )}
        </>
      ) : (
        value.results.map((item) =>
          item.sample ? (
            <details key={item.idx} open={item.status !== "AC"}>
              <summary>
                Sample {item.idx}: {item.status}
              </summary>
              {item.error && <pre>{item.error}</pre>}
              <small>Output</small>
              <pre>{item.actual ?? "(no output)"}</pre>
              <small>Expected</small>
              <pre>{item.expected}</pre>
            </details>
          ) : (
            <p key={item.idx}>
              Private test {item.idx}: {item.status}
            </p>
          ),
        )
      )}
    </section>
  );
}
