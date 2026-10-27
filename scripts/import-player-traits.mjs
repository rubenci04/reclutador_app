// Reads the completed docs/research/PLAYER-FOOT-LIST.csv and writes the optional data files the game uses:
//   src/data/player-foot.json        { id: 'left' | 'right' | 'both' }
//   src/data/player-appearance.json  { id: { skin, hair, hc (hair colour), tx (texture), fh (facial hair), fc (face shape), bd (build), mk (mark), ea (ears) } }
// The foot file is only rewritten when the CSV has a pie_habil column (docs/JUGADORES-APARIENCIA-COMPLETO.csv has appearance only).
// Every value is hand-entered editorial data: nothing is inferred from photos.
// Empty or unrecognised cells are skipped, so nothing is invented. Usage: node scripts/import-player-traits.mjs [csv]
import { readFileSync, writeFileSync } from 'node:fs'

const source = process.argv[2] ?? 'docs/research/PLAYER-FOOT-LIST.csv'
const FOOT = { izquierdo: 'left', derecho: 'right', ambidiestro: 'both', ambos: 'both', zurdo: 'left', diestro: 'right' }
const SKIN = { claro: 'fair', 'trigueño': 'tan', trigueno: 'tan', moreno: 'brown', oscuro: 'dark' }
const HAIR = { pelado: 'bald', calvo: 'bald', corto: 'short', medio: 'medium', largo: 'long' }
const COLOR = { negro: 'black', castaño: 'brown', castano: 'brown', rubio: 'blonde', pelirrojo: 'red', canoso: 'gray', blanco: 'white' }
const TEXTURE = { liso: 'straight', ondulado: 'wavy', rizado: 'curly', crespo: 'coily' }
const FACIAL = { ninguno: 'none', bigote: 'mustache', 'barba corta': 'stubble', 'barba larga': 'beard', candado: 'goatee', patillas: 'sideburns' }
const FACE = { ovalada: 'oval', redonda: 'round', cuadrada: 'square', alargada: 'long', triangular: 'triangle' }
const BUILD = { flaco: 'thin', delgado: 'slim', 'atlético': 'athletic', atletico: 'athletic', musculoso: 'muscular', robusto: 'stocky' }
const EARS = { 'pequeñas': 'small', pequenas: 'small', medianas: 'medium', grandes: 'large' }
/** Free text of the CSV to one drawable mark. */
const markOf = (text) => /^\s*sin\b/i.test(text) ? undefined : /cicatriz/i.test(text) ? 'scar' : /lunar/i.test(text) ? 'mole' : /tatuaje/i.test(text) ? 'tattoo' : /cejas/i.test(text) ? 'brows' : undefined

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
const [colorCol, textureCol, facialCol, faceCol, buildCol, earsCol, markCol] = [column('color_pelo'), column('textura_pelo'), column('vello_facial'), column('forma_cara'), column('porte_fisico'), column('tamano_orejas'), column('lunar_o_cicatriz')]
const pick = (map, row, col) => col < 0 ? undefined : map[row[col]?.trim().toLowerCase()]
const foot = {}; const appearance = {}
for (const row of rows) {
  const id = row[idCol]?.trim(); if (!id) continue
  const f = footCol < 0 ? undefined : FOOT[row[footCol]?.trim().toLowerCase()]; if (f) foot[id] = f
  const skin = SKIN[row[skinCol]?.trim().toLowerCase()]; const hair = HAIR[row[hairCol]?.trim().toLowerCase()]
  const extra = { hc: pick(COLOR, row, colorCol), tx: pick(TEXTURE, row, textureCol), fh: pick(FACIAL, row, facialCol), fc: pick(FACE, row, faceCol), bd: pick(BUILD, row, buildCol), ea: pick(EARS, row, earsCol), mk: markCol < 0 ? undefined : markOf(row[markCol] ?? '') }
  const record = { ...(skin ? { skin } : {}), ...(hair ? { hair } : {}), ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value)) }
  if (Object.keys(record).length) appearance[id] = record
}
if (footCol >= 0) writeFileSync('src/data/player-foot.json', JSON.stringify(foot, null, 1) + '\n')
writeFileSync('src/data/player-appearance.json', JSON.stringify(appearance) + '\n')
console.log(`foot: ${Object.keys(foot).length}, appearance: ${Object.keys(appearance).length}`)
