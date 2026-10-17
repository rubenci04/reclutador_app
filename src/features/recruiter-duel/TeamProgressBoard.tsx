import { useId, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { positionProgress } from './auctionEngine'
import { RECRUITERS, type RecruiterDuelGame, type RecruiterId } from './auctionTypes'

const query = '(max-width: 640px)'
const mobileSnapshot = () => window.matchMedia?.(query).matches ?? false
const subscribe = (notify: () => void) => {
  const media = window.matchMedia?.(query)
  media?.addEventListener('change', notify)
  return () => media?.removeEventListener('change', notify)
}
const serverSnapshot = () => false
interface Props { readonly game: RecruiterDuelGame; readonly catalog: readonly Player[]; readonly names: Readonly<Record<RecruiterId, string>> }

export function TeamProgressBoard({ game, catalog, names }: Props) {
  const { t } = useTranslation()
  const panelId = useId()
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, serverSnapshot)
  const [expanded, setExpanded] = useState(false)
  return <section className="team-progress" aria-label={t('teamProgress.title')}>
    {mobile ? <button className="secondary-action" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>{t('teamProgress.title')}</button> : <h2>{t('teamProgress.title')}</h2>}
    <div id={panelId} className="team-progress-grid" hidden={mobile && !expanded}>
      {RECRUITERS.map((participant) => {
        const team = game.teams[participant]
        return <article key={participant} aria-label={names[participant]}>
          <h3>{names[participant]}</h3>
          <p><span>{t('teamProgress.selected', { count: Object.values(team.lineup).filter(Boolean).length })}</span> · <span>{t('duel.balance', { amount: DRAFT_BUDGET_MILLIONS - team.spent })}</span></p>
          <ul className="team-slots">{DRAFT_SLOTS.map((slot) => {
            const player = catalog.find((candidate) => candidate.id === team.lineup[slot.id])
            const award = player && game.record.find((entry) => entry.type === 'award' && entry.winner === participant && entry.playerId === player.id)
            return <li key={slot.id}><span className="team-slot-position">{t(`positions.${slot.position}`)}</span>{player ? <><strong>{player.name}</strong><span>{t('teamProgress.rating', { rating: player.overall_rating })}</span><span>{t('teamProgress.paid', { amount: award?.type === 'award' ? award.price : '—' })}</span></> : <span>{t('teamProgress.empty')}</span>}</li>
          })}</ul>
          <ul className="team-missing">{(['ARQ', 'DEF', 'MED', 'DEL'] as const).map((position) => {
            const progress = positionProgress(team, position)
            return <li key={position}>{t(progress.remaining ? 'teamProgress.missing' : 'teamProgress.full', { position: t(`positions.${position}`), ...progress })}</li>
          })}</ul>
        </article>
      })}
    </div>
  </section>
}
