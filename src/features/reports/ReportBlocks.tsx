import { Fragment, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { getSettings, setSetting } from '@/db/settings';
import {
  moveBlock,
  orderBlocks,
  sanitizeLayouts,
  type ReportLayouts,
  type ReportView,
} from '@/domain/reports/layout';

export interface Block {
  id: string;
  /** Nome mostrato nella schermata «Personalizza». */
  title: string;
  node: ReactNode;
}

/** Salva (o, con `undefined`, azzera) l'ordine dei blocchi di una vista nelle impostazioni, quindi anche nei backup. */
async function saveLayout(
  layouts: ReportLayouts,
  view: ReportView,
  layout: ReportLayouts[ReportView],
): Promise<void> {
  const next = { ...layouts, [view]: layout };
  if (!layout) delete next[view];
  await setSetting('reportLayouts', Object.keys(next).length > 0 ? next : undefined);
}

/**
 * Blocchi di una scheda dei Resoconti nell'ordine scelto dall'utente, senza quelli nascosti,
 * più il tasto per personalizzarli. I blocchi non applicabili (null/false) non compaiono nemmeno nell'elenco.
 */
export function ReportBlocks({
  view,
  blocks,
}: {
  view: ReportView;
  blocks: (Block | null | false | undefined)[];
}) {
  const { t } = useTranslation();
  const settings = useLiveQuery(getSettings, [], undefined);
  const layouts = sanitizeLayouts(settings?.reportLayouts);
  const [editing, setEditing] = useState(false);

  const available = blocks.filter((b): b is Block => !!b);
  const byId = new Map(available.map((b) => [b.id, b]));
  const ordered = orderBlocks(
    available.map((b) => b.id),
    layouts[view],
  );

  const update = (order: string[], hidden: string[]): void =>
    void saveLayout(layouts, view, { order, hidden });
  const order = ordered.map((o) => o.id);
  const hidden = ordered.filter((o) => o.hidden).map((o) => o.id);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          className="btn-secondary !min-h-[40px] !px-3 !text-[14px]"
          onClick={() => setEditing(true)}
        >
          {t('reports.customize')}
        </button>
      </div>
      <div className="masonry">
        {ordered
          .filter((o) => !o.hidden)
          .map((o) => (
            <Fragment key={o.id}>{byId.get(o.id)?.node}</Fragment>
          ))}
      </div>
      {editing && (
        <Sheet title={t('reports.customizeTitle')} onClose={() => setEditing(false)}>
          <p className="text-[13px] text-muted">{t('reports.customizeHint')}</p>
          <ul>
            {ordered.map((o, i) => {
              const title = byId.get(o.id)?.title ?? o.id;
              return (
                <li
                  key={o.id}
                  className="flex min-h-[52px] items-center gap-2 border-t border-line first:border-0"
                >
                  <button
                    role="switch"
                    aria-checked={!o.hidden}
                    aria-label={`${t(o.hidden ? 'reports.show' : 'reports.hide')}: ${title}`}
                    className={`chip !min-w-[64px] justify-center ${o.hidden ? '' : 'chip-on'}`}
                    onClick={() =>
                      update(order, o.hidden ? hidden.filter((h) => h !== o.id) : [...hidden, o.id])
                    }
                  >
                    {t(o.hidden ? 'reports.hidden' : 'reports.visible')}
                  </button>
                  <span className={`min-w-0 flex-1 truncate ${o.hidden ? 'text-muted' : ''}`}>
                    {title}
                  </span>
                  <button
                    className="btn-secondary !min-h-[40px] !min-w-[40px] !px-2"
                    aria-label={`${t('reports.moveUp')}: ${title}`}
                    disabled={i === 0}
                    onClick={() => update(moveBlock(order, o.id, -1), hidden)}
                  >
                    ▲
                  </button>
                  <button
                    className="btn-secondary !min-h-[40px] !min-w-[40px] !px-2"
                    aria-label={`${t('reports.moveDown')}: ${title}`}
                    disabled={i === ordered.length - 1}
                    onClick={() => update(moveBlock(order, o.id, 1), hidden)}
                  >
                    ▼
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => void saveLayout(layouts, view, undefined)}
            >
              {t('reports.resetLayout')}
            </button>
            <button className="btn-primary flex-1" onClick={() => setEditing(false)}>
              {t('common.done')}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
