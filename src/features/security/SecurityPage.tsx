import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { PIN_PATTERN } from '@/domain/security/pin';
import { useLock } from './LockProvider';
import {
  removeBiometricCredential,
  removeLock,
  saveBiometricCredential,
  savePin,
} from './lockStore';
import { biometricsAvailable, registerBiometrics } from './webauthn';

export default function SecurityPage() {
  const { t } = useTranslation();
  const { config, reload, lockNow } = useLock();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  useEffect(() => void biometricsAvailable().then(setBioAvailable), []);

  const valid = PIN_PATTERN.test(pin) && pin === confirm;

  async function submitPin(): Promise<void> {
    await savePin(pin);
    setPin('');
    setConfirm('');
    setMessage(t('security.pinSaved'));
    await reload();
  }

  async function enableBiometrics(): Promise<void> {
    try {
      await saveBiometricCredential(await registerBiometrics());
      setMessage(t('security.biometricsEnabled'));
      await reload();
    } catch {
      setMessage(t('security.biometricsFailed'));
    }
  }

  return (
    <Screen title={t('security.title')}>
      <Link to="/settings" className="mb-2 inline-flex min-h-[44px] items-center text-accent">
        ‹ {t('settings.title')}
      </Link>
      {message && (
        <p role="status" className="card mb-3 text-income">
          {message}
        </p>
      )}
      <div className="space-y-3">
        <section className="card space-y-3">
          <h2 className="font-semibold">
            {config.pin ? t('security.changePin') : t('security.setPin')}
          </h2>
          <div>
            <label className="label" htmlFor="new-pin">
              {t('security.newPin')}
            </label>
            <input
              id="new-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              className="input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm-pin">
              {t('security.confirmPin')}
            </label>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <p className="text-[13px] text-muted">{t('security.pinRule')}</p>
          <button className="btn-primary w-full" disabled={!valid} onClick={() => void submitPin()}>
            {t('common.save')}
          </button>
        </section>

        {config.pin && (
          <section className="card space-y-3">
            {bioAvailable ? (
              config.biometricCredential ? (
                <button
                  className="btn-secondary w-full"
                  onClick={() => void removeBiometricCredential().then(reload)}
                >
                  {t('security.disableBiometrics')}
                </button>
              ) : (
                <button className="btn-secondary w-full" onClick={() => void enableBiometrics()}>
                  {t('security.enableBiometrics')}
                </button>
              )
            ) : (
              <p className="text-[14px] text-muted">{t('security.biometricsUnavailable')}</p>
            )}
            <button className="btn-secondary w-full" onClick={lockNow}>
              {t('security.lockNow')}
            </button>
            <button
              className="btn-danger w-full"
              onClick={() =>
                window.confirm(t('security.confirmRemove')) && void removeLock().then(reload)
              }
            >
              {t('security.remove')}
            </button>
          </section>
        )}
        <p className="px-1 text-[13px] text-muted">{t('security.limits')}</p>
      </div>
    </Screen>
  );
}
