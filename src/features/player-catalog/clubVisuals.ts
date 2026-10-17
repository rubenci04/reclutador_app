/** Editorial colours for the game, not official brand specifications or crest artwork. */
export interface ClubVisual {
  readonly id: string
  readonly name: string
  readonly primary: string
  readonly secondary: string
  /** Neutral outline: remains visible against either coloured panel. */
  readonly contrast: string
  readonly variant?: 'duo'
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
  return Object.hasOwn(clubVisuals, id) && clubVisuals[id] ? clubVisuals[id]! : neutralClubVisual
}
