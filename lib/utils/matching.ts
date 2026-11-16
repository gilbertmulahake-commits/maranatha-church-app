import { prisma } from '@/lib/prisma'
import { distance } from 'fastest-levenshtein'

export interface MatchSuggestion {
  church_id: string
  church_code: string
  church_name: string
  confidence: number
  source: 'pattern' | 'fuzzy' | 'manual'
}

/**
 * Normalize a raw reference string for comparison.
 * - Uppercase
 * - Trim
 * - Strip all separators (spaces, dashes, underscores, dots, slashes)
 * 
 * Examples:
 *   "CH 001"   -> "CH001"
 *   " ch-001 " -> "CH001"
 *   "CH/001"   -> "CH001"
 */
export function normalizeReference(ref: string): string {
  if (!ref) return ''
  return ref
    .toUpperCase()
    .trim()
    .replace(/[\s\-_./\\]/g, '')
}

/**
 * Compute confidence score for a given Levenshtein distance.
 * Only distances 0-4 yield a valid score; anything above is discarded.
 */
function fuzzyConfidence(distance: number): number {
  if (distance === 0) return 100
  if (distance === 1) return 90
  if (distance === 2) return 75
  if (distance === 3) return 60
  if (distance === 4) return 45
  return 0
}

/**
 * Suggest the top N church matches for a raw reference.
 * 
 * Precedence (highest confidence wins):
 *   1. ResolutionPattern (learned from past resolutions) — used as-is
 *   2. Levenshtein fuzzy match against active church codes
 * 
 * Only active (non-defunct) churches are considered.
 */
export async function suggestMatches(
  rawRef: string,
  limit = 3
): Promise<MatchSuggestion[]> {
  if (!rawRef || rawRef.trim().length === 0) return []

  const normalized = normalizeReference(rawRef)
  if (normalized.length === 0) return []

  // 1. Look up learned patterns (exact raw match OR normalized match)
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

  // 2. Load all active churches for fuzzy matching
  const churches = await prisma.church.findMany({
    where: { is_defunct: false },
    select: { id: true, church_code: true, church_name: true },
  })

  const suggestionMap = new Map<string, MatchSuggestion>()

  // 3a. Apply pattern matches first (highest trust)
  for (const pattern of patterns) {
    const church = churches.find(
      (c) => c.church_code === pattern.resolved_church_code
    )
    if (!church) continue

    const existing = suggestionMap.get(church.church_code)
    if (!existing || existing.confidence < pattern.confidence_score) {
      suggestionMap.set(church.church_code, {
        church_id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        confidence: pattern.confidence_score,
        source: 'pattern',
      })
    }
  }

  // 3b. Apply fuzzy matches (only override if higher confidence)
  for (const church of churches) {
    const normCode = normalizeReference(church.church_code)

    // Performance filter: only compare codes within ±4 chars length
    if (Math.abs(normCode.length - normalized.length) > 4) continue

    const d = distance(normalized, normCode)
    const conf = fuzzyConfidence(d)
    if (conf === 0) continue

    const existing = suggestionMap.get(church.church_code)
    if (!existing || existing.confidence < conf) {
      suggestionMap.set(church.church_code, {
        church_id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        confidence: conf,
        source: 'fuzzy',
      })
    }
  }

  // 4. Return top N sorted by confidence
  return Array.from(suggestionMap.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

/**
 * Record a successful resolution into the Solutions Bank.
 * Increments hit_count and recomputes confidence on repeat resolutions.
 * 
 * IMPORTANT: Never throws. A failure here must not break the main mutation.
 */
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
    // Swallow error — the payment was already created successfully.
    console.error('Failed to record resolution pattern:', error)
  }
}