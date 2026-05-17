# Wedding Planner

To jest juz normalny projekt JavaScriptowy oparty o `Vite + React`.

Nie potrzebujesz Pythona do pracy nad aplikacja. Wczesniej wspomniany `python3 -m http.server` byl tylko awaryjnym sposobem na szybkie otwarcie statycznych plikow. Teraz projekt dziala tak, jak typowy frontend:

- `npm install`
- `npm run dev`
- `npm run build`

## Stack

- `Vite`
- `React 18`
- `CSS`
- `GitHub Actions` do deployu na `GitHub Pages`

## Handoff dla AI

Pelny stan projektu, decyzje techniczne, lista zrobionych rzeczy i kolejne kroki sa utrzymywane w:

- `PROJECT_HANDOFF.md`

Kazdy kolejny agent powinien zaczynac od tego pliku.

## Struktura

- `index.html` - glowny punkt wejscia aplikacji
- `mobile-preview.html` - dodatkowy podglad mobile/desktop
- `src/` - komponenty, logika i style
- `.github/workflows/deploy.yml` - automatyczny deploy na GitHub Pages

## Start lokalnie

1. Wejdz do katalogu projektu:

```bash
cd /Users/dawidmedrala/Documents/planner
```

2. Zainstaluj zaleznosci:

```bash
npm install
```

3. Uruchom projekt developersko:

```bash
npm run dev
```

4. Vite poda Ci lokalny adres, zwykle:

```text
http://localhost:5173/
```

Podglad responsywny bedzie pod:

```text
http://localhost:5173/mobile-preview.html
```

## Build produkcyjny

```bash
npm run build
```

Gotowe pliki trafia do katalogu `dist/`.

## Jak wrzucic to na GitHuba

1. Utworz nowe puste repo na GitHubie.
2. W terminalu wykonaj:

```bash
cd /Users/dawidmedrala/Documents/planner
git add .
git commit -m "Initial Vite React setup for wedding planner"
git remote add origin https://github.com/TWOJ_LOGIN/wedding-planner.git
git push -u origin main
```

## Jak wlaczyc GitHub Pages

Po pushu:

1. Otworz repo na GitHubie.
2. Wejdz w `Settings` -> `Pages`.
3. W `Source` wybierz `GitHub Actions`.
4. Workflow z repo sam zbuduje i opublikuje projekt.

Po chwili dostaniesz adres strony w stylu:

`https://TWOJ_LOGIN.github.io/wedding-planner/`

## Wazne ograniczenie obecnej wersji

UI logowania i wspoledycji nadal jest tylko frontendowym mockiem zapisanym w `localStorage`.

To znaczy:

- dane nie synchronizuja sie miedzy urzadzeniami
- logowanie nie jest prawdziwym systemem kont
- zaproszenia i wspolpraca nie maja backendu

Jesli chcesz, nastepnym krokiem moge Ci tez przygotowac wersje z prawdziwym backendem, np. pod `Supabase`.
