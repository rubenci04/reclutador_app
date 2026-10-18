import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { MatchScreen } from '../local-match/MatchScreen'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { simulateMatch } from '../local-match/simulator'
import { INFLUENCE_THRESHOLD, eventInfluence } from './eventInfluence'
import { STRATEGY_IDS, TACTICS_VERSION, type StrategyId } from './strategies'

const zero = { attack: 0, defense: 0, midfield: 0 }
const lineups = { local: generateCpuTeam(DRAFT_CATALOG, 'tg-1').team.lineup, cpu: generateCpuTeam(DRAFT_CATALOG, 'tg-2').team.lineup }
const run = (a: StrategyId, b: StrategyId, seed: string) => simulateMatch({ localLineup: lineups.local, cpuLineup: lineups.cpu, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed, tactics: { version: TACTICS_VERSION, local: a, cpu: b } })

describe('event influence', () => {
  const both = { local: 'NEUTRAL', cpu: 'NEUTRAL' } as const
  it('tags only when the stored adjustment passes the threshold and matches the event role', () => {
    const big = INFLUENCE_THRESHOLD + 1
    expect(eventInfluence('attack', 'local', { ...both, local: 'WIDE_PLAY' }, { local: { ...zero, attack: big }, cpu: zero })).toBe('WIDE_PLAY')
    expect(eventInfluence('attack', 'local', { ...both, local: 'WIDE_PLAY' }, { local: { ...zero, attack: INFLUENCE_THRESHOLD }, cpu: zero })).toBeUndefined()
    expect(eventInfluence('goal', 'cpu', { ...both, cpu: 'MIDFIELD_CONTROL' }, { local: zero, cpu: { ...zero, midfield: big } })).toBe('MIDFIELD_CONTROL')
    expect(eventInfluence('recovery', 'cpu', { ...both, cpu: 'HIGH_PRESS' }, { local: zero, cpu: { ...zero, midfield: big } })).toBe('HIGH_PRESS')
    expect(eventInfluence('save', 'local', { ...both, local: 'LOW_BLOCK' }, { local: { ...zero, defense: big }, cpu: zero })).toBe('LOW_BLOCK')
    // A block that only helps the other team, or a neutral team, is never credited.
    expect(eventInfluence('save', 'local', { ...both, local: 'COUNTER_ATTACK' }, { local: { ...zero, defense: big }, cpu: zero })).toBeUndefined()
    expect(eventInfluence('attack', 'local', both, { local: { ...zero, attack: big }, cpu: zero })).toBeUndefined()
    expect(eventInfluence('final', null, both, { local: zero, cpu: zero })).toBeUndefined()
  })
})

describe('narration does not change results', () => {
  it('reproduces 288 recorded tactical matches (events, score, statistics, adjustments) exactly', () => {
    const golden = JSON.parse(readFileSync('src/features/tactics/tactical-golden.json', 'utf8')) as { hashes: string[] }
    let index = 0
    for (const a of STRATEGY_IDS) for (const b of STRATEGY_IDS) for (let i = 0; i < 8; i++, index++) {
      const r = run(a, b, `tg-${a}-${b}-${i}`)
      const events = r.blocks.map((block) => ({ m: block.minute, s: block.score, e: block.events.map((e) => [e.minute, e.side, e.type, e.playerId ?? null]) }))
      const hash = createHash('sha256').update(JSON.stringify({ events, st: r.stats, sc: r.score, w: r.winner, ad: r.tactics?.adjustments })).digest('hex').slice(0, 16)
      expect(hash).toBe(golden.hashes[index])
    }
    expect(index).toBe(golden.hashes.length)
  })
  it('never tags NEUTRAL sides, tags only consistent with the stored adjustments, and does tag across the matrix', () => {
    let tagged = 0
    for (const a of STRATEGY_IDS) for (const b of STRATEGY_IDS) for (let i = 0; i < 4; i++) {
      const r = run(a, b, `tag-${a}-${b}-${i}`)
      for (const event of r.blocks.flatMap((block) => block.events)) {
        if (!event.tactic) continue
        tagged++
        expect(event.side).not.toBeNull()
        const side = event.side!
        expect(event.tactic).toBe(r.tactics!.selection[side])
        expect(event.tactic).not.toBe('NEUTRAL')
      }
    }
    expect(tagged).toBeGreaterThan(50)
  })
})

describe('tactical narration on screen', () => {
  it('shows the influence under a tagged event, in the interface language', async () => {
    vi.useFakeTimers()
    try {
      let result = run('HIGH_PRESS', 'LOW_BLOCK', 'screen-0')
      for (let i = 1; i < 40 && !result.blocks.some((block) => block.events.some((event) => event.tactic)); i++) result = run('HIGH_PRESS', 'LOW_BLOCK', `screen-${i}`)
      const tag = result.blocks.flatMap((block) => block.events).find((event) => event.tactic)!.tactic!
      const i18n = await createI18n('en')
      render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onRematch={vi.fn()} onReturn={vi.fn()} /></I18nextProvider>)
      expect(screen.queryByText(/Tactical influence/)).not.toBeInTheDocument()
      act(() => vi.advanceTimersByTime(15_000))
      const names = { MIDFIELD_CONTROL: 'midfield control', WIDE_PLAY: 'wide play', COUNTER_ATTACK: 'counter-attack', HIGH_PRESS: 'high press', LOW_BLOCK: 'low block', NEUTRAL: 'Neutral' }
      expect(screen.getAllByText(`Tactical influence: ${names[tag]}`).length).toBeGreaterThan(0)
    } finally { vi.useRealTimers() }
  })
})
