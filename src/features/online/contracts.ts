import { nameLength, sanitizeName } from '../recruiter-duel/matchConfig'

export const ROOM_STATUSES = ['WAITING', 'READY', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] as const
export const ONLINE_PHASES = ['LOBBY', 'COIN_TOSS', 'AUCTION', 'TEAM_ORGANIZATION', 'STRATEGY_SELECTION', 'STRATEGY_REVEAL', 'SIMULATING', 'MATCH_RESULT'] as const
export const ONLINE_ERRORS = ['ROOM_NOT_FOUND', 'ROOM_FULL', 'NOT_ROOM_MEMBER', 'NOT_YOUR_TURN', 'INVALID_PHASE', 'STALE_STATE', 'ACTION_ALREADY_PROCESSED', 'INVALID_ACTION', 'ROOM_EXPIRED', 'AUTH_REQUIRED', 'NETWORK_ERROR', 'NOT_CONFIGURED', 'BACKEND_OUTDATED'] as const
export type OnlineErrorCode = typeof ONLINE_ERRORS[number]
export class OnlineError extends Error {
  constructor(readonly code: OnlineErrorCode) { super(code) }
}
export const CLASSIC_ONLINE = { mode: 'GLOBAL', budget: 100, starters: 11, substitutes: false, discards: 3, catalogVersion: 'global-150-3de32b4', rulesVersion: 'online-lobby-v1' } as const
export interface RoomMember { readonly userId: string; readonly name: string; readonly seat: 1 | 2; readonly ready: boolean }
export interface RoomSnapshot {
  readonly roomId: string
  readonly hostId: string
  readonly inviteCode: string
  readonly status: typeof ROOM_STATUSES[number]
  readonly phase: typeof ONLINE_PHASES[number]
  readonly version: number
  readonly createdAt: string
  readonly expiresAt: string
  readonly deadlineAt: string | null
  /** Server clock when the snapshot was taken; absent from servers without the turn-timer migration. */
  readonly serverNow?: string
  /** Device time (ms) when this snapshot was parsed; with serverNow it gives the offset between both clocks. */
  readonly receivedAt?: number
  readonly settings: typeof CLASSIC_ONLINE
  readonly members: readonly RoomMember[]
  /** The shared duel (a RecruiterDuelGame) once it started; an empty object before that. Validated by parseDuel. */
  readonly state?: unknown
  /** Name the host gave the room, shown to both people. */
  readonly roomName?: string | null
  /** Six characters that can be typed instead of the long invitation. */
  readonly shortCode?: string
  /** Which seats already picked a strategy; never what they picked. */
  readonly strategyReady?: { readonly '1': boolean; readonly '2': boolean }
}
export type LobbyAction = { readonly actionType: 'SET_READY'; readonly payload: { readonly ready: boolean } } | { readonly actionType: 'LEAVE' | 'START'; readonly payload: Record<string, never> }
// actorId is deliberately absent from the wire command: PostgreSQL derives it from auth.uid().
export type RoomCommand = LobbyAction & { readonly roomId: string; readonly actionId: string; readonly expectedVersion: number }
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
/** The long invitation (64 hex digits) or the six-character room code. */
export const isInviteCode = (value: unknown): value is string => typeof value === 'string' && (/^[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{6}$/i.test(value))
const isLongInvite = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
export function parseOnlineName(value: unknown): string {
  if (typeof value !== 'string') throw new OnlineError('INVALID_ACTION')
  const name = sanitizeName(value)
  if (!name || nameLength(name) > 24) throw new OnlineError('INVALID_ACTION')
  return name
}
export function validateCommand(command: RoomCommand): void {
  if (!isUuid(command.roomId) || !isUuid(command.actionId) || !Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 0) throw new OnlineError('INVALID_ACTION')
  const payload = command.payload
  if (!payload || Array.isArray(payload) || typeof payload !== 'object' || !(['SET_READY', 'LEAVE', 'START'] as string[]).includes(command.actionType)) throw new OnlineError('INVALID_ACTION')
  if (command.actionType === 'SET_READY' ? typeof payload.ready !== 'boolean' || Object.keys(payload).length !== 1 : Object.keys(payload).length !== 0) throw new OnlineError('INVALID_ACTION')
}
export function parseSnapshot(value: unknown): RoomSnapshot {
  if (!value || typeof value !== 'object') throw new OnlineError('INVALID_ACTION')
  const s = value as RoomSnapshot
  if (!isUuid(s.roomId) || !isUuid(s.hostId) || !isLongInvite(s.inviteCode) || !ROOM_STATUSES.includes(s.status) || !ONLINE_PHASES.includes(s.phase) || !Number.isSafeInteger(s.version) || s.version < 0 || !Number.isFinite(Date.parse(s.createdAt)) || !Number.isFinite(Date.parse(s.expiresAt)) || (s.deadlineAt !== null && !Number.isFinite(Date.parse(s.deadlineAt))) || (s.serverNow !== undefined && !Number.isFinite(Date.parse(s.serverNow)))) throw new OnlineError('INVALID_ACTION')
  if (!s.settings || Object.entries(CLASSIC_ONLINE).some(([key, v]) => s.settings[key as keyof typeof CLASSIC_ONLINE] !== v)) throw new OnlineError('INVALID_ACTION')
  if (!Array.isArray(s.members) || s.members.length < 1 || s.members.length > 2 || new Set(s.members.map(m => m.userId)).size !== s.members.length || new Set(s.members.map(m => m.seat)).size !== s.members.length || !s.members.some(m => m.userId === s.hostId && m.seat === 1)) throw new OnlineError('INVALID_ACTION')
  for (const member of s.members) if (!isUuid(member.userId) || ![1, 2].includes(member.seat) || typeof member.ready !== 'boolean' || parseOnlineName(member.name) !== member.name) throw new OnlineError('INVALID_ACTION')
  return s
}
