// Wedding Planner — main app shell (with auth + collaborators)

import React, { useState as useS, useEffect as useE, useMemo as useM, useCallback as useC } from "react";
import { EMPTY_DATA, PAGES, Icon } from "./core";
import { PageDashboard, PageTasks, PageBudget, PageGuests } from "./pages-1";
import { PageTables, PageVendors, PageSchedule, PageMenu, PageOutfits, PageInspiration, PageGifts, PageHoneymoon } from "./pages-2";
import { PageEvents, PageMusic, PageDocuments, PagePayments } from "./pages-3";
import { useAuth, AuthScreen, InviteModal, UserMenu, authInitials, avatarColor } from "./auth";
import { useTweaks, TweaksPanel, TweakSection, TweakRadio } from "./tweaks-panel";

const PAGE_COMPONENTS = {
  dashboard: PageDashboard,
  tasks: PageTasks,
  events: PageEvents,
  budget: PageBudget,
  payments: PagePayments,
  guests: PageGuests,
  tables: PageTables,
  vendors: PageVendors,
  schedule: PageSchedule,
  menu: PageMenu,
  music: PageMusic,
  outfits: PageOutfits,
  documents: PageDocuments,
  inspiration: PageInspiration,
  gifts: PageGifts,
  honeymoon: PageHoneymoon,
};

const ROUTE_KEY = "wedding-planner-route-v1";

function App() {
  const auth = useAuth();

  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "light"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useE(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
  }, [tweaks.theme]);

  // not logged in → show auth
  if (!auth.session) {
    return <AuthScreen auth={auth} />;
  }

  // logged in but no workspace (edge case: invited user with no active workspace)
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

function PlannerApp({ auth, tweaks, setTweak }) {
  const ws = auth.activeWorkspace;
  const savedData = useM(() => ({ ...EMPTY_DATA, ...(ws.data || {}) }), [ws]);

  const [draftData, setDraftData] = useS(null);
  const [route, setRoute] = useS(() => localStorage.getItem(ROUTE_KEY) || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useS(false);
  const [inviteOpen, setInviteOpen] = useS(false);

  useE(() => {
    localStorage.setItem(ROUTE_KEY, route);
    setSidebarOpen(false);
  }, [route]);

  // Cancel any in-progress edit when workspace switches
  useE(() => { setDraftData(null); }, [ws.id]);

  const editing = draftData !== null;
  const data = editing ? draftData : savedData;
  const set = useC((updater) => {
    if (!editing) return;
    setDraftData(prev => typeof updater === "function" ? updater(prev) : updater);
  }, [editing]);

  const startEdit = () => setDraftData(JSON.parse(JSON.stringify(savedData)));
  const cancelEdit = () => setDraftData(null);
  const saveEdit = () => {
    auth.updateActiveData(draftData);
    setDraftData(null);
  };

  const PageComp = PAGE_COMPONENTS[route] || PageDashboard;
  const currentPage = PAGES.find(p => p.id === route);

  const groups = useM(() => {
    const g = {};
    PAGES.forEach((p, i) => {
      if (!g[p.group]) g[p.group] = [];
      g[p.group].push({ ...p, num: i + 1 });
    });
    return g;
  }, []);

  // collaborators with active status (incl. owner)
  const activeCollab = [
    { email: ws.ownerEmail, role: "Właściciel" },
    ...(ws.collaborators || []).filter(c => c.status === "Aktywny").map(c => ({ email: c.email, role: c.role })),
  ];
  const collabCount = activeCollab.length;

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
            {savedData.couple.date ? new Date(savedData.couple.date).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "— · — · ——"}
          </div>
        </div>

        <nav className="nav">
          {Object.entries(groups).map(([group, items]) => (
            <React.Fragment key={group}>
              <div className="nav__group">{group}</div>
              {items.map(p => (
                <button
                  key={p.id}
                  className={"nav__item " + (route === p.id ? "is-active" : "")}
                  onClick={() => setRoute(p.id)}
                >
                  <span className="nav__num">{String(p.num).padStart(2, "0")}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* collab strip at bottom of sidebar */}
        <div style={{ marginTop: "auto", padding: "16px 28px", borderTop: "1px solid var(--line-soft)" }}>
          <div className="brand__meta" style={{ marginTop: 0, marginBottom: 10 }}>
            Współedytorzy · {collabCount}
          </div>
          <div className="avatar-stack">
            {activeCollab.slice(0, 6).map(c => (
              <span
                key={c.email}
                className="avatar avatar--sm"
                style={{ background: avatarColor(c.email) }}
                title={c.email + " · " + c.role}
              >
                {authInitials(null, c.email)}
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
            <button className="btn" onClick={() => setInviteOpen(true)} title="Zaproś / zarządzaj">
              <Icon name="plus" size={14} /> Zaproś
            </button>
            {auth.canEdit && !editing && (
              <button className="btn btn--primary" onClick={startEdit}>
                <Icon name="edit" size={14} /> Edytuj
              </button>
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

      {inviteOpen && <InviteModal auth={auth} onClose={() => setInviteOpen(false)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Wygląd" />
        <TweakRadio
          label="Motyw"
          value={tweaks.theme}
          options={[
            { value: "light", label: "Jasny" },
            { value: "dark", label: "Ciemny" },
          ]}
          onChange={(v) => setTweak("theme", v)}
        />
      </TweaksPanel>
    </div>
  );
}

export default App;
