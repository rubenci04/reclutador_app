import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
afterEach(cleanup)
// The card wheel (recruiter-duel/CardWheel) is off by default in tests: they check the board right after the coin. Its own tests switch it on.
vi.mock('../features/recruiter-duel/cardWheelSetting', () => ({ cardWheelEnabled: vi.fn(() => false), setCardWheelEnabled: vi.fn() }))
// A local game left running by one test would be resumed by the next one in the same file (ACTIVE_SESSION_KEY in recruiter-duel/activeSessionStorage.ts).
afterEach(() => { if (typeof localStorage !== 'undefined') localStorage.removeItem('reclutador.active-session.v1') })
// jsdom has no canvas: the tactical board draws nothing there, and its text alternative is what tests inspect.
if (typeof HTMLCanvasElement !== 'undefined') HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
