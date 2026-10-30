import { useEffect, useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Foglio modale dal basso (stile iOS). Chiusura con Esc o tap sullo sfondo. */
export function Sheet({ title, onClose, children }: Props) {
  const { t } = useTranslation();
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet max-h-[92%] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-bg px-4 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <div className="flex min-h-[44px] items-center justify-between gap-2">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button
            className="btn-secondary !min-w-[44px] !px-3"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 py-3">{children}</div>
      </div>
    </div>
  );
}
