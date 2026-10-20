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
  const title = play.node === 'DIRECTION' ? t('play.direction') : t('play.finish', { name: receiver?.name ?? '' })
  return <section className="live-play" ref={card} aria-label={t('play.label')}>
    <h2 tabIndex={-1} ref={heading}>{title}</h2>
    <p className="live-moment">{play.node === 'DIRECTION' ? t('play.carrier', { name: protagonist?.name ?? '', rating: protagonist?.overall_rating ?? 0 }) : t('play.finishHint')}</p>
    <div className="play-cards">
      {play.options.map((option) => {
        const mate = player(option.playerId); const rival = player(option.rivalId)
        const description = !option.available ? (play.node === 'DIRECTION' ? t('play.noReceiver') : t('play.noTarget')) : play.node === 'DIRECTION'
          ? t('play.receiver', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 }) : option.choice === 'CROSS' ? t('play.target', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 }) : t('play.shooter', { name: mate?.name ?? '', rating: mate?.overall_rating ?? 0 })
        return <button key={option.choice} type="button" className={`play-card play-card-${option.choice}`} disabled={!option.available} aria-describedby={`play-detail-${option.choice}`} onClick={() => onChoose(option.choice)}>
          <b className="play-letter" aria-hidden="true">{PLAY_LETTERS[option.choice]}</b>
          <strong>{t(`play.choice.${option.choice}`)}</strong>
          <span id={`play-detail-${option.choice}`}>{description}{option.available && rival ? <small>{t('play.rival', { name: rival.name, rating: rival.overall_rating })}</small> : null}</span>
        </button>
      })}
    </div>
  </section>
}
