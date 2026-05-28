import type {
  AlphaReview,
  BetaResultReport,
  BetaTaskPrompt,
  DriftRisk,
} from "../domain/workflow.ts";

export interface AlphaReviewInput {
  betaTaskPrompt: BetaTaskPrompt;
  betaResultReport: BetaResultReport;
  reviewedAt?: string;
}

export function reviewBetaResult(input: AlphaReviewInput): AlphaReview {
  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  const findings: string[] = [];
  const outOfScopeFiles = findOutOfScopeFiles(
    input.betaResultReport.filesChanged,
    input.betaTaskPrompt.allowedFilesOrAreas,
  );
  const validationReported = input.betaResultReport.validationRun.length > 0;
  const deviationDetected =
    input.betaResultReport.deviationsFromPrompt.length > 0;
  const forbiddenChangeReported = hasForbiddenChangeReport(
    input.betaTaskPrompt,
    input.betaResultReport,
  );

  if (input.betaResultReport.filesChanged.length === 0) {
    findings.push("BETA did not report any files changed.");
  }

  if (!validationReported) {
    findings.push("BETA did not report validation run details.");
  }

  if (deviationDetected) {
    findings.push("BETA reported deviations from the prompt.");
  } else {
    findings.push("BETA reported no deviations from the prompt.");
  }

  if (outOfScopeFiles.length > 0) {
    findings.push(
      `BETA reported out-of-scope changed files: ${outOfScopeFiles.join(", ")}`,
    );
  }

  if (forbiddenChangeReported) {
    findings.push("BETA reported a forbidden or materially risky change.");
  }

  if (input.betaResultReport.validationResult === "failed") {
    findings.push("BETA reported failed validation.");
  }

  const driftRisk = getDriftRisk({
    missingReportEvidence:
      input.betaResultReport.filesChanged.length === 0 ||
      !validationReported,
    deviationDetected,
    outOfScopeDetected: outOfScopeFiles.length > 0,
    forbiddenChangeReported,
  });
  const decision = getReviewDecision(input.betaResultReport, driftRisk);

  return {
    id: `alpha-review-${input.betaResultReport.id}`,
    resultReportId: input.betaResultReport.id,
    reviewedAt,
    evidenceReviewed: [
      "Beta Result Report filesChanged",
      "Beta Result Report validationRun",
      "Beta Result Report deviationsFromPrompt",
      "Beta Result Report risks",
      "Beta Task Prompt allowedFilesOrAreas",
      "Beta Task Prompt forbiddenChanges",
    ],
    reviewFindings: findings.length ? findings : ["No obvious drift detected."],
    driftRisk,
    decision,
    statusAfterReview:
      decision === "continue"
        ? "next_task_ready"
        : decision === "request_revision"
          ? "revision_required"
          : "halted",
    nextTaskReady: decision === "continue",
  };
}

function findOutOfScopeFiles(
  filesChanged: string[],
  allowedFilesOrAreas: string[],
): string[] {
  return filesChanged.filter(
    (filePath) => !isAllowedFileOrArea(filePath, allowedFilesOrAreas),
  );
}

function isAllowedFileOrArea(
  filePath: string,
  allowedFilesOrAreas: string[],
): boolean {
  const normalizedFile = normalizePath(filePath);

  return allowedFilesOrAreas.some((allowed) => {
    const normalizedAllowed = normalizePath(allowed);

    if (normalizedAllowed.endsWith("/")) {
      return normalizedFile.startsWith(normalizedAllowed);
    }

    return normalizedFile === normalizedAllowed;
  });
}

function hasForbiddenChangeReport(
  betaTaskPrompt: BetaTaskPrompt,
  betaResultReport: BetaResultReport,
): boolean {
  const reportText = [
    betaResultReport.behaviorChanged,
    ...betaResultReport.deviationsFromPrompt,
    ...betaResultReport.risks,
  ]
    .join(" ")
    .toLowerCase();

  return (
    getForbiddenKeywords(betaTaskPrompt.forbiddenChanges).some(
      (keyword) =>
        reportText.includes(keyword) &&
        !reportText.includes(`no ${keyword}`) &&
        !reportText.includes(`not ${keyword}`),
    )
  );
}

function getForbiddenKeywords(forbiddenChanges: string[]): string[] {
  const forbiddenText = forbiddenChanges.join(" ").toLowerCase();
  const knownForbiddenTerms = [
    "full application",
    "persistence",
    "database",
    "authentication",
    "authorization",
    "external ai",
    "provider sdk",
    "generated code",
    "queues",
    "workers",
    "billing",
    "deployment automation",
    "complex orchestration",
    "refactor unrelated",
    "unrelated files",
  ];

  return knownForbiddenTerms.filter((term) => forbiddenText.includes(term));
}

function getDriftRisk(input: {
  missingReportEvidence: boolean;
  deviationDetected: boolean;
  outOfScopeDetected: boolean;
  forbiddenChangeReported: boolean;
}): DriftRisk {
  if (input.outOfScopeDetected || input.forbiddenChangeReported) {
    return {
      level: "high",
      reasons: ["BETA reported forbidden or out-of-scope changes."],
      betaOverreachDetected: true,
      haltRecommended: true,
    };
  }

  if (input.missingReportEvidence || input.deviationDetected) {
    return {
      level: "medium",
      reasons: input.missingReportEvidence
        ? ["BETA result report is missing required review evidence."]
        : ["BETA reported a deviation that requires Alpha review."],
      betaOverreachDetected: false,
      haltRecommended: false,
    };
  }

  return {
    level: "low",
    reasons: ["BETA report matches the task boundaries using report data."],
    betaOverreachDetected: false,
    haltRecommended: false,
  };
}

function getReviewDecision(
  betaResultReport: BetaResultReport,
  driftRisk: DriftRisk,
): AlphaReview["decision"] {
  if (
    driftRisk.haltRecommended ||
    betaResultReport.nextStepRecommendation === "halt_for_admin"
  ) {
    return "halt_for_admin";
  }

  if (
    driftRisk.level === "medium" ||
    betaResultReport.validationResult === "failed" ||
    betaResultReport.nextStepRecommendation === "request_revision"
  ) {
    return "request_revision";
  }

  return "continue";
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}
