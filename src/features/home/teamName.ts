import { NAME_MAX_LENGTH, nameLength, sanitizeName } from '../recruiter-duel/matchConfig'
export const TEAM_NAME_KEY = 'reclutador.team-name.v1'
export type TeamNameError = 'empty' | 'tooLong'
export function validateTeamName(raw: string): { name: string; error: null } | { name: null; error: TeamNameError } {
  const name = sanitizeName(raw)
  return !name ? { name: null, error: 'empty' } : nameLength(name) > NAME_MAX_LENGTH ? { name: null, error: 'tooLong' } : { name, error: null }
}
export function readTeamName(storage: Pick<Storage, 'getItem'>): { name: string | null; warning: boolean } {
  try {
    const raw = storage.getItem(TEAM_NAME_KEY)
    if (raw === null) return { name: null, warning: false }
    const result = validateTeamName(raw)
    return { name: result.name, warning: result.error !== null }
  } catch { return { name: null, warning: true } }
}
export function saveTeamName(name: string, storage: Pick<Storage, 'setItem'>): boolean {
  const result = validateTeamName(name)
  if (!result.name) return false
  try { storage.setItem(TEAM_NAME_KEY, result.name); return true } catch { return false }
}
