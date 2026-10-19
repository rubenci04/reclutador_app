/** Editorial colours for the game, not official brand specifications or crest artwork. */
/** How the two colours are laid out on shirt and shield. 'duo' is the plain split used when nothing more specific is known. */
export type KitPattern = 'duo' | 'stripes' | 'hoops' | 'halves' | 'sash' | 'hband' | 'vband' | 'plain'

export interface ClubVisual {
  readonly id: string
  readonly name: string
  readonly primary: string
  readonly secondary: string
  /** Neutral outline: remains visible against either coloured panel. */
  readonly contrast: string
  readonly variant?: 'duo'
  readonly pattern?: KitPattern
}

/** Editorial: loosely follows how each club usually dresses, as original geometry (no licensed kits or crests). */
const CLUB_PATTERNS: Readonly<Record<string, KitPattern>> = {
  barcelona: 'stripes', ac_milan: 'stripes', inter_milan: 'stripes', juventus: 'stripes', atletico_madrid: 'stripes', real_betis: 'stripes', athletic_club: 'stripes', real_sociedad: 'stripes',
  racing_club: 'stripes', estudiantes_la_plata: 'stripes', san_lorenzo: 'stripes', brighton_hove_albion: 'stripes', psv_eindhoven: 'stripes', lens: 'stripes', fenerbahce: 'stripes',
  besiktas: 'stripes', porto: 'stripes', botafogo: 'stripes', gremio: 'stripes', fluminense: 'stripes', crystal_palace: 'stripes', bournemouth: 'stripes', newcastle_united: 'stripes', argentina: 'stripes',
  celtic: 'hoops', flamengo: 'hoops', newells_old_boys: 'halves', galatasaray: 'halves',
  river_plate: 'sash', velez_sarsfield: 'sash', rayo_vallecano: 'sash', olympique_lyon: 'sash', boca_juniors: 'hband', paris_saint_germain: 'vband', ajax: 'vband',
  real_madrid: 'plain', bayern_munich: 'plain', borussia_dortmund: 'plain', liverpool: 'plain', manchester_united: 'plain', manchester_city: 'plain', chelsea: 'plain', tottenham_hotspur: 'plain',
  arsenal: 'plain', napoli: 'plain', independiente: 'plain', palmeiras: 'plain', sao_paulo: 'plain', corinthians: 'plain', santos: 'plain', benfica: 'plain', al_hilal: 'plain', al_nassr: 'plain',
  wolverhampton_wanderers: 'plain', sevilla: 'plain', brazil: 'plain', brasil: 'plain', france: 'plain', francia: 'plain', germany: 'plain', alemania: 'plain',
}

export const clubVisuals: Readonly<Record<string, ClubVisual | undefined>> = Object.fromEntries([
  ['ac_milan', 'AC Milan', '#C62828', '#111111'],
  ['al_ain', 'Al Ain', '#633090', '#FFFFFF'],
  ['al_hilal', 'Al Hilal', '#1555AF', '#FFFFFF'],
  ['al_nassr', 'Al Nassr', '#F6CC32', '#184A9D'],
  ['al_sadd', 'Al Sadd', '#FFFFFF', '#151515'],
  ['al_shabab', 'Al Shabab', '#FFFFFF', '#151515'],
  ['amkar_perm', 'Amkar Perm', '#CF2932', '#151515'],
  ['antalyaspor', 'Antalyaspor', '#D42B35', '#FFFFFF'],
  ['arsenal', 'Arsenal', '#CD2635', '#FFFFFF'],
  ['aston_villa', 'Aston Villa', '#721E42', '#99CBE8'],
  ['atalanta', 'Atalanta', '#1765B3', '#151515'],
  ['atletico_bucaramanga', 'Atlético Bucaramanga', '#F3CE32', '#18754A'],
  ['atletico_madrid', 'Atlético de Madrid', '#C62835', '#FFFFFF'],
  ['az_alkmaar', 'AZ Alkmaar', '#CE2834', '#FFFFFF'],
  ['barcelona', 'FC Barcelona', '#172C60', '#861C41'],
  ['bayer_leverkusen', 'Bayer Leverkusen', '#D62835', '#151515'],
  ['bayern_munich', 'Bayern München', '#C82735', '#FFFFFF'],
  ['beijing_guoan', 'Beijing Guoan', '#23754A', '#F0CB35'],
  ['benfica', 'Benfica', '#D32435', '#FFFFFF'],
  ['besiktas', 'Beşiktaş', '#151515', '#FFFFFF'],
  ['borussia_dortmund', 'Borussia Dortmund', '#F4D532', '#151515'],
  ['brighton_hove_albion', 'Brighton & Hove Albion', '#2263AD', '#FFFFFF'],
  ['cafetaleros_de_tapachula', 'Cafetaleros de Tapachula', '#1E704A', '#FFFFFF'],
  ['celtic', 'Celtic', '#207A4B', '#FFFFFF'],
  ['chelsea', 'Chelsea', '#2146A0', '#FFFFFF'],
  ['corinthians', 'Corinthians', '#FFFFFF', '#151515'],
  ['cska_moscow', 'CSKA Moscow', '#C82C3C', '#244A94'],
  ['deportivo_la_coruna', 'Deportivo La Coruña', '#2461AA', '#FFFFFF'],
  ['espanyol', 'Espanyol', '#2671B7', '#FFFFFF'],
  ['fenerbahce', 'Fenerbahçe', '#F4CE32', '#162E58'],
  ['fiorentina', 'Fiorentina', '#713A98', '#FFFFFF'],
  ['flamengo', 'Flamengo', '#C62737', '#151515'],
  ['galatasaray', 'Galatasaray', '#BA2032', '#F3AF24'],
  ['gent', 'Gent', '#2262AB', '#FFFFFF'],
  ['hertha_berlin', 'Hertha BSC', '#2464AD', '#FFFFFF'],
  ['horoya', 'Horoya AC', '#CF2B39', '#FFFFFF'],
  ['huddersfield_town', 'Huddersfield Town', '#2971BA', '#FFFFFF'],
  ['inter_milan', 'Inter', '#2454A2', '#151515'],
  ['juventus', 'Juventus', '#FFFFFF', '#151515'],
  ['lens', 'Lens', '#D32A37', '#F1CC33'],
  ['liverpool', 'Liverpool', '#CA2935', '#FFFFFF'],
  ['lobos_buap', 'Lobos BUAP', '#FFFFFF', '#203856'],
  ['lokomotiv_moscow', 'Lokomotiv Moscow', '#23754A', '#CD2C39'],
  ['mainz_05', 'Mainz 05', '#CA2937', '#FFFFFF'],
  ['manchester_city', 'Manchester City', '#8BC8E8', '#FFFFFF'],
  ['manchester_united', 'Manchester United', '#CD2937', '#151515'],
  ['napoli', 'Napoli', '#4CA7DA', '#FFFFFF'],
  ['new_york_red_bulls', 'New York Red Bulls', '#D02B3C', '#FFFFFF'],
  ['olympique_lyon', 'Olympique Lyonnais', '#FFFFFF', '#244E9B'],
  ['orlando_city', 'Orlando City', '#653495', '#D8B35C'],
  ['pachuca', 'Pachuca', '#FFFFFF', '#1C365A'],
  ['paris_saint_germain', 'Paris Saint-Germain', '#172E55', '#C62C3D'],
  ['porto', 'Porto', '#2452A3', '#FFFFFF'],
  ['psv_eindhoven', 'PSV Eindhoven', '#D22A36', '#FFFFFF'],
  ['rayo_vallecano', 'Rayo Vallecano', '#FFFFFF', '#D02C37'],
  ['real_betis', 'Real Betis', '#28794E', '#FFFFFF'],
  ['real_madrid', 'Real Madrid', '#FFFFFF', '#C7A34D'],
  ['real_sociedad', 'Real Sociedad', '#2868B0', '#FFFFFF'],
  ['river_plate', 'River Plate', '#FFFFFF', '#CF2B38'],
  ['rostov', 'Rostov', '#F1CE36', '#2458A7'],
  ['sevilla', 'Sevilla', '#FFFFFF', '#C92B38'],
  ['standard_liege', 'Standard Liège', '#D12A36', '#FFFFFF'],
  ['stoke_city', 'Stoke City', '#D12B37', '#FFFFFF'],
  ['torino', 'Torino', '#74293B', '#FFFFFF'],
  ['tottenham_hotspur', 'Tottenham Hotspur', '#FFFFFF', '#172B4C'],
  ['vancouver_whitecaps', 'Vancouver Whitecaps', '#FFFFFF', '#183451'],
  ['wolverhampton_wanderers', 'Wolverhampton Wanderers', '#E8AF2F', '#151515'],
].map(([id, name, primary, secondary]) => [id, { id, name, primary, secondary, contrast: '#88949E', variant: 'duo' as const }]))

export const neutralClubVisual: ClubVisual = { id: 'neutral', name: '', primary: '#38434D', secondary: '#B6C0C8', contrast: '#88949E', variant: 'duo' }

export function getClubVisual(id: string): ClubVisual {
  const visual = baseClubVisual(id)
  const key = id.replace(/^(national_|selection_|seleccion_)/, '')
  const patternKey = [id, key, visual.id].find((candidate) => Object.hasOwn(CLUB_PATTERNS, candidate))
  const pattern = patternKey === undefined ? undefined : CLUB_PATTERNS[patternKey]
  return pattern ? { ...visual, pattern } : visual
}

function baseClubVisual(id: string): ClubVisual {
  const national: Record<string, readonly [string, string]> = { argentina: ['#82c9ec', '#ffffff'], brazil: ['#f1d43b', '#287b44'], brasil: ['#f1d43b', '#287b44'], portugal: ['#bb2839', '#236646'], spain: ['#c52d36', '#f1cc35'], espana: ['#c52d36', '#f1cc35'], england: ['#ffffff', '#c52d36'], inglaterra: ['#ffffff', '#c52d36'], france: ['#244b95', '#ffffff'], francia: ['#244b95', '#ffffff'], germany: ['#ffffff', '#171717'], alemania: ['#ffffff', '#171717'], italy: ['#2866b4', '#ffffff'], italia: ['#2866b4', '#ffffff'], uruguay: ['#85c9e8', '#171717'], netherlands: ['#e57d26', '#ffffff'], mexico: ['#237448', '#ffffff'], colombia: ['#f2d339', '#264f9a'] }
  const nationalKey = id.replace(/^(national_|selection_|seleccion_)/, '')
  if (Object.hasOwn(national, nationalKey)) { const colors = national[nationalKey]; return { id, name: '', primary: colors[0], secondary: colors[1], contrast: '#88949E', variant: 'duo' } }
  const aliases: Record<string, string> = { fc_barcelona: 'barcelona', newell_s_old_boys: 'newells_old_boys', ca_osasuna: 'osasuna', elche_cf: 'elche', getafe_cf: 'getafe', instituto_de_cordoba: 'instituto', levante_ud: 'levante', malaga_cf: 'malaga', rc_celta: 'celta_de_vigo', sevilla_fc: 'sevilla', valencia_cf: 'valencia', villarreal_cf: 'villarreal', brighton_hove_albion: 'brighton', afc_bournemouth: 'bournemouth', red_bull_bragantino: 'bragantino', atletico_de_madrid: 'atletico_madrid', bayern_munchen: 'bayern_munich', estudiantes_de_la_plata: 'estudiantes_la_plata', belgrano_de_cordoba: 'belgrano', racing: 'racing_club' }
  const key = Object.hasOwn(aliases, id) ? aliases[id] : id
  const extra: Record<string, readonly [string, string]> = {
    boca_juniors: ['#123778','#f4c834'], river_plate: ['#fafafa','#d32c35'], racing_club: ['#75c8e7','#ffffff'], independiente: ['#ce2835','#ffffff'], san_lorenzo: ['#173369','#bf2638'], velez_sarsfield: ['#fafafa','#204a92'], rosario_central: ['#234e9e','#f2ce33'], newells_old_boys: ['#d32938','#161616'], huracan: ['#ffffff','#cf3038'], estudiantes_la_plata: ['#d42c35','#fafafa'], lanus: ['#702a3e','#ffffff'], belgrano: ['#74bee5','#171717'], argentinos_juniors: ['#c92437','#ffffff'], talleres_de_cordoba: ['#182d60','#ffffff'], banfield: ['#217448','#ffffff'], tigre: ['#23438c','#d02e3a'], platense: ['#754e36','#ffffff'], instituto: ['#c72834','#ffffff'],
    aldosivi: ['#217340','#f0d230'], atletico_tucuman: ['#80c7e1','#ffffff'], defensa_y_justicia: ['#23784e','#f2d537'], deportivo_riestra: ['#111111','#ffffff'], gimnasia_y_esgrima_de_mendoza: ['#ffffff','#171717'], gimnasia_y_esgrima_la_plata: ['#ffffff','#192d59'], independiente_rivadavia: ['#162c5d','#ffffff'], union_de_santa_fe: ['#d22938','#ffffff'],
    bangu: ['#ffffff','#c12836'], bragantino: ['#ffffff','#da293c'], chapecoense: ['#247a4e','#ffffff'], coritiba: ['#27734e','#ffffff'], mirassol: ['#f3d535','#278148'], paulistano: ['#ffffff','#c52b37'], remo: ['#162849','#ffffff'], vasco_da_gama: ['#171717','#ffffff'], athletico_paranaense: ['#c52636','#171717'],
    blackpool: ['#e58b32','#ffffff'], bolton_wanderers: ['#ffffff','#253152'], derby_county: ['#ffffff','#151515'], ipswich_town: ['#285bb2','#ffffff'], preston_north_end: ['#ffffff','#1c315e'], hull_city: ['#eba833','#171717'], racing_de_santander: ['#ffffff','#267447'], rc_deportivo: ['#2d5da2','#ffffff'], rcd_espanyol: ['#2763b3','#ffffff'], sporting_de_gijon: ['#d12c38','#ffffff'], getafe: ['#2355a8','#ffffff'],
    santos: ['#fafafa','#171717'], botafogo: ['#171717','#ffffff'], palmeiras: ['#17663e','#ffffff'], cruzeiro: ['#244d9b','#ffffff'], sao_paulo: ['#ffffff','#bd2535'], fluminense: ['#6f213a','#287245'], gremio: ['#62b1db','#151515'], internacional: ['#d42c34','#ffffff'], atletico_mineiro: ['#171717','#ffffff'], bahia: ['#234da6','#e22f3d'], fortaleza: ['#2453a8','#d32938'], vitoria: ['#cd2836','#141414'],
    real_betis: ['#268257','#ffffff'], real_sociedad: ['#2662a3','#ffffff'], villarreal: ['#f3d53d','#23427b'], valencia: ['#fafafa','#161616'], athletic_club: ['#ce2b35','#ffffff'], osasuna: ['#c62636','#1e315f'], celta_de_vigo: ['#8ac9e7','#ffffff'], deportivo_alaves: ['#244b91','#ffffff'], elche: ['#ffffff','#27834c'], levante: ['#20427c','#c02d3d'], malaga: ['#7bb9df','#ffffff'], real_oviedo: ['#234d9a','#ffffff'],
  }
  if (Object.hasOwn(clubVisuals, key) && clubVisuals[key]) return clubVisuals[key]!
  const colors = extra[key]
  if (Object.hasOwn(extra, key) && colors) return { id, name: '', primary: colors[0], secondary: colors[1], contrast: '#88949E', variant: 'duo' }
  return Object.hasOwn(clubVisuals, key) && clubVisuals[key] ? clubVisuals[key]! : neutralClubVisual
}
