import { useState, type FormEvent, type ReactElement } from "react";
import {
  createAlphaDevelopmentPlan,
  type AlphaPlannerOutput,
} from "../alpha/planner.ts";
import type { AdminIdeaPrompt } from "../domain/workflow.ts";

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
  const [ideaText, setIdeaText] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState<AdminIdeaPrompt | null>(
    null,
  );
  const [plannerOutput, setPlannerOutput] =
    useState<AlphaPlannerOutput | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedIdea = ideaText.trim();
    if (!trimmedIdea) {
      setSubmittedIdea(null);
      setPlannerOutput(null);
      return;
    }

    const submittedAt = new Date().toISOString();
    const ideaPrompt: AdminIdeaPrompt = {
      id: createIdeaId(trimmedIdea),
      submittedAt,
      goal: trimmedIdea,
    };

    setSubmittedIdea(ideaPrompt);
    setPlannerOutput(
      createAlphaDevelopmentPlan({
        ideaPrompt,
        existingProjectContextSummary:
          "Local browser UI shell using deterministic in-memory planner logic.",
        now: submittedAt,
      }),
    );
  }

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

      <section className="section-block" aria-labelledby="idea-heading">
        <div className="section-heading">
          <p className="eyebrow">Admin intake</p>
          <h2 id="idea-heading">Generate the first Alpha plan</h2>
        </div>
        <div className="idea-workspace">
          <form className="idea-form" onSubmit={handleSubmit}>
            <label htmlFor="admin-idea">Admin Idea Prompt</label>
            <textarea
              id="admin-idea"
              name="admin-idea"
              rows={5}
              placeholder="Create a simple project checklist app"
              value={ideaText}
              onChange={(event) => setIdeaText(event.target.value)}
            />
            <button type="submit">Generate Alpha plan</button>
          </form>

          <AlphaPlanPreview
            plannerOutput={plannerOutput}
            submittedIdea={submittedIdea}
          />
        </div>
      </section>

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

function AlphaPlanPreview({
  plannerOutput,
  submittedIdea,
}: {
  plannerOutput: AlphaPlannerOutput | null;
  submittedIdea: AdminIdeaPrompt | null;
}): ReactElement {
  if (!plannerOutput || !submittedIdea) {
    return (
      <div className="plan-preview empty-preview">
        <p>Enter an Admin idea to preview the deterministic Alpha plan.</p>
      </div>
    );
  }

  const { developmentPlan, recommendedFirstBetaTask, status } = plannerOutput;

  return (
    <div className="plan-preview">
      <div className="preview-group">
        <span className="preview-label">Admin idea</span>
        <p>{submittedIdea.goal}</p>
      </div>
      <div className="preview-group">
        <span className="preview-label">Alpha proposed application goal</span>
        <p>{developmentPlan.proposedApplicationGoal}</p>
      </div>
      <div className="preview-group compact-group">
        <span className="preview-label">Alpha status</span>
        <strong>{status}</strong>
      </div>
      <div className="preview-group">
        <span className="preview-label">Material Admin questions</span>
        <ListPreview
          values={
            developmentPlan.questionsForAdmin?.map(
              (question) => question.question,
            ) ?? ["None"]
          }
        />
      </div>
      <div className="preview-group">
        <span className="preview-label">Recommended first BETA task</span>
        <p>{recommendedFirstBetaTask.taskTitle}</p>
      </div>
      <div className="preview-group">
        <span className="preview-label">Exact goal</span>
        <p>{recommendedFirstBetaTask.exactGoal}</p>
      </div>
      <div className="preview-columns">
        <div className="preview-group">
          <span className="preview-label">Allowed files/areas</span>
          <ListPreview values={recommendedFirstBetaTask.allowedFilesOrAreas} />
        </div>
        <div className="preview-group">
          <span className="preview-label">Forbidden changes</span>
          <ListPreview values={recommendedFirstBetaTask.forbiddenChanges} />
        </div>
      </div>
      <div className="preview-group">
        <span className="preview-label">Acceptance checks</span>
        <ListPreview values={recommendedFirstBetaTask.acceptanceChecks} />
      </div>
    </div>
  );
}

function ListPreview({ values }: { values: string[] }): ReactElement {
  return (
    <ul className="preview-list">
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  );
}

function createIdeaId(idea: string): string {
  const slug = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `ui-admin-idea-${slug || "untitled"}`;
}
