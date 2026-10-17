import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Player } from '../../types/player'
import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import { DRAFT_SLOTS, type DraftLineup, type DraftMessageCode, type DraftSlotId } from './draftTypes'
import { DRAFT_STORAGE_VERSION, createEmptyLineup, playerById, summarizeDraft, validatePersistedDraft } from './draftModel'
import { PRODUCT } from '../../config/product'

/** Stable legacy key: renaming the product must not discard saved local drafts. */
export const DRAFT_STORAGE_KEY = PRODUCT.technicalDraftStorageKey

export interface DraftStore {
  readonly lineup: DraftLineup
  readonly confirmed: boolean
  readonly message: DraftMessageCode | null
  readonly restoreIssue: boolean
  selectPlayer(slotId: DraftSlotId, playerId: string): void
  removePlayer(slotId: DraftSlotId): void
  reset(): void
  confirm(): void
  edit(): void
  clearMessage(): void
  clearRestoreIssue(): void
}

export function createDraftStore(catalog: readonly Player[]) {
  const byId = playerById(catalog)
  return create<DraftStore>()(persist((set, get) => ({
    lineup: createEmptyLineup(), confirmed: false, message: null, restoreIssue: false,
    selectPlayer: (slotId, playerId) => {
      const slot = DRAFT_SLOTS.find((candidate) => candidate.id === slotId)
      const player = byId.get(playerId)
      if (!slot || !player) return set({ message: 'invalidPlayer' })
      if (player.position !== slot.position) return set({ message: 'wrongPosition' })
      const current = get().lineup
      if (current[slotId] !== playerId && Object.entries(current).some(([id, selected]) => id !== slotId && selected === playerId)) {
        return set({ message: 'duplicate' })
      }
      const lineup = { ...current, [slotId]: playerId }
      const summary = summarizeDraft(lineup, catalog)
      if (summary.spent > DRAFT_BUDGET_MILLIONS) return set({ message: 'overBudget' })
      if (!summary.canCompleteWithinBudget) return set({ message: 'impossibleBudget' })
      set({ lineup, confirmed: false, message: null })
    },
    removePlayer: (slotId) => set({ lineup: { ...get().lineup, [slotId]: null }, confirmed: false, message: null }),
    reset: () => set({ lineup: createEmptyLineup(), confirmed: false, message: null }),
    confirm: () => {
      const summary = summarizeDraft(get().lineup, catalog)
      if (!summary.canConfirm) return set({ message: summary.selectedCount === DRAFT_SLOTS.length ? 'overBudget' : 'incomplete' })
      set({ confirmed: true, message: null })
    },
    edit: () => set({ confirmed: false, message: null }),
    clearMessage: () => set({ message: null }), clearRestoreIssue: () => set({ restoreIssue: false }),
  }), {
    name: DRAFT_STORAGE_KEY, version: DRAFT_STORAGE_VERSION, storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ schema: DRAFT_STORAGE_VERSION, lineup: state.lineup, confirmed: state.confirmed }),
    merge: (persisted, current) => {
      const restored = validatePersistedDraft(persisted, catalog)
      return restored.valid ? { ...current, lineup: restored.lineup, confirmed: restored.confirmed } : { ...current, restoreIssue: persisted !== undefined }
    },
  }))
}
