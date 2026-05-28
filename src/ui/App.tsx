import { useState, type FormEvent, type ReactElement } from "react";
import {
  createAlphaDevelopmentPlan,
  type AlphaPlannerOutput,
} from "../alpha/planner.ts";
import { reviewBetaResult } from "../alpha/review.ts";
import type {
  AdminIdeaPrompt,
  AlphaReview,
  AlphaReviewDecision,
  BetaResultReport,
  ValidationResultStatus,
  ValidationRun,
} from "../domain/workflow.ts";

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

const exampleBetaResultJson = JSON.stringify(
  {
    filesChanged: ["src/domain/example.ts"],
    behaviorChanged: ["Added small domain helper"],
    validationRun: ["npm run typecheck"],
    validationResult: "passed",
    deviationsFromPrompt: [],
    risks: [],
    nextStepRecommendation: "continue",
  },
  null,
  2,
);

interface BetaReviewState {
  report: BetaResultReport;
  review: AlphaReview;
}

export function App(): ReactElement {
  const [ideaText, setIdeaText] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState<AdminIdeaPrompt | null>(
    null,
  );
  const [plannerOutput, setPlannerOutput] =
    useState<AlphaPlannerOutput | null>(null);
  const [betaResultJson, setBetaResultJson] = useState(exampleBetaResultJson);
  const [betaReviewState, setBetaReviewState] =
    useState<BetaReviewState | null>(null);
  const [betaReviewError, setBetaReviewError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedIdea = ideaText.trim();
    if (!trimmedIdea) {
      setSubmittedIdea(null);
      setPlannerOutput(null);
      setBetaReviewState(null);
      setBetaReviewError("");
      return;
    }

    const submittedAt = new Date().toISOString();
    const ideaPrompt: AdminIdeaPrompt = {
      id: createIdeaId(trimmedIdea),
      submittedAt,
      goal: trimmedIdea,
    };

    setSubmittedIdea(ideaPrompt);
    setBetaReviewState(null);
    setBetaReviewError("");
    setPlannerOutput(
      createAlphaDevelopmentPlan({
        ideaPrompt,
        existingProjectContextSummary:
          "Local browser UI shell using deterministic in-memory planner logic.",
        now: submittedAt,
      }),
    );
  }

  function handleBetaReview(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!plannerOutput) {
      setBetaReviewState(null);
      setBetaReviewError("Generate an Alpha plan before reviewing a BETA result.");
      return;
    }

    const reviewedAt = new Date().toISOString();
    const parseResult = parseBetaResultReport(
      betaResultJson,
      plannerOutput.recommendedFirstBetaTask.id,
      reviewedAt,
    );

    if (!parseResult.ok) {
      setBetaReviewState(null);
      setBetaReviewError(parseResult.error);
      return;
    }

    setBetaReviewError("");
    setBetaReviewState({
      report: parseResult.report,
      review: reviewBetaResult({
        betaTaskPrompt: plannerOutput.recommendedFirstBetaTask,
        betaResultReport: parseResult.report,
        reviewedAt,
      }),
    });
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

      <section className="section-block" aria-labelledby="review-heading">
        <div className="section-heading">
          <p className="eyebrow">Alpha review</p>
          <h2 id="review-heading">Review a BETA result report</h2>
        </div>
        <div className="review-workspace">
          <form className="review-form" onSubmit={handleBetaReview}>
            <label htmlFor="beta-result-json">BETA Result JSON</label>
            <textarea
              id="beta-result-json"
              name="beta-result-json"
              rows={10}
              value={betaResultJson}
              onChange={(event) => setBetaResultJson(event.target.value)}
              placeholder={exampleBetaResultJson}
            />
            <p className="form-note">
              Generate an Alpha plan first. The report is reviewed against the
              current first BETA task.
            </p>
            <button type="submit">Review BETA result</button>
          </form>

          <BetaReviewPreview
            error={betaReviewError}
            reviewState={betaReviewState}
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

function BetaReviewPreview({
  error,
  reviewState,
}: {
  error: string;
  reviewState: BetaReviewState | null;
}): ReactElement {
  if (error) {
    return (
      <div className="review-preview error-preview" role="alert">
        <span className="preview-label">Local JSON error</span>
        <p>{error}</p>
      </div>
    );
  }

  if (!reviewState) {
    return (
      <div className="review-preview empty-preview">
        <p>Paste a BETA result JSON report to preview Alpha review.</p>
      </div>
    );
  }

  const { report, review } = reviewState;
  const haltOrRevisionReasons =
    review.decision === "continue"
      ? ["None"]
      : [...review.reviewFindings, ...review.driftRisk.reasons];

  return (
    <div className="review-preview">
      <div className="preview-group">
        <span className="preview-label">Reported files changed</span>
        <ListPreview
          values={report.filesChanged.length ? report.filesChanged : ["None"]}
        />
      </div>
      <div className="preview-group compact-group">
        <span className="preview-label">Validation result</span>
        <strong>{report.validationResult}</strong>
      </div>
      <div className="preview-group">
        <span className="preview-label">Deviations from prompt</span>
        <ListPreview
          values={
            report.deviationsFromPrompt.length
              ? report.deviationsFromPrompt
              : ["None"]
          }
        />
      </div>
      <div className="preview-columns">
        <div className="preview-group compact-group">
          <span className="preview-label">ALPHA review decision</span>
          <strong>{review.decision}</strong>
        </div>
        <div className="preview-group compact-group">
          <span className="preview-label">Drift risk level</span>
          <strong>{review.driftRisk.level}</strong>
        </div>
      </div>
      <div className="preview-group">
        <span className="preview-label">Halt/revision reason</span>
        <ListPreview values={dedupeList(haltOrRevisionReasons)} />
      </div>
      <div className="preview-group compact-group">
        <span className="preview-label">Final workflow status</span>
        <strong>{review.statusAfterReview}</strong>
      </div>
    </div>
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

function parseBetaResultReport(
  reportJsonText: string,
  taskPromptId: string,
  submittedAt: string,
):
  | { ok: true; report: BetaResultReport }
  | { ok: false; error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(reportJsonText);
  } catch {
    return {
      ok: false,
      error: "Invalid BETA result JSON. Provide one valid JSON object.",
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: "Invalid BETA result JSON. The top-level value must be an object.",
    };
  }

  return {
    ok: true,
    report: {
      id: "ui-beta-result-001",
      taskPromptId,
      submittedAt,
      filesChanged: toStringArray(parsed.filesChanged),
      behaviorChanged: toText(parsed.behaviorChanged),
      validationRun: toValidationRunArray(parsed.validationRun),
      validationResult: toValidationResult(parsed.validationResult),
      deviationsFromPrompt: toStringArray(parsed.deviationsFromPrompt),
      risks: toStringArray(parsed.risks),
      nextStepRecommendation: toReviewDecision(parsed.nextStepRecommendation),
    },
  };
}

function toValidationRunArray(value: unknown): ValidationRun[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    if (typeof item === "string") {
      return {
        command: item,
        result: "passed",
      };
    }

    if (isRecord(item)) {
      return {
        command: toText(item.command),
        result: toValidationResult(item.result),
        outputSummary:
          typeof item.outputSummary === "string"
            ? item.outputSummary
            : undefined,
      };
    }

    return {
      command: String(item),
      result: "not_run",
    };
  });
}

function toValidationResult(value: unknown): ValidationResultStatus {
  return value === "failed" || value === "not_run" || value === "passed"
    ? value
    : "not_run";
}

function toReviewDecision(value: unknown): AlphaReviewDecision {
  if (value === "halt" || value === "halt_for_admin") {
    return "halt_for_admin";
  }

  if (value === "request_revision") {
    return "request_revision";
  }

  return "continue";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function toText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("; ");
  }

  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupeList(values: string[]): string[] {
  return [...new Set(values)];
}
