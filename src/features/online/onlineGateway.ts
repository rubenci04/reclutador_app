import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureIdentity, getOnlineClient } from './supabaseClient'
import { isInviteCode, isUuid, ONLINE_ERRORS, OnlineError, parseOnlineName, parseSnapshot, validateCommand, type RoomCommand, type RoomSnapshot } from './contracts'

export type ConnectionStatus = 'connecting' | 'connected' | 'offline'
export interface OnlineGateway {
  authenticate(): Promise<string>
  create(name: string, actionId: string): Promise<RoomSnapshot>
  join(code: string, name: string, actionId: string): Promise<RoomSnapshot>
  snapshot(roomId: string): Promise<RoomSnapshot>
  command(command: RoomCommand): Promise<RoomSnapshot | null>
  watch(roomId: string, changed: () => void, status: (status: ConnectionStatus) => void): () => void
}
function backendError(error: { message: string }): OnlineError {
  return new OnlineError(ONLINE_ERRORS.find(code => code === error.message) ?? 'NETWORK_ERROR')
}
export function createOnlineGateway(client: SupabaseClient = getOnlineClient()): OnlineGateway {
  async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await client.rpc(name, args)
    if (error) throw backendError(error)
    return data
  }
  return {
    authenticate: () => ensureIdentity(client),
    async create(name, actionId) {
      if (!isUuid(actionId)) throw new OnlineError('INVALID_ACTION')
      return parseSnapshot(await rpc('online_create_room', { p_name: parseOnlineName(name), p_action_id: actionId }))
    },
    async join(code, name, actionId) {
      if (!isInviteCode(code) || !isUuid(actionId)) throw new OnlineError('INVALID_ACTION')
      return parseSnapshot(await rpc('online_join_room', { p_code: code, p_name: parseOnlineName(name), p_action_id: actionId }))
    },
    async snapshot(roomId) {
      if (!isUuid(roomId)) throw new OnlineError('INVALID_ACTION')
      return parseSnapshot(await rpc('online_snapshot', { p_room_id: roomId }))
    },
    async command(command) {
      validateCommand(command)
      const result = await rpc('online_command', { p_room_id: command.roomId, p_action_id: command.actionId, p_expected_version: command.expectedVersion, p_action_type: command.actionType, p_payload: command.payload })
      if (command.actionType === 'LEAVE' && result === null) return null
      return parseSnapshot(result)
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
