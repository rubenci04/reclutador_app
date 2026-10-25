import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { CLASSIC_ONLINE, OnlineError, type RoomCommand } from './contracts'
import { createOnlineGateway } from './onlineGateway'
import { ensureIdentity } from './supabaseClient'

describe('official Supabase transport boundaries', () => {
  it('deduplicates anonymous sign-in per client while independent clients retain independent identities', async () => {
    const auth = (id: string) => ({getSession:vi.fn(async () => ({data:{session:null},error:null})),signInAnonymously:vi.fn(async () => ({data:{user:{id}},error:null}))})
    const a = {auth:auth('identity-a')} as unknown as SupabaseClient
    const b = {auth:auth('identity-b')} as unknown as SupabaseClient
    const result = await Promise.all([ensureIdentity(a),ensureIdentity(a),ensureIdentity(b)])
    expect(result).toEqual(['identity-a','identity-a','identity-b'])
    expect(a.auth.signInAnonymously).toHaveBeenCalledOnce()
    expect(b.auth.signInAnonymously).toHaveBeenCalledOnce()
  })
  it('restores the authenticated identity without minting a replacement', async () => {
    const auth = {getSession:vi.fn(async () => ({data:{session:{user:{id:'existing'}}},error:null})),signInAnonymously:vi.fn()}
    expect(await ensureIdentity({auth} as unknown as SupabaseClient)).toBe('existing')
    expect(auth.signInAnonymously).not.toHaveBeenCalled()
  })
  it('never serializes a forged actorId and maps version errors for recovery', async () => {
    const rpc = vi.fn(async () => ({data:null,error:{message:'STALE_STATE'}}))
    const gateway = createOnlineGateway({rpc} as unknown as SupabaseClient)
    const command = {roomId:crypto.randomUUID(),actionId:crypto.randomUUID(),expectedVersion:8,actionType:'SET_READY',payload:{ready:true},actorId:'forged'} as RoomCommand
    await expect(gateway.command(command)).rejects.toEqual(new OnlineError('STALE_STATE'))
    expect(rpc).toHaveBeenCalledWith('online_command',{p_room_id:command.roomId,p_action_id:command.actionId,p_expected_version:8,p_action_type:'SET_READY',p_payload:{ready:true}})
  })
  it('authorizes a private receive-only channel, resyncs on subscribe and cleans up', async () => {
    let subscribed: (value: string) => void = () => {}
    let changed: () => void = () => {}
    const channel = {on:vi.fn((_type,_filter,callback) => {changed=callback; return channel}),subscribe:vi.fn(callback => {subscribed=callback; return channel})}
    const client = {channel:vi.fn(() => channel),realtime:{setAuth:vi.fn(async () => {})},removeChannel:vi.fn(async () => {})}
    const gateway = createOnlineGateway(client as unknown as SupabaseClient)
    const update = vi.fn(); const status = vi.fn()
    const stop = gateway.watch('room-id',update,status)
    await Promise.resolve()
    expect(client.channel).toHaveBeenCalledWith('room:room-id',{config:{private:true}})
    expect(client.realtime.setAuth).toHaveBeenCalledOnce()
    subscribed('SUBSCRIBED'); changed()
    expect(update).toHaveBeenCalledTimes(2)
    expect(status).toHaveBeenCalledWith('connected')
    stop(); changed(); expect(update).toHaveBeenCalledTimes(2)
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
  })
  it('rejects an unsupported economic configuration received from a server', async () => {
    const snapshot = {roomId:crypto.randomUUID(),hostId:crypto.randomUUID(),inviteCode:'a'.repeat(64),createdAt:new Date().toISOString(),expiresAt:new Date().toISOString(),deadlineAt:null,version:0,status:'WAITING',phase:'LOBBY',members:[],settings:{...CLASSIC_ONLINE,budget:200}}
    const gateway = createOnlineGateway({rpc:vi.fn(async () => ({data:snapshot,error:null}))} as unknown as SupabaseClient)
    await expect(gateway.snapshot(snapshot.roomId)).rejects.toEqual(new OnlineError('INVALID_ACTION'))
  })
  it('tosses the coin on the server and says so clearly when the migration is missing', async () => {
    const roomId = crypto.randomUUID(); const actionId = crypto.randomUUID()
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'Could not find the function public.online_flip_coin', code: 'PGRST202' } }))
    const gateway = createOnlineGateway({ rpc } as unknown as SupabaseClient)
    await expect(gateway.flipCoin(roomId, 3, 'heads', actionId)).rejects.toEqual(new OnlineError('BACKEND_OUTDATED'))
    expect(rpc).toHaveBeenCalledWith('online_flip_coin', { p_room_id: roomId, p_action_id: actionId, p_expected_version: 3, p_called_side: 'heads' })
    await expect(gateway.flipCoin(roomId, 3, 'edge' as 'heads', actionId)).rejects.toEqual(new OnlineError('INVALID_ACTION'))
  })
})
