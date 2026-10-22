import ids from '../../data/league-collections/preItalyCollections.json'
import preDataReg003C from '../../data/league-collections/preDataReg003CCollections.json'
import preDataReg003B from '../../data/league-collections/preDataReg003BCollections.json'
import preEuropeTopV2 from '../../data/league-collections/preEuropeTopV2Collections.json'
import preEuropeTop from '../../data/league-collections/preEuropeTopCollections.json'
import preBalance from '../../data/league-collections/preBalanceCollections.json'
import preMexico from '../../data/league-collections/preMexicoCollections.json'
import { MASTER_CATALOG } from './globalCollection'
import { catalogKey } from '../recruiter-duel/drawHistory'
import type { ThemedModeId } from '../themed-modes/modeTypes'

const master = new Map(MASTER_CATALOG.map(p => [p.id, p]))
/** Frozen memberships: 06a81b4 (before Italy) and 6f0c706 (Italy 200, before the Top-150 rule and Liga MX), b7c2c31 (before legend-balance-v1), a483638 (Europe Actualidad before europe-top-150-v1), 22d3adc (europe-top-150-v1), ad48f05 (Global, Europe and South America before DATA-REG-003B), 670de61 (South America and Europe Legends before DATA-REG-003C); old seeds keep their exact sporting inputs. */
export const RECORDED_COLLECTIONS = Object.entries({ ...ids }).concat(Object.entries(preMexico), Object.entries(preBalance), Object.entries(preEuropeTop), Object.entries(preEuropeTopV2), Object.entries(preDataReg003B), Object.entries(preDataReg003C)).map(([mode, playerIds]) => ({
  mode: mode as ThemedModeId,
  players: playerIds.map(id => {
    const player = master.get(id)
    if (!player) throw Error(`missing_recorded_player:${id}`)
    return player
  }),
}))
const byKey = new Map(RECORDED_COLLECTIONS.map(row => [catalogKey(row.players), row.players]))
export const recordedCollection = (key?: string) => key ? byKey.get(key) : undefined
