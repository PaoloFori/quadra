import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/space-grotesk';
import './index.css';
import { requestPersistence } from '@/lib/storage';
import { App } from '@/app/App';
import { initI18n } from '@/i18n';
import { applyTheme } from '@/lib/themes';
import { getSettings } from '@/db/settings';
import { DEFAULT_SETTINGS } from '@/db/settings';

/** Chiede (senza bloccare l'avvio) che iOS non cancelli i dati quando serve spazio. */
void requestPersistence();

async function boot(): Promise<void> {
  const settings = await getSettings().catch(() => DEFAULT_SETTINGS);
  applyTheme(settings.theme);
  await initI18n(settings.language);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
