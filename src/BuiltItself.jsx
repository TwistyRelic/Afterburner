import { useEffect, useState } from "react";
import { REPO, assignMarkers, fetchCommits } from "./commits.js";
import { run } from "./run.js";

export default function BuiltItself() {
  const [markers, setMarkers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetchCommits()
      .then((commits) => {
        if (live) setMarkers(assignMarkers(commits, run.markerKms));
      })
      .catch((issue) => {
        if (live) setError(issue.message);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="built">
      <h2 className="built-head">
        This page built itself. Every commit was dictated while running{" "}
        {run.distance}
      </h2>
      <p className="built-sub">
        Live from the {REPO} commit log, each commit labelled with the kilometre
        marker spoken most recently before it.
      </p>

      {error ? (
        <p className="built-error">Commit log unavailable ({error}).</p>
      ) : (
        <ol className="built-markers">
          {markers.map((marker) => (
            <li className="built-marker" key={marker.km}>
              <span className="built-km">Dictated at km {marker.km}</span>
              <ul className="built-commits">
                {marker.commits.map((commit) => (
                  <li key={commit.sha}>
                    <a href={commit.url} rel="noreferrer" target="_blank">
                      <code>{commit.sha}</code> {commit.subject}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
