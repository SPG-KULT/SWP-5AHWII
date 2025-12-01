# Quiz App - Standalone Version

Diese Version der Quiz-App funktioniert **ohne Backend-Server**!

## 🎯 So verwendest du die App:

### Option 1: Direkt im Browser öffnen
1. Öffne die Datei `public/index.html` direkt in deinem Browser
2. Fertig! Die App lädt alle Fragen aus `public/questions.json`

### Option 2: Mit einem einfachen HTTP-Server
Wenn du einen lokalen Server bevorzugst:

```bash
# Mit Python
cd public
python3 -m http.server 8000

# Mit Deno
cd public  
deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts

# Mit VS Code Live Server Extension
# Rechtsklick auf index.html -> "Open with Live Server"
```

Dann öffne: http://localhost:8000

## 📦 Datenbank aktualisieren

Wenn du neue Fragen in der Datenbank hast, exportiere sie neu:

```bash
deno run -A export_questions_sqlite.ts
```

Das erstellt eine neue `public/questions.json` Datei mit allen aktuellen Fragen.

## 📊 Aktueller Stand

- ✅ 4702 Fragen exportiert
- ✅ 24 Kategorien verfügbar
- ✅ 3 Schwierigkeitsgrade (easy, medium, hard)

## 🚀 Vorteile dieser Lösung

- ✅ Kein Backend-Server nötig
- ✅ Funktioniert offline
- ✅ Schnelle Ladezeiten
- ✅ Einfach zu deployen (z.B. auf GitHub Pages, Netlify, etc.)
- ✅ Keine API-Calls während des Quiz
