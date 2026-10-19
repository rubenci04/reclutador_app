import { LEAGUE_PROVENANCE } from './leagueCollections'
import type { Player } from '../../types/player'
import { ARG_RECORDS } from './argentinaBatches'
import { normalizePlayerName, resolvePlayerIdentity } from './playerIdentity'
import { getClubIdentity } from './clubRegistry'
import { referenceCareers, referenceTeamKey } from './referenceCareers'
const byId = new Map(LEAGUE_PROVENANCE.map((p) => [p.id, p]))
export const importedDetails = (id: string) => byId.get(id)
export const specificPosition = (player: Player) => byId.get(player.id)?.sourcePosition
export const playerCareerReferences = (player: Player) => {
  const reference = importedDetails(player.id)?.club ?? getClubIdentity(player.club_tag)?.name ?? player.club_tag
  const imported = referenceCareers(player.id, reference)
  if (imported.length) return imported
  const identity = resolvePlayerIdentity(player.name)
  const fullName = importedDetails(player.id)?.fullName ?? player.name
  const record = ARG_RECORDS.find((r) => r.id === player.id || normalizePlayerName(r.name) === normalizePlayerName(fullName) || normalizePlayerName(r.name) === normalizePlayerName(player.name) || identity !== undefined && resolvePlayerIdentity(r.name) === identity)
  if (record) return record.careers.flatMap((career) => referenceTeamKey(getClubIdentity(career.clubId)?.name ?? career.clubId) === referenceTeamKey(reference) && career.source.verification === 'verified' && career.source.url && career.startedYear ? [{ club: getClubIdentity(career.clubId)?.name ?? career.clubId, from: career.startedYear, to: career.endedYear ?? null, url: career.source.url }] : [])
  return []
}
