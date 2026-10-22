import { clubVisuals, mexicanClubVisuals } from './clubVisuals'
import leagueRows from '../../data/league-collections/players.json'
import mexicanRows from '../../data/league-collections/mexico.json'

export interface ClubIdentity { readonly id: string; readonly name: string }

/** Stable IDs shared by historical references, current affiliations, histories and badges. */
export const clubRegistry: Readonly<Record<string, ClubIdentity | undefined>> = Object.freeze(Object.fromEntries([
  ...[...leagueRows, ...mexicanRows].map((p) => [p.club_tag, { id: p.club_tag, name: p.club }]),
  ...[...Object.values(clubVisuals), ...Object.values(mexicanClubVisuals)].filter((club) => club !== undefined).map((club) => [club.id, { id: club.id, name: club.name }]),
  ...[
    ['inter_miami', 'Inter Miami CF'], ['pumas_unam', 'Pumas UNAM'], ['rosario_central', 'Rosario Central'],
    ['los_angeles_fc', 'Los Angeles FC'], ['belgrano', 'Belgrano'], ['genoa', 'Genoa'],
    ['santos', 'Santos FC'], ['monterrey', 'Monterrey'], ['fluminense', 'Fluminense'], ['hajduk_split', 'Hajduk Split'],
    ['atletico_nacional', 'Atlético Nacional'], ['fc_tokyo', 'FC Tokyo'], ['alianza_lima', 'Alianza Lima'], ['fc_jurong', 'FC Jurong'],
    ['independiente', 'Independiente'], ['cruzeiro', 'Cruzeiro'], ['deportivo_saprissa', 'Deportivo Saprissa'], ['servette', 'Servette FC'],
    ['vfl_wolfsburg', 'VfL Wolfsburg'], ['houston_dynamo', 'Houston Dynamo FC'], ['sporting_cristal', 'Sporting Cristal'], ['iraklis', 'Iraklis FC'], ['cf_montreal', 'CF Montréal'], ['inter_san_carlos', 'Inter San Carlos'], ['melbourne_city', 'Melbourne City'],
    ['trabzonspor', 'Trabzonspor'], ['crystal_palace', 'Crystal Palace'], ['al_qadsiah', 'Al-Qadsiah'],
    ['sporting_cp', 'Sporting CP'], ['dynamo_moscow', 'Dynamo Moscow'], ['rb_leipzig', 'RB Leipzig'], ['saint_etienne', 'Saint-Étienne'], ['al_diriyah', 'Al-Diriyah'], ['al_ittihad', 'Al-Ittihad'],
    ['ajax', 'Ajax'], ['boca_juniors', 'Boca Juniors'], ['al_wasl', 'Al Wasl'],
    ['udinese', 'Udinese'], ['getafe', 'Getafe'], ['schalke_04', 'Schalke 04'],
    ['sunderland', 'Sunderland'], ['chicago_fire', 'Chicago Fire FC'],
    ['atlanta', 'Club Atlético Atlanta'], ['gimnasia_la_plata', 'Gimnasia y Esgrima La Plata'], ['union_santa_fe', 'Unión de Santa Fe'], ['quilmes', 'Quilmes'],
    ['racing_club', 'Racing Club'], ['argentinos_juniors', 'Argentinos Juniors'], ['velez_sarsfield', 'Vélez Sarsfield'], ['san_lorenzo', 'San Lorenzo'],
    ['huracan', 'Huracán'], ['estudiantes_la_plata', 'Estudiantes de La Plata'], ['chacarita_juniors', 'Chacarita Juniors'], ['nueva_chicago', 'Nueva Chicago'],
    ['olimpo', 'Olimpo'], ['sarmiento_junin', 'Sarmiento de Junín'], ['lanus', 'Lanús'], ['newells_old_boys', "Newell's Old Boys"], ['colon', 'Colón'],
    ['talleres_cordoba', 'Talleres de Córdoba'], ['aldosivi', 'Aldosivi'], ['barracas_central', 'Barracas Central'], ['deportivo_merlo', 'Deportivo Merlo'],
    ['arsenal_sarandi', 'Arsenal de Sarandí'], ['platense', 'Platense'], ['instituto', 'Instituto'], ['banfield', 'Banfield'], ['tigre', 'Tigre'],
    ['defensa_y_justicia', 'Defensa y Justicia'], ['excelsior', 'Excelsior'], ['colo_colo', 'Colo-Colo'], ['supreme_sha_tin', 'Supreme Sha Tin'], ['alajuelense', 'Alajuelense'],
    ['ferro_carril_oeste', 'Ferro Carril Oeste'], ['defensores_unidos', 'Defensores Unidos'], ['mandiyu', 'Mandiyú'], ['independiente_rivadavia', 'Independiente Rivadavia'], ['talleres_remedios_de_escalada', 'Talleres de Remedios de Escalada'],
    ['deportivo_espanol', 'Deportivo Español'], ['argentino_de_rosario', 'Argentino de Rosario'], ['club_rivadavia', 'Club Rivadavia'], ['godoy_cruz', 'Godoy Cruz'], ['san_martin_tucuman', 'San Martín de Tucumán'],
    ['atletico_tucuman', 'Atlético Tucumán'], ['all_boys', 'All Boys'], ['gimnasia_jujuy', 'Gimnasia y Esgrima de Jujuy'], ['central_norte', 'Central Norte'], ['boca_unidos', 'Boca Unidos'],
    ['huracan_tres_arroyos', 'Huracán de Tres Arroyos'], ['atletico_rafaela', 'Atlético de Rafaela'], ['estudiantes_rio_cuarto', 'Estudiantes de Río Cuarto'], ['defensores_de_belgrano', 'Defensores de Belgrano'], ['excursionistas', 'Excursionistas'], ['los_andes', 'Los Andes'], ['alvarado', 'Alvarado'], ['central_cordoba_sde', 'Central Córdoba (SdE)'], ['almagro', 'Almagro'], ['deportivo_moron', 'Deportivo Morón'], ['estudiantes_buenos_aires', 'Estudiantes de Buenos Aires'],
  ].map(([id, name]) => [id, { id, name }]),
]))

/** Explicit aliases only; no fuzzy matching or silently created club identities. */
const aliases: Readonly<Record<string, string | undefined>> = {
  'Inter Miami CF': 'inter_miami', inter_miami_cf: 'inter_miami', LAFC: 'los_angeles_fc', lafc: 'los_angeles_fc',
  'Atlético de Madrid': 'atletico_madrid', 'Atletico Madrid': 'atletico_madrid', 'FC Barcelona': 'barcelona',
  'Pumas UNAM': 'pumas_unam', 'Rosario Central': 'rosario_central', 'AC Milan': 'ac_milan',
}
export function canonicalClubId(value: string): string | null {
  if (Object.hasOwn(clubRegistry, value)) return value
  const alias = Object.hasOwn(aliases, value) ? aliases[value] : undefined
  return alias && Object.hasOwn(clubRegistry, alias) ? alias : null
}
export function getClubIdentity(id: string): ClubIdentity | undefined {
  return Object.hasOwn(clubRegistry, id) ? clubRegistry[id] : undefined
}
