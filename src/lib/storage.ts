export interface StorageStatus {
  supported: boolean;
  persisted: boolean;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (!navigator.storage?.persisted) return { supported: false, persisted: false };
  return { supported: true, persisted: await navigator.storage.persisted() };
}

/** Chiede al browser di non cancellare i dati sotto pressione di spazio. Non garantisce nulla se l'app viene rimossa. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
