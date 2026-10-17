import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { createI18n, LANGUAGE_KEY, languages, persistLanguage, readLanguage, resources } from './index'
import { HomePage } from '../features/home/HomePage'
import { useDraftStore } from '../features/draft/draftState'
import { DRAFT_CATALOG } from '../features/draft/catalog'
import { POSITIONS } from '../types/football'

beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); useDraftStore.getState().reset() })

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => typeof child === 'object' ? keys(child as object, `${prefix}${key}.`) : [`${prefix}${key}`]).sort()
}

describe('language configuration', () => {
  it('defaults to Argentine Spanish regardless of browser language', async () => {
    expect(readLanguage()).toBe('es-AR')
    expect((await createI18n()).language).toBe('es-AR')
  })
  it.each(languages)('initializes %s with complete and consistent keys', async (language) => {
    const instance = await createI18n(language)
    expect(instance.resolvedLanguage).toBe(language)
    expect(keys(resources[language].common)).toEqual(keys(resources['es-AR'].common))
    for (const key of keys(resources[language].common)) {
      expect(instance.exists(key, { lng: language, fallbackLng: false })).toBe(true)
      expect(instance.t(key)).not.toBe('')
      const placeholders = (text: string) => [...text.matchAll(/\{\{(.*?)\}\}/g)].map((match) => match[1]).sort()
      expect(placeholders(instance.t(key, { lng: language }))).toEqual(placeholders(instance.t(key, { lng: 'es-AR' })))
    }
  })
  it.each(languages)('persists and restores %s in a fresh instance', async (language) => {
    expect(persistLanguage(language)).toBe(true)
    expect((await createI18n()).language).toBe(language)
  })
  it('ignores invalid stored values', () => {
    localStorage.setItem(LANGUAGE_KEY, 'de')
    expect(readLanguage()).toBe('es-AR')
  })
  it('survives blocked browser storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readLanguage()).toBe('es-AR')
    expect(persistLanguage('en')).toBe(false)
  })
  it('falls back to Spanish for a missing English translation', async () => {
    const instance = await createI18n('en')
    instance.addResourceBundle('es-AR', 'fallback-test', { onlySpanish: 'Solo español' })
    expect(instance.t('onlySpanish', { ns: 'fallback-test' })).toBe('Solo español')
  })
  it.each([
    ['es-AR', ['Arquero', 'Defensor', 'Mediocampista', 'Delantero']],
    ['en', ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']],
    ['pt-BR', ['Goleiro', 'Defensor', 'Meio-campista', 'Atacante']],
  ] as const)('translates stable position codes in %s', async (language, labels) => {
    const instance = await createI18n(language)
    expect(POSITIONS.map((position) => instance.t(`positions.${position}`))).toEqual(labels)
  })
})

describe('initial interface', () => {
  it('switches all languages immediately, persists selection and updates document language', async () => {
    const instance = await createI18n()
    const forward = DRAFT_CATALOG.find((player) => player.position === 'DEL')!
    useDraftStore.getState().selectPlayer('LW', forward.id)
    render(<I18nextProvider i18n={instance}><HomePage /></I18nextProvider>)
    expect(screen.getByRole('button', { name: /Abrir catálogo/ })).toBeEnabled()
    expect(screen.getByText(forward.name)).toBeInTheDocument()
    const selector = screen.getByRole('combobox', { name: 'Idioma' })
    await userEvent.selectOptions(selector, 'en')
    expect(screen.getByRole('button', { name: /Open catalogue/ })).toBeEnabled()
    expect(screen.getByText(forward.name)).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    await userEvent.selectOptions(selector, 'pt-BR')
    expect(screen.getByRole('button', { name: /Abrir catálogo/ })).toBeEnabled()
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('pt-BR')
    expect((await createI18n()).language).toBe('pt-BR')
    await userEvent.selectOptions(selector, 'es-AR')
    expect(screen.getByRole('button', { name: /Abrir catálogo/ })).toBeEnabled()
  })
  it('shows translated storage failure without preventing a language change', async () => {
    const instance = await createI18n()
    render(<I18nextProvider i18n={instance}><HomePage /></I18nextProvider>)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    await userEvent.selectOptions(screen.getByRole('combobox'), 'en')
    expect(screen.getByRole('alert')).toHaveTextContent(instance.t('common.storageError'))
    expect(screen.getByRole('button', { name: /Open catalogue/ })).toBeEnabled()
  })
})
