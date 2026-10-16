import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es-AR/common.json'
import en from './locales/en/common.json'
import pt from './locales/pt-BR/common.json'

export const languages = ['es-AR', 'en', 'pt-BR'] as const
export type Language = (typeof languages)[number]
export const languageNames: Record<Language, string> = { 'es-AR': 'Español (AR)', en: 'English', 'pt-BR': 'Português (BR)' }
export const LANGUAGE_KEY = 'draft-legends.language'
export const resources = { 'es-AR': { common: es }, en: { common: en }, 'pt-BR': { common: pt } }
export const isLanguage = (value: unknown): value is Language => languages.some((language) => language === value)

export function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    return isLanguage(saved) ? saved : 'es-AR'
  } catch { return 'es-AR' }
}

export function persistLanguage(language: Language): boolean {
  try { localStorage.setItem(LANGUAGE_KEY, language); return true } catch { return false }
}

export async function createI18n(language: Language = readLanguage()) {
  const instance = createInstance()
  await instance.use(initReactI18next).init({
    resources, lng: language, fallbackLng: 'es-AR', supportedLngs: [...languages],
    load: 'currentOnly', defaultNS: 'common', interpolation: { escapeValue: false },
  })
  instance.on('languageChanged', (lng) => { document.documentElement.lang = lng })
  document.documentElement.lang = instance.language
  return instance
}
