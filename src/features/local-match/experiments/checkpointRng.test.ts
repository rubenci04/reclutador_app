import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { createSeededRandom } from '../seededRandom'
import { initialCheckpoint, nextCheckpoint, type RngCheckpoint } from './checkpointRng'
import { simulateMatch, type SimulationInput } from '../simulator'
import { MATCH_MINUTES, MATCH_RULES_VERSION } from '../matchTypes'
import { DRAFT_SLOTS, type DraftLineup } from '../../draft/draftTypes'
import type { Player } from '../../../types/player'

const roundtrip = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

it.each(['', 'resume', 'á⚽', 'negative-state', 'subs-proof'])('resumes the original stream exactly after JSON checkpoints: %s', (seed) => {
  const reference = createSeededRandom(seed)
  let state = initialCheckpoint(seed)
  for (let i = 0; i < 1000; i++) {
    const next = nextCheckpoint(state)
    expect(next.value).toBe(reference())
    state = roundtrip(next.checkpoint)
  }
  expect(state.draws).toBe(1000)
})

it('keeps main and substitution streams independent across logical block boundaries', () => {
  let main = initialCheckpoint('blocks'); let subs = initialCheckpoint('blocks:subs')
  const mainReference = createSeededRandom('blocks'); const subReference = createSeededRandom('blocks:subs')
  for (const minute of MATCH_MINUTES) {
    // Synthetic variable draw counts: this is a stream experiment, not a match implementation.
    for (let draw = 0; draw < minute + 3; draw++) { const next = nextCheckpoint(main); expect(next.value).toBe(mainReference()); main = next.checkpoint }
    if ([45, 60, 75].includes(minute)) for (let draw = 0; draw < minute % 7 + 1; draw++) { const next = nextCheckpoint(subs); expect(next.value).toBe(subReference()); subs = next.checkpoint }
    const restored = roundtrip({ main, subs }); main = restored.main; subs = restored.subs
  }
  expect(nextCheckpoint(main).value).toBe(mainReference()) // includes the final possession draw
  expect(main.draws).not.toBe(subs.draws)
})

it('preserves zero internal state, uint32 wraparound and rejects invalid checkpoints', () => {
  const zero: RngCheckpoint = { algorithm: 'mulberry32-v1', state: 0, draws: 9 }
  expect(nextCheckpoint(roundtrip(zero))).toEqual(nextCheckpoint(zero))
  expect(nextCheckpoint(zero).checkpoint.state).toBe(0x6D2B79F5)
  expect(nextCheckpoint({ ...zero, state: 0xffffffff }).checkpoint.state).toBe(0x6D2B79F4)
  for (const state of [-1, .5, Infinity, NaN, 0x100000000]) expect(() => nextCheckpoint({ ...zero, state })).toThrow('invalid_rng_checkpoint')
  for (const draws of [-1, .1, Number.MAX_SAFE_INTEGER]) expect(() => nextCheckpoint({ ...zero, draws })).toThrow('invalid_rng_checkpoint')
})

// Fixed synthetic inputs, independent from editorial catalogue updates and coach re-ranking.
const players: Player[] = []
const lineups = {} as Record<'local' | 'cpu', DraftLineup>
const benches = {} as Record<'local' | 'cpu', string[]>
for (const [sideIndex, side] of (['local', 'cpu'] as const).entries()) {
  const add = (position: Player['position'], index: number) => {
    const id = `sim004a_${side}_${index}`; const rating = 78 + (index * 3 + sideIndex) % 13
    players.push({ id, name: id, position, era: '2020s', category: 'contemporary', reference_year: 2026, nationality: 'ARG', club_tag: 'SYNTHETIC', overall_rating: rating, att_rating: rating - 2, def_rating: rating - 1, phy_rating: rating, men_rating: rating + 1, price: 5 })
    return id
  }
  lineups[side] = Object.fromEntries(DRAFT_SLOTS.map((slot, index) => [slot.id, add(slot.position, index)])) as DraftLineup
  benches[side] = (['DEF', 'MED', 'DEL'] as const).map((position, i) => add(position, i + 11))
}

it.each([undefined, 'action-v1', 'action-v2', 'action-v3'] as const)('freezes complete legacy results for %s before any incremental extraction', (actionModel) => {
  for (const seed of ['baseline-0', 'baseline-1', 'baseline-2']) for (const automatic of [false, true]) {
    const input: SimulationInput = { catalog: players, localLineup: lineups.local, cpuLineup: lineups.cpu, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed, actionModel, budget: 100, ...(automatic ? { benches, rosterBonus: true, formations: { local: '4-3-3', cpu: '4-3-3' }, tactics: { version: 'tactics-v1', local: 'HIGH_PRESS', cpu: 'COUNTER_ATTACK' }, coaches: { local: { id: 'synthetic-coach', attack: 2, midfield: 1, defense: .5 }, cpu: null } } : {}) }
    const result = simulateMatch(input)
    expect(simulateMatch(roundtrip(input))).toEqual(result)
    expect(createHash('sha256').update(JSON.stringify(result)).digest('hex')).toMatchSnapshot(`${actionModel ?? 'classic'}:${seed}:automatic=${automatic}`)
    expect(result.blocks.flatMap((block) => block.events).filter((event) => event.type === 'attack')).toHaveLength(actionModel === 'action-v1' ? 18 : actionModel ? 24 : 6)
  }
})
