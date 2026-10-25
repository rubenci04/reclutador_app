import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const directory = resolve('dist/assets')
const scripts = (await readdir(directory)).filter(file => file.endsWith('.js'))
for (const group of ['vendor', 'supabase', 'recorded-collections']) assert(scripts.some(file => file.startsWith(`${group}-`)), `Missing chunk: ${group}`)
const sizes = await Promise.all(scripts.map(async file => ({ file, bytes: (await stat(resolve(directory, file))).size })))
assert(sizes.every(chunk => chunk.bytes <= 500_000), 'A JavaScript chunk exceeds the default 500 kB warning threshold')

// Exercise the emitted data modules, including Rolldown's execution-order initializers.
const parts = scripts.filter(file => /^collection-players-\d+-/.test(file)).sort((a, b) => Number(a.split('-')[2]) - Number(b.split('-')[2]))
assert(parts.length > 1, 'Missing build-time partition of the canonical league rows')
const rows = []
for (const file of parts) {
  const module = await import(pathToFileURL(resolve(directory, file)).href)
  for (const value of Object.values(module)) if (typeof value === 'function') value()
  const data = Object.values(module).find(Array.isArray)
  assert(data, `Missing data array: ${file}`)
  rows.push(...data)
}
const source = JSON.parse(await readFile('src/data/league-collections/players.json', 'utf8'))
assert.deepEqual(rows, source, 'Production data differs from the canonical source or changes row order')
console.log(JSON.stringify({ chunks: scripts.length, largest: sizes.sort((a, b) => b.bytes - a.bytes)[0], partitionedRows: rows.length, dataMatchesSource: true }, null, 2))
