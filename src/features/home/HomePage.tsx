import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DraftPage } from '../draft/DraftPage'
import { HelpLauncher } from '../onboarding/HelpLauncher'
import { AuctionPage } from '../recruiter-duel/AuctionPage'
import { TeamNameScreen } from './TeamNameScreen'
import { readTeamName, saveTeamName } from './teamName'

const OnlinePage = lazy(() => import('../online/OnlinePage').then(module => ({ default: module.OnlinePage })))

export function HomePage() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'duel' | 'free' | 'online'>(() => new URL(window.location.href).searchParams.has('online') ? 'online' : 'duel')
  const [profile, setProfile] = useState(() => readTeamName({ getItem: (key) => window.localStorage.getItem(key) }))
  const [editingName, setEditingName] = useState(false)
  if (mode !== 'online' && (!profile.name || editingName)) return <TeamNameScreen initialName={profile.name} warning={profile.warning} onSave={(name) => { const saved = saveTeamName(name, { setItem: (key, value) => window.localStorage.setItem(key, value) }); setProfile({ name, warning: !saved }); setEditingName(false) }} onCancel={profile.name ? () => setEditingName(false) : undefined} />
  return <>
    {mode === 'online' ? <Suspense fallback={<p role="status">{t('online.loading')}</p>}><OnlinePage onBack={() => {
      const url = new URL(window.location.href); url.searchParams.delete('online'); window.history.replaceState(null,'',url)
      setMode('duel')
    }} /></Suspense> : mode === 'duel' ? <AuctionPage teamName={profile.name ?? undefined} nameStorageWarning={profile.warning} onEditName={() => setEditingName(true)} onDraftFree={() => setMode('free')} onOnline={() => setMode('online')} /> : <DraftPage teamName={profile.name ?? undefined} onDuel={() => setMode('duel')} />}
    <HelpLauncher />
  </>
}
