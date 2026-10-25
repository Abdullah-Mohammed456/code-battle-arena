import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { problemListSchema } from "@repo/shared";
import { request } from "./api";
import { ProblemRow } from "./ProblemList";
import { ErrorMessage } from "./ErrorMessage";
import { ArrowIcon } from "./ArrowIcon";
import "./landing.css";

export function Landing({ signedIn = false }: { signedIn?: boolean }) {
  const problems = useQuery({
    queryKey: ["problems", "starter"],
    queryFn: ({ signal }) =>
      request(
        "/api/problems?judgeable=true&maxRating=1200&limit=3",
        problemListSchema,
        { signal },
      ),
  });
  return (
    <div className="landing">
      <section
        className="landing-hero"
        aria-labelledby="landing-title"
        data-reveal
      >
        <p className="eyebrow">
          CODE BATTLE ARENA <span className="eyebrow-index">01 / PRACTICE</span>
        </p>
        <h1 id="landing-title">
          <span>PICK ONE</span>
          <br />
          SOLVE IT
        </h1>
        <div className="landing-intro">
          <p>
            Programming problems and a C++17 editor
            <br />
            Your next solution starts here
          </p>
          <div className="landing-actions">
            <Link className="pink-button" to="/problems?judgeable=true">
              EXPLORE PROBLEMS <ArrowIcon />
            </Link>
            <Link
              className="source-link"
              to={signedIn ? "/profile" : "/sign-in"}
            >
              {signedIn ? "YOUR PROGRESS" : "SIGN IN TO SAVE YOUR PROGRESS"}
            </Link>
          </div>
        </div>
        <div className="landing-caption">
          <span>C++17 / SAMPLES / PRIVATE TESTS</span>
          <span>START BELOW</span>
        </div>
      </section>

      <section
        className="landing-problems"
        aria-labelledby="starter-title"
        data-reveal
      >
        <div className="list-heading">
          <div>
            <span className="section-index">02—</span>
            <h2 id="starter-title">A place to start</h2>
          </div>
          <Link
            className="source-link"
            to="/problems?judgeable=true&maxRating=1200"
          >
            BROWSE THIS SET <ArrowIcon />
          </Link>
        </div>
        <p className="landing-description">
          Judgeable problems rated up to 1200. Open one to read the statement
          and try the samples
        </p>
        {problems.isPending ? (
          <p className="message">Loading problems…</p>
        ) : problems.isError ? (
          <>
            <ErrorMessage error={problems.error} />
            <button
              className="retry-button"
              onClick={() => void problems.refetch()}
            >
              Try again
            </button>
          </>
        ) : problems.data.items.length ? (
          <div className="problem-list">
            {problems.data.items.map((problem, index) => (
              <ProblemRow key={problem.id} problem={problem} index={index} />
            ))}
          </div>
        ) : (
          <p className="message">
            No problems in this set yet{" "}
            <Link className="source-link" to="/problems">
              Browse the full catalog
            </Link>
          </p>
        )}
      </section>

      <section
        className="landing-process"
        aria-labelledby="process-title"
        data-reveal
      >
        <div className="list-heading">
          <div>
            <span className="section-index">03—</span>
            <h2 id="process-title">From statement to solution</h2>
          </div>
        </div>
        <ol>
          <li>
            <span>01 / READ</span>
            <h3>Choose your problem</h3>
            <p>
              Filter by rating, tag, or source. Each problem links to its
              original source
            </p>
          </li>
          <li>
            <span>02 / RUN</span>
            <h3>Test your approach</h3>
            <p>
              Write C++17 in the browser. Run the samples or check your own
              input
            </p>
          </li>
          <li>
            <span>03 / SUBMIT</span>
            <h3>Keep your progress</h3>
            <p>
              Submit against the full test set. Your verdicts, code, and solved
              problems stay on your profile
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
