import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureIdentity, getOnlineClient } from './supabaseClient'
import { isInviteCode, isUuid, ONLINE_ERRORS, OnlineError, parseOnlineName, parseSnapshot, validateCommand, type RoomCommand, type RoomSnapshot } from './contracts'

export type ConnectionStatus = 'connecting' | 'connected' | 'offline'
export interface OnlineGateway {
  authenticate(): Promise<string>
  create(name: string, actionId: string, roomName?: string): Promise<RoomSnapshot>
  join(code: string, name: string, actionId: string): Promise<RoomSnapshot>
  snapshot(roomId: string): Promise<RoomSnapshot>
  command(command: RoomCommand): Promise<RoomSnapshot | null>
  /** Host only: stores the initial duel and moves the room to IN_PROGRESS. */
  startDuel(roomId: string, expectedVersion: number, state: unknown, actionId: string): Promise<RoomSnapshot>
  submitState(roomId: string, expectedVersion: number, state: unknown, actionId: string): Promise<RoomSnapshot>
  /** Recruiter one only: the server tosses the coin, so neither browser can know the result beforehand. */
  flipCoin(roomId: string, expectedVersion: number, calledSide: 'heads' | 'tails', actionId: string): Promise<RoomSnapshot>
  setStrategy(roomId: string, strategy: string): Promise<RoomSnapshot>
  revealStrategies(roomId: string): Promise<Record<'recruiter_one' | 'recruiter_two', string>>
  forfeit(roomId: string, actionId: string): Promise<RoomSnapshot>
  /** The server decides by its own clock: allowed only once the rival's deadline passed. The match ends like a forfeit by the one who did not answer. */
  claimTimeout(roomId: string, actionId: string): Promise<RoomSnapshot>
  /** Host: deletes the room. Guest: leaves it (not while a match is running). */
  closeRoom(roomId: string, actionId: string): Promise<void>
  watch(roomId: string, changed: () => void, status: (status: ConnectionStatus) => void): () => void
}
function backendError(error: { message: string; code?: string }): OnlineError {
  // PostgREST answers PGRST202 when a function does not exist: the database misses a migration.
  if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message)) return new OnlineError('BACKEND_OUTDATED')
  return new OnlineError(ONLINE_ERRORS.find(code => code === error.message) ?? 'NETWORK_ERROR')
}
/** A validated snapshot stamped with this device's time, so the countdown can use the server clock. */
const received = (value: unknown): RoomSnapshot => ({ ...parseSnapshot(value), receivedAt: Date.now() })
export function createOnlineGateway(client: SupabaseClient = getOnlineClient()): OnlineGateway {
  async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await client.rpc(name, args)
    if (error) throw backendError(error)
    return data
  }
  return {
    authenticate: () => ensureIdentity(client),
    async create(name, actionId, roomName) {
      if (!isUuid(actionId)) throw new OnlineError('INVALID_ACTION')
      const label = roomName?.trim() ? parseOnlineName(roomName) : null
      return received(await rpc('online_create_room', { p_name: parseOnlineName(name), p_action_id: actionId, p_room_name: label }))
    },
    async join(code, name, actionId) {
      if (!isInviteCode(code) || !isUuid(actionId)) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_join_room', { p_code: code.length === 6 ? code.toUpperCase() : code, p_name: parseOnlineName(name), p_action_id: actionId }))
    },
    async snapshot(roomId) {
      if (!isUuid(roomId)) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_snapshot', { p_room_id: roomId }))
    },
    async command(command) {
      validateCommand(command)
      const result = await rpc('online_command', { p_room_id: command.roomId, p_action_id: command.actionId, p_expected_version: command.expectedVersion, p_action_type: command.actionType, p_payload: command.payload })
      if (command.actionType === 'LEAVE' && result === null) return null
      return received(result)
    },
    async startDuel(roomId, expectedVersion, state, actionId) {
      if (!isUuid(roomId) || !isUuid(actionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_start_duel', { p_room_id: roomId, p_action_id: actionId, p_expected_version: expectedVersion, p_state: state }))
    },
    async submitState(roomId, expectedVersion, state, actionId) {
      if (!isUuid(roomId) || !isUuid(actionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_submit_state', { p_room_id: roomId, p_action_id: actionId, p_expected_version: expectedVersion, p_state: state }))
    },
    async flipCoin(roomId, expectedVersion, calledSide, actionId) {
      if (!isUuid(roomId) || !isUuid(actionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || (calledSide !== 'heads' && calledSide !== 'tails')) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_flip_coin', { p_room_id: roomId, p_action_id: actionId, p_expected_version: expectedVersion, p_called_side: calledSide }))
    },
    async setStrategy(roomId, strategy) {
      if (!isUuid(roomId)) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_set_strategy', { p_room_id: roomId, p_strategy: strategy }))
    },
    async revealStrategies(roomId) {
      if (!isUuid(roomId)) throw new OnlineError('INVALID_ACTION')
      const value = await rpc('online_reveal_strategies', { p_room_id: roomId }) as Record<string, unknown> | null
      if (!value || typeof value.recruiter_one !== 'string' || typeof value.recruiter_two !== 'string') throw new OnlineError('INVALID_ACTION')
      return { recruiter_one: value.recruiter_one, recruiter_two: value.recruiter_two }
    },
    async forfeit(roomId, actionId) {
      if (!isUuid(roomId) || !isUuid(actionId)) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_forfeit', { p_room_id: roomId, p_action_id: actionId }))
    },
    async claimTimeout(roomId, actionId) {
      if (!isUuid(roomId) || !isUuid(actionId)) throw new OnlineError('INVALID_ACTION')
      return received(await rpc('online_claim_timeout', { p_room_id: roomId, p_action_id: actionId }))
    },
    async closeRoom(roomId, actionId) {
      if (!isUuid(roomId) || !isUuid(actionId)) throw new OnlineError('INVALID_ACTION')
      await rpc('online_close_room', { p_room_id: roomId, p_action_id: actionId })
    },
    watch(roomId, changed, status) {
      let closed = false
      const channel = client.channel('room:' + roomId, { config: { private: true } })
      status('connecting')
      void client.realtime.setAuth().then(() => {
        if (closed) return
        channel.on('broadcast', { event: 'room_changed' }, () => { if (!closed) changed() })
          .subscribe(state => {
            if (closed) return
            if (state === 'SUBSCRIBED') { status('connected'); changed() }
            else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') status('offline')
          })
      }).catch(() => { if (!closed) status('offline') })
      return () => { closed = true; void client.removeChannel(channel) }
    },
  }
}

export function invitationUrl(code: string): string {
  const url = new URL(window.location.href)
  url.search = ''; url.hash = ''; url.searchParams.set('online', code)
  return url.toString()
}
/** Accepts the bare code or the whole invitation link pasted by the user. */
export function inviteFromText(text: string): string {
  const trimmed = text.trim()
  let code = trimmed
  try { code = new URL(trimmed).searchParams.get('online')?.trim() ?? trimmed } catch { /* not a link */ }
  return /^[0-9a-f]{6}$/i.test(code) ? code.toUpperCase() : code
}
export function invitationFromUrl(): string {
  return new URL(window.location.href).searchParams.get('online') ?? ''
}
const ROOM_STORAGE = 'reclutador.online-room-v1'
export function rememberRoom(userId: string, roomId: string | null): void {
  try {
    if (roomId) localStorage.setItem(ROOM_STORAGE, JSON.stringify({ userId, roomId }))
    else localStorage.removeItem(ROOM_STORAGE)
  } catch { /* Recovery by the invitation remains available when storage is blocked. */ }
}
export function readRememberedRoom(userId: string): string | null {
  try {
    const value = JSON.parse(localStorage.getItem(ROOM_STORAGE) ?? 'null') as { userId?: string; roomId?: string } | null
    return value?.userId === userId && isUuid(value.roomId) ? value.roomId : null
  } catch { return null }
}
