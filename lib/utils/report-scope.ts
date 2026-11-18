import { Prisma, User } from '@prisma/client'
import { isNationalLevel } from '@/lib/auth/roles'

const FAIL_CLOSED_ID = '00000000-0000-0000-0000-000000000000'

export function buildChurchWhere(dbUser: User | null): Prisma.ChurchWhereInput {
  if (!dbUser) return { id: FAIL_CLOSED_ID }

  if (isNationalLevel(dbUser.role)) {
    return {}
  }

  if (dbUser.role === 'REGIONAL_CHAIRMAN' || dbUser.role === 'REGIONAL_TREASURER') {
    return { region_id: dbUser.region_id ?? FAIL_CLOSED_ID }
  }

  if (dbUser.role === 'LOCAL_PASTOR' || dbUser.role === 'CHURCH_TREASURER') {
    return { id: dbUser.church_id ?? FAIL_CLOSED_ID }
  }

  return { id: FAIL_CLOSED_ID }
}

export function buildPaymentWhere(
  dbUser: User | null,
  regionId?: string
): Prisma.PaymentWhereInput {
  if (!dbUser) return { church_id: FAIL_CLOSED_ID }

  if (isNationalLevel(dbUser.role)) {
    // National roles may optionally narrow to a single region via a report filter.
    if (regionId) return { church: { region_id: regionId } }
    return {}
  }

  if (dbUser.role === 'REGIONAL_CHAIRMAN' || dbUser.role === 'REGIONAL_TREASURER') {
    return { church: { region_id: dbUser.region_id ?? FAIL_CLOSED_ID } }
  }

  if (dbUser.role === 'LOCAL_PASTOR' || dbUser.role === 'CHURCH_TREASURER') {
    return { church_id: dbUser.church_id ?? FAIL_CLOSED_ID }
  }

  return { church_id: FAIL_CLOSED_ID }
}


/**
 * Applies role-based scoping to an already-sorted list of region scores.
 * Rank is computed BEFORE filtering so a regional viewer sees their region's
 * true global rank (not position 1 of 1). Returns rows decorated with `rank`.
 */
export function scopeByRole<T extends { regionId: string }>(
  sortedRows: T[],
  dbUser: User | null
): Array<T & { rank: number }> {
  const ranked = sortedRows.map((r, i) => ({ ...r, rank: i + 1 }))

  if (!dbUser) return []
  if (isNationalLevel(dbUser.role)) return ranked
  if (
    dbUser.role === 'REGIONAL_CHAIRMAN' ||
    dbUser.role === 'REGIONAL_TREASURER'
  ) {
    return ranked.filter((r) => r.regionId === dbUser.region_id)
  }
  return []
}