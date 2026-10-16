import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import { HomePage } from '../features/home/HomePage'
import '../styles/index.css'

const i18n = await createI18n()
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><I18nextProvider i18n={i18n}><HomePage /></I18nextProvider></React.StrictMode>,
)
