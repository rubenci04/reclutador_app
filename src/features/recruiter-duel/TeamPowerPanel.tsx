import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { teamPower } from './teamPower'

interface Props {
  readonly game: RecruiterDuelGame
  readonly catalog: readonly Player[]
  readonly sides: readonly RecruiterId[]
  readonly names: Readonly<Record<RecruiterId, string>>
}

const SECTORS = ['attack', 'defense', 'midfield'] as const

/** After the scouting: the global power of each eleven (with its coach) and every level reference, large and first. */
export function TeamPowerPanel({ game, catalog, sides, names }: Props) {
  const { t } = useTranslation()
  const powers = sides.map((side) => ({ side, power: teamPower(game, side, catalog) }))
  const best = powers.length > 1 && powers[0].power && powers[1].power && powers[0].power.total.global !== powers[1].power.total.global
    ? (powers[0].power.total.global > powers[1].power.total.global ? powers[0].side : powers[1].side) : null
  return <section className="team-power" aria-label={t('power.title')}>
    <h2>{t('power.title')}</h2>
    <div className="team-power-grid">{powers.map(({ side, power }) => power && <article key={side} className={best === side ? 'team-power-card is-best' : 'team-power-card'}>
      <h3>{names[side]}{best === side && <small> · {t('power.leader')}</small>}</h3>
      <p className="power-global" aria-label={t('power.globalLabel', { value: power.total.global.toFixed(1) })}><span>{t('power.global')}</span><strong>{power.total.global.toFixed(1)}</strong></p>
      <ul className="power-sectors">{SECTORS.map((sector) => <li key={sector}><span>{t(`power.${sector}`)}</span><div className="power-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, power.total[sector])}%` }} /></div><b>{Math.round(power.total[sector])}{power.coachBonus[sector] > 0 && <small> (+{power.coachBonus[sector].toFixed(1)})</small>}</b></li>)}</ul>
      <p>{t('power.level', { tier: power.tier, rating: power.averageRating.toFixed(1) })}</p>
      <p>{power.coach ? t('power.coach', { coach: `${power.coach.name} ${power.coach.surname}`, tier: power.coach.tier }) : t('power.noCoach')}</p>
    </article>)}</div>
  </section>
}
