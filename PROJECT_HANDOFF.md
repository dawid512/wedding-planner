# Project Handoff

To jest glowny plik przekazania projektu dla kolejnego agenta AI.

Jesli ten plik i `README.md` sa sprzeczne, pierwszenstwo ma ten plik.

## 1. Aktualna prawda o projekcie

1. Projekt zostaje w `React`.
2. Obecne repo `Vite + React` jest aktywna baza do dalszego rozwoju.
3. Docelowo projekt ma byc:
   - `React`
   - `TypeScript`
   - `Google OAuth / Google Identity Services`
   - `Google Drive API`
   - dane tylko w `Google Drive`
   - frontend-only
   - bez backendu
   - bez wlasnej bazy danych
   - bez wlasnych kont i hasel
4. Aktualny deploy na GitHub Pages dziala.

## 2. Repo i status

1. Nazwa projektu: `Wedding Planner`
2. Lokalny katalog:
   `/Users/dawidmedrala/Documents/planner`
3. Repo GitHub:
   `https://github.com/dawid512/wedding-planner`
4. Aktualna data aktualizacji tego pliku:
   `2026-05-17`
5. Obecny build lokalny:
   `npm run build` przechodzi
6. Obecny hosting:
   `GitHub Pages`
7. Obecny tooling TS:
   `typescript`, `@types/react`, `@types/react-dom`, `tsconfig.json`, `npm run typecheck`
8. Obecny stan Google auth:
   konfiguracja i loader GIS sa dodane, ale logowanie Google nie jest jeszcze wpiete do UI

## 3. Aktualna architektura docelowa

### Model aplikacji

1. SPA
2. frontend-only
3. brak backendu
4. brak wlasnej bazy danych
5. brak API po naszej stronie
6. source of truth tylko w `Google Drive`

### Frontend

1. `React`
2. `TypeScript` jest juz dodany i migracja jest w toku
3. `Vite`
4. `React Router` jesli bedzie potrzebny do podzialu modulow
5. prosty store Reactowy jest preferowany nad zbyt ciezkim state managementem

### Auth

1. `Google OAuth 2.0`
2. `Google Identity Services`
3. wymagany scope:
   `https://www.googleapis.com/auth/drive.file`
4. bez wlasnych kont
5. bez hasel
6. bez backendowego JWT

### Storage

1. wszystkie dane tylko w `Google Drive`
2. format: `JSON`
3. kazdy modul jako osobny plik

Docelowa struktura:

```text
/WeddingPlanner/
  /project-id/
    wedding.json
    guests.json
    budget.json
    tasks.json
    vendors.json
    tables.json
    notes.json
    settings.json
    locks/
    attachments/
```

### Sync

1. `online only`
2. fetch przed edycja
3. fetch po zapisie
4. porownanie `revisionId` albo `etag`
5. upload nowej wersji
6. preferowany tryb konfliktow:
   `block-write-on-conflict`

### Locki

1. soft lock
2. lock per modul, np. `guests.json`
3. heartbeat co `10-20s`
4. timeout `60-90s`
5. auto unlock po braku aktywnosci
6. readonly przy aktywnym locku
7. force unlock po wygasnieciu locka

Przykladowy lock:

```json
{
  "lockedBy": "google_user_id",
  "lockedAt": 123456,
  "expiresAt": 123499
}
```

## 4. Model danych

Kazdy rekord ma miec minimum:

```json
{
  "id": "uuid",
  "createdAt": 123456,
  "updatedAt": 123456,
  "version": 1
}
```

Zasady:

1. brak duplikacji ID
2. brak wielkich zagniezdzonych JSON-ow
3. modularne pliki per domena

## 5. Moduly domenowe

### Core

1. dashboard
2. checklisty
3. budzet
4. goscie
5. harmonogram
6. notatki
7. uslugodawcy
8. dokumenty

### Rozszerzenia

1. plan stolow
2. menu
3. muzyka
4. stroje
5. dekoracje
6. podroz poslubna
7. raporty

## 6. Co jest teraz w repo

1. `React`
2. mieszany stan `JSX + TS/TSX`
3. `localStorage` jako tymczasowy mock storage
4. mock auth/workspaces
5. brak prawdziwego Google login
6. brak Google Drive sync
7. brak prawdziwego lock engine
8. dzialajacy UI i deploy

Wniosek:

1. obecny kod jest dobra baza migracyjna
2. nie wyrzucamy go
3. migrujemy go iteracyjnie

## 7. Struktura repo

1. `index.html`
   glowny entrypoint
2. `mobile-preview.html`
   dodatkowy preview responsywny
3. `package.json`
   skrypty i zaleznosci
4. `package-lock.json`
   lockfile npm
5. `vite.config.js`
   konfiguracja Vite
6. `.github/workflows/deploy.yml`
   workflow GitHub Pages
7. `src/main.tsx`
   bootstrap React po migracji na TypeScript
8. `src/app.tsx`
   glowna powloka aplikacji (zmigrowana do TS)
9. `src/auth.tsx`
   mock auth/workspace oparty o `localStorage` (zmigrowany do TS)
10. `src/core.tsx`
    dane startowe, helpery, komponenty bazowe, typy domenowe (zmigrowany do TS)
11. `src/pages-1.tsx`
    dashboard, tasks, budget, guests (zmigrowany do TS)
12. `src/pages-2.jsx`
    tables, vendors, schedule, menu, outfits, inspiration, gifts, honeymoon
13. `src/pages-3.jsx`
    events, music, documents, payments
14. `src/tweaks-panel.jsx`
    panel tweakow
15. `src/styles.css`
    glowne style
16. `src/vite-env.d.ts`
    deklaracje typow Vite
17. `src/types/project.ts`
    start wspolnych typow domenowych
18. `tsconfig.json`
    konfiguracja TypeScript dla migracji etapowej
19. `.env.example`
    przykladowe zmienne srodowiskowe dla integracji Google
20. `src/config/app-config.ts`
    centralna konfiguracja runtime dla Google client id i nazwy folderu aplikacji
21. `src/lib/google-identity.ts`
    loader skryptu Google Identity Services
22. `src/types/google-identity.d.ts`
    deklaracje typow dla `window.google`

## 8. Zrobione

1. Przeniesiono eksport z Cloud Design do uporzadkowanego repo.
2. Przebudowano projekt do `Vite + React`.
3. Dodano lokalny workflow developerski przez `npm`.
4. Dodano i poprawiono deploy na GitHub Pages.
5. Zweryfikowano, ze `npm run build` przechodzi.
6. Opublikowano dzialajaca wersje na GitHub Pages.
7. Ustalono finalnie, ze projekt zostaje w React.
8. Utworzono i utrzymujemy ten plik handoff.
9. Dodano TypeScript do repo.
10. Dodano `main.tsx`, `tsconfig.json` i `npm run typecheck`.
11. Potwierdzono, ze `npm run build` i `npm run typecheck` przechodza po dodaniu TS.
12. Przeniesiono glowna powloke aplikacji z `app.jsx` do `app.tsx`.
13. Dodano startowa warstwe pod Google Identity Services:
    - `.env.example`
    - `src/config/app-config.ts`
    - `src/lib/google-identity.ts`
    - `src/types/google-identity.d.ts`
14. Zmigrowano `src/auth.jsx` → `src/auth.tsx`:
    - pelne typy: `User`, `Collaborator`, `Workspace`, `AuthState`, `AuthResult`
    - eksportowany interfejs `AuthState` do uzycia w innych modulach
15. Zmigrowano `src/core.jsx` → `src/core.tsx`:
    - pelne interfejsy domenowe: `AppData`, `Task`, `Guest`, `BudgetItem`, `Vendor`, `OutfitItem` i pozostale
    - eksportowane typy `PageProps` i `DataUpdater` do uzycia przez strony
    - typowany `Icon` z `IconName` union type
16. Zmigrowano `src/pages-1.jsx` → `src/pages-1.tsx`:
    - `PageDashboard`, `PageTasks`, `PageBudget`, `PageGuests`, `PageHeader`
    - pelne typy propsow i update funkcji
17. Zaktualizowano `src/app.tsx` do typow z core.tsx (`AppData`, `DataUpdater`).
18. `npm run typecheck` przechodzi bez bledow.

## 9. Do zrobienia teraz

1. Migrowac pozostale pliki z `jsx` do `tsx/ts`:
   - `src/pages-2.jsx`
   - `src/pages-3.jsx`
   - `src/tweaks-panel.jsx`
2. Wpiac `Google Identity Services` do obecnego flow logowania.
4. Dodac warstwe `Google Drive API`.
5. Zaprojektowac warstwy:
   - `auth`
   - `google-drive`
   - `sync-engine`
   - `locks`
   - `project-files`
6. Zdefiniowac kontrakty JSON:
   - `wedding.json`
   - `guests.json`
   - `budget.json`
   - `tasks.json`
   - `vendors.json`
   - `tables.json`
   - `notes.json`
   - `settings.json`
7. Zaimplementowac onboarding:
   login Google -> create/find folder -> initialize files -> dashboard
8. Zaimplementowac MVP:
   - dashboard
   - checklisty
   - budzet
   - goscie
   - sync JSON
   - soft locks

## 10. Do zrobienia pozniej

1. Przeniesc pozostale moduly na nowa warstwe danych.
2. Dodac upload zalacznikow do `attachments/`.
3. Dodac lepsza obsluge konfliktow i komunikaty UX.
4. Rozwazyc porzadniejszy podzial duzych plikow `pages-*`.
5. Rozwazyc ESLint i Prettier po ustabilizowaniu migracji.

## 11. Czego nie robic

1. Nie rozwijac dalej `localStorage` jako docelowego source of truth.
2. Nie dodawac backendu.
3. Nie dodawac wlasnych kont i hasel.
4. Nie budowac realtime websocketow.
5. Nie opierac architektury o jeden wielki JSON.

## 12. Jak zaczac jako kolejny agent

1. Przeczytaj ten plik.
2. Potem przeczytaj `README.md`.
3. Sprawdz `package.json` i `vite.config.js`.
4. Zrozum, ze obecne `auth.jsx` i `localStorage` sa przejsciowe.
5. Traktuj obecny UI jako baze do ewolucyjnej migracji.

## 13. Dziennik zmian

### 2026-05-17

1. Uporzadkowano eksport z Cloud Design.
2. Zmieniono projekt na `Vite + React`.
3. Dodano dzialajacy deploy na GitHub Pages.
4. Potwierdzono dzialajacy build.
5. Ustalono, ze projekt zostaje w React.
6. Uporzadkowano dokumentacje i handoff pod aktualny kierunek.
7. Dodano TypeScript i rozpoczeto migracje kodu etapami.
8. Dodano startowa konfiguracje pod Google Identity Services.
9. Zmigrowano `auth.jsx`, `core.jsx`, `pages-1.jsx` do TypeScript.
10. Zaktualizowano `app.tsx` do nowych typow.
11. `npm run typecheck` przechodzi bez bledow.
