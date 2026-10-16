export const POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
export type Position = (typeof POSITIONS)[number]
