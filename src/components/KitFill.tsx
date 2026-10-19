import type { KitPattern } from '../features/player-catalog/clubVisuals'

interface Props { readonly pattern: KitPattern; readonly primary: string; readonly secondary: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }

/**
 * Original kit patterns (stripes, hoops, halves, sash, bands) in the club's two colours.
 * They echo how clubs usually dress without using any licensed kit or crest artwork.
 */
export function KitFill({ pattern, primary, secondary, x, y, width, height }: Props) {
  const r = (a: number, b: number, w: number, h: number, fill: string) => <path d={`M${a} ${b}h${w}v${h}h${-w}Z`} fill={fill} />
  const base = r(x, y, width, height, primary)
  switch (pattern) {
    case 'stripes': {
      const w = width / 7
      return <g stroke="none">{base}{[1, 3, 5].map((index) => <path key={index} d={`M${x + w * index} ${y}h${w}v${height}h${-w}Z`} fill={secondary} />)}</g>
    }
    case 'hoops': {
      const h = height / 7
      return <g stroke="none">{base}{[1, 3, 5].map((index) => <path key={index} d={`M${x} ${y + h * index}h${width}v${h}h${-width}Z`} fill={secondary} />)}</g>
    }
    case 'halves': return <g stroke="none">{base}{r(x + width / 2, y, width / 2, height, secondary)}</g>
    case 'sash': return <g stroke="none">{base}<polygon points={`${x},${y + height * .15} ${x + width * .35},${y} ${x + width},${y + height * .85} ${x + width * .65},${y + height} `} fill={secondary} /></g>
    case 'hband': return <g stroke="none">{base}{r(x, y + height * .36, width, height * .26, secondary)}</g>
    case 'vband': return <g stroke="none">{base}{r(x + width * .38, y, width * .24, height, secondary)}</g>
    case 'plain': return <g stroke="none">{base}{r(x, y + height * .86, width, height * .14, secondary)}</g>
    default: return <g stroke="none">{r(x, y, width / 2, height, primary)}{r(x + width / 2, y, width / 2, height, secondary)}</g>
  }
}
