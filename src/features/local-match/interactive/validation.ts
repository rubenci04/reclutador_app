import { DOMINANT_FEET, ERAS, PLAYER_CATEGORIES, type Player } from '../../../types/player'
import { POSITIONS } from '../../../types/football'
import { isFormationId } from '../../tactics/formations'
import { playerIdentityKey } from '../../player-catalog/playerIdentity'
import { parseStrategySelection } from '../../tactics/strategies'
import type { SimulationInput } from '../simulator'

export const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
export const exact = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) => required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
export const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 256
export const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0

/** Reject non-JSON values rather than silently dropping functions, non-finite numbers or instances. */
export function jsonSafe(value: unknown, depth = 0): boolean {
  if (depth > 40) return false
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i) && jsonSafe(value[i], depth + 1)).every(Boolean)
  return object(value) && Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every((item) => item === undefined || jsonSafe(item, depth + 1))
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (object(value)) return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function validPlayer(p: unknown): p is Player {
  if (!object(p) || !exact(p, ['id', 'name', 'position', 'era', 'category', 'reference_year', 'nationality', 'club_tag', 'overall_rating', 'att_rating', 'def_rating', 'phy_rating', 'men_rating', 'price'], ['dominantFoot'])) return false
  return ['id', 'name', 'nationality', 'club_tag'].every((key) => text(p[key])) && POSITIONS.includes(p.position as Player['position']) && ERAS.includes(p.era as Player['era']) && PLAYER_CATEGORIES.includes(p.category as Player['category']) && integer(p.reference_year) && integer(p.price) && ['overall_rating', 'att_rating', 'def_rating', 'phy_rating', 'men_rating'].every((key) => typeof p[key] === 'number' && Number.isFinite(p[key]) && (p[key] as number) >= 0 && (p[key] as number) <= 100) && (p.dominantFoot === undefined || DOMINANT_FEET.includes(p.dominantFoot as Player['dominantFoot'] & string))
}

export function validInput(value: unknown): value is SimulationInput {
  if (!object(value) || !jsonSafe(value) || !exact(value, ['localLineup', 'cpuLineup', 'catalog', 'catalogVersion', 'rulesVersion', 'seed', 'actionModel'], ['formations', 'seriesFormat', 'tactics', 'rosterBonus', 'budget', 'benches', 'coaches'])) return false
  if (value.actionModel !== 'action-v3' || value.catalogVersion !== 'catalog_v1' || value.rulesVersion !== 'local-match-v2' || typeof value.seed !== 'string' || value.seed.length > 1024 || !Array.isArray(value.catalog) || value.catalog.length > 10000 || !value.catalog.every(validPlayer) || new Set(value.catalog.map((p) => p.id)).size !== value.catalog.length) return false
  if (!object(value.localLineup) || !object(value.cpuLineup)) return false
  if (value.budget !== undefined && (!integer(value.budget) || value.budget <= 0)) return false
  if (value.rosterBonus !== undefined && typeof value.rosterBonus !== 'boolean' || value.seriesFormat !== undefined && value.seriesFormat !== 'home-away') return false
  if (value.formations !== undefined && (!object(value.formations) || !exact(value.formations, ['local', 'cpu']) || !isFormationId(value.formations.local) || !isFormationId(value.formations.cpu))) return false
  if (value.tactics !== undefined && (!object(value.tactics) || !exact(value.tactics, ['version', 'local', 'cpu']) || !parseStrategySelection(value.tactics))) return false
  if (value.benches !== undefined && (!object(value.benches) || !exact(value.benches, ['local', 'cpu']) || !['local', 'cpu'].every((side) => Array.isArray((value.benches as Record<string, unknown>)[side]) && ((value.benches as Record<string, string[]>)[side]).every(text)))) return false
  if (value.coaches !== undefined && (!object(value.coaches) || !exact(value.coaches, ['local', 'cpu']) || !Object.values(value.coaches).every((c) => c === null || object(c) && exact(c, ['id', 'attack', 'defense', 'midfield']) && text(c.id) && ['attack', 'defense', 'midfield'].every((key) => typeof c[key] === 'number' && Number.isFinite(c[key]) && (c[key] as number) >= 0 && (c[key] as number) <= 10)))) return false
  return true
}

export function exclusiveRoster(ids: readonly string[], catalog: readonly Player[]) {
  const players = ids.map((id) => catalog.find((p) => p.id === id))
  return players.every(Boolean) && new Set(ids).size === ids.length && new Set(players.map((p) => playerIdentityKey(p!.name))).size === ids.length
}
