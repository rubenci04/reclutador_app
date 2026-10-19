import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GuideDialog } from '../../components/GuideDialog'

export function StageGuide({ stage }: { readonly stage: string }) {
  const { t } = useTranslation(); const [read, setRead] = useState<string[]>([])
  if (read.includes(stage)) return null
  return <GuideDialog title={t(`playtest.guides.${stage}.title`)} body={t(`playtest.guides.${stage}.body`)} onClose={() => setRead([...read, stage])} />
}
