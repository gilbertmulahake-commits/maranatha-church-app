# Current Issues

## Issue 1: Guided Tour Focus Trap allows Tab to escape to background elements
- **Governing Spec:** Unit 20 — In-App Help & Onboarding
- **Status:** OPEN (Deferred at user's discretion)
- **Reproduction Steps:**
  1. Open the guided tour on `/dashboard`.
  2. Click the dark overlay.
  3. Press `Tab` repeatedly.
- **Expected:** Focus should cycle only between the buttons in the tour card.
- **Actual:** Focus escapes to the sidebar or browser chrome.
- **Notes:** Attempted fixes using `keydown` and `focusin` on `document` with `capture: true` did not resolve the issue. Likely an interaction with Base UI's focus scopes or a deeply nested React tree issue. Does not block the rest of the tour functionality.