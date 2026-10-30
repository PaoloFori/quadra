# Formato del file di backup

```json
{
  "app": "quadra",
  "schemaVersion": 1,
  "createdAt": "2026-10-30T09:00:00.000Z",
  "range": { "kind": "all" },
  "checksum": "sha256:<hex>",
  "data": {
    "accounts": [],
    "transactions": [],
    "categories": [],
    "rules": [],
    "budgets": [],
    "profiles": [],
    "settings": {}
  }
}
```

- `range.kind`: `all` | `month` (`value: "2026-03"`) | `year` (`value: "2026"`). Per mese/anno `transactions` contiene solo
  quel periodo, ma categorie, regole, budget, conti e profili sono sempre inclusi → il JSON di un anno si reimporta da solo.
- `checksum`: SHA-256 di `JSON.stringify(data)` con chiavi ordinate (canonico). Verificato prima dell'import.
- Nessun testo dipendente dalla lingua: categorie predefinite hanno id stabili (`groceries`, `rent`…) e senza `name`;
  importi in centesimi interi; date ISO. `settings.language` è `auto|it|en`.
- Non inclusi: PIN e credenziali Face ID (legati al dispositivo).

## Modalità di ripristino

- **Unisci**: aggiunge ciò che manca. Stesso `id` e contenuto identico → "già presente"; stesso `id` con contenuto diverso → "conflitto"
  (si tiene la versione locale salvo scelta contraria).
- **Sostituisci tutto**: svuota e scrive il contenuto del file, previa conferma.

## Compatibilità

`migrateBackup()` porta qualunque `schemaVersion` precedente a quella corrente con una catena di funzioni pure. Una versione
più nuova dell'app viene rifiutata con messaggio chiaro.

## Export CSV

Colonne: `date,account,amount,description,category,note,transfer` — importo decimale con punto, `category` = id stabile.
