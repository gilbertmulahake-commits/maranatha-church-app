import { prisma } from '@/lib/prisma'
import { distance } from 'fastest-levenshtein'

export interface MatchSuggestion {
  church_id: string
  church_code: string
  church_name: string
  confidence: number
  source: 'pattern' | 'fuzzy' | 'manual'
}

export function normalizeReference(ref: string): string {
  if (!ref) return ''
  return ref
    .toUpperCase()
    .trim()
    .replace(/[\s\-_./\\]/g, '')
}

function fuzzyConfidence(distance: number): number {
  if (distance === 0) return 100
  if (distance === 1) return 90
  if (distance === 2) return 75
  if (distance === 3) return 60
  if (distance === 4) return 45
  return 0
}

export async function suggestMatches(
  rawRef: string,
  limit = 3
): Promise<MatchSuggestion[]> {
  if (!rawRef || rawRef.trim().length === 0) return []

  const normalized = normalizeReference(rawRef)
  if (normalized.length === 0) return []

  // 1. Look up learned patterns
  const patterns = await prisma.resolutionPattern.findMany({
    where: {
      is_active: true,
      OR: [
        { raw_reference_pattern: rawRef },
        { normalized_reference: normalized },
      ],
    },
    orderBy: { confidence_score: 'desc' },
    take: 10,
  })

  // 2. Load all active churches
  const churches = await prisma.church.findMany({
    where: { is_defunct: false },
    select: { id: true, church_code: true, church_name: true },
  })

  const suggestionMap = new Map<string, MatchSuggestion>()

  // 3a. Apply pattern matches first (HIGHEST TRUST)
  for (const pattern of patterns) {
    const church = churches.find(
      (c) => c.church_code === pattern.resolved_church_code
    )
    if (!church) continue

    suggestionMap.set(church.church_code, {
      church_id: church.id,
      church_code: church.church_code,
      church_name: church.church_name,
      confidence: pattern.confidence_score,
      source: 'pattern',
    })
  }

  // 🚨 CRITICAL FIX: If the Solutions Bank has a pattern for this exact reference,
  // return it immediately. Do NOT let fuzzy matches for OTHER churches override it.
  if (suggestionMap.size > 0) {
    return Array.from(suggestionMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  // 3b. Apply fuzzy matches ONLY if no patterns exist
  for (const church of churches) {
    const normCode = normalizeReference(church.church_code)
    if (Math.abs(normCode.length - normalized.length) > 4) continue

    const d = distance(normalized, normCode)
    const conf = fuzzyConfidence(d)
    if (conf === 0) continue

    suggestionMap.set(church.church_code, {
      church_id: church.id,
      church_code: church.church_code,
      church_name: church.church_name,
      confidence: conf,
      source: 'fuzzy',
    })
  }

  return Array.from(suggestionMap.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

export async function recordResolution(params: {
  rawReference: string
  resolvedChurchCode: string
  resolutionType: 'Fuzzy' | 'Manual' | 'Rule'
  actorId?: string
}): Promise<void> {
  try {
    const normalized = normalizeReference(params.rawReference)

    const existing = await prisma.resolutionPattern.findUnique({
      where: {
        raw_reference_pattern_resolved_church_code: {
          raw_reference_pattern: params.rawReference,
          resolved_church_code: params.resolvedChurchCode,
        },
      },
    })

    if (existing) {
      const newHitCount = existing.hit_count + 1
      const newConfidence = Math.min(100, 50 + newHitCount * 10)
      await prisma.resolutionPattern.update({
        where: { id: existing.id },
        data: {
          hit_count: newHitCount,
          confidence_score: newConfidence,
          last_used_at: new Date(),
        },
      })
    } else {
      await prisma.resolutionPattern.create({
        data: {
          raw_reference_pattern: params.rawReference,
          normalized_reference: normalized,
          resolved_church_code: params.resolvedChurchCode,
          resolution_type: params.resolutionType,
          hit_count: 1,
          confidence_score: 60,
          created_by: params.actorId,
        },
      })
    }
  } catch (error) {
    // We still don't want to break the payment, but we MUST log the exact Prisma error for debugging.
    console.error('🚨 FAILED TO RECORD RESOLUTION PATTERN:', error)
  }
}