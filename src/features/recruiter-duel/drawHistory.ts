import type { Player } from '../../types/player'
import { createSecureSeed } from '../local-match/seededRandom'

export const DRAW_HISTORY_KEY = 'reclutador.duel-draws.v1'
export interface DrawContext {
  readonly version: 1
  readonly catalogKey: string
  readonly recent: readonly (readonly string[])[]
}
export interface DrawReplay { readonly seed: string; readonly context: DrawContext }
export interface DrawHistory { readonly version: 1; readonly games: readonly DrawReplay[] }

// Includes every sporting input; canonical ordering prevents catalog-order bias.
export const catalogKey = (catalog: readonly Player[]) => JSON.stringify([...catalog].sort((a, b) => a.id.localeCompare(b.id)))
export function validContext(value: unknown, catalog: readonly Player[]): value is DrawContext {
  if (!value || typeof value !== 'object') return false
  const item = value as DrawContext
  const ids = new Set(catalog.map((player) => player.id))
  return item.version === 1 && item.catalogKey === catalogKey(catalog) && Array.isArray(item.recent) && item.recent.length <= 5
    && item.recent.every((draw) => Array.isArray(draw) && draw.length <= 22 && new Set(draw).size === draw.length && draw.every((id) => typeof id === 'string' && ids.has(id)))
}
export function parseReplay(text: string, catalog: readonly Player[]): DrawReplay | null {
  try {
    if (text.length > 250_000) return null
    const value = JSON.parse(text) as DrawReplay
    return typeof value?.seed === 'string' && value.seed.length > 0 && value.seed.length <= 256 && validContext(value.context, catalog) ? value : null
  } catch { return null }
}
export function readDrawHistory(storage: Pick<Storage, 'getItem'>, catalog: readonly Player[]): { history: DrawHistory; warning: boolean } {
  const empty: DrawHistory = { version: 1, games: [] }
  try {
    const raw = storage.getItem(DRAW_HISTORY_KEY)
    if (!raw) return { history: empty, warning: false }
    if (raw.length > 1_250_000) return { history: empty, warning: true }
    const value = JSON.parse(raw) as DrawHistory
    if (value?.version !== 1 || !Array.isArray(value.games) || value.games.length > 5 || value.games.some((game) => !parseReplay(JSON.stringify(game), catalog))) return { history: empty, warning: true }
    return { history: value, warning: false }
  } catch { return { history: empty, warning: true } }
}
export function createDrawContext(catalog: readonly Player[], recent: readonly (readonly string[])[] = []): DrawContext {
  const ids = new Set(catalog.map((player) => player.id))
  return { version: 1, catalogKey: catalogKey(catalog), recent: recent.slice(-5).map((draw) => [...new Set(draw.filter((id) => ids.has(id)))].slice(0, 22)) }
}
export function newDrawSeed(): string {
  return createSecureSeed()
}
