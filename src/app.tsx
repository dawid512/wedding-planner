// Wedding Planner — main app shell (with auth + collaborators)

import React, { useState as useS, useEffect as useE, useMemo as useM, useCallback as useC, useRef } from "react";
import { EMPTY_DATA, PAGES, Icon } from "./core";
import type { AppData, DataUpdater } from "./core";
import { PageDashboard, PageTasks, PageBudget, PageGuests } from "./pages-1";
import { PageTables, PageVendors, PageSchedule, PageMenu, PageOutfits, PageInspiration, PageGifts, PageHoneymoon } from "./pages-2";
import { PageEvents, PageMusic, PageDocuments, PagePayments } from "./pages-3";
import { useAuth, AuthScreen, PickerScreen, InviteModal, UserMenu, authInitials, avatarColor } from "./auth";
import type { Workspace } from "./auth";
import { useTweaks, TweaksPanel, TweakSection, TweakRadio } from "./tweaks-panel";

type PlannerAuth = ReturnType<typeof useAuth>;
type TweakState = { theme: string };
type PageMetaWithNum = {
  id: string;
  label: string;
  group: string;
  num?: number;
};
type PlannerPageProps = {
  data: AppData;
  set: (updater: DataUpdater) => void;
  editing: boolean;
};

// Wrapped in React.memo so page components don't re-render when inviteOpen
// or other PlannerApp-level state changes that don't affect page props.
const PAGE_COMPONENTS: Record<string, React.ComponentType<PlannerPageProps>> = {
  dashboard:   React.memo(PageDashboard),
  tasks:       React.memo(PageTasks),
  events:      React.memo(PageEvents),
  budget:      React.memo(PageBudget),
  payments:    React.memo(PagePayments),
  guests:      React.memo(PageGuests),
  tables:      React.memo(PageTables),
  vendors:     React.memo(PageVendors),
  schedule:    React.memo(PageSchedule),
  menu:        React.memo(PageMenu),
  music:       React.memo(PageMusic),
  outfits:     React.memo(PageOutfits),
  documents:   React.memo(PageDocuments),
  inspiration: React.memo(PageInspiration),
  gifts:       React.memo(PageGifts),
  honeymoon:   React.memo(PageHoneymoon),
};

const ROUTE_KEY = "wedding-planner-route-v1";

// Inactivity timeouts while in edit mode
const INACTIVITY_WARN_MS     = 8  * 60 * 1000; // 8 min — show warning
const INACTIVITY_KICK_MS     = 10 * 60 * 1000; // 10 min — force exit
const ACTIVITY_THROTTLE_MS   = 15_000;          // don't reset timers more than once per 15s

function App() {
  const auth = useAuth() as PlannerAuth;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "light"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS) as [TweakState, (key: string, value: string) => void];

  useE(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
  }, [tweaks.theme]);

  if (!auth.session) {
    return <AuthScreen auth={auth} />;
  }

  if (auth.needsPicker) {
    return <PickerScreen auth={auth} />;
  }

  if (!auth.activeWorkspace) {
    return (
      <div className="auth">
        <div className="auth__card" style={{ textAlign: "center" }}>
          <div className="auth__eyebrow">— Brak planu —</div>
          <h1 className="auth__title">Nie masz jeszcze <em>żadnego planu</em></h1>
          <p className="auth__sub">Poproś osobę, która planuje ślub, by Cię zaprosiła do edycji.</p>
          <button className="btn auth__submit" onClick={() => auth.logout()}>Wyloguj się</button>
        </div>
      </div>
    );
  }

  return <PlannerApp auth={auth} tweaks={tweaks} setTweak={setTweak} />;
}

type PlannerAppProps = {
  auth: PlannerAuth;
  tweaks: TweakState;
  setTweak: (key: string, value: string) => void;
};

function PlannerApp({ auth, tweaks, setTweak }: PlannerAppProps) {
  const ws = auth.activeWorkspace as Workspace;
  const savedData = useM<AppData>(() => ({ ...EMPTY_DATA, ...ws.data }), [ws]);

  const [draftData,     setDraftData]     = useS<AppData | null>(null);
  const [route,         setRoute]         = useS<string>(() => localStorage.getItem(ROUTE_KEY) || "dashboard");
  const [sidebarOpen,   setSidebarOpen]   = useS(false);
  const [inviteOpen,    setInviteOpen]    = useS(false);
  const [acquiringLock, setAcquiringLock] = useS(false);
  const [lockError,     setLockError]     = useS<string | null>(null);
  const [inactivityWarn, setInactivityWarn] = useS(false);

  const closeInvite = useC(() => setInviteOpen(false), []);

  // Refs for stable access inside timers/event-handlers
  const authRef          = useRef(auth);
  authRef.current        = auth;
  const warnTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kickTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef  = useRef<number>(0);
  const editingRef       = useRef(false);

  useE(() => {
    localStorage.setItem(ROUTE_KEY, route);
    setSidebarOpen(false);
  }, [route]);

  // When workspace changes — release lock if we were editing, reset draft
  useE(() => {
    if (editingRef.current) {
      authRef.current.releaseLock();
    }
    setDraftData(null);
    setLockError(null);
  }, [ws.id]);

  const editing = draftData !== null;
  editingRef.current = editing;

  const data: AppData = editing ? draftData : savedData;
  const set = useC((updater: DataUpdater) => {
    if (!editing) return;
    setDraftData((prev) => typeof updater === "function" ? updater(prev as AppData) : updater);
  }, [editing]);

  // ----------------------------------------------------------
  // Inactivity timers
  // ----------------------------------------------------------

  const clearInactivityTimers = useC(() => {
    if (warnTimerRef.current) { clearTimeout(warnTimerRef.current); warnTimerRef.current = null; }
    if (kickTimerRef.current) { clearTimeout(kickTimerRef.current); kickTimerRef.current = null; }
    setInactivityWarn(false);
  }, []);

  const resetInactivityTimers = useC(() => {
    const now = Date.now();
    // Throttle — don't reset more often than ACTIVITY_THROTTLE_MS
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityRef.current = now;

    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (kickTimerRef.current) clearTimeout(kickTimerRef.current);
    setInactivityWarn(false);

    warnTimerRef.current = setTimeout(() => setInactivityWarn(true), INACTIVITY_WARN_MS);
    kickTimerRef.current = setTimeout(() => {
      // Force exit without save — release lock then clear draft
      authRef.current.releaseLock();
      setDraftData(null);
      setInactivityWarn(false);
    }, INACTIVITY_KICK_MS);
  }, []);

  // Start/stop timer watch when editing changes
  useE(() => {
    if (!editing) {
      clearInactivityTimers();
      return;
    }
    // Start fresh on entering edit mode
    lastActivityRef.current = Date.now();
    warnTimerRef.current = setTimeout(() => setInactivityWarn(true), INACTIVITY_WARN_MS);
    kickTimerRef.current = setTimeout(() => {
      authRef.current.releaseLock();
      setDraftData(null);
      setInactivityWarn(false);
    }, INACTIVITY_KICK_MS);

    // Activity listeners
    const onActivity = () => resetInactivityTimers();
    window.addEventListener("mousemove",  onActivity);
    window.addEventListener("keydown",    onActivity);
    window.addEventListener("click",      onActivity);
    window.addEventListener("touchstart", onActivity);

    return () => {
      clearInactivityTimers();
      window.removeEventListener("mousemove",  onActivity);
      window.removeEventListener("keydown",    onActivity);
      window.removeEventListener("click",      onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [editing, clearInactivityTimers, resetInactivityTimers]);

  // ----------------------------------------------------------
  // Edit actions
  // ----------------------------------------------------------

  const startEdit = useC(async () => {
    setLockError(null);
    setAcquiringLock(true);
    const result = await authRef.current.acquireLock();
    setAcquiringLock(false);
    if (!result.ok) {
      const who = result.lockedBy === "?" ? "innego użytkownika" : result.lockedBy;
      setLockError(`Aktualnie edytuje: ${who}`);
      return;
    }
    // Initialize draft from fresh savedData (acquireLock updated local state with fresh Drive data)
    setDraftData(prev => prev ?? JSON.parse(JSON.stringify(savedData)));
  }, [savedData]);

  const cancelEdit = useC(() => {
    authRef.current.releaseLock();
    setDraftData(null);
    setInactivityWarn(false);
    setLockError(null);
  }, []);

  const saveEdit = useC(() => {
    // Strip _editLock from draft before saving — lock is cleared by overwriting data
    const dataToSave = { ...(draftData as AppData) };
    delete dataToSave._editLock;
    authRef.current.updateActiveData(dataToSave);
    setDraftData(null);
    setInactivityWarn(false);
  }, [draftData]);

  const PageComp    = PAGE_COMPONENTS[route] || PageDashboard;
  const currentPage = (PAGES as PageMetaWithNum[]).find((p) => p.id === route);

  const groups = useM<Record<string, PageMetaWithNum[]>>(() => {
    const grouped: Record<string, PageMetaWithNum[]> = {};
    PAGES.forEach((page, i) => {
      if (!grouped[page.group]) grouped[page.group] = [];
      grouped[page.group].push({ ...page, num: i + 1 });
    });
    return grouped;
  }, []);

  const activeCollab = [
    { email: ws.ownerEmail, role: "Właściciel" },
    ...(ws.collaborators || [])
      .filter((c) => c.status === "Aktywny")
      .map((c) => ({ email: c.email, role: c.role })),
  ];
  const collabCount = activeCollab.length;

  // Multiple workspaces — shown in sidebar switcher
  const multipleWs = auth.myWorkspaces.length > 1;

  return (
    <div className="app">
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
      <aside className={"sidebar " + (sidebarOpen ? "is-open" : "")}>
        <div className="brand">
          <div className="brand__mono">Wedding Planner</div>
          <div className="brand__names">
            <span>{savedData.couple.partner1 || "Imię"}</span>
            <span className="brand__amp">&amp; {savedData.couple.partner2 || "Imię"}</span>
          </div>
          <div className="brand__meta">
            {savedData.couple.date
              ? new Date(savedData.couple.date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })
              : "— · — · ——"}
          </div>
        </div>

        <nav className="nav">
          {Object.entries(groups).map(([group, items]) => (
            <React.Fragment key={group}>
              <div className="nav__group">{group}</div>
              {items.map((page) => (
                <button
                  key={page.id}
                  className={"nav__item " + (route === page.id ? "is-active" : "")}
                  onClick={() => setRoute(page.id)}
                >
                  <span className="nav__num">{String(page.num).padStart(2, "0")}</span>
                  <span>{page.label}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Workspace switcher — shown when user has access to multiple plans */}
        {multipleWs && (
          <div style={{ padding: "12px 28px 16px", borderTop: "1px solid var(--line-soft)" }}>
            <div className="brand__meta" style={{ marginTop: 0, marginBottom: 8 }}>
              Twoje plany · {auth.myWorkspaces.length}
            </div>
            {auth.myWorkspaces.map((wsItem) => {
              const wsFull  = wsItem as Workspace;
              const isActive = wsItem.id === ws.id;
              const roleLabel = wsFull.myRole === "Właściciel" ? "Wł" : wsFull.myRole === "Edytor" ? "Ed" : "Pp";
              return (
                <button
                  key={wsItem.id}
                  className={"nav__item " + (isActive ? "is-active" : "")}
                  style={{ marginBottom: 2 }}
                  onClick={() => auth.switchWorkspace(wsItem.id)}
                >
                  <span
                    className="nav__num"
                    style={{ fontWeight: wsFull.myRole === "Właściciel" ? 700 : 400, letterSpacing: 0 }}
                  >
                    {roleLabel}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {wsItem.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: multipleWs ? 0 : "auto", padding: "16px 28px", borderTop: "1px solid var(--line-soft)" }}>
          <div className="brand__meta" style={{ marginTop: 0, marginBottom: 10 }}>
            Współedytorzy · {collabCount}
          </div>
          <div className="avatar-stack">
            {activeCollab.slice(0, 6).map((collaborator) => (
              <span
                key={collaborator.email}
                className="avatar avatar--sm"
                style={{ background: avatarColor(collaborator.email) }}
                title={collaborator.email + " · " + collaborator.role}
              >
                {authInitials(null, collaborator.email)}
              </span>
            ))}
            {collabCount > 6 && (
              <span className="avatar avatar--sm" style={{ background: "var(--line)" }}>+{collabCount - 6}</span>
            )}
          </div>
          {auth.myRole === "Właściciel" && (
            <button
              className="btn btn--small mt-8"
              style={{ width: "100%", marginTop: 12, borderStyle: "dashed" }}
              onClick={() => setInviteOpen(true)}
            >
              <Icon name="plus" size={12} /> Zaproś osobę
            </button>
          )}
        </div>
      </aside>

      <main className="main">
        <div className="mobile-topbar">
          <button className="btn btn--ghost btn--icon" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="serif-italic" style={{ fontSize: 20, fontStyle: "italic" }}>
            {savedData.couple.partner1 || "Imię"} <span style={{ color: "var(--accent)" }}>&amp;</span> {savedData.couple.partner2 || "Imię"}
          </div>
          <UserMenu auth={auth} onInviteClick={() => setInviteOpen(true)} />
        </div>

        {auth.driveError && (
          <div
            className="drive-error-banner"
            onClick={() => auth._clearDriveError()}
            title="Kliknij aby zamknąć"
          >
            ⚠ {auth.driveError}
          </div>
        )}

        <div className="topbar">
          <div className="topbar__crumbs">
            <span>Planner</span>
            <span>/</span>
            <strong>{currentPage?.label || ""}</strong>
            {editing && <span className="edit-badge">Tryb edycji</span>}
            {!auth.canEdit && !editing && <span className="viewer-banner">Tylko podgląd</span>}
            <span className="ws-label">
              <span>{ws.name}</span>
              <span className={"ws-label__role " + (auth.myRole === "Właściciel" ? "ws-label__role--owner" : "")}>{auth.myRole}</span>
            </span>
          </div>
          <div className="topbar__actions">
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => setTweak("theme", tweaks.theme === "light" ? "dark" : "light")}
              title={tweaks.theme === "light" ? "Tryb ciemny" : "Tryb jasny"}
            >
              <Icon name={tweaks.theme === "light" ? "moon" : "sun"} />
            </button>
            {auth.myRole === "Właściciel" && (
              <button className="btn" onClick={() => setInviteOpen(true)} title="Zaproś / zarządzaj">
                <Icon name="plus" size={14} /> Zaproś
              </button>
            )}
            {auth.canEdit && !editing && (
              <button
                className="btn btn--primary"
                onClick={startEdit}
                disabled={acquiringLock}
                title={lockError ?? undefined}
              >
                {acquiringLock
                  ? "Sprawdzanie…"
                  : <><Icon name="edit" size={14} /> Edytuj</>
                }
              </button>
            )}
            {lockError && !editing && (
              <span className="lock-error-badge" title="Kliknij aby zamknąć" onClick={() => setLockError(null)}>
                🔒 {lockError}
              </span>
            )}
            {auth.canEdit && editing && (
              <React.Fragment>
                <button className="btn" onClick={cancelEdit}>
                  <Icon name="x" size={14} /> Anuluj
                </button>
                <button className="btn btn--primary" onClick={saveEdit}>
                  <Icon name="save" size={14} /> Zapisz
                </button>
              </React.Fragment>
            )}
            <UserMenu auth={auth} onInviteClick={() => setInviteOpen(true)} />
          </div>
        </div>

        <PageComp data={data} set={set} editing={editing} />
      </main>

      {inviteOpen && <InviteModal auth={auth} onClose={closeInvite} />}

      {/* Inactivity warning — shown at 8 min, force-kick at 10 min */}
      {inactivityWarn && editing && (
        <div className="modal-scrim" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏱</div>
            <h2 className="modal__title" style={{ marginBottom: 8 }}>
              Brak aktywności
            </h2>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Za <strong>2 minuty</strong> tryb edycji zostanie wyłączony bez zapisu.<br />
              Co chcesz zrobić?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn--primary"
                onClick={saveEdit}
              >
                <Icon name="save" size={14} /> Zapisz teraz
              </button>
              <button
                className="btn"
                onClick={() => {
                  lastActivityRef.current = 0; // force reset
                  resetInactivityTimers();
                }}
              >
                <Icon name="edit" size={14} /> Zostań w edycji
              </button>
              <button
                className="btn"
                style={{ color: "var(--ink-soft)" }}
                onClick={cancelEdit}
              >
                <Icon name="x" size={14} /> Anuluj bez zapisu
              </button>
            </div>
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Wygląd">
          <TweakRadio
            label="Motyw"
            value={tweaks.theme}
            options={[
              { value: "light", label: "Jasny" },
              { value: "dark", label: "Ciemny" },
            ]}
            onChange={(value) => setTweak("theme", value as string)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

export default App;
