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
16. Migracja `src/pages-2.jsx` → `src/pages-2.tsx` (Tables, Vendors, Schedule, Menu, Outfits, Inspiration, Gifts, Honeymoon).
17. Migracja `src/pages-3.jsx` → `src/pages-3.tsx` (Events, Music, Documents, Payments).
18. Migracja `src/tweaks-panel.jsx` → `src/tweaks-panel.tsx` (pelne typy TS dla wszystkich komponentow).
19. Naprawiono bug: pole daty na Dashboardzie nie przyjmowalo edycji (wartosc ISO zamiast sformatowanej).
20. Naprawiono bug: pole budżetu całkowitego przyjmowało litery — dodano `type="number"`.
21. `npm run typecheck` przechodzi bez bledow po pelnej migracji.
22. Dodano typy gości: `Dorosły` (100%), `Dziecko 50%`, `Dziecko bezpłatne` (0%).
23. Dodano `VenueSettings`: cena talerzyk (sala), cena talerzyk (poprawiny), zaliczka.
24. Dodano kalkulator kosztów sali z rozbiciem na typy gości i potrąceniem zaliczki.
25. Dodano checkbox `Poprawiny` dla każdego gościa + licznik w statystykach.
26. Obsługa weselna obsługuje ten sam mechanizm cenowy (100% lub 50%).
27. Naprawiono pole daty na Dashboardzie (bezpośredni `<input type="date">`).
28. Naprawiono pole budżetu całkowitego — filtrowanie nieliczbowych znaków w `onChange`.
29. Naprawiono Vite resolve extensions — `.tsx` ma wyższy priorytet niż `.jsx`.
30. Usunięto stare pliki `.jsx` zastąpione przez `.tsx`.
31. Zaimplementowano Google OAuth 2.0 (Google Identity Services Token Client) w `src/auth.tsx`.
32. Utworzono `src/lib/google-drive.ts` — wrapper Drive API (getUserInfo, findOrCreateFolder, findFile, readJsonFile, createJsonFile, updateJsonFile).
33. Zastąpiono mock auth/localStorage prawdziwym logowaniem Google + zapisem danych w Google Drive.
34. Zaktualizowano typy `google.accounts.oauth2` w `src/types/google-identity.d.ts`.
35. `AuthScreen` pokazuje przycisk „Zaloguj przez Google" lub instrukcję konfiguracji gdy brak Client ID.
36. `npm run typecheck` przechodzi bez błędów.

## Do zrobienia teraz

1. Skonfigurować `VITE_GOOGLE_CLIENT_ID` w `.env.local` (Google Cloud Console → Credentials).
2. Dodać token refresh — aktualny token GIS wygasa po 1 godz. (automatycznie przez `requestToken`).
3. Rozbić `wedding-data.json` na osobne pliki domenowe (`guests.json`, `budget.json`, itd.).
4. Dodać soft locks per moduł + heartbeat.
5. Dodać lepszą obsługę konfliktów (block-write-on-conflict).
6. Dodać zapraszanie współedytorów przez Google Drive sharing.

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

1. Wymaga skonfigurowania `VITE_GOOGLE_CLIENT_ID` w `.env.local`.
2. Token GIS wygasa po 1 godz. — brak automatycznego odświeżania w tle.
3. Wszystkie dane w jednym pliku `wedding-data.json` (brak podziału domenowego).
4. Brak soft locks i sync engine.
5. Brak zapraszania współedytorów (coming soon).
