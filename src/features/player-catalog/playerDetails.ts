import { LEAGUE_PROVENANCE } from './leagueCollections'
import type { Player } from '../../types/player'
import { ARG_RECORDS } from './argentinaBatches'
import { normalizePlayerName, resolvePlayerIdentity } from './playerIdentity'
import { getClubIdentity } from './clubRegistry'
const byId = new Map(LEAGUE_PROVENANCE.map((p) => [p.id, p]))
export const importedDetails = (id: string) => byId.get(id)
export const specificPosition = (player: Player) => byId.get(player.id)?.sourcePosition
export const playerCareerReferences = (player: Player) => {
  if (/Messi/.test(player.name)) return [{ club: 'FC Barcelona', from: 2004, to: 2021, url: 'https://players.fcbarcelona.com/en/player/548-messi-lionel-andres-messi-cuccitini' }]
  if (/Cristiano/.test(player.name)) return [{ club: 'Real Madrid', from: 2009, to: 2018, url: 'https://www.realmadrid.com/en-US/the-club/history/football-legends/cristiano-ronaldo-dos-santos-aveiro' }]
  if (/Neuer/.test(player.name)) return [{ club: 'FC Bayern München', from: 2011, to: null, url: 'https://fcbayern.com/en/teams/first-team/manuel-neuer' }]
  const identity = resolvePlayerIdentity(player.name)
  const fullName = importedDetails(player.id)?.fullName ?? player.name
  const record = ARG_RECORDS.find((r) => r.id === player.id || normalizePlayerName(r.name) === normalizePlayerName(fullName) || normalizePlayerName(r.name) === normalizePlayerName(player.name) || identity !== undefined && resolvePlayerIdentity(r.name) === identity)
  if (record) return record.careers.flatMap((career) => career.source.verification === 'verified' && career.source.url && career.startedYear ? [{ club: getClubIdentity(career.clubId)?.name ?? career.clubId, from: career.startedYear, to: career.endedYear ?? null, url: career.source.url }] : [])
  return []
}
