import { describe, expect, it } from 'vitest'
import type { Player } from '../../types/player'
import { DRAFT_CATALOG } from '../draft/catalog'
import { evaluateSlotAptitude } from './roleProfiles'

const defender = DRAFT_CATALOG.find((p) => p.position === 'DEF')!
const as = (patch: Partial<Player>): Player => ({ ...defender, ...patch })

describe('TECH-006 evaluateSlotAptitude', () => {
  it('reads the foot on each flank and gives strong one-footed players an adapted fit', () => {
    expect(evaluateSlotAptitude(as({ dominantFoot: 'LEFT' }), 'LB')).toBe('NATURAL')
    expect(evaluateSlotAptitude(as({ dominantFoot: 'BOTH' }), 'RB')).toBe('NATURAL')
    expect(evaluateSlotAptitude(as({ dominantFoot: 'RIGHT' }), 'RB')).toBe('NATURAL')
    expect(evaluateSlotAptitude(as({ dominantFoot: 'RIGHT', att_rating: 85, phy_rating: 85 }), 'LB')).toBe('ADAPTED')
    expect(evaluateSlotAptitude(as({ dominantFoot: 'RIGHT', att_rating: 50, phy_rating: 50 }), 'LB')).toBe('UNKNOWN')
  })
  it('puts defence and physique first in central defensive slots', () => {
    expect(evaluateSlotAptitude(as({ def_rating: 88, phy_rating: 80 }), 'LCB')).toBe('NATURAL')
    expect(evaluateSlotAptitude(as({ def_rating: 74, phy_rating: 66 }), 'RCB')).toBe('ADAPTED')
    expect(evaluateSlotAptitude(as({ def_rating: 50, phy_rating: 50 }), 'LCB')).toBe('UNKNOWN')
  })
  it('never fits a player outside the slot line and follows the formation geometry', () => {
    expect(evaluateSlotAptitude(as({ dominantFoot: 'LEFT' }), 'LW')).toBe('UNKNOWN')
    const midfielder = DRAFT_CATALOG.find((p) => p.position === 'MED')!
    // In 4-4-2 the right midfielder stands on the touchline.
    expect(evaluateSlotAptitude({ ...midfielder, dominantFoot: 'RIGHT' }, 'RCM', '4-4-2')).toBe('NATURAL')
  })
})
