import { useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { audio } from './audioEngine'

/** Effects switch and master volume. Also the user gesture that lets the browser start audio. */
export function AudioControls() {
  const { t } = useTranslation()
  const preferences = useSyncExternalStore(audio.subscribe, audio.getPreferences, audio.getPreferences)
  useEffect(() => {
    const unlock = () => { void audio.unlock() }
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', unlock, true)
    return () => { document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true) }
  }, [])
  return <div className="audio-control">
    <button className="header-mode" aria-pressed={preferences.enabled} aria-label={t('audio.effects')} onClick={() => { audio.setPreferences({ enabled: !preferences.enabled }); void audio.unlock() }}>{preferences.enabled ? t('audio.on') : t('audio.off')}</button>
    <input type="range" min={0} max={100} step={5} value={Math.round(preferences.volume * 100)} disabled={!preferences.enabled} aria-label={t('audio.volume')} aria-valuetext={t('audio.volumeValue', { value: Math.round(preferences.volume * 100) })} onChange={(event) => audio.setPreferences({ volume: Number(event.target.value) / 100 })} />
  </div>
}
