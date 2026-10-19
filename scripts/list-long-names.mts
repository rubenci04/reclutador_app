import { THEMED_MODES } from '../src/features/themed-modes/modes'
import { catalogForMode } from '../src/features/themed-modes/modeCatalog'
const byId = new Map<string, { id: string; name: string; cat: string; nat: string }>()
for (const m of THEMED_MODES) for (const p of catalogForMode(m.id)) byId.set(p.id, { id: p.id, name: p.name, cat: p.category, nat: p.nationality })
const rows = [...byId.values()].filter((p) => p.name.split(/\s+/).length >= 3 || /["'(]/.test(p.name))
console.log(rows.length, 'of', byId.size)
for (const r of rows) console.log(`${r.id}|${r.name}|${r.cat}|${r.nat}`)
