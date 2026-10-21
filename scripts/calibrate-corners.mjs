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
  const reader = liveInput('reader'); const readerInput = { ...reader, catalog: reader.catalog.map((p) => ({ ...p, overall_rating: 80, att_rating: 80, phy_rating: 80, def_rating: p.id.startsWith('live_local') && p.position === 'DEF' ? 99 : 80, men_rating: p.id.startsWith('live_local') && p.position === 'DEF' ? 99 : 80 })) }
  const setups = [{ id: 'real_balanced', input: real('balanced') }, { id: 'real_physical', input: real('physical_forward') }, { id: 'synthetic_readers', input: readerInput }]
  const policies = [{ attack: 'CORNER_NEAR', defense: 'MAN_MARK', enabled: false }]
  for (const attack of ['CORNER_NEAR', 'CORNER_FAR', 'CORNER_SHORT']) for (const defense of ['MAN_MARK', 'ZONE']) policies.push({ attack, defense, enabled: true })
  const results = [], cases = new Map()
  for (const setup of setups) for (const policy of policies) {
    console.log(setup.id, policy.enabled ? policy.attack + '/' + policy.defense : 'r05-baseline')
    const totals = { moments: 0, opportunities: 0, corners: 0, offensive: 0, defensive: 0, centers: 0, delivered: 0, shortPasses: 0, shortReceived: 0, duels: 0, duelsWon: 0, zones: 0, zoneRecoveries: 0, headers: 0, shots: 0, goals: 0, saves: 0, recoveries: 0, offensiveCornerGoals: 0, defensiveCornerGoals: 0, cornerShots: 0, cornerSaves: 0, cornerRecoveries: 0, repeatFamilies: 0, transitions: 0, noCornerGames: 0, defensiveClearances: 0, defensiveDuelAttempts: 0, defensiveDuelRecoveries: 0, defensiveZoneAttempts: 0, defensiveZoneRecoveries: 0 }
    const outcomes = {}, causes = {}, samples = 240
    for (let seed = 0; seed < samples; seed++) {
      const matchSeed = `corner-calibration:${setup.id}:${seed}`
      let s = must(createSession({ ...setup.input, seed: matchSeed }, { sessionId: 'corner-calibration', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, matchRules: { version: 'halftime-ovr-v1' }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, ...(policy.enabled ? { corners: { version: 'corners-v1' } } : {}) }))
      for (let guard = 0; s.phase !== 'FINISHED' && guard < 100; guard++) {
        if (s.phase === 'PLAY') { const p = s.kernel.partial.play, choice = p.node === 'CORNER_ATTACK' ? policy.attack : p.node === 'CORNER_DEFEND' ? policy.defense : p.node === 'CORNER_HEADER' ? 'FAR_POST' : p.node === 'FINISH' ? 'CROSS' : defaultPlayChoice(p, s.kernel.input.catalog); s = must(submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice })) }
        else s = must(s.phase === 'WINDOW' ? s.window.applyBlock === 3 ? keepWindow(s) : resolveQuietWindow(s) : advanceBlock(s))
      }
      if (s.phase !== 'FINISHED') throw Error('unfinished_corner_match')
      const events = s.kernel.blocks.flatMap((b) => b.events), count = (pred) => events.filter(pred).length, awards = events.filter((e) => e.step === 'CORNER_AWARDED')
      if (count((e) => e.type === 'attack') !== 24) throw Error('extra_opportunity')
      const visible = visibleStats(events)
      for (const side of ['local', 'cpu']) { if (count((e) => e.type === 'goal' && e.side === side) !== s.kernel.score[side]) throw Error('score_mismatch'); for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries']) if (visible[side][key] !== s.kernel.stats[side][key]) throw Error('stats_mismatch') }
      totals.moments += s.kernel.director.selected.length; totals.opportunities += 24; totals.corners += awards.length; totals.offensive += awards.filter((e) => e.side === 'local').length; totals.defensive += awards.filter((e) => e.side === 'cpu').length; totals.noCornerGames += Number(!awards.length)
      for (const [type, key] of [['goal', 'goals'], ['save', 'saves'], ['recovery', 'recoveries']]) totals[key] += count((e) => e.type === type)
      totals.shots += s.kernel.stats.local.shots + s.kernel.stats.cpu.shots
      const families = s.kernel.corners?.families ?? []; for (let i = 1; i < families.length; i++) { totals.transitions++; totals.repeatFamilies += Number(families[i] === families[i - 1]) }
      for (const award of awards) {
        const group = events.filter((e) => e.corner?.id === award.corner.id), last = group.at(-1), body = group.slice(2)
        outcomes[last.step] = (outcomes[last.step] ?? 0) + 1; causes[award.corner.cause] = (causes[award.corner.cause] ?? 0) + 1
        totals.offensiveCornerGoals += body.filter((e) => e.type === 'goal' && e.side === 'local').length; totals.defensiveCornerGoals += body.filter((e) => e.type === 'goal' && e.side === 'cpu').length
        totals.cornerShots += body.filter((e) => e.type === 'shot' || e.type === 'goal' || e.type === 'save').length; totals.cornerSaves += body.filter((e) => e.type === 'save').length; totals.cornerRecoveries += body.filter((e) => e.type === 'recovery').length; if (award.side === 'cpu') totals.defensiveClearances += body.filter((e) => e.step === 'CORNER_CLEAR').length; totals.headers += body.filter((e) => e.step === 'CORNER_CONTACT').length
        for (let n = 0; n < body.length; n++) {
          const e = body[n], next = body[n + 1]
          if (e.step === 'CORNER_DELIVERY') { totals.centers++; totals.delivered += Number(['CORNER_CONTEST', 'CORNER_ZONE'].includes(next?.step)) }
          if (e.step === 'CORNER_RUNUP' && e.corner.delivery === 'CORNER_SHORT') totals.shortPasses++
          if (e.step === 'CORNER_SHORT_PASS') totals.shortReceived++
          if (e.step === 'CORNER_CONTEST') { if (award.side === 'cpu') { totals.defensiveDuelAttempts++; totals.defensiveDuelRecoveries += Number(next?.step === 'CORNER_CLEAR') } totals.duels++; totals.duelsWon += Number(['CORNER_WON', 'CORNER_SHORT_ADVANCE'].includes(next?.step)) }
          if (e.step === 'CORNER_ZONE') { if (award.side === 'cpu') { totals.defensiveZoneAttempts++; totals.defensiveZoneRecoveries += Number(next?.step === 'CORNER_CLEAR') } totals.zones++; totals.zoneRecoveries += Number(next?.step === 'CORNER_CLEAR') }
        }
        if (setup.id !== 'synthetic_readers') {
          const fixture = { profile: setup.id, seed: matchSeed, playId: award.corner.id, side: award.side, attack: policy.attack, defense: policy.defense, direction: 'FAR_POST', ending: last.step }
          const key = award.side === 'local' && policy.attack === 'CORNER_SHORT' && body.some((e) => e.step === 'CORNER_SHORT_ADVANCE') ? 'offensive_short' : award.side === 'local' && policy.attack === 'CORNER_FAR' && body.some((e) => e.step === 'CORNER_CONTACT') ? 'offensive_far_header' : award.side === 'local' && last.step === 'CORNER_GOAL' ? 'offensive_goal' : award.side === 'cpu' && last.step === 'CORNER_GOAL' ? 'defensive_goal' : award.side === 'cpu' && last.step === 'CORNER_SAVE' ? 'defensive_save' : award.side === 'local' && last.step === 'CORNER_SAVE' ? 'offensive_save' : last.step === 'CORNER_CLEAR' ? 'clearance' : award.side === 'cpu' && last.step === 'CORNER_EXIT' ? 'defensive_exit' : null
          if (key && !cases.has(key)) cases.set(key, { id: key, ...fixture })
        }
      }
    }
    results.push({ profile: setup.id, policy, samples, totals, outcomes, causes, perMatch: { moments: totals.moments / samples, goals: totals.goals / samples, corners: totals.corners / samples, shots: totals.shots / samples, recoveries: totals.recoveries / samples }, rates: { delivery: totals.centers ? totals.delivered / totals.centers : null, duelAttackWin: totals.duels ? totals.duelsWon / totals.duels : null, zoneRecovery: totals.zones ? totals.zoneRecoveries / totals.zones : null, offensiveGoal: totals.offensive ? totals.offensiveCornerGoals / totals.offensive : null, concededGoal: totals.defensive ? totals.defensiveCornerGoals / totals.defensive : null } })
  }
  writeFileSync('docs/qa/SIM-005R-06-calibration.json', JSON.stringify({ baseCommit: '56ac3c6', version: 'corners-v1', method: '240 seeds per policy; 3 profiles × (6 corner policies + R05 baseline) = 5,040 full matches. Same input/seed prefix, normal CROSS, defence INTERCEPT, FAR_POST header, KEEP windows. Real profiles reuse R04B legal GLOBAL_CURRENT elevens; synthetic_readers is an explicitly artificial equal-OVR 80 setup with local DEF/MEN 99 defenders. Once sporting outcomes differ, subsequent main draws need not be counterfactual identical. Corner shots/saves/recoveries exclude the conceding precursor; full-match totals include it.', profiles: setups.map(({ id, input }) => ({ id, input: { ...input, catalog: id === 'synthetic_readers' ? input.catalog : 'GLOBAL_CURRENT' } })), results }, null, 2) + '\n')
  writeFileSync('docs/qa/SIM-005R-06-playtest-cases.json', JSON.stringify({ version: 'corners-v1', cases: [...cases.values()] }, null, 2) + '\n')
  console.log(JSON.stringify(results.map(({ profile, policy, perMatch, rates }) => ({ profile, policy, perMatch, rates })), null, 2))
} finally { await vite.close() }
