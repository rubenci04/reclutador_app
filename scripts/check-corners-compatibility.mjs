import { createHash, webcrypto } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { createServer } from 'vite'
const baseCommit = '56ac3c6'
const workspace = resolve(process.cwd()), prefix = join(workspace, '.sim06-previous-'), folder = mkdtempSync(prefix)
function removeTemporarySource() {
  // Verify the resolved absolute target remains in this workspace before recursive removal.
  if (!resolve(folder).startsWith(prefix) || resolve(folder) === workspace) throw Error('unsafe_temporary_cleanup_path')
  rmSync(folder, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
}
const vite = await createServer({ root: workspace, configFile: false, server: { middlewareMode: true }, appType: 'custom' })
try {
  writeFileSync(join(folder, 'source.tar'), execFileSync('git', ['archive', '--format=tar', baseCommit, 'src'], { maxBuffer: 32 * 1024 * 1024 }))
  execFileSync('tar', ['-xf', join(folder, 'source.tar'), '-C', folder])
  const oldPrefix = `/${basename(folder)}/src/features/local-match/interactive/`
  const previous = await vite.ssrLoadModule(oldPrefix + 'session.ts'), current = await vite.ssrLoadModule('/src/features/local-match/interactive/session.ts')
  const oldFixture = await vite.ssrLoadModule(oldPrefix + 'liveFixtures.test-support.ts')
  const oldLive = await vite.ssrLoadModule(oldPrefix + 'liveModel.ts'), newLive = await vite.ssrLoadModule('/src/features/local-match/interactive/liveModel.ts')
  const must = (r) => { if (!r.ok) throw Error(r.error); return r.value }
  const hash = (s) => createHash('sha256').update(JSON.stringify(s)).digest('hex')
  const run = (api, live, origin) => { let s = origin; while (s.phase !== 'FINISHED') { if (s.phase === 'PLAY') { const p = s.kernel.partial.play; s = must(api.submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice: p.node === 'DEFEND' ? 'INTERCEPT' : p.node === 'FINISH' ? 'CROSS' : p.node === 'HEADER' ? 'FAR_POST' : p.options.find((o) => o.available).choice })) } else s = must(s.phase === 'WINDOW' ? live.keepWindow(s) : api.advanceBlock(s)) } return s }
  const fingerprints = []; let restored = 0
  for (const mode of ['batch', 'attack-tree-v1', 'directed-header-v1', 'halftime-ovr-v1']) for (let seed = 0; seed < 60; seed++) {
    const input = oldFixture.liveInput(`corner-compat:${mode}:${seed}`), options = { sessionId: 'corner-compat', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, ...(mode === 'attack-tree-v1' ? { attackTree: { version: 'attack-tree-v1' } } : mode !== 'batch' ? { moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, ...(mode === 'halftime-ovr-v1' ? { matchRules: { version: 'halftime-ovr-v1' } } : {}) } : {}) }
    const before = run(previous, oldLive, must(previous.createSession(input, options))), after = run(current, newLive, must(current.createSession(input, options)))
    const originalHash = hash(before), currentHash = hash(after)
    if (originalHash !== currentHash) throw Error(`historical_session_mismatch:${mode}:${seed}`)
    if (seed < 3) { const checkpoint = await previous.checkpointSession(before, webcrypto.subtle); if (hash(must(await current.restoreSession(checkpoint.snapshot, checkpoint.authority, webcrypto.subtle))) !== originalHash) throw Error('old_checkpoint_rejected'); restored++ }
    fingerprints.push({ mode, seed, sha256: originalHash })
  }
  writeFileSync('docs/qa/SIM-005R-06-compatibility.json', JSON.stringify({ baseCommit, method: 'Independent source extracted from git archive 56ac3c6 before comparing. SHA-256 covers the complete serialized Session, not only the score. No golden updates.', sessions: fingerprints.length, oldFinalCheckpointsRestored: restored, fingerprints }, null, 2) + '\n')
  console.log(JSON.stringify({ identicalSessions: fingerprints.length, oldFinalCheckpointsRestored: restored }))
} finally {
  await vite.close()
  removeTemporarySource()
}
