import type { ThemedModeId } from '../themed-modes/modeTypes'
import v3 from '../../data/coaches-v3.json'
import arg26 from '../../data/argentina-coaches-2026.json'
import { ARG_2026_ADDED, ARG_LEGENDS_ADDED, COACH_CATALOG, EXTRA_COACHES, V3_ADDED_COACHES } from './coachCatalog'
import { COACH_TIER_PRICE, usesV3Rules, type CoachMarketVersion } from './coachRules'
import type { Coach, CoachTier } from './coachTypes'
import { LEAGUE_COACHES, LEAGUE_EXISTING, type CoachLeague } from './leagueCoaches'
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
const ARG_ACTIVE = ['Gallardo', 'Costas', 'Úbeda', 'Heinze', 'Beccacece', 'Zielinski', 'Quinteros', 'Kudelka', 'Berti', 'Pusineri', 'Soso', 'Tevez', 'Méndez', 'Vaccari', 'Pellegrino', 'Holan']
const BRA_ACTIVE = ['Ferreira', 'Luís', 'Crespo', 'Coudet', 'Domínguez', 'Milito', 'Díaz', 'Gaúcho', 'Jardim', 'Lage', 'Menezes']
/** Current editions list coaches whose single reference club plays in that league; national-team and foreign-club coaches are left out. */
const ESP_ACTIVE = ['Simeone', 'Flick', 'Alonso', 'García Toral', 'Pellegrini', 'Valverde', 'Bordalás', 'Arrasate', 'Corberán', 'Sánchez', 'Pérez', 'González']
const ENG_ACTIVE = ['Guardiola', 'Arteta', 'Slot', 'Howe', 'Emery', 'Glasner', 'Silva', 'Maresca', 'Amorim', 'Frank', 'Iraola', 'Hürzeler', 'Farke']
/** coach-market-v3: coaches with a documented spell in the Argentine league and the club of that spell (the career, not the nationality, makes them eligible). */
const V3_ARG_ACTIVE = ['Bielsa', 'Pochettino', 'Simeone', 'Almeyda', 'Gago', 'Alfaro', 'Domínguez', 'Coudet']
const V3_ARG_REFERENCES: Readonly<Record<string, string>> = { Bielsa: "Newell's Old Boys", Pochettino: "Newell's Old Boys", Simeone: 'Racing Club', Almeyda: 'River Plate', Gago: 'Racing Club', Alfaro: 'Boca Juniors', Domínguez: 'Colón', Coudet: 'Racing Club' }
const scoped = (names: readonly string[], legend: boolean) => [...COACH_CATALOG, ...EXTRA_COACHES].filter((coach) => names.includes(coach.surname) && (coach.status === 'LEGEND') === legend)

type Spell = { readonly coach: string; readonly league: CoachLeague; readonly team: string; readonly period: readonly [number, number | null]; readonly sourceUrl: string }
/** Existing coaches with a documented spell in Serie A or Liga MX, carrying that spell as their reference. */
const withSpells = (entries: readonly Spell[]): readonly Coach[] => entries.map((entry) => {
  const coach = [...COACH_CATALOG, ...EXTRA_COACHES].find((candidate) => `${candidate.name} ${candidate.surname}` === entry.coach)
  if (!coach) throw new Error(`league_coach_missing:${entry.coach}`)
  return { ...coach, team: entry.team, teamKind: 'CLUB', secondaryTeam: undefined, league: entry.league, period: entry.period, sourceUrl: entry.sourceUrl }
})
const EXISTING_ELIGIBLE = withSpells(LEAGUE_EXISTING)
/** coach-market-v3: further existing coaches with a documented spell in the league. */
const V3_SPELLS = withSpells(v3.leagueSpells.map((entry) => ({ ...entry, league: entry.league as CoachLeague, period: [entry.period[0], entry.period[1]] as const })))
const V3_TIER_OF = new Map<string, CoachTier>(Object.entries(v3.tiers).flatMap(([tier, names]) => names.map((name) => [name, tier as CoachTier] as const)))
/** Editorial v3 tier: explicit list first; any other former S coach becomes A (S and S+ are now scarce). Price follows the tier. */
const toV3 = (coach: Coach): Coach => { const tier = V3_TIER_OF.get(`${coach.name} ${coach.surname}`) ?? (coach.tier === 'S' ? 'A' : coach.tier); return { ...coach, tier, price: COACH_TIER_PRICE[tier] } }
/** Coaches who worked in that league, by edition. Eligibility is the career, never the nationality. */
export const leagueCoaches = (league: CoachLeague, legend: boolean, extra: readonly Coach[] = []): readonly Coach[] => [...LEAGUE_COACHES, ...EXISTING_ELIGIBLE, ...extra].filter((coach) => coach.league === league && (coach.status === 'LEGEND') === legend)

/** `market` v2 (coach-market-v2) adds the league coaches and uses league-specific pools for Italy and Mexico; v1 reproduces the offers of earlier games. */
export function coachesForMode(mode?: ThemedModeId, market: CoachMarketVersion = 'v1'): readonly Coach[] {
  if (market === 'v4' && mode?.startsWith('ARGENTINA')) return argentinaPoolV4(Boolean(mode.includes('LEGENDS'))).map(toV3)
  const pool = poolForMode(mode, usesV3Rules(market) ? 'v2' : market as 'v1' | 'v2', usesV3Rules(market))
  return usesV3Rules(market) ? pool.map(toV3) : pool
}

/**
 * coach-market-v4, Argentina: the career decides, never the nationality. Actualidad = coaches with a documented 2026 spell in the Argentine Primera (club and period in
 * argentina-coaches-2026.json, each with its source); Leyendas = the historical Argentine coaches plus separate historical editions of people who also have a current card.
 */
export function argentinaPoolV4(legend: boolean): readonly Coach[] {
  if (legend) return [...COACH_CATALOG.filter((c) => c.status === 'LEGEND' && c.nationality === 'ARG'), ...ARG_LEGENDS_ADDED]
  const everyone = [...COACH_CATALOG, ...EXTRA_COACHES]
  const current = arg26.current.map((entry) => {
    const coach = everyone.find((c) => `${c.name} ${c.surname}` === entry.coach && c.status === 'ACTIVE')
    if (!coach) throw new Error(`argentina_coach_missing:${entry.coach}`)
    return { ...coach, team: entry.club, teamKind: 'CLUB' as const, secondaryTeam: undefined, period: [entry.period[0] as number, entry.period[1]] as const, sourceUrl: entry.sourceUrl }
  })
  return [...current, ...ARG_2026_ADDED]
}

function poolForMode(mode: ThemedModeId | undefined, market: 'v1' | 'v2', v3: boolean): readonly Coach[] {
  const legend = mode?.includes('LEGENDS') || mode === 'LEGENDS_ONLY'
  if (market === 'v2' && mode?.startsWith('ITALY')) return leagueCoaches('ITA', Boolean(legend), v3 ? V3_SPELLS : [])
  if (market === 'v2' && mode?.startsWith('MEXICO')) return leagueCoaches('MEX', Boolean(legend), v3 ? V3_SPELLS : [])
  const all: readonly Coach[] = market === 'v2' ? [...COACH_CATALOG, ...LEAGUE_COACHES, ...(v3 ? V3_ADDED_COACHES : [])] : COACH_CATALOG
  let pool: readonly Coach[] = all
  if (mode?.startsWith('ARGENTINA')) pool = legend ? COACH_CATALOG.filter((c) => c.status === 'LEGEND' && c.nationality === 'ARG') : scoped(v3 ? [...ARG_ACTIVE, ...V3_ARG_ACTIVE] : ARG_ACTIVE, false)
  else if (mode?.startsWith('BRAZIL')) pool = legend ? scoped(['Santana', 'Zagallo', 'Perez (Lula)', ...(v3 ? ['Parreira', 'Scolari'] : [])], true) : scoped([...BRA_ACTIVE, ...(v3 ? ['Bacchi (Tite)'] : [])], false)
  else if (mode?.startsWith('SPAIN')) pool = legend ? scoped(['Cruyff', 'del Bosque', 'Menotti', 'Herrera', 'Di Stéfano', 'Martino', ...(v3 ? ['Muñoz', 'Aragonés'] : [])], true) : scoped(ESP_ACTIVE, false)
  else if (mode?.startsWith('ENGLAND')) pool = legend ? scoped(['Ferguson', 'Clough', 'Busby', ...(v3 ? ['Shankly', 'Paisley', 'Wenger', 'Robson', 'Ramsey'] : [])], true) : scoped(ENG_ACTIVE, false)
  else if (mode?.startsWith('SOUTH_AMERICA')) pool = all.filter((c) => LATIN_AMERICAN_ASSOCIATIONS.has(c.nationality) && (c.status === 'LEGEND') === Boolean(legend))
  else if (mode?.startsWith('EUROPE_')) pool = all.filter((c) => EUROPEAN_NATIONALITIES.has(c.nationality) && (c.status === 'LEGEND') === Boolean(legend))
  else if (legend) pool = all.filter((c) => c.status === 'LEGEND' && (c.tier === 'S' || c.tier === 'A'))
  else if (mode === 'GLOBAL_CLASSIC' || mode === 'ITALY_CURRENT' || mode === 'MEXICO_CURRENT') pool = all.filter((c) => c.status === 'ACTIVE')
  return pool.map((coach) => {
    const v3Ref = v3 && mode?.startsWith('ARGENTINA') && !legend ? V3_ARG_REFERENCES[coach.surname] : undefined
    const refs = coach.league ? undefined : v3Ref ? ([v3Ref] as const) : REFERENCES[coach.surname]
    // In the Spanish legend edition, the Spanish affiliation is primary.
    const spanish: Readonly<Record<string, string>> = { Menotti: 'FC Barcelona', Guardiola: 'FC Barcelona', Emery: 'Sevilla', Enrique: 'FC Barcelona', Aguirre: 'Mallorca', Martino: 'FC Barcelona' }
    const english: Readonly<Record<string, string>> = { Tuchel: 'Chelsea', Pochettino: 'Tottenham Hotspur' }
    // Legend editions pick the career reference of that country; current coaches keep their single current reference.
    const team = !legend ? refs?.[0] ?? coach.team : mode?.startsWith('SPAIN') ? spanish[coach.surname] ?? refs?.[0] ?? coach.team : mode?.startsWith('ENGLAND') ? english[coach.surname] ?? refs?.[0] ?? coach.team : refs?.[0] ?? coach.team
    return { ...coach, team, teamKind: refs ? 'CLUB' : coach.teamKind, secondaryTeam: undefined }
  })
}
