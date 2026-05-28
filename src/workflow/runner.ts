import { createAlphaDevelopmentPlan } from "../alpha/planner.ts";
import { reviewBetaResult } from "../alpha/review.ts";
import type {
  AdminIdeaPrompt,
  AlphaBetaWorkflowLoop,
  BetaResultReport,
  BetaTaskPrompt,
} from "../domain/workflow.ts";

export interface InMemoryAlphaBetaWorkflowInput {
  ideaPrompt: AdminIdeaPrompt;
  projectConstraints?: string[];
  existingProjectContextSummary?: string;
  betaResultReport?: BetaResultReport;
  now?: string;
}

export function runInMemoryAlphaBetaWorkflow(
  input: InMemoryAlphaBetaWorkflowInput,
): AlphaBetaWorkflowLoop {
  const now = input.now ?? new Date().toISOString();
  const alphaPlan = createAlphaDevelopmentPlan({
    ideaPrompt: input.ideaPrompt,
    projectConstraints: input.projectConstraints,
    existingProjectContextSummary: input.existingProjectContextSummary,
    now,
  });
  const betaTask = alphaPlan.recommendedFirstBetaTask;
  const betaResult =
    input.betaResultReport ?? createMockInScopeBetaResult(betaTask, now);
  const alphaReview = reviewBetaResult({
    betaTaskPrompt: betaTask,
    betaResultReport: betaResult,
    reviewedAt: now,
  });

  return {
    id: `workflow-${input.ideaPrompt.id}`,
    status: alphaReview.statusAfterReview,
    ideaPrompt: input.ideaPrompt,
    developmentPlan: alphaPlan.developmentPlan,
    betaTask,
    betaResult,
    alphaReview,
    haltReason:
      alphaReview.decision === "halt_for_admin"
        ? alphaReview.driftRisk.reasons.join(" ")
        : undefined,
  };
}

function createMockInScopeBetaResult(
  betaTask: BetaTaskPrompt,
  submittedAt: string,
): BetaResultReport {
  return {
    id: `mock-beta-result-${betaTask.id}`,
    taskPromptId: betaTask.id,
    submittedAt,
    filesChanged: ["src/domain/workflow.ts"],
    behaviorChanged:
      "Mock BETA result for the in-memory runner: represents one bounded in-scope change.",
    validationRun: [
      {
        command: "mock-validation",
        result: "passed",
        outputSummary:
          "No real implementation was run; this is a deterministic in-memory runner result.",
      },
    ],
    validationResult: "passed",
    deviationsFromPrompt: [],
    risks: [],
    nextStepRecommendation: "continue",
  };
}

