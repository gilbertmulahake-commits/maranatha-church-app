# UI Context

## Theme
Modern, data-dense enterprise financial dashboard. Clean, trustworthy, and optimized for rapid decision-making. We use a light theme with high-contrast text for readability during long working hours, accented by deep navy blues to convey institutional trust.

## Colors
| Role | CSS Variable | Value |
|------|--------------|-------|
| Page background | --bg-base | #F8FAFC (Slate 50 - very subtle, cool gray) |
| Surface (Cards) | --bg-surface | #FFFFFF (White) |
| Surface Accent (Hover)| --bg-hover | #F1F5F9 (Slate 100) |
| Primary text | --text-primary | #0F172A (Slate 900) |
| Muted text | --text-muted | #64748B (Slate 500) |
| Primary accent | --accent-primary | #0F172A (Deep Slate/Navy for sidebar) |
| Secondary accent | --accent-secondary| #2563EB (Blue 600 for primary buttons/links) |
| Border | --border-default | #E2E8F0 (Slate 200) |
| Error (Overdue) | --state-error | #EF4444 (Red 500) |
| Success (Paid) | --state-success | #10B981 (Emerald 500) |
| Warning (Pending) | --state-warning | #F59E0B (Amber 500) |
| Background Success | --bg-success | #D1FAE5 (Emerald 100) |
| Background Warning | --bg-warning | #FEF3C7 (Amber 100) |
| Background Error | --bg-error | #FEE2E2 (Red 100) |

## Typography
| Role | Font | Variable | Notes |
|------|------|----------|-------|
| UI text | Inter | --font-sans | Clean, highly legible for dense data. |
| Code/mono | Geist Mono | --font-mono | For transaction reference codes (e.g., M-Pesa codes). |
| **Financials**| Inter | --font-sans | **Crucial:** Always use `tabular-nums` class for all tables and KPI numbers so digits align vertically (e.g., `class="tabular-nums"`). |

## Border Radius
| Context | Class |
|---------|-------|
| Badges / Tags | rounded-full (Pill shape) |
| Cards / Panels | rounded-xl (Slightly softer, modern corners) |
| Buttons / Inputs | rounded-md |

## Component Library
shadcn/ui on top of Tailwind. 
- Use `DataTable` (TanStack Table) for all lists (especially the 1,600 churches).
- Use `Recharts` for all charts.
- Use `Sonner` for toast notifications (e.g., "SMS sent successfully", "Payment recorded").

## Layout Patterns
- **App Shell:** Fixed left sidebar (240px width, deep navy `--accent-primary`), main content area scrolls independently.
- **Topbar:** Sticky top header (white, bottom border). Contains breadcrumbs, a global search bar (for finding churches by name/ID), and the User Profile dropdown.
- **Dashboard Grid:** 12-column grid with a `gap-6` (24px).
  - **KPI Cards:** Span 3 columns (4 in a row). Huge bold text for the main number, a small trend indicator (e.g., "+5% this month"), and a muted label.
  - **Charts:** Span 6 columns (2 in a row). Placed below KPI cards.
  - **Data Tables:** Span 12 columns (full width) below charts.
- **Forms (e.g., Payment Entry):** Centered in a max-width container (`max-w-2xl`). Clear sections for "Church Details", "Payment Details", and "Confirmation".
- **UX Rules for Data:**
  - **Empty States:** Never show a blank table. Show an illustration and a clear call-to-action (e.g., "No payments found. Record a new payment").
  - **Pagination:** Always paginate tables (e.g., 50 rows per page) so the browser doesn't crash with 1,600 churches.
  - **Status Badges:** Pill-shaped (`rounded-full`), colored backgrounds with matching darker text (e.g., Paid = Green text on Light Green bg).

## Icons
Lucide React. Stroke-based icons only. Sizes: `h-4 w-4` inline, `h-5 w-5` buttons.