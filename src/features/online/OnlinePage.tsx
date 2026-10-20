import { ModeSelector } from '../themed-modes/ModeSelector'
import { CATEGORY_GROUPS } from '../themed-modes/categoryTree'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { matchHistory } from '../history/matchHistory'
import { NoticeToasts } from '../recruiter-duel/NoticeToasts'
import { useToasts } from '../recruiter-duel/useToasts'
import { AuctionPage } from '../recruiter-duel/AuctionPage'
import type { OnlineDuelBinding } from '../recruiter-duel/onlineBinding'
import { buildInitialDuel, forfeitOf, onlineHistoryEntry, otherSide, parseDuel, seatSide, slimDuel } from './onlineDuel'
import { useOnlineSync } from './useOnlineSync'
import { OnlineError, type LobbyAction, type OnlineErrorCode, type RoomSnapshot } from './contracts'
import { createOnlineGateway, inviteFromText, invitationFromUrl, invitationUrl, readRememberedRoom, rememberRoom, type ConnectionStatus, type OnlineGateway } from './onlineGateway'
import './online.css'

const errorCode = (error: unknown): OnlineErrorCode => error instanceof OnlineError ? error.code : 'NETWORK_ERROR'
export function OnlinePage({ onBack, gateway: provided }: { readonly onBack: () => void; readonly gateway?: OnlineGateway }) {
  const { t, i18n } = useTranslation()
  const [gateway] = useState(() => { try { return provided ?? createOnlineGateway() } catch { return null } })
  const [userId, setUserId] = useState<string | null>(null)
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [name, setName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [category, setCategory] = useState<ThemedModeId>('GLOBAL_CLASSIC')
  const [opponentCategory, setOpponentCategory] = useState<ThemedModeId | 'same'>('same')
  const { notices, push, dismiss } = useToasts()
  const known = useRef<{ roomId: string; members: Map<string, { name: string; ready: boolean }> } | null>(null)
  const [code, setCode] = useState(invitationFromUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<OnlineErrorCode | null>(gateway ? null : 'NOT_CONFIGURED')
  const [connection, setConnection] = useState<ConnectionStatus>('connecting')
  const [copied, setCopied] = useState(false)
  const [closedNotice, setClosedNotice] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [retry, setRetry] = useState<(() => Promise<RoomSnapshot | null>) | null>(null)
  const mounted = useRef(true)
  const operation = useRef(false)
  const roomId = room?.roomId
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!gateway) return
    let cancelled = false
    void (async () => {
      try {
        const id = await gateway.authenticate()
        if (cancelled) return
        const remembered = readRememberedRoom(id)
        // An explicit invitation wins over a remembered room; joining still verifies identity.
        if (remembered && !invitationFromUrl()) {
          try {
            const snapshot = await gateway.snapshot(remembered)
            if (!cancelled) setRoom(snapshot)
          } catch (e) {
            if (!cancelled) {
              setError(errorCode(e))
              if (['NOT_ROOM_MEMBER','ROOM_EXPIRED','ROOM_NOT_FOUND'].includes(errorCode(e))) rememberRoom(id,null)
            }
          }
        }
        if (!cancelled) setUserId(id)
      } catch (e) { if (!cancelled) setError(errorCode(e)) }
    })()
    return () => { cancelled = true }
  }, [gateway])
  useEffect(() => {
    if (!gateway || !roomId) return
    let cancelled = false
    let syncing = false
    let again = false
    const sync = async () => {
      if (syncing) { again = true; return }
      syncing = true
      do {
        again = false
        try {
          const next = await gateway.snapshot(roomId)
          if (!cancelled) {
            setRoom(current => current?.roomId === next.roomId && current.version <= next.version ? next : current)
            setError(current => current === 'NETWORK_ERROR' || current === 'STALE_STATE' ? null : current)
          }
        } catch (e) {
          if (!cancelled) {
            const code = errorCode(e)
            // The host deleted the room while we were looking at it: go back to the menu and say so.
            if (code === 'ROOM_NOT_FOUND' || code === 'NOT_ROOM_MEMBER') { if (userId) rememberRoom(userId, null); setRoom(null); setClosedNotice(true); return }
            setError(code); setConnection('offline')
          }
        }
      } while (again && !cancelled)
      syncing = false
    }
    const resync = () => { if (!cancelled) void sync() }
    const stop = gateway.watch(roomId, resync, status => { if (!cancelled) setConnection(status) })
    resync()
    const poll = window.setInterval(resync, 4000)
    window.addEventListener('online', resync)
    window.addEventListener('focus', resync)
    document.addEventListener('visibilitychange', resync)
    return () => {
      cancelled = true; stop(); window.clearInterval(poll)
      window.removeEventListener('online', resync); window.removeEventListener('focus', resync)
      document.removeEventListener('visibilitychange', resync)
    }
  }, [gateway, roomId, userId])

  async function run(action: () => Promise<RoomSnapshot | null>) {
    if (operation.current || !gateway || !userId) return
    operation.current = true; setBusy(true); setError(null); setRetry(null)
    try {
      const next = await action()
      if (!mounted.current) return
      setRoom(current => next && current?.roomId === next.roomId && current.version > next.version ? current : next)
      rememberRoom(userId,next?.roomId ?? null)
      if (!next) {
        const url = new URL(window.location.href); url.searchParams.delete('online'); window.history.replaceState(null,'',url)
        setCode('')
      }
    } catch (e) {
      if (!mounted.current) return
      const issue = errorCode(e); setError(issue)
      // Preserve the exact actionId, payload and expectedVersion on uncertain transport results.
      if (issue === 'NETWORK_ERROR') setRetry(() => action)
      if (issue === 'STALE_STATE' && room) {
        try {
          const latest = await gateway.snapshot(room.roomId)
          if (mounted.current) setRoom(current => current?.roomId === latest.roomId && current.version <= latest.version ? latest : current)
        } catch { /* Keep the visible error; background recovery also retries. */ }
      }
    } finally { operation.current = false; if (mounted.current) setBusy(false) }
  }
  function send(action: LobbyAction) {
    if (!room || !gateway) return
    const command = { ...action, roomId: room.roomId, expectedVersion: room.version, actionId: crypto.randomUUID() }
    void run(() => gateway.command(command))
  }
  async function copy() {
    if (!room) return
    try { await navigator.clipboard.writeText(invitationUrl(room.inviteCode)); setCopied(true); setCopyFailed(false) }
    catch { setCopied(false); setCopyFailed(true) }
  }
  const own = room?.members.find(member => member.userId === userId)
  // Tell the person when the other one enters, gets ready or leaves.
  useEffect(() => {
    if (!room) { known.current = null; return }
    const now = new Map(room.members.map(member => [member.userId, { name: member.name, ready: member.ready }]))
    const before = known.current
    known.current = { roomId: room.roomId, members: now }
    if (!before || before.roomId !== room.roomId) return
    for (const [id, member] of now) {
      const earlier = before.members.get(id)
      if (id === userId) continue
      if (!earlier) push('success', t('online.notice.joined', { name: member.name }))
      else if (earlier.ready !== member.ready) push('info', t(member.ready ? 'online.notice.ready' : 'online.notice.unready', { name: member.name }))
    }
    for (const [id, member] of before.members) if (!now.has(id)) push('warning', t('online.notice.left', { name: member.name }))
  }, [room, userId, push, t])
  const lobbyOpen = room?.status === 'WAITING' || room?.status === 'READY'
  const mySide = own ? seatSide(own.seat) : null
  const duel = room && (room.status === 'IN_PROGRESS' || room.status === 'FINISHED') ? parseDuel(room.state) : null
  const forfeitBy = room ? forfeitOf(room.state) : null
  // The result is stored on this browser once it is known (a match result, or the rival giving up).
  useEffect(() => {
    if (!duel || !mySide) return
    if (!forfeitBy && !(duel.matchResult && ['SIMULATING', 'MATCH_RESULT'].includes(duel.phase))) return
    const entry = onlineHistoryEntry(duel, mySide, forfeitBy)
    if (entry) matchHistory.record(entry)
  }, [duel, mySide, forfeitBy])

  const sync = useOnlineSync(gateway, room, setRoom, setError)
  const { clear: clearSync } = sync
  const exit = useCallback(() => {
    if (userId) rememberRoom(userId, null)
    // The host cleans up a room whose game is over; nobody can use it any more.
    if (gateway && room && room.hostId === userId && (forfeitBy || duel?.matchResult)) void gateway.closeRoom(room.roomId, crypto.randomUUID()).catch(() => undefined)
    clearSync(); setRoom(null)
    const url = new URL(window.location.href); url.searchParams.delete('online'); window.history.replaceState(null, '', url)
    setCode('')
  }, [userId, clearSync, gateway, room, forfeitBy, duel])
  function startDuel() {
    if (!room || !gateway || room.hostId !== userId) return
    const host = room.members.find(m => m.seat === 1)?.name ?? ''
    let guest = room.members.find(m => m.seat === 2)?.name ?? ''
    if (guest === host) guest = (guest + ' (2)').slice(0, 24)
    let initial
    try { initial = buildInitialDuel({ host, guest }, category, opponentCategory === 'same' ? category : opponentCategory) } catch { setError('INVALID_ACTION'); return }
    const id = crypto.randomUUID(); const version = room.version; const roomIdValue = room.roomId
    void run(() => gateway.startDuel(roomIdValue, version, slimDuel(initial), id))
  }
  const binding: OnlineDuelBinding | null = duel && mySide && room && gateway ? {
    game: duel, mySide, submit: sync.submit,
    strategyReady: { recruiter_one: !!room.strategyReady?.['1'], recruiter_two: !!room.strategyReady?.['2'] },
    chooseStrategy: sync.chooseStrategy, revealStrategies: sync.revealStrategies, forfeit: sync.forfeit,
    exit, connection, busy,
  } : null
  if (binding && duel && !forfeitBy) return <AuctionPage online={binding} onDraftFree={exit} />
  if (binding && duel && forfeitBy) {
    const names = { recruiter_one: duel.config?.names.recruiter_one ?? '', recruiter_two: duel.config?.names.recruiter_two ?? '' }
    return <div className="draft-app online-shell">
      <header className="draft-header"><span className="brand">Reclutador</span><LanguageSelector /></header>
      <main className="online-main"><section className="online-card" role="status">
        <h1>{t('online.duel.forfeitTitle')}</h1>
        <p>{t('online.duel.forfeitBody', { loser: names[forfeitBy], winner: names[otherSide(forfeitBy)] })}</p>
        <p><strong>{forfeitBy === binding.mySide ? t('online.duel.youLost') : t('online.duel.youWon')}</strong></p>
        <button className="primary-action" onClick={exit}>{t('online.back')}</button>
      </section></main>
    </div>
  }
  return <div className="draft-app online-shell">
    <header className="draft-header"><span className="brand">Reclutador</span><LanguageSelector /></header>
    <main className="online-main">
      <button className="secondary-action" onClick={onBack} disabled={busy}>{t('online.back')}</button>
      <p className="eyebrow">{t('online.eyebrow')}</p><h1>{t('online.title')}</h1>
      <details className="entry-options"><summary>{t('entry.rules')}</summary><p>{t('online.sessionNotice')}</p></details>
      {error && <p role="alert">{t('online.errors.' + error)}{error === 'NOT_CONFIGURED' && import.meta.env.DEV && <><br />{t('online.configHelp')}</>}</p>}
      {retry && <button className="primary-action" disabled={busy} onClick={() => { void run(retry) }}>{t('online.retry')}</button>}
      {closedNotice && !room && <p className="auction-banner auction-banner-blocked" role="status"><strong>{t('online.roomClosed')}</strong></p>}
      {!room && invitationFromUrl() && <p className="auction-banner" role="status"><strong>{t('online.invited')}</strong></p>}
      {!room ? <section className="online-card" aria-label={t('online.setup')}>
        <label htmlFor="online-name">{t('online.name')}</label>
        <input id="online-name" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} />
        <label htmlFor="online-room-name">{t('online.roomName')}</label>
        <input id="online-room-name" autoComplete="off" maxLength={24} value={roomName} onChange={e => setRoomName(e.target.value)} placeholder={t('online.roomNameHint')} />
        <details className="entry-options"><summary>{t('setup.summary')}</summary><p>{t('online.classic')}</p><p>{t('online.scope')}</p></details>
        <button className="primary-action" disabled={!gateway || !userId || busy || !!retry} onClick={() => { const id = crypto.randomUUID(); void run(() => gateway!.create(name,id,roomName)) }}>{t('online.create')}</button>
        <label htmlFor="online-code">{t('online.code')}</label>
        <input id="online-code" autoComplete="off" value={code} onChange={e => setCode(inviteFromText(e.target.value))} /><p className="online-hint">{t('online.codeHint')}</p>
        <button className="secondary-action" disabled={!gateway || !userId || busy || !!retry} onClick={() => { const id = crypto.randomUUID(); void run(() => gateway!.join(code,name,id)) }}>{t('online.join')}</button>
      </section> : <section className="online-card" aria-label={t('online.lobby')}>
        <p role="status">{t('online.connection.' + connection)}</p><p>{t('online.peerNotice')}</p>
        <h2>{room.roomName ? t('online.roomTitle', { name: room.roomName }) : t('online.lobby')}</h2>
        {room.shortCode && <p className="online-code"><span>{t('online.roomCode')}</span> <strong>{room.shortCode}</strong></p>}
        {lobbyOpen && room.hostId === userId && <><ModeSelector selected={category} onChange={setCategory} /><label>{t('playtest.opponentCategory')}<select value={opponentCategory} onChange={(e) => setOpponentCategory(e.target.value as ThemedModeId | 'same')}><option value="same">{t('playtest.sameCategory')}</option>{CATEGORY_GROUPS.flatMap((g) => g.modes).map((id) => <option key={id} value={id}>{t('categoryTree.options.' + id)}</option>)}</select></label>{opponentCategory !== 'same' && opponentCategory !== category && <p>{t('playtest.mixedHelp')}</p>}</>}
        <ol className="online-steps"><li>{t('online.step1')}</li><li>{t('online.step2')}</li><li>{t('online.step3')}</li></ol>
        <p>{t('online.expires', { date: new Date(room.expiresAt).toLocaleString(i18n.language) })}</p>
        <ul className="online-members">{([1,2] as const).map(seat => {
          const member = room.members.find(m => m.seat === seat)
          return <li key={seat}><span>{t(seat === 1 ? 'online.host' : 'online.guest')}</span><strong>{member?.name ?? t('online.emptySeat')}</strong><span>{t(member?.ready ? 'online.ready' : 'online.waiting')}</span></li>
        })}</ul>
        <label htmlFor="online-share">{t('online.shareLink')}</label><input id="online-share" value={invitationUrl(room.inviteCode)} readOnly onFocus={e => e.target.select()} />
        <button className="secondary-action" onClick={() => { void copy() }}>{t('online.copy')}</button>
        {copied && <p role="status">{t('online.copied')}</p>}{copyFailed && <p role="alert">{t('online.copyFailed')}</p>}
        {lobbyOpen && <div className="duel-actions">
          <button className="primary-action" disabled={busy || !!retry || !own} onClick={() => send({actionType:'SET_READY',payload:{ready:!own?.ready}})}>{t(own?.ready ? 'online.unready' : 'online.markReady')}</button>
          {room.hostId === userId && <button className="primary-action" disabled={busy || !!retry || room.status !== 'READY'} onClick={startDuel}>{t('online.start')}</button>}
          <button className="secondary-action" disabled={busy || !!retry} onClick={() => { if (room.hostId === userId && gateway) { const id = room.roomId; const version = room.version; void run(async () => { try { await gateway.closeRoom(id, crypto.randomUUID()); return null } catch (e) { if (errorCode(e) !== 'BACKEND_OUTDATED') throw e; return gateway.command({ actionType: 'LEAVE', payload: {}, roomId: id, expectedVersion: version, actionId: crypto.randomUUID() }) } }) } else send({actionType:'LEAVE',payload:{}}) }}>{room.hostId === userId ? t('online.deleteRoom') : t('online.leave')}</button>
        </div>}
        {room.status === 'READY' && room.hostId !== userId && <p className="auction-banner" role="status"><strong>{t('online.waitHost')}</strong></p>}
        {room.status === 'IN_PROGRESS' && !duel && <><p role="status">{t('online.legacyRoom')}</p>{room.hostId === userId && <button className="primary-action" disabled={busy || !!retry} onClick={startDuel}>{t('online.start')}</button>}</>}
        {room.status === 'CANCELLED' && <><p role="status">{t('online.cancelled')}</p><button className="secondary-action" onClick={() => { setRoom(null); rememberRoom(userId!,null) }}>{t('online.dismiss')}</button></>}
      </section>}
      {busy && <p role="status">{t('online.saving')}</p>}
      <NoticeToasts notices={notices} onDismiss={dismiss} />
    </main>
  </div>
}
