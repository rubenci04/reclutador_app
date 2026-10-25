import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../../draft/catalog'
import { advanceBlock, submitPlay } from './session'
import { keepWindow } from './liveModel'
import { must, treeSession } from './liveFixtures.test-support'
import { crossChance, deliverySkill, passChance } from './attackTree'
import type { PlayCommand, Session } from './types'

const neutral = { local: 'NEUTRAL', cpu: 'NEUTRAL' } as const
const [passer, receiver, defender] = DRAFT_CATALOG.filter((p) => p.position === 'MED' && p.overall_rating > 70 && p.overall_rating < 80)

describe('SIM-FIELD-003 delivery precision on passes and crosses', () => {
  it('adds exactly nothing at the neutral 0.5, so a plain tap and every historical run keep their numbers', () => {
    expect(deliverySkill()).toBe(0); expect(deliverySkill(.5)).toBe(0)
    expect(passChance(passer, receiver, defender, 0, neutral, .5)).toBe(passChance(passer, receiver, defender, 0, neutral))
    expect(crossChance(passer, receiver, defender, 0, .5)).toBe(crossChance(passer, receiver, defender, 0))
  })
  it('moves a pass or cross by up to 8 points either way and stays inside the old clamps', () => {
    const base = passChance(passer, receiver, defender, 0, neutral)
    expect(passChance(passer, receiver, defender, 0, neutral, 1)).toBeCloseTo(Math.min(.90, base + .08), 10)
    expect(passChance(passer, receiver, defender, 0, neutral, 0)).toBeCloseTo(Math.max(.28, base - .08), 10)
    const cross = crossChance(passer, receiver, defender, 0)
    expect(crossChance(passer, receiver, defender, 0, 1)).toBeCloseTo(Math.min(.82, cross + .08), 10)
    expect(crossChance(passer, receiver, defender, 0, 0)).toBeCloseTo(Math.max(.22, cross - .08), 10)
    expect(passChance(passer, receiver, defender, 0, neutral, 7)).toBe(passChance(passer, receiver, defender, 0, neutral, 1))
  })
})

describe('SIM-FIELD-003 command validation', () => {
  const toPlay = (seed: string): Session => {
    let s = treeSession(seed)
    for (let n = 0; n < 40 && s.phase !== 'PLAY' && s.phase !== 'FINISHED'; n++) s = s.phase === 'WINDOW' ? must(keepWindow(s)) : must(advanceBlock(s))
    return s
  }
  const command = (s: Session, extra: Partial<PlayCommand> = {}): PlayCommand => { const p = s.kernel.partial!.play!; return { version: 'interactive-play-command-v1', id: `${s.sessionId}:${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice: p.options.find((o) => o.available)!.choice, ...extra } }
  it('accepts a precision on a pass and records it; refuses one outside 0-1', () => {
    const s = toPlay('delivery-a')
    expect(s.phase).toBe('PLAY')
    expect(s.kernel.partial!.play!.node).toBe('DIRECTION')
    expect(submitPlay(s, command(s, { precision: 1.2 })).ok).toBe(false)
    const done = must(submitPlay(s, command(s, { precision: .83 })))
    expect(done.kernel.tree!.log.at(-1)).toMatchObject({ node: 'DIRECTION', precision: .83 })
  })
  it('records nothing for a plain tap, and the neutral 0.5 resolves exactly like the plain tap', () => {
    const s = toPlay('delivery-b')
    expect(s.phase).toBe('PLAY')
    const plain = must(submitPlay(s, command(s)))
    const neutralTap = must(submitPlay(s, command(s, { precision: .5 })))
    expect(plain.kernel.tree!.log.at(-1)).not.toHaveProperty('precision')
    expect(neutralTap.kernel.partial?.events ?? neutralTap.kernel.blocks.at(-1)?.events).toEqual(plain.kernel.partial?.events ?? plain.kernel.blocks.at(-1)?.events)
  })
})
