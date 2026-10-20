import { ATTRIBUTE_RANGE, CONTEMPORARY_PERIOD, EXPECTED_PLAYER_IDS, NATIONALITY_CODES, OVERALL_RANGE } from '../../data/catalogRules'
import { POSITIONS } from '../../types/football'
import { ERAS, PLAYER_CATEGORIES, type Player, type PlayerValidation, type ValidationIssue } from '../../types/player'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { isDominantFoot } from './dominantFoot'
import { normalizePlayerName, resolvePlayerIdentity } from './playerIdentity'
export { normalizePlayerName } from './playerIdentity'

const REQUIRED_FIELDS = [
  'id', 'name', 'position', 'era', 'category', 'reference_year', 'nationality', 'club_tag',
  'overall_rating', 'att_rating', 'def_rating', 'phy_rating', 'men_rating', 'price',
] as const satisfies readonly (keyof Player)[]
const NUMERIC_FIELDS = ['overall_rating', 'att_rating', 'def_rating', 'phy_rating', 'men_rating', 'price'] as const

export function validatePlayer(input: unknown, allowedIds: readonly string[] = EXPECTED_PLAYER_IDS): PlayerValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, issues: [{ code: 'invalid_record' }] }
  }
  const record = input as Record<string, unknown>
  const issues: ValidationIssue[] = []
  if (record.dominantFoot !== undefined && !isDominantFoot(record.dominantFoot)) {
    issues.push({ code: 'invalid_dominant_foot', field: 'dominantFoot', actual: record.dominantFoot })
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(record, field) || record[field] === undefined || record[field] === null) {
      issues.push({ code: 'missing_field', field })
    }
  }
  const present = (field: keyof Player) => !issues.some((issue) => issue.field === field)
  for (const field of ['id', 'name', 'position', 'era', 'nationality', 'club_tag'] as const) {
    if (present(field) && (typeof record[field] !== 'string' || !(record[field] as string).trim())) {
      issues.push({ code: 'empty_text', field, actual: record[field] })
    }
  }
  const member = (values: readonly string[], field: keyof Player, code: ValidationIssue['code']) => {
    if (present(field) && !values.includes(record[field] as string)) {
      issues.push({ code, field, actual: record[field] })
    }
  }
  member(allowedIds, 'id', 'invalid_id')
  member(POSITIONS, 'position', 'invalid_position')
  member(ERAS, 'era', 'invalid_era')
  member(PLAYER_CATEGORIES, 'category', 'invalid_category')
  member(NATIONALITY_CODES, 'nationality', 'invalid_nationality')
  if (present('reference_year')) {
    const year = record.reference_year
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 1950 || year > CONTEMPORARY_PERIOD.max) {
      issues.push({ code: 'invalid_reference_year', field: 'reference_year', expected: '1950..2026 integer', actual: year })
    } else {
      if (present('era') && record.era !== `${Math.floor(year / 10) * 10}s`) {
        issues.push({ code: 'era_mismatch', field: 'era', expected: `${Math.floor(year / 10) * 10}s`, actual: record.era })
      }
      if (present('category') && ((record.category === 'contemporary' && year < CONTEMPORARY_PERIOD.min) || (record.category === 'legend' && year >= CONTEMPORARY_PERIOD.min))) {
        issues.push({ code: 'category_year_mismatch', field: 'reference_year', actual: year })
      }
    }
  }
  if (present('name') && !normalizePlayerName(record.name as string)) {
    issues.push({ code: 'empty_text', field: 'name', actual: record.name })
  }
  if (present('name') && present('id')) {
    const registeredId = resolvePlayerIdentity(record.name as string)
    if (registeredId && registeredId !== record.id && !String(record.id).startsWith('import_') && !String(record.id).startsWith('edition_')) {
      issues.push({ code: 'identity_mismatch', field: 'name', expected: registeredId, actual: record.id })
    }
  }
  if (present('club_tag') && !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(record.club_tag as string)) {
    issues.push({ code: 'invalid_club_tag', field: 'club_tag', actual: record.club_tag })
  }
  for (const field of NUMERIC_FIELDS) {
    if (!present(field)) continue
    const value = record[field]
    const range = field === 'overall_rating' ? OVERALL_RANGE : field === 'price' ? { min: 3, max: 25 } : ATTRIBUTE_RANGE
    if (typeof value !== 'number' || !Number.isInteger(value) || value < range.min || value > range.max) {
      issues.push({ code: 'invalid_number', field, expected: `${range.min}..${range.max} integer`, actual: value })
    }
  }
  if (present('overall_rating') && present('price')) {
    const expected = calculatePlayerPrice(record.overall_rating as number)
    if (record.price !== expected) issues.push({ code: 'price_mismatch', field: 'price', expected, actual: record.price })
  }
  // All required fields have passed runtime checks before narrowing the external input.
  return issues.length ? { valid: false, issues } : { valid: true, player: input as Player, issues: [] }
}
