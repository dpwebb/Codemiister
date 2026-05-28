import type { BetaTaskPrompt } from "../domain/workflow.ts";
import type { ExecutionStatus } from "./adapter.ts";
import type { ExecutionReadinessReport } from "./readiness.ts";
import {
  EXECUTION_RESULT_PACKAGE_TYPE,
  EXECUTION_RESULT_PACKAGE_VERSION,
  type ExecutionResultPackage,
} from "./result-package.ts";

export interface FakeExecutionRequestPackage {
  packageType: "codemiister.executionRequest";
  packageVersion: string;
  generatedAt: string;
  adminIdea: unknown;
  alphaPlanSummary: unknown;
  betaTask: BetaTaskPrompt;
  executionReadiness: ExecutionReadinessReport;
  validationSuggestions: string[];
  requiredResultReportFormat: string[];
  noExecutionStatement: string;
}

export interface LocalFakeExecutorOptions {
  completedAt?: string;
}

export function runLocalFakeExecutor(
  requestPackage: FakeExecutionRequestPackage,
  options: LocalFakeExecutorOptions = {},
): ExecutionResultPackage {
  const completedAt = options.completedAt ?? requestPackage.generatedAt;
  const blocked = !requestPackage.executionReadiness.ready;
  const executionStatus: ExecutionStatus = blocked ? "blocked" : "completed";
  const behaviorChanged = blocked
    ? "Fake executor did not simulate implementation because execution readiness had blockers. No files were changed."
    : "Fake executor simulated BETA completion only. No files were changed, no shell commands were run, and no external services were called.";

  return {
    packageType: EXECUTION_RESULT_PACKAGE_TYPE,
    packageVersion: EXECUTION_RESULT_PACKAGE_VERSION,
    completedAt,
    requestPackageType: requestPackage.packageType,
    requestPackageVersion: requestPackage.packageVersion,
    taskTitle: requestPackage.betaTask.taskTitle,
    executionStatus,
    noExternalValidationClaim:
      "Fake executor performed no independent validation. No Codex execution, shell commands, file changes, or external service calls occurred.",
    betaResultReport: {
      id: `fake-execution-result-${requestPackage.betaTask.id}`,
      taskPromptId: requestPackage.betaTask.id,
      submittedAt: completedAt,
      filesChanged: [],
      behaviorChanged,
      validationRun: [],
      validationResult: "not_run",
      deviationsFromPrompt: [],
      risks: [
        blocked
          ? "Execution readiness blocked the fake executor before simulation."
          : "Execution was simulated locally; no real implementation work occurred.",
        "Reported validation is not independently verified.",
      ],
      nextStepRecommendation: blocked ? "halt_for_admin" : "continue",
    },
  };
}
