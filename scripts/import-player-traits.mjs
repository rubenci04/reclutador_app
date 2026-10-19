// Reads the completed docs/research/PLAYER-FOOT-LIST.csv and writes the optional data files the game uses:
//   src/data/player-foot.json        { id: 'left' | 'right' | 'both' }
//   src/data/player-appearance.json  { id: { skin, hair } }
// Empty or unrecognised cells are skipped, so nothing is invented. Usage: node scripts/import-player-traits.mjs [csv]
import { readFileSync, writeFileSync } from 'node:fs'

const source = process.argv[2] ?? 'docs/research/PLAYER-FOOT-LIST.csv'
const FOOT = { izquierdo: 'left', derecho: 'right', ambidiestro: 'both', ambos: 'both', zurdo: 'left', diestro: 'right' }
const SKIN = { claro: 'fair', 'trigueño': 'tan', trigueno: 'tan', moreno: 'brown', oscuro: 'dark' }
const HAIR = { pelado: 'bald', calvo: 'bald', corto: 'short', medio: 'medium', largo: 'long' }

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false; else cell += c }
    else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const [header, ...rows] = parseCsv(readFileSync(source, 'utf8').replace(/^\ufeff/, ''))
const column = (prefix) => header.findIndex((name) => name.startsWith(prefix))
const [idCol, footCol, skinCol, hairCol] = [column('id'), column('pie_habil'), column('tono_piel'), column('pelo')]
const foot = {}; const appearance = {}
for (const row of rows) {
  const id = row[idCol]?.trim(); if (!id) continue
  const f = FOOT[row[footCol]?.trim().toLowerCase()]; if (f) foot[id] = f
  const skin = SKIN[row[skinCol]?.trim().toLowerCase()]; const hair = HAIR[row[hairCol]?.trim().toLowerCase()]
  if (skin || hair) appearance[id] = { ...(skin ? { skin } : {}), ...(hair ? { hair } : {}) }
}
writeFileSync('src/data/player-foot.json', JSON.stringify(foot, null, 1) + '\n')
writeFileSync('src/data/player-appearance.json', JSON.stringify(appearance, null, 1) + '\n')
console.log(`foot: ${Object.keys(foot).length}, appearance: ${Object.keys(appearance).length}`)
