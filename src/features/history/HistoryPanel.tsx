import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { matchHistory, summarize, useMatchHistory } from './matchHistory'

/** Local results and totals. Hot-seat totals are from recruiter one's side, so they are shown separately. */
export function HistoryPanel() {
  const { t } = useTranslation()
  const entries = useMatchHistory()
  const [confirming, setConfirming] = useState(false)
  if (!entries.length) return <details className="history-panel"><summary>{t('history.title')}</summary><p>{t('history.empty')}</p></details>
  const cpu = summarize(entries, 'cpu'); const people = summarize(entries, 'hotseat'); const online = summarize(entries, 'online')
  const line = (label: string, s: ReturnType<typeof summarize>) => s.played ? <p key={label}><strong>{label}</strong> · {t('history.totals', { played: s.played, wins: s.wins, draws: s.draws, losses: s.losses })}{s.abandoned ? ` · ${t('history.abandonedCount', { count: s.abandoned })}` : ''}</p> : null
  return <details className="history-panel"><summary>{t('history.title')} ({entries.length})</summary>
    {line(t('history.vsCpu'), cpu)}{line(t('history.vsPerson'), people)}{line(t('history.vsOnline'), online)}
    <ol className="history-list">{entries.slice(0, 10).map((entry) => <li key={entry.id}>
      <time dateTime={entry.at}>{new Date(entry.at).toLocaleDateString()}</time>{' '}
      <span>{entry.names.recruiter_one} {t('history.versus')} {entry.names.recruiter_two}</span>{' · '}
      <strong>{entry.outcome === 'draw' ? t('history.draw') : t('history.winner', { name: entry.names[entry.outcome] })}</strong>
      {entry.score ? ` (${entry.score.recruiter_one}–${entry.score.recruiter_two})` : ''}
      {entry.abandonedBy ? ` · ${t('history.abandonedBy', { name: entry.names[entry.abandonedBy] })}` : ''}
    </li>)}</ol>
    {confirming
      ? <p role="alert">{t('history.confirmClear')} <button className="secondary-action" onClick={() => { matchHistory.clear(); setConfirming(false) }}>{t('history.clearYes')}</button> <button className="secondary-action" onClick={() => setConfirming(false)}>{t('history.clearNo')}</button></p>
      : <button className="secondary-action" onClick={() => setConfirming(true)}>{t('history.clear')}</button>}
  </details>
}
