import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const file = 'ranking_serie_a_2026_top_200_actuales_y_200_leyendas.txt'
const text = readFileSync(`docs/${file}`, 'utf8')
const countries = { Argentina:'ARG', Italia:'ITA', Francia:'FRA', Turquía:'TUR', Brasil:'BRA', Bélgica:'BEL', Escocia:'SCO', Serbia:'SRB', Croacia:'CRO', 'Estados Unidos':'USA', 'Países Bajos':'NED', Portugal:'POR', Dinamarca:'DEN', Suiza:'SUI', Polonia:'POL', Eslovaquia:'SVK', Inglaterra:'ENG', Camerún:'CMR', 'Costa de Marfil':'CIV', España:'ESP', Ucrania:'UKR', Islandia:'ISL', Alemania:'GER', Ecuador:'ECU', Colombia:'COL', Kosovo:'KVX', Suecia:'SWE', Montenegro:'MNE', Grecia:'GRE', Senegal:'SEN', Rumanía:'ROU', Armenia:'ARM', Nigeria:'NGA', Uruguay:'URU', 'Bosnia y Herzegovina':'BIH', 'Macedonia del Norte':'MKD', 'Guinea-Bisáu':'GNB', 'Guinea Ecuatorial':'EQG', Austria:'AUT', Eslovenia:'SVN', México:'MEX', Noruega:'NOR', Malí:'MLI', 'República Checa':'CZE', Liberia:'LBR', Gales:'WAL', Hungría:'HUN', Chile:'CHI', Georgia:'GEO', Irlanda:'IRL' }
const positions = { POR:'ARQ', DFC:'DEF', LD:'DEF', LI:'DEF', CAD:'DEF', CAI:'DEF', MC:'MED', MCD:'MED', MCO:'MED', MD:'MED', MI:'MED', DC:'DEL', SD:'DEL', EI:'DEL', ED:'DEL' }
const feet = { Derecho:'RIGHT', Izquierdo:'LEFT', Ambidiestro:'BOTH' }
const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const lines = text.split(/\r?\n/).filter((line) => /^\d{3}\s*\|/.test(line))
if (lines.length !== 400) throw Error(`expected_400:${lines.length}`)
const rows = lines.map((line, index) => {
  const cols = line.split('|').map((s) => s.trim()), legend = index >= 200
  const [rank, name, abbreviation, nationality, sourcePosition, foot, club] = cols
  const sourceRating = Number(cols.at(-1)), sourceRank = Number(rank)
  const primary = sourcePosition.match(/\(([^/)]+)/)?.[1]
  if (sourceRank !== index % 200 + 1 || !countries[nationality] || !positions[primary] || !feet[foot] || !Number.isInteger(sourceRating) || sourceRating < 75 || sourceRating > 99 || cols.length !== (legend ? 9 : 8)) throw Error(`invalid_italian_row:${line}`)
  const category = legend ? 'legend' : 'contemporary', sourceId = `ITA-${legend ? 'LEG' : 'ACT'}-${rank}`
  if (legend && !/^\d{4}-\d{4}$/.test(cols[7])) throw Error('invalid_career_period')
  return { id: `import_ita_${legend ? 'leg' : 'act'}_${rank}`, name, fullName: name, abbreviation, position: positions[primary], category, nationality: countries[nationality], club_tag: slug(club), league: 'ITA', club, sourceFile: file, sourceId, sourceRank, sourceRating, sourcePosition, sourceStatus: legend ? 'USER_SUPPLIED_LEGEND' : 'USER_SUPPLIED_CURRENT_2026', sourceUrl: null, dominantFoot: feet[foot], sourceNationality: nationality, sourceFoot: foot, sourceClassification: legend ? 'SERIE_A_LEGEND' : 'SERIE_A_CURRENT', sourceClubPeriod: legend ? cols[7] : null, sourceLine: line, sourceSha256: createHash('sha256').update(text).digest('hex') }
})
for (const category of ['contemporary', 'legend']) {
  const group = rows.filter((r) => r.category === category)
  if (new Set(group.map((r) => slug(r.name))).size !== 200) throw Error('duplicate_source_identity')
}
writeFileSync('src/data/league-collections/italy.json', JSON.stringify(rows, null, 2) + '\n')
console.log('Imported 200 current + 200 legends; source fields preserved, no individual skill invention.')
