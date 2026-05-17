# Wedding Planner

Repozytorium projektu planera slubnego.

Aktualna baza projektu:

- `React`
- `Vite`
- `TypeScript` dodany, migracja w toku
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
7. Dodano TypeScript do repo.
8. Dodano `tsconfig.json`, `npm run typecheck` i nowy bootstrap `src/main.tsx`.
9. Przeniesiono glowna powloke aplikacji do `src/app.tsx`.
10. Dodano startowa konfiguracje i loader pod `Google Identity Services`.
11. Migracja `src/auth.jsx` → `src/auth.tsx` (pelne typy TS).
12. Migracja `src/core.jsx` → `src/core.tsx` (interfejsy AppData, PageProps, etc.).
13. Migracja `src/pages-1.jsx` → `src/pages-1.tsx` (Dashboard, Tasks, Budget, Guests).
14. Zaktualizowano `src/app.tsx` do korzystania z typow AppData i DataUpdater z core.tsx.
15. `npm run typecheck` przechodzi bez bledow po migracji.

## Do zrobienia teraz

1. Migrowac pozostale pliki aplikacji z `jsx` do `tsx/ts`:
   `src/pages-2.jsx`, `src/pages-3.jsx`, `src/tweaks-panel.jsx`.
2. Podlaczyc `Google Identity Services` do obecnego flow logowania.
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
6. Wiekszosc kodu aplikacji nadal jest jeszcze w `jsx`, mimo dodanego toolingu TypeScript.
7. Konfiguracja Google jest dopiero przygotowana, ale nie jest jeszcze wpieta do UI logowania.
