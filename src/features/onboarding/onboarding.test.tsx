import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { HomePage } from '../home/HomePage'
import { HELP_KEY, helpStore } from './helpStore'
import { HelpLauncher } from './HelpLauncher'
import { HelpTip } from './HelpTip'
import { helpTopicForPhase, TUTORIAL_STEPS } from './helpTopics'

beforeEach(() => { localStorage.clear(); helpStore.forgetMemory() })
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); helpStore.forgetMemory() })

async function view(node: React.ReactNode, language: 'es-AR' | 'en' | 'pt-BR' = 'en') {
  const i18n = await createI18n(language)
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>)
}

describe('first-visit tutorial', () => {
  it('opens on the first visit, walks every step, shows the keys and is not shown again', async () => {
    const first = await view(<HelpLauncher />)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Build your eleven' })).toBeInTheDocument()
    for (let step = 1; step < TUTORIAL_STEPS.length; step++) fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Keys to play' })).toBeInTheDocument()
    expect(screen.getByText(/Tab \/ Shift\+Tab/)).toBeInTheDocument()
    expect(screen.getByText(/Esc: close this guide/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start playing' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(JSON.parse(localStorage.getItem(HELP_KEY)!).tutorialSeen).toBe(true)
    first.unmount()
    await view(<HelpLauncher />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('can be skipped or closed with Esc, and reopened from the help button', async () => {
    await view(<HelpLauncher />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('is available in es-AR and pt-BR', async () => {
    const es = await view(<HelpLauncher />, 'es-AR')
    expect(screen.getByRole('heading', { name: 'Armá tu once' })).toBeInTheDocument()
    es.unmount()
    localStorage.clear()
    await view(<HelpLauncher />, 'pt-BR')
    expect(screen.getByRole('heading', { name: 'Monte seu time' })).toBeInTheDocument()
  })
  it('works when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    await view(<HelpLauncher />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('opens on the real home page for a new visitor', async () => {
    await view(<HomePage />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'How to play' })).toBeInTheDocument()
  })
})

describe('contextual tips', () => {
  it('maps game phases to topics', () => {
    expect(helpTopicForPhase(null)).toBe('setup')
    expect(helpTopicForPhase('BIDDING')).toBe('bidding')
    expect(helpTopicForPhase('SIMULATING')).toBeUndefined()
  })
  it('dismisses one topic, can turn all tips off and can bring them back', async () => {
    helpStore.resetTips()
    await view(<><HelpTip topic="bidding" /><HelpTip topic="reveal" /></>)
    expect(screen.getAllByRole('note')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Got it' })[0])
    expect(screen.getAllByRole('note')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Stop showing tips' }))
    expect(screen.queryByRole('note')).toBeNull()
    helpStore.resetTips()
    expect(await screen.findAllByRole('note')).toHaveLength(2)
  })
  it('shows the tip for the current auction step on the real page', async () => {
    localStorage.setItem(HELP_KEY, JSON.stringify({ tutorialSeen: true, hints: true, dismissed: [] }))
    await view(<HomePage />)
    expect(screen.getByRole('note')).toHaveTextContent('Choose your rival and rules')
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('note')).toBeNull()
  })
})

describe('tip coverage', () => {
  it('has a non-empty text for every topic in every language', async () => {
    const { HELP_TOPICS } = await import('./helpTopics')
    for (const language of ['es-AR', 'en', 'pt-BR'] as const) {
      const i18n = await createI18n(language)
      for (const topic of HELP_TOPICS) expect(i18n.t(`tips.${topic}`).length).toBeGreaterThan(10)
    }
  })
  it('shows the free draft tip on the free draft page', async () => {
    localStorage.setItem(HELP_KEY, JSON.stringify({ tutorialSeen: true, hints: true, dismissed: [] }))
    await view(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Go to Free Draft' }))
    expect(screen.getByRole('note')).toHaveTextContent('Free Draft')
  })
})
