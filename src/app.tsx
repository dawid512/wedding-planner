// Wedding Planner — main app shell (with auth + collaborators)

import React, { useState as useS, useEffect as useE, useMemo as useM, useCallback as useC } from "react";
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

const PAGE_COMPONENTS: Record<string, React.ComponentType<PlannerPageProps>> = {
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

  const [draftData, setDraftData] = useS<AppData | null>(null);
  const [route, setRoute] = useS<string>(() => localStorage.getItem(ROUTE_KEY) || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useS(false);
  const [inviteOpen, setInviteOpen] = useS(false);

  useE(() => {
    localStorage.setItem(ROUTE_KEY, route);
    setSidebarOpen(false);
  }, [route]);

  useE(() => {
    setDraftData(null);
  }, [ws.id]);

  const editing = draftData !== null;
  const data: AppData = editing ? draftData : savedData;
  const set = useC((updater: DataUpdater) => {
    if (!editing) return;
    setDraftData((prev) => typeof updater === "function" ? updater(prev as AppData) : updater);
  }, [editing]);

  const startEdit  = () => setDraftData(JSON.parse(JSON.stringify(savedData)));
  const cancelEdit = () => setDraftData(null);
  const saveEdit   = () => {
    auth.updateActiveData(draftData as AppData);
    setDraftData(null);
  };

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
