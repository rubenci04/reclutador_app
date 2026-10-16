import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isLanguage, languageNames, languages, persistLanguage } from '../i18n'

export function LanguageSelector() {
  const { t, i18n } = useTranslation()
  const [storageError, setStorageError] = useState(false)
  return <div className="language-control">
    <label htmlFor="language">{t('nav.language')}</label>
    <select id="language" value={i18n.resolvedLanguage} onChange={(event) => {
      const language = event.target.value
      if (!isLanguage(language)) return
      void i18n.changeLanguage(language)
      setStorageError(!persistLanguage(language))
    }}>
      {languages.map((language) => <option key={language} value={language}>{languageNames[language]}</option>)}
    </select>
    {storageError && <p className="storage-error" role="alert">{t('common.storageError')}</p>}
  </div>
}
