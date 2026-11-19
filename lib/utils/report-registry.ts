import { toReportRole } from '@/lib/auth/roles'

// Single source of truth for the Reports section.
// Every report slug, title, description, group, and visibility rule lives here.
// Three consumers: the hub card grid (app/dashboard/reports/page.tsx),
// the dynamic route resolver (app/dashboard/reports/[report]/page.tsx), and
// the report selector dropdown (components/reports/report-selector.tsx).
//
// `visibleTo` semantics:
// - `['ALL']` — visible to every authenticated role.
// - `['NATIONAL', 'REGIONAL']` — hidden from Local roles.
// 'ALL' is a visibility wildcard, not a caller identity — `toReportRole`
// never returns 'ALL'.

export type ReportRole = 'ALL' | 'NATIONAL' | 'REGIONAL' | 'LOCAL'

export type ReportEntry = {
  slug: string
  title: string
  description: string
  group: string
  visibleTo: ReportRole[]
}

export const REPORTS: ReportEntry[] = [
  // ── Existing reports (Unit 18.1) — preserve current hub order ──
  {
    slug: 'arrears',
    title: 'Arrears Report',
    description: 'Gross, Written Off, and Net Recoverable balances per church.',
    group: 'Financial',
    visibleTo: ['ALL'],
  },
  {
    slug: 'arrears-aging',
    title: 'Arrears Aging — Drillable',
    description:
      'Per-church gross arrears aged by 0-30 / 31-60 / 61-90 / 90+ day buckets (FIFO), with church-level approved write-offs disclosed separately.',
    group: 'Analytics',
    visibleTo: ['ALL'],
  },
  {
    slug: 'cashbook',
    title: 'Daily Cashbook',
    description: 'Transaction ledger for a specific date.',
    group: 'Financial',
    visibleTo: ['ALL'],
  },
  {
    slug: 'write-offs',
    title: 'Write-Off Register',
    description: 'Approved bad-debt write-offs.',
    group: 'Reconciliation',
    visibleTo: ['ALL'],
  },
  {
    slug: 'defunct',
    title: 'Defunct Churches',
    description: 'Churches that have been fully written off.',
    group: 'Registry',
    visibleTo: ['ALL'],
  },
  {
    slug: 'inactive',
    title: 'Inactive Churches',
    description: 'No paid payment in the last 6 months.',
    group: 'Registry',
    visibleTo: ['ALL'],
  },

  // ── Stage A (Unit 18.2) — reuse existing math ──
  {
    slug: 'collections-summary',
    title: 'Collections Summary',
    description: 'Monthly and yearly cash received, isolated by bucket.',
    group: 'Financial',
    visibleTo: ['NATIONAL', 'REGIONAL'],
  },
  {
    slug: 'compliance',
    title: 'Compliance Report',
    description: 'Per-church compliance status with gross, written-off, and net balances.',
    group: 'Analytics',
    visibleTo: ['ALL'],
  },
  {
    slug: 'regional-scores',
    title: 'Regional Scores',
    description: 'Incentive scores and tiers per region.',
    group: 'Analytics',
    visibleTo: ['NATIONAL', 'REGIONAL'],
  },

  // ── Stage B (Unit 18.2) — new aggregation ──
  {
    slug: 'yoy-comparison',
    title: 'YoY Comparison',
    description: 'Year-over-year cash received, isolated by bucket.',
    group: 'Financial',
    visibleTo: ['NATIONAL', 'REGIONAL'],
  },
  {
    slug: 'allocation-breakdown',
    title: 'Allocation Breakdown',
    description: 'Payment allocations by billing year and bucket, with reconciliation.',
    group: 'Financial',
    visibleTo: ['NATIONAL', 'REGIONAL'],
  },
  {
    slug: 'source-method',
    title: 'Source & Method Breakdown',
    description: 'Collections cross-tabulated by source and payment method.',
    group: 'Financial',
    visibleTo: ['NATIONAL', 'REGIONAL'],
  },
]

export function getReportBySlug(slug: string): ReportEntry | undefined {
  return REPORTS.find((r) => r.slug === slug)
}

// Returns the reports the caller is allowed to see, in registry order.
// Uses `toReportRole` so role → visibility-bucket mapping has exactly one
// implementation (`lib/auth/roles.ts`). Unknown roles fall through to LOCAL.
export function getReportsForRole(role: string): ReportEntry[] {
  const bucket = toReportRole(role)
  return REPORTS.filter(
    (r) => r.visibleTo.includes('ALL') || r.visibleTo.includes(bucket)
  )
}