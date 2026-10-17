import manifest from './manifest.json'
import B01 from './batches/B01.json'
import B02 from './batches/B02.json'
import { assembleCatalog } from '../../features/player-catalog/assembleCatalog'

/** Only implemented batches are imported. Manifest order never controls player order. */
export function loadCatalogV1() {
  return assembleCatalog(manifest, { B01, B02 })
}
