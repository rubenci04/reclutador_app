import { describe, expect, it } from 'vitest'
import { advanceBlock, submitPlay } from './session'
import { must, treeSession } from './liveFixtures.test-support'
import { keepWindow } from './liveModel'
import type { PlayChoice } from './attackTree'

/** The complete, reproducible example documented in docs/qa/SIM-005R-02.md. Any change to the tree contract or its probabilities breaks it on purpose. */
describe('SIM-005R-02 reproducible example (seed "doc-example")', () => {
  it('produces exactly the documented plays, events and score for the documented decisions', () => {
    let s = treeSession('doc-example'); const wanted: PlayChoice[] = ['LEFT', 'CROSS', 'RIGHT', 'SHOOT', 'RIGHT', 'SHOOT']
    const nodes: string[] = []
    while (s.phase !== 'FINISHED') {
      if (s.phase === 'PLAY') {
        const play = s.kernel.partial!.play!; const choice = wanted.shift()!
        nodes.push(`${play.id}:${play.node}:${choice}`)
        s = must(submitPlay(s, { version: 'interactive-play-command-v1', id: `${play.id}:${play.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: play.id, node: play.node, choice }))
      } else s = s.phase === 'WINDOW' ? must(keepWindow(s)) : must(advanceBlock(s))
    }
    expect(nodes).toEqual(['play-15:DIRECTION:LEFT', 'play-15:FINISH:CROSS', 'play-45:DIRECTION:RIGHT', 'play-45:FINISH:SHOOT', 'play-90:DIRECTION:RIGHT', 'play-90:FINISH:SHOOT'])
    const steps = s.kernel.blocks.flatMap((b) => b.events).filter((e) => e.step).map((e) => `${e.minute} ${e.side} ${e.type} ${e.step} ${e.playerId}`)
    expect(steps).toEqual([
      '15 local attack BUILD live_local_5', '15 local pass PASS_LEFT_OK live_local_0', '15 local pass CROSS_OK live_local_0', '15 local goal HEADER_GOAL live_local_2',
      '45 local attack BUILD live_local_5', '45 local pass PASS_RIGHT_OK live_local_2', '45 local goal SHOT_GOAL live_local_2',
      '90 local attack BUILD live_local_5', '90 local pass PASS_RIGHT_OK live_local_2', '90 cpu save SHOT_SAVED live_cpu_10',
    ])
    expect(s.kernel.score).toEqual({ local: 4, cpu: 4 }); expect(s.result!.plays).toHaveLength(6)
  })
})
