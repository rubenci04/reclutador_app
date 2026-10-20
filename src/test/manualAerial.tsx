/** Dev-only manual QA entry. Not imported by the app or included in the production build. */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { createI18n } from '../i18n'
import { LanguageSelector } from '../components/LanguageSelector'
import { AudioControls } from '../features/audio/AudioControls'
import { audio } from '../features/audio/audioEngine'
import { GLOBAL_CURRENT as catalog } from '../features/player-catalog/globalCollection'
import { createSession, advanceBlock, submitPlay, type Session, type Outcome } from '../features/local-match/interactive'
import { keepWindow } from '../features/local-match/interactive/liveModel'
import { LiveMatchScreen } from '../features/local-match/LiveMatchScreen'
import type { DraftLineup } from '../features/draft/draftTypes'
import type { PlayChoice } from '../features/local-match/interactive'
import profileReport from '../../docs/qa/SIM-005R-04B-profiles.json'
import playtestReport from '../../docs/qa/SIM-005R-04B-playtest-cases.json'
import '../styles/index.css'

const must = <T,>(value: Outcome<T>): T => { if (!value.ok) throw new Error(value.error); return value.value }
const setup = profileReport.results.find((r) => r.name === playtestReport.scenario)!
function originFor(index: number): Session {
  const test = playtestReport.cases[index]
  let s = must(createSession({ catalog, localLineup: setup.lineups.local as DraftLineup, cpuLineup: setup.lineups.cpu as DraftLineup, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', actionModel: 'action-v3', seed: test.seed, budget: 150, formations: { local: '4-3-3', cpu: '4-3-3' }, rosterBonus: true, tactics: { version: 'tactics-v1', local: 'WIDE_PLAY', cpu: 'LOW_BLOCK' } }, { sessionId: 'aerial-playtest', moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' } }))
  for (let guard = 0; guard < 100; guard++) {
    if (s.phase === 'PLAY') {
      const p = s.kernel.partial!.play!
      if (p.node === 'FINISH' && p.id === test.playId) return s
      const choice: PlayChoice = p.node === 'DIRECTION' ? p.options.find((o) => o.available)!.choice : p.node === 'DEFEND' ? 'INTERCEPT' : p.node === 'HEADER' ? test.direction as PlayChoice : p.options.find((o) => o.choice === 'CROSS' && o.available)?.choice ?? 'SHOOT'
      s = must(submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice }))
    } else s = must(s.phase === 'WINDOW' ? keepWindow(s) : advanceBlock(s))
  }
  throw new Error('manual_fixture_not_found')
}
export function ManualAerial() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const [run, setRun] = useState<{ session: Session; key: number } | null>(null)
  const test = playtestReport.cases[selected]
  return <div className="draft-app"><header className="draft-header"><b>SIM-005R-04B · QA</b><AudioControls /><LanguageSelector /></header>
    <section className="match-card" style={{ padding: 16 }}>
      <label>{t('match.featured')} <select value={selected} onChange={(e) => { setSelected(Number(e.target.value)); setRun(null) }}>{playtestReport.cases.map((item, i) => <option key={item.ending} value={i}>{t(`match.play.${item.ending}`, { player: '' })}</option>)}</select></label>
      <p>{t(`play.choice.${test.direction}`)} · {test.seed} · {test.playId}</p>
      <button className="primary-action" onClick={() => { void audio.unlock(); setRun({ session: originFor(selected), key: (run?.key ?? 0) + 1 }) }}>{t(run ? 'match.replay' : 'nav.play')}</button>
    </section>
    {run && <LiveMatchScreen key={run.key} origin={run.session} versusCpu difficulty="NORMAL" names={{ local: 'Reclutador', cpu: 'CPU' }} closed={false} onFinished={() => {}} onReturn={() => setRun(null)} />}
  </div>
}
const i18n = await createI18n()
createRoot(document.getElementById('root')!).render(<I18nextProvider i18n={i18n}><ManualAerial /></I18nextProvider>)
