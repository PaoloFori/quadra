import { useTranslation } from 'react-i18next';
import { setAmountsHidden, useAmountsHidden } from '@/lib/privacy';

/** Occhio: nasconde o mostra tutti gli importi dell'app. */
export function PrivacyToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const hidden = useAmountsHidden();
  return (
    <button
      type="button"
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${className}`}
      aria-pressed={hidden}
      aria-label={hidden ? t('privacy.show') : t('privacy.hide')}
      title={hidden ? t('privacy.show') : t('privacy.hide')}
      onClick={() => setAmountsHidden(!hidden)}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {hidden && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}
