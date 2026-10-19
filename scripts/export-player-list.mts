// Exports every playable footballer (all modes, de-duplicated by id) to CSV so the preferred foot can be researched.
import { writeFileSync } from 'node:fs'
import { THEMED_MODES } from '../src/features/themed-modes/modes'
import { catalogForMode } from '../src/features/themed-modes/modeCatalog'
import type { Player } from '../src/types/player'

const byId = new Map<string, Player>()
for (const mode of THEMED_MODES) for (const player of catalogForMode(mode.id)) byId.set(player.id, player)
const esc = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
const rows = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
const header = ['id', 'nombre', 'posicion', 'categoria', 'nacionalidad', 'club', 'anio_referencia', 'pie_habil (izquierdo|derecho|ambidiestro)', 'tono_piel (claro|trigueño|moreno|oscuro)', 'pelo (pelado|corto|medio|largo)', 'fuente_url']
writeFileSync('docs/research/PLAYER-FOOT-LIST.csv', '\ufeff' + [header.map(esc).join(','), ...rows.map((p) => [p.id, p.name, p.position, p.category, p.nationality, p.club_tag, p.reference_year, '', '', '', ''].map(esc).join(','))].join('\r\n') + '\r\n')
console.log(rows.length)
