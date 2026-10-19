import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const headers = { 'User-Agent': 'ReclutadorCareerAudit/1.0 (https://github.com/rubenci04/reclutador_app)' }
const candidates = JSON.parse(await readFile(join(tmpdir(), 'reclutador-career-audit/coach-portrait-candidates.json'), 'utf8'))
const manifest = JSON.parse(await readFile('src/data/coach-photos.json', 'utf8'))
// Reviewed alternate portraits where the encyclopedia's default has a different license.
for (const candidate of candidates) {
  if (candidate.coachId === 'coach_019') candidate.filename = 'Jorge Almirón (cropped).JPG'
  if (candidate.coachId === 'coach_047') candidate.filename = 'Allegri Milan cropped.jpg'
}
const skipped = []
const plain = (s = '') => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'")
for (let i = 0; i < candidates.length; i += 10) {
  const batch = candidates.slice(i, i + 10).filter(p => !manifest.some(m => m.coachId === p.coachId))
  if (!batch.length) continue
  const params = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '250', titles: batch.map(p => `File:${p.filename}`).join('|') })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers })
  if (!response.ok) throw new Error(`Commons: ${response.status}`)
  const data = await response.json()
  for (const candidate of batch) {
    const info = Object.values(data.query.pages).find(p => p.title.replaceAll('_', ' ') === `File:${candidate.filename.replaceAll('_', ' ')}`)?.imageinfo?.[0]
    const meta = info?.extmetadata
    const license = plain(meta?.LicenseShortName?.value)
    if (!/^(CC BY(?:-SA)? |CC0|Public domain)/i.test(license) || !meta?.Artist?.value) { skipped.push({ ...candidate, reason: `No reusable Commons license: ${license}` }); continue }
    const image = await fetch(info.thumburl, { headers })
    if (!image.ok || !image.headers.get('content-type')?.startsWith('image/')) { skipped.push({ ...candidate, reason: `Thumbnail: ${image.status}` }); continue }
    const extension = image.headers.get('content-type')?.includes('png') ? 'png' : image.headers.get('content-type')?.includes('webp') ? 'webp' : 'jpg'
    const path = `/assets/coaches/${candidate.coachId}.${extension}`
    await writeFile(`public${path}`, Buffer.from(await image.arrayBuffer()))
    manifest.push({ coachId: candidate.coachId, name: candidate.name, path, sourceUrl: info.descriptionurl, author: plain(meta.Artist.value), license, licenseUrl: meta.LicenseUrl?.value ?? 'https://commons.wikimedia.org/wiki/Commons:Public_domain', verifiedAt: '2026-10-19', changes: 'Wikimedia 250px thumbnail; CSS display crop only.' })
    console.log(`${candidate.coachId}: ${candidate.name} / ${license}`)
  }
  await writeFile('src/data/coach-photos.json', JSON.stringify(manifest.sort((a, b) => a.coachId.localeCompare(b.coachId)), null, 2) + '\n')
}
await writeFile('docs/qa/COACH-PHOTO-import.json', JSON.stringify({ checkedAt: '2026-10-19', imported: manifest.length, skipped, unavailable: [{ coachId: 'coach_023', name: 'Julio Vaccari', reason: 'No reusable portrait found on Wikipedia/Commons.' }, { coachId: 'coach_026', name: 'Ariel Holan', reason: 'No reusable portrait found on Wikipedia/Commons.' }] }, null, 2) + '\n')
console.log(JSON.stringify({ imported: manifest.length, skipped: skipped.length }))
