import records from '../../data/reference-careers.json'

export interface ReferenceCareer { readonly club: string; readonly from: number; readonly to: number | null; readonly url: string }
const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')
// Explicit identity equivalences. Never infer a club from part of a name.
const groups = [
  ['Barcelona', 'FC Barcelona', 'barcelona'], ['Real Madrid', 'Real Madrid CF', 'real_madrid'],
  ['Atlético Madrid', 'Atlético de Madrid', 'atletico_madrid'], ['Bayern Munich', 'Bayern München', 'FC Bayern München', 'bayern_munich'],
  ['Estudiantes', 'Estudiantes de La Plata', 'estudiantes_lp'], ['Vélez Sarsfield', 'velez'],
  ['Racing Club', 'Racing Club de Avellaneda', 'racing_club'], ['Argentinos Juniors', 'argentinos_juniors'],
  ['Boca Juniors', 'boca_juniors'], ['River Plate', 'river_plate'], ["Newell's Old Boys", 'newells'],
  ['San Lorenzo', 'san_lorenzo'], ['Rosario Central', 'rosario_central'], ['Huracán', 'huracan'],
  ['Valencia', 'Valencia CF', 'valencia_cf'], ['Deportivo La Coruña', 'RC Deportivo', 'rc_deportivo'],
  ['Athletic Bilbao', 'Athletic Club', 'athletic_bilbao'], ['Real Betis', 'Betis', 'real_betis'], ['Sevilla', 'Sevilla FC', 'sevilla_fc'],
  ['Sporting Gijón', 'Sporting de Gijón', 'sporting_gijon'], ['Racing Santander', 'Racing de Santander', 'racing_santander'],
  ['Celta', 'RC Celta', 'Celta de Vigo', 'celta_vigo'], ['Espanyol', 'RCD Espanyol', 'rcd_espanyol'],
  ['Mallorca', 'RCD Mallorca', 'mallorca'], ['Real Sociedad', 'real_sociedad'], ['Osasuna', 'CA Osasuna', 'osasuna'],
  ['Manchester United', 'manchester_united'], ['Manchester City', 'manchester_city'], ['Nottingham Forest', 'nottingham_forest'],
  ['Tottenham Hotspur', 'tottenham'], ['Newcastle United', 'newcastle_united'], ['West Ham United', 'west_ham'],
  ['Leeds United', 'leeds_united'], ['Blackburn Rovers', 'blackburn'], ['Aston Villa', 'aston_villa'],
  ['Wolverhampton Wanderers', 'wolves'], ['Sheffield United', 'sheffield_united'], ['Sheffield Wednesday', 'sheffield_wednesday'],
  ['West Bromwich Albion', 'west_brom'], ['Bolton Wanderers', 'bolton'], ['Stoke City', 'stoke_city'],
  ['Santos', 'Santos FC'], ['Corinthians', 'Sport Club Corinthians Paulista'], ['São Paulo', 'sao_paulo'],
  ['Vasco da Gama', 'vasco_da_gama'], ['Athletico Paranaense', 'Atlético Paranaense', 'athletico_pr'],
  ['Atlético Mineiro', 'atletico_mg'], ['Botafogo', 'Botafogo FR'], ['Internacional', 'SC Internacional'],
  ['América Mineiro', 'america_mg'], ['Guarani', 'Guarani FC'], ['Bangu', 'Bangu AC'],
  ['Inter Milan', 'Inter de Milán', 'inter_milan'], ['Milan', 'AC Milan', 'ac_milan'],
  ['Hamburger SV', 'Hamburgo'], ['Netherlands', 'Países Bajos'], ['Spain', 'España'], ['Brazil', 'Brasil'],
  ['United States', 'Estados Unidos'], ['Mexico', 'México'], ['Peru', 'Perú'], ['Paris Saint-Germain', 'Paris Saint-Germain FC'],
  ['Villarreal', 'Villarreal CF'], ['Gimnasia', 'Gimnasia y Esgrima La Plata', 'gimnasia_lp'],
  ['Guadalajara', 'Chivas'], ['Inter Miami', 'Inter Miami CF'], ['AEK Athens', 'AEK Atenas'], ['Rennes', 'Stade Rennais'],
  ['England', 'Inglaterra'], ['Germany', 'Alemania'], ['France', 'Francia'], ['Italy', 'Italia'],
  ['Morocco', 'Marruecos'], ['Japan', 'Japón'], ['South Korea', 'Corea del Sur'], ['Marseille', 'Olympique de Marsella'],
  ['Belgium', 'Bélgica'], ['Croatia', 'Croacia'], ['Switzerland', 'Suiza'], ['South Africa', 'Sudáfrica'],
]
const aliases = new Map(groups.flatMap((group) => group.map((name) => [normalize(name), normalize(group[0])] as const)))
export const referenceTeamKey = (team: string) => aliases.get(normalize(team)) ?? normalize(team)
export function referenceCareers(id: string, team: string): readonly ReferenceCareer[] {
  const careers: readonly ReferenceCareer[] = Object.hasOwn(records, id) ? records[id as keyof typeof records] : []
  return careers.filter((period) => referenceTeamKey(period.club) === referenceTeamKey(team))
}
