import { loadCatalogV1 } from '../../data/catalog_v1'

const catalog = loadCatalogV1()

if (catalog.status === 'invalid') throw new Error('catalog_v1_unavailable_for_draft')

/** The playable prototype deliberately uses only audited, implemented catalog rows. */
export const DRAFT_CATALOG = catalog.players
