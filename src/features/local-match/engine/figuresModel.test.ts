import { describe, expect, it } from 'vitest'
import { MOMENT_MAX_OSCILLATION, MOMENTS_PER_HALF, SEGMENTS } from './engineConstants'
import { goalProbability, momentProbability, playFiguresMatch, runFiguresMatch, type FiguresSetup, type Lines } from './figuresModel'

const flat = (value: number): Lines => ({ attack: value, midfield: value, defense: value, keeper: value })
const setup = (seed: string, local: Lines, cpu: Lines, tempo = 0): FiguresSetup => ({ seed, sides: { local: { lines: Array(SEGMENTS).fill(local), tempo }, cpu: { lines: Array(SEGMENTS).fill(cpu), tempo } } })

/** Ranges only, never exact results: 4,000 matches keep the run fast and the error of each rate under about one point and a half. */
function rates(local: Lines, cpu: Lines, label: string, matches = 4000, tempo = 0) {
  const total = { win: 0, draw: 0, loss: 0, goals: 0 }
  for (let index = 0; index < matches; index++) {
    const { score } = playFiguresMatch(setup(`${label}-${index}`, local, cpu, tempo))
    total.goals += score.local + score.cpu
    if (score.local > score.cpu) total.win++; else if (score.local < score.cpu) total.loss++; else total.draw++
  }
  return { win: total.win / matches, draw: total.draw / matches, loss: total.loss / matches, goals: total.goals / matches }
}

describe('figures model calibration', () => {
  it('even teams: about 2.5 goals and 37/26/37', () => {
    const r = rates(flat(85), flat(85), 'even')
    expect(r.goals).toBeGreaterThan(2.3); expect(r.goals).toBeLessThan(2.7)
    expect(r.win).toBeGreaterThan(0.33); expect(r.win).toBeLessThan(0.41)
    expect(r.draw).toBeGreaterThan(0.22); expect(r.draw).toBeLessThan(0.31)
  })
  it('10 points of mean: the favourite wins about 65%', () => {
    const r = rates(flat(95), flat(85), 'ten')
    expect(r.win).toBeGreaterThan(0.6); expect(r.win).toBeLessThan(0.7)
  })
  it('20 points of mean: about 85% and the upset never drops under 3%', () => {
    const r = rates(flat(105), flat(85), 'twenty')
    expect(r.win).toBeGreaterThan(0.82); expect(r.win).toBeLessThan(0.91)
    expect(r.loss).toBeGreaterThan(0.03)
  })
  it('every line matters: attack, midfield and goalkeeper move the result in the right direction', () => {
    const even = rates(flat(85), flat(85), 'lines').win
    expect(rates({ ...flat(85), attack: 95 }, flat(85), 'lines').win).toBeGreaterThan(even + 0.05)
    expect(rates({ ...flat(85), midfield: 95 }, flat(85), 'lines').win).toBeGreaterThan(even + 0.03)
    expect(rates({ ...flat(85), defense: 95 }, flat(85), 'lines').win).toBeGreaterThan(even + 0.03)
    expect(rates({ ...flat(85), keeper: 95 }, flat(85), 'lines').win).toBeGreaterThan(even + 0.01)
  })
  it('an offensive tactic gives more goals; a low block gives fewer', () => {
    const even = rates(flat(85), flat(85), 'tempo').goals
    expect(rates(flat(85), flat(85), 'tempo', 4000, 0.1).goals).toBeGreaterThan(even + 0.2)
    expect(rates(flat(85), flat(85), 'tempo', 4000, -0.1).goals).toBeLessThan(even - 0.2)
  })
  it('goal probability follows attack, defence and goalkeeper, and a penalty is far above open play', () => {
    expect(goalProbability('open', flat(95), flat(85))).toBeGreaterThan(goalProbability('open', flat(85), flat(85)))
    expect(goalProbability('open', flat(85), { ...flat(85), keeper: 95 })).toBeLessThan(goalProbability('open', flat(85), flat(85)))
    expect(goalProbability('penalty', flat(85), flat(85))).toBeGreaterThan(0.6)
  })
})

describe('figures model determinism and statistics', () => {
  it('same seed and data, same match; different seed, another one', () => {
    const a = playFiguresMatch(setup('seed-1', flat(88), flat(84)))
    expect(playFiguresMatch(setup('seed-1', flat(88), flat(84)))).toEqual(a)
    const others = Array.from({ length: 20 }, (_, index) => JSON.stringify(playFiguresMatch(setup(`seed-other-${index}`, flat(88), flat(84))).segments))
    expect(new Set(others).size).toBeGreaterThan(15)
  })
  it('score, shots and the list of chances come from the same chances', () => {
    for (let index = 0; index < 50; index++) {
      const p = playFiguresMatch(setup(`consistent-${index}`, flat(88), flat(84)))
      const chances = p.segments.flatMap((segment) => segment.chances)
      expect(chances.filter((c) => c.side === 'local' && c.outcome === 'goal').length).toBe(p.score.local)
      expect(chances.filter((c) => c.side === 'cpu' && c.outcome === 'goal').length).toBe(p.score.cpu)
      expect(chances.every((c) => c.minute >= 1 && c.minute <= 90 && Math.ceil(c.minute / 15) - 1 === c.segment)).toBe(true)
    }
  })
})

describe('moments', () => {
  it('at most 3 per half, 6 per match, and the probability moves at most the oscillation', () => {
    let seen = 0
    for (let index = 0; index < 300; index++) {
      const p = playFiguresMatch(setup(`moments-${index}`, flat(88), flat(84)))
      const moments = p.segments.flatMap((segment) => segment.moment ? [segment.moment] : [])
      seen += moments.length
      expect(moments.filter((m) => m.segment < SEGMENTS / 2).length).toBeLessThanOrEqual(MOMENTS_PER_HALF)
      expect(moments.filter((m) => m.segment >= SEGMENTS / 2).length).toBeLessThanOrEqual(MOMENTS_PER_HALF)
      for (const m of moments) {
        expect(Math.abs(m.probability - m.baseProbability)).toBeLessThanOrEqual(MOMENT_MAX_OSCILLATION + 1e-9)
        expect(m.difficulty).toBeGreaterThanOrEqual(0); expect(m.difficulty).toBeLessThanOrEqual(1)
        expect(m.automatic).toBe(true)
      }
    }
    expect(seen / 300).toBeGreaterThan(5)
  })
  it('quality moves the probability for the protagonist: attack gains, defence loses goals', () => {
    expect(momentProbability(0.2, 1, 'attack')).toBeCloseTo(0.2 + MOMENT_MAX_OSCILLATION)
    expect(momentProbability(0.2, 0.5, 'attack')).toBeCloseTo(0.2)
    expect(momentProbability(0.5, 1, 'defense')).toBeCloseTo(0.5 - MOMENT_MAX_OSCILLATION)
    expect(momentProbability(0.5, 0, 'defense')).toBeCloseTo(0.5 + MOMENT_MAX_OSCILLATION)
  })
  it('the score picks the intent: 0-0 opens, a lead of two or more protects, a deficit comes back', () => {
    const first = runFiguresMatch(setup('intent-0', flat(85), flat(85)), {}, ['local'])
    expect(first.waiting?.intent).toBe('open')
    let sawProtect = false; let sawComeback = false
    for (let index = 0; index < 400 && !(sawProtect && sawComeback); index++) {
      const p = playFiguresMatch(setup(`intent-${index}`, flat(105), flat(80)))
      let before = { local: 0, cpu: 0 }
      for (const segment of p.segments) {
        const m = segment.moment
        if (m) {
          const lead = before[m.side] - before[m.side === 'local' ? 'cpu' : 'local']
          if (lead >= 2) { expect(m.intent).toBe('protect'); sawProtect = true }
          if (lead < 0) { expect(m.intent).toBe('comeback'); sawComeback = true }
        }
        before = segment.score
      }
    }
    expect(sawProtect && sawComeback).toBe(true)
  })
  it('step by step: a human moment waits, the quality resolves it and only that chance changes', () => {
    const base = setup('steps-1', flat(88), flat(84))
    const auto = playFiguresMatch(base)
    let qualities: Record<number, number> = {}
    let progress = runFiguresMatch(base, qualities, ['local'])
    let asked = 0
    while (!progress.finished) { asked++; qualities = { ...qualities, [progress.waiting!.segment]: 0.5 }; progress = runFiguresMatch(base, qualities, ['local']) }
    expect(asked).toBeGreaterThan(0); expect(asked).toBeLessThanOrEqual(SEGMENTS)
    // Neutral quality (0.5) changes no probability: the match equals the automatic one except for the moments' own automatic quality.
    const perfect = runFiguresMatch(base, Object.fromEntries(Array.from({ length: SEGMENTS }, (_, s) => [s, 1])), ['local'])
    const poor = runFiguresMatch(base, Object.fromEntries(Array.from({ length: SEGMENTS }, (_, s) => [s, 0])), ['local'])
    expect(perfect.finished && poor.finished).toBe(true)
    // Later moments depend on the score, so only the first segment is guaranteed to differ in nothing but its moment's chance.
    const localChances = (p: typeof perfect) => p.segments.slice(0, 1).flatMap((s) => s.chances).filter((c) => !c.moment).map((c) => `${c.minute}-${c.side}-${c.outcome}`)
    expect(localChances(perfect)).toEqual(localChances(poor))
    expect(auto.finished).toBe(true)
  })
  it('a person playing well wins more often than one playing badly', () => {
    const wins = (quality: number) => {
      let n = 0
      for (let index = 0; index < 600; index++) {
        const base = setup(`human-${index}`, flat(85), flat(85))
        const p = runFiguresMatch(base, Object.fromEntries(Array.from({ length: SEGMENTS }, (_, s) => [s, quality])), ['local'])
        if (p.score.local > p.score.cpu) n++
      }
      return n / 600
    }
    expect(wins(1)).toBeGreaterThan(wins(0) + 0.1)
  })
})
