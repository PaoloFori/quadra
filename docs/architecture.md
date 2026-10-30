# Architettura di Quadra

App personale, single-user, offline-first. Nessun backend, nessun account, nessuna chiamata esterna con i dati.

## Livelli

```
UI (src/features, src/components)   React + Tailwind. Nessuna logica di business.
        │  usa hook + servizi
Servizi/DB (src/db)                 Dexie: schema, migrazioni, repository, "commit" di import/restore.
        │  chiama funzioni pure
Dominio (src/domain)                Funzioni PURE: import, dedupe, giroconti, regole, report, backup, export.
        │
Utilità (src/lib)                   Pure e generiche: denaro, date, hash, formattazione Intl, CSV.
```

Regola: `src/domain` e `src/lib` non importano React né Dexie → testabili in Node con Vitest.

## Cartelle

| Cartella | Contenuto |
|---|---|
| `src/app` | entry, router, provider (i18n, tema, lock), error boundary |
| `src/features/*` | schermate: home, transactions, import, reports, budgets, backup, settings, security |
| `src/db` | `database.ts` (schema Dexie + versioni), `repositories.ts`, `services.ts` |
| `src/domain` | `types`, `importing/*`, `transfers`, `rules`, `reports/*`, `backup/*`, `export/*` |
| `src/lib` | `money`, `dates`, `hash`, `format`, `csv`, `normalize` |
| `src/i18n` | config + `locales/it.json`, `locales/en.json` |
| `tests/` | Vitest |
| `scripts/` | generatore CSV di esempio |

## Schema dati (Dexie, IndexedDB)

Importi sempre in **centesimi interi** (negativo = uscita). Date come stringhe ISO `YYYY-MM-DD` (nessun problema di fuso).

| Tabella | Chiave / indici | Campi principali |
|---|---|---|
| `transactions` | `id, accountId, date, [accountId+date], categoryId, hash, transferGroupId` | `amountCents, description, note, valueDate, balanceCents, isTransfer, source('manual'\|'import'), createdAt, updatedAt` |
| `accounts` | `id` | `name, bank('bbva'\|'intesa'\|'other')` |
| `categories` | `id` | `kind, color, icon, builtin, name?` (solo se personalizzata/rinominata) |
| `rules` | `id` | `pattern, categoryId, origin('user'\|'learned')` |
| `budgets` | `id, categoryId` | `monthlyCents` |
| `profiles` | `id` | profilo banca: mappatura colonne, formato data/decimali, firma intestazioni |
| `settings` | `key` | `language, lastBackupAt, ...` |

**Deduplica**: `hash = SHA-256(conto|data|importo|descrizione normalizzata)`. Per movimenti identici legittimi
nello stesso giorno, si aggiunge l'indice d'occorrenza nel file: `id = hash#n`. All'import, se in DB esistono già
`E` righe con quell'hash, nel file solo le occorrenze `n >= E` sono nuove. Re-importare lo stesso file non duplica nulla,
e due caffè identici lo stesso giorno restano due movimenti.

**Giroconti**: coppie su conti diversi, importo opposto, |Δdata| ≤ 3 giorni, abbinamento greedy per vicinanza.
Marcati `isTransfer` + `transferGroupId`; esclusi da entrate/uscite nei report. Annullabili a mano.

**Migrazioni**: `database.ts` usa `db.version(n).stores().upgrade()`. Il formato backup ha una catena separata di
migrazioni (`domain/backup/migrations.ts`), così ogni backup vecchio si importa sempre.

## i18n

`i18next` + `react-i18next`, file `it.json`/`en.json` per sezione (`nav`, `home`, `tx`, `import`, `reports`,
`budget`, `backup`, `settings`, `categories`, `errors`, `common`). Lingua: scelta in Impostazioni → altrimenti
`navigator.language` → fallback `it`. Test automatico: stesse chiavi e stessi segnaposto `{{x}}` nei due file.
Date/numeri/valuta via `Intl` (`src/lib/format.ts`). Categorie predefinite: id stabile, nome tradotto con
`categories.<id>`; le personalizzate salvano il nome come scritto. Aggiungere una lingua = un nuovo JSON + una riga nell'elenco.

## Backup

Vedi [backup-format.md](backup-format.md). Indipendente dalla lingua: solo id stabili e valori numerici/ISO.

## Sicurezza e privacy

Nessun analytics, nessuna rete oltre ai file statici. PIN: PBKDF2 + salt in IndexedDB (non incluso nei backup).
Face ID: WebAuthn con autenticatore di piattaforma (sblocco locale; limiti documentati nel README).
