import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { getSettings } from '@/db/settings';
import { transactionsRepo } from '@/db/repositories';
import { backupReminder } from '@/domain/backup/reminder';

/** Banner in Home quando il backup è vecchio o a fine anno. */
export function BackupReminder() {
  const { t } = useTranslation();
  const settings = useLiveQuery(getSettings, []);
  const count = useLiveQuery(transactionsRepo.count, []);
  if (!settings || count === undefined) return null;
  const kind = backupReminder(new Date(), settings.lastBackupAt, count > 0);
  if (kind === 'none') return null;
  return (
    <Link
      to="/settings/backup"
      role="status"
      className="card mb-3 flex items-center gap-3 border border-warn/50"
    >
      <span aria-hidden="true" className="text-2xl">
        💾
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{t(`backup.reminder.${kind}.title`)}</span>
        <span className="block text-[13px] text-muted">{t(`backup.reminder.${kind}.body`)}</span>
      </span>
      <span className="text-accent">{t('backup.reminder.action')}</span>
    </Link>
  );
}
