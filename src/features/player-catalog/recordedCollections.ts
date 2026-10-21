import ids from '../../data/league-collections/preItalyCollections.json'
import preMexico from '../../data/league-collections/preMexicoCollections.json'
import { MASTER_CATALOG } from './globalCollection'
import { catalogKey } from '../recruiter-duel/drawHistory'
import type { ThemedModeId } from '../themed-modes/modeTypes'

const master = new Map(MASTER_CATALOG.map(p => [p.id, p]))
/** Frozen memberships: 06a81b4 (before Italy) and 6f0c706 (Italy 200, before the Top-150 rule and Liga MX); old seeds keep their exact sporting inputs. */
export const RECORDED_COLLECTIONS = Object.entries({ ...ids }).concat(Object.entries(preMexico)).map(([mode, playerIds]) => ({
  mode: mode as ThemedModeId,
  players: playerIds.map(id => {
    const player = master.get(id)
    if (!player) throw Error(`missing_recorded_player:${id}`)
    return player
  }),
}))
const byKey = new Map(RECORDED_COLLECTIONS.map(row => [catalogKey(row.players), row.players]))
export const recordedCollection = (key?: string) => key ? byKey.get(key) : undefined
