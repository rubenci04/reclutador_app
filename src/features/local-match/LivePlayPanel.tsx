import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { PendingPlay, PlayChoice } from './interactive'
import { PLAY_LETTERS } from './matchFeed'
import { DribblePanel } from './DribblePanel'

/** One interactive node as two big cards: no forms, one tap resolves it. */
export function PlayPanel({ play, catalog, onChoose, ovrDuels = false }: { readonly play: PendingPlay; readonly catalog: readonly Player[]; readonly onChoose: (choice: PlayChoice, precision?: number) => void; readonly ovrDuels?: boolean }) {
  const { t } = useTranslation()
  const card = useRef<HTMLElement>(null); const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }); card.current?.scrollIntoView?.({ block: 'nearest' }) }, [play.id, play.node])
  if (play.node === 'DRIBBLE') return <DribblePanel play={play} catalog={catalog} onChoose={onChoose} />
  const fk = play.node.startsWith('FK_')
  const fkDirect = play.node === 'FK_ATTACK' && play.freeKick?.zone === 'CENTRAL_OUTSIDE'
  const isHeader = play.node === 'FK_HEADER' || play.node === 'HEADER' || play.node === 'CORNER_HEADER'
  const cornerRoot = play.node === 'CORNER_ATTACK' || play.node === 'CORNER_DEFEND'
  const player = (id: string | null) => catalog.find((p) => p.id === id)
  const protagonist = player(play.protagonistId); const receiver = player(play.receiverId)
  const title = fk && !isHeader ? t(play.node === 'FK_DEFEND' ? play.freeKick?.zone === 'CENTRAL_OUTSIDE' ? 'freeKick.defend' : 'freeKick.cover' : fkDirect ? 'freeKick.direct' : 'freeKick.indirect') : cornerRoot ? t(play.node === 'CORNER_ATTACK' ? 'corner.attack' : 'corner.defend') : isHeader ? t('aerial.title') : play.node === 'DEFEND' ? t('moments.defend') : play.node === 'DIRECTION' ? t('play.direction') : t('play.finish', { name: receiver?.name ?? '' })
  return <section className={`live-play${isHeader || fkDirect || play.node === 'CORNER_ATTACK' ? ' live-header' : ''}`} ref={card} aria-label={t(fk ? 'freeKick.label' : cornerRoot ? 'corner.label' : isHeader ? 'aerial.label' : play.node === 'DEFEND' ? 'moments.label' : 'play.label')}>
    <h2 tabIndex={-1} ref={heading}>{title}</h2>
    <p className="live-moment">{`${(play.freeKick && !isHeader ? player(play.freeKick.kickerId) : play.node === 'FINISH' || isHeader ? receiver : protagonist)?.name ?? ''}`}</p>
    <div className="play-cards">
      {play.options.map((option) => {
        const mate = player(option.playerId)
        const description = fk && !isHeader ? t(`freeKick.hint.${option.choice}`) : cornerRoot ? t(`corner.hint.${option.choice}`) : isHeader ? t(`aerial.hint.${option.choice}`) : play.node === 'DEFEND' ? t(`moments.hint.${option.choice}`) : !option.available ? (play.node === 'DIRECTION' ? t('play.noReceiver') : t('play.noTarget')) : play.node === 'DIRECTION'
          ? t('play.receiver', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 }) : option.choice === 'CROSS' ? t('play.target', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 }) : t('play.shooter', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 })
        return <button key={option.choice} type="button" className={`play-card play-card-${option.choice}`} disabled={!option.available} aria-describedby={`play-detail-${option.choice}`} onClick={() => onChoose(option.choice)}>
          <b className="play-letter" aria-hidden="true">{PLAY_LETTERS[option.choice]}</b>
          {(isHeader || fkDirect) && <svg className="header-target-icon" viewBox="0 0 120 64" aria-hidden="true"><path d="M10 56V10h100v46M10 56h100M35 10v46M60 10v46M85 10v46M10 32h100" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx={option.choice === 'FK_CENTER' || option.choice === 'GOAL_CENTER' ? 60 : (option.choice === 'FK_LEFT' || option.choice === 'NEAR_POST') === (play.sector === 'LEFT') ? 26 : 94} cy="34" r="8" /></svg>}
          <strong>{t(`play.choice.${option.choice}`)}</strong>
          <span id={`play-detail-${option.choice}`}>{description}</span>
        </button>
      })}
    </div>
    <details className="moment-detail"><summary>{t('moments.detail')}</summary><p>{t(fk ? 'freeKick.detail' : cornerRoot || play.node === 'CORNER_HEADER' ? 'corner.detail' : ovrDuels ? 'halftime.duels' : play.node === 'HEADER' ? 'aerial.detailHint' : 'moments.attributes')}</p>{[...new Set([play.protagonistId, play.receiverId, ...play.options.flatMap((o) => [o.playerId, o.rivalId])])].flatMap((id) => { const p = player(id); return p ? <p key={p.id}>{p.name} · {t('moments.ratings', { overall: p.overall_rating, attack: p.att_rating, defense: p.def_rating, physical: p.phy_rating, mental: p.men_rating })}</p> : [] })}</details>
  </section>
}
