'use client'

import { useState } from 'react'
import {
  ColumnDef,
  flexRender,
  tableFeatures,
  useTable,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  columnFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type ChurchRow = {
  id: string
  church_code: string
  church_name: string
  treasurer_name: string
  contact_phone: string
  region: { name: string } | null
}

const features = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})

const columns: ColumnDef<typeof features, ChurchRow>[] = [
  {
    accessorKey: 'church_code',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent px-0 font-semibold"
        >
          Church ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <span className="font-mono tabular-nums">{row.getValue('church_code')}</span>,
  },
  {
    accessorKey: 'church_name',
    header: 'Church Name',
    cell: ({ row }) => <span className="font-medium text-[#0F172A]">{row.getValue('church_name')}</span>,
  },
  {
    id: 'region_name',
    accessorFn: (row: ChurchRow) => row.region?.name ?? 'Unassigned',
    header: 'Region',
  },
  {
    accessorKey: 'treasurer_name',
    header: 'Treasurer',
  },
  {
    accessorKey: 'contact_phone',
    header: 'Contact',
    cell: ({ row }) => <span className="tabular-nums">{row.getValue('contact_phone')}</span>,
  },
]

export function ChurchTable({ data }: { data: ChurchRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useTable({
    features,
    columns,
    data,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
        <Input
          placeholder="Search churches..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10 bg-white border-[#E2E8F0]"
        />
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left font-medium text-[#64748B]">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[#64748B]">
                  No churches found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[#64748B]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">
          Showing {table.getRowModel().rows.length} of {data.length} churches
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-[#64748B]">
            Page {(table.state.pagination?.pageIndex ?? 0) + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}