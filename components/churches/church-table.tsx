'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
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

export function ChurchTable({ data }: { data: ChurchRow[] }) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 20

  const filteredData = useMemo(() => {
    return data.filter((church) => {
      const searchLower = search.toLowerCase()
      return (
        church.church_code.toLowerCase().includes(searchLower) ||
        church.church_name.toLowerCase().includes(searchLower) ||
        church.treasurer_name.toLowerCase().includes(searchLower) ||
        (church.region?.name ?? '').toLowerCase().includes(searchLower)
      )
    })
  }, [data, search])

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
        <Input
          placeholder="Search churches..."
          value={search}
          onChange={handleSearch}
          className="pl-10 bg-white border-[#E2E8F0]"
        />
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[#64748B]">Church ID</th>
              <th className="px-4 py-3 text-left font-medium text-[#64748B]">Church Name</th>
              <th className="px-4 py-3 text-left font-medium text-[#64748B]">Region</th>
              <th className="px-4 py-3 text-left font-medium text-[#64748B]">Treasurer</th>
              <th className="px-4 py-3 text-left font-medium text-[#64748B]">Contact</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                  No churches found.
                </td>
              </tr>
            ) : (
              paginatedData.map((church) => (
                <tr key={church.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-mono tabular-nums text-[#64748B]">{church.church_code}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{church.church_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{church.region?.name ?? 'Unassigned'}</td>
                  <td className="px-4 py-3 text-[#64748B]">{church.treasurer_name}</td>
                  <td className="px-4 py-3 tabular-nums text-[#64748B]">{church.contact_phone}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">
          Showing {paginatedData.length} of {filteredData.length} churches
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-[#64748B]">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}