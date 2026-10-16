import type { Position } from '../types/football'

export const INITIAL_SETUP = { budgetMillions: 100, formation: '4-3-3', starters: 0, teamSize: 11 } as const
// Visual coordinates only. No selection, player catalog or game rules yet.
export const PITCH_SLOTS: { position: Position; x: number; y: number }[] = [
  { position: 'DEL', x: 23, y: 18 }, { position: 'DEL', x: 50, y: 14 }, { position: 'DEL', x: 77, y: 18 },
  { position: 'MED', x: 23, y: 43 }, { position: 'MED', x: 50, y: 40 }, { position: 'MED', x: 77, y: 43 },
  { position: 'DEF', x: 14, y: 66 }, { position: 'DEF', x: 38, y: 70 }, { position: 'DEF', x: 62, y: 70 }, { position: 'DEF', x: 86, y: 66 },
  { position: 'ARQ', x: 50, y: 88 },
]
