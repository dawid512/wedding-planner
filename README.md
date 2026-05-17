# Wedding Planner

Repozytorium projektu planera slubnego.

Aktualna baza projektu:

- `React`
- `Vite`
- docelowo `TypeScript`
- `GitHub Pages` do hostingu
- docelowo `Google OAuth + Google Drive API` jako auth i storage

Aktualny adres repo:

- `https://github.com/dawid512/wedding-planner`

Aktualny cel:

- rozwijamy obecne repo Reactowe
- odchodzimy od mockow `localStorage`
- wdrazamy prawdziwe logowanie Google i zapis danych w Google Drive

Najwazniejszy plik dla kolejnych agentow:

- `PROJECT_HANDOFF.md`

Jesli `README.md` i `PROJECT_HANDOFF.md` sa sprzeczne, pierwszenstwo ma `PROJECT_HANDOFF.md`.

## Co jest teraz

- dzialajacy frontend `Vite + React`
- dzialajacy deploy na `GitHub Pages`
- obecny model danych i auth sa jeszcze mockowe
- dane sa trzymane lokalnie w `localStorage`

## Zrobione

1. Uporzadkowano eksport z Cloud Design do repo `Vite + React`.
2. Dodano build i lokalne uruchamianie przez `npm`.
3. Dodano workflow deployu na GitHub Pages.
4. Opublikowano projekt na GitHub Pages.
5. Utworzono i utrzymujemy `PROJECT_HANDOFF.md`.
6. Ustalono docelowy kierunek: `React + TypeScript + Google OAuth + Google Drive API`.

## Do zrobienia teraz

1. Dodac `TypeScript` do obecnego repo i zaczac migracje plikow z `jsx` do `tsx/ts`.
2. Dodac `Google Identity Services`.
3. Dodac warstwe `Google Drive API`.
4. Zdefiniowac kontrakty plikow JSON:
   `wedding.json`, `guests.json`, `budget.json`, `tasks.json`, `vendors.json`, `tables.json`, `notes.json`, `settings.json`.
5. Zaimplementowac onboarding:
   login Google -> create/find folder -> initialize files -> dashboard.
6. Zaimplementowac MVP syncu i lockow.

## Lokalny start

```bash
cd /Users/dawidmedrala/Documents/planner
npm install
npm run dev
```

Domyslnie Vite wystawi aplikacje zwykle pod:

```text
http://localhost:5173/
```

Podglad responsywny:

```text
http://localhost:5173/mobile-preview.html
```

## Build

```bash
npm run build
```

Artefakty trafiaja do `dist/`.

## Deploy

Deploy odbywa sie przez `GitHub Actions` do `GitHub Pages`.

## Aktualne ograniczenia

1. Brak prawdziwego Google login.
2. Brak integracji z Google Drive.
3. Brak prawdziwego sync engine.
4. Brak lock systemu.
5. `localStorage` nadal jest przejsciowym source of truth.
