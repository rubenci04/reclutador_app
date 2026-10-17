// Local audit entry point. Transpilation only; npm run typecheck performs strict checking.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}
const { loadCatalogV1 } = require('../src/data/catalog_v1/index.ts')
const manifest = require('../src/data/catalog_v1/manifest.json')
const result = loadCatalogV1()
const summary = {
  version: manifest.version, referenceDate: manifest.referenceDate, expectedTotal: manifest.expectedTotal,
  implementedTotal: result.players.length, assemblyStatus: result.status,
  partialValid: result.status !== 'invalid',
  batches: Object.fromEntries(Object.entries(result.batchReports).map(([id, report]) => [id, {
    mode: report.mode, status: report.status, count: report.validPlayerCount,
    positions: report.positionCounts, tiers: report.tierCounts, issues: report.issues,
  }])),
  categories: result.fullReport.categoryCounts,
  positions: result.fullReport.positionCounts,
  tiers: result.fullReport.tierCounts,
  globalStatus: result.fullReport.status,
  globalValid: result.fullReport.valid,
  missingIds: result.fullReport.issues.filter((issue) => issue.code === 'missing_id').length,
  globalEconomy: result.fullReport.economy,
  cpuSelection: 'pending',
  issues: result.issues,
}
const destination = path.resolve(__dirname, '../docs/qa/CODEX-003B-catalog-audit.json')
fs.writeFileSync(destination, JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify(summary, null, 2))
// Zero means the available batches are consistent, never that an incomplete catalog passed.
process.exitCode = result.status === 'invalid' || (process.argv.includes('--complete') && result.status !== 'complete') ? 1 : 0
