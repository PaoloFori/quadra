import { useEffect, useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  title: string;
  onClose: () => void;
  /** Se presente: intestazione con ✕ a sinistra, titolo al centro e questo pulsante a destra (es. Salva). */
  headerAction?: { label: string; onClick: () => void; disabled?: boolean };
  children: ReactNode;
}

/** Foglio modale dal basso (stile iOS). Chiusura con Esc o tap sullo sfondo. */
export function Sheet({ title, onClose, headerAction, children }: Props) {
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
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet max-h-[92%] w-full max-w-xl overflow-y-auto rounded-t-3xl border-[1.5px] border-b-0 border-line bg-raised px-6 pt-3 md:rounded-3xl md:border-b-[1.5px] md:px-8 md:pb-4 md:pt-5"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        {headerAction ? (
          <div className="grid min-h-[44px] grid-cols-[auto_1fr_auto] items-center gap-2">
            <button
              className="btn-secondary !min-w-[44px] !px-3"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              ✕
            </button>
            <h2
              id={titleId}
              className="truncate text-center font-display text-[18px] font-medium tracking-[-0.02em]"
            >
              {title}
            </h2>
            <button
              className="btn-primary !min-h-[44px] !px-4"
              disabled={headerAction.disabled}
              onClick={headerAction.onClick}
            >
              {headerAction.label}
            </button>
          </div>
        ) : (
          <div className="flex min-h-[44px] items-center justify-between gap-2">
            <h2 id={titleId} className="font-display text-[22px] font-medium tracking-[-0.02em]">
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
        )}
        <div className="space-y-3 py-3">{children}</div>
      </div>
    </div>
  );
}
