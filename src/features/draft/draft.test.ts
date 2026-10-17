import { beforeEach, describe, expect, it } from 'vitest'
import type { Player } from '../../types/player'
import { DRAFT_CATALOG } from './catalog'
import { createEmptyLineup, summarizeDraft, validatePersistedDraft } from './draftModel'
import { createDraftStore } from './draftStore'
import { DRAFT_STORAGE_KEY } from './draftStore'
import { DRAFT_SLOT_IDS, DRAFT_SLOTS } from './draftTypes'
import { PRODUCT } from '../../config/product'

function players(prices: readonly number[] = Array(11).fill(5)): Player[] {
  return DRAFT_SLOTS.map((slot, index) => ({
    id: `plr_${String(index + 1).padStart(3, '0')}`, name: `Player ${index + 1}`, position: slot.position,
    era: '2010s', category: 'contemporary', reference_year: 2018, nationality: 'ARG', club_tag: 'test',
    overall_rating: 80, att_rating: 80, def_rating: 80, phy_rating: 80, men_rating: 80, price: prices[index],
  }))
}

function complete(store: ReturnType<typeof createDraftStore>, catalog: readonly Player[]) {
  for (const slot of DRAFT_SLOTS) store.getState().selectPlayer(slot.id, catalog[DRAFT_SLOTS.indexOf(slot)].id)
}

beforeEach(() => localStorage.clear())

describe('draft domain and state', () => {
  it('starts with the exact 4-3-3 eleven slots and an affordable completion path', () => {
    const lineup = createEmptyLineup()
    expect(Object.keys(lineup)).toEqual([...DRAFT_SLOT_IDS])
    expect(summarizeDraft(lineup, players()).minimumCompletionCost).toBe(55)
  })
  it('uses the 150 real-player catalog as the playable source', () => {
    expect(DRAFT_CATALOG).toHaveLength(150)
    expect(summarizeDraft(createEmptyLineup(), DRAFT_CATALOG).canCompleteWithinBudget).toBe(true)
  })
  it('changes only the commercial name while preserving the legacy saved-draft key', () => {
    expect(PRODUCT.name).toBe('El Reclutador')
    expect(DRAFT_STORAGE_KEY).toBe('draft-legends.draft-v1')
  })
  it('adds a valid player into the matching slot', () => {
    const catalog = players(); const store = createDraftStore(catalog)
    store.getState().selectPlayer('GK', catalog[10].id)
    expect(store.getState().lineup.GK).toBe(catalog[10].id)
  })
  it('rejects a player in a wrong position', () => {
    const catalog = players(); const store = createDraftStore(catalog)
    store.getState().selectPlayer('GK', catalog[0].id)
    expect(store.getState().message).toBe('wrongPosition')
  })
  it('rejects a duplicate already assigned to another slot', () => {
    const catalog = players(); const secondForward = { ...catalog[1], id: 'plr_012', position: 'DEL' as const }
    const store = createDraftStore([...catalog, secondForward])
    store.getState().selectPlayer('LW', catalog[0].id)
    store.getState().selectPlayer('ST', catalog[0].id)
    expect(store.getState().message).toBe('duplicate')
  })
  it('checks the actual total against the 100M budget', () => {
    const catalog = players([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]); const luxury = { ...catalog[10], id: 'plr_099', price: 96 }
    const store = createDraftStore([...catalog, luxury]); complete(store, catalog)
    store.getState().selectPlayer('GK', luxury.id)
    expect(store.getState().message).toBe('overBudget')
  })
  it('blocks an affordable choice that would make the remaining XI impossible to fund', () => {
    const catalog = players([60, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]); const store = createDraftStore(catalog)
    store.getState().selectPlayer('LW', catalog[0].id)
    expect(store.getState().message).toBe('impossibleBudget')
  })
  it('replaces a player after reintegrating the prior player in the budget calculation', () => {
    const catalog = players([30, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]); const upgrade = { ...catalog[0], id: 'plr_099', price: 60 }
    const store = createDraftStore([...catalog, upgrade])
    store.getState().selectPlayer('LW', catalog[0].id)
    store.getState().selectPlayer('LW', upgrade.id)
    expect(store.getState().lineup.LW).toBe(upgrade.id)
  })
  it('removes a player and returns the slot to the draft', () => {
    const catalog = players(); const store = createDraftStore(catalog)
    store.getState().selectPlayer('GK', catalog[10].id); store.getState().removePlayer('GK')
    expect(store.getState().lineup.GK).toBeNull()
  })
  it('does not confirm an incomplete eleven', () => {
    const catalog = players(); const store = createDraftStore(catalog)
    store.getState().confirm()
    expect(store.getState().message).toBe('incomplete')
  })
  it('confirms a complete valid eleven and permits editing it again', () => {
    const catalog = players(); const store = createDraftStore(catalog); complete(store, catalog)
    store.getState().confirm(); expect(store.getState().confirmed).toBe(true)
    store.getState().edit(); expect(store.getState().confirmed).toBe(false)
  })
  it('resets all slots and confirmation state', () => {
    const catalog = players(); const store = createDraftStore(catalog); complete(store, catalog); store.getState().confirm(); store.getState().reset()
    expect(summarizeDraft(store.getState().lineup, catalog).selectedCount).toBe(0)
    expect(store.getState().confirmed).toBe(false)
  })
  it('restores a compatible versioned local draft', () => {
    const catalog = players(); const lineup = createEmptyLineup(); lineup.GK = catalog[10].id
    const restored = validatePersistedDraft({ schema: 1, confirmed: false, lineup }, catalog)
    expect(restored.valid).toBe(true)
  })
  it('rejects persisted drafts with missing IDs, duplicates, invalid schema, or unknown slots', () => {
    const catalog = players(); const lineup = createEmptyLineup(); lineup.GK = 'plr_999'
    expect(validatePersistedDraft({ schema: 1, confirmed: false, lineup }, catalog).valid).toBe(false)
    const duplicate = createEmptyLineup(); duplicate.LW = catalog[0].id; duplicate.ST = catalog[0].id
    expect(validatePersistedDraft({ schema: 1, confirmed: false, lineup: duplicate }, catalog).valid).toBe(false)
    expect(validatePersistedDraft({ schema: 2, confirmed: false, lineup: createEmptyLineup() }, catalog).valid).toBe(false)
    expect(validatePersistedDraft({ schema: 1, confirmed: false, lineup: { ...createEmptyLineup(), extra: null } }, catalog).valid).toBe(false)
  })
})
