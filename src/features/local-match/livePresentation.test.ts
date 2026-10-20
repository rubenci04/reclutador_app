import { describe, expect, it } from 'vitest'
import { advanceBlock, exportResult } from './interactive'
import { liveSession } from './interactive/liveFixtures.test-support'
import { keepWindow } from './interactive/liveModel'
import { frameFocus, frameSounds, liveFrames } from './livePresentation'
import { ballPoint, boardDots, focusWindow, homePoint, teamShift } from './boardGeometry'
import { formationSlots } from '../tactics/formations'
import type { Session } from './interactive'

function played(): Session {
  let session = liveSession()
  for (let guard = 0; guard < 20 && session.phase !== 'FINISHED'; guard++) {
    const next = session.phase === 'WINDOW' ? keepWindow(session) : advanceBlock(session)
    if (!next.ok) throw new Error(next.error)
    session = next.value
  }
  return session
}

describe('SIM-005R-01 presentation frames', () => {
  it('reveals each confirmed block one opportunity at a time without altering its score', () => {
    const session = played(); const blocks = session.kernel.blocks
    const frames = liveFrames(blocks)
    expect(frames.length).toBeGreaterThan(blocks.length)
    for (const block of blocks) {
      const own = frames.filter((frame) => frame.minute === block.minute)
      expect(own.at(-1)!.lastOfBlock).toBe(true); expect(own.filter((frame) => frame.lastOfBlock)).toHaveLength(1)
      expect(own.at(-1)!.score).toEqual(block.score)
      expect(own.flatMap((frame) => frame.events)).toEqual(block.events)
    }
    const result = exportResult(session); if (!result.ok) throw new Error(result.error)
    expect(frames.at(-1)!.score).toEqual(result.value.result.score)
  })
  it('keeps the score monotonic and never ahead of the goals shown', () => {
    const frames = liveFrames(played().kernel.blocks); let goals = { local: 0, cpu: 0 }
    for (const frame of frames) {
      for (const item of frame.events) if (item.type === 'goal' && item.side) goals = { ...goals, [item.side]: goals[item.side] + 1 }
      expect(frame.score).toEqual(goals)
    }
  })
  it('assigns whistles to the half-time and final frames and one effect per frame', () => {
    const frames = liveFrames(played().kernel.blocks)
    const half = frames.filter((frame) => frameSounds(frame).includes('halfTimeWhistle')); const end = frames.filter((frame) => frameSounds(frame).includes('finalWhistle'))
    expect(half).toHaveLength(1); expect(half[0].minute).toBe(45); expect(end).toHaveLength(1); expect(end[0].minute).toBe(90)
    for (const frame of frames) expect(frameSounds(frame).filter((id) => id === 'goal' || id === 'shot').length).toBeLessThanOrEqual(1)
    for (const frame of frames.filter((f) => f.events.some((e) => e.type === 'goal'))) expect(frameSounds(frame)).toContain('goal')
  })
  it('focuses the most important event of a frame and nothing before kick-off', () => {
    expect(frameFocus(undefined)).toBeNull()
    const frames = liveFrames(played().kernel.blocks)
    for (const frame of frames.filter((f) => f.events.some((e) => e.type === 'goal'))) expect(frameFocus(frame)!.type).toBe('goal')
  })
})

describe('SIM-005R-01 board geometry', () => {
  it('places the local side on the left and the cpu on the right, mirrored across the width', () => {
    const lineup = liveSession().kernel.sides.local.team.lineup
    const dots = boardDots({ local: '4-3-3', cpu: '4-4-2' }, { local: lineup, cpu: liveSession().kernel.sides.cpu.team.lineup })
    expect(dots).toHaveLength(22)
    expect(Math.max(...dots.filter((d) => d.side === 'local').map((d) => d.home.x))).toBeLessThan(.5)
    expect(Math.min(...dots.filter((d) => d.side === 'cpu').map((d) => d.home.x))).toBeGreaterThan(.5)
    const gk = formationSlots('4-3-3').find((slot) => slot.id === 'GK')!
    expect(homePoint('local', gk).x).toBeLessThan(.2); expect(homePoint('cpu', gk).x).toBeGreaterThan(.8)
  })
  it('moves the ball toward the attacked goal and never invents a carrier for events without a player', () => {
    expect(ballPoint({ kind: 'idle', side: null })).toEqual({ x: .5, y: .5 })
    expect(ballPoint({ kind: 'goal', side: 'local' }).x).toBeGreaterThan(.95); expect(ballPoint({ kind: 'goal', side: 'cpu' }).x).toBeLessThan(.05)
    expect(ballPoint({ kind: 'save', side: 'cpu' }).x).toBeGreaterThan(.9); expect(ballPoint({ kind: 'save', side: 'local' }).x).toBeLessThan(.1)
    expect(teamShift({ kind: 'attack', side: 'local' }, 'local')).toBeGreaterThan(0); expect(teamShift({ kind: 'attack', side: 'local' }, 'cpu')).toBeGreaterThan(0) // cpu drops back toward its own (right) goal
    expect(teamShift({ kind: 'idle', side: null }, 'local')).toBe(0)
  })
  it('keeps both goal labels reachable in each focus', () => {
    expect(focusWindow('full')).toEqual({ from: 0, to: 1 }); expect(focusWindow('local').from).toBe(0); expect(focusWindow('cpu').to).toBe(1)
  })
})

