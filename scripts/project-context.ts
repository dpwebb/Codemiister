import { readFileSync } from "node:fs";

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

const packageJson = readPackageJson();
const packageName = packageJson.name ?? "unknown";
const scripts = Object.entries(packageJson.scripts ?? {}).sort(([left], [right]) =>
  left.localeCompare(right),
);

console.log("# Codemiister Project Context Snapshot");
console.log("");
printSection("Project Name", `Codemiister (package: ${packageName})`);
printSection(
  "Current Purpose",
  "Automated Coder is a manual Alpha/Beta scaffold for creating applications through small, reviewable, drift-controlled steps.",
);
printListSection("Roles", [
  "ADMIN supplies the initial result-oriented idea and approves major planning gates.",
  "ALPHA plans, controls scope, creates bounded BETA tasks, and reviews BETA output.",
  "BETA implements one small task at a time and reports evidence before the next task is issued.",
]);
printScriptSection(scripts);
printListSection("Key Source Directories and Files", [
  "AGENTS.md - project guardrails and Alpha/Beta operating rules",
  "README.md - manual workflow usage",
  "docs/automated-coder-doctrine.md - doctrine details",
  "docs/alpha-beta-operating-loop.md - sequential workflow details",
  "src/domain/workflow.ts - workflow domain model",
  "src/alpha/planner.ts - deterministic ALPHA planner contract",
  "src/beta/task.ts - BETA task prompt builder",
  "src/alpha/review.ts - ALPHA review helper",
  "src/workflow/runner.ts - in-memory workflow runner",
  "src/ui/ - local browser UI shell for the manual workflow",
  "scripts/*.ts - local manual workflow CLIs and validation",
]);
printListSection("Manual Workflow Command Sequence", [
  'npm run admin:idea -- "Create a simple project checklist app"',
  'npm run beta:task -- "Create a simple project checklist app"',
  'npm run beta:review -- "Create a simple project checklist app" "<beta-result-json>"',
  'npm run workflow:transcript -- "Create a simple project checklist app"',
  'npm run workflow:transcript -- "Create a simple project checklist app" --out transcripts/example.md',
]);
printListSection("Current Deferred Capabilities", [
  "Automated Codex execution",
  "External AI/provider calls",
  "Database or general persistence layer",
  "Authentication or multi-user support",
  "Backend server or API",
  "Queues, workers, or orchestration runtime",
  "Billing or deployment automation",
]);
printListSection("Validation Commands", [
  "npm run typecheck",
  "npm test",
  "npm run demo",
  "npm run demo:drift",
]);
printSection(
  "Manual Codex Note",
  "Codex execution is still manual: ADMIN exports a BETA task prompt, runs it separately, and supplies the BETA result report back to ALPHA review.",
);

function readPackageJson(): PackageJson {
  try {
    return JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as PackageJson;
  } catch (error) {
    console.error("Unable to read local package.json for project context snapshot.");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

function printSection(title: string, body: string): void {
  console.log(`## ${title}`);
  console.log(body);
  console.log("");
}

function printListSection(title: string, values: string[]): void {
  console.log(`## ${title}`);
  for (const value of values) {
    console.log(`- ${value}`);
  }
  console.log("");
}

function printScriptSection(values: [string, string][]): void {
  console.log("## Package Scripts");
  if (values.length === 0) {
    console.log("- No package scripts are defined.");
  }

  for (const [name, command] of values) {
    console.log(`- ${name}: \`${command}\``);
  }
  console.log("");
}
