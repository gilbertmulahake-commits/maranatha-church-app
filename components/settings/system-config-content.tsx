import type { Role } from '@prisma/client'
import Link from 'next/link'
import {
  Info,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Clock,
  Banknote,
  Timer,
  Bell,
  AlarmClock,
  CreditCard,
  Landmark,
  Users,
  MapPin,
  Building2,
  Scale,
  FileText,
  History,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/help/info-tooltip'
import { INFO_TOOLTIPS } from '@/lib/help/content'
import { cn, formatCurrency } from '@/lib/utils'
import {
  FOUR_EYES_THRESHOLD,
  ARREARS_CRITICAL_DAYS,
  PAYMENT_INTENT_AMOUNT_CEILING,
  SLA_YELLOW_DAYS,
  SLA_RED_DAYS,
  CHURCH_DELETION_SLA_YELLOW_DAYS,
  CHURCH_DELETION_SLA_RED_DAYS,
  PAYMENT_INTENT_EXPIRY_MINUTES,
} from '@/lib/constants'
import {
  isNationalLevel,
  isFinanceAdmin,
  isOperationsAdmin,
  isNationalTreasurer,
} from '@/lib/auth/roles'
import { SystemPrintButton } from '@/components/settings/system-print-button'

type BankMode = 'mock' | 'sandbox' | 'live' | 'unrecognized' | 'unset'

function normalizeBankMode(value: string | null): BankMode {
  if (!value) return 'unset'
  const v = value.toLowerCase()
  if (v === 'mock' || v === 'sandbox' || v === 'live') return v
  return 'unrecognized'
}

function ConfigRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="mt-0.5 rounded-md bg-muted p-2 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-paragraph-small font-medium text-foreground">{label}</p>
        <p
          className={cn(
            'text-paragraph-small font-medium tabular-nums',
            valueClassName ?? 'text-foreground'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

interface SystemConfigContentProps {
  role: Role | null
  bankAdapterMode: string | null
  buildSha: string
}

export function SystemConfigContent({
  role,
  bankAdapterMode,
  buildSha,
}: SystemConfigContentProps) {
  const mode = normalizeBankMode(bankAdapterMode)
  const showBanner = mode === 'live' || mode === 'sandbox' || mode === 'unrecognized'

  const managementLinks = [
    {
      title: 'Users',
      href: '/dashboard/users',
      description: 'Manage user accounts and role assignments.',
      icon: Users,
      visible: isOperationsAdmin(role),
    },
    {
      title: 'Regions',
      href: '/dashboard/regions',
      description: 'View and manage regional oversight.',
      icon: MapPin,
      visible: isNationalLevel(role),
    },
    {
      title: 'Churches',
      href: '/dashboard/churches',
      description: 'View and manage church records.',
      icon: Building2,
      visible: isNationalLevel(role),
    },
    {
      title: 'Reconciliation',
      href: '/dashboard/reconciliation',
      description: 'Resolve unmatched payments and review queues.',
      icon: Scale,
      visible: isFinanceAdmin(role) || isNationalTreasurer(role),
    },
    {
      title: 'Reports',
      href: '/dashboard/reports',
      description: 'Access the reports hub.',
      icon: FileText,
      visible: isNationalLevel(role),
    },
    {
      title: 'Audit Logs',
      href: '/dashboard/audit-logs',
      description: 'Review the system activity trail.',
      icon: History,
      visible: isNationalLevel(role),
    },
  ].filter((l) => l.visible)

  return (
    <div className="space-y-xl">
      {/* Read-only notice */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4">
        <div className="rounded-md bg-background p-2 shrink-0">
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-paragraph-small font-medium text-foreground">
            Read-only reference
          </p>
          <p className="text-xs text-muted-foreground">
            These values are defined in application code and cannot be edited here.
            Changes are made via deployment.
          </p>
        </div>
      </div>

      {/* Environment banner */}
      {showBanner && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4',
            mode === 'live'
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
          )}
        >
          <div className="rounded-md bg-background p-2 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-paragraph-small font-medium">
              {mode === 'live' && 'PRODUCTION'}
              {mode === 'sandbox' && 'SANDBOX'}
              {mode === 'unrecognized' && 'UNRECOGNIZED MODE'}
            </p>
            <p className="text-xs">
              {mode === 'live' && 'Bank API calls target production. Real payments settle.'}
              {mode === 'sandbox' && 'Bank API calls target sandbox environments.'}
              {mode === 'unrecognized' && 'Verify BANK_ADAPTER_MODE.'}
            </p>
          </div>
        </div>
      )}

      {/* Print action */}
      <div className="flex justify-end print:hidden">
        <SystemPrintButton />
      </div>

      {/* Configuration cards */}
      <div className="grid grid-cols-1 @[800px]:grid-cols-2 gap-md">
        {/* Card 1 — Financial Controls */}
        <Card className="h-full w-full min-w-0">
          <CardHeader>
            <CardTitle className="text-heading-4 font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              Financial Controls
            </CardTitle>
            <CardDescription>Fixed thresholds enforced across the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 min-w-0">
            {/* Fee amounts (KES 500 / 5,000) are added by Unit 20.7. Do not hardcode here. */}
            <ConfigRow
              icon={UserCheck}
              label="Four-eyes threshold"
              value={formatCurrency(FOUR_EYES_THRESHOLD)}
            />
            <ConfigRow
              icon={Clock}
              label="Arrears critical window"
              value={`${ARREARS_CRITICAL_DAYS} days`}
            />
            <ConfigRow
              icon={Banknote}
              label="Payment ceiling"
              value={formatCurrency(PAYMENT_INTENT_AMOUNT_CEILING)}
            />
          </CardContent>
        </Card>

        {/* Card 2 — Operational SLAs */}
        <Card className="h-full w-full min-w-0">
          <CardHeader>
            <CardTitle className="text-heading-4 font-bold text-foreground flex items-center gap-2">
              <Timer className="h-5 w-5 text-muted-foreground" />
              Operational SLAs
            </CardTitle>
            <CardDescription>Time-to-action windows per approval queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 min-w-0">
            <ConfigRow
              icon={Bell}
              label="Reconciliation warning"
              value={`${SLA_YELLOW_DAYS} days`}
              valueClassName="text-amber-600"
            />
            <ConfigRow
              icon={AlarmClock}
              label="Reconciliation overdue"
              value={`${SLA_RED_DAYS} days`}
              valueClassName="text-destructive"
            />
            <ConfigRow
              icon={Bell}
              label="Deletion warning"
              value={`${CHURCH_DELETION_SLA_YELLOW_DAYS} days`}
              valueClassName="text-amber-600"
            />
            <ConfigRow
              icon={AlarmClock}
              label="Deletion overdue"
              value={`${CHURCH_DELETION_SLA_RED_DAYS} days`}
              valueClassName="text-destructive"
            />
          </CardContent>
        </Card>

        {/* Card 3 — Payment System */}
        <Card className="h-full w-full min-w-0">
          <CardHeader>
            <CardTitle className="text-heading-4 font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment System
            </CardTitle>
            <CardDescription>Guided payment wizard lifecycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 min-w-0">
            <ConfigRow
              icon={Timer}
              label="Intent expiry"
              value={`${PAYMENT_INTENT_EXPIRY_MINUTES} minutes`}
            />
          </CardContent>
        </Card>

        {/* Card 4 — Bank Integration */}
        <Card className="h-full w-full min-w-0">
          <CardHeader>
            <CardTitle className="text-heading-4 font-bold text-foreground flex items-center gap-2">
              <Landmark className="h-5 w-5 text-muted-foreground" />
              Bank Integration
            </CardTitle>
            <CardDescription>Active adapter mode for bank API calls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'mock' && (
                <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                  Mock
                </Badge>
              )}
              {mode === 'sandbox' && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                  Sandbox
                </Badge>
              )}
              {mode === 'live' && (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                  Live (Production)
                </Badge>
              )}
              {mode === 'unrecognized' && (
                <>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                    Unrecognized: {bankAdapterMode}
                  </Badge>
                  <InfoTooltip label="Bank adapter mode" content={INFO_TOOLTIPS.bankAdapterMode} />
                </>
              )}
              {mode === 'unset' && (
                <>
                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                    Not configured
                  </Badge>
                  <InfoTooltip label="Bank adapter mode" content={INFO_TOOLTIPS.bankAdapterMode} />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'mock' && 'Bank API calls are simulated. No real money moves.'}
              {mode === 'sandbox' && 'Bank API calls target the sandbox environments.'}
              {mode === 'live' && 'Bank API calls target production. Real payments settle.'}
              {mode === 'unrecognized' && 'This value is not a recognised adapter mode. Verify BANK_ADAPTER_MODE.'}
              {mode === 'unset' && 'No adapter mode is configured.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Surfaces */}
      {managementLinks.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-heading-4 font-bold text-foreground flex items-center gap-2">
              Management Surfaces
              <InfoTooltip
                label="Management surfaces"
                content={INFO_TOOLTIPS.managementSurfaces}
              />
            </CardTitle>
            <CardDescription>Shortcuts to the pages your role can access.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <nav
              aria-label="Management surfaces"
              className="grid grid-cols-1 @[600px]:grid-cols-2 @[900px]:grid-cols-3 gap-md"
            >
              {managementLinks.map(({ href, title, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-paragraph-small font-semibold text-foreground">
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </Link>
              ))}
            </nav>
          </CardContent>
        </Card>
      )}

      {/* Provenance footer */}
      <p className="text-xs text-muted-foreground">
        Configuration source: <span className="font-mono">lib/constants.ts</span>{' '}
        · Deployed from {buildSha || 'local development'} · Change history is tracked
        in version control.
      </p>
    </div>
  )
}