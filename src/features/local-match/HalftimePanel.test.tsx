import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { HalftimePanel } from './HalftimePanel'
import { LiveMatchScreen } from './LiveMatchScreen'
import { advanceBlock, createSession } from './interactive'
import { resolveQuietWindow } from './interactive/liveModel'
import { liveInput, must } from './interactive/liveFixtures.test-support'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })
const create = () => must(createSession(liveInput('halftime-ui'), { sessionId: 'halftime-ui', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, matchRules: { version: 'halftime-ovr-v1' } }))
const at30 = () => must(advanceBlock(must(advanceBlock(create()))))
const at45 = () => must(advanceBlock(must(resolveQuietWindow(at30()))))
const tick = (ms: number) => { for (let n = 0; n < ms; n += 50) act(() => { vi.advanceTimersByTime(50) }) }

it.each(['es-AR', 'en', 'pt-BR'] as const)('offers one-touch KEEP, optional combined order and heading focus in %s', async (language) => {
  const i18n = await createI18n(language); const confirm = vi.fn(); const session = at45()
  render(<I18nextProvider i18n={i18n}><HalftimePanel session={session} side="local" name="Home" halftime onConfirm={confirm} /></I18nextProvider>)
  expect(screen.getByRole('heading')).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('halftime.keep') }))
  expect(confirm).toHaveBeenLastCalledWith({ type: 'KEEP', parameters: {} })
  fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('halftime.change') }))
  fireEvent.change(screen.getByRole('combobox', { name: i18n.t('liveDT.strategy') }), { target: { value: 'LOW_BLOCK' } })
  fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('halftime.addSub') }))
  expect(screen.getByRole('button', { name: i18n.t('halftime.confirm') })).toBeDisabled()
  const inId = session.kernel.input.benches!.local[0], outId = session.kernel.input.localLineup.LB!
  fireEvent.change(screen.getByRole('combobox', { name: i18n.t('liveDT.in') }), { target: { value: inId } })
  fireEvent.change(screen.getByRole('combobox', { name: i18n.t('liveDT.out') }), { target: { value: outId } })
  fireEvent.click(screen.getByRole('button', { name: i18n.t('halftime.confirm') }))
  expect(confirm).toHaveBeenLastCalledWith({ type: 'HALFTIME', parameters: { strategy: 'LOW_BLOCK', substitution: { inId, outId } } })
})

it('never asks at 30/60/75, asks once at halftime and does not duplicate decisions with pause/speed changes', async () => {
  vi.useFakeTimers(); const i18n = await createI18n('en'); const done = vi.fn()
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={create()} versusCpu difficulty="NORMAL" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={done} onReturn={() => {}} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.pause') })); tick(5000)
  expect(screen.queryByText(i18n.t('halftime.question'))).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: i18n.t('navigation.speed') }), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('liveDT.skipAnimations') }))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.resume') })); tick(3000)
  expect(screen.getAllByText(i18n.t('halftime.question'))).toHaveLength(1)
  const keep = screen.getByRole('button', { name: i18n.t('halftime.keep') }); fireEvent.click(keep); fireEvent.click(keep)
  tick(6000); expect(done).toHaveBeenCalledTimes(1)
  const final = done.mock.calls[0][0]
  expect(final.applied).toHaveLength(8)
  expect(final.applied.filter((d: { applyBlock: number; order: { type: string } }) => d.applyBlock !== 3).every((d: { order: { type: string } }) => d.order.type === 'KEEP')).toBe(true)
  expect(screen.queryByText(i18n.t('halftime.question'))).not.toBeInTheDocument()
})

it('opens a substitution-only pause only when explicitly requested', async () => {
  vi.useFakeTimers(); const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={create()} versusCpu difficulty="NORMAL" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={() => {}} onReturn={() => {}} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('halftime.requestSub', { name: 'Home' }) }))
  fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('liveDT.skipAnimations') })); tick(2000)
  expect(screen.getByRole('heading', { name: /Substitutions/ })).toHaveFocus()
  expect(screen.queryByText(i18n.t('halftime.change'))).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('halftime.cancel') })); tick(2000)
  expect(screen.getByText(i18n.t('halftime.question'))).toBeInTheDocument()
})

it('lets both hot-seat players request the same break without discarding the second request', async () => {
  vi.useFakeTimers(); const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={create()} versusCpu={false} difficulty="NORMAL" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={() => {}} onReturn={() => {}} /></I18nextProvider>)
  for (const name of ['Home', 'Away']) fireEvent.click(screen.getByRole('button', { name: i18n.t('halftime.requestSub', { name }) }))
  fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('liveDT.skipAnimations') })); tick(2000)
  expect(screen.getByRole('heading', { name: 'Substitutions · Home' })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('halftime.cancel') }))
  expect(screen.getByRole('heading', { name: i18n.t('liveDT.handover', { name: 'Away' }) })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('liveDT.ready', { name: 'Away' }) }))
  expect(screen.getByRole('heading', { name: 'Substitutions · Away' })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('halftime.cancel') })); tick(2000)
  expect(screen.getByRole('heading', { name: 'HALF-TIME · Home' })).toHaveFocus()
})
