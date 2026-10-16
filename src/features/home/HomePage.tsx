import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { INITIAL_SETUP } from '../../data/initialSetup'
import { Pitch } from './Pitch'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.resolvedLanguage).format(INITIAL_SETUP.budgetMillions)
  return <div className="app-shell">
    <a href="#main" className="skip-link">{t('home.skip')}</a>
    <header className="site-header flex items-center justify-between gap-4">
      <a className="brand" href="#main" aria-label={`Draft Legends · ${t('nav.home')}`}><span className="brand-emblem" aria-hidden="true">DL</span><span>Draft<span className="brand-light">Legends</span><span className="brand-dot">.</span></span></a>
      <LanguageSelector />
    </header>
    <main id="main">
      <section className="intro">
        <p className="eyebrow"><span />{t('home.edition')}</p>
        <h1>{t('home.headlineFirst')}<br /><span>{t('home.headlineLast')}</span></h1>
        <p className="intro-description">{t('home.subtitle')}</p>
      </section>
      <section className="draft-panel" aria-labelledby="team-title">
        <div className="team-details">
          <div className="mode-line"><span className="eyebrow">{t('home.mode')}</span><span className="status"><span />{t('home.status')}</span></div>
          <h2 id="team-title">{t('home.teamTitle')}</h2>
          <p className="muted">{t('home.teamDescription')}</p>
          <dl className="budget-block"><dt>{t('game.budget')}</dt><dd>{number}<span>{t('game.millions', { value: '' }).trim()}</span></dd></dl>
          <div className="stats-grid">
            <dl><dt>{t('game.formation')}</dt><dd>{INITIAL_SETUP.formation}</dd></dl>
            <dl><dt>{t('game.startingEleven')}</dt><dd>{INITIAL_SETUP.starters}<span>/{INITIAL_SETUP.teamSize}</span></dd></dl>
          </div>
          <button className="play-button" disabled aria-describedby="play-pending">{t('nav.play')}<span aria-hidden="true">↗</span></button>
          <p id="play-pending" className="pending">{t('home.pending')}</p>
        </div>
        <div className="pitch-section"><div className="pitch-heading"><span>{t('game.myTeam')}</span><span>{INITIAL_SETUP.formation}</span></div><Pitch /><p className="pitch-caption">{t('home.pitchCaption')}</p></div>
      </section>
    </main>
    <footer className="site-footer"><span>{t('home.footer')}</span><span>{t('home.development')}</span></footer>
  </div>
}
