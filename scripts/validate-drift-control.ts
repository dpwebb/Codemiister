import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { createAlphaDevelopmentPlan } from "../src/alpha/planner.ts";
import { reviewBetaResult } from "../src/alpha/review.ts";
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

const continueReview = reviewBetaResult({
  betaTaskPrompt: betaTask,
  betaResultReport: createResultReport({
    filesChanged: ["src/domain/workflow.ts"],
    behaviorChanged: "Updated the workflow domain contract within scope.",
    validationResult: "passed",
    nextStepRecommendation: "continue",
  }),
  reviewedAt: now,
});

assert.equal(continueReview.decision, "continue");
assert.equal(continueReview.statusAfterReview, "next_task_ready");
assert.equal(continueReview.driftRisk.level, "low");
assert.equal(continueReview.nextTaskReady, true);

const revisionReview = reviewBetaResult({
  betaTaskPrompt: betaTask,
  betaResultReport: createResultReport({
    filesChanged: ["src/domain/workflow.ts"],
    behaviorChanged: "Updated the workflow domain contract within scope.",
    validationResult: "failed",
    deviationsFromPrompt: ["Validation failed and needs a bounded correction."],
    nextStepRecommendation: "request_revision",
  }),
  reviewedAt: now,
});

assert.equal(revisionReview.decision, "request_revision");
assert.equal(revisionReview.statusAfterReview, "revision_required");
assert.equal(revisionReview.driftRisk.level, "medium");
assert.equal(revisionReview.nextTaskReady, false);

const haltReview = reviewBetaResult({
  betaTaskPrompt: betaTask,
  betaResultReport: createResultReport({
    filesChanged: ["package.json", "src/domain/workflow.ts"],
    behaviorChanged:
      "Added database persistence outside the allowed task scope.",
    deviationsFromPrompt: ["Changed package.json outside allowed areas."],
    risks: ["Database persistence is a forbidden change for this task."],
    validationResult: "passed",
    nextStepRecommendation: "continue",
  }),
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
