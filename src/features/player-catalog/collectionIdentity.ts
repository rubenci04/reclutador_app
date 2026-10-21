import { LEAGUE_PROVENANCE } from './leagueCollections'
import oldAliases from '../../data/league-collections/identityAliases.json'
import italianAliases from '../../data/league-collections/italyIdentityAliases.json'
import mexicanAliases from '../../data/league-collections/mexicoIdentityAliases.json'
import { playerIdentityKey, resolvePlayerIdentity } from './playerIdentity'
import type { Player } from '../../types/player'
const source = new Map(LEAGUE_PROVENANCE.map((r) => [r.id, r]))
const parent = new Map<string, string>()
const root = (id: string): string => { const next = parent.get(id); return next && next !== id ? root(next) : id }
for (const group of [...oldAliases, ...italianAliases, ...mexicanAliases]) for (const id of group) parent.set(root(id), root(group[0]))
const groups = new Map<string, string[]>()
for (const id of parent.keys()) { const key = root(id); groups.set(key, [...(groups.get(key) ?? []), id]) }
const reviewed = new Map<string, string>()
for (const [key, ids] of groups) {
  const identity = ids.map((id) => source.get(id)).flatMap((r) => r ? [resolvePlayerIdentity(r.fullName), resolvePlayerIdentity(r.name)] : []).find(Boolean)
  for (const id of ids) reviewed.set(id, identity ? `player:${identity}` : `edition:${key}`)
}
/** Full identities and explicit edition aliases only. Never match a surname or merge the two Édersons. */
export function collectionPersonKey(player: Player): string {
  // The supplied Atalanta midfielder is a different person from Ederson Moraes.
  if (player.id === 'import_ita_act_017') return 'person:ederson-atalanta-midfielder'
  const alias = reviewed.get(player.id)
  if (alias) return alias
  const r = source.get(player.id)
  const registered = resolvePlayerIdentity(r?.fullName ?? player.name) ?? resolvePlayerIdentity(player.name)
  return registered ? `player:${registered}` : `${playerIdentityKey(r?.fullName ?? player.name)}:${player.nationality}`
}
export function distinctCollection(players: readonly Player[]): readonly Player[] {
  const seen = new Set<string>()
  return players.filter((p) => { const key = collectionPersonKey(p); if (seen.has(key)) return false; seen.add(key); return true })
}
