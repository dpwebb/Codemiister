import type {
  AlphaBetaWorkflowLoop,
  AlphaReviewDecision,
  BetaResultReport,
  ValidationResultStatus,
  ValidationRun,
} from "../src/domain/workflow.ts";
import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";

const args = process.argv.slice(2);
const ideaText = args[0]?.trim();
const reportJson = args.slice(1).join(" ").trim();
const now = "2026-05-28T00:00:00.000Z";

if (!ideaText) {
  printUsage();
  process.exit(1);
}

const baseInput = {
  ideaPrompt: {
    id: createIdeaId(ideaText),
    submittedAt: now,
    goal: ideaText,
  },
  existingProjectContextSummary:
    "Local workflow transcript export using the deterministic in-memory workflow runner.",
  now,
};
const baseWorkflow = runInMemoryAlphaBetaWorkflow(baseInput);

if (!baseWorkflow.betaTask) {
  console.error("Workflow did not return a BETA task prompt.");
  process.exit(1);
}

const suppliedResult = reportJson
  ? parseBetaResultReport(reportJson, baseWorkflow.betaTask.id)
  : undefined;
const workflow = suppliedResult
  ? runInMemoryAlphaBetaWorkflow({
      ...baseInput,
      betaResultReport: suppliedResult,
    })
  : baseWorkflow;

printTranscript(workflow, !suppliedResult);

function printTranscript(
  workflowLoop: AlphaBetaWorkflowLoop,
  betaResultIsMock: boolean,
): void {
  const plan = workflowLoop.developmentPlan;
  const betaTask = workflowLoop.betaTask;
  const betaResult = workflowLoop.betaResult;
  const alphaReview = workflowLoop.alphaReview;

  if (!plan || !betaTask || !betaResult || !alphaReview) {
    console.error("Workflow did not return a complete Alpha/BETA transcript.");
    process.exit(1);
  }

  console.log("# Automated Coder Workflow Transcript");
  console.log("");
  printValue("Generated at", now);
  printValue("Admin idea", workflowLoop.ideaPrompt.goal);
  console.log("");

  printSection("ALPHA Development Plan");
  printValue("Proposed application goal", plan.proposedApplicationGoal);
  printValue("Summary", plan.summary);
  printList("Material Admin questions", plan.questionsForAdmin?.map((item) => item.question) ?? []);
  console.log("");

  printSection("First BETA Task Prompt");
  printValue("Task title", betaTask.taskTitle);
  printValue("Exact goal", betaTask.exactGoal);
  printList("Allowed files/areas", betaTask.allowedFilesOrAreas);
  printList("Forbidden changes", betaTask.forbiddenChanges);
  printList("Implementation steps", betaTask.implementationSteps);
  printList("Acceptance checks", betaTask.acceptanceChecks);
  printList("Validation commands", betaTask.validationCommandSuggestions);
  console.log("");

  printSection(
    betaResultIsMock
      ? "BETA Result Report (MOCK / IN-MEMORY ONLY)"
      : "BETA Result Report",
  );
  printList("Files changed", betaResult.filesChanged);
  printValue("Behavior changed", betaResult.behaviorChanged);
  printList(
    "Validation run",
    betaResult.validationRun.map((item) => `${item.command}: ${item.result}`),
  );
  printValue("Validation result", betaResult.validationResult);
  printList("Deviations from prompt", betaResult.deviationsFromPrompt);
  printList("Risks", betaResult.risks);
  printValue("Next-step recommendation", betaResult.nextStepRecommendation);
  console.log("");

  printSection("ALPHA Review");
  printValue("Decision", alphaReview.decision);
  printValue("Drift risk", alphaReview.driftRisk.level);
  printList("Drift reasons", alphaReview.driftRisk.reasons);
  printList("Review findings", alphaReview.reviewFindings);
  printValue("Final workflow status", workflowLoop.status);
  printValue("Next recommended action", getNextAction(alphaReview.decision));
}

function parseBetaResultReport(
  reportJsonText: string,
  taskPromptId: string,
): BetaResultReport {
  let parsed: unknown;

  try {
    parsed = JSON.parse(reportJsonText);
  } catch {
    console.error("Invalid BETA result JSON. Provide one valid JSON object.");
    process.exit(1);
  }

  if (!isRecord(parsed)) {
    console.error("Invalid BETA result JSON. The top-level value must be an object.");
    process.exit(1);
  }

  return {
    id: "transcript-beta-result-001",
    taskPromptId,
    submittedAt: now,
    filesChanged: toStringArray(parsed.filesChanged),
    behaviorChanged: toText(parsed.behaviorChanged),
    validationRun: toValidationRunArray(parsed.validationRun),
    validationResult: toValidationResult(parsed.validationResult),
    deviationsFromPrompt: toStringArray(parsed.deviationsFromPrompt),
    risks: toStringArray(parsed.risks),
    nextStepRecommendation: toReviewDecision(parsed.nextStepRecommendation),
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
          typeof item.outputSummary === "string" ? item.outputSummary : undefined,
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

function getNextAction(decision: AlphaReviewDecision): string {
  if (decision === "continue") {
    return "Prepare the next small BETA task after ALPHA review.";
  }

  if (decision === "request_revision") {
    return "Request a bounded BETA revision before continuing.";
  }

  return "Halt and ask ADMIN for a scope or approval decision.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printUsage(): void {
  console.error(
    "Usage: npm run workflow:transcript -- \"Create a simple project checklist app\" '{\"filesChanged\":[\"src/domain/example.ts\"],\"behaviorChanged\":[\"Added small domain helper\"],\"validationRun\":[\"npm run typecheck\"],\"validationResult\":\"passed\",\"deviationsFromPrompt\":[],\"risks\":[],\"nextStepRecommendation\":\"continue\"}'",
  );
}

function printSection(title: string): void {
  console.log(`## ${title}`);
}

function printValue(label: string, value: string): void {
  console.log(`${label}: ${value}`);
}

function printList(label: string, values: string[]): void {
  console.log(`${label}:`);
  if (values.length === 0) {
    console.log("- None");
    return;
  }

  for (const value of values) {
    console.log(`- ${value}`);
  }
}

function createIdeaId(ideaTextValue: string): string {
  const slug = ideaTextValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `admin-idea-${slug || "untitled"}`;
}

