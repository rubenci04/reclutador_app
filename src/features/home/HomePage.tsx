import { useState } from 'react'
import { DraftPage } from '../draft/DraftPage'
import { AuctionPage } from '../recruiter-duel/AuctionPage'

export function HomePage() {
  const [mode, setMode] = useState<'duel' | 'free'>('duel')
  return mode === 'duel' ? <AuctionPage onDraftFree={() => setMode('free')} /> : <DraftPage onDuel={() => setMode('duel')} />
}
