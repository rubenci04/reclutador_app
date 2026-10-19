import { mkdir, writeFile, readFile } from 'node:fs/promises'

// Explicit reviewed identities; never match automatically by surname.
const files = [
  ['Lionel Scaloni', 'Scaloni.jpg'],
  ['Diego Simeone', 'Diego Simeone - 01.jpg'],
  ['Pep Guardiola', 'Pep Guardiola 2021.jpg'],
  ['Carlo Ancelotti', 'Carlo Ancelotti 2016 ICC.jpg'],
  ['Alex Ferguson', 'Alex Ferguson 02.jpg'],
]
const headers = { 'User-Agent': 'DraftLegendsAssetAudit/1.0 (https://github.com/rubenci04/reclutador_app)' }
const source = await readFile('src/features/coaches/coachCatalog.ts', 'utf8')
const rows = [...source.matchAll(/^ {2}\['([^']+)', '([^']+)',/gm)]
const manifest = []
await mkdir('public/assets/coaches', { recursive: true })
const plain = (s = '') => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&')
for (const [name, title] of files) {
  const index = rows.findIndex((row) => `${row[1]} ${row[2]}` === name)
  if (index < 0) throw new Error(`Unknown identity: ${name}`)
  const params = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '250', titles: `File:${title}` })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers })
  if (!response.ok) throw new Error(`Commons metadata: ${response.status}`)
  const data = await response.json()
  const info = Object.values(data.query.pages)[0].imageinfo?.[0]
  const meta = info?.extmetadata
  const license = plain(meta?.LicenseShortName?.value)
  if (!/^CC BY(?:-SA)? /i.test(license) || !meta?.Artist?.value || !meta?.LicenseUrl?.value) throw new Error(`License requires review: ${title}`)
  const image = await fetch(info.thumburl, { headers })
  if (!image.ok || !image.headers.get('content-type')?.startsWith('image/')) throw new Error(`Thumbnail unavailable: ${title}`)
  const id = `coach_${String(index + 1).padStart(3, '0')}`
  const path = `/assets/coaches/${id}.jpg`
  await writeFile(`public${path}`, Buffer.from(await image.arrayBuffer()))
  manifest.push({ coachId: id, name, path, sourceUrl: info.descriptionurl, author: plain(meta.Artist.value), license, licenseUrl: meta.LicenseUrl.value, verifiedAt: '2026-10-19', changes: 'Wikimedia 250px thumbnail; CSS display crop only.' })
  console.log(`${id}: ${name} / ${license}`)
}
await writeFile('src/data/coach-photos.json', `${JSON.stringify(manifest, null, 2)}\n`)
