/**
 * Face ID / Touch ID tramite WebAuthn con autenticatore di piattaforma.
 * Non c'è un server: la verifica è locale (l'utente ha superato il controllo biometrico del dispositivo).
 * Protegge dall'accesso casuale all'app, non è una cifratura dei dati.
 */
const toB64 = (buf: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function biometricsAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometrics(): Promise<string> {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Quadra' },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'quadra',
        displayName: 'Quadra',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60_000,
    },
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error('No credential');
  return toB64(credential.rawId);
}

export async function verifyBiometrics(credentialId: string): Promise<boolean> {
  try {
    const result = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromB64(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return result !== null;
  } catch {
    return false;
  }
}
