import { THEMED_MODES } from '../src/features/themed-modes/modes'
import { catalogForMode } from '../src/features/themed-modes/modeCatalog'
const byName = new Map<string, Set<string>>()
for (const m of THEMED_MODES) for (const p of catalogForMode(m.id)) { const s = byName.get(p.name) ?? new Set(); s.add(`${p.id}(${p.category},${p.nationality})`); byName.set(p.name, s) }
for (const [name, ids] of byName) if (ids.size > 1) console.log(name, '=>', [...ids].join(' '))
