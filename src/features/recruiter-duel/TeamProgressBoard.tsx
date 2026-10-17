import { useId, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import { TeamPitchBoard } from './TeamPitchBoard'
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
  const [visibleTeam, setVisibleTeam] = useState<RecruiterId>('recruiter_one')
  return <section className="team-progress" aria-label={t('teamProgress.title')}>
    {mobile ? <button className="secondary-action" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>{t('teamProgress.title')}</button> : <h2>{t('teamProgress.title')}</h2>}
    <div id={panelId} className="team-progress-grid" hidden={mobile && !expanded}>
      {mobile && <div className="pitch-team-switch" role="group" aria-label={t('pitch.switchTeam')}>{RECRUITERS.map((participant) => <button className="secondary-action" key={participant} aria-pressed={visibleTeam === participant} onClick={() => setVisibleTeam(participant)}>{names[participant]}</button>)}</div>}
      {RECRUITERS.map((participant) => {
        const team = game.teams[participant]
        return <article key={participant} aria-label={names[participant]} hidden={mobile && visibleTeam !== participant}>
          <h3>{names[participant]}</h3>
          <p><span>{t('teamProgress.selected', { count: Object.values(team.lineup).filter(Boolean).length })}</span> · <span>{t('duel.balance', { amount: DRAFT_BUDGET_MILLIONS - team.spent })}</span></p>
          <TeamPitchBoard game={game} participant={participant} catalog={catalog} />
          <ul className="team-missing">{(['ARQ', 'DEF', 'MED', 'DEL'] as const).map((position) => {
            const progress = positionProgress(team, position)
            return <li key={position}>{t(progress.remaining ? 'teamProgress.missing' : 'teamProgress.full', { position: t(`positions.${position}`), ...progress })}</li>
          })}</ul>
        </article>
      })}
    </div>
  </section>
}
