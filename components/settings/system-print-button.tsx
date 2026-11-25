'use client'

import { PrintButton } from '@/components/ui/print-button'

export function SystemPrintButton() {
  return <PrintButton onClick={() => window.print()} />
}