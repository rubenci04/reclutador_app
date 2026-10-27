import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from './cpuTeam'
import { ENGINE_VERSION } from './engine/engineConstants'
import { simulateFiguresMatch } from './engine/figuresMatch'
import { framesFromBlocks, statsFromFrames } from './engine/figuresPlays'
import { FiguresMatchScreen } from './FiguresMatchScreen'
import { MATCH_RULES_VERSION, type MatchResult } from './matchTypes'
import type { SimulationInput } from './simulator'

afterEach(() => vi.useRealTimers())

const input = (seed: string): SimulationInput => ({ localLineup: generateCpuTeam(DRAFT_CATALOG, `${seed}-a`).team.lineup, cpuLineup: generateCpuTeam(DRAFT_CATALOG, `${seed}-b`).team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed, engineVersion: ENGINE_VERSION, actionModel: 'action-v3' })
const names = { local: 'Tu equipo', cpu: 'Rival' }

describe('frames of the figures engine', () => {
  it('score and statistics of the frames equal the match result', () => {
    for (let index = 0; index < 20; index++) {
      const result = simulateFiguresMatch(input(`frames-${index}`)).result!
      const frames = framesFromBlocks(result.blocks, true)
      expect(frames.at(-1)!.scoreAfter).toEqual(result.score)
      const stats = statsFromFrames(frames)
      for (const side of ['local', 'cpu'] as const) {
        expect(stats[side].shots).toBe(result.stats[side].shots)
        expect(stats[side].shotsOnTarget).toBe(result.stats[side].shotsOnTarget)
        expect(stats[side].saves).toBe(result.stats[side].saves)
        expect(stats[side].recoveries).toBe(result.stats[side].recoveries)
        expect(stats[side].corners).toBe(result.stats[side].corners)
      }
      expect(frames.filter((f) => f.kind === 'halftime')).toHaveLength(1)
    }
  })
})

describe('match screen', () => {
  it('pauses on each moment, resolves it with one tap and ends with the engine score', async () => {
    vi.useFakeTimers()
    const finished = vi.fn<(result: MatchResult) => void>()
    const i18n = await createI18n('es-AR')
    const view = render(<I18nextProvider i18n={i18n}><FiguresMatchScreen input={input('screen-1')} humanSides={['local']} names={names} onFinished={finished} /></I18nextProvider>)
    let taps = 0
    for (let guard = 0; guard < 400 && !finished.mock.calls.length; guard++) {
      const layer = view.container.querySelector('.fm-moment')
      if (layer) { taps++; fireEvent.click(layer.querySelector('.fm-moment-go')!); act(() => vi.advanceTimersByTime(300)) } else act(() => vi.advanceTimersByTime(300))
    }
    expect(taps).toBeGreaterThan(0); expect(taps).toBeLessThanOrEqual(6)
    expect(finished).toHaveBeenCalledTimes(1)
    const result = finished.mock.calls[0][0]
    expect(result.engineVersion).toBe(ENGINE_VERSION)
    expect(result.moments!.filter((m) => !m.automatic)).toHaveLength(taps)
    expect(view.container.querySelector('.fm-score')!.textContent).toBe(`${result.score.local}–${result.score.cpu}`)
    expect(view.container.querySelectorAll('.fm-player')).toHaveLength(22)
    expect(view.container.querySelector('.fm-caption')!.textContent!.split(' ').length).toBeLessThanOrEqual(8)
  })
  it('keeps every caption within eight words and opens the details on demand', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    const view = render(<I18nextProvider i18n={i18n}><FiguresMatchScreen input={input('screen-2')} humanSides={[]} names={names} onFinished={vi.fn()} /></I18nextProvider>)
    expect(view.container.querySelector('.fm-detail')).toBeNull()
    for (let guard = 0; guard < 200; guard++) {
      expect(view.container.querySelector('.fm-caption')!.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(8)
      act(() => vi.advanceTimersByTime(400))
    }
    fireEvent.click(screen.getByRole('button', { name: 'See details' }))
    expect(view.container.querySelector('.fm-detail')).not.toBeNull()
  })
})
