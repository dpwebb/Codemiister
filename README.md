# Codemiister

Codemiister is the current scaffold for Automated Coder, a manual Alpha/Beta workflow for creating applications through small, reviewable, drift-controlled steps.

This repository does not automate Codex execution yet. It provides local CLI tools and a browser UI shell for intake, task export, manual result review, and transcript generation.

## Roles

- ADMIN supplies the initial result-oriented idea and approves major planning gates.
- ALPHA plans, controls scope, creates the first BETA task, and reviews BETA output.
- BETA implements one small bounded task at a time and reports the result.

## Manual Workflow

1. Review the Admin idea:

```powershell
npm run admin:idea -- "Create a simple project checklist app"
```

2. Export the first copy/paste-ready BETA task:

```powershell
npm run beta:task -- "Create a simple project checklist app"
```

3. Review a manually supplied BETA result:

```powershell
$result = '"{""filesChanged"":[""src/domain/example.ts""],""behaviorChanged"":[""Added small domain helper""],""validationRun"":[""npm run typecheck""],""validationResult"":""passed"",""deviationsFromPrompt"":[],""risks"":[],""nextStepRecommendation"":""continue""}"'
npm run beta:review -- "Create a simple project checklist app" $result
```

4. Print a full workflow transcript to stdout:

```powershell
npm run workflow:transcript -- "Create a simple project checklist app"
```

5. Save a transcript only when explicitly requested:

```powershell
npm run workflow:transcript -- "Create a simple project checklist app" --out transcripts/example.md
```

If npm emits an `--out` warning in Windows PowerShell, use the safer separator form:

```powershell
npm run workflow:transcript -- -- "Create a simple project checklist app" --out transcripts/example.md
```

`workflow:transcript` writes files only when `--out` is supplied. Output paths must be local relative paths; absolute paths and paths containing `..` are rejected.

## Manual Execution Handoff

Codemiister still does not execute Codex automatically. ADMIN remains in control: execution request packages are local handoff artifacts, execution result packages are reported artifacts, and ALPHA review is deterministic based on the reported result unless ADMIN verifies more evidence separately.

Safe handoff sequence:

```powershell
npm run project:context
npm run beta:task -- "Create a simple project checklist app"
npm run beta:execute:manual -- "Create a simple project checklist app"
npm run execution:request -- -- "Create a simple project checklist app" --out transcripts/execution-request.json
npm run execution:validate -- transcripts/execution-request.json
```

Then manually paste the BETA task or execution request package into Codex. Require BETA to return a structured result report/package before ALPHA review.

```powershell
npm run execution:result:validate -- transcripts/execution-result.json

$result = '"{""filesChanged"":[""src/domain/example.ts""],""behaviorChanged"":[""Added small domain helper""],""validationRun"":[""npm run typecheck""],""validationResult"":""passed"",""deviationsFromPrompt"":[],""risks"":[],""nextStepRecommendation"":""continue""}"'
npm run beta:review -- "Create a simple project checklist app" $result

npm run workflow:transcript -- "Create a simple project checklist app" --out transcripts/example.md
```

Reported validation in an execution result package is BETA-reported. Treat it as evidence for ALPHA review, not independently verified fact.

## PowerShell Notes

For inline JSON in Windows PowerShell, wrap the JSON argument in an outer quoted string and double the inner JSON quotes:

```powershell
$result = '"{""filesChanged"":[""src/domain/example.ts""],""behaviorChanged"":[""Added small domain helper""],""validationRun"":[""npm run typecheck""],""validationResult"":""passed"",""deviationsFromPrompt"":[],""risks"":[],""nextStepRecommendation"":""continue""}"'
npm run beta:review -- "Create a simple project checklist app" $result
```

For `--out`, the safest Windows/npm form is to include an extra argument separator before the idea:

```powershell
npm run workflow:transcript -- -- "Create a simple project checklist app" --out transcripts/example.md
```

Without the extra separator, some npm/Windows shells may warn that `--out` is an unknown npm config option. The CLI still avoids unsafe paths, but the extra separator keeps npm from consuming the flag.

## Validation

Run the current lightweight checks:

```powershell
npm run typecheck
npm test
npm run demo
npm run demo:drift
```

No database, backend server, authentication, external AI provider, Codex API automation, queue, worker, or deployment runtime is included.
