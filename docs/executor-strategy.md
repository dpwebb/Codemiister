# Executor Strategy

Codemiister currently supports manual Alpha/Beta handoff only. This document compares executor options before any real execution is connected.

## Hard Constraints

- An executor must never run unless execution readiness passes.
- An executor must consume an execution request package.
- An executor must return an execution result package.
- ALPHA must review the execution result before the next BETA task is issued.
- ADMIN remains in control of when any request is sent to BETA or an executor.
- No executor may broaden scope beyond the issued BETA task.

## Option 1: Manual Handoff Only

What it does:

- ADMIN exports or copies the BETA task or execution request package.
- ADMIN manually gives the bounded task to Codex.
- BETA manually returns a result report or execution result package.
- ALPHA reviews the reported result before the next task.

What it must not do:

- It must not automate Codex execution.
- It must not run shell commands on BETA's behalf.
- It must not treat reported validation as independently verified.

Drift risk:

- Low technical automation risk because nothing is executed by Codemiister.
- Moderate process risk if ADMIN skips package validation or Alpha Review.

Validation requirements:

- Validate execution request packages before handoff.
- Validate execution result packages before Alpha Review.
- Preserve transcript output for audit context when useful.

When it is allowed:

- Allowed now.
- This remains the baseline until ADMIN approves a later execution gate.

## Option 2: Local Fake Executor Harness

What it does:

- Accepts a validated execution request package.
- Produces a deterministic execution result package without running Codex.
- Simulates success, revision, or halt scenarios for local testing.
- Exercises request/result validation and Alpha Review wiring.

What it must not do:

- It must not call Codex, OpenAI, or any external AI/provider service.
- It must not modify project files.
- It must not run arbitrary shell commands.
- It must not claim independent validation of implementation work.

Drift risk:

- Low if outputs are deterministic and clearly labeled as fake.
- Useful for testing gates without introducing real execution risk.

Validation requirements:

- Require execution readiness to pass before producing a fake result.
- Require a valid execution request package as input.
- Return a valid execution result package.
- Include an explicit statement that no real execution occurred.

When it is allowed:

- Allowed as the next implementation step.
- It should be local, deterministic, dependency-free, and removable.

## Option 3: Future Real Codex Executor

What it does:

- Sends a validated execution request package to a real Codex execution mechanism.
- Receives or constructs an execution result package from the completed run.
- Provides evidence for Alpha Review.

What it must not do:

- It must not bypass ADMIN control.
- It must not run when readiness has blockers.
- It must not accept broad tasks or unvalidated request packages.
- It must not issue the next task without Alpha Review.

Drift risk:

- High until execution boundaries, stop conditions, sandboxing, and evidence capture are proven.
- Highest risk areas are scope expansion, hidden file changes, unreviewed validation claims, and uncontrolled retries.

Validation requirements:

- Validate request package before execution.
- Enforce readiness blockers as hard stops.
- Capture changed files, validation run, validation result, deviations, and risks.
- Validate the result package before Alpha Review.
- Preserve enough evidence for ADMIN and ALPHA to audit the run.

When it is allowed:

- Not allowed yet.
- It requires a later ADMIN-approved planning gate after the fake harness proves the package and review flow.

## Recommendation

The next implementation step should be a local fake executor harness only.

Do not add real Codex execution yet. The fake harness should prove the request package, readiness gate, result package, and Alpha Review path without modifying files or calling external services.
