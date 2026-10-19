import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { STRATEGY_IDS } from './strategies'

const MATCHING_FORMATIONS = ['4-3-3 / 4-4-2', '4-3-1-2', '4-2-3-1 / 3-4-3', '5-3-2 / 4-4-2', '4-3-3 / 4-2-2-2', '5-4-1 / 4-5-1']
export function FormationGuide() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return <details onToggle={(e) => setOpen(e.currentTarget.open)}><summary>{t('playtest.affinityTitle')}</summary>{open && <><div className="formation-table-scroll" tabIndex={0} role="region" aria-label={t('playtest.affinityTitle')}><table className="formation-table"><thead><tr>{['tactic', 'shape', 'occupation', 'strength', 'bonus'].map((key) => <th key={key} scope="col">{t(`playtest.table.${key}`)}</th>)}</tr></thead><tbody>{STRATEGY_IDS.map((id, i) => <tr key={id}><th scope="row">{t(`tactics.strategies.${id}.name`)}</th><td>{MATCHING_FORMATIONS[i]}</td><td>{t(`playtest.occupation.${id}`)}</td><td>{t(`playtest.strength.${id}`)}</td><td>{t(`playtest.bonuses.${id}`)}</td></tr>)}</tbody></table></div><p>{t('playtest.tableNote')}</p></>}</details>
}
