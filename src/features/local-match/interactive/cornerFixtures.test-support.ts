import { advanceBlock, createSession, submitPlay } from './session'
import { defaultPlayChoice, keepWindow, resolveQuietWindow } from './liveModel'
import { liveInput, must } from './liveFixtures.test-support'
import type { Session } from './types'
import type { PlayChoice } from './attackTree'

export const cornerSession = (seed: string) => must(createSession(liveInput(seed), { sessionId: 'corners-fixture', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, matchRules: { version: 'halftime-ovr-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, corners: { version: 'corners-v1' } }))
export const cornerChoice = (s: Session, attack: PlayChoice = 'CORNER_NEAR', defense: PlayChoice = 'MAN_MARK'): PlayChoice => {
  const p = s.kernel.partial!.play!
  return p.node === 'CORNER_ATTACK' ? attack : p.node === 'CORNER_DEFEND' ? defense : p.node === 'CORNER_HEADER' ? 'FAR_POST' : p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, s.kernel.input.catalog)
}
export const cornerCommand = (s: Session, choice = cornerChoice(s)) => { const p = s.kernel.partial!.play!; return { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice } }
export const stepCornerSession = (s: Session, choice?: PlayChoice): Session => must(s.phase === 'PLAY' ? submitPlay(s, cornerCommand(s, choice)) : s.phase === 'WINDOW' ? s.window!.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))
