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

export function buildPaymentWhere(dbUser: User | null): Prisma.PaymentWhereInput {
  if (!dbUser) return { church_id: FAIL_CLOSED_ID }

  if (isNationalLevel(dbUser.role)) {
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