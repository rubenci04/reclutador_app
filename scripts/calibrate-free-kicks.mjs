import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { GLOBAL_CURRENT: catalog } = await vite.ssrLoadModule('/src/features/player-catalog/globalCollection.ts')
  const { liveInput } = await vite.ssrLoadModule('/src/features/local-match/interactive/liveFixtures.test-support.ts')
  const { createSession, advanceBlock, submitPlay } = await vite.ssrLoadModule('/src/features/local-match/interactive/session.ts')
  const { defaultPlayChoice, keepWindow, resolveQuietWindow } = await vite.ssrLoadModule('/src/features/local-match/interactive/liveModel.ts')
  const { visibleStats } = await vite.ssrLoadModule('/src/features/local-match/playback.ts')
  const profiles = JSON.parse(readFileSync('docs/qa/SIM-005R-04B-profiles.json', 'utf8')).results
  const must = (r) => { if (!r.ok) throw Error(r.error); return r.value }
  const real = (name) => { const p = profiles.find((p) => p.name === name); return { catalog, localLineup: p.lineups.local, cpuLineup: p.lineups.cpu, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', actionModel: 'action-v3', budget: 150, formations: { local: '4-3-3', cpu: '4-3-3' }, rosterBonus: true, tactics: { version: 'tactics-v1', local: 'WIDE_PLAY', cpu: 'LOW_BLOCK' } } }
  const reader = liveInput('reader'), readerInput = { ...reader, catalog: reader.catalog.map((p) => ({ ...p, overall_rating: 80, att_rating: 80, phy_rating: 80, def_rating: p.id.startsWith('live_local') && p.position === 'DEF' ? 99 : 80, men_rating: p.id.startsWith('live_local') && p.position === 'DEF' ? 99 : 80 })) }
  const setups = [{ id: 'real_balanced', input: real('balanced') }, { id: 'real_physical', input: real('physical_forward') }, { id: 'synthetic_readers', input: readerInput }]
  const policies = [{ id: 'R06-baseline', enabled: false }]
  for (const aim of ['FK_LEFT', 'FK_CENTER', 'FK_RIGHT']) for (const wall of ['WALL_JUMP', 'WALL_HOLD']) policies.push({ id: `${aim}/${wall}`, enabled: true, aim, wall, indirect: aim === 'FK_CENTER' ? 'FK_SHORT' : 'FK_CROSS', coverage: wall === 'WALL_JUMP' ? 'MAN_MARK' : 'ZONE' })
  const results = [], cases = new Map()
  for (const setup of setups) for (const policy of policies) {
    const totals = { moments: 0, opportunities: 0, contacts: 0, legal: 0, beaten: 0, fouls: 0, freeKicks: 0, offensive: 0, defensive: 0, direct: 0, indirect: 0, shots: 0, shotsOnTarget: 0, saves: 0, goals: 0, recoveries: 0, kickShots: 0, kickGoals: 0, kickSaves: 0, blocks: 0, headers: 0, crosses: 0, short: 0, repeatedFamilies: 0, familyTransitions: 0 }
    const options = {}, outcomes = {}, samples = 240
    for (let seed = 0; seed < samples; seed++) {
      const matchSeed = `free-kick-calibration:${setup.id}:${seed}`
      let s = must(createSession({ ...setup.input, seed: matchSeed }, { sessionId: 'free-kick-calibration', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, matchRules: { version: 'halftime-ovr-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, corners: { version: 'corners-v1' }, ...(policy.enabled ? { freeKicks: { version: 'free-kicks-v1' } } : {}) }))
      while (s.phase !== 'FINISHED') {
        if (s.phase === 'PLAY') {
          const p = s.kernel.partial.play, choice = p.node === 'FK_ATTACK' ? p.freeKick.zone === 'CENTRAL_OUTSIDE' ? policy.aim : policy.indirect : p.node === 'FK_DEFEND' ? p.freeKick.zone === 'CENTRAL_OUTSIDE' ? policy.wall : policy.coverage : p.node === 'FK_HEADER' || p.node === 'CORNER_HEADER' || p.node === 'HEADER' ? 'FAR_POST' : p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, s.kernel.input.catalog)
          if (p.freeKick) options[choice] = (options[choice] ?? 0) + 1
          s = must(submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice }))
        } else s = must(s.phase === 'WINDOW' ? s.window.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))
      }
      const events = s.kernel.blocks.flatMap((b) => b.events), count = (predicate) => events.filter(predicate).length
      if (count((e) => e.type === 'attack') !== 24 || s.kernel.director.selected.length > 3) throw Error('opportunity_or_cap_regression')
      const visible = visibleStats(events)
      for (const side of ['local', 'cpu']) {
        if (count((e) => e.type === 'goal' && e.side === side) !== s.kernel.score[side]) throw Error('score_mismatch')
        for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries']) if (visible[side][key] !== s.kernel.stats[side][key]) throw Error('stats_mismatch')
      }
      totals.moments += s.kernel.director.selected.length; totals.opportunities += 24
      totals.contacts += count((e) => ['FK_CONTACT_LEGAL', 'FK_CONTACT_BEATEN', 'FK_FOUL'].includes(e.step)); totals.legal += count((e) => e.step === 'FK_CONTACT_LEGAL'); totals.beaten += count((e) => e.step === 'FK_CONTACT_BEATEN'); totals.fouls += count((e) => e.step === 'FK_FOUL')
      for (const [step, key] of [['FK_AWARDED', 'freeKicks'], ['FK_SHOT', 'direct'], ['FK_CROSS', 'crosses'], ['FK_SHORT', 'short'], ['FK_HEADER_CONTACT', 'headers'], ['FK_BLOCK', 'blocks'], ['FK_SAVE', 'kickSaves'], ['FK_GOAL', 'kickGoals']]) totals[key] += count((e) => e.step === step)
      totals.direct -= count((e) => e.step === 'FK_SHOT' && e.freeKick.execution === 'SHORT'); totals.indirect += count((e) => e.step === 'FK_CROSS' || e.step === 'FK_SHORT')
      totals.shots += s.kernel.stats.local.shots + s.kernel.stats.cpu.shots; totals.shotsOnTarget += s.kernel.stats.local.shotsOnTarget + s.kernel.stats.cpu.shotsOnTarget
      totals.saves += count((e) => e.type === 'save'); totals.goals += count((e) => e.type === 'goal'); totals.recoveries += count((e) => e.type === 'recovery')
      totals.kickShots += count((e) => e.freeKick && ['shot', 'save', 'goal'].includes(e.type))
      const families = s.kernel.freeKicks?.families ?? s.kernel.corners.families
      for (let n = 1; n < families.length; n++) { totals.familyTransitions++; totals.repeatedFamilies += Number(families[n] === families[n - 1]) }
      for (const award of events.filter((e) => e.step === 'FK_AWARDED')) {
        totals[award.side === 'local' ? 'offensive' : 'defensive']++
        const group = events.filter((e) => e.freeKick?.id === award.freeKick.id), last = group.at(-1); outcomes[last.step] = (outcomes[last.step] ?? 0) + 1
        if (setup.id.startsWith('real')) {
          const fixture = { profile: setup.id, seed: matchSeed, playId: award.freeKick.id, side: award.side, zone: award.freeKick.zone, policy, ending: last.step }
          const labels = [award.side === 'local' ? 'offensive_foul' : 'defensive_foul', ...group.filter((e) => ['FK_SHOT', 'FK_WALL', 'FK_CROSS', 'FK_SHORT', 'FK_HEADER_CONTACT', 'FK_GOAL', 'FK_SAVE', 'FK_WIDE', 'FK_OVER', 'FK_BLOCK'].includes(e.step)).map((e) => e.step.toLowerCase())]
          for (const label of labels) if (!cases.has(label)) cases.set(label, { id: label, ...fixture })
        }
      }
    }
    const row = { profile: setup.id, policy, samples, totals, options, outcomes, perMatch: { moments: totals.moments / samples, goals: totals.goals / samples, fouls: totals.fouls / samples, shots: totals.shots / samples, freeKicks: totals.freeKicks / samples } }
    results.push(row); console.log(JSON.stringify({ profile: row.profile, policy: policy.id, perMatch: row.perMatch }))
  }
  writeFileSync('docs/qa/SIM-005R-07-calibration.json', JSON.stringify({ baseCommit: '64b9ac2', version: 'free-kicks-v1', matches: 5040, method: '3 profiles × (6 execution/defense policies + R06 baseline) × 240 seeds. Legal real GLOBAL_CURRENT elevens and explicit synthetic equal-OVR readers from R06. Same seeds, normal CROSS, FAR_POST headers, KEEP windows. Different sporting paths may change later main draws; not a perfect counterfactual. Block counts follow existing recovery semantics and do not add fictitious shots. No probability retuning.', results }, null, 2) + '\n')
  writeFileSync('docs/qa/SIM-005R-07-playtest-cases.json', JSON.stringify({ version: 'free-kicks-v1', cases: [...cases.values()] }, null, 2) + '\n')
} finally { await vite.close() }
