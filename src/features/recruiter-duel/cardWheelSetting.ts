/** The card wheel is on by default; «don't show it again» is remembered on this device only. */
const KEY = 'reclutador.card-wheel.v1'
export const cardWheelEnabled = (): boolean => { try { return window.localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setCardWheelEnabled = (enabled: boolean): void => { try { if (enabled) window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, 'off') } catch { /* The choice only lasts for this visit. */ } }
