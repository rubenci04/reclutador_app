import { BATCH_IDS, BATCH_SIZE, CATALOG_REFERENCE_DATE, CATALOG_SIZE, CATALOG_VERSION, getBatchCategory } from '../../data/catalogRules'
import type { BatchDefinition, BatchId, CatalogManifest, CatalogValidation, Player, ValidationIssue } from '../../types/player'
import { validateBatch, validateCatalog, validateVersionedCatalog } from './validateCatalog'
import { validatePlayer } from './validatePlayer'

export interface CatalogAssembly {
  readonly status: 'partial' | 'complete' | 'invalid'
  readonly players: readonly Player[]
  readonly issues: readonly ValidationIssue[]
  readonly batchReports: Readonly<Partial<Record<BatchId, CatalogValidation>>>
  readonly fullReport: CatalogValidation
}

export function validateManifest(input: unknown): input is CatalogManifest {
  if (typeof input !== 'object' || input === null) return false
  const record = input as Record<string, unknown>
  if (record.version !== CATALOG_VERSION || record.referenceDate !== CATALOG_REFERENCE_DATE || record.expectedTotal !== CATALOG_SIZE || !Array.isArray(record.batches) || record.batches.length !== BATCH_IDS.length) return false
  const seen = new Set<string>()
  for (const entry of record.batches as unknown[]) {
    if (typeof entry !== 'object' || entry === null) return false
    const batch = entry as Record<string, unknown>
    if (!BATCH_IDS.includes(batch.id as BatchId) || seen.has(batch.id as string) || batch.category !== getBatchCategory(batch.id as BatchId) || batch.expectedCount !== BATCH_SIZE || !['implemented', 'pending'].includes(batch.status as string)) return false
    seen.add(batch.id as string)
  }
  return true
}

/** Canonical batch + player ordering, independent of object/import insertion order. */
export function assembleCatalog(manifestInput: unknown, data: Readonly<Record<string, unknown>>): CatalogAssembly {
  if (!validateManifest(manifestInput)) {
    return { status: 'invalid', players: [], issues: [{ code: 'invalid_manifest' }], batchReports: {}, fullReport: validateCatalog([]) }
  }
  const manifest = manifestInput
  const issues: ValidationIssue[] = []
  const players: Player[] = []
  const rawPlayers: unknown[] = []
  const batchReports: Partial<Record<BatchId, CatalogValidation>> = {}
  const entries = new Map<BatchId, BatchDefinition>(manifest.batches.map((batch) => [batch.id, batch]))
  for (const id of Object.keys(data)) {
    if (!BATCH_IDS.includes(id as BatchId)) issues.push({ code: 'unexpected_batch', batchId: id })
  }
  for (const id of BATCH_IDS) {
    const definition = entries.get(id)!
    const supplied = Object.hasOwn(data, id)
    if ((definition.status === 'implemented') !== supplied) {
      issues.push({ code: 'batch_state_mismatch', batchId: id, expected: definition.status, actual: supplied ? 'supplied' : 'missing' })
    }
    if (!supplied) continue
    const report = validateBatch(data[id], id)
    batchReports[id] = report
    issues.push(...report.issues.map((issue) => ({ ...issue, batchId: id })))
    if (!Array.isArray(data[id])) continue
    // Preserve invalid rows for full validation, so errors cannot disappear silently.
    for (const record of data[id] as unknown[]) {
      rawPlayers.push(record)
      const result = validatePlayer(record)
      if (result.valid) players.push(result.player)
    }
  }
  players.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const fullReport = validateVersionedCatalog({ version: manifest.version, players: rawPlayers })
  issues.push(...fullReport.issues.filter((issue) => issue.code === 'duplicate_id' || issue.code === 'duplicate_player'))
  const allImplemented = manifest.batches.every((batch) => batch.status === 'implemented')
  const status = issues.length ? 'invalid' : allImplemented && fullReport.valid ? 'complete' : allImplemented ? 'invalid' : 'partial'
  if (allImplemented && !fullReport.valid) issues.push(...fullReport.issues)
  return { status, players, issues, batchReports, fullReport }
}
