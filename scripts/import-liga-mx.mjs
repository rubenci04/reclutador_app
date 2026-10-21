import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const file = 'ranking_liga_mx_2026_top_150_actuales_y_150_leyendas.txt'
const text = readFileSync(`docs/${file}`, 'utf8')
const countries = { México:'MEX', Argentina:'ARG', Brasil:'BRA', Colombia:'COL', Uruguay:'URU', Chile:'CHI', Paraguay:'PAR', Ecuador:'ECU', Perú:'PER', España:'ESP', 'Estados Unidos':'USA', Panamá:'PAN', Francia:'FRA', 'Costa Rica':'CRC', Zambia:'ZAM', Venezuela:'VEN', Portugal:'POR', Marruecos:'MAR', Italia:'ITA', Camerún:'CMR', Bélgica:'BEL' }
const positions = { POR:'ARQ', DFC:'DEF', LD:'DEF', LI:'DEF', CAD:'DEF', CAI:'DEF', MC:'MED', MCD:'MED', MCO:'MED', MD:'MED', MI:'MED', DC:'DEL', SD:'DEL', EI:'DEL', ED:'DEL' }
const feet = { Derecho:'RIGHT', Izquierdo:'LEFT', Ambidiestro:'BOTH' }
const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const lines = text.split(/\r?\n/).filter((line) => /^\d{3}\s*\|/.test(line))
if (lines.length !== 300) throw Error(`expected_300:${lines.length}`)
const sha = createHash('sha256').update(text).digest('hex')
const rows = lines.map((line, index) => {
  const cols = line.split('|').map((s) => s.trim()), legend = index >= 150
  const [rank, name, abbreviation, nationality, sourcePosition, foot, club] = cols
  const sourceRating = Number(cols.at(-1)), sourceRank = Number(rank)
  const primary = sourcePosition.match(/\(([^/)]+)/)?.[1]
  if (sourceRank !== index % 150 + 1 || !countries[nationality] || !positions[primary] || !feet[foot] || !Number.isInteger(sourceRating) || sourceRating < 75 || sourceRating > 99 || cols.length !== (legend ? 9 : 8)) throw Error(`invalid_mexican_row:${line}`)
  if (legend && !/^\d{4}-\d{4}$/.test(cols[7])) throw Error(`invalid_career_period:${line}`)
  const category = legend ? 'legend' : 'contemporary', tag = legend ? 'LEG' : 'ACT'
  return { id: `import_mex_${legend ? 'leg' : 'act'}_${rank}`, name, fullName: name, abbreviation, position: positions[primary], category, nationality: countries[nationality], club_tag: slug(club), league: 'MEX', club, sourceFile: file, sourceId: `MEX-${tag}-${rank}`, sourceRank, sourceRating, sourcePosition, sourceStatus: legend ? 'USER_SUPPLIED_LEGEND' : 'USER_SUPPLIED_CURRENT_2026', sourceUrl: null, dominantFoot: feet[foot], sourceNationality: nationality, sourceFoot: foot, sourceClassification: legend ? 'LIGA_MX_LEGEND' : 'LIGA_MX_CURRENT', sourceClubPeriod: legend ? cols[7] : null, sourceLine: line, sourceSha256: sha }
})
for (const category of ['contemporary', 'legend']) if (new Set(rows.filter((r) => r.category === category).map((r) => slug(r.name))).size !== 150) throw Error('duplicate_source_identity')
writeFileSync('src/data/league-collections/mexico.json', JSON.stringify(rows, null, 2) + '\n')
console.log('Imported 150 current + 150 legends from Liga MX; source fields preserved, no individual skill invention.')
