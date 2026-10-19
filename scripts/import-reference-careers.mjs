import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

// Exact encyclopedia titles/redirects only. No surname or fuzzy identity matching.
const headers = { 'User-Agent': 'ReclutadorCareerAudit/1.0 (https://github.com/rubenci04/reclutador_app)' }
const cache = join(tmpdir(), 'reclutador-career-audit')
await mkdir(cache, { recursive: true })
const rows = JSON.parse(await readFile('src/data/league-collections/players.json', 'utf8')).filter(p => p.category === 'legend')
const args = (await Promise.all(['01', '02', '03', '04'].map(n => readFile(`src/data/argentina_collection_v1/ARG-B${n}.json`, 'utf8').then(JSON.parse)))).flat().filter(p => p.category === 'legend')
const coachSource = await readFile('src/features/coaches/coachCatalog.ts', 'utf8')
const coaches = [...coachSource.matchAll(/^ {2}\['([^']+)', '([^']+)',/gm)].map((r, i) => ({ id: `coach_${String(i + 1).padStart(3, '0')}`, name: `${r[1]} ${r[2]}` }))
coaches.push({ id: 'coach_lula', name: 'Lula (football manager)' }, { id: 'coach_busby', name: 'Matt Busby' })
const overrides = { 'Diego Armando Maradona': 'Diego Maradona', 'Edson Arantes do Nascimento': 'Pelé', 'Ronaldo Luís Nazário de Lima': 'Ronaldo (Brazilian footballer)', 'Manuel Francisco dos Santos': 'Garrincha', 'José Roberto Gama de Oliveira': 'Bebeto', 'José Mário de Almeida Barros': 'Zé Mário', 'Luiz Felipe Scolari': 'Luiz Felipe Scolari', 'Pep Guardiola': 'Pep Guardiola', 'Frank Kudelka': 'Frank Darío Kudelka' }
Object.assign(overrides, JSON.parse(await readFile('scripts/reference-person-titles.json', 'utf8')))
const people = [...rows, ...args, { id: 'edition_neuer_legend', name: 'Manuel Neuer' }, ...coaches]
const titlesFor = p => [...new Set([overrides[p.fullName ?? p.name], overrides[p.name], p.identityKey?.startsWith('wikipedia:') ? decodeURIComponent(p.identityKey.slice(10)).replaceAll('_', ' ') : undefined, p.fullName, p.name].filter(Boolean))]
const titles = [...new Set(people.flatMap(titlesFor))]
const pages = new Map()
for (let i = 0; i < titles.length; i += 40) {
  const batch = titles.slice(i, i + 40)
  const file = join(cache, `pages-${i}.json`)
  let data
  try { data = JSON.parse(await readFile(file, 'utf8')); if (data.request !== batch.join('|')) data = null } catch { /* uncached */ }
  if (!data) {
    const params = new URLSearchParams({ action: 'query', format: 'json', prop: 'revisions|pageimages', rvprop: 'content|ids', rvslots: 'main', titles: batch.join('|'), piprop: 'name', redirects: '1' })
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers })
    if (!response.ok) throw new Error(`Wikipedia ${response.status}`)
    data = await response.json(); data.request = batch.join('|')
    await writeFile(file, JSON.stringify(data))
  }
  const aliases = new Map([...(data.query.normalized ?? []), ...(data.query.redirects ?? [])].map(a => [a.from, a.to]))
  const resolved = Object.values(data.query.pages)
  for (const title of batch) {
    let canonical = title
    for (let n = 0; n < 5 && aliases.has(canonical); n++) canonical = aliases.get(canonical)
    const page = resolved.find(p => p.title === canonical)
    if (page && !('missing' in page)) pages.set(title, page)
  }
  console.log(`Sources ${Math.min(i + 40, titles.length)}/${titles.length}`)
}
const clean = value => value.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/gi, '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/{{[^{}]*}}/g, '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&ndash;|&#8211;/g, '–').replace(/&mdash;|&#8212;/g, '—').replace(/&amp;/g, '&').replace(/→|\(loan\)/g, '').trim()
const careers = {}; const portraits = []; const unresolved = []
const footballBox = text => {
  const footballStart = text.search(/{{infobox\s+(football biography|footballer)\b/i)
  const start = footballStart < 0 ? text.search(/{{infobox\s+person\b/i) : footballStart
  if (start < 0) return ''
  const braces = /{{|}}/g; braces.lastIndex = start
  let depth = 0; let end = start; let match
  while ((match = braces.exec(text))) {
    depth += match[0] === '{{' ? 1 : -1
    if (!depth) { end = braces.lastIndex; break }
  }
  let box = text.slice(start + 2, end - 2)
  while (/{{[^{}]*}}/.test(box)) box = box.replace(/{{[^{}]*}}/g, '')
  return box
}
for (const person of people) {
  let found = false
  for (const title of titlesFor(person)) {
    const page = pages.get(title); const text = (page?.revisions?.[0]?.slots?.main?.['*'] ?? '').replace(/<ref\b[^>]*\/>/gi, '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    if (!/infobox\s+(football biography|footballer|person)/i.test(text) || !/\|\s*(clubs|managerclubs)\d+\s*=/i.test(text)) continue
    const isCoach = person.id.startsWith('coach_')
    const fields = new Map([...footballBox(text).replace(/(?=\|\s*\w+\s*=)/g, '\n').matchAll(/^\|[ \t]*(\w+)[ \t]*=[ \t]*([^\n]*)/gm)].map(m => [m[1].toLowerCase(), m[2]]))
    const records = []
    for (const [field, value] of fields) {
      const match = field.match(isCoach ? /^managerclubs(\d+)$/ : /^clubs(\d+)$/)
      if (!match) continue
      const years = clean(fields.get(`${isCoach ? 'manageryears' : 'years'}${match[1]}`) ?? '')
      const club = clean(value)
      if (!club || /assistant|youth|reserves|U-?\d|B team/i.test(club)) continue
      for (const spell of years.split(/[,;]/).map(s => s.trim())) {
        const period = spell.match(/^(\d{4})(?:\s*[–—-]\s*(\d{4}|\d{2}|present)?)?$/i)
        if (!period) continue
        const from = Number(period[1]); let to = period[2] === 'present' || /[–—-]$/.test(spell) ? null : Number(period[2] ?? period[1])
        if (period[2]?.length === 2) { to += Math.floor(from / 100) * 100; if (to < from) to += 100 }
        if (from > 2026 || to !== null && (to < from || to > 2026)) continue
        records.push({ club, from, to, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`, revision: page.revisions[0].revid ?? null })
      }
    }
    if (!records.length) continue
    careers[person.id] = records; found = true
    if (isCoach && page.pageimage) portraits.push({ coachId: person.id, name: person.name, filename: page.pageimage, sourceTitle: page.title })
    break
  }
  if (!found) unresolved.push({ id: person.id, name: person.name, fullName: person.fullName })
}
const supplements = JSON.parse(await readFile('scripts/reference-career-overrides.json', 'utf8'))
Object.assign(careers, supplements)
await writeFile('src/data/reference-careers.json', JSON.stringify(careers, null, 2) + '\n')
await writeFile(join(cache, 'coach-portrait-candidates.json'), JSON.stringify(portraits, null, 2))
await writeFile('docs/qa/REFERENCE-CAREERS-import.json', JSON.stringify({ checkedAt: '2026-10-19', records: Object.keys(careers).length, requested: people.length, portraits: portraits.length, supplements: Object.keys(supplements), unresolved: unresolved.filter(person => !careers[person.id]) }, null, 2) + '\n')
console.log(JSON.stringify({ records: Object.keys(careers).length, requested: people.length, portraits: portraits.length, unresolved: unresolved.length }))
// Ship only the reference spells used in the game. Keep the full extraction as evidence.
execFileSync(process.execPath, ['scripts/audit-reference-coverage.cjs', '--compact'], { stdio: 'inherit' })
