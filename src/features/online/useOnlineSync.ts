import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { CoinSide, RecruiterDuelGame, RecruiterId } from '../recruiter-duel/auctionTypes'
import type { StrategyId } from '../tactics/strategies'
import { OnlineError, type OnlineErrorCode, type RoomSnapshot } from './contracts'
import type { OnlineGateway } from './onlineGateway'
import { parseDuel, slimDuel } from './onlineDuel'

const errorCode = (error: unknown): OnlineErrorCode => (error instanceof OnlineError ? error.code : 'NETWORK_ERROR')
type Intent = (current: RecruiterDuelGame) => RecruiterDuelGame

/**
 * The calls a running online duel needs. Every function is stable (it only changes with the gateway or the room), so the
 * duel page can use them in effects without restarting timers on each render.
 */
export function useOnlineSync(gateway: OnlineGateway | null, room: RoomSnapshot | null, setRoom: Dispatch<SetStateAction<RoomSnapshot | null>>, setError: (code: OnlineErrorCode | null) => void) {
  const roomRef = useRef<RoomSnapshot | null>(room)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const mounted = useRef(true)
  const roomId = room?.roomId ?? null
  useEffect(() => { roomRef.current = room }, [room])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const publish = useCallback((snapshot: RoomSnapshot) => {
    roomRef.current = snapshot
    if (mounted.current) setRoom(current => current && current.roomId === snapshot.roomId && current.version > snapshot.version ? current : snapshot)
  }, [setRoom])

  /** One shared-state change at a time. If someone else wrote first, the intent runs again on the newest state. */
  const apply = useCallback(async (intent: Intent) => {
    if (!gateway) return
    for (let attempt = 0; attempt < 5; attempt++) {
      const base = roomRef.current
      const current = base ? parseDuel(base.state) : null
      if (!base || !current) return
      const next = intent(current)
      if (next === current) return
      try {
        publish(await gateway.submitState(base.roomId, base.version, slimDuel(next), crypto.randomUUID()))
        return
      } catch (e) {
        const code = errorCode(e)
        if (['STALE_STATE', 'NOT_YOUR_TURN', 'INVALID_PHASE'].includes(code)) {
          try { publish(await gateway.snapshot(base.roomId)) } catch { return }
          continue
        }
        if (mounted.current) setError(code)
        return
      }
    }
  }, [gateway, publish, setError])
  const submit = useCallback((intent: Intent) => { queue.current = queue.current.then(() => apply(intent)) }, [apply])

  /** The coin is tossed by the server; a stale version is refreshed and tried again. */
  const flipCoin = useCallback(async (side: CoinSide) => {
    if (!gateway) return
    for (let attempt = 0; attempt < 3; attempt++) {
      const base = roomRef.current
      if (!base) return
      try { publish(await gateway.flipCoin(base.roomId, base.version, side, crypto.randomUUID())); setError(null); return }
      catch (e) {
        const code = errorCode(e)
        if (code === 'STALE_STATE' || code === 'INVALID_PHASE') {
          try { publish(await gateway.snapshot(base.roomId)) } catch { return }
          if (code === 'INVALID_PHASE') return
          continue
        }
        if (mounted.current) setError(code)
        return
      }
    }
  }, [gateway, publish, setError])
  const chooseStrategy = useCallback(async (strategy: StrategyId) => {
    if (!gateway || !roomId) return
    try { publish(await gateway.setStrategy(roomId, strategy)) } catch (e) { if (mounted.current) setError(errorCode(e)) }
  }, [gateway, roomId, publish, setError])
  const revealStrategies = useCallback(async () => {
    if (!gateway || !roomId) throw new OnlineError('INVALID_ACTION')
    return (await gateway.revealStrategies(roomId)) as Record<RecruiterId, StrategyId>
  }, [gateway, roomId])
  const forfeit = useCallback(() => {
    if (!gateway || !roomId) return
    void gateway.forfeit(roomId, crypto.randomUUID()).then(publish).catch(e => { if (mounted.current) setError(errorCode(e)) })
  }, [gateway, roomId, publish, setError])
  const claimTimeout = useCallback(() => {
    if (!gateway || !roomId) return
    void gateway.claimTimeout(roomId, crypto.randomUUID()).then(publish).catch(e => { if (mounted.current) setError(errorCode(e)) })
  }, [gateway, roomId, publish, setError])
  const clear = useCallback(() => { roomRef.current = null }, [])

  return { submit, publish, flipCoin, chooseStrategy, revealStrategies, forfeit, claimTimeout, clear }
}
