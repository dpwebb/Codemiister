import type { ReactElement } from "react";

const roles = [
  {
    name: "ADMIN",
    summary: "Supplies the result-oriented idea and approves major planning gates.",
  },
  {
    name: "ALPHA",
    summary: "Plans the product direction, controls scope, and reviews BETA evidence.",
  },
  {
    name: "BETA",
    summary: "Implements one small bounded task at a time and reports the result.",
  },
];

const workflowStages = [
  "Admin Idea",
  "Alpha Plan",
  "Beta Task",
  "Beta Result",
  "Alpha Review",
  "Transcript",
];

const deferredCapabilities = [
  "autonomous Codex execution",
  "AI provider integration",
  "persistence",
  "auth",
  "deployment",
];

export function App(): ReactElement {
  return (
    <main className="app-shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">Manual Alpha/Beta workflow</p>
          <h1>Codemiister</h1>
          <p className="purpose">
            A local, drift-controlled shell for planning and reviewing
            application work before any autonomous execution exists.
          </p>
        </div>
        <div className="status-panel" aria-label="Current system status">
          <span className="status-label">Current mode</span>
          <strong>Manual only</strong>
          <span>No AI calls, persistence, auth, or deployment automation.</span>
        </div>
      </header>

      <section className="section-block" aria-labelledby="roles-heading">
        <div className="section-heading">
          <p className="eyebrow">Operating roles</p>
          <h2 id="roles-heading">Guarded responsibilities</h2>
        </div>
        <div className="role-grid">
          {roles.map((role) => (
            <article className="role-card" key={role.name}>
              <h3>{role.name}</h3>
              <p>{role.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="workflow-heading">
        <div className="section-heading">
          <p className="eyebrow">Manual workflow</p>
          <h2 id="workflow-heading">Current review loop</h2>
        </div>
        <ol className="workflow-list">
          {workflowStages.map((stage, index) => (
            <li key={stage}>
              <span className="stage-number">{index + 1}</span>
              <span>{stage}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section-block" aria-labelledby="deferred-heading">
        <div className="section-heading">
          <p className="eyebrow">Deferred capabilities</p>
          <h2 id="deferred-heading">Not implemented in this shell</h2>
        </div>
        <ul className="deferred-list">
          {deferredCapabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
