import type { StrategyId } from '../tactics/strategies'

/** Minimal tactics board: dots are our block, arrows the direction of play. Decorative; the card text carries the meaning. */
const BOARDS: Readonly<Record<StrategyId, { readonly dots: readonly (readonly [number, number])[]; readonly arrows: readonly string[] }>> = {
  NEUTRAL: { dots: [[15, 20], [30, 10], [30, 30], [45, 20]], arrows: ['M20 20h36'] },
  MIDFIELD_CONTROL: { dots: [[28, 12], [28, 20], [28, 28], [14, 20]], arrows: ['M34 12l14 8M34 28l14-8'] },
  WIDE_PLAY: { dots: [[30, 6], [30, 34], [14, 20]], arrows: ['M34 6h18M34 34h18'] },
  COUNTER_ATTACK: { dots: [[12, 12], [12, 20], [12, 28]], arrows: ['M20 20C32 6 44 6 56 18'] },
  HIGH_PRESS: { dots: [[44, 10], [44, 20], [44, 30], [30, 20]], arrows: ['M44 10l10 4M44 30l10-4M44 20h10'] },
  LOW_BLOCK: { dots: [[10, 10], [10, 20], [10, 30], [20, 15], [20, 25]], arrows: ['M52 20H34'] },
}

export function StrategyDiagram({ id }: { readonly id: StrategyId }) {
  const board = BOARDS[id]
  return <svg className="strategy-diagram" viewBox="0 0 64 40" aria-hidden="true" focusable="false" data-strategy={id}>
    <rect x=".5" y=".5" width="63" height="39" rx="3" fill="#0f3a24" stroke="#ffffff55" />
    <path d="M32 .5v39" stroke="#ffffff33" /><circle cx="32" cy="20" r="6" fill="none" stroke="#ffffff33" />
    {board.dots.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="2.4" fill="#d5fb76" />)}
    {board.arrows.map((d, index) => <path key={index} d={d} fill="none" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" markerEnd="url(#arrow-head)" />)}
    <defs><marker id="arrow-head" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0 0l5 2.5L0 5z" fill="#fbbf24" /></marker></defs>
  </svg>
}
