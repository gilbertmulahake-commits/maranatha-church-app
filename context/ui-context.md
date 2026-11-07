# UI Context & Design System (Enterprise Grade)

## 1. Design Philosophy
We are building a **modern, data-dense enterprise financial dashboard**. The UI must inspire institutional trust, optimize for rapid decision-making, and remain highly legible during long working hours. 
- **Aesthetic:** Clean, high-contrast, light-mode by default (Dark mode fully supported via CSS variables).
- **Density:** Optimize space for data, but never at the cost of readability (use generous padding).
- **Consistency:** Every component must look and feel like it belongs to the same family.

## 2. Tailwind v4 & Semantic Color Tokens (STRICT RULES)
**NO HARDCODED HEX VALUES (e.g., `#0F172A`) OR ARBITRARY SPACING VALUES (e.g., `p-[17px]`) ARE ALLOWED IN COMPONENTS.** 
All styling must use the semantic variables defined in `app/globals.css` via Tailwind v4's `@theme` block. This ensures the entire application can be re-themed instantly (e.g., for Dark Mode).

| Role | Tailwind Class | Usage |
|------|--------------|-------|
| **Page Background** | `bg-background` | The main app background (Slate 50). |
| **Surface/Cards** | `bg-card` | White backgrounds for KPI cards, tables, and dialogs. |
| **Primary Text** | `text-foreground` | Main titles and primary data (Slate 900). |
| **Muted Text** | `text-muted-foreground` | Subtitles, labels, and secondary data (Slate 500). |
| **Primary Accent** | `bg-primary` / `text-primary` | Buttons, active states, progress bars (Deep Navy). |
| **Sidebar** | `bg-sidebar` | The fixed left navigation (Deep Navy). |
| **Borders** | `border-border` | All dividers, table borders, and card outlines (Slate 200). |
| **Destructive** | `text-destructive` / `bg-destructive` | Overdue statuses, arrears, delete buttons (Red). |
| **Success** | `text-emerald-600` | Paid statuses, positive financial figures. |
| **Warning** | `text-amber-600` | Pending statuses, lagging regions. |

### Status Badges (Pill Shapes)
- **Paid:** `bg-emerald-100 text-emerald-700 border-emerald-200`
- **Partial/Pending:** `bg-amber-100 text-amber-700 border-amber-200`
- **Overdue:** `bg-red-100 text-red-700 border-red-200`

## 3. Typography & Data Formatting
| Role | Font | Notes |
|------|------|-------|
| **UI Text** | Inter (Geist Sans) | Clean, highly legible. |
| **Mono** | Geist Mono | For transaction refs (e.g., M-Pesa codes) and Church IDs. |

**Crucial Rule for Financials:** 
Every number representing currency, percentages, or counts must use the `tabular-nums` class. This aligns digits vertically.

### Standard Formatters (Use these exact JS snippets)
- **Currency:** `new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)`
- **Date:** `new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)`

### Typographic Scale (Figma Mapped)
- **Page Titles:** `text-heading-2 font-medium`
- **KPI Main Numbers:** `text-heading-1 font-bold tabular-nums`
- **Card Labels:** `text-paragraph-small text-muted-foreground`
- **Table Headers:** `text-paragraph-small font-medium text-muted-foreground`
- **Table Cells:** `text-paragraph-small text-foreground`

## 4. Spacing, Sizing, Z-Index & Radii (The Rhythm)
We do not use arbitrary values. We use a strict Tailwind scale.

### Border Radius
- **Badges / Avatars / Progress Bars:** `rounded-full`
- **Cards / Dialogs / Panels:** `rounded-xl` (or `rounded-lg` for inner sections like `bg-muted/30`)
- **Buttons / Inputs / Selects:** `rounded-md`

### Spacing
- **Page Layout:** `space-y-xl` (24px) between major sections.
- **Card/Dialog Padding:** `p-xl` (24px) standard. `p-md` (16px) for compact inner sections.
- **Grid Gaps:** `gap-md` (16px) for KPI cards/forms. `gap-xl` (24px) for major layout grids.

### Component Heights
- **Default Buttons/Inputs:** `h-9` (36px).
- **Small Buttons:** `h-8` (32px).
- **Icon Buttons:** `h-8 w-8`.
- **Sidebar Width:** `w-64` (256px).
- **Topbar Height:** `h-16` (64px).

### Z-Index Scale (Prevent Overlapping Bugs)
- **Base Content:** `z-0`
- **Sticky Topbar:** `z-30`
- **Sidebar:** `z-40`
- **Dropdown Menus / Popovers:** `z-50`
- **Dialogs / Modals:** `z-[100]`
- **Toasts (Sonner):** `z-[200]`

## 5. KPI Card Standard
Every KPI card across the system (National, Regional, Tabs) must follow this exact structure:
1.  **Wrapper:** `cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card"`
2.  **Header:** `<CardDescription>` (label), `<CardTitle>` (Main figure using `text-heading-1 font-bold tabular-nums`), and a `<CardAction>` (Badge).
3.  **Footer:** Must contain **either**:
    - A `StackedBar` component (for composition data like Annual vs Monthly) + explanatory text.
    - OR two lines of text (Primary text + Secondary text).
    - *Never leave empty space or inconsistent margins.*
4.  **Interactivity:** Clicking a card must filter the table below it (if on a tab) or navigate to a filtered view (if on the main dashboard).

## 6. Data Table & Toolbar Standard
No table should ever be rendered without the `<TableToolbar>` component.
- **Toolbar:** Includes Title, Subtitle (scope), Search (`maxWidth: '24rem'`), Filters (Status/Region), and a Bulk Action Bar.
- **Bulk Action Bar:** Appears when checkboxes are selected. Shows count and action buttons (e.g., "Send Reminders").
- **Checkboxes:** Every table must have a checkbox column as the first column for bulk selection.
- **Structure:** Always wrap the `<Table>` in `<div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">`. Table rows must use `hover:bg-muted/50`.
- **Role Capability & Identity:** All authorized roles (National, Regional) have full capability to View, Edit, and Send Reminders. The distinction is the **identity of the action**. SMS messages must carry the sender's authority stamp ("from the Maranatha National Office" vs "from the Maranatha Regional Office") to respect the hierarchy while preventing bottlenecks.

## 7. Component Standards (shadcn/ui & Tailwind)
We strictly use shadcn/ui (Base UI variant). 
- **Dialogs:** Must be controlled at the parent level (`open` / `onOpenChange`). Never nest a Dialog inside a Dropdown Menu.
- **Icons:** Lucide React. Stroke width `2` (default). Sizes: `h-4 w-4` inline, `h-5 w-5` for buttons, `h-3 w-3` inside badges.
- **Skeleton Loading:** For Suspense fallbacks, use shadcn `<Skeleton className="h-[X] w-full rounded-md" />`. Never use text like "Loading...".

## 8. Data Visualization (Recharts)
- **Color Palette:** Use the CSS variables defined in `globals.css` (`--chart-1` through `--chart-5`). Never hardcode chart colors.
- **Tooltips:** Use the custom shadcn `<ChartTooltip>` with a border radius of `rounded-lg` and a subtle shadow.
- **Axes:** Hide the vertical grid lines (`vertical={false}` on `<CartesianGrid>`). Keep axis text muted (`text-muted-foreground`) and font size `12px`.
- **Bars/Lines:** Use `radius={[4, 4, 0, 0]}` for bar charts to give a soft, modern top edge.

## 9. Responsive Design & Layout
- **KPI Cards:** `grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4`.
- **Charts:** `grid grid-cols-1 gap-xl md:grid-cols-2`.
- **Data Tables:** Always wrap tables in `overflow-x-auto`. Hide non-essential columns on smaller screens.
### The 12-Column Command Center Grid
For the main National Dashboard, we strictly use a 12-column CSS grid.
- **Top Row:** Hero Target (col-span-8), Live Feed (col-span-4).
- **Second Row:** 4 KPI Cards (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).
- **Third Row:** Area Chart (col-span-8), Donut Chart (col-span-4).
- **Fourth Row:** Regional Leaderboard (col-span-12).
- **Interactivity:** Every chart, KPI card, and leaderboard row must be a clickable link or filter trigger. Static elements are forbidden.

## 10. Interaction, Animations & UX Rules
- **Transitions:** All interactive elements must have `transition-colors` or `transition-all duration-200`.
- **Hover States:** Table rows must have `hover:bg-muted/50`. Buttons must have `hover:bg-primary/90`.
- **Focus Rings:** All inputs/buttons must have `focus:ring-1 focus:ring-primary`.
- **Loading States:** Always use `<Suspense>` with a `<Skeleton>` fallback matching the layout.
- **Empty States:** If a table or chart has no data, show a centered icon, a muted message, and a CTA button if applicable.
- **Pagination:** Default to 15 rows per page.

## 11. Forms, Feedback & Destructive Actions
### Forms
- **Layout:** Vertically stacked with `space-y-md`.
- **Labels:** `text-paragraph-small font-medium text-foreground mb-xs`.
- **Inputs:** shadcn `<Input>`, `<Select>`, `<Textarea>` with `bg-card border-border`.
- **Validation:** Errors directly below the input using `text-paragraph-small text-destructive mt-xs`.

### Feedback (Toasts)
We use `Sonner` for all user feedback. Never use `alert()` for success messages.
- **Position:** Bottom-right corner.

### Destructive Actions (Deleting Data)
- **Pattern:** Always use a shadcn `<AlertDialog>` for confirmation. Confirm button must be `bg-destructive`.

## 12. Accessibility (a11y)
- **Contrast:** Text must meet WCAG AA ratios.
- **Labels:** Every input must have an associated `<label>`.
- **Semantic HTML:** Use `<button>` for buttons, `<a>` for links.