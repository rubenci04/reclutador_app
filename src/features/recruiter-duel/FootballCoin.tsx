import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CoinSide } from './auctionTypes'

/** HEADS = original football drawing, TAILS = original stadium drawing. No faces, official crests or third-party images. */
const BALL_PATCHES = [[0, -31], [29.5, -9.6], [18.2, 25.1], [-18.2, 25.1], [-29.5, -9.6]] as const
const BALL_SEAMS = [[0, -11, 0, -25], [10.5, -3.4, 23.8, -7.7], [6.5, 8.9, 14.7, 20.2], [-6.5, 8.9, -14.7, 20.2], [-10.5, -3.4, -23.8, -7.7]] as const

export function CoinFace({ side }: { readonly side: CoinSide }) {
  return <svg className={`coin-art coin-art-${side}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle className="coin-edge" cx="50" cy="50" r="47" />
    <circle className="coin-disc" cx="50" cy="50" r="40" />
    {side === 'heads'
      ? <g transform="translate(50 50) scale(.78)">
        <circle className="ball-body" r="38" />
        {BALL_SEAMS.map(([x1, y1, x2, y2]) => <line className="ball-seam" key={`${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />)}
        {BALL_PATCHES.map(([x, y]) => <circle className="ball-patch" key={`${x}${y}`} cx={x} cy={y} r="6" />)}
        <path className="ball-patch" d="M0-11 10.5-3.4 6.5 8.9h-13L-10.5-3.4Z" />
      </g>
      : <g transform="translate(50 50)">
        <ellipse className="stadium-stands" rx="34" ry="27" />
        <ellipse className="stadium-tier" rx="30" ry="23" />
        <ellipse className="stadium-pitch" rx="25" ry="17.5" />
        <path className="stadium-line" d="M0-17.5V17.5M-25 0h50M-12-8.5h24v17h-24Z" />
        <circle className="stadium-line" r="5" />
        {[[-31, -17], [31, -17], [-31, 17], [31, 17]].map(([x, y]) => <g key={`${x}${y}`}><path className="stadium-tower" d={`M${x} ${y}V${y + (y < 0 ? -6 : 6)}`} /><circle className="stadium-light" cx={x} cy={y + (y < 0 ? -7 : 7)} r="2.2" /></g>)}
      </g>}
  </svg>
}

const FACE_KEY = { heads: 'coin.faces.heads', tails: 'coin.faces.tails' } as const

/**
 * 3D coin. `side` is the stored result: the CSS animation ends on exactly that face and never decides it.
 * With reduced motion the coin simply shows the final face.
 */
export function FootballCoin({ side, tossing = false }: { readonly side: CoinSide; readonly tossing?: boolean }) {
  const { t } = useTranslation()
  /** The label only names the side once the CSS landing ended; the side itself is the stored result and never changes. */
  const [landed, setLanded] = useState(false)
  const showResult = !tossing || landed
  return <div className={`football-coin ${tossing ? 'tossing' : ''}${tossing && landed ? ' landed' : ''}`} data-side={side} role="img" aria-label={showResult ? t('coin.side', { side: t(`duel.${side}`) }) : t('duel.coinTossWaiting')}>
    <div className="coin-stage" aria-hidden="true"><div className="coin3d" onAnimationEnd={(event) => { if (event.target === event.currentTarget) setLanded(true) }}><div className="coin-face coin-front"><CoinFace side="heads" /></div><div className="coin-face coin-back"><CoinFace side="tails" /></div></div></div>
    {tossing && <div className="coin-shadow" aria-hidden="true" />}
    <span className="coin-result">{showResult ? `${t(`duel.${side}`)} · ${t(FACE_KEY[side])}` : t('duel.coinToss')}</span>
  </div>
}
