# Quadra

PWA personale per tracciare le spese bancarie (BBVA e Intesa Sanpaolo), con resoconti mensili/annuali, budget e backup completi.
Un solo utente, **nessun login, nessun backend, nessun analytics**: i dati restano sul dispositivo (IndexedDB).

- React + Vite + TypeScript (strict), Tailwind, Dexie, Recharts, i18next (IT/EN)
- Offline (service worker), installabile da Safari con «Aggiungi a Home»
- Architettura e formato del backup: [docs/architecture.md](docs/architecture.md), [docs/backup-format.md](docs/backup-format.md)

## Sviluppo

```bash
npm install
npm run dev          # http://localhost:5173
npm run lint         # ESLint
npm run typecheck    # tsc strict
npm test             # Vitest
npm run build        # build di produzione in dist/
npm run samples      # rigenera i CSV di esempio in samples/
npm run icons        # rigenera icone e splash in public/
```

Prima di ogni commit devono passare `lint`, `typecheck` e `test`. Commit in stile Conventional Commits.

## Deploy

**GitHub Pages** (consigliato, gratuito): su GitHub crea il repository `quadra`, fai push su `main`, poi in
_Settings → Pages → Source_ scegli **GitHub Actions**. Il workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
esegue lint, typecheck, test e pubblica su `https://<utente>.github.io/quadra/`.

**Vercel**: importa il repository, Vercel rileva Vite (vedi `vercel.json`); non servono variabili d'ambiente.

> Il repository può essere **privato**: l'app pubblicata è comunque raggiungibile da chiunque conosca l'URL, ma non contiene dati (sono tutti sul tuo telefono).

## Installazione su iPhone

1. Apri l'URL del deploy **in Safari** (non da altre app).
2. Tocca _Condividi_ → **Aggiungi a Home** → _Aggiungi_.
3. Apri Quadra dall'icona in Home. Alla prima apertura vai in **Impostazioni → Backup e ripristino** e tocca _Richiedi archiviazione persistente_.
4. (Facoltativo) **Impostazioni → Privacy e blocco**: imposta un PIN e attiva Face ID.

## Importare i movimenti dalla banca

1. Dall'home banking esporta i movimenti in CSV o XLSX.
2. Quadra → _Movimenti → Importa_, scegli il conto e il file.
3. Controlla l'anteprima («120 nuovi, 8 già presenti») e conferma. Se il formato non viene riconosciuto, mappa le colonne a mano: il profilo viene salvato.

Riimportare lo stesso file (o uno che si sovrappone) non crea duplicati; due movimenti identici nello stesso giorno restano due movimenti.
I giroconti tra i due conti (stesso importo, segno opposto, ≤ 3 giorni) vengono rilevati ed esclusi da entrate/uscite.
Per provare tutto subito usa [samples/bbva-esempio.csv](samples/bbva-esempio.csv) (conto BBVA) e [samples/intesa-esempio.csv](samples/intesa-esempio.csv) (conto Intesa Sanpaolo).

> I formati esatti degli export BBVA/Intesa possono cambiare nel tempo. Il riconoscimento si basa sulle intestazioni
> (italiano/inglese/spagnolo); se qualcosa non torna c'è sempre la mappatura manuale.

## Backup e ripristino (importante)

**Rimuovere l'app dalla Home cancella tutti i dati** se non hai un backup. Safari può anche svuotare l'archiviazione dei siti non usati da molto tempo.

- **Backup completo**: _Impostazioni → Backup e ripristino → Crea backup completo_. Si apre il foglio di condivisione di iOS: scegli **Salva su File → iCloud Drive**.
- **Export per periodo**: mese, anno o tutto, in JSON (reimportabile) o CSV (fogli di calcolo).
- **Ripristino**: scegli il file `.json`, controlla l'anteprima («412 nuovi, 38 già presenti, 3 conflitti») e scegli:
  - _Unisci_: aggiunge solo ciò che manca;
  - _Sostituisci tutto_: cancella e riscrive (chiede conferma).
- Cambio telefono: installa Quadra sul nuovo iPhone, poi _Ripristina_ dal file in iCloud Drive.
- Un banner in Home ti avvisa se l'ultimo backup ha più di 30 giorni; dal 15 dicembre compare un promemoria di fine anno.
- I backup vecchi si importano sempre (migrazione automatica). Il file non dipende dalla lingua dell'interfaccia.
- PIN e Face ID non sono inclusi nei backup (sono legati al dispositivo).

## Privacy

Nessuna chiamata di rete con i tuoi dati e nessun analytics. Il blocco con PIN (PBKDF2) e Face ID (WebAuthn, verifica locale) impedisce l'accesso
casuale all'app, ma **non cifra** il database sul telefono.

## Licenza

Software privato, tutti i diritti riservati: vedi [LICENSE](LICENSE). Il `.gitignore` esclude CSV/XLSX reali e backup (tranne `samples/`).
