import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PrintButtonProps {
  onClick: () => void
  disabled?: boolean
  /**
   * Override the default "Print" label.
   * Text is hidden below `lg`; icon-only on mobile/tablet.
   */
  children?: React.ReactNode
  className?: string
}

/**
 * Standard Print button — icon-only below `lg`, icon + text at `lg+`.
 *
 * Single source of truth for the print-button pattern across all tables.
 * Per `ui-context.md` Section 6.3, this is mandatory.
 *
 * Usage:
 *   <PrintButton onClick={handlePrint} disabled={data.length === 0} />
 *   <PrintButton onClick={handlePrintReceipt}>Print Receipt</PrintButton>
 */
export function PrintButton({ onClick, disabled, children, className }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn('h-9 px-3 shrink-0', className)}
    >
      <Printer className="h-4 w-4 lg:mr-2" />
      <span className="hidden lg:inline">{children ?? 'Print'}</span>
    </Button>
  )
}