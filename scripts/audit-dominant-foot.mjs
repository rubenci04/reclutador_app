import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const hash = (value) => createHash('sha256').update(value).digest('hex')
const input = read('docs/reclutador_pie_dominante_1200_importacion.json')
const path = 'src/data/league-collections/players.json'
const rows = read(path)
const baseline = read('docs/qa/DATA-FOOT-001-baseline.json')
const key = (row) => JSON.stringify([row.league, row.sourceId])
const original = { Diestro: 'RIGHT', Zurdo: 'LEFT', Ambidiestro: 'BOTH', 'Sin información': 'UNKNOWN' }
const stripFoot = (value) => JSON.stringify(value, (key, value) => key === 'dominantFoot' ? undefined : value)

assert.equal(input.schemaVersion, 1)
assert.equal(input.metadataOnly, true)
assert.equal(hash(readFileSync(`docs/${input.sourceWorkbook}`)), input.sourceSha256, 'Workbook SHA256 mismatch')
assert.equal(hash(stripFoot(rows)), baseline.provenanceHash, 'Existing provenance changed')
assert.equal(rows.length, 1200)
assert.equal(input.records.length, 1200)
const index = new Map(rows.map((row) => [key(row), row]))
assert.equal(index.size, 1200, 'Duplicate catalog origin key')
const seen = new Set()
const counts = { RIGHT: 0, LEFT: 0, BOTH: 0, UNKNOWN: 0 }
const leagues = { ARG: 0, ENG: 0, BRA: 0, ESP: 0 }
const imported = new Map()
for (const record of input.records) {
  const id = key(record)
  assert(!seen.has(id), `Duplicate import origin key: ${id}`)
  seen.add(id)
  const row = index.get(id)
  assert(row, `Unmapped origin key: ${id}`)
  assert.equal(record.fullName, row.fullName, `Name discrepancy: ${id}`)
  assert.equal(record.sourceRating, row.sourceRating, `OVR discrepancy: ${id}`)
  assert(Object.hasOwn(original, record.dominantFootOriginal), `Unmapped label: ${id}`)
  assert.equal(original[record.dominantFootOriginal], record.dominantFoot, `Foot discrepancy: ${id}`)
  assert(Object.hasOwn(leagues, record.league), `Unknown league: ${id}`)
  counts[record.dominantFoot]++
  leagues[record.league]++
  imported.set(id, record.dominantFoot)
}
assert.deepEqual(counts, { RIGHT: 914, LEFT: 275, BOTH: 11, UNKNOWN: 0 })
assert.deepEqual(leagues, { ARG: 300, ENG: 300, BRA: 300, ESP: 300 })
assert.equal(rows.filter((row) => row.sourceRating < 75).length, 87)
// All checks finish before the only authorized mutation: adding this field.
if (process.argv.includes('--write')) {
  writeFileSync(path, JSON.stringify(rows.map((row) => ({ ...row, dominantFoot: imported.get(key(row)) })), null, 2) + '\n')
}
for (const row of read(path)) assert.equal(row.dominantFoot, imported.get(key(row)), `Missing/wrong foot: ${key(row)}`)
console.info(JSON.stringify({ matched: seen.size, counts, leagues, sourceOvrBelow75: 87, unmapped: 0, discrepancies: [], provenanceUnchanged: true, workbookSha256: input.sourceSha256 }, null, 2))
