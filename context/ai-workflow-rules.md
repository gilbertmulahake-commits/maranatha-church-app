# AI Workflow Rules

## Approach
Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state. Always implement against these specs — do not infer or invent behaviour from scratch.

You are the implementation engine. The thinking — what to build, how it fits together, where the boundaries are — stays with the human. Execute what the specs and context files already define.

## Scoping Rules
- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine UI changes and background-task changes in a single implementation step.
- Do not combine UI changes and database changes in a single implementation step.
- Do not implement a feature not defined in a spec. If a requirement is missing, stop and resolve it in the context files first.

## When to Split Work
Split an implementation step if it combines:
- UI changes and database changes.
- UI changes and background-task changes.
- Multiple unrelated API routes.
- Behaviour not clearly defined in the context files.

If a change cannot be verified end-to-end quickly, the scope is too broad — split it.

## Handling Missing Requirements
- Do not invent product behaviour not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file **before** implementing.
- If a requirement is missing, add it as an open question in `context/progress-tracker.md` **before** continuing.
- Never answer a clarification only in chat. An answer that matters belongs in a context file or spec, or it is lost at the next session boundary.

## Protected Files
Do not modify `components/ui/*` unless explicitly instructed to add a new shadcn component. The following are globally customised and must not be reverted: `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/table-toolbar.tsx`, `components/ui/tooltip.tsx`, `lib/utils.ts` (`twMerge` extension).

## Corrective Prompts — Be Surgical
When a change does not match the spec, correct exactly one thing:
- Name the specific element.
- State the expected behaviour (quote the spec).
- State the current behaviour.
- State what must **not** be touched.

Never issue a vague "fix it" or "make it better" prompt. A vague correction causes more damage than the original defect.

## When Something Breaks — Analyse Before Fixing
If a defect, drift, or unexpected behaviour appears:
1. Create `context/current-issues.md` with: reproduction steps, expected vs actual, relevant error logs, and the governing spec.
2. Ask for **analysis only** — root cause and a proposed fix. Do not execute the fix.
3. Review the proposal. Approve or redirect.
4. Execute the approved fix. Verify. Mark the issue resolved.
5. Re-run the unit's verification checklist. If anything regressed, add a **new** issue — do not reopen the old one.

## Invariants — Check Before Closing Any Unit
After implementing a unit and before running the closing gate, review the diff against the eight invariants in `context/architecture.md`. Pay particular attention to:
- **Invariant 3 (Idempotency):** both `Payment.transaction_id` and `UnmatchedPayment.bank_reference`.
- **Invariant 5 (Reconciliation Mapping):** unmatched payments are captured with HTTP 200, never discarded.
- **Invariant 6 (Atomic Financial Mutations):** every multi-table financial write is inside `prisma.$transaction`.
- **Invariant 8 (Four-Eyes & Write-Offs):** `FOUR_EYES_THRESHOLD` imported from `lib/constants.ts`; the proposer can never approve their own item; write-offs are always Treasurer-approved.

If an invariant is violated and the violation is unavoidable, **update `context/architecture.md` first**, then record the reasoning under "Architecture Decisions" in `context/progress-tracker.md`. Invariants are rules, not guidelines.

## Domain Rules — Point, Don't Restate
Detailed implementation rules live in `context/code-standards.md`. Before touching a domain, read its section there rather than inferring behaviour:
- **Reconciliation, four-eyes, Solutions Bank, pending-payment staging, write-off accounting** → `code-standards.md` § "Reconciliation Patterns (Unit 17)".
- **Base UI primitives, dialog widths, auth redirects, FormData payloads** → `code-standards.md` § "Frontend Behavior Rules".
- **Migrations, backfills, protected accounts, RBAC guards** → `code-standards.md` § "Database Migrations" and § "Authentication & Protected Accounts".

Do not re-derive these rules from memory. The file is the source of truth.

## Keeping Docs in Sync
Update the relevant context file whenever implementation changes system architecture, storage model decisions, code conventions, or feature scope. Context files and code ship together — a unit is not complete until its context files reflect it.

If a decision changes in more than one file (for example, a shared constant or a new architectural rule), update **all** affected files in the same session. Do not leave one file describing the old state.

## Before Moving to the Next Unit
All four conditions must hold. Zero exceptions:
- The unit works end-to-end within its defined scope.
- No invariant in `context/architecture.md` is violated.
- `context/progress-tracker.md` reflects the completed work, including any new Architecture Decisions and Session Notes.
- The full gate passes cleanly:
  - `npx tsc --noEmit`
  - `npm run lint` (zero warnings, zero errors)
  - `npm run build` (must report the expected page count)

Do not commit with a failing gate. Do not defer a failing gate to the next session.

## Per-Unit Loop
1. Read the entry point and all six context files in order.
2. Read the spec for this unit only.
3. Update `context/progress-tracker.md` to mark the unit in progress.
4. Implement exactly what the spec defines. Nothing beyond its scope.
5. Verify against the spec's verification checklist.
6. Check the invariants.
7. Update the context files this unit changed.
8. Run the full gate.
9. Commit and push the feature branch.
10. Open the pull request. Review. Merge.
11. Return to `main`, pull, delete the branch.
12. Next unit begins in a **new chat** with a **new spec**.