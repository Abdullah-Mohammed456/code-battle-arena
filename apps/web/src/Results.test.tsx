import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Results } from "./Results";

test("compilation diagnostics render as text and private tests show verdicts only", () => {
  const html = renderToStaticMarkup(
    <Results
      value={{
        kind: "samples",
        status: "CE",
        passed: 0,
        total: 2,
        timeMs: 0,
        results: [
          {
            idx: 1,
            status: "CE",
            sample: true,
            error: "expected <identifier>",
          },
          { idx: 2, status: "CE", sample: false },
        ],
      }}
    />,
  );
  expect(html).toContain("expected &lt;identifier&gt;");
  expect(html).toContain("Private test 2: CE");
  expect(html).not.toContain("<identifier>");
});

test("custom runs show errors and distinguish empty output", () => {
  const html = renderToStaticMarkup(
    <Results
      value={{
        kind: "custom",
        status: "RE",
        timeMs: 3,
        error: "Runtime Error",
        output: "",
      }}
    />,
  );
  expect(html).toContain("Runtime Error");
  expect(html).toContain("(no output)");
});
