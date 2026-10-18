import { useTranslation } from 'react-i18next'
import { BUDGET_LIMITS, BUDGET_PRESETS, NAME_MAX_LENGTH, isValidBudget, nameIssues, nameLength, sanitizeName, type Preflight, type SetupDraft } from './matchConfig'

interface Props {
  readonly draft: SetupDraft
  readonly onChange: (draft: SetupDraft) => void
  readonly versusCpu: boolean
  readonly preflight: Preflight
}

/** Pre-toss configuration. Classic keeps every default; custom exposes names and the shared starting budget. */
export function MatchSetupPanel({ draft, onChange, versusCpu, preflight }: Props) {
  const { t } = useTranslation()
  const budget = Number(draft.budgetText)
  const names = { recruiter_one: sanitizeName(draft.nameOne), recruiter_two: sanitizeName(draft.nameTwo) }
  const issues = nameIssues(names)
  const set = (patch: Partial<SetupDraft>) => onChange({ ...draft, ...patch })
  const defaultTwo = versusCpu ? 'CPU' : t('duel.recruiters.recruiter_two')
  return <fieldset className="match-setup">
    <legend>{t('setup.legend')}</legend>
    <div className="setup-modes" role="radiogroup" aria-label={t('setup.legend')}>
      {(['classic', 'custom'] as const).map((mode) => <label key={mode} className={draft.mode === mode ? 'chosen' : undefined}>
        <input type="radio" name="setup-mode" checked={draft.mode === mode} onChange={() => set({ mode })} />
        <strong>{t(`setup.${mode}`)}</strong><small>{t(`setup.${mode}Detail`)}</small>
      </label>)}
    </div>
    {draft.mode === 'custom' && <>
      {(['one', 'two'] as const).map((side) => {
        const key = side === 'one' ? 'recruiter_one' : 'recruiter_two'; const value = side === 'one' ? draft.nameOne : draft.nameTwo; const issue = issues[key]
        return <label key={side}>{t(side === 'one' ? 'setup.nameOne' : versusCpu ? 'setup.nameCpu' : 'setup.nameTwo')}
          <input type="text" value={value} placeholder={side === 'one' ? t('duel.recruiters.recruiter_one') : defaultTwo} aria-invalid={issue ? true : undefined} aria-describedby={`setup-name-${side}`}
            onChange={(event) => set(side === 'one' ? { nameOne: event.target.value } : { nameTwo: event.target.value })} />
          <small id={`setup-name-${side}`} className={issue ? 'setup-error' : undefined} role={issue ? 'alert' : undefined}>
            {issue ? t(`setup.nameIssues.${issue}`, { max: NAME_MAX_LENGTH }) : t('setup.nameHint', { count: nameLength(sanitizeName(value) ?? ''), max: NAME_MAX_LENGTH })}
          </small>
        </label>
      })}
      <div className="setup-budget">
        <span id="setup-budget-label">{t('setup.budget')}</span>
        <div className="setup-presets" role="group" aria-labelledby="setup-budget-label">{BUDGET_PRESETS.map((value) => <button key={value} type="button" className={budget === value ? 'primary-action' : 'secondary-action'} aria-pressed={budget === value} onClick={() => set({ budgetText: String(value) })}>{value}M</button>)}</div>
        <label>{t('setup.budgetCustom', { min: BUDGET_LIMITS.min, max: BUDGET_LIMITS.max, step: BUDGET_LIMITS.step })}
          <input type="number" inputMode="numeric" min={BUDGET_LIMITS.min} max={BUDGET_LIMITS.max} step={BUDGET_LIMITS.step} value={draft.budgetText} onChange={(event) => set({ budgetText: event.target.value })} aria-invalid={isValidBudget(budget) ? undefined : true} />
        </label>
      </div>
      <label className="setup-check"><input type="checkbox" checked={draft.substitutes} onChange={(event) => set({ substitutes: event.target.checked })} />{t('setup.substitutes')}</label>
      <p role="status" className={preflight.ok ? undefined : 'setup-error'}>
        {preflight.ok ? t('setup.preflightOk', { minimum: preflight.minimumPerTeam })
          : t(`setup.preflight.${preflight.reason}`, { min: BUDGET_LIMITS.min, max: BUDGET_LIMITS.max, step: BUDGET_LIMITS.step, minimum: preflight.minimumPerTeam ?? 0 })}
      </p>
    </>}
    <section className="setup-summary" aria-label={t('setup.summary')}>
      <h3>{t('setup.summary')}</h3>
      <ul>
        <li>{t('setup.rules.budget', { amount: draft.mode === 'custom' && isValidBudget(budget) ? budget : 100 })}</li>
        <li>{t('setup.rules.formation')}</li>
        <li>{t(draft.mode === 'custom' && draft.substitutes ? 'setup.rules.startersBench' : 'setup.rules.starters')}</li>
        <li>{t('setup.rules.discards')}</li>
      </ul>
    </section>
  </fieldset>
}
