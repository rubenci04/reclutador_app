import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DraftPage } from '../draft/DraftPage'
import { HelpLauncher } from '../onboarding/HelpLauncher'
import { AuctionPage } from '../recruiter-duel/AuctionPage'

const OnlinePage = lazy(() => import('../online/OnlinePage').then(module => ({ default: module.OnlinePage })))

export function HomePage() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'duel' | 'free' | 'online'>(() => new URL(window.location.href).searchParams.has('online') ? 'online' : 'duel')
  return <>
    {mode === 'online' ? <Suspense fallback={<p role="status">{t('online.loading')}</p>}><OnlinePage onBack={() => {
      const url = new URL(window.location.href); url.searchParams.delete('online'); window.history.replaceState(null,'',url)
      setMode('duel')
    }} /></Suspense> : mode === 'duel' ? <AuctionPage onDraftFree={() => setMode('free')} onOnline={() => setMode('online')} /> : <DraftPage onDuel={() => setMode('duel')} />}
    <HelpLauncher />
  </>
}
