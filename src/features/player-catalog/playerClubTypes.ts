import type { CareerSpell } from '../themed-modes/metadata'

export const CAREER_STATUSES = ['ACTIVE', 'RETIRED', 'FREE_AGENT', 'UNKNOWN'] as const
export type CareerStatus = (typeof CAREER_STATUSES)[number]
export type ClubVerificationStatus = 'VERIFIED' | 'PENDING' | 'CONFLICT'

/** Partial career evidence, compatible with themed metadata; absence of dates is explicit. */
export interface VerifiedClubHistory extends CareerSpell {
  readonly asOfDate: string
  readonly verificationStatus: ClubVerificationStatus
  readonly sourceUrl: string
}

export interface PlayerClubSnapshot {
  readonly playerId: string
  readonly revision: number
  readonly referenceClubId: string
  readonly currentClubId: string | null
  readonly careerStatus: CareerStatus
  readonly clubHistory: readonly VerifiedClubHistory[]
  readonly historyCoverage: 'PARTIAL' | 'NOT_REVIEWED'
  readonly asOfDate: string
  /** Evidence inspected; a URL alone does not make a pending row verified. */
  readonly sourceUrl: string | null
  readonly verificationStatus: ClubVerificationStatus
  readonly announcedAt?: string
  readonly announcementDateVerification?: 'VERIFIED' | 'USER_SUPPLIED'
  readonly auditNote: string
}
