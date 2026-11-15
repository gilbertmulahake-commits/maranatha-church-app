'use client'

import { useState, useTransition } from 'react'
import { 
  Shield, MapPin, Church, Calendar, MoreHorizontal,
  UserX, UserCheck, RefreshCw, KeyRound
} from 'lucide-react'
import { 
  SystemUser, 
  toggleUserStatus, 
  forcePasswordReset, 
  updateUserRole 
} from '@/lib/actions/user-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { TableShell } from '@/components/ui/table-shell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { InviteUserDialog } from './invite-user-dialog'

const ASSIGNABLE_ROLES = [
  { value: 'NATIONAL_TREASURER', label: 'National Treasurer' },
  { value: 'NATIONAL_OVERSEER', label: 'National Overseer' },
  { value: 'REGIONAL_CHAIRMAN', label: 'Regional Chairman' },
  { value: 'REGIONAL_TREASURER', label: 'Regional Treasurer' },
  { value: 'LOCAL_PASTOR', label: 'Local Pastor' },
  { value: 'CHURCH_TREASURER', label: 'Church Treasurer' },
]

export function UsersTable({ 
  users, 
  regions, 
  churches,
  viewerRole
}: { 
  users: SystemUser[]
  regions: { id: string, name: string }[]
  churches: { id: string, church_name: string, church_code: string }[]
  viewerRole?: string | null
}) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  // Lifecycle dialog state
  const [userToToggle, setUserToToggle] = useState<SystemUser | null>(null)
  const [userToReset, setUserToReset] = useState<SystemUser | null>(null)
  const [userToChangeRole, setUserToChangeRole] = useState<SystemUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [isPending, startTransition] = useTransition()

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

  const handleToggleStatus = () => {
    if (!userToToggle) return
    startTransition(async () => {
      const res = await toggleUserStatus(userToToggle.id, !userToToggle.isActive)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`User ${userToToggle.isActive ? 'deactivated' : 'reactivated'} successfully`)
        setUserToToggle(null)
      }
    })
  }

  const handleForceReset = () => {
    if (!userToReset) return
    startTransition(async () => {
      const res = await forcePasswordReset(userToReset.id, window.location.origin)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          ('warning' in res && res.warning) || 'Reset email sent. Password reset required on next login.'
        )
        setUserToReset(null)
      }
    })
  }

  const handleChangeRole = () => {
    if (!userToChangeRole || !selectedRole) return
    startTransition(async () => {
      const res = await updateUserRole(userToChangeRole.id, selectedRole)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('User role updated successfully')
        setUserToChangeRole(null)
        setSelectedRole('')
      }
    })
  }

  const canManageUser = (targetUser: SystemUser) => {
    if (targetUser.role === 'SYSTEM_ADMIN' && viewerRole !== 'SYSTEM_ADMIN') {
      return false
    }
    return true
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="System Users"
        subtitle={`${filteredData.length} total users`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users..."
        actions={
          <InviteUserDialog regions={regions} churches={churches} />
        }
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small">Email</TableHead>
            <TableHead className="text-paragraph-small">Role</TableHead>
            <TableHead className="text-paragraph-small">Assignment</TableHead>
            <TableHead className="text-paragraph-small">Status</TableHead>
            <TableHead className="text-paragraph-small">Date Joined</TableHead>
            <TableHead className="text-paragraph-small text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-paragraph-small text-muted-foreground">
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
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge 
                      variant="outline" 
                      className={
                        user.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 w-fit text-[10px]' 
                          : 'bg-gray-100 text-gray-700 border-gray-200 w-fit text-[10px]'
                      }
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {user.requiresPasswordReset && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit text-[10px]">
                        Reset Required
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(user.createdAt)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {canManageUser(user) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" sideOffset={0} className="w-56">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Lifecycle
                          </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuItem 
                          onClick={() => { setUserToChangeRole(user); setSelectedRole(user.role) }} 
                          className="cursor-pointer text-paragraph-small whitespace-nowrap"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setUserToReset(user)} 
                          className="cursor-pointer text-paragraph-small whitespace-nowrap"
                        >
                          <KeyRound className="mr-2 h-4 w-4" /> Force Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setUserToToggle(user)} 
                          className={
                            user.isActive 
                              ? 'text-destructive cursor-pointer text-paragraph-small whitespace-nowrap' 
                              : 'text-emerald-600 cursor-pointer text-paragraph-small whitespace-nowrap'
                          }
                        >
                          {user.isActive ? (
                            <><UserX className="mr-2 h-4 w-4" /> Deactivate</>
                          ) : (
                            <><UserCheck className="mr-2 h-4 w-4" /> Reactivate</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-paragraph-small text-muted-foreground text-xs">Protected</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="users"
      />

      {/* Deactivate / Reactivate */}
      <AlertDialog open={!!userToToggle} onOpenChange={(open) => !open && setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading-3 font-bold">
              {userToToggle?.isActive ? 'Deactivate' : 'Reactivate'} {userToToggle?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.isActive 
                ? 'This user will be signed out immediately and cannot log in until reactivated. Their historical data will be preserved.'
                : 'This user will be able to log in again immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleStatus}
              disabled={isPending}
              className={
                userToToggle?.isActive 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }
            >
              {isPending ? 'Processing...' : (userToToggle?.isActive ? 'Deactivate' : 'Reactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Password Reset */}
      <AlertDialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading-3 font-bold">
              Force password reset for {userToReset?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The user will be required to change their password on their next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleForceReset}
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? 'Processing...' : 'Force Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role */}
      <Dialog open={!!userToChangeRole} onOpenChange={(open) => { if (!open) { setUserToChangeRole(null); setSelectedRole('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-heading-3 font-bold">Change User Role</DialogTitle>
            <DialogDescription>
              Updating role for <strong className="text-foreground">{userToChangeRole?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">New Role</label>
            <Select value={selectedRole} onValueChange={(val) => { if (val) setSelectedRole(val) }}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={0}>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setUserToChangeRole(null); setSelectedRole('') }} 
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleChangeRole} 
              disabled={isPending || !selectedRole || selectedRole === userToChangeRole?.role}
              className="bg-primary text-primary-foreground"
            >
              {isPending ? 'Saving...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}