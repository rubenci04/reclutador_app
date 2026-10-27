import { useMemo } from 'react'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { formationSlots, type FormationId } from '../tactics/formations'
import type { MatchSide, MatchTeam } from './matchTypes'
import type { Spot } from './engine/figuresPlays'

interface Props {
  readonly teams: Readonly<Record<MatchSide, MatchTeam>>
  readonly formations: Readonly<Record<MatchSide, FormationId>>
  readonly ball: Spot
  /** Side with the ball while a play is on: its eleven steps forward a little. */
  readonly attacking: MatchSide | null
  /** Player highlighted (the one taking the chance). */
  readonly highlightId?: string
  readonly label: string
}

/** The local side defends the bottom half and attacks upwards; the CPU side is mirrored. Slot coordinates come from the formation. */
function place(side: MatchSide, slot: { readonly x: number; readonly y: number }, push: number) {
  return side === 'local' ? { left: slot.x, top: 50 + slot.y / 2 - push } : { left: 100 - slot.x, top: 50 - slot.y / 2 + push }
}

/** Drawn pitch (SVG lines) with the avatars of both elevens and the ball. Decorative for assistive technology: the caption carries the story. */
export function FiguresPitch({ teams, formations, ball, attacking, highlightId, label }: Props) {
  const layout = useMemo(() => (['local', 'cpu'] as const).flatMap((side) => {
    const slots = formationSlots(formations[side])
    return slots.map((slot) => ({ side, slot, player: teams[side].players.find((p) => p.id === teams[side].lineup[slot.id]) })).filter((item) => item.player)
  }), [teams, formations])
  return <div className="fm-pitch" role="img" aria-label={label}>
    <svg viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="100" height="130" className="fm-grass" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x="0" y={i * 130 / 6} width="100" height={130 / 12} className="fm-stripe" />)}
      <g className="fm-lines"><rect x="3" y="3" width="94" height="124" /><line x1="3" y1="65" x2="97" y2="65" /><circle cx="50" cy="65" r="11" />
        <rect x="24" y="3" width="52" height="20" /><rect x="38" y="3" width="24" height="7" /><rect x="24" y="107" width="52" height="20" /><rect x="38" y="120" width="24" height="7" />
        <rect x="42" y="0.4" width="16" height="2.6" className="fm-goal" /><rect x="42" y="127" width="16" height="2.6" className="fm-goal" /></g>
    </svg>
    {layout.map(({ side, slot, player }) => {
      const pos = place(side, slot, attacking === side ? 5 : attacking ? -2 : 0)
      return <span key={`${side}-${slot.id}`} className={`fm-player fm-${side}${highlightId === player!.id ? ' is-active' : ''}`} style={{ left: `${pos.left}%`, top: `${pos.top / 1}%` }}><PlayerAvatar player={player!} /></span>
    })}
    <span className="fm-ball" aria-hidden="true" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
  </div>
}
