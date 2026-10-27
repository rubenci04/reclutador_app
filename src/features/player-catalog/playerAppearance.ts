import appearanceData from '../../data/player-appearance.json'
import footData from '../../data/player-foot.json'

/** Only skin tone and hair length are drawn, never a likeness; a missing record falls back to the neutral default. */
export const SKIN_TONES = ['fair', 'tan', 'brown', 'dark'] as const
export const HAIR_STYLES = ['bald', 'short', 'medium', 'long'] as const
export const FEET = ['left', 'right', 'both'] as const
export type SkinTone = (typeof SKIN_TONES)[number]
export type HairStyle = (typeof HAIR_STYLES)[number]
export type PreferredFoot = (typeof FEET)[number]

export const SKIN_COLORS: Readonly<Record<SkinTone, { readonly head: string; readonly neck: string }>> = {
  fair: { head: '#f2cba8', neck: '#e3b891' }, tan: { head: '#dfb18a', neck: '#cf9f78' }, brown: { head: '#b57f57', neck: '#a26f49' }, dark: { head: '#7b4b32', neck: '#6b3f29' },
}
const DEFAULT_APPEARANCE: { readonly skin: SkinTone; readonly hair: HairStyle } = { skin: 'tan', hair: 'short' }

const appearance = appearanceData as Readonly<Record<string, { readonly skin?: string; readonly hair?: string } | undefined>>
const feet = footData as Readonly<Record<string, string | undefined>>
const pick = <T extends string>(list: readonly T[], value: string | undefined, fallback: T): T => (list as readonly string[]).includes(value ?? '') ? value as T : fallback

export function playerAppearance(id: string): { readonly skin: SkinTone; readonly hair: HairStyle } {
  const record = appearance[id]
  return { skin: pick(SKIN_TONES, record?.skin, DEFAULT_APPEARANCE.skin), hair: pick(HAIR_STYLES, record?.hair, DEFAULT_APPEARANCE.hair) }
}

/** Preferred foot when a verified record exists; undefined otherwise (nothing is invented). */
export function preferredFoot(id: string): PreferredFoot | undefined {
  const value = feet[id]
  return (FEET as readonly string[]).includes(value ?? '') ? value as PreferredFoot : undefined
}

/**
 * Hand-entered editorial details (docs/JUGADORES-APARIENCIA-COMPLETO.csv): hair colour and texture, facial hair, face shape, build, ears and
 * one distinguishing mark. Never inferred from photos. A missing field falls back to a neutral value, so every card still draws.
 */
export const HAIR_COLORS = { black: '#1f1b20', brown: '#4a3326', blonde: '#d8b45a', red: '#a84a2a', gray: '#8d8d92', white: '#e7e7ea' } as const
export const TEXTURES = ['straight', 'wavy', 'curly', 'coily'] as const
export const FACIAL_HAIR = ['none', 'mustache', 'stubble', 'beard', 'goatee', 'sideburns'] as const
export const FACES = ['oval', 'round', 'square', 'long', 'triangle'] as const
export const BUILDS = ['thin', 'slim', 'athletic', 'muscular', 'stocky'] as const
export const EARS = ['small', 'medium', 'large'] as const
export const MARKS = ['scar', 'mole', 'tattoo', 'brows'] as const
export type HairColor = keyof typeof HAIR_COLORS
export interface PlayerLook {
  readonly skin: SkinTone; readonly hair: HairStyle; readonly color: HairColor; readonly texture: (typeof TEXTURES)[number]
  readonly facial: (typeof FACIAL_HAIR)[number]; readonly face: (typeof FACES)[number]; readonly build: (typeof BUILDS)[number]
  readonly ears: (typeof EARS)[number]; readonly mark: (typeof MARKS)[number] | null
}
type Raw = { readonly skin?: string; readonly hair?: string; readonly hc?: string; readonly tx?: string; readonly fh?: string; readonly fc?: string; readonly bd?: string; readonly ea?: string; readonly mk?: string }

export function playerLook(id: string): PlayerLook {
  const raw = (appearance as Readonly<Record<string, Raw | undefined>>)[id]
  const base = playerAppearance(id)
  return {
    ...base,
    color: pick(Object.keys(HAIR_COLORS) as HairColor[], raw?.hc, 'black'), texture: pick(TEXTURES, raw?.tx, 'straight'), facial: pick(FACIAL_HAIR, raw?.fh, 'none'),
    face: pick(FACES, raw?.fc, 'oval'), build: pick(BUILDS, raw?.bd, 'athletic'), ears: pick(EARS, raw?.ea, 'medium'),
    mark: (MARKS as readonly string[]).includes(raw?.mk ?? '') ? raw!.mk as (typeof MARKS)[number] : null,
  }
}
