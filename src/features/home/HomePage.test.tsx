import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { HomePage } from './HomePage'
import { TEAM_NAME_KEY, readTeamName, saveTeamName, validateTeamName } from './teamName'
vi.mock('../recruiter-duel/AuctionPage', () => ({ AuctionPage: ({ teamName, onEditName }: { teamName: string; onEditName: () => void }) => <div><h1>{teamName}</h1><button onClick={onEditName}>Edit profile</button></div> }))
vi.mock('../draft/DraftPage', () => ({ DraftPage: () => <div>Free draft</div> }))
vi.mock('../online/OnlinePage', () => ({ OnlinePage: () => <div>Online room</div> }))
vi.mock('../onboarding/HelpLauncher', () => ({ HelpLauncher: () => null }))
const open = async (language: 'en' | 'es-AR' | 'pt-BR' = 'en') => render(<I18nextProvider i18n={await createI18n(language)}><HomePage /></I18nextProvider>)
beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '/'); vi.restoreAllMocks() })
describe('local team profile entry', () => {
  it('normalizes names, rejects empty/long values and handles unavailable storage', () => {
    expect(validateTeamName('  La   Academia  ')).toEqual({ name: 'La Academia', error: null })
    expect(validateTeamName(' \n\t ')).toMatchObject({ error: 'empty' })
    expect(validateTeamName('a'.repeat(25))).toMatchObject({ error: 'tooLong' })
    expect(validateTeamName('⚽'.repeat(24)).error).toBeNull()
    expect(readTeamName({ getItem: () => { throw Error('blocked') } })).toEqual({ name: null, warning: true })
    expect(readTeamName({ getItem: () => ' ' }).name).toBeNull()
    expect(saveTeamName('Club', { setItem: () => { throw Error('quota') } })).toBe(false)
  })
  it('requires a valid first name, persists it, skips the gate on return and edits it', async () => {
    const view = await open()
    expect(screen.getByRole('heading', { name: 'What is your team name?' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toBeVisible()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Academia  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Academia' })).toBeVisible()
    expect(localStorage.getItem(TEAM_NAME_KEY)).toBe('Academia')
    view.unmount(); await open()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Academia Sur' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Academia Sur' })).toBeVisible()
    expect(localStorage.getItem(TEAM_NAME_KEY)).toBe('Academia Sur')
  })
  it('preserves the direct online entry without requiring a local name', async () => {
    window.history.replaceState(null, '', '/?online=room')
    await open()
    expect(await screen.findByText('Online room')).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
  it.each(['en', 'es-AR', 'pt-BR'] as const)('provides all visible and validation text in %s', async language => {
    const i18n = await createI18n(language)
    for (const key of ['question', 'label', 'continue', 'edit', 'cancel', 'storageWarning', 'errors.empty', 'errors.tooLong']) expect(i18n.getResource(language, 'common', `teamName.${key}`)).toEqual(expect.any(String))
    await open(language)
    expect(screen.getByRole('textbox', { name: i18n.t('teamName.label') })).toBeVisible()
  })
})
