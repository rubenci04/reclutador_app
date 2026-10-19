import type { ThemedModeId } from './modeTypes'

export const CATEGORY_GROUPS = [
  { id: 'global', modes: ['GLOBAL_CLASSIC', 'LEGENDS_ONLY'] },
  { id: 'argentina', modes: ['ARGENTINA_CURRENT', 'ARGENTINA_LEGENDS'] },
  { id: 'england', modes: ['ENGLAND_LEAGUE', 'ENGLAND_LEGENDS'] },
  { id: 'spain', modes: ['SPAIN_LEAGUE', 'SPAIN_LEGENDS'] },
  { id: 'brazil', modes: ['BRAZIL_CURRENT', 'BRAZIL_LEGENDS'] },
  { id: 'latinAmerica', modes: ['SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS'] },
  { id: 'europe', modes: ['EUROPE_CURRENT', 'EUROPE_LEGENDS'] },
] as const satisfies readonly { readonly id: string; readonly modes: readonly ThemedModeId[] }[]
export type CategoryGroupId = (typeof CATEGORY_GROUPS)[number]['id']
