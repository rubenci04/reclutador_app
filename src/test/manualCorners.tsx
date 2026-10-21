/** Dev-only real-engine fixtures. No results are injected; this entry is absent from the production module graph. */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { createI18n } from '../i18n'
import { LanguageSelector } from '../components/LanguageSelector'
import { AudioControls } from '../features/audio/AudioControls'
import { audio } from '../features/audio/audioEngine'
import { GLOBAL_CURRENT as catalog } from '../features/player-catalog/globalCollection'
import { createSession, advanceBlock, submitPlay, type Outcome, type Session, type PlayChoice } from '../features/local-match/interactive'
import { defaultPlayChoice, keepWindow, resolveQuietWindow } from '../features/local-match/interactive/liveModel'
import { LiveMatchScreen } from '../features/local-match/LiveMatchScreen'
import type { DraftLineup } from '../features/draft/draftTypes'
import profiles from '../../docs/qa/SIM-005R-04B-profiles.json'
import fixtures from '../../docs/qa/SIM-005R-06-playtest-cases.json'
import '../styles/index.css'

const must = <T,>(value: Outcome<T>): T => { if (!value.ok) throw Error(value.error); return value.value }
function originFor(index: number): Session {
  const fixture = fixtures.cases[index], setup = profiles.results.find((p) => p.name === (fixture.profile === 'real_physical' ? 'physical_forward' : 'balanced'))!
  let s = must(createSession({ catalog, localLineup: setup.lineups.local as DraftLineup, cpuLineup: setup.lineups.cpu as DraftLineup, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', actionModel: 'action-v3', seed: fixture.seed, budget: 150, rosterBonus: true, formations: { local: '4-3-3', cpu: '4-3-3' }, tactics: { version: 'tactics-v1', local: 'WIDE_PLAY', cpu: 'LOW_BLOCK' } }, { sessionId: 'corner-calibration', matchRules: { version: 'halftime-ovr-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, corners: { version: 'corners-v1' } }))
  for (let guard = 0; guard < 100; guard++) {
    if (s.phase === 'PLAY') {
      const p = s.kernel.partial!.play!
      if (p.id === fixture.playId && (p.node === 'CORNER_ATTACK' || p.node === 'CORNER_DEFEND')) return s
      const choice: PlayChoice = p.node === 'CORNER_ATTACK' ? fixture.attack as PlayChoice : p.node === 'CORNER_DEFEND' ? fixture.defense as PlayChoice : p.node === 'CORNER_HEADER' ? fixture.direction as PlayChoice : p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, catalog)
      s = must(submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice }))
    } else s = must(s.phase === 'WINDOW' ? s.window!.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))
  }
  throw Error('corner_fixture_not_found')
}
export function ManualCorners() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0), [run, setRun] = useState<{ session: Session; key: number } | null>(null)
  const fixture = fixtures.cases[selected]
  return <div className="draft-app"><header className="draft-header"><b>SIM-005R-06 · QA</b><AudioControls /><LanguageSelector /></header>
    <section className="match-card" style={{ padding: 12 }}><label>{t('match.featured')} <select value={selected} onChange={(e) => { setSelected(Number(e.target.value)); setRun(null) }}>{fixtures.cases.map((item, i) => <option key={item.id} value={i}>{item.id} · {t(`match.play.${item.ending}`, { player: '', team: '' })}</option>)}</select></label>
      <p>{t(`play.choice.${fixture.side === 'local' ? fixture.attack : fixture.defense}`)} · {t(`play.choice.${fixture.direction}`)} · {fixture.seed} · {fixture.playId}</p>
      <button className="primary-action" onClick={() => { void audio.unlock(); setRun({ session: originFor(selected), key: (run?.key ?? 0) + 1 }) }}>{t(run ? 'match.replay' : 'nav.play')}</button>
    </section>
    {run && <LiveMatchScreen key={run.key} origin={run.session} versusCpu difficulty="NORMAL" names={{ local: 'Reclutador', cpu: 'CPU' }} closed={false} onFinished={() => {}} onReturn={() => setRun(null)} />}
  </div>
}
const i18n = await createI18n()
createRoot(document.getElementById('root')!).render(<I18nextProvider i18n={i18n}><ManualCorners /></I18nextProvider>)
