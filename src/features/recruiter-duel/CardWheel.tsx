import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { WHEEL_POSITIONS } from './cardWheelModel'

interface CardWheelProps {
  readonly player: Player
  readonly names: readonly Player[]
  readonly nameIndex: number
  readonly onDone: () => void
  readonly onDisable: () => void
}
type Stage = 'position' | 'names' | 'result'
const STAGE_MS = { position: 1700, names: 2300, result: 900 } as const
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Wheel of segments: the disc turns so segment `index` ends under the pointer. */
function Disc({ labels, index, turns, kind }: { readonly labels: readonly string[]; readonly index: number; readonly turns: number; readonly kind: 'position' | 'names' }) {
  const size = 360 / labels.length
  const end = turns * 360 - (index + .5) * size
  const stops = labels.map((_, i) => `${i % 2 ? '#173c65' : '#326a45'} ${i * size}deg ${(i + 1) * size}deg`).join(', ')
  return <div className={`card-wheel-disc card-wheel-${kind}`} style={{ '--wheel-end': `${end}deg`, background: `conic-gradient(from 0deg, ${stops})` } as CSSProperties} aria-hidden="true">
    {labels.map((label, i) => <span key={i} className="card-wheel-label" style={{ '--wheel-angle': `${(i + .5) * size - 90}deg` } as CSSProperties}>{label}</span>)}
    <span className="card-wheel-hub">⚽</span>
  </div>
}

/**
 * Preguntados-style reveal of the card on sale: first a wheel of positions, then a wheel of names of that position that stops on the card.
 * The card was fixed by the draw beforehand; this only shows it, so it can be skipped or switched off without changing anything in the game.
 */
export function CardWheel({ player, names, nameIndex, onDone, onDisable }: CardWheelProps) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('position')
  const skipAll = reduced()
  useEffect(() => {
    if (skipAll) { const timer = window.setTimeout(onDone, 0); return () => window.clearTimeout(timer) }
    const timer = window.setTimeout(() => (stage === 'result' ? onDone() : setStage(stage === 'position' ? 'names' : 'result')), STAGE_MS[stage])
    return () => window.clearTimeout(timer)
  }, [stage, skipAll, onDone])
  const position = t(`positions.${player.position}`)
  return <section className="card-wheel" aria-live="polite">
    <h2>{stage === 'position' ? t('wheel.positionTitle') : stage === 'names' ? t('wheel.nameTitle', { position }) : t('wheel.result', { player: player.name })}</h2>
    <div className="card-wheel-scene" role="img" aria-label={stage === 'position' ? t('wheel.positionLabel') : t('wheel.nameLabel', { position })}>
      <div className="card-wheel-pointer" aria-hidden="true" />
      {stage === 'position'
        ? <Disc key="position" kind="position" labels={WHEEL_POSITIONS.map((code) => t(`positions.${code}`))} index={WHEEL_POSITIONS.indexOf(player.position)} turns={4} />
        : <Disc key="names" kind="names" labels={names.map((candidate) => candidate.name)} index={nameIndex} turns={stage === 'names' ? 5 : 0} />}
    </div>
    <div className="duel-actions card-wheel-actions">
      <button className="secondary-action" onClick={onDone}>{t('wheel.skip')}</button>
      <button className="secondary-action card-wheel-never" onClick={() => { onDisable(); onDone() }}>{t('wheel.never')}</button>
    </div>
  </section>
}
