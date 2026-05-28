import type {
  AlphaDevelopmentPlan,
  BetaTaskPrompt,
} from "../domain/workflow.ts";

export interface BetaTaskPromptBuilderInput {
  plan: AlphaDevelopmentPlan;
  taskId?: string;
  issuedAt?: string;
  taskTitle?: string;
  exactGoal?: string;
  allowedFilesOrAreas?: string[];
}

export function createBetaTaskPromptFromAlphaPlan(
  input: BetaTaskPromptBuilderInput,
): BetaTaskPrompt {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const taskId = input.taskId ?? `${input.plan.id}-beta-task-001`;

  return {
    id: taskId,
    planId: input.plan.id,
    issuedAt,
    taskTitle: input.taskTitle ?? "First bounded Beta implementation task",
    exactGoal:
      input.exactGoal ??
      "Add or update the smallest artifact needed for the next approved stage.",
    allowedFilesOrAreas: input.allowedFilesOrAreas ?? [
      "docs/",
      "src/domain/",
      "src/alpha/",
      "src/beta/",
    ],
    forbiddenChanges: [
      "Do not build the full application.",
      "Do not add persistence or database wiring.",
      "Do not add authentication or authorization.",
      "Do not add external AI calls, provider SDKs, or generated code execution.",
      "Do not add queues, workers, billing, deployment automation, or complex orchestration.",
      "Do not refactor unrelated files.",
    ],
    implementationSteps: [
      "Read the Alpha Development Plan and this Beta Task Prompt.",
      "Make only the smallest change required to satisfy the exact goal.",
      "Stay inside the allowed files or allowed areas.",
      "Run targeted validation that already exists in the repo.",
      "Return a Beta Result Report before any next task is issued.",
    ],
    acceptanceChecks: [
      "The change satisfies the exact goal without expanding scope.",
      "All changed files are inside allowed files or allowed areas.",
      "No forbidden changes were made.",
      "Validation was run or the absence of validation tooling was reported.",
      "The Beta Result Report includes files changed, behavior changed, validation, deviations, risks, and a next-step recommendation.",
    ],
    validationCommandSuggestions: [
      "Run typecheck if a TypeScript project config exists.",
      "Run lint if a lint script exists.",
      "Run focused tests only if a test setup already exists.",
      "Report when no validation script exists.",
    ],
    expectedResultReportFormat: [
      "filesChanged: string[]",
      "behaviorChanged: string",
      "validationRun: { command, result, outputSummary? }[]",
      "validationResult: passed | failed | not_run",
      "deviationsFromPrompt: string[]",
      "risks: string[]",
      "nextStepRecommendation: continue | request_revision | halt_for_admin",
    ],
    stopConditions: [
      "Stop if the task requires a broad architecture decision.",
      "Stop if ADMIN approval is required.",
      "Stop if implementation would expand beyond the allowed scope.",
      "Stop if a forbidden change appears necessary.",
    ],
  };
}
