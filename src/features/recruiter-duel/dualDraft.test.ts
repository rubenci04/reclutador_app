import { describe, expect, it } from 'vitest'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { personKey } from '../player-catalog/globalCollection'
import { CLASSIC_CONFIG, DISCARDS_MARKER_V2, DISCARDS_V2 } from './matchConfig'
import { buildHudModel } from './hudModel'
import { canDiscard, cpuAct, createDualDraft, currentCard, discardCard, DUAL_DISCARDS_LEGACY, DUAL_SIDES, dualComplete, isSideComplete, sideBudgetLeft, signCard, type DualDraft } from './dualDraft'
import { crossCategoryCatalog, finishDualDraft } from './crossCategoryDraw'

const config = { ...CLASSIC_CONFIG, budget: 120, coaches: true, coachReserve: 8 }
const pair = ['SOUTH_AMERICA_CURRENT', 'EUROPE_CURRENT'] as const
const catalog = crossCategoryCatalog(...pair)
const make = (seed: string) => { const created = createDualDraft(pair[0], pair[1], seed, config); if (!created.ok) throw new Error(created.error); return created.draft }
const play = (start: DualDraft, act: (draft: DualDraft, id: (typeof DUAL_SIDES)[number]) => ReturnType<typeof signCard>) => {
  let draft = start
  for (let guard = 0; guard < 400 && !dualComplete(draft); guard++) for (const id of DUAL_SIDES) if (!isSideComplete(draft.sides[id])) { const result = act(draft, id); if (result.ok) draft = result.draft; else throw new Error(`${id}: ${result.error}`) }
  return draft
}

describe('live draw for two categories', () => {
  it('shows each side a card from its own category', () => {
    const draft = make('dual-1')
    const own = (id: (typeof DUAL_SIDES)[number], mode: string) => new Set(catalogForMode(mode as never).map((p) => p.id)).has(currentCard(draft, id, catalog)!.id)
    expect(own('recruiter_one', pair[0])).toBe(true); expect(own('recruiter_two', pair[1])).toBe(true)
  })
  it.each(['a', 'b', 'c', 'd', 'e', 'f'])('always completes a legal eleven for both sides with the computer deciding (%s)', (seed) => {
    const done = play(make(`cpu-${seed}`), (draft, id) => cpuAct(draft, id, catalog))
    const keys = new Set<string>()
    for (const id of DUAL_SIDES) {
      const players = done.sides[id].signed.map((entry) => catalog.find((p) => p.id === entry.playerId)!)
      expect(players).toHaveLength(11)
      expect(['ARQ', 'DEF', 'MED', 'DEL'].map((position) => players.filter((p) => p.position === position).length)).toEqual([1, 4, 3, 3])
      expect(sideBudgetLeft(done, id)).toBeGreaterThanOrEqual(0)
      players.forEach((p) => { expect(keys.has(personKey(p))).toBe(false); keys.add(personKey(p)) })
    }
  })
  it('allows only three discards and then forces the card, still finishing legally', () => {
    let draft = make('discards')
    for (let n = 0; n < DUAL_DISCARDS_LEGACY; n++) { const result = discardCard(draft, 'recruiter_one', catalog); expect(result.ok).toBe(true); if (result.ok) draft = result.draft }
    expect(draft.sides.recruiter_one.discards).toBe(0)
    expect(canDiscard(draft, 'recruiter_one', catalog)).toBe(false)
    expect(discardCard(draft, 'recruiter_one', catalog)).toEqual({ ok: false, error: 'not_allowed' })
    const done = play(draft, (current, id) => signCard(current, id, catalog))
    expect(dualComplete(done)).toBe(true)
  })
  it('hands the finished elevens to the squad stage', () => {
    const done = play(make('finish'), (draft, id) => cpuAct(draft, id, catalog))
    const created = finishDualDraft(done, pair[0], pair[1])
    expect(created.ok).toBe(true)
    if (created.ok) {
      expect(created.game.phase).toBe('TEAMS_COMPLETED')
      expect(created.game.categoryPair).toEqual({ recruiter_one: pair[0], recruiter_two: pair[1] })
      expect(Object.values(created.game.teams.recruiter_one.lineup).every(Boolean)).toBe(true)
      expect(created.game.teams.recruiter_two.spent).toBe(DUAL_SIDES.length && done.sides.recruiter_two.signed.reduce((sum, e) => sum + e.price, 0))
    }
  })
  describe('five discards in new crossed-category games', () => {
    const modern = { ...config, discards: DISCARDS_MARKER_V2 }
    const makeModern = (seed: string) => { const created = createDualDraft(pair[0], pair[1], seed, modern); if (!created.ok) throw new Error(created.error); return created.draft }
    it('gives each side 5 discards with the marker and keeps 3 only for configurations without it', () => {
      for (const id of DUAL_SIDES) { expect(makeModern('five').sides[id].discards).toBe(DISCARDS_V2); expect(make('three').sides[id].discards).toBe(DUAL_DISCARDS_LEGACY) }
    })
    it('lets a human discard five times, then forces the card, and still finishes legally', () => {
      let draft = makeModern('human-five')
      for (let n = 0; n < DISCARDS_V2; n++) { const result = discardCard(draft, 'recruiter_one', catalog); expect(result.ok).toBe(true); if (result.ok) draft = result.draft }
      expect(draft.sides.recruiter_one.discards).toBe(0)
      expect(discardCard(draft, 'recruiter_one', catalog)).toEqual({ ok: false, error: 'not_allowed' })
      expect(dualComplete(play(draft, (current, id) => signCard(current, id, catalog)))).toBe(true)
    })
    it('never lets the computer discard more than five times', () => {
      for (const seed of ['cpu-a', 'cpu-b', 'cpu-c', 'cpu-d']) {
        let draft = makeModern(seed); const used = { recruiter_one: 0, recruiter_two: 0 }
        for (let guard = 0; guard < 400 && !dualComplete(draft); guard++) for (const id of DUAL_SIDES) if (!isSideComplete(draft.sides[id])) {
          const before = draft.sides[id].discards; const result = cpuAct(draft, id, catalog); if (!result.ok) throw new Error(result.error)
          draft = result.draft; used[id] += before - draft.sides[id].discards
        }
        expect(used.recruiter_one).toBeLessThanOrEqual(DISCARDS_V2); expect(used.recruiter_two).toBeLessThanOrEqual(DISCARDS_V2)
        for (const id of DUAL_SIDES) expect(draft.sides[id].discards).toBeGreaterThanOrEqual(0)
      }
    })
    it('shows no discard counter once the crossed game exists (there is no shared auction to discard in)', () => {
      const done = play(makeModern('hud'), (draft, id) => cpuAct(draft, id, catalog))
      const finished = finishDualDraft(done, pair[0], pair[1]); if (!finished.ok) throw new Error(finished.error)
      expect(finished.game.config?.discards).toBe(DISCARDS_MARKER_V2)
      expect(buildHudModel(finished.game, catalog).discardsTotal).toBe(0)
    })
  })
})
