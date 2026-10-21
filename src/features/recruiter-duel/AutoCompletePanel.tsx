import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { AutoCompletePreview } from './auctionEngine'

interface QuickProps {
  readonly participantName: string
  readonly rivalName: string
  readonly catalog: readonly Player[]
  readonly preview: AutoCompletePreview
  readonly onConfirm: () => void
}

/** «Complete my team»: shows what would be awarded and the resulting budget before anything is decided. */
export function QuickCompletePanel({ participantName, rivalName, catalog, preview, onConfirm }: QuickProps) {
  const { t } = useTranslation()
  return <section className="quick-complete" aria-labelledby="quick-complete-title">
    <h2 id="quick-complete-title">{t('autoComplete.humanTitle')}</h2>
    <p>{t('autoComplete.intro', { rival: rivalName, participant: participantName })}</p>
    {preview.ok
      ? <>
        <p><b>{t('autoComplete.remaining', { count: preview.items.length })}</b></p>
        <ul>{preview.items.map((item) => {
          const player = catalog.find((candidate) => candidate.id === item.playerId)!
          return <li key={item.playerId}>{t('autoComplete.item', { player: player.name, position: t(`positions.${player.position}`), price: item.price })}</li>
        })}</ul>
        <p>{t('autoComplete.total', { amount: preview.totalCost })} · {t('autoComplete.finalBudget', { amount: preview.finalBudget })}</p>
        <button className="primary-action" onClick={onConfirm}>{t('autoComplete.confirm')}</button>
        <p className="strategy-note">{t('autoComplete.manual')}</p>
      </>
      : <p role="status">{t('autoComplete.blocked')}</p>}
  </section>
}

interface CpuProps {
  readonly cpuName: string
  readonly done: number
  readonly total: number
  readonly lastPlayer: string | null
  readonly lastPrice: number | null
  readonly onSkip: () => void
}

/** Short, skippable sequence while the CPU takes the remaining cards. */
export function CpuCompletionPanel({ cpuName, done, total, lastPlayer, lastPrice, onSkip }: CpuProps) {
  const { t } = useTranslation()
  return <section className="quick-complete cpu-completion" aria-live="polite">
    <h2>{t('autoComplete.cpuTitle')}</h2>
    <p className="team-complete-note"><strong>{t('auctionFocus.teamComplete')}</strong></p>
    <p>{t('autoComplete.cpuIntro')}</p>
    {lastPlayer !== null && lastPrice !== null && <p className="cpu-signing" key={lastPlayer}>{t('autoComplete.cpuProgress', { participant: cpuName, player: lastPlayer, price: lastPrice, done, total })}</p>}
    <button className="secondary-action" onClick={onSkip}>{t('autoComplete.skip')}</button>
  </section>
}

interface SigningsProps { readonly name: string; readonly items: readonly { readonly player: string; readonly position: string; readonly price: number }[] }

/** After the automatic close: what the rival signed and what it paid, one tap away. */
export function CpuSigningsSummary({ name, items }: SigningsProps) {
  const { t } = useTranslation()
  if (!items.length) return null
  const total = items.reduce((sum, item) => sum + item.price, 0)
  return <details className="cpu-signings"><summary>{t('auctionFocus.cpuSigningsSummary', { name })}</summary>
    <ul aria-label={t('auctionFocus.cpuSignings', { name })}>{items.map((item) => <li key={item.player}>{t('autoComplete.item', { player: item.player, position: item.position, price: item.price })}</li>)}</ul>
    <p>{t('autoComplete.total', { amount: total })}</p>
  </details>
}
