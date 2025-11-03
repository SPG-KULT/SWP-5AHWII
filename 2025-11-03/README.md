# Deno Projekt — 2025-11-03

Kurzanleitung

- Start lokal: `deno run -A main.ts`
- Oder via Task: `deno task start`

Dieses Projekt ist minimal gehalten. Bei Bedarf kann ich eine HTTP-Server-Variante oder Import-Map hinzufügen.

## OpenTDB Token

Um die OpenTDB API zu verwenden, brauchst du ein Session-Token. Ich habe ein Skript `fetch_token.ts` hinzugefügt, das ein Token anfordert und in `opentdb_token.json` speichert.

- Token abrufen:

```zsh
cd 2025-11-03
deno run -A fetch_token.ts
```

- Der Token wird in `2025-11-03/opentdb_token.json` gespeichert.

Hinweis: OpenTDB-Token sind nicht geheime API-Keys, sondern Session-Tokens, die verwendet werden, um doppelte Fragen bei wiederholten Anfragen zu vermeiden. Du kannst den Token später benutzen, indem du `token=...` als Query-Parameter in den Frage-URLs übergibst.

### Fragen abrufen (alle Kategorien)

Das Script `fetch_questions.ts` akzeptiert eine OpenTDB-URL als Argument. Wenn du keine URL angibst, verwendet es standardmäßig `amount=50` ohne Kategorie-Filter (also alle Kategorien):

```zsh
# Standard (50 Fragen, alle Kategorien):
deno run -A fetch_questions.ts

# Oder eigene URL (z. B. 10 Fragen, beliebige Einstellungen):
deno run -A fetch_questions.ts "https://opentdb.com/api.php?amount=10&difficulty=easy"
```

Das Script hängt automatisch den gespeicherten Token als `token=...` Parameter an.
