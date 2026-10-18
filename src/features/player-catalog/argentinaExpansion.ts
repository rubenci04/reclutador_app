import type { Position } from '../../types/football'
import type { Player } from '../../types/player'
import type { CareerSpell } from '../themed-modes/metadata'

/** Separate namespace: plr_151..500 are already reserved by catalog_v1. */
export const ARGENTINA_EXPANSION = {
  version: 'argentina_collection_v1', status: 'created_not_enabled', total: 200,
  quotas: { ARQ:24, DEF:64, MED:60, DEL:52 },
  batches: ['ARG-B01','ARG-B02','ARG-B03','ARG-B04'].map((id,index) => ({ id, status:'created' as const, count:50, firstId:`arg_${String(index*50+1).padStart(3,'0')}`, lastId:`arg_${String(index*50+50).padStart(3,'0')}`, quotas:{ARQ:6,DEF:16,MED:15,DEL:13} })),
} as const

export interface ArgentinaCareer extends CareerSpell {
  readonly countryCode: 'ARG'
  readonly startedYear: number
  readonly endedYear: number
  readonly competitionIds: readonly string[]
  readonly source: { readonly provider:'editorial'; readonly url:string; readonly retrievedAt:string; readonly verification:'verified' }
}
export interface ArgentinaCandidate {
  readonly canonicalId: string
  /** External person key, not a name or a new edition of the same person. */
  readonly identityKey: string
  readonly position: Position
  readonly careers: readonly ArgentinaCareer[]
  readonly inclusionReasons: readonly ('championship' | 'scorer' | 'club_icon' | 'outstanding_career')[]
}
/** The 200 records live in argentinaBatches.ts (ARG-B01..B04); this list stays empty. Existing players reuse plr_* IDs. */
export const ARGENTINA_CANDIDATES: readonly ArgentinaCandidate[] = []

export function validateArgentinaCandidates(candidates: readonly ArgentinaCandidate[], existing: readonly Player[], existingIdentityKeys: ReadonlySet<string>) {
  const ids = new Set(existing.map((player) => player.id)); const identities = new Set(existingIdentityKeys)
  return candidates.every((candidate) => {
    const valid = /^arg_(00[1-9]|0[1-9][0-9]|1[0-9]{2}|200)$/.test(candidate.canonicalId) && !ids.has(candidate.canonicalId) && candidate.identityKey.trim().length > 0 && !identities.has(candidate.identityKey)
      && candidate.inclusionReasons.length > 0 && candidate.careers.length > 0
      && candidate.careers.every((career) => career.countryCode === 'ARG' && career.startedYear <= career.endedYear && career.competitionIds.length > 0 && career.source.verification === 'verified' && career.source.url.startsWith('https://'))
    ids.add(candidate.canonicalId); identities.add(candidate.identityKey)
    return valid
  })
}
