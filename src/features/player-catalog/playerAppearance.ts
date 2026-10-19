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
