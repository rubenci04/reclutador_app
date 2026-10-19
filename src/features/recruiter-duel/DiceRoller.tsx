import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Position } from '../../types/football'

type DiceTier = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D'
/** Six faces per die; the drawn value is shown on one of them. Order matches FACE_TURNS. */
const POSITION_FACES: readonly Position[] = ['ARQ', 'DEF', 'MED', 'DEL', 'DEF', 'MED']
const TIER_FACES: readonly DiceTier[] = ['D', 'C', 'B', 'A', 'S', 'S+']
/** Rotation that brings face N (front, right, left, top, bottom, back) to the viewer. */
const FACE_TURNS = ['rotateX(0deg)', 'rotateY(-90deg)', 'rotateY(90deg)', 'rotateX(-90deg)', 'rotateX(90deg)', 'rotateY(180deg)'] as const

interface Props {
  readonly position: Position
  readonly tier: DiceTier
  readonly roundNumber: number
  readonly rolling?: boolean
}

function Die<T extends string>({ faces, value, kind }: { readonly faces: readonly T[]; readonly value: T; readonly kind: string }) {
  const index = Math.max(0, faces.indexOf(value))
  return <span className="die-scene" aria-hidden="true">
    <span className={`die die-${kind}`} data-value={value} style={{ '--final': FACE_TURNS[index] } as CSSProperties}>
      {faces.map((face, faceIndex) => <span key={faceIndex} className={`die-face die-face-${faceIndex} die-${kind}-${face.replace('+', 'plus')}`}>{face}</span>)}
    </span>
  </span>
}

/** Purely presentational: the draw is already decided by the engine; the dice only land on its result. */
export function DiceRoller({ position, tier, roundNumber, rolling = true }: Props) {
  const { t } = useTranslation()
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return <div className={`dice-roller${rolling && !reduced ? ' is-rolling' : ''}`} role="img" aria-label={t('dice.label', { round: roundNumber, position: t(`positions.${position}`), tier })}>
    <Die faces={POSITION_FACES} value={position} kind="position" />
    <Die faces={TIER_FACES} value={tier} kind="tier" />
  </div>
}
