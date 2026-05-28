import { reviewBetaResult } from "../src/alpha/review.ts";
import type {
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

if (!ideaText || !reportJson) {
  printUsage();
  process.exit(1);
}

const workflow = runInMemoryAlphaBetaWorkflow({
  ideaPrompt: {
    id: createIdeaId(ideaText),
    submittedAt: now,
    goal: ideaText,
  },
  existingProjectContextSummary:
    "Local BETA result review using the deterministic in-memory workflow runner.",
  now,
});

if (!workflow.betaTask) {
  console.error("Workflow did not return a BETA task prompt.");
  process.exit(1);
}

const betaResultReport = parseBetaResultReport(reportJson, workflow.betaTask.id);
const alphaReview = reviewBetaResult({
  betaTaskPrompt: workflow.betaTask,
  betaResultReport,
  reviewedAt: now,
});

console.log("Automated Coder BETA Result Review");
console.log("");
printValue("Admin idea", ideaText);
printValue("BETA task title", workflow.betaTask.taskTitle);
printList("Reported files changed", betaResultReport.filesChanged);
printValue("Reported validation result", betaResultReport.validationResult);
printList("Reported deviations", betaResultReport.deviationsFromPrompt);
printValue("ALPHA review decision", alphaReview.decision);
printValue("Drift risk level", alphaReview.driftRisk.level);
printList("Review findings", alphaReview.reviewFindings);
printList("Drift reasons", alphaReview.driftRisk.reasons);
printValue("Final status", alphaReview.statusAfterReview);

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
    id: "manual-beta-result-001",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printUsage(): void {
  console.error(
    "Usage: npm run beta:review -- \"Create a simple project checklist app\" '{\"filesChanged\":[\"src/domain/example.ts\"],\"behaviorChanged\":[\"Added small domain helper\"],\"validationRun\":[\"npm run typecheck\"],\"validationResult\":\"passed\",\"deviationsFromPrompt\":[],\"risks\":[],\"nextStepRecommendation\":\"continue\"}'",
  );
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
