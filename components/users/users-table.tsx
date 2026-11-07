'use client'

import { useState } from 'react'
import { Shield, MapPin, Church, Calendar } from 'lucide-react'
import { SystemUser } from '@/lib/actions/user-actions'
import { Badge } from '@/components/ui/badge'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InviteUserDialog } from './invite-user-dialog'

export function UsersTable({ 
  users, 
  regions, 
  churches 
}: { 
  users: SystemUser[]
  regions: { id: string, name: string }[]
  churches: { id: string, church_name: string, church_code: string }[]
}) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const filteredData = users.filter((u) => {
    const s = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(s) ||
      u.role.toLowerCase().includes(s) ||
      (u.regionName || '').toLowerCase().includes(s)
    )
  })

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(dateStr))
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="System Users"
        subtitle={`${filteredData.length} total users`}
        search={search}
        setSearch={setSearch}
        statusFilter="All"
        setStatusFilter={() => {}}
        filterSlot={
          <InviteUserDialog regions={regions} churches={churches} />
        }
      />

      {/* STANDARD TABLE SHELL */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-paragraph-small">Email</TableHead>
              <TableHead className="text-paragraph-small">Role</TableHead>
              <TableHead className="text-paragraph-small">Assignment</TableHead>
              <TableHead className="text-paragraph-small">Date Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-paragraph-small text-muted-foreground">
                  No users found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground text-paragraph-small">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      <Shield className="mr-1 h-3 w-3" /> {formatRole(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.regionName ? (
                      <div className="flex items-center gap-1.5 text-paragraph-small text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {user.regionName}
                      </div>
                    ) : user.churchName ? (
                      <div className="flex items-center gap-1.5 text-paragraph-small text-muted-foreground">
                        <Church className="h-3.5 w-3.5" /> {user.churchName}
                      </div>
                    ) : (
                      <span className="text-paragraph-small text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-paragraph-small text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {formatDate(user.createdAt)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* STANDARD PAGINATION FOOTER */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="users"
      />
    </div>
  )
}