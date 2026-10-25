import { useTranslation } from 'react-i18next'
import type { HudModel, HudParticipant } from './hudModel'
import type { RecruiterId } from './auctionTypes'

import type { Position } from '../../types/football'

interface Props {
  readonly hud: HudModel
  /** Position of the footballer currently up for auction; its slot pulses in both panels. */
  readonly currentPosition?: Position
  readonly names: Readonly<Record<RecruiterId, string>>
  /** Whose header is on screen; the other recruiter is summarised as the rival. */
  readonly viewer?: RecruiterId
  /** Optional shortcut to the live pitches below. */
  readonly onShowPitches?: () => void
}

const ORDER: readonly RecruiterId[] = ['recruiter_one', 'recruiter_two']

function Panel({ hud, side, name, active, currentPosition }: { hud: HudModel; side: HudParticipant; name: string; active: boolean; currentPosition?: Position }) {
  const { t } = useTranslation()
  const share = Math.max(0, Math.min(100, (side.remaining / hud.budget) * 100))
  return <article className={`hud-panel hud-${side.id}${active ? ' hud-active' : ''}`} aria-label={name} aria-current={active ? 'true' : undefined}>
    <header><span className="hud-shirt" aria-hidden="true" /><strong>{name}</strong>{active && <span className="hud-turn">{t('hud.turnBadge')}</span>}</header>

    <div className="hud-budget" role="img" aria-label={t('hud.budgetBar', { name, remaining: side.remaining, total: hud.budget })}><i style={{ width: `${share}%` }} /></div>
    <p className="hud-money"><b>{t('hud.remaining', { amount: side.remaining })}</b></p>
    <p className="hud-signed">{t('hud.signings', { count: side.signed, total: hud.teamSize })}</p>
    <details className="hud-details"><summary>{t('auctionUX.details')}</summary><p>{t('hud.spent', { amount: side.spent })}</p><ul className="hud-positions">{side.positions.map((position) => <li key={position.position} className={`pos-${position.position}${position.remaining === 0 ? ' hud-full' : position.forced ? ' hud-forced' : ''}${currentPosition === position.position ? ' hud-current' : ''}`} aria-label={t('hud.positionLabel', { position: t(`positions.${position.position}`), filled: position.filled, capacity: position.capacity })}>
      <span aria-hidden="true">{position.position}</span><b aria-hidden="true">{position.filled}/{position.capacity}</b>
      {position.forced && <small>{t('hud.forced')}</small>}
    </li>)}</ul></details>

  </article>
}

/** Scoreboard-style status bar. Pure view: every figure arrives in `hud`, derived from the game state and engine predicates. */
export function AuctionHud({ hud, names, onShowPitches, currentPosition, viewer = 'recruiter_one' }: Props) {
  const { t } = useTranslation()
  const rivalId: RecruiterId = viewer === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
  const rival = hud.participants[rivalId]
  return <section className="auction-hud auction-hud-compact" aria-label={t('hud.label')}>
    <p className="hud-rival">{t('hud.rival', { name: names[rivalId], amount: rival.remaining, count: rival.signed, total: hud.teamSize })}</p>
    <details className="hud-more"><summary>{t('hud.more')}</summary>
    <div className="hud-more-body">
    <div className="hud-centre">
      <p className="hud-awards">{t('hud.awards', { done: hud.awards, total: hud.totalAwards })}</p>
      {hud.discardsTotal > 0 && <><details className="hud-discard-details" open={hud.discardsRemaining === 0}><summary>{t('auctionUX.discards')}</summary><p className="hud-discards" aria-label={t('hud.discards', { count: hud.discardsRemaining, total: hud.discardsTotal })}>
        {Array.from({ length: hud.discardsTotal }, (_, index) => <i key={index} className={index < hud.discardsRemaining ? 'on' : undefined} aria-hidden="true" />)}
        <span>{t('hud.discards', { count: hud.discardsRemaining, total: hud.discardsTotal })}</span>
      </p>
      </details>{hud.discardsRemaining === 0 && <p className="hud-exhausted">{t('discards.exhausted')}</p>}</>}
      {onShowPitches && <button className="secondary-action hud-pitches" onClick={onShowPitches}>{t('hud.showPitches')}</button>}
    </div>
    {ORDER.map((id) => <Panel key={id} hud={hud} side={hud.participants[id]} name={names[id]} active={hud.turn === id} currentPosition={currentPosition} />)}
    </div></details>
  </section>
}
