import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { createAlphaDevelopmentPlan } from "../src/alpha/planner.ts";
import { recommendNextBetaTask } from "../src/alpha/next-task.ts";
import { reviewBetaResult } from "../src/alpha/review.ts";
import { createManualExecutionAdapter } from "../src/execution/adapter.ts";
import { evaluateExecutionReadiness } from "../src/execution/readiness.ts";
import {
  EXECUTION_RESULT_PACKAGE_TYPE,
  EXECUTION_RESULT_PACKAGE_VERSION,
  validateExecutionResultPackage,
  type ExecutionResultPackage,
} from "../src/execution/result-package.ts";
import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";
import type { BetaResultReport } from "../src/domain/workflow.ts";

const now = "2026-05-28T00:00:00.000Z";

const alphaOutput = createAlphaDevelopmentPlan({
  ideaPrompt: {
    id: "test-idea-001",
    submittedAt: now,
    goal: "Create a small planning assistant for bounded software tasks.",
  },
  existingProjectContextSummary:
    "Repository contains doctrine documents and workflow contracts.",
  now,
});

const betaTask = alphaOutput.recommendedFirstBetaTask;

assert.equal(alphaOutput.status, "approved_for_beta");
assert.equal(
  alphaOutput.developmentPlan.proposedApplicationGoal,
  "Create a small planning assistant for bounded software tasks.",
);
assert.equal(betaTask.planId, alphaOutput.developmentPlan.id);
assert.equal(betaTask.taskTitle.length > 0, true);
assert.equal(betaTask.allowedFilesOrAreas.length > 0, true);
assert.equal(betaTask.forbiddenChanges.length > 0, true);
assert.equal(
  betaTask.forbiddenChanges.some((change) =>
    change.toLowerCase().includes("full application"),
  ),
  true,
);
assert.equal(
  betaTask.acceptanceChecks.some((check) =>
    check.toLowerCase().includes("allowed"),
  ),
  true,
);

const continueResultReport = createResultReport({
  filesChanged: ["src/domain/workflow.ts"],
  behaviorChanged: "Updated the workflow domain contract within scope.",
  validationResult: "passed",
  nextStepRecommendation: "continue",
});
const continueReview = reviewBetaResult({
  betaTaskPrompt: betaTask,
  betaResultReport: continueResultReport,
  reviewedAt: now,
});

assert.equal(continueReview.decision, "continue");
assert.equal(continueReview.statusAfterReview, "next_task_ready");
assert.equal(continueReview.driftRisk.level, "low");
assert.equal(continueReview.nextTaskReady, true);

const revisionResultReport = createResultReport({
  filesChanged: ["src/domain/workflow.ts"],
  behaviorChanged: "Updated the workflow domain contract within scope.",
  validationResult: "failed",
  deviationsFromPrompt: ["Validation failed and needs a bounded correction."],
  nextStepRecommendation: "request_revision",
});
const revisionReview = reviewBetaResult({
  betaTaskPrompt: betaTask,
  betaResultReport: revisionResultReport,
  reviewedAt: now,
});

assert.equal(revisionReview.decision, "request_revision");
assert.equal(revisionReview.statusAfterReview, "revision_required");
assert.equal(revisionReview.driftRisk.level, "medium");
assert.equal(revisionReview.nextTaskReady, false);

const haltResultReport = createResultReport({
  filesChanged: ["package.json", "src/domain/workflow.ts"],
  behaviorChanged:
    "Added database persistence outside the allowed task scope.",
  deviationsFromPrompt: ["Changed package.json outside allowed areas."],
  risks: ["Database persistence is a forbidden change for this task."],
  validationResult: "passed",
  nextStepRecommendation: "continue",
});
const haltReview = reviewBetaResult({
  betaTaskPrompt: betaTask,
  betaResultReport: haltResultReport,
  reviewedAt: now,
});

assert.equal(haltReview.decision, "halt_for_admin");
assert.equal(haltReview.statusAfterReview, "halted");
assert.equal(
  haltReview.driftRisk.level === "high" ||
    haltReview.driftRisk.level === "blocked",
  true,
);
assert.equal(haltReview.driftRisk.betaOverreachDetected, true);
assert.equal(haltReview.driftRisk.haltRecommended, true);
assert.equal(haltReview.nextTaskReady, false);

const continueRecommendation = recommendNextBetaTask({
  plan: alphaOutput.developmentPlan,
  previousBetaTask: betaTask,
  betaResultReport: continueResultReport,
  alphaReview: continueReview,
  issuedAt: now,
});

assert.equal(continueRecommendation.kind, "next_task_ready");
assert.ok(continueRecommendation.nextTask);
assert.match(
  continueRecommendation.nextTask.taskTitle,
  /Manual next-step BETA recommendation/,
);
assert.match(continueRecommendation.nextTask.exactGoal, /Do not invent/);

const revisionRecommendation = recommendNextBetaTask({
  plan: alphaOutput.developmentPlan,
  previousBetaTask: betaTask,
  betaResultReport: revisionResultReport,
  alphaReview: revisionReview,
  issuedAt: now,
});

assert.equal(revisionRecommendation.kind, "revision_required");
assert.ok(revisionRecommendation.nextTask);
assert.deepEqual(
  revisionRecommendation.nextTask.allowedFilesOrAreas,
  betaTask.allowedFilesOrAreas,
);
assert.match(
  revisionRecommendation.nextTask.exactGoal,
  /Validation failed and needs a bounded correction/,
);
assert.equal(
  revisionRecommendation.nextTask.forbiddenChanges.some((change) =>
    change.toLowerCase().includes("architecture"),
  ),
  true,
);

const haltRecommendation = recommendNextBetaTask({
  plan: alphaOutput.developmentPlan,
  previousBetaTask: betaTask,
  betaResultReport: haltResultReport,
  alphaReview: haltReview,
  issuedAt: now,
});

assert.equal(haltRecommendation.kind, "halt_for_admin");
assert.equal(haltRecommendation.nextTask, undefined);
assert.match(haltRecommendation.adminMessage, /ADMIN must review/);

const manualExecutionAdapter = createManualExecutionAdapter();
const manualExecutionResult = await manualExecutionAdapter.execute({
  id: "manual-execution-request-001",
  requestedAt: now,
  mode: "manual",
  taskPrompt: betaTask,
  allowedFilesOrAreas: betaTask.allowedFilesOrAreas,
  forbiddenChanges: betaTask.forbiddenChanges,
  validationCommandSuggestions: betaTask.validationCommandSuggestions,
  stopConditions: betaTask.stopConditions,
  timeoutMs: 0,
});

assert.equal(manualExecutionAdapter.name, "manual");
assert.deepEqual(manualExecutionAdapter.supportedModes, ["manual", "dry_run"]);
assert.equal(manualExecutionResult.executed, false);
assert.equal(manualExecutionResult.status, "manual_action_required");
assert.match(manualExecutionResult.message, /did not execute anything/);
assert.equal(manualExecutionResult.betaResultReport.taskPromptId, betaTask.id);
assert.deepEqual(manualExecutionResult.betaResultReport.filesChanged, []);
assert.equal(manualExecutionResult.betaResultReport.validationResult, "not_run");
assert.equal(
  manualExecutionResult.betaResultReport.nextStepRecommendation,
  "halt_for_admin",
);
assert.equal(
  manualExecutionResult.manualInstructions.some((instruction) =>
    instruction.toLowerCase().includes("copy/paste"),
  ),
  true,
);

const safeReadiness = evaluateExecutionReadiness(betaTask);

assert.equal(safeReadiness.ready, true);
assert.deepEqual(safeReadiness.blockers, []);
assert.equal(safeReadiness.normalizedAllowedAreas.length > 0, true);
assert.equal(safeReadiness.normalizedForbiddenChanges.length > 0, true);

const broadReadiness = evaluateExecutionReadiness({
  ...betaTask,
  id: "broad-beta-task",
  exactGoal: "Build the whole app and implement everything.",
  allowedFilesOrAreas: ["."],
});

assert.equal(broadReadiness.ready, false);
assert.equal(
  broadReadiness.blockers.some((blocker) =>
    blocker.includes("overly broad"),
  ),
  true,
);
assert.equal(
  broadReadiness.warnings.some((warning) =>
    warning.includes("repository-level scope"),
  ),
  true,
);

const underspecifiedReadiness = evaluateExecutionReadiness({
  ...betaTask,
  id: "underspecified-beta-task",
  exactGoal: " ",
  allowedFilesOrAreas: [],
  forbiddenChanges: [],
  acceptanceChecks: [],
});

assert.equal(underspecifiedReadiness.ready, false);
assert.equal(
  underspecifiedReadiness.blockers.some((blocker) =>
    blocker.includes("exact goal"),
  ),
  true,
);
assert.equal(
  underspecifiedReadiness.blockers.some((blocker) =>
    blocker.includes("allowed files"),
  ),
  true,
);
assert.equal(
  underspecifiedReadiness.blockers.some((blocker) =>
    blocker.includes("forbidden changes"),
  ),
  true,
);

const missingAcceptanceChecksReadiness = evaluateExecutionReadiness({
  ...betaTask,
  id: "missing-acceptance-checks-beta-task",
  acceptanceChecks: [],
});

assert.equal(missingAcceptanceChecksReadiness.ready, false);
assert.equal(
  missingAcceptanceChecksReadiness.blockers.some((blocker) =>
    blocker.includes("acceptance checks"),
  ),
  true,
);

const missingValidationReadiness = evaluateExecutionReadiness({
  ...betaTask,
  id: "missing-validation-beta-task",
  validationCommandSuggestions: [],
});

assert.equal(missingValidationReadiness.ready, true);
assert.equal(
  missingValidationReadiness.warnings.some((warning) =>
    warning.includes("validation command suggestions"),
  ),
  true,
);

const validExecutionResultPackage: ExecutionResultPackage = {
  packageType: EXECUTION_RESULT_PACKAGE_TYPE,
  packageVersion: EXECUTION_RESULT_PACKAGE_VERSION,
  completedAt: now,
  requestPackageType: "codemiister.executionRequest",
  requestPackageVersion: "1",
  taskTitle: betaTask.taskTitle,
  betaResultReport: continueResultReport,
  executionStatus: "completed",
  noExternalValidationClaim:
    "Validation results are reported by BETA and are not independently verified by this package.",
};
const validExecutionResultPackageValidation =
  validateExecutionResultPackage(validExecutionResultPackage);

assert.equal(validExecutionResultPackageValidation.valid, true);
assert.deepEqual(validExecutionResultPackageValidation.errors, []);
assert.equal(
  validExecutionResultPackageValidation.summary.packageType,
  EXECUTION_RESULT_PACKAGE_TYPE,
);
assert.equal(
  validExecutionResultPackageValidation.summary.validationResult,
  "passed",
);
assert.equal(
  validExecutionResultPackageValidation.summary.filesChangedCount,
  1,
);

const missingBetaResultFieldsValidation = validateExecutionResultPackage({
  ...validExecutionResultPackage,
  betaResultReport: {
    id: "incomplete-beta-result",
  },
});

assert.equal(missingBetaResultFieldsValidation.valid, false);
assert.equal(
  missingBetaResultFieldsValidation.errors.some((error) =>
    error.includes("filesChanged"),
  ),
  true,
);
assert.equal(
  missingBetaResultFieldsValidation.errors.some((error) =>
    error.includes("behaviorChanged"),
  ),
  true,
);
assert.equal(
  missingBetaResultFieldsValidation.errors.some((error) =>
    error.includes("validationRun"),
  ),
  true,
);
assert.equal(
  missingBetaResultFieldsValidation.errors.some((error) =>
    error.includes("nextStepRecommendation"),
  ),
  true,
);

const runnerContinue = runInMemoryAlphaBetaWorkflow({
  ideaPrompt: {
    id: "runner-idea-001",
    submittedAt: now,
    goal: "Coordinate one bounded Alpha/Beta workflow loop.",
  },
  existingProjectContextSummary:
    "Repository contains deterministic workflow contracts.",
  now,
});

assert.ok(runnerContinue.developmentPlan);
assert.ok(runnerContinue.betaTask);
assert.ok(runnerContinue.betaResult);
assert.equal(runnerContinue.developmentPlan.id.length > 0, true);
assert.equal(runnerContinue.betaTask.id.length > 0, true);
assert.equal(runnerContinue.betaResult.id.length > 0, true);
assert.equal(runnerContinue.alphaReview?.decision, "continue");
assert.equal(runnerContinue.status, "next_task_ready");

const runnerHalt = runInMemoryAlphaBetaWorkflow({
  ideaPrompt: {
    id: "runner-idea-002",
    submittedAt: now,
    goal: "Coordinate one bounded Alpha/Beta workflow loop.",
  },
  betaResultReport: createResultReport({
    taskPromptId: "beta-task-runner-idea-002-001",
    filesChanged: ["package.json"],
    behaviorChanged:
      "Added database persistence outside the allowed task scope.",
    deviationsFromPrompt: ["Changed package.json outside allowed areas."],
    risks: ["Database persistence is a forbidden change for this task."],
    validationResult: "passed",
    nextStepRecommendation: "continue",
  }),
  now,
});

assert.equal(runnerHalt.alphaReview?.decision, "halt_for_admin");
assert.equal(runnerHalt.status, "halted");
assert.equal(runnerHalt.alphaReview?.driftRisk.level, "high");
assert.equal(runnerHalt.alphaReview?.driftRisk.betaOverreachDetected, true);

assertTranscriptPathRejected(path.resolve("transcripts", "absolute.md"));
assertTranscriptPathRejected("../outside.md");

console.log("drift-control validation passed");

function createResultReport(
  overrides: Partial<BetaResultReport>,
): BetaResultReport {
  return {
    id: "test-beta-result-001",
    taskPromptId: betaTask.id,
    submittedAt: now,
    filesChanged: [],
    behaviorChanged: "No behavior changed.",
    validationRun: [
      {
        command: "npm run test:drift-control",
        result: overrides.validationResult ?? "passed",
        outputSummary: "Deterministic drift-control validation.",
      },
    ],
    validationResult: "passed",
    deviationsFromPrompt: [],
    risks: [],
    nextStepRecommendation: "continue",
    ...overrides,
  };
}

function assertTranscriptPathRejected(outputPath: string): void {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/export-workflow-transcript.ts",
      "Create a small planning assistant for bounded software tasks.",
      "--out",
      outputPath,
    ],
    {
      encoding: "utf8",
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}${result.stderr}`,
    /local relative path and must not contain/,
  );
}
