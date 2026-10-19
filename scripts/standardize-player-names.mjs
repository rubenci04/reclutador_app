// Rewrites the display `name` of players to the name they are commonly known by (shirt / press name).
// `fullName` and every other field stay untouched, so identity matching and biographies keep their data.
// Usage: node scripts/standardize-player-names.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'del', 'della', 'di', 'van', 'von', 'der', 'den', 'la', 'le', 'lo', 'el', 'al', 'bin', 'mac', 'ter', 'ten'])
const COMPOUND_FIRST = new Set(['josé luis', 'josé maría', 'josé mari', 'josé antonio', 'josé ángel', 'josé ramón', 'josé manuel', 'josé eulogio', 'juan carlos', 'juan pablo', 'juan josé', 'juan román', 'juan ramón', 'juan manuel', 'miguel ángel', 'luis ángel'])

/** Exact common names, by id, where the automatic rule cannot know which surname people use. */
const OVERRIDES = {
  // Argentine league, current
  import_arg_act_018: 'Sebastián Villa', import_arg_act_028: 'Lucas Martínez Quarta', import_arg_act_052: 'Hernán López', import_arg_act_056: 'Leandro González Pírez',
  import_arg_act_098: 'Gastón Benedetti', import_arg_act_103: 'Ignacio Russo', import_arg_act_116: 'Chimy Ávila', import_arg_act_125: 'Nicolás Barros Schelotto',
  import_arg_act_133: 'Santiago López', import_arg_act_145: 'Pol Fernández', import_arg_act_147: 'José María Canale', import_arg_act_106: 'Juan Pablo Cozzani',
  import_arg_act_128: 'Rick Morais', import_arg_act_080: 'Baltasar Rodríguez',
  // Argentine league, legends
  import_arg_ley_005: 'Enzo Francescoli', import_arg_ley_010: 'José Luis Chilavert', import_arg_ley_011: 'Juan Román Riquelme', import_arg_ley_025: 'Sebastián Verón',
  import_arg_ley_072: 'Juan Ramón Verón', import_arg_ley_031: 'Delfín Benítez Cáceres', import_arg_ley_038: 'Marcelo Salas', import_arg_ley_041: 'Miguel Ángel Brindisi',
  import_arg_ley_056: 'Antonio Alzamendi', import_arg_ley_057: 'Antonio Rattín', import_arg_ley_058: 'Carlos Navarro Montoya', import_arg_ley_069: 'Isidro Lángara',
  import_arg_ley_076: 'Oscar Más', import_arg_ley_078: 'Paulo Silas', import_arg_ley_084: 'Sergio Villar', import_arg_ley_086: 'Ángel Rojas', import_arg_ley_093: 'Celso Ayala',
  import_arg_ley_121: 'Mario Boyé', import_arg_ley_122: 'Maxi Rodríguez', import_arg_ley_127: 'Ricardo Infante', import_arg_ley_135: 'Albeiro Usuriaga',
  import_arg_ley_149: 'José González', import_arg_ley_066: 'Guillermo Barros Schelotto', import_arg_ley_113: 'Juan Pablo Ángel', import_arg_ley_137: 'Alejandro Sabella',
  // English league, current
  import_eng_epl_act_005: 'David Raya', import_eng_epl_act_013: 'Bruno Guimarães', import_eng_epl_act_019: 'Moisés Caicedo', import_eng_epl_act_021: 'Marc Guéhi',
  import_eng_epl_act_025: 'Emiliano Martínez', import_eng_epl_act_038: 'Ezri Konsa', import_eng_epl_act_041: 'Martín Zubimendi', import_eng_epl_act_042: 'Matheus Cunha',
  import_eng_epl_act_044: 'Phil Foden', import_eng_epl_act_045: 'Piero Hincapié', import_eng_epl_act_050: 'João Pedro', import_eng_epl_act_053: 'Mikel Merino',
  import_eng_epl_act_057: 'Pedro Porro', import_eng_epl_act_058: 'Ronald Araújo', import_eng_epl_act_064: 'Daniel Muñoz', import_eng_epl_act_066: 'Estêvão',
  import_eng_epl_act_068: 'Igor Thiago', import_eng_epl_act_075: 'Marcos Senesi', import_eng_epl_act_079: 'Murillo', import_eng_epl_act_087: 'Ben White',
  import_eng_epl_act_101: 'Matt Cash', import_eng_epl_act_107: 'Nico González', import_eng_epl_act_108: 'Nordi Mukiele', import_eng_epl_act_122: 'Chris Wood',
  import_eng_epl_act_123: 'Noni Madueke', import_eng_epl_act_124: 'Dominic Solanke', import_eng_epl_act_128: 'Destiny Udogie', import_eng_epl_act_132: 'Joelinton',
  import_eng_epl_act_137: 'Rodrigo Bentancur', import_eng_epl_act_141: 'Óscar Mingueza', import_eng_epl_act_145: 'Evanilson', import_eng_epl_act_011: 'Rúben Dias',
  import_eng_epl_act_003: 'Gabriel Magalhães', import_eng_epl_act_085: 'Amadou Onana', import_eng_epl_act_002: 'Bruno Fernandes', import_eng_epl_act_009: 'Alisson Becker',
  // English league, legends
  import_eng_epl_ley_001: 'Cristiano Ronaldo', import_eng_epl_ley_005: 'Bobby Charlton', import_eng_epl_ley_006: 'Jimmy Greaves', import_eng_epl_ley_008: 'Luis Suárez',
  import_eng_epl_ley_009: 'Mohamed Salah', import_eng_epl_ley_010: 'Bobby Moore', import_eng_epl_ley_011: 'Kenny Dalglish', import_eng_epl_ley_012: 'Stanley Matthews',
  import_eng_epl_ley_014: 'Dixie Dean', import_eng_epl_ley_023: 'Rodri', import_eng_epl_ley_026: 'Sergio Agüero', import_eng_epl_ley_030: 'David Silva',
  import_eng_epl_ley_032: 'Didier Drogba', import_eng_epl_ley_038: 'Kevin Keegan', import_eng_epl_ley_043: 'Tom Finney', import_eng_epl_ley_044: 'Steve Bloomer',
  import_eng_epl_ley_048: 'Andy Cole', import_eng_epl_ley_049: 'Bernardo Silva', import_eng_epl_ley_052: 'Cesc Fàbregas', import_eng_epl_ley_053: 'Claude Makelele',
  import_eng_epl_ley_070: 'Billy Wright', import_eng_epl_ley_073: 'Charlie Buchan', import_eng_epl_ley_075: 'César Azpilicueta', import_eng_epl_ley_076: 'David de Gea',
  import_eng_epl_ley_077: 'Ederson', import_eng_epl_ley_078: 'Fernando Torres', import_eng_epl_ley_084: 'Matt Le Tissier', import_eng_epl_ley_087: 'Nat Lofthouse',
  import_eng_epl_ley_090: 'Ricardo Carvalho', import_eng_epl_ley_092: 'Robbie Fowler', import_eng_epl_ley_096: 'Xabi Alonso', import_eng_epl_ley_099: 'Casemiro',
  import_eng_epl_ley_101: 'Diego Costa', import_eng_epl_ley_104: 'Edinson Cavani', import_eng_epl_ley_105: 'Teddy Sheringham', import_eng_epl_ley_106: 'Fernandinho',
  import_eng_epl_ley_107: 'Fabinho', import_eng_epl_ley_109: 'Gilberto Silva', import_eng_epl_ley_112: 'Jimmy Floyd Hasselbaink', import_eng_epl_ley_113: 'Juan Mata',
  import_eng_epl_ley_116: 'Les Ferdinand', import_eng_epl_ley_127: 'Roberto Firmino', import_eng_epl_ley_128: 'Romelu Lukaku', import_eng_epl_ley_130: 'Santi Cazorla',
  import_eng_epl_ley_131: 'Jay-Jay Okocha', import_eng_epl_ley_132: 'Bert Trautmann', import_eng_epl_ley_143: 'Pepe Reina', import_eng_epl_ley_148: 'Lauren',
  import_eng_epl_ley_150: 'Mousa Dembélé', import_eng_epl_ley_081: 'Jamie Vardy', import_eng_epl_ley_095: 'Trent Alexander-Arnold', import_eng_epl_ley_094: 'Thibaut Courtois',
  // Brazil and Spain legends
  import_bra_bra_leg_carlos_alberto_torres: 'Carlos Alberto', import_bra_bra_leg_paulo_cezar_lima: 'Paulo Cézar Caju', import_bra_bra_leg_luiz_trochillo: 'Luizinho Pequeno Polegar',
  import_esp_esp_act_inigo_ruiz_de_galarreta_etxeberria: 'Iñigo Ruiz de Galarreta', import_esp_esp_act_jose_maria_gimenez_de_vargas: 'José María Giménez',
  import_esp_esp_leg_luis_suarez_miramontes: 'Luis Suárez Miramontes', import_esp_esp_leg_jose_eulogio_garate_ormaechea: 'José Eulogio Gárate',
  // Argentina collection v1
  arg_026: 'Sebastián Verón', arg_142: 'Julio Cruz', arg_006: 'Carlos Navarro Montoya', arg_076: 'Guillermo Barros Schelotto', arg_166: 'Ramiro Funes Mori', arg_167: 'Lucas Martínez Quarta',
}

export function commonName(id, name) {
  if (Object.hasOwn(OVERRIDES, id)) return OVERRIDES[id]
  const nick = name.match(/\(([^)]+)\)/)
  if (nick) return nick[1].trim()
  const tokens = name.trim().split(/\s+/)
  if (tokens.length <= 2) return name
  let start = tokens.length - 1
  while (start > 1 && PARTICLES.has(tokens[start - 1].toLowerCase())) start--
  const surname = tokens.slice(start)
  const compound = tokens.length >= 3 && COMPOUND_FIRST.has(`${tokens[0]} ${tokens[1]}`.toLowerCase()) && start > 1
  const first = compound ? `${tokens[0]} ${tokens[1]}` : tokens[0]
  // "Juan Román Riquelme": the compound already is the first name and the last token the surname.
  if (compound && start === 2) return name
  return [first, ...surname].join(' ')
}

const dry = process.argv.includes('--dry')
const files = ['src/data/league-collections/players.json', ...readdirSync('src/data/argentina_collection_v1').map((f) => `src/data/argentina_collection_v1/${f}`)]
let changed = 0
for (const file of files) {
  let text = readFileSync(file, 'utf8')
  const rows = JSON.parse(text)
  for (const row of rows) {
    const next = commonName(row.id, row.name)
    if (next === row.name) continue
    const pattern = new RegExp(`("id": "${row.id}",\\s*"name": ")${row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(")`)
    if (!pattern.test(text)) throw new Error(`pattern not found for ${row.id}`)
    text = text.replace(pattern, `$1${next}$2`); changed++
    if (dry) console.log(`${row.id}: ${row.name} -> ${next}`)
  }
  if (!dry) writeFileSync(file, text)
}
console.log(`${changed} names standardised`)
