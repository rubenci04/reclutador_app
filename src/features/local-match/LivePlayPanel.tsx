import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { PendingPlay, PlayChoice } from './interactive'
import { PLAY_LETTERS } from './matchFeed'

/** One interactive node as two big cards: no forms, one tap resolves it. */
export function PlayPanel({ play, catalog, onChoose }: { readonly play: PendingPlay; readonly catalog: readonly Player[]; readonly onChoose: (choice: PlayChoice) => void }) {
  const { t } = useTranslation()
  const card = useRef<HTMLElement>(null); const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }); card.current?.scrollIntoView?.({ block: 'nearest' }) }, [play.id, play.node])
  const player = (id: string | null) => catalog.find((p) => p.id === id)
  const protagonist = player(play.protagonistId); const receiver = player(play.receiverId)
  const title = play.node === 'DEFEND' ? t('moments.defend') : play.node === 'DIRECTION' ? t('play.direction') : t('play.finish', { name: receiver?.name ?? '' })
  return <section className="live-play" ref={card} aria-label={t(play.node === 'DEFEND' ? 'moments.label' : 'play.label')}>
    <h2 tabIndex={-1} ref={heading}>{title}</h2>
    <p className="live-moment">{`${(play.node === 'FINISH' ? receiver : protagonist)?.name ?? ''}`}</p>
    <div className="play-cards">
      {play.options.map((option) => {
        const mate = player(option.playerId)
        const description = play.node === 'DEFEND' ? t(`moments.hint.${option.choice}`) : !option.available ? (play.node === 'DIRECTION' ? t('play.noReceiver') : t('play.noTarget')) : play.node === 'DIRECTION'
          ? t('play.receiver', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 }) : option.choice === 'CROSS' ? t('play.target', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 }) : t('play.shooter', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 })
        return <button key={option.choice} type="button" className={`play-card play-card-${option.choice}`} disabled={!option.available} aria-describedby={`play-detail-${option.choice}`} onClick={() => onChoose(option.choice)}>
          <b className="play-letter" aria-hidden="true">{PLAY_LETTERS[option.choice]}</b>
          <strong>{t(`play.choice.${option.choice}`)}</strong>
          <span id={`play-detail-${option.choice}`}>{description}</span>
        </button>
      })}
    </div>
    <details className="moment-detail"><summary>{t('moments.detail')}</summary><p>{t('moments.attributes')}</p>{[...new Set([play.protagonistId, play.receiverId, ...play.options.flatMap((o) => [o.playerId, o.rivalId])])].flatMap((id) => { const p = player(id); return p ? <p key={p.id}>{p.name} · {t('moments.ratings', { overall: p.overall_rating, attack: p.att_rating, defense: p.def_rating, physical: p.phy_rating, mental: p.men_rating })}</p> : [] })}</details>
  </section>
}
