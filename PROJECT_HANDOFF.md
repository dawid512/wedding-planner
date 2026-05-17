# Project Handoff

Ten plik jest roboczym zrodlem prawdy dla kolejnego agenta AI i dla dalszych etapow pracy.

Zasada:

- po kazdej istotnej zmianie w architekturze, deployu, buildzie, strukturze plikow albo logice aplikacji ten plik trzeba zaktualizowac
- kolejny agent powinien zaczynac od przeczytania tego pliku, potem `README.md`, a dopiero potem kodu

## Snapshot

- Projekt: `Wedding Planner`
- Lokalizacja: `/Users/dawidmedrala/Documents/planner`
- Repo GitHub: `https://github.com/dawid512/wedding-planner`
- Data ostatniej aktualizacji tego pliku: `2026-05-17`
- Status: projekt przebudowany na `Vite + React`
- Status builda: `npm run build` zakonczony sukcesem `2026-05-17`
- Status deployu: workflow GitHub Pages przygotowany, ale repo nie jest jeszcze wypchniete na GitHub
- Status git: lokalny branch `main` istnieje i ma pierwszy commit `67d47bb`

## Co zostalo zrobione

1. Z surowego eksportu z Cloud Design zlozono normalne repo frontendowe.
2. Pierwotny eksport byl oparty o:
   `index.html` + CDN React + `@babel/standalone` + wiele plikow JSX opartych o globalne `window.*`.
3. Projekt zostal przekonwertowany do ukladu `Vite + React`:
   - dodano `package.json`
   - dodano `vite.config.js`
   - dodano `src/main.jsx`
   - przeniesiono kod aplikacji do katalogu `src/`
   - zamieniono globalne zaleznosci `window.*` na importy modulowe
4. Dodano workflow GitHub Actions do deployu na GitHub Pages:
   `.github/workflows/deploy.yml`
5. Dodano `README.md` z instrukcja lokalnego startu i deployu.
6. Zainstalowano zaleznosci npm, co utworzylo `package-lock.json` i lokalny katalog `node_modules/`.
7. Zweryfikowano build produkcyjny:

```bash
npm run build
```

Wynik:

- `dist/index.html`
- `dist/mobile-preview.html`
- `dist/assets/main-*.css`
- `dist/assets/main-*.js`

## Dlaczego tak zostalo zrobione

1. Uzytkownik chcial projekt "na JavaScript", a nie tymczasowy serwer Python.
2. `Vite + React` daje normalny workflow frontendowy:
   - `npm install`
   - `npm run dev`
   - `npm run build`
3. Taki uklad jest prostszy do dalszego rozwoju, podpiecia backendu i wspolpracy z innymi agentami.
4. GitHub Pages dobrze wspolpracuje z buildem z Vite oraz workflow GitHub Actions.
5. Konwersja byla robiona mozliwie zachowawczo:
   logika UI zostala zachowana, zmieniono glownie sposob ladowania i organizacji kodu.

## Aktualna struktura

- `index.html`
  glowny entrypoint aplikacji
- `mobile-preview.html`
  dodatkowa strona podgladu responsywnego
- `package.json`
  skrypty i zaleznosci
- `package-lock.json`
  lockfile npm
- `vite.config.js`
  konfiguracja Vite, obecnie z `base: "./"` i dwoma wejściami HTML
- `.github/workflows/deploy.yml`
  automatyczny build i deploy na GitHub Pages
- `src/main.jsx`
  bootstrap React i import stylow
- `src/app.jsx`
  glowna powloka aplikacji
- `src/auth.jsx`
  mock logowania, workspace'ow i wspoledytorow oparty o `localStorage`
- `src/core.jsx`
  dane startowe, helpery, podstawowe komponenty UI
- `src/pages-1.jsx`
  dashboard, tasks, budget, guests
- `src/pages-2.jsx`
  tables, vendors, schedule, menu, outfits, inspiration, gifts, honeymoon
- `src/pages-3.jsx`
  events, music, documents, payments
- `src/tweaks-panel.jsx`
  panel tweakow przeniesiony do modulow ES
- `src/styles.css`
  glowne style aplikacji

## Ważne decyzje techniczne

1. `vite.config.js` uzywa `base: "./"`.
   To zmniejsza ryzyko problemow ze sciezkami po wdrozeniu na GitHub Pages bez recznego ustawiania nazwy repo w configu.
2. Build ma dwa punkty wejscia:
   - `index.html`
   - `mobile-preview.html`
3. Workflow deployu uzywa `npm install`, a nie `npm ci`.
   Powod: repo ma juz `package-lock.json`, ale workflow byl ustawiony zachowawczo podczas przebudowy i ma byc bardziej odporny na pierwsze uruchomienia.
4. Konwersja z `window.*` do importow zostala zrobiona bez zmiany logiki domenowej.
   Jesli pojawia sie regresje, najpierw sprawdzic importy i eksporty, a nie sam UI.

## Stan funkcjonalny aplikacji

- UI planera dziala jako frontend React
- responsywny preview ma osobna strone
- build produkcyjny przechodzi
- projekt jest gotowy do uruchamiania lokalnie przez Vite

Obecne ograniczenia:

- logowanie jest tylko mockiem
- workspace'y sa tylko mockiem
- wspoledycja jest tylko symulowana
- dane trzymaja sie tylko w `localStorage`
- brak prawdziwego backendu
- brak prawdziwej autoryzacji

## Co jest do zrobienia teraz

1. Utworzyc zdalne repo na GitHubie.
2. Dodac `remote origin`.
3. Wypchnac lokalny branch `main`.
4. Wlaczyc `GitHub Actions` jako source dla `GitHub Pages`.
5. Potwierdzic, ze deploy przechodzi juz na GitHubie.

## Co warto zrobic pozniej

1. Dodac backend, jesli projekt ma miec prawdziwe logowanie i wspolne dane.
   Najbardziej naturalny nastepny krok: `Supabase`.
2. Rozwazyc podzial duzych plikow `pages-1.jsx`, `pages-2.jsx`, `pages-3.jsx` na mniejsze moduly.
3. Dodac testy lub przynajmniej smoke testy UI.
4. Rozwazyc uporzadkowanie nazewnictwa plikow:
   `pages-1`, `pages-2`, `pages-3` sa funkcjonalne, ale nie sa idealnie czytelne.
5. Opcjonalnie dodac ESLint i Prettier.

## Jak uruchomic projekt

```bash
cd /Users/dawidmedrala/Documents/planner
npm install
npm run dev
```

## Jak zweryfikowac build

```bash
cd /Users/dawidmedrala/Documents/planner
npm run build
```

## Jak czytac ten projekt jako kolejny agent

Zalecana kolejnosc:

1. Przeczytaj ten plik.
2. Przeczytaj `README.md`.
3. Sprawdz `package.json` i `vite.config.js`.
4. Wejdz do `src/main.jsx`, potem `src/app.jsx`.
5. Dopiero potem wchodz w `auth.jsx`, `core.jsx` i pliki `pages-*`.

## Dziennik zmian

### 2026-05-17

- utworzono repo robocze z eksportu Cloud Design
- przeanalizowano, ze pierwotna wersja byla Reactem ladowanym przez CDN i Babel w przegladarce
- przebudowano projekt do `Vite + React`
- dodano workflow deployu na GitHub Pages
- zainstalowano zaleznosci npm
- potwierdzono poprawny `npm run build`
- potwierdzono, ze istnieje lokalny pierwszy commit `67d47bb`
- utworzono ten plik handoff do dalszej pracy agentowej
