import { useTranslation } from 'react-i18next'
import type { Notice } from './useAuctionNotices'

/** Messages about what just happened or why something is not allowed. Warnings are announced assertively. */
export function NoticeToasts({ notices, onDismiss }: { readonly notices: readonly Notice[]; readonly onDismiss: (id: number) => void }) {
  const { t } = useTranslation()
  if (!notices.length) return null
  return <div className="notice-stack">{notices.map((notice) => <div key={notice.id} className={`notice notice-${notice.tone}`} role={notice.tone === 'warning' ? 'alert' : 'status'}>
    <span>{notice.text}</span>
    <button className="notice-close" aria-label={t('notices.dismiss')} onClick={() => onDismiss(notice.id)}>×</button>
  </div>)}</div>
}
