import type { ThemedModeId } from '../themed-modes/modeTypes'
import { COACH_CATALOG, EXTRA_COACHES } from './coachCatalog'
import type { Coach } from './coachTypes'
import { EUROPEAN_NATIONALITIES, LATIN_AMERICAN_ASSOCIATIONS } from '../themed-modes/nationalityRegions'

/** Reference affiliations, not assertions of employment in October 2026.
 * A coach may occur in multiple scopes, and keeps the same identity/effect.
 */
const REFERENCES: Readonly<Record<string, readonly [string, string?]>> = {
  Menotti: ['Huracán', 'FC Barcelona'], Bilardo: ['Estudiantes de La Plata', 'Argentina'],
  Sabella: ['Estudiantes de La Plata', 'Argentina'], Bianchi: ['Boca Juniors', 'Vélez Sarsfield'],
  Cruyff: ['FC Barcelona', 'Ajax'], 'del Bosque': ['Real Madrid', 'España'],
  Herrera: ['FC Barcelona', 'Inter de Milán'], Ferguson: ['Manchester United', 'Aberdeen'],
  Clough: ['Nottingham Forest', 'Derby County'], Santana: ['São Paulo', 'Brasil'],
  Zagallo: ['Botafogo', 'Brasil'], Guardiola: ['Manchester City', 'FC Barcelona'],
  Simeone: ['Atlético de Madrid', 'Racing Club'], Gallardo: ['River Plate'],
  Costas: ['Racing Club'], Úbeda: ['Boca Juniors'], Kudelka: ['Huracán'],
  Flick: ['FC Barcelona', 'Bayern München'], Arteta: ['Arsenal'], Slot: ['Liverpool'],
  Ferreira: ['Palmeiras'], Luís: ['Flamengo'], Crespo: ['São Paulo', 'Defensa y Justicia'],
  Almirón: ['Boca Juniors', 'Lanús'], Méndez: ['Vélez Sarsfield'],
  Pusineri: ['Independiente', 'Atlético Tucumán'], Soso: ["Newell's Old Boys", 'Defensa y Justicia'],
  Veira: ['San Lorenzo', 'River Plate'],
}
const ARG_ACTIVE = ['Gallardo', 'Costas', 'Úbeda', 'Heinze', 'Beccacece', 'Zielinski', 'Quinteros', 'Kudelka', 'Berti', 'Pusineri', 'Soso']
const BRA_ACTIVE = ['Ferreira', 'Luís', 'Crespo', 'Coudet', 'Domínguez', 'Milito', 'Díaz']
const ESP_ACTIVE = ['Simeone', 'Flick', 'Guardiola', 'Emery', 'Enrique', 'Aguirre']
const ENG_ACTIVE = ['Guardiola', 'Arteta', 'Slot', 'Howe', 'Emery', 'Glasner', 'Silva', 'Maresca', 'Tuchel', 'Pochettino']
const scoped = (names: readonly string[], legend: boolean) => [...COACH_CATALOG, ...EXTRA_COACHES].filter((coach) => names.includes(coach.surname) && (coach.status === 'LEGEND') === legend)

export function coachesForMode(mode?: ThemedModeId): readonly Coach[] {
  const legend = mode?.includes('LEGENDS') || mode === 'LEGENDS_ONLY'
  let pool: readonly Coach[] = COACH_CATALOG
  if (mode?.startsWith('ARGENTINA')) pool = legend ? COACH_CATALOG.filter((c) => c.status === 'LEGEND' && c.nationality === 'ARG') : scoped(ARG_ACTIVE, false)
  else if (mode?.startsWith('BRAZIL')) pool = legend ? scoped(['Santana', 'Zagallo', 'Perez (Lula)'], true) : scoped(BRA_ACTIVE, false)
  else if (mode?.startsWith('SPAIN')) pool = legend ? scoped(['Cruyff', 'del Bosque', 'Menotti', 'Herrera', 'Di Stéfano', 'Martino'], true) : scoped(ESP_ACTIVE, false)
  else if (mode?.startsWith('ENGLAND')) pool = legend ? scoped(['Ferguson', 'Clough', 'Busby'], true) : scoped(ENG_ACTIVE, false)
  else if (mode?.startsWith('SOUTH_AMERICA')) pool = COACH_CATALOG.filter((c) => LATIN_AMERICAN_ASSOCIATIONS.has(c.nationality) && (c.status === 'LEGEND') === Boolean(legend))
  else if (mode?.startsWith('EUROPE_')) pool = COACH_CATALOG.filter((c) => EUROPEAN_NATIONALITIES.has(c.nationality) && (c.status === 'LEGEND') === Boolean(legend))
  else if (legend) pool = COACH_CATALOG.filter((c) => c.status === 'LEGEND' && (c.tier === 'S' || c.tier === 'A'))
  else if (mode === 'GLOBAL_CLASSIC') pool = COACH_CATALOG.filter((c) => c.status === 'ACTIVE')
  return pool.map((coach) => {
    const refs = REFERENCES[coach.surname]
    // In the Spanish legend edition, the Spanish affiliation is primary.
    const spanish: Readonly<Record<string, string>> = { Menotti: 'FC Barcelona', Guardiola: 'FC Barcelona', Emery: 'Sevilla', Enrique: 'FC Barcelona', Aguirre: 'Mallorca', Martino: 'FC Barcelona' }
    const english: Readonly<Record<string, string>> = { Tuchel: 'Chelsea', Pochettino: 'Tottenham Hotspur' }
    const team = mode?.startsWith('SPAIN') ? spanish[coach.surname] ?? refs?.[0] ?? coach.team : mode?.startsWith('ENGLAND') ? english[coach.surname] ?? refs?.[0] ?? coach.team : refs?.[0] ?? coach.team
    return { ...coach, team, teamKind: refs ? 'CLUB' : coach.teamKind, secondaryTeam: refs?.[1] }
  })
}
