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
32. Utworzono `src/lib/google-drive.ts` — wrapper Drive API (getUserInfo, findOrCreateFolder, findFile, readJsonFile, createJsonFile, updateJsonFile, shareFile, listPermissions, removePermission).
33. Zastąpiono mock auth/localStorage prawdziwym logowaniem Google + zapisem danych w Google Drive.
34. Zaktualizowano typy `google.accounts.oauth2` w `src/types/google-identity.d.ts`.
35. `AuthScreen` pokazuje przycisk „Zaloguj przez Google" lub instrukcję konfiguracji gdy brak Client ID.
36. Utworzono `src/lib/google-picker.ts` — wrapper Google Picker API (wybór pliku przez UI → pełny read+write).
37. Dodano `VITE_GOOGLE_PICKER_API_KEY` w `src/config/app-config.ts` i `deploy.yml`.
38. Zaimplementowano uproszczony flow zapraszania: właściciel kopiuje link `?join=FILEID`, osoba otwiera + loguje się = gotowe.
39. `PickerScreen` — fallback gdy brak bezpośredniego dostępu do pliku (osoba otwiera picker i wybiera plik Drive).
40. InviteModal: performance fix — `useMemo` + `useCallback` na `useAuth()` eliminuje zbędne re-rendery.
41. `npm run typecheck` przechodzi bez błędów.
42. **Multi-workspace**: użytkownik ma własny plan i może dołączyć do wielu gościnnych — przełączanie w sidebar.
43. **Naprawiono flow zapraszania**: email przez Drive API jest główną akcją; link `?join=FILEID` jest pomocniczy.
44. **Zarządzanie rolami**: właściciel zmienia Edytor↔Podgląd i usuwa osoby wprost z panelu "Zaproś".
45. Dodano `updatePermission()` do `google-drive.ts`.
46. Eksportowany typ `Workspace` z `auth.tsx` — zawiera `myRole`.
47. Naprawiono "Brak planu" flash — `setSession` wywoływane atomicznie razem z `setAllWs` na końcu `bootstrapDrive`.
48. Naprawiono 404 stale file ID — `bootstrapOwnPlan` przy błędzie czyści oba klucze LS i robi pełny re-bootstrap.
49. Naprawiono Picker 401 — `_tokenAge` ref; `openPicker` sprawdza wiek tokenu przed otwarciem.
50. **Zmieniono scope OAuth z `drive.file` na `drive`** — `drive.file` zwracał 404 na plikach udostępnionych przez Drive API i blokował Picker (401). Scope `drive` daje pełny dostęp do plików Drive użytkownika, co jest wymagane dla współedycji.
51. **Naprawiono odświeżanie roli gościa** — przy każdym logowaniu `listPermissions` sprawdza aktualną rolę z Drive i aktualizuje localStorage. Zmiana Edytor→Podgląd przez właściciela jest widoczna po przelogowaniu gościa.
52. **Dynamiczne sprawdzanie uprawnień** — `switchWorkspace` odświeża rolę async po przełączeniu planu. `updateActiveData` przy 403 z Drive odświeża rolę i pokazuje baner błędu. Baner `drive-error-banner` w UI (kliknij aby zamknąć).
53. **Naprawiono odświeżanie roli gościa** — przy każdym logowaniu `getFileCapabilities` sprawdza aktualną rolę z Drive i aktualizuje localStorage. Zmiana Edytor→Podgląd przez właściciela widoczna po przelogowaniu gościa.
54. **Auto-discovery shared plans** — po zalogowaniu `listSharedFiles` (sharedWithMe=true) wykrywa udostępnione plany Drive bez potrzeby linka `?join=FILEID`. Gość widzi plan właściciela po zwykłym logowaniu bez dodatkowego linku.
55. **Fix: updateActiveData 403** — zamieniono `listPermissions`/`perms.find` na `getFileCapabilities` — autorytatywne sprawdzenie roli.
56. **Przycisk "Zaproś" tylko dla właściciela** — gość i edytor nie widzą opcji zapraszania.
57. **Fix: auto-discovery shared plans** — zmieniono query w `listSharedFiles` z `sharedWithMe=true` na szerokie `name='wedding-data.json' and trashed=false`. Pliki udostępnione przez Drive API permissions nie zawsze pojawiają się w "Shared with me".
58. **Fix: aktywny workspace persystuje przez refresh** — `switchWorkspace` zapisuje ID do `localStorage (wp_g_active_ws_id)`. Przy każdym logowaniu/odświeżeniu `bootstrapDrive` przywraca ostatni wybrany workspace zamiast zawsze aktywować własny plan.
59. **Fix: InviteModal lag** — owinięto w `React.memo`, useCallback na wszystkich handlerach, `useEffect` dla permisji działa raz przy montowaniu (nie re-triggeruje przy re-renderach parenta), dodano cleanup flagi `cancelled` dla pending async calls.
60. **Usunięto linki `?join=FILEID`** — mechanizm join linków całkowicie usunięty. Zaproszenie odbywa się wyłącznie przez email (Drive API), a auto-discovery przez `listSharedFiles`.
61. **`user-config.json`** — dane o udostępnionych planach przechowywane w Drive użytkownika (plik `user-config.json` w folderze WeddingPlanner), a nie w localStorage. Działa cross-device i cross-browser.
62. **Workspace switcher w UserMenu** — kliknięcie awatara (prawy górny róg) pokazuje listę wszystkich planów (własny + udostępnione) z możliwością przełączania. Pokazuje się tylko gdy użytkownik ma dostęp do więcej niż jednego planu.
63. **React.memo na komponentach stron** — `PAGE_COMPONENTS` w `app.tsx` owinięto w `React.memo`. Strony nie re-renderują się przy otwieraniu `InviteModal` — eliminuje lag przy otwieraniu modala.

## Do zrobienia teraz

1. Dodać token refresh — aktualny token GIS wygasa po 1 godz. (teraz jest komunikat o wygaśnięciu, nie auto-refresh).
2. Rozbić `wedding-data.json` na osobne pliki domenowe (`guests.json`, `budget.json`, itd.).
3. Dodać soft locks per moduł + heartbeat.

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

1. Token GIS wygasa po 1 godz. — po wygaśnięciu Picker pokazuje błąd z instrukcją ponownego logowania (brak auto-refresh).
2. Wszystkie dane w jednym pliku `wedding-data.json` (brak podziału domenowego).
3. Brak soft locks i sync engine.
4. Przy pierwszym zaproszeniu: właściciel musi wysłać **email przez Drive** (opcja w panelu "Zaproś") — bez emaila gość nie zobaczy pliku w Drive, a auto-discovery nie zadziała.
5. Zmiana roli (Edytor→Podgląd) jest widoczna po przelogowaniu gościa — aplikacja sprawdza `capabilities.canEdit` przy każdym logowaniu.
