# Google OAuth Verification — Checklist & Texts

> Plik pomocniczy do przejścia weryfikacji Google OAuth dla aplikacji Wedding Planner.
> Wszystkie URL-e zakładają deploy na `https://dawid512.github.io/wedding-planner/`.

---

## 1. Wymagane URL-e

| Element             | URL                                                                              |
|---------------------|----------------------------------------------------------------------------------|
| Aplikacja (homepage)| `https://dawid512.github.io/wedding-planner/`                                   |
| Privacy Policy      | `https://dawid512.github.io/wedding-planner/privacy-policy.html`                |
| Terms of Service    | `https://dawid512.github.io/wedding-planner/terms.html`                         |
| Authorized domain   | `dawid512.github.io`                                                             |

---

## 2. Kroki w Google Cloud Console

### 2a. OAuth Consent Screen (`APIs & Services → OAuth consent screen`)

| Pole                  | Wartość                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| App name              | `Wedding Planner`                                                       |
| User support email    | `dawid.medrala.98@gmail.com`                                            |
| App logo              | Wgraj logo (min. 120×120 px, max 1 MB)                                  |
| App homepage          | `https://dawid512.github.io/wedding-planner/`                           |
| Privacy policy link   | `https://dawid512.github.io/wedding-planner/privacy-policy.html`        |
| Terms of service link | `https://dawid512.github.io/wedding-planner/terms.html`                 |
| Authorized domains    | `dawid512.github.io`                                                    |
| Developer email       | `dawid.medrala.98@gmail.com`                                            |

### 2b. Scopes

Aplikacja używa następujących zakresów:

| Scope                                        | Typ         | Powód                                                 |
|----------------------------------------------|-------------|-------------------------------------------------------|
| `openid`                                     | Non-sensitive| Identyfikacja użytkownika                             |
| `email`                                      | Non-sensitive| Adres email użytkownika (wyświetlanie w UI)           |
| `profile`                                    | Non-sensitive| Imię i zdjęcie profilowe (avatar w aplikacji)         |
| `https://www.googleapis.com/auth/drive`      | **Restricted**| Odczyt/zapis pliku `wedding-data.json` na Drive użytkownika; dostęp do plików udostępnionych przez innych użytkowników (współedycja planu) |

> ⚠️ Zakres `drive` (restricted) wymaga dodatkowej weryfikacji Google.
> Patrz sekcja 3 poniżej.

---

## 3. Weryfikacja zakresu `drive` (Restricted Scope)

### Dlaczego `drive` zamiast `drive.file`?

Zakres `drive.file` pozwala na dostęp tylko do plików **utworzonych przez tę aplikację dla danego użytkownika**. Aplikacja Wedding Planner umożliwia współedycję planu ślubnego przez kilka osób (właściciel + zaproszeni współpracownicy). Gdy właściciel udostępnia plik `wedding-data.json` innemu użytkownikowi przez Drive API, plik nie jest "tworzony przez aplikację dla gościa" — stąd zakres `drive.file` zwraca 404. Zakres `drive` jest niezbędny do odczytu udostępnionych plików.

### Tekst uzasadnienia do formularza Google (po angielsku)

```
Application name: Wedding Planner
Application homepage: https://dawid512.github.io/wedding-planner/

How the application uses drive scope:

Wedding Planner is a frontend-only (no backend, no server) wedding planning SPA
that stores all user data exclusively in the user's own Google Drive as a single
JSON file (wedding-data.json). The application uses the drive scope for two
purposes:

1. Primary use — reading and writing the user's own plan file:
   The app creates/reads/updates a single file called wedding-data.json inside
   a WeddingPlanner/ folder on the user's Drive. All wedding plan data (guest list,
   budget, schedule, vendors, etc.) is stored exclusively there. No data is sent
   to any external server.

2. Collaboration — reading files shared by other users:
   Wedding planning typically involves multiple people (couple + wedding planner,
   couple + family members). The app allows one user (owner) to share their
   wedding-data.json with another user via Drive API permissions. The invited
   user must then be able to read this shared file. The drive.file scope is
   insufficient for this use case because drive.file only grants access to files
   the app itself created for that specific user — shared files from another
   user's Drive return 404 with drive.file scope.

3. Photo attachments:
   Users can upload inspiration photos to a WeddingPlanner/attachments/ subfolder
   on their own Drive. These are read back using the drive scope.

Why drive.file is insufficient:
The drive.file scope would work for a single-user app, but breaks the core
collaboration feature. When user A creates a wedding plan and shares it with
user B via Drive API permissions, user B with drive.file scope cannot access
the file (404) because it was not originally created by the app on behalf of user B.

Data access is limited to:
- /WeddingPlanner/wedding-data.json (one JSON file with wedding plan data)
- /WeddingPlanner/user-config.json (user preferences: list of shared plan IDs)
- /WeddingPlanner/attachments/* (uploaded photos/images)
- Shared files from other Wedding Planner users (read-only unless granted write access)

No other Drive files are accessed, listed, or modified.
```

### Co Google wymaga dla Restricted Scope

1. **Nagranie wideo (YouTube)** — demo aplikacji pokazujące jak używa zakresu `drive`:
   - Logowanie przez Google
   - Tworzenie planu weselnego (zapis do Drive)
   - Zaproszenie drugiej osoby (udostępnienie przez Drive)
   - Logowanie na drugim koncie i odczyt planu
   - Czas: 3–5 minut, bez muzyki w tle, z komentarzem

2. **Security Assessment** (dla restricted scopes) — Google może wymagać zewnętrznego audytu bezpieczeństwa (CASA tier 2). Dla małych aplikacji (< 100 użytkowników) można ubiegać się o wyjątek.

3. **Domain verification** — zweryfikuj własność `dawid512.github.io` w Google Search Console.

---

## 4. Weryfikacja domeny (GitHub Pages)

GitHub Pages używa domeny `github.io` — nie można bezpośrednio zweryfikować własności poddomeny `dawid512.github.io` przez DNS TXT. Opcje:

**Opcja A (zalecana): Własna domena**
- Kup domenę np. `weddingplanner.pl` (~50 zł/rok)
- Podłącz do GitHub Pages (Settings → Pages → Custom domain)
- Zweryfikuj przez DNS TXT lub plik HTML w Google Search Console

**Opcja B: Weryfikacja przez plik HTML**
- Pobierz plik weryfikacyjny z Google Search Console
- Umieść go w `public/` (Vite automatycznie skopiuje do `dist/`)
- Wypchnij i zweryfikuj

---

## 5. Authorized JavaScript Origins

W Google Cloud Console → `Credentials → OAuth 2.0 Client IDs → Edit`:

```
Authorized JavaScript origins:
  https://dawid512.github.io
  http://localhost:5173  (development)
  http://localhost:4173  (vite preview)

Authorized redirect URIs:
  (nie potrzebne — GIS Token Client nie używa redirect URI)
```

---

## 6. Stan przed wysłaniem formularza — checklist

- [ ] Privacy Policy opublikowana i dostępna publicznie
- [ ] Terms of Service opublikowany i dostępny publicznie
- [ ] OAuth Consent Screen uzupełniony (nazwa, logo, URL-e)
- [ ] Authorized domain dodany (`dawid512.github.io` lub własna domena)
- [ ] Nagranie demo na YouTube (wymagane dla restricted scope `drive`)
- [ ] Uzasadnienie zakresu `drive` napisane i wklejone do formularza
- [ ] Domena zweryfikowana w Google Search Console
- [ ] App jest w trybie "Testing" → po weryfikacji zmień na "Production"

---

## 7. Tryb testowy (przed weryfikacją)

Dopóki aplikacja jest w trybie **Testing**, może z niej korzystać max. 100 użytkowników dodanych ręcznie w Cloud Console (`OAuth consent screen → Test users → Add users`).

Aby dodać użytkowników testowych:
`APIs & Services → OAuth consent screen → Test users → + Add users`

---

*Plik wygenerowany automatycznie — aktualizuj daty i URL-e przy każdym deploymencie.*
