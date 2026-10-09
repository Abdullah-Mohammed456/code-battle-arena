import { useMemo, useState } from "react";
import "./preview.css";

const problems = [
  { id: "1003D", title: "Coins and Queries", rating: 1600, tags: ["greedy"], judgeable: true },
  { id: "1016C", title: "Vasya And The Mushrooms", rating: 1800, tags: ["dp", "implementation"], judgeable: true },
  { id: "1036B", title: "Diagonal Walking v.2", rating: 1600, tags: ["math"], judgeable: true },
  { id: "1037E", title: "Trips", rating: 2200, tags: ["graphs"], judgeable: true },
  { id: "4A", title: "Watermelon", rating: 800, tags: ["math"], judgeable: false },
  { id: "71A", title: "Way Too Long Words", rating: 800, tags: ["strings"], judgeable: false },
];

type Filter = "all" | "judgeable" | "catalog";

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M4 12 12 4M5 4h7v7" /></svg>;
}

export function ProblemPreview() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const visible = useMemo(() => problems.filter((problem) => {
    const matchesFilter = filter === "all" || problem.judgeable === (filter === "judgeable");
    return matchesFilter && `${problem.id} ${problem.title} ${problem.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase());
  }), [filter, search]);

  return (
    <main className="preview">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Code Battle Arena home"><span>CB</span> / ARENA</a>
        <nav aria-label="Main navigation">
          <a className="active" href="#problems">Problems</a>
          <a href="#battles">Battles</a>
          <a href="#rankings">Rankings</a>
        </nav>
        <button className="profile" aria-label="Profile">B</button>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow"><span className="live-dot" /> DESIGN PREVIEW <span className="eyebrow-index">01 / PROBLEMS</span></p>
          <h1>PROBLEM<br /><span>INDEX</span></h1>
          <p className="intro-copy">Browse by rating, tag, or source.</p>
        </div>
        <div className="stats" aria-label="Problem totals">
          <div><strong>200</strong><span>CATALOG</span></div>
          <div><strong>77</strong><span>JUDGEABLE</span></div>
            <p>CODEFORCES<br />+ CODECONTESTS</p>
        </div>
      </section>

      <section className="index-layout" id="problems" aria-label="Problem index">
        <div className="problem-column">
          <div className="list-heading">
            <div><span className="section-index">01—</span><h2>Problem set</h2></div>
            <span className="result-count">{String(visible.length).padStart(2, "0")} PROBLEMS</span>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Search by name, tag, or ID" value={search} onChange={(event) => setSearch(event.target.value)} />
            <kbd>/</kbd>
          </label>
          <div className="problem-list" role="list">
            {visible.map((problem, index) => (
              <a className="problem-row" href={`#${problem.id}`} role="listitem" key={problem.id}>
                <span className="row-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="problem-name"><strong>{problem.title}</strong><small>{problem.id} <i>/</i> Codeforces</small></span>
                <span className="tag-list">{problem.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</span>
                <span className="problem-rating">{problem.rating}<small>RATING</small></span>
                <span className={problem.judgeable ? "status status-ready" : "status"}>{problem.judgeable ? "JUDGEABLE" : "CATALOG"}</span>
                <span className="row-arrow"><ArrowIcon /></span>
              </a>
            ))}
            {visible.length === 0 && <p className="empty-state">No problems match this search.</p>}
          </div>
          <p className="list-footnote"><span>SHOWING A SMALL PREVIEW</span><span>01 — {String(visible.length).padStart(2, "0")}</span></p>
        </div>

        <aside className="filter-panel" aria-label="Problem filters">
          <div className="panel-heading"><span>REFINE</span><span>+</span></div>
          <fieldset>
            <legend>Problem type</legend>
            {(["all", "judgeable", "catalog"] as const).map((value) => (
              <button key={value} className={`filter-option ${filter === value ? "selected" : ""}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                <span>{value === "all" ? "All problems" : value === "judgeable" ? "Judgeable" : "Catalog only"}</span>
                <span className="filter-count">{value === "all" ? "06" : value === "judgeable" ? "04" : "02"}</span>
              </button>
            ))}
          </fieldset>
          <div className="panel-note">
            <span className="panel-note-mark">02</span>
            <p>Judgeable problems include private test cases. Catalog entries link back to the original source.</p>
          </div>
          <button className="pink-button" onClick={() => { setFilter("all"); setSearch(""); }}>RESET FILTERS <ArrowIcon /></button>
        </aside>
      </section>

      <footer className="footer"><span>CODE BATTLE ARENA</span><span>PROBLEM INDEX <i>·</i> PREVIEW</span></footer>
    </main>
  );
}
