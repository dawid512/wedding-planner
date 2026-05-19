# CODEBASE.md — Mapa kodu dla AI / deweloperów

> Ostatnia aktualizacja: 2026-05-19

## Struktura projektu

```
src/
  app.tsx              — główna powłoka aplikacji (layout, sidebar, routing stron, auth shell)
  core.tsx             — typy (AppData, PageProps, OutfitItem…), helpery (fmtDate, fmtCurrency, outfitTotals, PAGES…), komponenty UI (Field, Check, Icon)
  auth.tsx             — Google OAuth / GIS Token Client, Google Drive (load/save), blokada edycji (soft lock), workspace multi-user, InviteModal, UserMenu
  lib/
    google-drive.ts    — niskopoziomowe fetch'e do Drive REST API: readJsonFile, updateJsonFile, createJsonFile, uploadMedia, listFiles, getFileCapabilities, updatePermission
  tweaks-panel.tsx     — panel motywu (jasny/ciemny), useTweaks hook, TweaksPanel/TweakSection/TweakRadio
  styles.css           — wszystkie style (CSS variables, layout, komponenty)
  pages/               — jedna strona = jeden plik (patrz lista poniżej)
    _shared.tsx        — PageHeader (eyebrow, title, sub, stats[])
    index.ts           — barrel re-export wszystkich stron
    dashboard.tsx      — PageDashboard: hero z odliczaniem, KPI, nadchodzące zadania
    tasks.tsx          — PageTasks: lista zadań z kategoriami, priorytetami i terminami
    budget.tsx         — PageBudget: budżet całkowity, kategorie, paski postępu, auto-wiersz ze Strojów
    guests.tsx         — PageGuests: lista gości z RSVP, typem, noclegiem, cateringiem
    tables.tsx         — PageTables: rozsadzenie gości przy stołach (select z listy gości)
    vendors.tsx        — PageVendors: dostawcy (kontakt, cena, status)
    schedule.tsx       — PageSchedule: harmonogram dnia ślubu (timeline)
    menu.tsx           — PageMenu: karta dań weselnych
    outfits.tsx        — PageOutfits: stroje panny/pana młodego (OutfitsTable + sumowanie do budżetu)
    inspiration.tsx    — PageInspiration: moodboard / inspiracje wizualne
    gifts.tsx          — PageGifts: lista prezentów
    honeymoon.tsx      — PageHoneymoon: podróż poślubna
    events.tsx         — PageEvents: wydarzenia (wieczory, ceremonia, wesele, poprawiny)
    music.tsx          — PageMusic: kluczowe momenty, playlista, zakazy, dedykacje
    documents.tsx      — PageDocuments: USC / ceremonia, dane osobowe, świadkowie, lista dokumentów
    payments.tsx       — PagePayments: harmonogram płatności z alertami o terminach

  pages-1.tsx          — DEPRECATED (do usunięcia ręcznie)
  pages-2.tsx          — DEPRECATED (do usunięcia ręcznie)
  pages-3.tsx          — DEPRECATED (do usunięcia ręcznie)
```

## Kluczowe typy (core.tsx)

```typescript
AppData          — cały stan aplikacji (couple, tasks, guests, budget*, tables, vendors, schedule, menu, outfits, gifts, honeymoon, events, music, documents, payments, inspiration, _editLock)
PageProps        — { data: AppData; set: DataUpdater; editing: boolean }
DataUpdater      — (prev: AppData) => AppData
OutfitItem       — { id, name, where, location, price, bought, paid }
```

## Jak działa zapis danych

1. `auth.tsx` ładuje `wedding-data.json` z Google Drive przy logowaniu
2. Każda zmiana przez `set(updater)` → `debouncedSave` (800ms) → `updateJsonFile` do Drive
3. Blokada edycji: `acquireLock()` — write-then-verify (pisze lock, czeka 350ms, weryfikuje nonce)
4. `_editLock: { email, lockedAt }` przechowywany w `wedding-data.json`; TTL 10 min

## Jak dodać nową stronę

1. Utwórz `src/pages/nazwastron.tsx` z `export function PageNazwa(...)`
2. Dodaj do `src/pages/index.ts`
3. Dodaj wpis do `PAGES` w `core.tsx`
4. Dodaj do `PAGE_COMPONENTS` w `app.tsx`
5. Dodaj klucz danych do `AppData` i `EMPTY_DATA` w `core.tsx`

## Google Drive / Auth

- Scope: `https://www.googleapis.com/auth/drive`
- `wedding-data.json` — główny plik danych (ID zapisany w `user-config.json`)
- `user-config.json` — konfiguracja użytkownika (activeFileId, workspace list)
- Zapraszanie: `updatePermission()` z rolą `reader` lub `writer`
- Rola ustalana przez `getFileCapabilities()` → `canModifyContent`

## Zmienne środowiskowe (.env.local)

```
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_PICKER_API_KEY=...
```

Nigdy nie commitować! Są w `.gitignore` i w GitHub Secrets dla CI/CD.
