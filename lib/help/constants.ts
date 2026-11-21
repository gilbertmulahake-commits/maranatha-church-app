// lib/help/constants.ts

/**
 * UI-only constants for the in-app help system (Unit 20).
 *
 * Kept separate from `lib/constants.ts` because that file is scoped to
 * financial and operational business rules (see its header comment).
 * Nothing here is a business rule; all values are UI configuration.
 */

/**
 * Prefix for per-tier tour-completion keys in localStorage.
 * The full key is `HELP_TOUR_STORAGE_KEY_PREFIX + tier`,
 * e.g. `mfa-help-tour-seen-NATIONAL`.
 *
 * Per-tier (not global) so a user whose role changes onboards to the new tier.
 */
export const HELP_TOUR_STORAGE_KEY_PREFIX = 'mfa-help-tour-seen-'

/**
 * Bumping this re-runs the tour once for every user (per tier).
 * Bump when tour steps change materially; do not bump for copy tweaks.
 */
export const HELP_TOUR_VERSION = '1'

/**
 * Drawer width override for the shadcn <SheetContent> primitive.
 * The primitive default is `sm:max-w-sm`; help cards need more room.
 */
export const HELP_DRAWER_MAX_WIDTH_CLASS = 'sm:max-w-md'