import type {
  AlphaReviewDecision,
  BetaResultReport,
  BetaTaskPrompt,
} from "../domain/workflow.ts";

export const EXECUTION_MODES = ["manual", "dry_run"] as const;

export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const EXECUTION_STATUSES = [
  "manual_action_required",
  "not_executed",
  "completed",
  "failed",
  "blocked",
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export interface ExecutionRequest {
  id: string;
  requestedAt: string;
  mode: ExecutionMode;
  taskPrompt: BetaTaskPrompt;
  allowedFilesOrAreas: string[];
  forbiddenChanges: string[];
  validationCommandSuggestions: string[];
  stopConditions: string[];
  timeoutMs?: number;
}

export interface ExecutionResult {
  requestId: string;
  adapterName: string;
  mode: ExecutionMode;
  status: ExecutionStatus;
  executed: boolean;
  completedAt: string;
  message: string;
  manualInstructions: string[];
  betaResultReport: BetaResultReport;
}

export interface ExecutionAdapter {
  name: string;
  supportedModes: ExecutionMode[];
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

export function createManualExecutionAdapter(): ExecutionAdapter {
  return {
    name: "manual",
    supportedModes: ["manual", "dry_run"],
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
      const completedAt = request.requestedAt;

      return {
        requestId: request.id,
        adapterName: "manual",
        mode: request.mode,
        status: "manual_action_required",
        executed: false,
        completedAt,
        message:
          "Manual execution adapter did not execute anything. ADMIN must copy/paste the BETA task manually.",
        manualInstructions: [
          "Review the BETA task prompt before sending it to any implementer.",
          "Copy/paste the task manually only after ADMIN/ALPHA approves the scope.",
          "Require BETA to return a Beta Result Report before any next task is issued.",
        ],
        betaResultReport: createManualResultReport({
          request,
          submittedAt: completedAt,
          nextStepRecommendation: "halt_for_admin",
        }),
      };
    },
  };
}

function createManualResultReport(input: {
  request: ExecutionRequest;
  submittedAt: string;
  nextStepRecommendation: AlphaReviewDecision;
}): BetaResultReport {
  return {
    id: `manual-execution-result-${input.request.taskPrompt.id}`,
    taskPromptId: input.request.taskPrompt.id,
    submittedAt: input.submittedAt,
    filesChanged: [],
    behaviorChanged:
      "No execution performed. Manual adapter requires ADMIN to copy/paste the BETA task.",
    validationRun: [],
    validationResult: "not_run",
    deviationsFromPrompt: [],
    risks: ["No automated execution occurred."],
    nextStepRecommendation: input.nextStepRecommendation,
  };
}
