// lib/help/content.ts

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * Single source of truth for help copy rendered on /dashboard/help and in the
 * Help drawer. Conditional National-tier entries resolve at render time from
 * the same role predicates the sidebar uses (`isFinanceAdmin` etc.), so help
 * copy cannot drift from real access.
 *
 * "Reading the reports" is the FIRST section in every tier — reports and
 * analytics are the least self-explanatory surface in the app. Per-report
 * descriptions are pulled from `lib/utils/report-registry.ts`, never
 * re-authored here.
 */

import type { Role } from '@prisma/client'
import { FOUR_EYES_THRESHOLD } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { toReportRole } from '@/lib/auth/roles'
import { getReportsForRole } from '@/lib/utils/report-registry'

export type HelpTier = 'NATIONAL' | 'REGIONAL' | 'LOCAL'

export type InfoTooltipKey =
  | 'complianceSnapshot'
  | 'fourEyes'
  | 'strictBucketIsolation'
  | 'bankAdapterMode'
  | 'managementSurfaces'

export interface HelpEntry {
  title: string
  body: string
}

export interface HelpSection {
  id: string
  title: string
  entries: HelpEntry[]
}

/**
 * Copy for the three inline `<InfoTooltip>` deployments.
 * `fourEyes` reads FOUR_EYES_THRESHOLD from lib/constants.ts — do not hardcode
 * 20,000 here. If the constant changes, the rendered copy follows.
 */
export const INFO_TOOLTIPS: Record<InfoTooltipKey, string> = {
  complianceSnapshot:
    'Counts, not percentages. A percentage hides which churches are struggling; the Paid / Partial / Overdue / N/A split shows exactly who needs attention.',
  fourEyes: `Any item at or above ${formatCurrency(FOUR_EYES_THRESHOLD)} — or touching 90+ day arrears, or any write-off — needs a second approver who is not the proposer. Enforced on the server, not in the UI.`,
  strictBucketIsolation:
    'Annual (KES 5,000) and Monthly (KES 500) are independent ledgers. An overpayment in one never covers a shortfall in the other.',
  bankAdapterMode:
    'Controls which bank API environment the system targets. Accepted values: mock (no external calls; simulated only), sandbox (test bank environments), live (production; real payments settle). Changing to live is a deployment decision, not a UI setting.',
  managementSurfaces:
    'Shortcuts to existing management pages. Each link is visible only if your role can access the destination in the sidebar; permissions are enforced server-side.',
}

/**
 * Static help content per tier. Does NOT include "Reading the reports" —
 * that section is generated in `getHelpContent` from the report registry so
 * descriptions have exactly one home.
 */
const STATIC_CONTENT: Record<HelpTier, HelpSection[]> = {
  NATIONAL: [
    {
      id: 'dashboard-and-kpis',
      title: 'Dashboard & KPIs',
      entries: [
        {
          title: 'Executive Command Center',
          body:
            'The national dashboard is arranged in four tiers: a command bar (schedule adherence + action center), bucket health (Annual / Monthly / compliance snapshot), analytics (collection trend + arrears aging), and accountability (leaderboard + live feed).',
        },
        {
          title: 'Expected-to-Date vs Year-End Target',
          body:
            'The Hero card progress bar measures against what should have been collected by today, not the absolute year-end target. "Ahead of schedule" means ahead of today, not ahead of December.',
        },
      ],
    },
    {
      id: 'payments-and-reconciliation',
      title: 'Payments & Reconciliation',
      entries: [
        {
          title: 'Automatic matching',
          body:
            'Every webhook payment is matched to a church via the Church ID in the BillRefNumber. When the ID does not resolve to an active church, the payment is captured in Unmatched Payments — never discarded — and the bank receives HTTP 200 so it stops retrying.',
        },
        {
          title: 'Four-Eyes approval',
          body: `Anything at or above ${formatCurrency(FOUR_EYES_THRESHOLD)}, or touching 90+ day arrears, or any write-off, is staged for Treasurer approval. You can never approve an item you proposed — enforced on the server.`,
        },
      ],
    },
    {
      id: 'reports-overview',
      title: 'Reports',
      entries: [
        {
          title: 'What is available',
          body:
            'Reports are grouped into core (arrears, cashbook, write-off register, defunct register, inactive churches) and analytics (collections summary, compliance, regional scores, YoY comparison, allocation breakdown, source/method, and reconciliation health). Availability follows your role — see the full list in the "Reading the reports" section above.',
        },
      ],
    },
    {
      id: 'audit-logs',
      title: 'Audit Logs',
      entries: [
        {
          title: 'Forensic trail',
          body:
            'Every critical mutation is recorded with actor, role, before/after snapshots, and a timestamp. Click any row to open the forensic snapshot dialog.',
        },
      ],
    },
    {
      id: 'users-and-roles',
      title: 'Users & Roles',
      entries: [
        {
          title: 'Separation of duties',
          body:
            'Finance Admin controls money; Operations Admin controls registry and users. Neither can do the other\'s job. System Admin (vendor) can do both. Protected accounts cannot be modified by any client user.',
        },
      ],
    },
    {
      id: 'mock-kcb',
      title: 'Mock KCB',
      entries: [
        {
          title: 'Testing webhooks',
          body:
            'The Mock KCB simulator lets Finance Admin fire signed webhook payloads against the system to exercise matching, unmatched capture, and idempotency without touching real funds.',
        },
      ],
    },
  ],
  REGIONAL: [
    {
      id: 'regional-dashboard',
      title: 'Regional Dashboard',
      entries: [
        {
          title: 'Scope',
          body:
            'You see your region only — its churches, compliance, collections, and arrears. National totals are not visible here by design.',
        },
        {
          title: 'Compliance breakdown',
          body:
            'Paid / Partial / Overdue / N/A counts per church, per bucket. Use these counts to prioritise follow-up; the leaderboard on the national dashboard uses the same rule.',
        },
      ],
    },
    {
      id: 'regional-payments',
      title: 'Regional Payments',
      entries: [
        {
          title: 'Transaction ledger',
          body:
            'Every payment credited to a church in your region, newest first. Allocation details open in a dialog. Bulk reminders send an SMS to selected pastors.',
        },
      ],
    },
  ],
  LOCAL: [
    {
      id: 'church-dashboard',
      title: 'Church Dashboard',
      entries: [
        {
          title: 'Your church, your numbers',
          body:
            'Annual (KES 5,000/yr) and Monthly (KES 500/mo) obligations tracked independently. The status badge and KPIs swap based on which bucket is selected.',
        },
        {
          title: 'Pay Now',
          body:
            'The Pay Now wizard walks you through a payment to the central Bank Paybill. You enter your Church ID in the Account Number field on your phone. Verification is automatic once the bank confirms.',
        },
      ],
    },
    {
      id: 'payments-history',
      title: 'Payment History',
      entries: [
        {
          title: 'Every payment, every allocation',
          body:
            'Each row is a bank ledger entry. Allocation details show which billing periods the payment covered, oldest first (FIFO).',
        },
      ],
    },
  ],
}

/**
 * Compose the full help content for a role.
 *
 * Order: "Reading the reports" first (every tier), then the tier's static
 * sections. Per-report descriptions come from `getReportsForRole` — never
 * re-authored here.
 */
export function getHelpContent(
  role: Role | string | null | undefined
): HelpSection[] {
  const tier = toReportRole(role)
  const reports = getReportsForRole(tier)

  const reportsSection: HelpSection = {
    id: 'reading-the-reports',
    title: 'Reading the reports',
    entries: [
      {
        title: 'Scope',
        body:
          'You see only the reports your role can access. National sees everything; Regional sees their region; Local sees their church.',
      },
      {
        title: 'Cash basis vs obligation basis',
        body:
          'Year-over-year comparison counts cash received by the calendar year of the payment date, not by the billing year it was attributed to. A prepayment counts in the year the cash arrived.',
      },
      {
        title: 'Gross vs net of write-offs',
        body:
          'Approved write-offs are disclosed on their own line — never silently netted into "Collected". Gross Arrears − Less Written Off = Net Recoverable.',
      },
      {
        title: 'Strict Bucket Isolation',
        body:
          'Annual and Monthly are always separate columns. A combined "Total Collected" figure hides which bucket is failing, so it is never rendered.',
      },
      ...reports.map((r) => ({
        title: r.title,
        body: r.description,
      })),
    ],
  }

  return [reportsSection, ...STATIC_CONTENT[tier]]
}

/**
 * Build the sections for a specific tier, without a role.
 * Used by the Help page to render all three tiers (current one first).
 * Drawer callers should continue to use `getHelpContent(role)`.
 */
export function getHelpContentByTier(tier: HelpTier): HelpSection[] {
  const reports = getReportsForRole(tier)

  const reportsSection: HelpSection = {
    id: 'reading-the-reports',
    title: 'Reading the reports',
    entries: [
      {
        title: 'Scope',
        body:
          'You see only the reports your role can access. National sees everything; Regional sees their region; Local sees their church.',
      },
      {
        title: 'Cash basis vs obligation basis',
        body:
          'Year-over-year comparison counts cash received by the calendar year of the payment date, not by the billing year it was attributed to. A prepayment counts in the year the cash arrived.',
      },
      {
        title: 'Gross vs net of write-offs',
        body:
          'Approved write-offs are disclosed on their own line — never silently netted into "Collected". Gross Arrears − Less Written Off = Net Recoverable.',
      },
      {
        title: 'Strict Bucket Isolation',
        body:
          'Annual and Monthly are always separate columns. A combined "Total Collected" figure hides which bucket is failing, so it is never rendered.',
      },
      ...reports.map((r) => ({
        title: r.title,
        body: r.description,
      })),
    ],
  }

  return [reportsSection, ...STATIC_CONTENT[tier]]
}