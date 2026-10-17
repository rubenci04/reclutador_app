import { DRAFT_CATALOG } from './catalog'
import { createDraftStore } from './draftStore'

/** Shared browser state. The factory remains exported for deterministic domain tests. */
export const useDraftStore = createDraftStore(DRAFT_CATALOG)
