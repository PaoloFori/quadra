import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from '@/app/App';
import { initI18n } from '@/i18n';
import { getSettings } from '@/db/settings';
import { DEFAULT_SETTINGS } from '@/db/settings';

async function boot(): Promise<void> {
  const settings = await getSettings().catch(() => DEFAULT_SETTINGS);
  await initI18n(settings.language);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
