import { COACH_TIER_PRICE } from './coachRules'
import type { Coach, CoachFocus, CoachTier } from './coachTypes'

/**
 * Coach catalog v1: 100 coaches, 70 active and 30 legends, 54 of them Argentine.
 * AUDIT PENDING: teams of active coaches are the reference at 2026-10-19 and must be checked against a source
 * before being treated as verified (see docs/COACHES.md). Birth years, tiers and focus are editorial.
 * Row: [name, surname, birthYear, deathYear (0 = alive), team, kind (C club / N national), nationality, status (A / L), tier, focus (A attack / D defense / M midfield / B balanced)]
 */
type Row = readonly [string, string, number, number, string, 'C' | 'N', string, 'A' | 'L', CoachTier, 'A' | 'D' | 'M' | 'B']
const FOCUS: Readonly<Record<'A' | 'D' | 'M' | 'B', CoachFocus>> = { A: 'ATTACK', D: 'DEFENSE', M: 'MIDFIELD', B: 'BALANCED' }

const ROWS: readonly Row[] = [
  // Active, Argentine (33)
  ['Lionel', 'Scaloni', 1978, 0, 'Argentina', 'N', 'ARG', 'A', 'S', 'B'],
  ['Diego', 'Simeone', 1970, 0, 'Atlético de Madrid', 'C', 'ARG', 'A', 'A', 'D'],
  ['Mauricio', 'Pochettino', 1972, 0, 'Estados Unidos', 'N', 'ARG', 'A', 'A', 'B'],
  ['Marcelo', 'Gallardo', 1976, 0, 'River Plate', 'C', 'ARG', 'A', 'A', 'A'],
  ['Marcelo', 'Bielsa', 1955, 0, 'Uruguay', 'N', 'ARG', 'A', 'A', 'A'],
  ['Gustavo', 'Alfaro', 1962, 0, 'Paraguay', 'N', 'ARG', 'A', 'B', 'D'],
  ['Fernando', 'Gago', 1986, 0, 'Chivas', 'C', 'ARG', 'A', 'C', 'M'],
  ['Eduardo', 'Domínguez', 1981, 0, 'Atlético Mineiro', 'C', 'ARG', 'A', 'B', 'D'],
  ['Néstor', 'Lorenzo', 1966, 0, 'Colombia', 'N', 'ARG', 'A', 'B', 'B'],
  ['Hernán', 'Crespo', 1975, 0, 'São Paulo', 'C', 'ARG', 'A', 'C', 'A'],
  ['Javier', 'Mascherano', 1984, 0, 'Inter Miami CF', 'C', 'ARG', 'A', 'B', 'M'],
  ['Gustavo', 'Costas', 1963, 0, 'Racing Club', 'C', 'ARG', 'A', 'B', 'D'],
  ['Claudio', 'Úbeda', 1979, 0, 'Boca Juniors', 'C', 'ARG', 'A', 'C', 'M'],
  ['Eduardo', 'Coudet', 1974, 0, 'Internacional', 'C', 'ARG', 'A', 'C', 'A'],
  ['Ramón', 'Díaz', 1959, 0, 'Corinthians', 'C', 'ARG', 'A', 'B', 'A'],
  ['Gabriel', 'Heinze', 1978, 0, "Newell's Old Boys", 'C', 'ARG', 'A', 'C', 'D'],
  ['Sebastián', 'Beccacece', 1980, 0, 'Defensa y Justicia', 'C', 'ARG', 'A', 'C', 'A'],
  ['Matías', 'Almeyda', 1973, 0, 'AEK Atenas', 'C', 'ARG', 'A', 'B', 'M'],
  ['Jorge', 'Almirón', 1971, 0, 'Atlas', 'C', 'ARG', 'A', 'D', 'B'],
  ['Gabriel', 'Milito', 1980, 0, 'Atlético Mineiro', 'C', 'ARG', 'A', 'C', 'D'],
  ['Ricardo', 'Zielinski', 1959, 0, 'Atlético Tucumán', 'C', 'ARG', 'A', 'D', 'D'],
  ['Gustavo', 'Quinteros', 1965, 0, 'Vélez Sarsfield', 'C', 'ARG', 'A', 'C', 'B'],
  ['Julio', 'Vaccari', 1964, 0, 'Independiente', 'C', 'ARG', 'A', 'D', 'D'],
  ['Jorge', 'Sampaoli', 1960, 0, 'Stade Rennais', 'C', 'ARG', 'A', 'B', 'A'],
  ['Mauricio', 'Pellegrino', 1971, 0, 'Lanús', 'C', 'ARG', 'A', 'C', 'D'],
  ['Ariel', 'Holan', 1960, 0, 'Rosario Central', 'C', 'ARG', 'A', 'C', 'M'],
  ['Frank', 'Kudelka', 1962, 0, 'Huracán', 'C', 'ARG', 'A', 'D', 'B'],
  ['Carlos', 'Tevez', 1984, 0, 'Independiente', 'C', 'ARG', 'A', 'D', 'A'],
  ['Fernando', 'Batista', 1969, 0, 'Venezuela', 'N', 'ARG', 'A', 'C', 'B'],
  ['Alfredo', 'Berti', 1969, 0, 'Independiente Rivadavia', 'C', 'ARG', 'A', 'C', 'D'],
  ['Sebastián', 'Méndez', 1977, 0, 'Talleres', 'C', 'ARG', 'A', 'D', 'B'],
  ['Lucas', 'Pusineri', 1975, 0, 'Argentinos Juniors', 'C', 'ARG', 'A', 'D', 'M'],
  ['Mariano', 'Soso', 1979, 0, 'Sarmiento', 'C', 'ARG', 'A', 'D', 'A'],
  // Active, other nationalities (37)
  ['Pep', 'Guardiola', 1971, 0, 'Manchester City', 'C', 'ESP', 'A', 'S', 'M'],
  ['Carlo', 'Ancelotti', 1959, 0, 'Brasil', 'N', 'ITA', 'A', 'S', 'B'],
  ['Hansi', 'Flick', 1965, 0, 'FC Barcelona', 'C', 'GER', 'A', 'A', 'A'],
  ['Luis', 'Enrique', 1970, 0, 'Paris Saint-Germain', 'C', 'ESP', 'A', 'A', 'A'],
  ['Arne', 'Slot', 1978, 0, 'Liverpool', 'C', 'NED', 'A', 'B', 'B'],
  ['Mikel', 'Arteta', 1982, 0, 'Arsenal', 'C', 'ESP', 'A', 'A', 'D'],
  ['Thomas', 'Tuchel', 1973, 0, 'Inglaterra', 'N', 'GER', 'A', 'A', 'D'],
  ['Julian', 'Nagelsmann', 1987, 0, 'Alemania', 'N', 'GER', 'A', 'A', 'A'],
  ['Didier', 'Deschamps', 1968, 0, 'Francia', 'N', 'FRA', 'A', 'A', 'D'],
  ['Roberto', 'Martínez', 1973, 0, 'Portugal', 'N', 'ESP', 'A', 'B', 'B'],
  ['Gennaro', 'Gattuso', 1978, 0, 'Italia', 'N', 'ITA', 'A', 'B', 'D'],
  ['Simone', 'Inzaghi', 1976, 0, 'Al-Hilal', 'C', 'ITA', 'A', 'A', 'D'],
  ['Antonio', 'Conte', 1969, 0, 'Napoli', 'C', 'ITA', 'A', 'A', 'D'],
  ['Massimiliano', 'Allegri', 1967, 0, 'AC Milan', 'C', 'ITA', 'A', 'B', 'D'],
  ['José', 'Mourinho', 1963, 0, 'Benfica', 'C', 'POR', 'A', 'A', 'D'],
  ['Rúben', 'Amorim', 1985, 0, 'Manchester United', 'C', 'POR', 'A', 'B', 'A'],
  ['Unai', 'Emery', 1971, 0, 'Aston Villa', 'C', 'ESP', 'A', 'A', 'B'],
  ['Vincent', 'Kompany', 1986, 0, 'Bayern München', 'C', 'BEL', 'A', 'B', 'A'],
  ['Oliver', 'Glasner', 1974, 0, 'Crystal Palace', 'C', 'AUT', 'A', 'C', 'D'],
  ['Eddie', 'Howe', 1977, 0, 'Newcastle United', 'C', 'ENG', 'A', 'B', 'A'],
  ['Filipe', 'Luís', 1985, 0, 'Flamengo', 'C', 'BRA', 'A', 'B', 'A'],
  ['Abel', 'Ferreira', 1978, 0, 'Palmeiras', 'C', 'POR', 'A', 'A', 'D'],
  ['Jorge', 'Jesus', 1954, 0, 'Al-Nassr', 'C', 'POR', 'A', 'C', 'A'],
  ['Jesse', 'Marsch', 1973, 0, 'Canadá', 'N', 'USA', 'A', 'C', 'A'],
  ['Javier', 'Aguirre', 1958, 0, 'México', 'N', 'MEX', 'A', 'B', 'D'],
  ['Walid', 'Regragui', 1975, 0, 'Marruecos', 'N', 'MAR', 'A', 'B', 'D'],
  ['Hajime', 'Moriyasu', 1968, 0, 'Japón', 'N', 'JPN', 'A', 'B', 'B'],
  ['Hong', 'Myung-bo', 1969, 0, 'Corea del Sur', 'N', 'KOR', 'A', 'C', 'B'],
  ['Roberto', 'De Zerbi', 1979, 0, 'Olympique de Marsella', 'C', 'ITA', 'A', 'B', 'A'],
  ['Enzo', 'Maresca', 1980, 0, 'Chelsea', 'C', 'ITA', 'A', 'B', 'M'],
  ['Marco', 'Silva', 1977, 0, 'Fulham', 'C', 'POR', 'A', 'C', 'B'],
  ['Ronald', 'Koeman', 1963, 0, 'Países Bajos', 'N', 'NED', 'A', 'B', 'B'],
  ['Domenico', 'Tedesco', 1985, 0, 'Bélgica', 'N', 'GER', 'A', 'C', 'A'],
  ['Luis', 'de la Fuente', 1961, 0, 'España', 'N', 'ESP', 'A', 'A', 'M'],
  ['Zlatko', 'Dalić', 1966, 0, 'Croacia', 'N', 'CRO', 'A', 'B', 'D'],
  ['Murat', 'Yakin', 1974, 0, 'Suiza', 'N', 'SUI', 'A', 'C', 'B'],
  ['Hugo', 'Broos', 1952, 0, 'Sudáfrica', 'N', 'BEL', 'A', 'D', 'D'],
  // Legends, Argentine (21)
  ['César Luis', 'Menotti', 1938, 2024, 'Argentina', 'N', 'ARG', 'L', 'S', 'A'],
  ['Carlos', 'Bilardo', 1938, 2024, 'Argentina', 'N', 'ARG', 'L', 'S', 'D'],
  ['Alejandro', 'Sabella', 1954, 2020, 'Argentina', 'N', 'ARG', 'L', 'A', 'B'],
  ['José', 'Pekerman', 1949, 0, 'Colombia', 'N', 'ARG', 'L', 'A', 'M'],
  ['Alfio', 'Basile', 1943, 0, 'Argentina', 'N', 'ARG', 'L', 'A', 'B'],
  ['Daniel', 'Passarella', 1953, 0, 'River Plate', 'C', 'ARG', 'L', 'B', 'D'],
  ['Carlos', 'Bianchi', 1949, 0, 'Boca Juniors', 'C', 'ARG', 'L', 'A', 'B'],
  ['Miguel Ángel', 'Russo', 1956, 2025, 'Boca Juniors', 'C', 'ARG', 'L', 'B', 'D'],
  ['Osvaldo', 'Zubeldía', 1927, 1982, 'Estudiantes de La Plata', 'C', 'ARG', 'L', 'A', 'D'],
  ['Juan Carlos', 'Lorenzo', 1922, 2001, 'Boca Juniors', 'C', 'ARG', 'L', 'B', 'D'],
  ['Carlos', 'Griguol', 1934, 2021, 'Ferro Carril Oeste', 'C', 'ARG', 'L', 'B', 'B'],
  ['Héctor', 'Veira', 1946, 2014, 'Argentinos Juniors', 'C', 'ARG', 'L', 'C', 'A'],
  ['Ángel', 'Labruna', 1918, 1983, 'River Plate', 'C', 'ARG', 'L', 'B', 'A'],
  ['Edgardo', 'Bauza', 1958, 2024, 'San Lorenzo', 'C', 'ARG', 'L', 'B', 'D'],
  ['Reinaldo', 'Merlo', 1950, 0, 'River Plate', 'C', 'ARG', 'L', 'C', 'B'],
  ['Ricardo', 'La Volpe', 1952, 0, 'México', 'N', 'ARG', 'L', 'C', 'M'],
  ['Gerardo', 'Martino', 1962, 0, "Newell's Old Boys", 'C', 'ARG', 'L', 'A', 'A'],
  ['Ángel', 'Cappa', 1946, 0, 'Huracán', 'C', 'ARG', 'L', 'C', 'A'],
  ['Alfredo', 'Di Stéfano', 1926, 2014, 'Valencia', 'C', 'ARG', 'L', 'C', 'A'],
  ['Ricardo', 'Gareca', 1958, 0, 'Perú', 'N', 'ARG', 'L', 'B', 'B'],
  ['Helenio', 'Herrera', 1910, 1997, 'Inter de Milán', 'C', 'ARG', 'L', 'A', 'D'],
  // Legends, other nationalities (9)
  ['Alex', 'Ferguson', 1941, 0, 'Manchester United', 'C', 'SCO', 'L', 'S', 'B'],
  ['Arrigo', 'Sacchi', 1946, 0, 'AC Milan', 'C', 'ITA', 'L', 'S', 'D'],
  ['Johan', 'Cruyff', 1947, 2016, 'FC Barcelona', 'C', 'NED', 'L', 'S', 'A'],
  ['Rinus', 'Michels', 1928, 2005, 'Países Bajos', 'N', 'NED', 'L', 'A', 'A'],
  ['Brian', 'Clough', 1935, 2004, 'Nottingham Forest', 'C', 'ENG', 'L', 'A', 'B'],
  ['Vicente', 'del Bosque', 1950, 0, 'España', 'N', 'ESP', 'L', 'A', 'M'],
  ['Mário', 'Zagallo', 1931, 2024, 'Brasil', 'N', 'BRA', 'L', 'A', 'A'],
  ['Ernst', 'Happel', 1925, 1992, 'Hamburgo', 'C', 'AUT', 'L', 'B', 'D'],
  ['Telê', 'Santana', 1931, 2006, 'São Paulo', 'C', 'BRA', 'L', 'B', 'A'],
]

export const COACH_CATALOG: readonly Coach[] = ROWS.map((row, index) => {
  const [name, surname, birthYear, deathYear, team, kind, nationality, status, tier, focus] = row
  return { id: `coach_${String(index + 1).padStart(3, '0')}`, name, surname, birthYear, ...(deathYear ? { deathYear } : {}), team, teamKind: kind === 'N' ? 'NATIONAL' : 'CLUB', nationality, status: status === 'A' ? 'ACTIVE' : 'LEGEND', tier, focus: FOCUS[focus], price: COACH_TIER_PRICE[tier] }
})

export const coachById = (id: string | undefined) => COACH_CATALOG.find((coach) => coach.id === id)
