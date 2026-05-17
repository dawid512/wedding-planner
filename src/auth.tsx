// Wedding Planner — Google OAuth + Google Drive auth

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Icon, EMPTY_DATA } from "./core";
import type { AppData } from "./core";
import { loadGoogleIdentity } from "./lib/google-identity";
import { appConfig } from "./config/app-config";
import {
  getUserInfo,
  findOrCreateFolder,
  findFile,
  readJsonFile,
  createJsonFile,
  updateJsonFile,
  shareFile,
  listPermissions,
  removePermission,
} from "./lib/google-drive";
import type { DrivePermission } from "./lib/google-drive";
import { openFilePicker } from "./lib/google-picker";

// ============================================================
// TYPES
// ============================================================

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

interface Collaborator {
  email: string;
  role: string;
  status?: string;
}

interface Workspace {
  id: string;
  ownerEmail: string;
  name: string;
  data: AppData;
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
  session: string | null;
  isLoading: boolean;
  driveError: string | null;
  isGuest: boolean;
  needsPicker: boolean;   // true = collaborator must pick a shared file
  fileId: string | null;

  activeWorkspace: Workspace | null;
  currentUser: GoogleUser | null;
  myWorkspaces: Workspace[];
  myRole: string | null;
  canEdit: boolean;

  users: GoogleUser[];
  workspaces: WorkspacesMap;

  googleLogin: () => void;
  logout: () => void;
  updateActiveData: (data: AppData) => void;
  renameWorkspace: (name: string) => void;
  _loadGuestFile: (fileId: string) => Promise<void>;

  // Stub methods for backward compat
  login: (email: string, password: string) => AuthResult;
  register: (email: string, password: string, name: string) => AuthResult;
  switchWorkspace: (wsId: string) => void;
  addCollaborator: (email: string, role: string) => AuthResult;
  removeCollaborator: (email: string) => void;
  updateCollaboratorRole: (email: string, role: string) => void;
}

// ============================================================
// HELPERS
// ============================================================

export function authInitials(name: string | null | undefined, email: string): string {
  const src = (name || email || "?").trim();
  if (!src) return "?";
  const parts = src.split(/\s+|@/).filter(Boolean);
  const a = (parts[0]?.[0] || "?").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b) || "?";
}

export function avatarColor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) % 360;
  return `oklch(0.85 0.05 ${h})`;
}

// ============================================================
// MODULE-LEVEL TOKEN REF
// Allows InviteModal (same file) to access the current token
// without exposing it in the public AuthState interface.
// ============================================================
const _tokenRef: { current: string | null } = { current: null };

// ============================================================
// CONSTANTS
// ============================================================

const LS = {
  email:      "wp_g_email",
  name:       "wp_g_name",
  fileId:     "wp_g_file_id",
  folderId:   "wp_g_folder_id",
  wsName:     "wp_g_ws_name",
  joinFileId: "wp_g_join_file_id",
};

const DATA_FILE = "wedding-data.json";
const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file openid email profile";
const SILENT_RESTORE_TIMEOUT_MS = 12_000;

function readJoinParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const join = params.get("join");
  if (join) {
    localStorage.setItem(LS.joinFileId, join);
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState({}, "", url.toString());
  }
  return localStorage.getItem(LS.joinFileId);
}

// ============================================================
// useAuth HOOK
// ============================================================

function useAuth(): AuthState {
  const [session,    setSession]    = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState<boolean>(() => !!localStorage.getItem(LS.email));
  const [driveError, setDriveError] = useState<string | null>(null);
  const [userInfo,   setUserInfo]   = useState<GoogleUser | null>(null);
  const [workspace,  setWorkspace]  = useState<Workspace | null>(null);
  const [fileId,      setFileId]      = useState<string | null>(null);
  const [isGuest,     setIsGuest]     = useState<boolean>(false);
  const [needsPicker, setNeedsPicker] = useState<boolean>(false);

  const tokenClientRef = useRef<TokenClient | null>(null);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileIdRef      = useRef<string | null>(null);
  fileIdRef.current    = fileId;

  // ----------------------------------------------------------
  // Clear everything
  // ----------------------------------------------------------

  const clearSession = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    _tokenRef.current = null;
    setSession(null);
    setIsLoading(false);
    setUserInfo(null);
    setWorkspace(null);
    setFileId(null);
    setIsGuest(false);
    setNeedsPicker(false);
    setDriveError(null);
    Object.values(LS).forEach(k => localStorage.removeItem(k));
  }, []);

  // ----------------------------------------------------------
  // Own plan bootstrap (not a join flow)
  // ----------------------------------------------------------

  const bootstrapOwnPlan = useCallback(async (
    accessToken: string,
    email: string,
  ) => {
    let fId = localStorage.getItem(LS.folderId);
    if (!fId) {
      fId = await findOrCreateFolder(accessToken, appConfig.googleAppFolderName);
      localStorage.setItem(LS.folderId, fId);
    }

    let dFileId = localStorage.getItem(LS.fileId);
    if (!dFileId) {
      dFileId = await findFile(accessToken, fId, DATA_FILE);
      if (!dFileId) dFileId = await createJsonFile(accessToken, fId, DATA_FILE, EMPTY_DATA);
      localStorage.setItem(LS.fileId, dFileId);
    }

    let appData: AppData;
    try {
      appData = await readJsonFile<AppData>(accessToken, dFileId);
    } catch {
      // Stale cache — search again
      dFileId = await findFile(accessToken, fId, DATA_FILE) ||
                await createJsonFile(accessToken, fId, DATA_FILE, EMPTY_DATA);
      localStorage.setItem(LS.fileId, dFileId);
      appData = await readJsonFile<AppData>(accessToken, dFileId);
    }

    setFileId(dFileId);
    setIsGuest(false);
    setWorkspace({
      id:            email,
      ownerEmail:    email,
      name:          localStorage.getItem(LS.wsName) || "Mój ślub",
      data:          { ...EMPTY_DATA, ...appData },
      collaborators: [],
      createdAt:     Date.now(),
    });
  }, []);

  // ----------------------------------------------------------
  // Main bootstrap after receiving an access token
  // ----------------------------------------------------------

  const bootstrapDrive = useCallback(async (accessToken: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    _tokenRef.current = accessToken;
    setIsLoading(true);
    setDriveError(null);

    try {
      const info  = await getUserInfo(accessToken);
      const gUser: GoogleUser = { email: info.email, name: info.name, picture: info.picture };
      setUserInfo(gUser);
      setSession(info.email);
      localStorage.setItem(LS.email, info.email);
      localStorage.setItem(LS.name,  info.name);

      const joinFileId = readJoinParam();

      if (joinFileId) {
        // Collaborator flow — open Picker so they can select the shared file.
        // This grants drive.file access even to files they didn't create.
        setNeedsPicker(true);
        setIsGuest(true);
        setIsLoading(false);
        return; // Picker will call loadGuestFile() after user selects
      } else {
        await bootstrapOwnPlan(accessToken, info.email);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Drive bootstrap error:", msg);
      setDriveError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [bootstrapOwnPlan]);

  // ----------------------------------------------------------
  // GIS init
  // ----------------------------------------------------------

  useEffect(() => {
    if (!appConfig.googleClientId) { setIsLoading(false); return; }

    readJoinParam(); // capture ?join= early

    const hadSession = !!localStorage.getItem(LS.email);

    loadGoogleIdentity().then(() => {
      tokenClientRef.current = window.google!.accounts.oauth2.initTokenClient({
        client_id: appConfig.googleClientId,
        scope: DRIVE_SCOPES,
        callback: (response: TokenResponse) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (response.error) { clearSession(); return; }
          bootstrapDrive(response.access_token);
        },
        error_callback: () => clearSession(),
      });

      if (hadSession) {
        timeoutRef.current = setTimeout(clearSession, SILENT_RESTORE_TIMEOUT_MS);
        tokenClientRef.current!.requestAccessToken({ prompt: "" });
      } else {
        setIsLoading(false);
      }
    }).catch(() => clearSession());

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [bootstrapDrive, clearSession]);

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------

  const googleLogin = useCallback(() => {
    if (!tokenClientRef.current) { alert("Odśwież stronę i spróbuj ponownie."); return; }
    setDriveError(null);
    tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
  }, []);

  // Called after collaborator picks a shared file via Google Picker
  const loadGuestFile = useCallback(async (pickedFileId: string) => {
    const t = _tokenRef.current;
    if (!t) return;
    setIsLoading(true);
    setNeedsPicker(false);
    try {
      const data = await readJsonFile<AppData>(t, pickedFileId);
      setFileId(pickedFileId);
      localStorage.setItem(LS.fileId, pickedFileId);
      setWorkspace({
        id:            pickedFileId,
        ownerEmail:    (userInfo?.email) ?? "",
        name:          "Wspólny plan ślubny",
        data:          { ...EMPTY_DATA, ...data },
        collaborators: [],
        createdAt:     Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDriveError(msg);
      setNeedsPicker(true);
    } finally {
      setIsLoading(false);
    }
  }, [userInfo]);

  const logout = useCallback(() => {
    const t = _tokenRef.current;
    if (t) { try { window.google?.accounts?.oauth2?.revoke(t, () => {}); } catch {} }
    clearSession();
  }, [clearSession]);

  const updateActiveData = useCallback((data: AppData): void => {
    setWorkspace(prev => prev ? { ...prev, data, updatedAt: Date.now() } : null);
    const t   = _tokenRef.current;
    const fid = fileIdRef.current;
    if (t && fid) updateJsonFile(t, fid, data).catch(console.error);
  }, []);

  const renameWorkspace = useCallback((name: string): void => {
    setWorkspace(prev => prev ? { ...prev, name } : null);
    localStorage.setItem(LS.wsName, name);
  }, []);

  // ----------------------------------------------------------
  // Derived / memoized
  // ----------------------------------------------------------

  const myRole      = session ? (isGuest ? "Edytor" : "Właściciel") : null;
  // expose loadGuestFile via auth for PickerScreen
  const _loadGuestFile = loadGuestFile;
  const canEdit     = myRole === "Właściciel" || myRole === "Edytor";
  const users       = useMemo(() => userInfo ? [userInfo] : [], [userInfo]);
  const workspaces  = useMemo<WorkspacesMap>(
    () => workspace ? { [workspace.id]: workspace } : {},
    [workspace],
  );
  const myWorkspaces = useMemo(() => workspace ? [workspace] : [], [workspace]);

  return useMemo(() => ({
    session, isLoading, driveError, isGuest, needsPicker, fileId,
    _loadGuestFile,
    activeWorkspace: workspace, currentUser: userInfo,
    myWorkspaces, myRole, canEdit, users, workspaces,
    googleLogin, logout, updateActiveData, renameWorkspace,
    login:                  () => ({ ok: true as const }),
    register:               () => ({ ok: true as const }),
    switchWorkspace:        () => {},
    addCollaborator:        () => ({ error: "Użyj panelu Zaproś" }),
    removeCollaborator:     () => {},
    updateCollaboratorRole: () => {},
  }), [
    session, isLoading, driveError, isGuest, needsPicker, fileId,
    workspace, userInfo, myWorkspaces, myRole, canEdit, users, workspaces,
    googleLogin, logout, updateActiveData, renameWorkspace,
    _loadGuestFile,
  ]);
}

// ============================================================
// AUTH SCREEN
// ============================================================

interface AuthScreenProps { auth: AuthState; }

// PickerScreen — shown to collaborators who need to open a shared file
export function PickerScreen({ auth }: { auth: AuthState }) {
  const [picking, setPicking] = useState(false);
  const [error,   setError]   = useState("");

  const openPicker = async () => {
    const t = _tokenRef.current;
    if (!t || !appConfig.googlePickerApiKey) {
      setError("Brak tokenu lub klucza Picker API. Odśwież stronę.");
      return;
    }
    setPicking(true);
    setError("");
    try {
      const result = await openFilePicker(t, appConfig.googlePickerApiKey, "wedding-data");
      await auth._loadGuestFile(result.fileId);
    } catch (err) {
      if (err instanceof Error && err.message !== "Picker cancelled") {
        setError(err.message);
      }
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__eyebrow">— Planner ślubny —</div>
        <h1 className="auth__title">Otwórz <em>wspólny plan</em></h1>
        <p className="auth__sub">
          Zostałeś zaproszony do edycji planu ślubnego.<br />
          Kliknij poniżej, wybierz plik <code>wedding-data.json</code> udostępniony przez właściciela.
        </p>
        {error && <div className="auth__error" style={{ marginBottom: 16 }}>{error}</div>}
        <button
          className="btn btn--primary auth__submit"
          onClick={openPicker}
          disabled={picking}
        >
          {picking ? "Otwieranie…" : "Wybierz plik z Google Drive"}
        </button>
        <div className="auth__note">
          <button
            className="btn"
            style={{ marginTop: 8, width: "100%" }}
            onClick={() => {
              localStorage.removeItem(LS.joinFileId);
              window.location.reload();
            }}
          >
            Zaloguj się na swoje konto zamiast tego
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ auth }: AuthScreenProps) {
  if (auth.isLoading) {
    return (
      <div className="auth">
        <div className="auth__card" style={{ textAlign: "center" }}>
          <div className="auth__eyebrow">— Planner ślubny —</div>
          <h1 className="auth__title">Wczytywanie <em>danych…</em></h1>
          <p className="auth__sub">Łączymy się z Google Drive…</p>
        </div>
      </div>
    );
  }
  if (!appConfig.googleClientId) {
    return (
      <div className="auth">
        <div className="auth__card">
          <div className="auth__eyebrow">— Planner ślubny —</div>
          <h1 className="auth__title">Konfiguracja <em>Google</em></h1>
          <p className="auth__sub">Brakuje klucza Google Client ID. Utwórz plik <code>.env.local</code>:</p>
          <pre style={{ background: "var(--bg-alt,#f4f4f4)", padding: "12px 16px", borderRadius: 8, fontSize: 12, marginTop: 16 }}>
            VITE_GOOGLE_CLIENT_ID=twoj-client-id.apps.googleusercontent.com
          </pre>
        </div>
      </div>
    );
  }
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__eyebrow">— Planner ślubny —</div>
        <h1 className="auth__title">Witamy <em>w plannerze</em></h1>
        <p className="auth__sub">
          Zaloguj się kontem Google — dane przechowywane bezpiecznie na Twoim Google Drive.
        </p>
        {auth.driveError && (
          <div className="auth__error" style={{ marginBottom: 16 }}>Błąd: {auth.driveError}</div>
        )}
        <button
          className="btn btn--primary auth__submit"
          style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}
          onClick={() => auth.googleLogin()}
        >
          <GoogleIcon />Zaloguj się przez Google
        </button>
        <div className="auth__note">
          <span className="mono">Zakres: <code>drive.file</code> — tylko pliki tej aplikacji.</span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
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
  const ws      = auth.activeWorkspace;
  const isOwner = !auth.isGuest;

  const [email,        setEmail]        = useState("");
  const [role,         setRole]         = useState<"writer" | "reader">("writer");
  const [sending,      setSending]      = useState(false);
  const [sendError,    setSendError]    = useState("");
  const [sendSuccess,  setSendSuccess]  = useState("");
  const [permissions,  setPermissions]  = useState<DrivePermission[] | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [copied,       setCopied]       = useState(false);

  const inviteLink = auth.fileId
    ? `${window.location.origin}${window.location.pathname}?join=${auth.fileId}`
    : null;

  // Load collaborator list
  useEffect(() => {
    if (!isOwner || !auth.fileId || !_tokenRef.current) return;
    setLoadingPerms(true);
    listPermissions(_tokenRef.current, auth.fileId)
      .then(perms => setPermissions(perms.filter(p => p.role !== "owner")))
      .catch(() => setPermissions([]))
      .finally(() => setLoadingPerms(false));
  }, [isOwner, auth.fileId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.fileId || !_tokenRef.current) {
      setSendError("Brak tokenu — odśwież stronę.");
      return;
    }
    setSending(true); setSendError(""); setSendSuccess("");
    try {
      await shareFile(_tokenRef.current, auth.fileId, email.trim(), role);
      setSendSuccess(`Zaproszono ${email.trim()} — dostali powiadomienie na maila.`);
      setEmail("");
      listPermissions(_tokenRef.current, auth.fileId).then(perms =>
        setPermissions(perms.filter(p => p.role !== "owner"))
      );
    } catch {
      setSendError("Błąd — sprawdź email i spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (permId: string) => {
    if (!auth.fileId || !_tokenRef.current) return;
    await removePermission(_tokenRef.current, auth.fileId, permId).catch(console.error);
    setPermissions(prev => prev ? prev.filter(p => p.id !== permId) : prev);
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!ws) return null;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__h">
          <div>
            <div className="mono muted" style={{ marginBottom: 4, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 10 }}>
              {isOwner ? "Współpraca" : "Informacje"}
            </div>
            <h2 className="modal__title">
              {isOwner ? <>Zaproś do <em>edycji</em></> : <>Twój <em>plan ślubny</em></>}
            </h2>
          </div>
          <button className="btn btn--ghost btn--icon" onClick={onClose}><Icon name="x" /></button>
        </div>

        {/* Who's logged in */}
        <div className="invite__list">
          <div className="ornament">Zalogowany jako</div>
          <div className="collab-row collab-row--owner">
            <AvatarEl user={auth.currentUser} email={ws.ownerEmail} />
            <div className="collab-row__info">
              <div className="collab-row__name">{auth.currentUser?.name || ws.ownerEmail}</div>
              <div className="muted mono" style={{ fontSize: 11 }}>{ws.ownerEmail}</div>
            </div>
            <span className="tag tag--accent">{auth.myRole}</span>
          </div>
        </div>

        {isOwner && (
          <>
            {/* Invite form */}
            <form onSubmit={handleInvite} className="invite__form" style={{ marginTop: 20 }}>
              <div className="ornament">Zaproś osobę</div>
              <div className="invite__row" style={{ marginTop: 12 }}>
                <label className="auth__label" style={{ flex: 1 }}>
                  <span>Email Google</span>
                  <input
                    className="auth__input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="narzeczona@gmail.com" required
                  />
                </label>
                <label className="auth__label" style={{ width: 150 }}>
                  <span>Rola</span>
                  <select className="auth__input" value={role}
                    onChange={e => setRole(e.target.value as "writer" | "reader")}>
                    <option value="writer">Edytor</option>
                    <option value="reader">Podgląd</option>
                  </select>
                </label>
              </div>
              {sendError   && <div className="auth__error"   style={{ marginTop: 6 }}>{sendError}</div>}
              {sendSuccess && <div className="auth__success" style={{ marginTop: 6 }}>{sendSuccess}</div>}
              <button type="submit" className="btn btn--primary" disabled={sending} style={{ marginTop: 10 }}>
                <Icon name="plus" size={14} />{sending ? "Wysyłanie…" : "Wyślij zaproszenie"}
              </button>
            </form>

            {/* Invite link */}
            {inviteLink && (
              <div style={{ marginTop: 20 }}>
                <div className="ornament">Link zaproszenia</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <input className="auth__input" readOnly value={inviteLink}
                    style={{ flex: 1, fontSize: 11 }} />
                  <button className="btn" onClick={copyLink} style={{ whiteSpace: "nowrap" }}>
                    {copied ? <><Icon name="check" size={14} /> Skopiowano</> : "Kopiuj link"}
                  </button>
                </div>
                <div className="muted mono" style={{ fontSize: 11, marginTop: 6 }}>
                  Zaproszona osoba otwiera link i loguje się Google — zobaczy ten plan.
                </div>
              </div>
            )}

            {/* Collaborators list */}
            <div style={{ marginTop: 20 }}>
              <div className="ornament">
                Osoby z dostępem{permissions !== null ? ` · ${permissions.length}` : ""}
              </div>
              {loadingPerms && (
                <div className="muted" style={{ padding: "12px 0", fontSize: 13 }}>Ładowanie…</div>
              )}
              {!loadingPerms && permissions?.length === 0 && (
                <div className="muted serif-italic" style={{ padding: "16px 0", textAlign: "center", fontStyle: "italic" }}>
                  Jeszcze nikt nie został zaproszony.
                </div>
              )}
              {!loadingPerms && permissions?.map(p => (
                <div className="collab-row" key={p.id}>
                  <div className="avatar" style={{ background: avatarColor(p.emailAddress) }}>
                    {authInitials(p.displayName, p.emailAddress)}
                  </div>
                  <div className="collab-row__info">
                    <div className="collab-row__name">{p.displayName || p.emailAddress}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{p.emailAddress}</div>
                  </div>
                  <span className="tag">{p.role === "writer" ? "Edytor" : "Podgląd"}</span>
                  <button className="btn btn--ghost btn--icon"
                    onClick={() => handleRemove(p.id)} title="Cofnij dostęp">
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!isOwner && (
          <div style={{ marginTop: 20 }}>
            <div className="ornament">Tryb gościa</div>
            <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>
              Przeglądasz plan udostępniony przez właściciela.
            </div>
            <button className="btn" style={{ marginTop: 8 }} onClick={() => {
              localStorage.removeItem(LS.joinFileId);
              window.location.reload();
            }}>
              Wróć do swojego planu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarEl({ user, email }: { user: GoogleUser | null; email: string }) {
  if (user?.picture) {
    return (
      <img src={user.picture} alt={user.name} className="avatar"
        style={{ borderRadius: "50%", objectFit: "cover", width: 36, height: 36 }}
        referrerPolicy="no-referrer" />
    );
  }
  return (
    <div className="avatar" style={{ background: avatarColor(email) }}>
      {authInitials(user?.name, email)}
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
  const [open, setOpen] = useState(false);
  const user = auth.currentUser;
  if (!user) return null;

  React.useEffect(() => {
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
        {user.picture
          ? <img src={user.picture} alt={user.name} className="avatar avatar--sm"
              style={{ borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
          : <span className="avatar avatar--sm" style={{ background: avatarColor(user.email) }}>
              {authInitials(user.name, user.email)}
            </span>
        }
      </button>
      {open && (
        <div className="user-menu__pop">
          <div className="user-menu__user">
            {user.picture
              ? <img src={user.picture} alt={user.name} className="avatar"
                  style={{ borderRadius: "50%", objectFit: "cover", width: 36, height: 36 }}
                  referrerPolicy="no-referrer" />
              : <div className="avatar" style={{ background: avatarColor(user.email) }}>
                  {authInitials(user.name, user.email)}
                </div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{user.name}</div>
              <div className="muted mono" style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </div>
            </div>
          </div>
          <div className="user-menu__div" />
          <button className="user-menu__item" onClick={() => { onInviteClick(); setOpen(false); }}>
            <Icon name="plus" size={14} /> Zaproś / Współpraca
          </button>
          <div className="user-menu__div" />
          <button className="user-menu__item user-menu__item--danger" onClick={() => auth.logout()}>
            Wyloguj się
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// EXPORTS
// ============================================================

export { useAuth, AuthScreen, InviteModal, UserMenu };
