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
import { TacticalBoard } from '../features/local-match/TacticalBoard'
import type { MatchEvent } from '../features/local-match/matchTypes'
import type { DraftLineup } from '../features/draft/draftTypes'
import profiles from '../../docs/qa/SIM-005R-04B-profiles.json'
import fixtures from '../../docs/qa/SIM-005R-07-playtest-cases.json'
import '../styles/index.css'

const must = <T,>(value: Outcome<T>): T => { if (!value.ok) throw Error(value.error); return value.value }
function originFor(index: number): Session {
  const fixture = fixtures.cases[index], setup = profiles.results.find((p) => p.name === (fixture.profile === 'real_physical' ? 'physical_forward' : 'balanced'))!
  let s = must(createSession({ catalog, localLineup: setup.lineups.local as DraftLineup, cpuLineup: setup.lineups.cpu as DraftLineup, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', actionModel: 'action-v3', seed: fixture.seed, budget: 150, rosterBonus: true, formations: { local: '4-3-3', cpu: '4-3-3' }, tactics: { version: 'tactics-v1', local: 'WIDE_PLAY', cpu: 'LOW_BLOCK' } }, { sessionId: 'free-kick-calibration', matchRules: { version: 'halftime-ovr-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, corners: { version: 'corners-v1' }, freeKicks: { version: 'free-kicks-v1' } }))
  for (let guard = 0; guard < 100; guard++) {
    if (s.phase === 'PLAY') {
      const p = s.kernel.partial!.play!
      if (p.id === fixture.playId && (p.node === 'FK_ATTACK' || p.node === 'FK_DEFEND')) return s
      const choice: PlayChoice = p.node === 'FK_ATTACK' ? (p.freeKick!.zone === 'CENTRAL_OUTSIDE' ? fixture.policy.aim : fixture.policy.indirect) as PlayChoice : p.node === 'FK_DEFEND' ? (p.freeKick!.zone === 'CENTRAL_OUTSIDE' ? fixture.policy.wall : fixture.policy.coverage) as PlayChoice : p.node === 'FK_HEADER' || p.node === 'CORNER_HEADER' || p.node === 'HEADER' ? 'FAR_POST' : p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, catalog)
      s = must(submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice }))
    } else s = must(s.phase === 'WINDOW' ? s.window!.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))
  }
  throw Error('free_kick_fixture_not_found')
}
/** Step through confirmed real-engine events for reproducible browser captures. Not a simulation or result override. */
function Sequence({ origin, index }: { readonly origin: Session; readonly index: number }) {
  const { t } = useTranslation(), [beat, setBeat] = useState(0)
  const fixture = fixtures.cases[index]
  let session = origin
  while (session.kernel.partial?.play?.freeKick?.id === fixture.playId) {
    const p = session.kernel.partial.play, choice = p.node === 'FK_HEADER' ? 'FAR_POST' : p.node === 'FK_ATTACK' ? p.freeKick!.zone === 'CENTRAL_OUTSIDE' ? fixture.policy.aim : fixture.policy.indirect : p.freeKick!.zone === 'CENTRAL_OUTSIDE' ? fixture.policy.wall : fixture.policy.coverage
    session = must(submitPlay(session, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: session.sessionId, expectedRevision: session.revision, playId: p.id, node: p.node, choice: choice as PlayChoice }))
  }
  const events = [...session.kernel.blocks.flatMap((b) => b.events), ...(session.kernel.partial?.events ?? [])].filter((e) => e.freeKick?.id === fixture.playId)
  const event: MatchEvent = events[Math.min(beat, events.length - 1)]
  const player = catalog.find((p) => p.id === event.playerId)?.name ?? ''
  return <details className="match-card"><summary>{t('liveDT.audit')}</summary>
    <label>{t('moments.history')} <select value={beat} onChange={(e) => setBeat(Number(e.target.value))}>{events.map((e, i) => <option key={i} value={i}>{i + 1} · {t(`match.play.${e.step}`, { player: catalog.find((p) => p.id === e.playerId)?.name ?? '', team: e.side === 'local' ? 'Reclutador' : 'CPU' })}</option>)}</select></label>
    <p>{t(`match.play.${event.step}`, { player, team: event.side === 'local' ? 'Reclutador' : 'CPU' })}</p>
    <TacticalBoard formations={origin.kernel.input.formations!} lineups={{ local: origin.kernel.sides.local.team.lineup, cpu: origin.kernel.sides.cpu.team.lineup }} catalog={catalog} names={{ local: 'Reclutador', cpu: 'CPU' }} play={{ kind: event.type, side: event.side, playerId: event.playerId, step: event.step, freeKick: event.freeKick }} tick={beat} focus={event.freeKick!.awardedTo === 'local' ? 'cpu' : 'local'} speed={1} animate />
  </details>
}
export function ManualFreeKicks() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0), [run, setRun] = useState<{ session: Session; key: number } | null>(null)
  const fixture = fixtures.cases[selected]
  return <div className="draft-app"><header className="draft-header"><b>SIM-005R-07 · QA</b><AudioControls /><LanguageSelector /></header>
    <section className="match-card" style={{ padding: 12 }}><label>{t('match.featured')} <select value={selected} onChange={(e) => { setSelected(Number(e.target.value)); setRun(null) }}>{fixtures.cases.map((item, i) => <option key={item.id} value={i}>{item.id} · {t(`match.play.${item.ending}`, { player: '', team: '' })}</option>)}</select></label>
      <p>{t(`play.choice.${fixture.side === 'local' ? fixture.zone === 'CENTRAL_OUTSIDE' ? fixture.policy.aim : fixture.policy.indirect : fixture.zone === 'CENTRAL_OUTSIDE' ? fixture.policy.wall : fixture.policy.coverage}`)} · {t(`play.choice.${'FAR_POST'}`)} · {fixture.seed} · {fixture.playId}</p>
      <button className="primary-action" onClick={() => { void audio.unlock(); setRun({ session: originFor(selected), key: (run?.key ?? 0) + 1 }) }}>{t(run ? 'match.replay' : 'nav.play')}</button>
    </section>
    {run && <Sequence key={`sequence:${run.key}`} origin={run.session} index={selected} />}
    {run && <LiveMatchScreen key={run.key} origin={run.session} versusCpu difficulty="NORMAL" names={{ local: 'Reclutador', cpu: 'CPU' }} closed={false} onFinished={() => {}} onReturn={() => setRun(null)} />}
  </div>
}
const i18n = await createI18n()
const root = createRoot(document.getElementById('root')!)
root.render(<I18nextProvider i18n={i18n}><ManualFreeKicks /></I18nextProvider>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
