import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { audio } from '../audio/audioEngine'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { NAME_COLORS, POSITION_COLORS, WHEEL_POSITIONS } from './cardWheelModel'

interface CardWheelProps {
  readonly player: Player
  readonly names: readonly Player[]
  readonly nameIndex: number
  /** Who opens this round and therefore spins the wheel. */
  readonly spinner: string
  /** The computer spins by itself; a person presses the button. */
  readonly auto: boolean
  readonly counter: { readonly current: number; readonly total: number }
  readonly onDone: () => void
  readonly onDisable: () => void
}
type Stage = 'ready' | 'position' | 'names' | 'result'
type DiscPhase = 'idle' | 'spinning' | 'landed'
const AUTO_SPIN_MS = 900
const STAGE_MS = { position: 1800, names: 2400, result: 2000 } as const
const LIGHTS = 16
const CONFETTI = 28
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Wheel of coloured segments: the disc turns so segment `index` ends under the pointer. */
function Disc({ labels, colors, index, phase, ms, kind, winner }: { readonly labels: readonly string[]; readonly colors: readonly string[]; readonly index: number; readonly phase: DiscPhase; readonly ms: number; readonly kind: 'position' | 'names'; readonly winner: boolean }) {
  const size = 360 / labels.length
  const end = 5 * 360 - (index + .5) * size
  const stops = labels.map((_, i) => `${colors[i % colors.length]} ${i * size}deg ${(i + 1) * size}deg`).join(', ')
  return <div className={`card-wheel-disc card-wheel-${kind} is-${phase}`} style={{ '--wheel-end': `${end}deg`, '--spin-ms': `${ms}ms`, background: `conic-gradient(from 0deg, ${stops})` } as CSSProperties} aria-hidden="true">
    {labels.map((label, i) => <span key={i} className={`card-wheel-label${winner && i === index ? ' is-winner' : ''}`} style={{ '--wheel-angle': `${(i + .5) * size - 90}deg` } as CSSProperties}>{label}</span>)}
    <span className="card-wheel-hub">⚽</span>
  </div>
}

/**
 * Preguntados-style reveal of the card on sale. Whoever opens the round (a person, the computer, or each local player in turn) spins:
 * first a wheel of positions, then a wheel of names of that position that stops on the card. The card was fixed by the draw beforehand;
 * this only shows it, so it can be skipped or switched off without changing anything in the game.
 */
export function CardWheel({ player, names, nameIndex, spinner, auto, counter, onDone, onDisable }: CardWheelProps) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('ready')
  const spinButton = useRef<HTMLButtonElement>(null)
  const section = useRef<HTMLElement>(null)
  const skipAll = reduced()
  useEffect(() => {
    if (skipAll) { const timer = window.setTimeout(onDone, 0); return () => window.clearTimeout(timer) }
    if (stage === 'ready') {
      if (!auto) return
      const timer = window.setTimeout(() => setStage('position'), AUTO_SPIN_MS)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => (stage === 'result' ? onDone() : setStage(stage === 'position' ? 'names' : 'result')), STAGE_MS[stage])
    return () => window.clearTimeout(timer)
  }, [stage, auto, skipAll, onDone])
  // The wheel and its button must be on screen without scrolling, on short screens too.
  // The page is still settling when the wheel appears (banners, scoreboard), so it centres twice.
  useEffect(() => {
    const centre = () => section.current?.scrollIntoView?.({ block: 'center' })
    const frame = requestAnimationFrame(centre); const later = window.setTimeout(centre, 350)
    return () => { cancelAnimationFrame(frame); window.clearTimeout(later) }
  }, [])
  useEffect(() => { if (stage === 'ready' && !auto) spinButton.current?.focus({ preventScroll: true }) }, [stage, auto])
  useEffect(() => {
    if (stage === 'position') audio.play('coinToss')
    else if (stage === 'names') audio.play('coinLand')
    else if (stage === 'result') { audio.play(player.overall_rating >= 85 ? 'signing' : 'award'); if (typeof navigator !== 'undefined') navigator.vibrate?.(35) }
  }, [stage, player.overall_rating])
  const position = t(`positions.${player.position}`)
  const tier = getPlayerTier(player.overall_rating)
  const tierClass = player.overall_rating >= 98 ? 'tier-card-s-plus' : `tier-card-${tier.toLowerCase()}`
  const spinning = stage === 'position' || stage === 'names'
  const showName = stage === 'names' || stage === 'result'
  return <section ref={section} className={`card-wheel${spinning ? ' is-spinning-wheel' : ''}`} aria-live="polite" style={{ '--chip': POSITION_COLORS[player.position] } as CSSProperties}>
    <p className="card-wheel-counter">{t('wheel.counter', { current: counter.current, total: counter.total })}</p>
    <h2>{stage === 'ready' ? t(auto ? 'wheel.cpuSpins' : 'wheel.yourSpin', { name: spinner }) : stage === 'position' ? t('wheel.positionTitle') : stage === 'names' ? t('wheel.nameTitle', { position }) : t('wheel.result', { player: player.name })}</h2>
    {showName && <p className="card-wheel-chip">{position}</p>}
    <div className="card-wheel-scene" role="img" aria-label={showName ? t('wheel.nameLabel', { position }) : t('wheel.positionLabel')}>
      <div className="card-wheel-pointer" aria-hidden="true" />
      <span className="card-wheel-lights" aria-hidden="true">{Array.from({ length: LIGHTS }, (_, i) => <i key={i} style={{ '--a': `${i * (360 / LIGHTS)}deg`, '--d': `${(i % 2) * .35}s` } as CSSProperties} />)}</span>
      {showName
        ? <Disc key="names" kind="names" labels={names.map((candidate) => candidate.name)} colors={NAME_COLORS} index={nameIndex} phase={stage === 'names' ? 'spinning' : 'landed'} ms={STAGE_MS.names} winner={stage === 'result'} />
        : <Disc key="position" kind="position" labels={WHEEL_POSITIONS.map((code) => t(`positions.${code}`))} colors={WHEEL_POSITIONS.map((code) => POSITION_COLORS[code])} index={WHEEL_POSITIONS.indexOf(player.position)} phase={stage === 'ready' ? 'idle' : 'spinning'} ms={STAGE_MS.position} winner={false} />}
      {stage === 'result' && <span className="card-wheel-confetti" aria-hidden="true">{Array.from({ length: CONFETTI }, (_, i) => <i key={i} style={{ '--a': `${i * (360 / CONFETTI)}deg`, '--d': `${95 + (i % 4) * 30}px`, '--c': NAME_COLORS[i % NAME_COLORS.length] } as CSSProperties} />)}</span>}
    </div>
    {stage === 'result' && <p className={`card-wheel-result ${tierClass}`}><strong>{t('wheel.stats', { rating: player.overall_rating, price: player.price })}</strong></p>}
    <div className="duel-actions card-wheel-actions">
      {stage === 'ready' && !auto && <button ref={spinButton} className="primary-action card-wheel-spin" onClick={() => setStage('position')}>{t('wheel.spin')}</button>}
      <button className="secondary-action" onClick={onDone}>{t('wheel.skip')}</button>
      <button className="secondary-action card-wheel-never" onClick={() => { onDisable(); onDone() }}>{t('wheel.never')}</button>
    </div>
  </section>
}
