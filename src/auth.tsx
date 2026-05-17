// Wedding Planner — auth, workspaces, collaborators (mockup)

import React, { useState as useAS, useEffect as useAE, useMemo as useAM } from "react";
import { Icon as AIcon, EMPTY_DATA as A_EMPTY } from "./core";

// ============================================================
// TYPES
// ============================================================
interface StorageKeys {
  users: string;
  workspaces: string;
  session: string;
  activeWs: string;
  oldData: string;
}

interface User {
  email: string;
  password: string;
  name: string;
  createdAt: number;
}

interface Collaborator {
  email: string;
  role: string;
  status: string;
  addedBy: string | null;
  addedAt: number;
}

interface Workspace {
  id: string;
  ownerEmail: string;
  name: string;
  data: typeof A_EMPTY;
  collaborators: Collaborator[];
  createdAt: number;
  updatedAt?: number;
}

type WorkspacesMap = Record<string, Workspace>;

interface AuthResult {
  ok?: true;
  error?: string;
  status?: string;
}

export interface AuthState {
  users: User[];
  workspaces: WorkspacesMap;
  session: string | null;
  activeWorkspace: Workspace | null;
  currentUser: User | null;
  myWorkspaces: Workspace[];
  myRole: string | null;
  canEdit: boolean;
  register: (email: string, password: string, name: string) => AuthResult;
  login: (email: string, password: string) => AuthResult;
  logout: () => void;
  switchWorkspace: (wsId: string) => void;
  updateActiveData: (data: typeof A_EMPTY) => void;
  addCollaborator: (email: string, role: string) => AuthResult;
  removeCollaborator: (email: string) => void;
  updateCollaboratorRole: (email: string, role: string) => void;
  renameWorkspace: (name: string) => void;
}

// ============================================================
// STORAGE HELPERS
// ============================================================
const STORAGE: StorageKeys = {
  users: "wp_users",
  workspaces: "wp_workspaces",
  session: "wp_session",
  activeWs: "wp_active_ws",
  oldData: "wedding-planner-data-v1",
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v === null || v === undefined ? fallback : v;
  } catch { return fallback; }
}
function writeJSON<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function genId(prefix: string): string {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function normEmail(e: string | null | undefined): string { return (e || "").trim().toLowerCase(); }
function initials(name: string | null | undefined, email: string): string {
  const src = (name || email || "?").trim();
  if (!src) return "?";
  const parts = src.split(/\s+|@/).filter(Boolean);
  const a = (parts[0]?.[0] || "?").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b) || "?";
}
function avatarColor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) % 360;
  return `oklch(0.85 0.05 ${h})`;
}

// ============================================================
// useAuth HOOK
// ============================================================
function useAuth(): AuthState {
  const [users, _setUsers] = useAS<User[]>(() => readJSON<User[]>(STORAGE.users, []));
  const [workspaces, _setWorkspaces] = useAS<WorkspacesMap>(() => readJSON<WorkspacesMap>(STORAGE.workspaces, {}));
  const [session, _setSession] = useAS<string | null>(() => localStorage.getItem(STORAGE.session));
  const [activeWs, _setActiveWs] = useAS<string | null>(() => localStorage.getItem(STORAGE.activeWs));

  const setUsers = (u: User[]) => { _setUsers(u); writeJSON(STORAGE.users, u); };
  const setWorkspaces = (w: WorkspacesMap) => { _setWorkspaces(w); writeJSON(STORAGE.workspaces, w); };
  const setSession = (e: string | null) => {
    _setSession(e);
    if (e) localStorage.setItem(STORAGE.session, e);
    else localStorage.removeItem(STORAGE.session);
  };
  const setActiveWs = (id: string | null) => {
    _setActiveWs(id);
    if (id) localStorage.setItem(STORAGE.activeWs, id);
    else localStorage.removeItem(STORAGE.activeWs);
  };

  const currentUser = useAM<User | null>(
    () => users.find(u => u.email === session) ?? null,
    [users, session]
  );

  const myWorkspaces = useAM<Workspace[]>(() => {
    if (!session) return [];
    return Object.values(workspaces).filter(ws =>
      ws.ownerEmail === session ||
      (ws.collaborators || []).some(c => normEmail(c.email) === normEmail(session))
    );
  }, [workspaces, session]);

  // Auto-activate pending collaborator entries when the user logs in
  useAE(() => {
    if (!session) return;
    let changed = false;
    const next = { ...workspaces };
    Object.values(next).forEach(ws => {
      (ws.collaborators || []).forEach(c => {
        if (normEmail(c.email) === normEmail(session) && c.status === "Zaproszony") {
          c.status = "Aktywny";
          changed = true;
        }
      });
    });
    if (changed) setWorkspaces(next);
  }, [session]);

  const register = (email: string, password: string, name: string): AuthResult => {
    email = normEmail(email);
    if (!email || !password) return { error: "Wypełnij wszystkie pola" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Niepoprawny format email" };
    if (password.length < 4) return { error: "Hasło musi mieć min. 4 znaki" };
    if (users.find(u => u.email === email)) return { error: "Konto z tym mailem już istnieje" };

    const newUser: User = { email, password, name: name || email.split("@")[0], createdAt: Date.now() };
    setUsers([...users, newUser]);

    // Import legacy data into the new workspace if it's the first user
    const legacy = users.length === 0 ? readJSON<typeof A_EMPTY | null>(STORAGE.oldData, null) : null;

    const wsId = genId("ws");
    const newWs: Workspace = {
      id: wsId,
      ownerEmail: email,
      name: legacy ? "Mój ślub (zaimportowany)" : "Mój ślub",
      data: legacy || A_EMPTY,
      collaborators: [],
      createdAt: Date.now(),
    };
    setWorkspaces({ ...workspaces, [wsId]: newWs });
    if (legacy) localStorage.removeItem(STORAGE.oldData);

    setSession(email);
    setActiveWs(wsId);
    return { ok: true };
  };

  const login = (email: string, password: string): AuthResult => {
    email = normEmail(email);
    if (!email || !password) return { error: "Wpisz email i hasło" };
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { error: "Niepoprawny email lub hasło" };
    setSession(email);
    const wss = Object.values(workspaces).filter(ws =>
      ws.ownerEmail === email ||
      (ws.collaborators || []).some(c => normEmail(c.email) === email)
    );
    setActiveWs(wss[0]?.id ?? null);
    return { ok: true };
  };

  const logout = (): void => {
    setSession(null);
    setActiveWs(null);
  };

  const switchWorkspace = (wsId: string): void => setActiveWs(wsId);

  let activeWorkspace: Workspace | null = activeWs ? workspaces[activeWs] ?? null : null;
  if (!activeWorkspace && myWorkspaces.length > 0) activeWorkspace = myWorkspaces[0];

  // Verify the user still has access; otherwise nullify
  if (activeWorkspace && session) {
    const hasAccess = activeWorkspace.ownerEmail === session ||
      (activeWorkspace.collaborators || []).some(c => normEmail(c.email) === normEmail(session));
    if (!hasAccess) activeWorkspace = myWorkspaces[0] ?? null;
  }

  const myRole = useAM<string | null>(() => {
    if (!activeWorkspace || !session) return null;
    if (activeWorkspace.ownerEmail === session) return "Właściciel";
    const c = (activeWorkspace.collaborators || []).find(c => normEmail(c.email) === normEmail(session));
    return c?.role ?? null;
  }, [activeWorkspace, session]);

  const canEdit = myRole === "Właściciel" || myRole === "Edytor";

  const updateActiveData = (data: typeof A_EMPTY): void => {
    if (!activeWorkspace) return;
    setWorkspaces({
      ...workspaces,
      [activeWorkspace.id]: { ...activeWorkspace, data, updatedAt: Date.now() },
    });
  };

  const addCollaborator = (email: string, role: string): AuthResult => {
    email = normEmail(email);
    if (!activeWorkspace) return { error: "Brak aktywnego planu" };
    if (!email) return { error: "Wpisz email" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Niepoprawny format email" };
    if (email === activeWorkspace.ownerEmail) return { error: "Właściciel ma już dostęp" };
    if ((activeWorkspace.collaborators || []).some(c => normEmail(c.email) === email)) {
      return { error: "Ta osoba została już zaproszona" };
    }
    const exists = users.find(u => u.email === email);
    const collab: Collaborator = {
      email, role,
      status: exists ? "Aktywny" : "Zaproszony",
      addedBy: session,
      addedAt: Date.now(),
    };
    setWorkspaces({
      ...workspaces,
      [activeWorkspace.id]: {
        ...activeWorkspace,
        collaborators: [...(activeWorkspace.collaborators || []), collab],
      },
    });
    return { ok: true, status: collab.status };
  };

  const removeCollaborator = (email: string): void => {
    if (!activeWorkspace) return;
    setWorkspaces({
      ...workspaces,
      [activeWorkspace.id]: {
        ...activeWorkspace,
        collaborators: (activeWorkspace.collaborators || []).filter(c => normEmail(c.email) !== normEmail(email)),
      },
    });
  };

  const updateCollaboratorRole = (email: string, role: string): void => {
    if (!activeWorkspace) return;
    setWorkspaces({
      ...workspaces,
      [activeWorkspace.id]: {
        ...activeWorkspace,
        collaborators: (activeWorkspace.collaborators || []).map(c =>
          normEmail(c.email) === normEmail(email) ? { ...c, role } : c
        ),
      },
    });
  };

  const renameWorkspace = (name: string): void => {
    if (!activeWorkspace) return;
    setWorkspaces({
      ...workspaces,
      [activeWorkspace.id]: { ...activeWorkspace, name },
    });
  };

  return {
    users, workspaces, session, activeWorkspace, currentUser, myWorkspaces, myRole, canEdit,
    register, login, logout, switchWorkspace,
    updateActiveData, addCollaborator, removeCollaborator, updateCollaboratorRole, renameWorkspace,
  };
}

// ============================================================
// AUTH SCREEN
// ============================================================
interface AuthScreenProps {
  auth: AuthState;
}

function AuthScreen({ auth }: AuthScreenProps) {
  const [mode, setMode] = useAS<"login" | "register">("login");
  const [email, setEmail] = useAS("");
  const [password, setPassword] = useAS("");
  const [name, setName] = useAS("");
  const [error, setError] = useAS("");

  const submit = (e: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    const r = mode === "login" ? auth.login(email, password) : auth.register(email, password, name);
    if (r.error) setError(r.error);
  };

  const switchMode = (m: "login" | "register") => { setMode(m); setError(""); };

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__eyebrow">— Planner ślubny —</div>
        <h1 className="auth__title">
          {mode === "login"
            ? <React.Fragment>Witamy <em>z powrotem</em></React.Fragment>
            : <React.Fragment>Zacznij <em>swój plan</em></React.Fragment>}
        </h1>
        <p className="auth__sub">
          {mode === "login"
            ? "Zaloguj się, by zobaczyć swój plan ślubu"
            : "Załóż konto, by mieć cały plan w jednym miejscu"}
        </p>

        <div className="auth__tabs">
          <button className={"auth__tab " + (mode === "login" ? "is-on" : "")} onClick={() => switchMode("login")}>Logowanie</button>
          <button className={"auth__tab " + (mode === "register" ? "is-on" : "")} onClick={() => switchMode("register")}>Rejestracja</button>
        </div>

        <form onSubmit={submit} className="auth__form">
          {mode === "register" && (
            <label className="auth__label">
              <span>Imię <small>(opcjonalnie)</small></span>
              <input className="auth__input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jak Cię nazywać" />
            </label>
          )}
          <label className="auth__label">
            <span>Email</span>
            <input className="auth__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ty@mail.com" required autoFocus />
          </label>
          <label className="auth__label">
            <span>Hasło</span>
            <input className="auth__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            {mode === "register" && <small className="muted mono">min. 4 znaki</small>}
          </label>
          {error && <div className="auth__error">{error}</div>}
          <button type="submit" className="btn btn--primary auth__submit">
            {mode === "login" ? "Zaloguj się" : "Załóż konto i zacznij planować"}
          </button>
        </form>

        <div className="auth__note">
          <span className="mono">Demo · konta przechowywane lokalnie w przeglądarce.</span>
          <br/>
          <span className="mono muted">Zarejestruj kilka kont w tej samej przeglądarce, by przetestować zapraszanie do edycji.</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INVITE MODAL
// ============================================================
interface InviteModalProps {
  auth: AuthState;
  onClose: () => void;
}

function InviteModal({ auth, onClose }: InviteModalProps) {
  const [email, setEmail] = useAS("");
  const [role, setRole] = useAS("Edytor");
  const [error, setError] = useAS("");
  const [success, setSuccess] = useAS("");

  const submit = (e: React.FormEvent) => {
    e?.preventDefault();
    setError(""); setSuccess("");
    const r = auth.addCollaborator(email, role);
    if (r.error) setError(r.error);
    else {
      setSuccess(r.status === "Aktywny"
        ? `Dodano ${email} — ma dostęp od razu.`
        : `Zaproszenie zapisane. ${email} zobaczy plan po założeniu konta.`);
      setEmail("");
    }
  };

  const ws = auth.activeWorkspace;
  const isOwner = auth.myRole === "Właściciel";
  const owner = auth.users.find(u => u.email === ws?.ownerEmail);

  if (!ws) return null;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__h">
          <div>
            <div className="mono muted" style={{ marginBottom: 4, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 10 }}>Współpraca</div>
            <h2 className="modal__title">Zaproś do <em>edycji</em></h2>
          </div>
          <button className="btn btn--ghost btn--icon" onClick={onClose}>
            <AIcon name="x" />
          </button>
        </div>

        {isOwner ? (
          <form onSubmit={submit} className="invite__form">
            <div className="invite__row">
              <label className="auth__label" style={{ flex: 1 }}>
                <span>Email osoby</span>
                <input className="auth__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="osoba@mail.com" required />
              </label>
              <label className="auth__label" style={{ width: 180 }}>
                <span>Rola</span>
                <select className="auth__input" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Edytor">Edytor</option>
                  <option value="Podgląd">Podgląd</option>
                </select>
              </label>
            </div>
            {error && <div className="auth__error">{error}</div>}
            {success && <div className="auth__success">{success}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <button type="submit" className="btn btn--primary">
                <AIcon name="plus" size={14} /> Wyślij zaproszenie
              </button>
              <span className="muted mono" style={{ fontSize: 11 }}>
                Edytor: pełna edycja · Podgląd: tylko odczyt
              </span>
            </div>
          </form>
        ) : (
          <div className="invite__readonly">
            <div className="serif-italic" style={{ fontStyle: "italic", fontSize: 18, marginBottom: 6 }}>Masz dostęp jako <strong>{auth.myRole}</strong></div>
            <div className="muted" style={{ fontSize: 13 }}>Tylko właściciel planu może zapraszać kolejne osoby.</div>
          </div>
        )}

        <div className="invite__list">
          <div className="ornament">Osoby z dostępem · {1 + (ws.collaborators?.length || 0)}</div>
          <div className="collab-row collab-row--owner">
            <div className="avatar" style={{ background: avatarColor(ws.ownerEmail) }}>{initials(owner?.name, ws.ownerEmail)}</div>
            <div className="collab-row__info">
              <div className="collab-row__name">
                {owner?.name || ws.ownerEmail}
                {ws.ownerEmail === auth.session && <span className="muted" style={{ fontWeight: 400 }}> (Ty)</span>}
              </div>
              <div className="muted mono" style={{ fontSize: 11 }}>{ws.ownerEmail}</div>
            </div>
            <span className="tag tag--accent">Właściciel</span>
          </div>
          {(ws.collaborators || []).map(c => {
            const u = auth.users.find(uu => uu.email === c.email);
            return (
              <div className="collab-row" key={c.email}>
                <div className="avatar" style={{ background: avatarColor(c.email) }}>{initials(u?.name, c.email)}</div>
                <div className="collab-row__info">
                  <div className="collab-row__name">
                    {u?.name || c.email}
                    {c.email === auth.session && <span className="muted" style={{ fontWeight: 400 }}> (Ty)</span>}
                  </div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{c.email}</div>
                </div>
                {isOwner ? (
                  <select className="auth__input collab-row__role" value={c.role} onChange={(e) => auth.updateCollaboratorRole(c.email, e.target.value)}>
                    <option value="Edytor">Edytor</option>
                    <option value="Podgląd">Podgląd</option>
                  </select>
                ) : (
                  <span className="tag">{c.role}</span>
                )}
                <span className={"tag " + (c.status === "Aktywny" ? "tag--ok" : "tag--warn")}>{c.status}</span>
                {isOwner && (
                  <button className="btn btn--ghost btn--icon" onClick={() => auth.removeCollaborator(c.email)} title="Usuń dostęp">
                    <AIcon name="trash" />
                  </button>
                )}
              </div>
            );
          })}
          {(ws.collaborators || []).length === 0 && (
            <div className="muted serif-italic" style={{ padding: "24px 0", textAlign: "center", fontStyle: "italic" }}>
              Jeszcze nikt nie został zaproszony.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// USER MENU
// ============================================================
interface UserMenuProps {
  auth: AuthState;
  onInviteClick: () => void;
}

function UserMenu({ auth, onInviteClick }: UserMenuProps) {
  const [open, setOpen] = useAS(false);
  const user = auth.currentUser;
  const ws = auth.activeWorkspace;
  if (!user) return null;

  useAE(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".user-menu")) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  return (
    <div className="user-menu">
      <button className="user-menu__trigger" onClick={() => setOpen(!open)} title={user.email}>
        <span className="avatar avatar--sm" style={{ background: avatarColor(user.email) }}>{initials(user.name, user.email)}</span>
      </button>
      {open && (
        <div className="user-menu__pop">
          <div className="user-menu__user">
            <div className="avatar" style={{ background: avatarColor(user.email) }}>{initials(user.name, user.email)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{user.name}</div>
              <div className="muted mono" style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
            </div>
          </div>
          {auth.myWorkspaces.length > 1 && (
            <React.Fragment>
              <div className="user-menu__div"></div>
              <div className="user-menu__section">Twoje plany</div>
              {auth.myWorkspaces.map(w => (
                <button
                  className={"user-menu__item " + (w.id === ws?.id ? "is-on" : "")}
                  key={w.id}
                  onClick={() => { auth.switchWorkspace(w.id); setOpen(false); }}
                >
                  <span style={{ flex: 1, textAlign: "left" }}>{w.name}</span>
                  <span className="mono muted" style={{ fontSize: 9 }}>
                    {w.ownerEmail === user.email ? "Właściciel" : "Edytor"}
                  </span>
                </button>
              ))}
            </React.Fragment>
          )}
          <div className="user-menu__div"></div>
          <button className="user-menu__item" onClick={() => { onInviteClick(); setOpen(false); }}>
            <AIcon name="plus" size={14} /> Zaproś do edycji
          </button>
          <button className="user-menu__item user-menu__item--danger" onClick={() => auth.logout()}>
            Wyloguj się
          </button>
        </div>
      )}
    </div>
  );
}

export { useAuth, AuthScreen, InviteModal, UserMenu, initials as authInitials, avatarColor };
