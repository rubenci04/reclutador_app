const fs = require('node:fs')
const ts = require('typescript')
// Execute the actual domain functions; keep aliases and filtering in one place.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true } }).outputText, filename)
const rows = require('../src/data/league-collections/players.json')
const { playerCareerReferences } = require('../src/features/player-catalog/playerDetails')
const { coachesForMode } = require('../src/features/coaches/coachContext')
const { referenceCareers, referenceTeamKey } = require('../src/features/player-catalog/referenceCareers')
const legends = rows.filter(player => player.category === 'legend')
const missingPlayers = legends.filter(player => !playerCareerReferences(player).length).map(player => ({ id: player.id, name: player.name, club: player.club }))
const modes = ['GLOBAL_CLASSIC', 'LEGENDS_ONLY', 'ARGENTINA_CURRENT', 'ARGENTINA_LEGENDS', 'BRAZIL_CURRENT', 'BRAZIL_LEGENDS', 'SPAIN_LEAGUE', 'SPAIN_LEGENDS', 'ENGLAND_LEAGUE', 'ENGLAND_LEGENDS', 'SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS']
const missing = new Map()
for (const mode of modes) for (const coach of coachesForMode(mode)) for (const team of [coach.team, coach.secondaryTeam].filter(Boolean)) {
  if (!referenceCareers(coach.id, team).length) missing.set(`${coach.id}:${team}`, { id: coach.id, name: `${coach.name} ${coach.surname}`, team })
}
const result = { checkedAt: '2026-10-19', legendCards: legends.length, coveredLegendCards: legends.length - missingPlayers.length, missingPlayers, missingCoachReferences: [...missing.values()] }
fs.writeFileSync('docs/qa/REFERENCE-COVERAGE.json', JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
if (process.argv.includes('--compact')) {
  const sourcePath = 'src/data/reference-careers.json'
  const records = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  const archivePath = 'docs/research/REFERENCE-CAREERS-sources.json'
  const archived = fs.existsSync(archivePath) ? JSON.parse(fs.readFileSync(archivePath, 'utf8')) : {}
  if (Object.values(records).flat().length >= Object.values(archived).flat().length) fs.writeFileSync(archivePath, JSON.stringify(records, null, 2) + '\n')
  const targets = new Map()
  const add = (id, team) => targets.set(id, [...(targets.get(id) ?? []), referenceTeamKey(team)])
  for (const player of legends) add(player.id, player.club)
  const { ARG_RECORDS } = require('../src/features/player-catalog/argentinaBatches')
  const { getClubIdentity } = require('../src/features/player-catalog/clubRegistry')
  for (const player of ARG_RECORDS) add(player.id, getClubIdentity(player.club_tag)?.name ?? player.club_tag)
  add('edition_neuer_legend', 'Bayern Munich')
  for (const mode of modes) for (const coach of coachesForMode(mode)) for (const team of [coach.team, coach.secondaryTeam].filter(Boolean)) add(coach.id, team)
  const compact = Object.fromEntries(Object.entries(records).flatMap(([id, periods]) => {
    const kept = periods.filter(period => targets.get(id)?.includes(referenceTeamKey(period.club)))
    return kept.length ? [[id, kept]] : []
  }))
  fs.writeFileSync(sourcePath, JSON.stringify(compact, null, 2) + '\n')
}
