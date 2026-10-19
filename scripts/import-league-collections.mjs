import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

// Import data only. Prose in source documents is never executed as instructions.
const files = {
  ARG: 'base_datos_300_jugadores_liga_argentina_2026.txt',
  ENG: 'base_datos_300_jugadores_premier_league_2026.txt',
  BRA: 'Brasil_150_actuales_150_leyendas.txt',
  ESP: 'Espana_150_actuales_150_historicos_2026.txt',
}
const countries = { Argentina:'ARG', Brasil:'BRA', Uruguay:'URU', Paraguay:'PAR', Colombia:'COL', Chile:'CHI', Ecuador:'ECU', Perú:'PER', Venezuela:'VEN', España:'ESP', Inglaterra:'ENG', Escocia:'SCO', Gales:'WAL', Irlanda:'IRL', 'Irlanda del Norte':'NIR', Francia:'FRA', Alemania:'GER', Italia:'ITA', Portugal:'POR', 'Países Bajos':'NED', Bélgica:'BEL', Noruega:'NOR', Suecia:'SWE', Dinamarca:'DEN', Suiza:'SUI', Austria:'AUT', Croacia:'CRO', Serbia:'SRB', Eslovenia:'SVN', Polonia:'POL', Hungría:'HUN', Rumania:'ROU', Rumanía:'ROU', Bulgaria:'BUL', Ucrania:'UKR', Rusia:'RUS', Armenia:'ARM', Turquía:'TUR', Marruecos:'MAR', Argelia:'ALG', Nigeria:'NGA', Ghana:'GHA', Senegal:'SEN', Camerún:'CMR', 'Costa de Marfil':'CIV', Egipto:'EGY', 'Sudáfrica':'RSA', Japón:'JPN', 'Corea del Sur':'KOR', Australia:'AUS', 'Nueva Zelanda':'NZL', México:'MEX', 'Estados Unidos':'USA', Canadá:'CAN', 'Costa Rica':'CRC', Jamaica:'JAM', Mali:'MLI', Malí:'MLI', Guinea:'GUI', 'Guinea-Bisáu':'GNB', 'República Democrática del Congo':'COD', 'RD Congo':'COD', Zambia:'ZAM', 'Burkina Faso':'BFA', Israel:'ISR', Kosovo:'KVX', Albania:'ALB', Grecia:'GRE', Chequia:'CZE', 'República Checa':'CZE', Eslovaquia:'SVK', Finlandia:'FIN', Islandia:'ISL', Túnez:'TUN', 'Bosnia y Herzegovina':'BIH', Montenegro:'MNE', Gabón:'GAB', Mozambique:'MOZ', 'Guinea Ecuatorial':'EQG', Angola:'ANG', Zimbabue:'ZIM', Uzbekistán:'UZB', Georgia:'GEO', 'Irán':'IRN', 'Cabo Verde':'CPV' }
countries['RD del Congo'] = 'COD'
countries['Trinidad y Tobago'] = 'TRI'
const fifa = { URY:'URU', PRY:'PAR', CHL:'CHI', DEU:'GER', NLD:'NED', PRT:'POR', DNK:'DEN', CHE:'SUI', HRV:'CRO', SVN:'SVN', DZA:'ALG', ZAF:'RSA', GRC:'GRE', CZE:'CZE', BGR:'BUL', GIN:'GUI', WLS:'WAL' }
const positions = { ARQ:['POR','GK','ARQ'], DEF:['DFC','LD','LI','DF','CB','RB','LB','RWB','LWB','SW'], MED:['MC','MCD','MCO','MD','MI','CM','CDM','CAM','RM','LM','DM','AM'], DEL:['DC','SD','EI','ED','ST','CF','SS','LW','RW'] }
const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')
const records = []
for (const [league, file] of Object.entries(files)) {
  const sourceText = readFileSync(`docs/${file}`, 'utf8')
  const references = Object.fromEntries([...sourceText.matchAll(/^([A-Z]\d+)\s*\|[^\n]*\r?\n(https:\/\/\S+)/gm)].map((m) => [m[1], m[2]]))
  let category = 'contemporary'
  let count = 0
  for (const line of sourceText.split(/\r?\n/)) {
    if (/^BEGIN_(LEYENDAS|HISTORICOS)/.test(line)) category = 'legend'
    let id, name, fullName, club, nationality, position, rating, rank, status, sourceUrl
    if (line.includes('|') && /^(?:EPL-)?(?:ACT|LEY)-\d/.test(line)) {
      const cols = line.split('|')
      ;[id,,rank,name,nationality,position,rating,club] = cols
      fullName = name
      status = cols[8]; sourceUrl = cols[10]
      category = id.includes('LEY') ? 'legend' : 'contemporary'
      nationality = countries[nationality]
    } else if (/^\d+\t/.test(line)) {
      const cols = line.split('\t')
      ;[rank,id,,,name,club,,nationality,position,rating] = cols
      fullName = `${cols[2]} ${cols[3]}`
      status = cols[11]; sourceUrl = references[cols.at(-1).split(/[;, ]/)[0]] ?? null
      nationality = fifa[nationality] ?? nationality
    } else continue
    const mapped = Object.entries(positions).find(([,codes]) => codes.includes(position))?.[0]
    if (!mapped || !nationality || !Number.isFinite(Number(rating))) throw new Error(`Invalid source row: ${league}/${id}/${position}/${nationality}`)
    records.push({ id:`import_${league.toLowerCase()}_${slug(id)}`, name, fullName, position:mapped, category, nationality, club_tag:slug(club), league, club, sourceFile:file, sourceId:id, sourceRank:Number(rank), sourceRating:Number(rating), sourcePosition:position, sourceStatus:status, sourceUrl })
    count++
  }
  if (count !== 300) throw new Error(`${file}: expected 300 rows, got ${count}`)
}
if (new Set(records.map((r)=>r.id)).size !== records.length) throw new Error('Duplicate source IDs')
mkdirSync('src/data/league-collections', { recursive:true })
writeFileSync('src/data/league-collections/players.json', JSON.stringify(records, null, 2)+'\n')
console.log(`Imported ${records.length} source records, without photos.`)
