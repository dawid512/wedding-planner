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
   `2026-05-19`
5. Obecny build lokalny:
   `npm run build` przechodzi
6. Obecny hosting:
   `GitHub Pages`
7. Obecny tooling TS:
   `typescript`, `@types/react`, `@types/react-dom`, `tsconfig.json`, `npm run typecheck`
8. Obecny stan Google auth:
   Google OAuth 2.0 (GIS Token Client) jest w pełni zaimplementowany — `src/auth.tsx`, `src/lib/google-drive.ts`, `src/lib/google-picker.ts`.
   `VITE_GOOGLE_CLIENT_ID` i `VITE_GOOGLE_PICKER_API_KEY` skonfigurowane w `.env.local` (lokalnie) i w GitHub Secrets (deploy).

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
2. pelny `TypeScript` — wszystkie pliki `src/` zmigrowane do `.tsx/.ts`
3. prawdziwe Google OAuth 2.0 (GIS Token Client) — zamiast mock auth z `localStorage`
4. zapis i odczyt danych z `Google Drive` — plik `wedding-data.json` per użytkownik
5. multi-workspace — użytkownik ma własny plan + może dołączyć do wielu gościnnych; przełączanie w sidebar i UserMenu
6. system zapraszania — wyłącznie email przez Drive API; brak linków `?join=`; auto-discovery przez `listSharedFiles`
7. `user-config.json` — lista udostępnionych planów przechowywana w Drive użytkownika (cross-device, cross-browser)
8. zarządzanie rolami — właściciel zmienia Edytor↔Podgląd i usuwa osoby z InviteModal
9. Google Picker — fallback gdy użytkownik chce ręcznie znaleźć plik
10. workspace switcher w UserMenu — kliknięcie awatara → lista planów + możliwość przełączania
11. **soft edit lock** — `_editLock: { email, lockedAt }` w `wedding-data.json`; TTL 10 min; ostrzeżenie 8 min; `acquireLock` używa strategii write-then-verify (read → check → write → 350 ms → re-read → verify lockedAt nonce) — wykrywa race condition bez If-Match (Drive nie obsługuje If-Match na media upload endpoincie)
12. brak sync engine i per-module locks (do zrobienia)
12. brak podziału na osobne pliki domenowe (wszystko w `wedding-data.json`)
13. dzialajacy UI i deploy

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
   Google OAuth 2.0 (GIS Token Client) — logowanie Google, zapis/odczyt z Drive
10. `src/core.tsx`
    dane startowe, helpery, komponenty bazowe, typy domenowe (zmigrowany do TS)
11. `src/pages/` — **aktualny katalog stron** (od 2026-05-19):
    - `_shared.tsx` — PageHeader, DateInput (komponent daty z przyciskiem × do czyszczenia)
    - `index.ts` — barrel re-export
    - `dashboard.tsx`, `tasks.tsx`, `budget.tsx`, `guests.tsx`, `tables.tsx`, `vendors.tsx`, `schedule.tsx`, `menu.tsx`, `outfits.tsx`, `inspiration.tsx`, `gifts.tsx`, `honeymoon.tsx`, `events.tsx`, `music.tsx`, `documents.tsx`, `payments.tsx`
    - `pages-1.tsx` / `pages-2.tsx` / `pages-3.tsx` — USUNIĘTE (usunął użytkownik 2026-05-19)
12. `CODEBASE.md` — mapa kodu dla agenta AI (struktura plików, typy, flow zapisu, jak dodać stronę)
14. `src/tweaks-panel.tsx`
    panel tweakow (zmigrowany do TS)
15. `src/styles.css`
    glowne style
16. `src/vite-env.d.ts`
    deklaracje typow Vite
17. `src/types/project.ts`
    start wspolnych typow domenowych
18. `src/lib/google-drive.ts`
    wrapper Google Drive REST API: getUserInfo, findOrCreateFolder, findFile, readJsonFile, createJsonFile, updateJsonFile, shareFile, listPermissions, removePermission
19. `src/lib/google-picker.ts`
    wrapper Google Picker API: loadGapi, loadPickerLib, openFilePicker — zwraca {fileId, fileName} wybranego pliku
20. `tsconfig.json`
    konfiguracja TypeScript dla migracji etapowej
21. `.env.example`
    przykladowe zmienne srodowiskowe dla integracji Google
22. `src/config/app-config.ts`
    centralna konfiguracja runtime: googleClientId, googleAppFolderName, googlePickerApiKey
23. `src/lib/google-identity.ts`
    loader skryptu Google Identity Services
24. `src/types/google-identity.d.ts`
    deklaracje typow dla `window.google`

## 8. Zrobione (skrót — pełna historia w sekcji 13)

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
19. Zmigrowano `src/pages-2.jsx` → `src/pages-2.tsx`:
    - `PageTables`, `PageVendors`, `PageSchedule`, `PageMenu`, `PageOutfits`, `PageInspiration`, `PageGifts`, `PageHoneymoon`
    - pelne typy propsow, union typy dla kluczy, `OutfitListKey`, `MenuKey`, `HoneymoonKey`
20. Zmigrowano `src/pages-3.jsx` → `src/pages-3.tsx`:
    - `PageEvents`, `PageMusic`, `PageDocuments`, `PagePayments`
    - `MusicListKey`, `MusicScalarKey`, `PersonKey`, `WitnessKey`, `PersonField`, `CeremonyField`
21. Zmigrowano `src/tweaks-panel.jsx` → `src/tweaks-panel.tsx`:
    - pelne typy dla: `useTweaks`, `TweaksPanel`, `TweakSection`, `TweakRow`, `TweakSlider`, `TweakToggle`, `TweakRadio`, `TweakSelect`, `TweakText`, `TweakNumber`, `TweakColor`, `TweakButton`
    - typy: `TweakOptionPrimitive`, `TweakOptionObj`, `TweakOption`, `TweakColorOption`, `TweakRecord`
22. Naprawiono bug: pole daty na Dashboardzie — w trybie edycji przekazywano sformatowany string zamiast ISO `YYYY-MM-DD`.
23. Naprawiono bug: pole budzetu calkowitego — dodano `type="number"` aby blokowac wpisywanie liter.
24. `npm run typecheck` przechodzi bez bledow po pelnej migracji JSX→TSX.
25. Dodano `GuestType` (`adult` / `child_half` / `child_free`) zastepujacy `child: boolean`.
26. Dodano `poprawiny: boolean` na gosciu — checkbox w tabeli + licznik w statystykach.
27. Dodano `VenueSettings` (`platePrice`, `afterPartyPlatePrice`, `deposit`) w `AppData`.
28. Kalkulator kosztów sali w `PageGuests`: rozbicie na typy gosci, potrącenie zaliczki, sekcja poprawin.
29. Obsluga weselna (`side === "Obsługa"`) obsługuje ten sam system cenowy.
30. Naprawiono bug: pole daty Dashboard — bezposredni `<input type="date">`.
31. Naprawiono bug: pole budzetu calkowitego — filtrowanie nieliczbowych znakow.
32. Naprawiono Vite resolve extensions — `.tsx` ma teraz wyzszy priorytet niz `.jsx`.
33. Usunieto stare pliki `.jsx` (zastapione przez `.tsx`): `auth`, `core`, `pages-1/2/3`, `tweaks-panel`.
34. Dodano typy `google.accounts.oauth2` (TokenClient, TokenClientConfig, TokenResponse) do `src/types/google-identity.d.ts`.
35. Utworzono `src/lib/google-drive.ts` — wrapper Google Drive REST API.
36. Przepisano `src/auth.tsx` — zastąpiono mock email/hasło prawdziwym Google OAuth 2.0 (GIS Token Client).
37. `AuthScreen` pokazuje przycisk „Zaloguj się przez Google" (z SVG Google logo).
38. Po zalogowaniu: GIS daje token → getUserInfo → find/create folder WeddingPlanner → find/create wedding-data.json → wczytanie AppData.
39. `updateActiveData()` → natychmiastowa aktualizacja stanu + asynchroniczny upload do Drive.
40. Przywracanie sesji przy odświeżeniu przez `requestToken({ prompt: '' })` z timeoutem 12s.
41. `InviteModal` i `UserMenu` zaktualizowane — wyświetlają awatar Google, info o planie.
42. `npm run typecheck` przechodzi bez błędów po pełnej implementacji Google auth.
43. Dodano `shareFile`, `listPermissions`, `removePermission` do `src/lib/google-drive.ts`.
44. Utworzono `src/lib/google-picker.ts` — Google Picker API (użytkownik wybiera plik Drive → app ma pełny read+write).
45. Dodano `googlePickerApiKey` do `src/config/app-config.ts` i `VITE_GOOGLE_PICKER_API_KEY` do `deploy.yml`.
46. Zaimplementowano `PickerScreen` w `src/auth.tsx` — ekran z przyciskiem "Otwórz plik" gdy brak bezpośredniego dostępu.
47. Zaimplementowano uproszczony flow join: `?join=FILEID` w URL → próba bezpośredniego odczytu → jeśli 403 → PickerScreen.
48. Uproszczono `InviteModal`: główna akcja = kopiuj link, email Drive = opcjonalny `<details>` na dole.
49. InviteModal performance fix: `useMemo` + `useCallback` w `useAuth()` → brak zbędnych re-renderów.
50. `npm run typecheck` przechodzi bez błędów.
51. **Multi-workspace**: `allWs: Workspace[]` w stanie — własny plan (myRole: "Właściciel") + plany gościnne z localStorage `wp_g_guest_plans`.
52. **Naprawiono join flow**: email przez Drive API jest obowiązkowy żeby plik trafił do Drive gościa; link `?join=FILEID` to skrót — działa po zaproszeniu emailem.
53. **Role per workspace**: każdy `Workspace` ma `myRole: "Właściciel" | "Edytor" | "Podgląd"`. `canEdit` i `isGuest` pochodne.
54. **Workspace switcher** w sidebar — widoczny gdy `myWorkspaces.length > 1`. Pokazuje skróty roli (Wł/Ed/Pp).
55. **InviteModal redesign**: formularz emailowy jest PRIMARY; link pomocniczy; role dropdown + usuń per collaborator.
56. **updatePermission** w `google-drive.ts` — PATCH /files/{id}/permissions/{pid} do zmiany roli.
57. **clearSession(fullClear?)** — bez arg: zachowuje `wp_g_guest_plans`; `fullClear=true` (logout): czyści wszystko.
58. Eksportowany typ `Workspace` z `auth.tsx` — używany w `app.tsx`.
59. **Fix: "Brak planu" flash** — `setSession` przeniesiony na koniec `bootstrapDrive`, wywoływany atomicznie z `setAllWs` + `setActiveWsId` (React 18 batchuje → jeden render bez pośredniego stanu bez workspace).
60. **Fix: 404 stale file ID** — `bootstrapOwnPlan` catch: czyści oba klucze LS (`wp_g_file_id` + `wp_g_folder_id`) i robi pełny re-bootstrap (findOrCreateFolder → findFile → createJsonFile → readJsonFile).
61. **Fix: Picker 401** — dodano `_tokenAge` ref (timestamp ustawienia tokenu); `PickerScreen.openPicker` sprawdza wiek tokenu (>55 min = zrozumiały błąd zamiast cichego 401 z Pickera).
62. `npm run typecheck` przechodzi bez błędów po wszystkich fix-ach.
63. **Zmieniono scope OAuth z `drive.file` na `drive`** — kluczowa poprawka invite flow. `drive.file` scope nie pozwala na odczyt plików udostępnionych przez Drive API (zwraca 404) i blokuje Picker (zwraca 401 bo nie może listować "Shared with me"). Scope `drive` daje pełny read/write do Drive użytkownika, co jest standardem dla aplikacji kolaboracyjnych.
64. **Naprawiono odświeżanie roli gościa** — przy każdym logowaniu `getFileCapabilities` sprawdza aktualną rolę z Drive i aktualizuje localStorage. Zmiana Edytor→Podgląd przez właściciela jest widoczna po przelogowaniu gościa.
65. **Auto-discovery shared plans** — po zalogowaniu `listSharedFiles` (sharedWithMe=true) wykrywa udostępnione plany Drive bez potrzeby linka `?join=FILEID`. Gość widzi plan właściciela po zwykłym logowaniu.
66. **Fix: updateActiveData 403** — zamieniono `listPermissions`/`perms.find` na `getFileCapabilities` w obsłudze 403 przy zapisie. `capabilities.canEdit` jest autorytatywnym sprawdzeniem roli.
67. **Przycisk "Zaproś" tylko dla właściciela** — zarówno w topbar jak i mobile topbar, przycisk Zaproś jest widoczny tylko gdy `auth.myRole === "Właściciel"`. Gość i Edytor nie widzą opcji zapraszania.
68. **Fix: auto-discovery shared plans** — query w `listSharedFiles` zmieniono z `name='...' and sharedWithMe=true and trashed=false` na `name='...' and trashed=false`. Pliki udostępnione przez Drive API permissions endpoint nie zawsze pojawiają się w kolekcji "Shared with me" w Drive (są dostępne, ale nie zawsze indeksowane tam). Caller filtruje własny plik przez `alreadyKnown` check.
69. **Fix: aktywny workspace persystuje przez refresh** — `switchWorkspace` zapisuje wybrany wsId do `localStorage` pod kluczem `wp_g_active_ws_id`. `bootstrapDrive` przywraca go przy logowaniu/silent restore (priorytet: `?join=` > saved > ownWs). `clearSession` czyści klucz przy wylogowaniu.
70. **Fix: InviteModal lag** — owinięto w `React.memo` (re-render tylko gdy `auth` lub `onClose` zmienią referencję). Wszystkie handlery (`handleInvite`, `handleRoleChange`, `handleRemove`, `copyLink`) owinięto w `useCallback`. `useEffect` dla permisji uruchamia się raz przy montowaniu (`[]` deps + cleanup flaga `cancelled`), nie re-triggeruje przy każdym re-renderze parenta. `onClose` w `app.tsx` stabilizowany przez `useCallback`.

## 9. Do zrobienia teraz

### Priorytety od właściciela (lista od 2026-05-19)

1. ~~**Refaktoryzacja i nawigacja po kodzie**~~ ✅ ZROBIONE (2026-05-19) — `src/pages/` (16 komponentów stron + `_shared.tsx` + `index.ts`), `CODEBASE.md`, `app.tsx` importuje z `./pages`, typecheck 0 błędów. `pages-1/2/3.tsx` — deprecated, usunąć ręcznie.
2. ~~**UI / mobile**~~ ✅ ZROBIONE (2026-05-19) — tabele scrollują poziomo w kartach (nie wylewają poza stronę), `overflow-x: hidden` na `html/body/main`, touch-targety ≥ 44px, task-lista wrappuje ≤640px, KPI 2-kolumny na telefonie, hero kompaktowy, modal bottom-sheet ≤480px, `.mb-24` utility.
2. **UI / mobile** — poprawić ogólny wygląd, uzupełnić brakujące stylowanie dla wersji mobilnej (PC skaluje się dobrze). Sprawdzić breakpointy, inputy, modalne na małych ekranach.
3. ~~**Pola daty na telefonie**~~ ✅ ZROBIONE (2026-05-19) — `DateInput` w `_shared.tsx` z przyciskiem `×`; zaktualizowane: `dashboard.tsx`, `tasks.tsx`, `payments.tsx`, `events.tsx`, `documents.tsx`.
4. **Fix blokady edycji (KRYTYCZNY)** — nadal 2 użytkowników może edytować naraz. Obecna implementacja write-then-verify (350 ms delay) nie działa w praktyce. Wymaga innego podejścia — np. oddzielny plik `wedding-lock.json` lub polling przed edycją.
5. ~~**Strona Budżet — koszty automatyczne**~~ ✅ ZROBIONE (2026-05-19) — `calcVenueCosts()` w `core.tsx`; auto-wiersz "Sala weselna" w `budget.tsx`; wliczony do sum `plannedAll`/`actualAll`.
6. **Lista Gości — domyślne dane startowe** — przy pierwszym uruchomieniu (pusta lista) defaultowo tworzyć: stół "Para Młoda" z 2 osobami (Pan Młody, Pani Młoda), potem standardowe "Stół 1", "Stół 2" itd. jako sugestia.
7. ~~**Lista Gości — uproszczenie**~~ ✅ ZROBIONE (2026-05-19) — `plusone`, `needsTransport`, `giftReceived` usunięte z `Guest` interface, `EMPTY_DATA` i `addGuest`.
8. ~~**Lista Gości — parowanie gości**~~ ✅ ZROBIONE (2026-05-19) — `partnerId?: string` w `Guest`, `pair`/`unpair`, `buildOrderedGuests`, badge ↔, plan stołów też.
9. **Plan stołów — domyślny stół pary młodej** — domyślnie przypisać Pan Młody + Pani Młoda do stołu "Para Młoda" (2-osobowy). Spójne z domyślnymi danymi z pkt 6.
10. **Menu boczne** — usunąć z sidebar: "Współedytorzy · 1" i "Zaproś osobę". Zarządzanie dostępem zostaje tylko w UserMenu (avatar).
11. **Obsługa zdjęć i grafik** — upload do folderu na Google Drive osoby edytującej; w `wedding-data.json` właściciela zapisywać file ID lub URL (nie base64, nie blob). Strategia: każdy user uploaduje do swojego `WeddingPlanner/attachments/`; linki współdzielone przez permissions Drive.
12. **Domyślny plan przy starcie** — checkbox w ustawieniach: "Otwieraj domyślnie ten plan" (zapamiętany w `user-config.json`). Przy bootstrapDrive jeśli ustawiony — aktywować wskazany plan zamiast własnego.
13. **RODO / cookies / zgody** — banner cookies, link do Privacy Policy, obsługa `localStorage` tylko po zgodzie, polityka przechowywania danych (wymagane przez Google OAuth verification).
14. **Weryfikacja Google OAuth** — lista wymagań: hosted Privacy Policy URL, Terms of Service URL, opis zakresu `drive` w formularzu weryfikacji, ograniczenie scope do minimum (rozważyć powrót do `drive.file`), brand verification.

### Pozostałe techniczne

- Token refresh: GIS token wygasa po 1h; wywołać `requestAccessToken({ prompt: '' })` co ~50 min w tle.
- Rozbić `wedding-data.json` na pliki domenowe: `guests.json`, `budget.json`, `tasks.json` itd.

## 10. Do zrobienia pozniej

1. Przeniesc pozostale moduly (events, music, documents, payments, outfits itd.) na warstwe Google Drive.
2. Dodac upload zalacznikow do `attachments/` w Drive.
3. Dodac lepsza obsluge konfliktow (block-write-on-conflict) i komunikaty UX.
4. ~~Rozwazyc porzadniejszy podzial duzych plikow `pages-2.tsx` i `pages-3.tsx`.~~ — ZROBIONE.
5. Dodac ESLint i Prettier po ustabilizowaniu integracji Google.

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
4. Zrozum, ze auth jest juz prawdziwy (Google OAuth + Drive) — `localStorage` sluzy tylko do cache'owania email/fileId miedzy sesjami.
5. Traktuj obecny UI jako baze do ewolucyjnej migracji.

## 13. Dziennik zmian

### 2026-05-17 (Google Picker + invite flow + performance)

1. Dodano `shareFile`, `listPermissions`, `removePermission` do `src/lib/google-drive.ts`.
2. Utworzono `src/lib/google-picker.ts` — wrapper Picker API bez globalnych deklaracji typów (używa lokalnych interfejsów `GapiWindow`, `GPickerBuilder`, itd.).
3. Dodano `googlePickerApiKey` do `src/config/app-config.ts` — czytany z `VITE_GOOGLE_PICKER_API_KEY`.
4. Zaktualizowano `deploy.yml` — dodano `VITE_GOOGLE_PICKER_API_KEY` z GitHub Secrets.
5. Dodano `PickerScreen` w `src/auth.tsx` — wyświetlany gdy `needsPicker === true`; użytkownik otwiera Picker i wybiera plik.
6. Uproszczono flow join: URL `?join=FILEID` → próba bezpośredniego odczytu pliku → jeśli 403 → `PickerScreen` jako fallback.
7. Uproszczono `InviteModal`: kopiowanie linku to główna akcja, email Drive API to opcjonalny `<details>`.
8. Performance fix w `useAuth()`: `useMemo` na obiekcie zwracanym + `useCallback` na wszystkich akcjach → brak kaskadowych re-renderów.
9. Dodano `PickerScreen` do `src/app.tsx` (renderowany gdy `auth.needsPicker === true`).
10. `npm run typecheck` przechodzi bez błędów.

### 2026-05-17 (Google OAuth + Drive)

1. Dodano typy `google.accounts.oauth2` do `src/types/google-identity.d.ts` (TokenClient, TokenClientConfig, TokenResponse).
2. Utworzono `src/lib/google-drive.ts` z funkcjami: `getUserInfo`, `findOrCreateFolder`, `findFile`, `readJsonFile`, `createJsonFile`, `updateJsonFile`.
3. Przepisano `src/auth.tsx` — usunięto mock email/hasło, dodano pełne Google OAuth 2.0 przez GIS Token Client.
4. `AuthState` interface zachowany w pełni — kompatybilny z `app.tsx` bez zmian w tym pliku.
5. `AuthScreen` → przycisk „Zaloguj się przez Google" z SVG logo Google.
6. Po zalogowaniu: token → getUserInfo → find/create folder → find/create `wedding-data.json` → wczytanie `AppData`.
7. `updateActiveData()` → natychmiastowa aktualizacja stanu + asynchroniczny `updateJsonFile` na Drive.
8. Przywracanie sesji po odświeżeniu: `requestToken({ prompt: '' })` z timeoutem 12s (fallback: ekran logowania).
9. `InviteModal` uproszczony — info o pliku Drive i folderze. Zapraszanie oznaczone jako "coming soon".
10. `UserMenu` zaktualizowany — wyświetla awatar Google (zdjęcie profilowe lub inicjały), email, logout.
11. `npm run typecheck` przechodzi bez błędów.

### 2026-05-18 (fix: auto-discovery + active ws persistence + InviteModal lag)

1. **Fix: listSharedFiles query** — zmieniono z `sharedWithMe=true and trashed=false` na samo `trashed=false`. Pliki udostępnione przez Drive API nie zawsze pojawiają się w "Shared with me". Caller już filtruje własny plik przez `alreadyKnown` check.
2. **Fix: aktywny workspace po refresh** — `switchWorkspace` zapisuje `wp_g_active_ws_id` do localStorage. `bootstrapDrive` przywraca go po silent restore/logowaniu (priorytet: `?join=` > saved > ownWs). `clearSession` usuwa klucz przy logout.
3. **Fix: InviteModal lag** — `React.memo` + `useCallback` na wszystkich handlerach + `useEffect` na `[]` deps (jeden run przy mount, cleanup `cancelled` flag). Stable `onClose` przez `useCallback` w `app.tsx`.
4. `npm run typecheck` przechodzi bez błędów.

### 2026-05-18 (fix: getFileCapabilities + auto-discovery + owner-only invite)

1. **Fix: updateActiveData 403** — zamieniono `listPermissions`/`perms.find` na `getFileCapabilities` w obsłudze 403 przy zapisie. `capabilities.canEdit` jest autorytatywnym sprawdzeniem roli (działa dla owner/writer/reader, reader nie musi widzieć własnego wpisu w permissions).
2. **Fix: odświeżanie roli gościa** — zamieniono `listPermissions` na `getFileCapabilities` w `bootstrapDrive` (pętla stored guests) i w join path. Rola jest odświeżana przy każdym logowaniu — zmiana Edytor→Podgląd przez właściciela widoczna po przelogowaniu gościa.
3. **Auto-discovery shared plans** — po zalogowaniu `listSharedFiles(token, DATA_FILE)` (sharedWithMe=true) wykrywa udostępnione plany Drive bez potrzeby linka `?join=FILEID`. Gość widzi plan właściciela po zwykłym logowaniu.
4. **Przycisk "Zaproś" tylko dla właściciela** — w `app.tsx` oba miejsca (topbar desktop + topbar mobile) owinięte `{auth.myRole === "Właściciel" && ...}`. Gość i Edytor nie widzą opcji zapraszania.
5. Dodano `getFileCapabilities` i `listSharedFiles` do `src/lib/google-drive.ts`.
6. `npm run typecheck` przechodzi bez błędów.

### 2026-05-18 (dynamiczne sprawdzanie uprawnień)

1. **`switchWorkspace`**: po przełączeniu na plan gościa wywołuje `getFileCapabilities` async i aktualizuje `myRole` w stanie + localStorage. Użytkownik widzi natychmiastowe przełączenie, a rola aktualizuje się w tle.
2. **`updateActiveData`**: przy 403 z `updateJsonFile` wywołuje sprawdzanie uprawnień, zmienia `myRole` na `"Podgląd"` w stanie + localStorage i ustawia `driveError` z komunikatem.
3. **`_clearDriveError`**: nowy callback w `AuthState` i implementacja `useCallback(() => setDriveError(null))`.
4. **`drive-error-banner`** w `src/app.tsx`: pokazywany gdy `auth.driveError` jest ustawiony (żółty baner nad topbarem, klikalny = zamknij). Obsługuje dark mode.
5. Styl `.drive-error-banner` dodany w `src/styles.css`.
6. `npm run typecheck` przechodzi bez błędów.

### 2026-05-18 (fix invite flow: zmiana scope OAuth drive.file → drive)

1. **Root cause invite flow**: `drive.file` scope widzi TYLKO pliki stworzone przez aplikację lub otwarte przez Picker. Plik udostępniony przez Drive API (email) jest w Drive gościa, ale `drive.file` zwraca 404. Picker z `drive.file` nie może listować "Shared with me" → zwraca 401.
2. **Fix**: zmiana `DRIVE_SCOPES` na `"https://www.googleapis.com/auth/drive openid email profile"`. Scope `drive` daje full read/write do wszystkich plików Drive, do których użytkownik ma dostęp.
3. **Nowy join flow** (po zmianie scope): `readJsonFile(token, joinFileId)` → SUKCES bezpośrednio (bez Pickera). PickerScreen pozostaje jako fallback na edge case'y.
4. Zaktualizowano notę w `AuthScreen` z `drive.file` na `drive`.
5. `npm run typecheck` przechodzi bez błędów.
6. **WAŻNE dla istniejących użytkowników**: zmiana scope wymusi ponowny ekran zgody Google przy następnym logowaniu.

### 2026-05-19 (TODO #8: Goście — parowanie)

1. Dodano `partnerId?: string` do `Guest` interface w `src/core.tsx` (bidirektywne — oba goście mają nawzajem swoje ID).
2. `buildOrderedGuests(guests)` — helper w `guests.tsx` sortujący pary razem w obrębie grupy; partner pojawia się bezpośrednio po swoim gościu.
3. `pair(idA, idB)` — ustawia `partnerId` na obu gościach atomicznie.
4. `unpair(id)` — czyści `partnerId` na obu gościach.
5. `removeGuest` zaktualizowany: przy usuwaniu gościa automatycznie czyści `partnerId` jego partnera.
6. Tryb edycji: każdy gość ma przycisk "↔ Sparuj" → dropdown z listą gości bez pary (całej listy, nie tylko tej strony); po wyborze → sparowanie; jeśli już sparowany → pokazuje imię + przycisk "Rozłącz".
7. Tryb widoku: sparowani goście mają badge "↔ [imię]" pod nazwiskiem i lekkie tło (`oklch(from var(--accent) ...)`).
8. Plan stołów (`tables.tsx`): sparowani goście mają ikonkę "↔" z tooltipem "Para: [imię]" obok nazwiska w karciku stołu.
9. Statystyki strony: dodano kafelek "Par" (liczba sparowanych / 2).
10. `npm run typecheck` — 0 błędów.

### 2026-05-19 (TODO #7: Goście — uproszczenie modelu)

1. Usunięto `plusone: boolean`, `needsTransport: boolean`, `giftReceived: boolean` z `Guest` interface w `src/core.tsx`.
2. Usunięto te pola z domyślnych wpisów w `EMPTY_DATA.guests`.
3. Usunięto z `addGuest` defaults w `src/pages/guests.tsx`.
4. Pola były obecne w modelu od początku ale nigdy nie renderowane w tabeli — czyste usunięcie, bez zmian UI.
5. Istniejące dane w Drive (`wedding-data.json`) z tymi polami działają bez zmian (extra pola JSON są ignorowane).
6. `npm run typecheck` — 0 błędów.

### 2026-05-19 (TODO #5: Budżet — auto-row koszt sali)

1. Dodano `VenueCosts` interface i `calcVenueCosts(data)` helper w `src/core.tsx` — oblicza planowany koszt sali (aktywni goście × cena talerzyka + poprawiny × cena poprawin) i zapłacone (zaliczka).
2. `calcVenueCosts` wyeksportowany z `core.tsx`.
3. W `src/pages/budget.tsx`: dodano import `calcVenueCosts`; `venue = calcVenueCosts(data)` wliczone do `plannedAll` i `actualAll` (gdy `venue.hasData`).
4. Dodano auto-wiersz "Sala weselna · auto · z Lista Gości" — widoczny gdy ustawiona cena talerzyka i są aktywni goście. Wyświetla: planowany koszt, zaliczkę (= zapłacone), różnicę, status (Do opłaty / Zaliczka X% / Opłacone).
5. Wiersz pojawia się przed wierszem Stroje, oba mają identyczny styl (`background: var(--accent-soft)`).
6. `npm run typecheck` — 0 błędów.

### 2026-05-19 (TODO #3: DateInput z przyciskiem × dla pól daty)

1. Dodano komponent `DateInput` w `src/pages/_shared.tsx` — obsługuje `type: "date" | "datetime-local" | "time"`. Wyświetla przycisk `×` (clear) gdy pole ma wartość i `editing === true`. Przycisk ma touch-target 44px na mobile.
2. Dodano style `.date-input-wrap` i `.date-clear-btn` w `src/styles.css` — wrapper jako `position: relative`, przycisk absolutnie pozycjonowany po prawej, na mobile zwiększony do 44px.
3. Zaktualizowano `src/pages/dashboard.tsx` — data ślubu używa `DateInput`.
4. Zaktualizowano `src/pages/tasks.tsx` — termin zadania używa `DateInput`.
5. Zaktualizowano `src/pages/payments.tsx` — termin płatności używa `DateInput`.
6. Zaktualizowano `src/pages/events.tsx` — datetime wydarzenia używa `DateInput` (type="datetime-local").
7. Zaktualizowano `src/pages/documents.tsx` — data ceremonii, godzina ceremonii i daty urodzin (panna młoda / pan młody) używają `DateInput`.
8. `npm run typecheck` — 0 błędów.

### 2026-05-19 (fix: race condition w edit lock — ETag + If-Match)

1. **`readJsonFileWithEtag<T>`** — nowa funkcja w `google-drive.ts`. Pobiera zawartość pliku i jego ETag równolegle (dwa `fetch` w `Promise.all`). ETag zmienia się przy każdym zapisie.
2. **`updateJsonFile`** — dodano opcjonalny parametr `ifMatchEtag?: string`. Gdy podany, dołącza nagłówek `If-Match: <etag>` do żądania PATCH. Drive zwraca `412 Precondition Failed` jeśli plik był zmodyfikowany między naszym odczytem a zapisem. Rzuca błąd z message `"LOCK_CONFLICT"`.
3. **`acquireLock`** przepisany: (1) `readJsonFileWithEtag` zamiast `readJsonFile` — pobiera ETag, (2) sprawdza blokadę jak poprzednio, (3) `updateJsonFile(t, fid, newData, etag)` — zapis z `If-Match`. Jeśli `LOCK_CONFLICT` (412) → zwraca `{ ok: false, lockedBy: "?" }`. Eliminuje TOCTOU: dwóch użytkowników klikających "Edytuj" równocześnie — tylko jeden zapiszesie pomyślnie, drugi dostaje 412 i jest blokowany.
4. `npm run typecheck` przechodzi bez błędów.

### 2026-05-19 (user-config.json + UserMenu switcher + brak join linków + React.memo perf)

1. **Usunięto linki `?join=FILEID`** — cały mechanizm join links usunięty z `bootstrapDrive`, `PickerScreen`, `InviteModal`, `clearSession`, `switchWorkspace`. Zaproszenie odbywa się wyłącznie przez email (Drive API `shareFile`), a auto-discovery przez `listSharedFiles`.
2. **`user-config.json`** — nowy plik w folderze `WeddingPlanner` na Drive użytkownika, przechowuje `{ sharedPlans: string[] }` (fileIds udostępnionych planów). Zastępuje `wp_g_guest_plans` z localStorage → działa cross-device i cross-browser. Logika w `ensureUserConfig()` (module-level helper) + `configFileIdRef` w `useAuth`.
3. **`bootstrapOwnPlan`** zwraca `{ ws: Workspace; folderId: string }` zamiast samego `Workspace` — folderId potrzebny do `ensureUserConfig`.
4. **`bootstrapDrive`** przepisany: (1) bootstrap własnego planu, (2) `ensureUserConfig` → załaduj znane plany z `user-config.json`, (3) auto-discovery przez `listSharedFiles` → zapisz nowo odkryte do `user-config.json`, (4) ustaw session atomicznie.
5. **`loadGuestFile`** (Picker) zapisuje nowo wybrany fileId do `user-config.json`.
6. **`updateActiveData`** i **`switchWorkspace`** oczyszczone z localStorage guest plan calls — nie ma już `saveGuestPlans`/`getGuestPlans`.
7. **`clearSession`** czyści legacy klucze (`wp_g_guest_plans`, `wp_g_join_file_id`) i zeruje `configFileIdRef`.
8. **UserMenu workspace switcher** — kliknięcie awatara wyświetla sekcję "Twoje plany" z listą wszystkich workspace'ów (gdy `myWorkspaces.length > 1`). Każdy wpis: skrót roli (Wł/Ed/Pp) + nazwa planu + znacznik aktywnego. Kliknięcie = `switchWorkspace(ws.id)` + zamknięcie popupu.
9. **React.memo na komponentach stron** — `PAGE_COMPONENTS` w `app.tsx` owinięto w `React.memo`. Strony nie re-renderują się przy otwieraniu `InviteModal` — eliminuje lag przy otwieraniu modala.
10. Dodano style `.user-menu__section-label`, `.user-menu__ws-role`, `.user-menu__item--active` w `src/styles.css`.
11. `npm run typecheck` przechodzi bez błędów.

### 2026-05-18 (bugfixes: "Brak planu" flash + 404 stale ID + Picker 401)

1. **Fix "Brak planu" flash**: `setSession(info.email)` przeniesiony z początku `bootstrapDrive` na sam koniec try-bloku, tuż przed `setAllWs`. W obu ścieżkach (normalna + early-return z catch join) `setSession`, `setAllWs`, `setActiveWsId` wołane synchronicznie → React 18 batchuje je w jeden render → ekran "Brak planu" nie migocze.
2. **Fix stale file ID 404**: `bootstrapOwnPlan` catch przy niedostępnym pliku teraz czyści oba klucze (`LS.fileId` + `LS.folderId`) i robi pełny re-bootstrap: `findOrCreateFolder` → `findFile || createJsonFile` → `readJsonFile`. Eliminuje pętlę, w której stary folder+plik były w cache ale niedostępne.
3. **Fix Picker 401**: Dodano `_tokenAge: { current: number }` na poziomie modułu (ustawiany przy każdym `_tokenRef.current = token`). `PickerScreen.openPicker` sprawdza wiek tokenu przed wywołaniem; jeśli >55 min → jasny komunikat "Sesja wygasła — wyloguj i zaloguj ponownie" zamiast cichego 401 z iframe Pickera.
4. `npm run typecheck` przechodzi bez błędów.

### 2026-05-17 (cd.)

1. Dodano system typów gości: `GuestType` z wartościami `adult`, `child_half`, `child_free`.
2. Dodano `VenueSettings` — cena talerzyka (sala + poprawiny) i zaliczka.
3. Kalkulator kosztów w `PageGuests` — rozbicie na typy, potrącenie zaliczki.
4. Checkbox `poprawiny` dla każdego gościa, licznik w statystykach.
5. Obsługa może byc wyceniana na 100% lub 50%.
6. Bugfix: pole daty na Dashboard + pole budżetu całkowitego (tylko liczby).

### 2026-05-17 (początek)

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
12. Zmigrowano `pages-2.jsx` → `pages-2.tsx`, `pages-3.jsx` → `pages-3.tsx`, `tweaks-panel.jsx` → `tweaks-panel.tsx`.
13. Naprawiono bug z data w trybie edycji na Dashboard (wartosc ISO zamiast sformatowanej).
14. Naprawiono bug z polem budzetu calkowitego — dodano `type="number"`.
15. `npm run typecheck` przechodzi bez bledow po pelnej migracji wszystkich plikow JSX→TSX.
16. Dodano `GuestType = "adult" | "child_half" | "child_free"` w `core.tsx` (zastapilo `child: boolean`).
17. Dodano `poprawiny: boolean` do interfejsu `Guest`.
18. Dodano interfejs `VenueSettings` (`platePrice`, `afterPartyPlatePrice`, `deposit`) i pole `venueSettings` w `AppData`.
19. Zaimplementowano kalkulator kosztów sali w `PageGuests`:
    - rozbicie na typy gosci z cenami jednostkowymi
    - potrącenie zaliczki, wyswietlanie "Do zapłaty"
    - osobna sekcja dla poprawin
20. Obsługa weselna (`side === "Obsługa"`) korzysta z tego samego systemu typów — domyslnie 100%, mozna ustawic 50% lub 0%.
21. Poprawiono bug z data na Dashboard (bezposredni `<input type="date">` zamiast komponentu `Field`).
22. Poprawiono pole budżetu calkowitego — `onChange` filtruje nieliczbowe znaki przez `replace(/[^0-9]/g, "")`.
