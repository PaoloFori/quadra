import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { lockoutSeconds, verifyPin } from '@/domain/security/pin';
import type { LockConfig } from './lockStore';
import { verifyBiometrics } from './webauthn';

interface Props {
  config: LockConfig;
  onUnlock: () => void;
}

export function LockScreen({ config, onUnlock }: Props) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [failed, setFailed] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(0);
  const [error, setError] = useState(false);
  const wait = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waitUntil]);

  async function tryBiometrics(): Promise<void> {
    if (config.biometricCredential && (await verifyBiometrics(config.biometricCredential)))
      onUnlock();
  }

  async function submit(): Promise<void> {
    if (!config.pin || wait > 0) return;
    if (await verifyPin(pin, config.pin)) return onUnlock();
    const attempts = failed + 1;
    setFailed(attempts);
    setPin('');
    setError(true);
    const lock = lockoutSeconds(attempts);
    if (lock > 0) {
      setWaitUntil(Date.now() + lock * 1000);
      setNow(Date.now());
    }
  }

  return (
    <main
      className="flex h-full flex-col items-center justify-center gap-4 p-8"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <h1 className="text-3xl font-bold">Quadra</h1>
      <form
        className="flex w-full max-w-xs flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="label text-center" htmlFor="pin">
          {t('security.enterPin')}
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={8}
          className="input text-center text-2xl tracking-[0.5em]"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setError(false);
          }}
        />
        {error && wait === 0 && (
          <p role="alert" className="text-center text-expense">
            {t('security.wrongPin')}
          </p>
        )}
        {wait > 0 && (
          <p role="alert" className="text-center text-expense">
            {t('security.wait', { seconds: wait })}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={pin.length < 4 || wait > 0}>
          {t('security.unlock')}
        </button>
        {config.biometricCredential && (
          <button type="button" className="btn-secondary" onClick={() => void tryBiometrics()}>
            {t('security.useBiometrics')}
          </button>
        )}
      </form>
    </main>
  );
}
