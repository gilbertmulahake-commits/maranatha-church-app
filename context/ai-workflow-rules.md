# AI Workflow Rules

## Approach
Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state. Always implement against these specs — do not infer or invent behaviour from scratch.

## Scoping Rules
- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine UI changes and background-task changes in a single implementation step.

## When to Split Work
Split an implementation step if it combines:
- UI changes and database changes.
- Multiple unrelated API routes.
- Behaviour not clearly defined in the context files.

## Handling Missing Requirements
- Do not invent product behaviour not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in progress-tracker.md before continuing.

## Protected Files
Do not modify `components/ui/*` unless explicitly instructed to add a new shadcn component.

## Keeping Docs in Sync
Update the relevant context file whenever implementation changes system architecture, storage model decisions, code conventions, or feature scope.

## Before Moving to the Next Unit
- The current unit works end to end within its defined scope.
- No invariant defined in architecture.md was violated.
- progress-tracker.md reflects the completed work.
- `npm run build` passes.