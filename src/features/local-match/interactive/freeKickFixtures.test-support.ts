import { advanceBlock, createSession, submitPlay } from './session'
import { defaultPlayChoice, keepWindow, resolveQuietWindow } from './liveModel'
import { liveInput, must } from './liveFixtures.test-support'
import type { Session } from './types'
import type { PlayNode } from './attackTree'
export const freeKickFixture = (seed: string) => must(createSession(liveInput(seed), { sessionId: 'free-kick-fixture', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, matchRules: { version: 'halftime-ovr-v1' }, corners: { version: 'corners-v1' }, freeKicks: { version: 'free-kicks-v1' } }))
export function stepFreeKickFixture(s: Session): Session {
  const p = s.kernel.partial?.play
  return must(p ? submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice: p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, s.kernel.input.catalog) }) : s.phase === 'WINDOW' ? s.window!.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))
}
export function pendingFreeKick(node: PlayNode, direct = true): Session {
  for (let seed = 0; seed < 100; seed++) {
    let s = freeKickFixture(`free-kicks:${seed}`)
    while (s.phase !== 'FINISHED') { const p = s.kernel.partial?.play; if (p?.node === node && (!p.freeKick || node === 'FK_HEADER' || (p.freeKick.zone === 'CENTRAL_OUTSIDE') === direct)) return s; s = stepFreeKickFixture(s) }
  }
  throw Error('free_kick_fixture_not_found')
}
