# CookReels V3 – Cloudflare Edition

## Was V3 kann
- Instagram-Reel-Link einfügen
- "Erkennen" startet die serverseitige Rezept-Erkennung
- Titel, Caption/Metadaten und – wenn ein AI-Key hinterlegt ist – Zutaten, Schritte, Kategorie, Zeit und Portionen werden strukturiert
- schönes Rezept-Detailfenster
- Favoriten, Löschen, Teilen
- lokale Speicherung auf dem Smartphone
- PWA-Installation

## Wichtig: V3 benötigt für die echte KI-Erkennung einen Backend-Key
Die Browser-App darf den OpenAI-Key nicht direkt enthalten. Deshalb liegt die Erkennung in `functions/api/recognize.js`.
Cloudflare Pages Functions laufen serverseitig. Setze dort ein Secret:
`OPENAI_API_KEY`

Optional:
`OPENAI_MODEL` (Standard: `gpt-5.6-luna`)

Ohne Key funktioniert weiterhin die Metadaten-/Heuristik-Erkennung, sofern Instagram öffentlich zugängliche Metadaten liefert.

## Cloudflare
Achtung: Cloudflare dokumentiert aktuell, dass Direct Upload für Pages Functions nicht unterstützt wird. Für V3 daher das Projekt über Git/Build deployen oder die Function als Worker veröffentlichen.
Siehe offizielle Cloudflare-Doku:
https://developers.cloudflare.com/pages/functions/get-started/
https://developers.cloudflare.com/pages/functions/

## Wenn du nur am Samsung arbeitest
Am einfachsten:
1. GitHub im Browser öffnen und ein neues Repository anlegen.
2. Den Inhalt dieses Ordners hochladen (nicht die ZIP als einzelne Datei).
3. Cloudflare Workers & Pages → Create → Pages → Git verbinden.
4. Repository auswählen.
5. Kein Build-Befehl nötig; Build-Verzeichnis ist `/`.
6. Nach dem Deploy in Cloudflare bei den Projekt-Settings die Secret-Variable `OPENAI_API_KEY` als Secret setzen.
7. Neu deployen.
8. Die `pages.dev`-Adresse in Chrome öffnen → Menü → "Installieren und Verknüpfung erstellen".

## Sicherheit
Den OpenAI-Key niemals in `index.html` eintragen oder im Frontend speichern. Nur als Cloudflare Secret verwenden.
