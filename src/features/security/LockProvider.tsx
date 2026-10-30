import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadLockConfig, type LockConfig } from './lockStore';
import { LockScreen } from './LockScreen';

interface LockContextValue {
  config: LockConfig;
  reload: () => Promise<void>;
  lockNow: () => void;
}

const LockContext = createContext<LockContextValue | null>(null);

/** Dopo quanto tempo in background l'app si blocca di nuovo. */
const RELOCK_AFTER_MS = 30_000;

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock outside LockProvider');
  return ctx;
}

export function LockProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [locked, setLocked] = useState(true);
  const hiddenAt = useRef<number | null>(null);

  const reload = useCallback(async () => setConfig(await loadLockConfig()), []);

  useEffect(() => {
    void loadLockConfig().then((c) => {
      setConfig(c);
      setLocked(c.pin !== null);
    });
  }, []);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS && config?.pin)
        setLocked(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [config]);

  const value = useMemo<LockContextValue | null>(
    () => (config ? { config, reload, lockNow: () => config.pin && setLocked(true) } : null),
    [config, reload],
  );

  if (!value) return null;
  return (
    <LockContext.Provider value={value}>
      {locked && value.config.pin ? (
        <LockScreen config={value.config} onUnlock={() => setLocked(false)} />
      ) : (
        children
      )}
    </LockContext.Provider>
  );
}
