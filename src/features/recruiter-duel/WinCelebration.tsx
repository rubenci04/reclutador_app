import { useTranslation } from 'react-i18next'

interface Props { readonly participant: string; readonly player: string; readonly amount: number }

const SPARKS = Array.from({ length: 10 }, (_, index) => index)

/**
 * Banner for a signing WON in the auction (not a mandatory award). Decorative sparks end by themselves in ~1.2 s
 * and are removed by prefers-reduced-motion; the text stays and is announced politely. The sound lives in useAuctionSounds.
 */
export function WinCelebration({ participant, player, amount }: Props) {
  const { t } = useTranslation()
  return <div className="win-celebration" role="status" aria-label={t('celebration.aria')}>
    <div className="win-sparks" aria-hidden="true">{SPARKS.map((index) => <i key={index} style={{ ['--spark' as string]: index }} />)}</div>
    <strong className="win-title">{t('celebration.title')}</strong>
    <p className="win-summary">{t('celebration.summary', { participant, player, amount })}</p>
  </div>
}
