'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface ExportConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType: 'print' | 'export'
  selectedCount: number
  totalCount: number
  onConfirm: (scope: 'all' | 'selected') => void
}

export function ExportConfirmDialog({
  open,
  onOpenChange,
  actionType,
  selectedCount,
  totalCount,
  onConfirm,
}: ExportConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="capitalize">
            Confirm {actionType}
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have <strong className="text-foreground">{selectedCount}</strong> row{selectedCount > 1 ? 's' : ''} selected. 
            Do you want to {actionType} only the selected rows, or the entire table ({totalCount} rows)?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} className="h-9 mt-0">
            Cancel
          </AlertDialogCancel>
          
          <Button 
            variant="outline"
            onClick={() => { onConfirm('selected'); onOpenChange(false) }}
            className="h-9 border-primary text-primary hover:bg-primary/5"
          >
            {actionType === 'export' ? 'Export' : 'Print'} Selected ({selectedCount})
          </Button>

          <Button 
            onClick={() => { onConfirm('all'); onOpenChange(false) }}
            className="h-9 bg-primary text-primary-foreground"
          >
            {actionType === 'export' ? 'Export' : 'Print'} All ({totalCount})
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}