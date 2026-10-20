import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { teamPower, type TeamPower } from './teamPower'
import { SQUAD_TIERS } from '../local-match/squadQuality'

interface Props {
  readonly game: RecruiterDuelGame
  readonly catalog: readonly Player[]
  readonly sides: readonly RecruiterId[]
  readonly names: Readonly<Record<RecruiterId, string>>
}

const SECTORS = ['attack', 'midfield', 'defense'] as const

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
      <p className="power-global" aria-label={t('power.globalLabel', { value: power.total.global.toFixed(1) })}><span>{t('auctionUX.effective')}</span><strong>{power.total.global.toFixed(1)}</strong></p>
      <ul className="power-sectors">{SECTORS.map((sector) => <li key={sector}><span>{t(`power.${sector}`)}</span><div className="power-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, power.total[sector])}%` }} /></div><b>{Math.round(power.total[sector])}{power.coachBonus[sector] > 0 && <small> (+{power.coachBonus[sector].toFixed(1)})</small>}</b></li>)}</ul>
      <p className="power-base">{t('auctionUX.base', { value: power.base.global.toFixed(1) })}</p>
      <p className="power-goalkeeper">{(() => { const keeper = catalog.find((p) => p.id === game.teams[side].lineup.GK); return keeper ? t('auctionUX.keeper', { name: keeper.name, rating: keeper.overall_rating }) : null })()}</p>
      <details className="power-details"><summary>{t('auctionUX.bonuses')}</summary><p>{t('power.level', { tier: power.tier, rating: power.averageRating.toFixed(1) })}</p>
      <p>{t('power.composition', { counts: SQUAD_TIERS.map((tier) => `${tier}: ${power.quality.counts[tier]}`).join(' · '), bonus: power.quality.bonus.toFixed(2) })}</p>
      <p>{t('power.rosterBonus', { bonus: power.rosterBonus.toFixed(1) })}</p>
      <p>{power.coach ? t('power.coach', { coach: `${power.coach.name} ${power.coach.surname}`, tier: power.coach.tier }) : t('power.noCoach')}</p></details>
    </article>)}</div>
    <details className="power-comparison"><summary>{t('h2h.title')}</summary>{powers.length === 2 && powers[0].power && powers[1].power && <HeadToHead left={{ name: names[powers[0].side], power: powers[0].power }} right={{ name: names[powers[1].side], power: powers[1].power }} />}
    <p>{t('power.contextNote')}</p></details>
  </section>
}

interface Contender { readonly name: string; readonly power: TeamPower }
const elite = (power: TeamPower) => power.quality.counts['S+'] + power.quality.counts.S + power.quality.counts.A
const coachTotal = (power: TeamPower) => power.coachBonus.attack + power.coachBonus.defense + power.coachBonus.midfield

/** TV-style preview: one bar per dimension, split between the two recruiters, with the lead called out. */
function HeadToHead({ left, right }: { readonly left: Contender; readonly right: Contender }) {
  const { t } = useTranslation()
  const rows: readonly { readonly key: string; readonly label: string; readonly a: number; readonly b: number; readonly digits: number }[] = [
    { key: 'global', label: t('h2h.global'), a: left.power.total.global, b: right.power.total.global, digits: 1 },
    ...SECTORS.map((sector) => ({ key: sector, label: t(`power.${sector}`), a: left.power.total[sector], b: right.power.total[sector], digits: 1 })),
    { key: 'elite', label: t('h2h.elite'), a: elite(left.power), b: elite(right.power), digits: 0 },
    { key: 'coach', label: t('h2h.coach'), a: coachTotal(left.power), b: coachTotal(right.power), digits: 1 },
  ]
  return <section className="h2h" aria-label={t('h2h.title')}>
    <h3>{t('h2h.title')}</h3>
    <p className="h2h-names"><span className="h2h-left">{left.name}</span><span className="h2h-right">{right.name}</span></p>
    {rows.map((row) => {
      const diff = row.a - row.b; const total = row.a + row.b
      const leader = Math.abs(diff) < 0.05 ? null : diff > 0 ? left.name : right.name
      return <div key={row.key} className={`h2h-row${row.key === 'global' ? ' h2h-global' : ''}`}>
        <span className="h2h-label">{row.label}{row.key === 'global' && leader && <span className="h2h-crown" aria-hidden="true"> 👑</span>}</span>
        <div className="h2h-bar" aria-hidden="true"><i className="h2h-a" style={{ width: `${total > 0 ? (row.a / total) * 100 : 50}%` }} /><i className="h2h-b" /></div>
        <span className="h2h-values">{row.a.toFixed(row.digits)} · {row.b.toFixed(row.digits)}</span>
        <small className="h2h-lead">{leader ? t('h2h.lead', { name: leader, value: Math.abs(diff).toFixed(row.digits === 0 ? 0 : 1) }) : t('h2h.even')}</small>
      </div>
    })}
  </section>
}
