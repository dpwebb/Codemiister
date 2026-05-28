# Alpha/Beta Operating Loop

This document defines the execution loop for Automated Coder. The loop exists to keep autonomous application creation sequential, auditable, and reversible.

## Loop Summary

1. ADMIN gives ALPHA an Idea Prompt.
2. ALPHA creates a Development Plan.
3. ADMIN approves major planning gates when required.
4. ALPHA sends BETA exactly one Beta Task Prompt.
5. BETA implements only the requested task.
6. BETA returns a Beta Result Report.
7. ALPHA reviews the result with evidence.
8. ALPHA decides the next step.

BETA receives one small task at a time. ALPHA must review BETA's result before issuing another task.

## Step 1: Idea Prompt

The Idea Prompt is ADMIN's result-oriented request. It should be treated as product intent, not as permission to build the whole application in one pass.

ALPHA extracts:

- target outcome
- likely users
- core workflow
- constraints
- unknowns that affect major direction

ALPHA asks ADMIN only about unknowns that materially affect product direction, promotion, architecture, or legal/business constraints.

## Step 2: Development Plan

ALPHA writes the Development Plan before implementation begins.

The plan should cover:

- product scope
- user experience direction
- technical approach
- implementation stages
- validation strategy
- approval gates
- known risks

The plan must divide work into small stages that can become Beta Task Prompts.

## Step 3: Approval Gates

ALPHA stops for ADMIN approval when a decision materially changes:

- product direction
- promotion or public claims
- architecture
- legal or business posture
- data persistence
- authentication
- external AI provider usage
- billing
- deployment automation
- queue, worker, or orchestration strategy

Routine implementation choices remain ALPHA decisions.

## Step 4: Beta Task Prompt

ALPHA issues one Beta Task Prompt at a time.

Required format:

```text
Objective:
<one bounded implementation outcome>

Allowed scope:
<specific files, modules, or areas>

Non-goals:
<what BETA must not change>

Implementation notes:
<constraints, patterns, and expected approach>

Validation:
<commands or manual checks to run>

Report back with:
- files changed
- summary
- validation run and result
- deviations
- risks or follow-ups

Stop if:
<conditions requiring ALPHA review or ADMIN approval>
```

The objective must fit in a small, auditable change. BETA must not receive broad prompts such as "build the whole app" or "implement every feature".

## Step 5: Beta Implementation

BETA implements the task exactly as scoped.

BETA must:

- keep changes small
- avoid unrelated refactors
- avoid hidden architecture decisions
- stop when the task is complete
- report deviations immediately

## Step 6: Beta Result Report

BETA reports:

```text
Files changed:
<list>

Summary:
<what was implemented>

Validation:
<commands and results>

Deviations:
<any departure from the prompt, or "None">

Risks or follow-ups:
<remaining issues, or "None">
```

The report is not approval. It is evidence for ALPHA review.

## Step 7: Alpha Review

ALPHA reviews BETA output before any next task.

Required review evidence:

- actual diff or file inspection
- validation output
- relevant runtime or visual checks when applicable
- comparison against the Beta Task Prompt

ALPHA decides one of:

- approve and issue the next small task
- request a bounded correction
- revert or isolate drift
- stop for ADMIN approval

## Step 8: Next Task Decision

ALPHA may issue the next Beta Task Prompt only after Alpha Review is complete.

If review reveals drift, hallucinated behavior, unapproved architecture, or unvalidated work, ALPHA must correct that before continuing.

## Current Doctrine Phase

The current repository phase is doctrine and guardrails only. Do not build application features, introduce a database, add authentication, connect external AI providers, create queues or workers, add billing, add deployment automation, or introduce complex orchestration until ADMIN approves the relevant Development Plan gate.

