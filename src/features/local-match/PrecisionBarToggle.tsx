import { useTranslation } from 'react-i18next'
import { setPrecisionBar, usePrecisionBar } from './precisionSetting'

export function PrecisionBarToggle() {
  const { t } = useTranslation()
  const enabled = usePrecisionBar()
  return <label className="precision-toggle" title={t('field.precisionHint')}><input type="checkbox" checked={enabled} onChange={(event) => setPrecisionBar(event.target.checked)} />{t('field.precisionLabel')}</label>
}
