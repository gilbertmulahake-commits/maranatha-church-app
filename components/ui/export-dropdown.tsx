'use client'

import { Download, FileSpreadsheet, FileText, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup, // <-- IMPORTED THIS
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportDropdownProps {
  onExportCsv: () => void
  onExportExcel: () => void
  onExportPdf: () => void
  disabled?: boolean
}

export function ExportDropdown({ onExportCsv, onExportExcel, onExportPdf, disabled }: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-9" disabled={disabled}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        {/* FIXED: Wrapped label in a Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* FIXED: Wrapped items in a Group */}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onExportExcel} className="cursor-pointer">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPdf} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4 text-destructive" />
            PDF Document
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportCsv} className="cursor-pointer">
            <FileType className="mr-2 h-4 w-4 text-muted-foreground" />
            CSV (Raw Data)
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}