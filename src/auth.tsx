// Wedding Planner — Google OAuth + Google Drive auth (multi-workspace)

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
  updatePermission,
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

/** Stored in localStorage for each guest plan the user has joined. */
interface GuestPlanInfo {
  fileId: string;
  name: string;
  role: "Edytor" | "Podgląd";
}

interface Collaborator {
  email: string;
  role: string;
  status?: string;
}

export interface Workspace {
  id: string;           // = fileId (unique key)
  fileId: string;       // Google Drive file ID
  ownerEmail: string;   // email of the person who owns this wedding plan
  name: string;
  data: AppData;
  collaborators: Collaborator[];
  createdAt: number;
  updatedAt?: number;
  myRole: "Właściciel" | "Edytor" | "Podgląd";
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
  needsPicker: boolean;
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
  switchWorkspace: (wsId: string) => void;
  _loadGuestFile: (fileId: string) => Promise<void>;

  // Stub backward compat
  login: (email: string, password: string) => AuthResult;
  register: (email: string, password: string, name: string) => AuthResult;
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
  fileId:     "wp_g_file_id",       // own plan file ID
  folderId:   "wp_g_folder_id",     // own plan folder ID
  wsName:     "wp_g_ws_name",       // own plan name
  joinFileId: "wp_g_join_file_id",  // pending join param
  guestPlans: "wp_g_guest_plans",   // JSON: GuestPlanInfo[]
};

const DATA_FILE              = "wedding-data.json";
const DRIVE_SCOPES           = "https://www.googleapis.com/auth/drive.file openid email profile";
const SILENT_RESTORE_TIMEOUT = 12_000;

// ============================================================
// LOCALSTORAGE HELPERS
// ============================================================

function getGuestPlans(): GuestPlanInfo[] {
  try { return JSON.parse(localStorage.getItem(LS.guestPlans) || "[]") as GuestPlanInfo[]; }
  catch { return []; }
}

function saveGuestPlans(plans: GuestPlanInfo[]): void {
  localStorage.setItem(LS.guestPlans, JSON.stringify(plans));
}

function upsertGuestPlan(plan: GuestPlanInfo): void {
  const plans = getGuestPlans();
  const idx   = plans.findIndex(p => p.fileId === plan.fileId);
  if (idx >= 0) plans[idx] = plan; else plans.push(plan);
  saveGuestPlans(plans);
}

function removeGuestPlan(fileId: string): void {
  saveGuestPlans(getGuestPlans().filter(p => p.fileId !== fileId));
}

function readJoinParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const join   = params.get("join");
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
  const [allWs,       setAllWs]       = useState<Workspace[]>([]);
  const [activeWsId,  setActiveWsId]  = useState<string | null>(null);
  const [session,     setSession]     = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState<boolean>(() => !!localStorage.getItem(LS.email));
  const [driveError,  setDriveError]  = useState<string | null>(null);
  const [userInfo,    setUserInfo]    = useState<GoogleUser | null>(null);
  const [needsPicker, setNeedsPicker] = useState<boolean>(false);

  const tokenClientRef = useRef<TokenClient | null>(null);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWsIdRef  = useRef<string | null>(null);
  activeWsIdRef.current = activeWsId;
  const fileIdRef      = useRef<string | null>(null);
  const ownFileIdRef   = useRef<string | null>(null);

  // Derived — active workspace (recalculated every render)
  const activeWorkspace = allWs.find(w => w.id === activeWsId) ?? null;
  fileIdRef.current     = activeWorkspace?.fileId ?? null;

  // ----------------------------------------------------------
  // Clear session state (preserves guestPlans unless fullClear)
  // ----------------------------------------------------------

  const clearSession = useCallback((fullClear?: boolean) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    _tokenRef.current = null;
    setSession(null);
    setIsLoading(false);
    setUserInfo(null);
    setAllWs([]);
    setActiveWsId(null);
    setNeedsPicker(false);
    setDriveError(null);
    localStorage.removeItem(LS.email);
    localStorage.removeItem(LS.name);
    localStorage.removeItem(LS.fileId);
    localStorage.removeItem(LS.folderId);
    localStorage.removeItem(LS.wsName);
    localStorage.removeItem(LS.joinFileId);
    if (fullClear) localStorage.removeItem(LS.guestPlans);
  }, []);

  // ----------------------------------------------------------
  // Bootstrap own (owner) plan
  // ----------------------------------------------------------

  const bootstrapOwnPlan = useCallback(async (
    token: string,
    email: string,
  ): Promise<Workspace> => {
    let fId = localStorage.getItem(LS.folderId);
    if (!fId) {
      fId = await findOrCreateFolder(token, appConfig.googleAppFolderName);
      localStorage.setItem(LS.folderId, fId);
    }

    let dFileId = localStorage.getItem(LS.fileId);
    if (!dFileId) {
      dFileId = await findFile(token, fId, DATA_FILE);
      if (!dFileId) dFileId = await createJsonFile(token, fId, DATA_FILE, EMPTY_DATA);
      localStorage.setItem(LS.fileId, dFileId);
    }

    let appData: AppData;
    try {
      appData = await readJsonFile<AppData>(token, dFileId);
    } catch {
      // Stale cache — search again
      dFileId = await findFile(token, fId, DATA_FILE) ||
                await createJsonFile(token, fId, DATA_FILE, EMPTY_DATA);
      localStorage.setItem(LS.fileId, dFileId);
      appData = await readJsonFile<AppData>(token, dFileId);
    }

    ownFileIdRef.current = dFileId;

    return {
      id:            dFileId,
      fileId:        dFileId,
      ownerEmail:    email,
      name:          localStorage.getItem(LS.wsName) || "Mój ślub",
      data:          { ...EMPTY_DATA, ...appData },
      collaborators: [],
      createdAt:     Date.now(),
      myRole:        "Właściciel",
    };
  }, []);

  // ----------------------------------------------------------
  // Main bootstrap after receiving an access token
  // ----------------------------------------------------------

  const bootstrapDrive = useCallback(async (token: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    _tokenRef.current = token;
    setIsLoading(true);
    setDriveError(null);

    try {
      const info  = await getUserInfo(token);
      const gUser: GoogleUser = { email: info.email, name: info.name, picture: info.picture };
      setUserInfo(gUser);
      setSession(info.email);
      localStorage.setItem(LS.email, info.email);
      localStorage.setItem(LS.name,  info.name);

      // 1. Bootstrap own plan
      const ownWs = await bootstrapOwnPlan(token, info.email);

      // 2. Load all known guest plans from localStorage
      const storedGuests = getGuestPlans();
      const loadedGuests: Workspace[] = [];
      const failedIds: string[]       = [];

      await Promise.all(storedGuests.map(async (gp) => {
        try {
          const data = await readJsonFile<AppData>(token, gp.fileId);
          loadedGuests.push({
            id:            gp.fileId,
            fileId:        gp.fileId,
            ownerEmail:    "",
            name:          gp.name,
            data:          { ...EMPTY_DATA, ...data },
            collaborators: [],
            createdAt:     Date.now(),
            myRole:        gp.role,
          });
        } catch {
          failedIds.push(gp.fileId);
        }
      }));

      // Remove stale entries (access revoked or file deleted)
      if (failedIds.length > 0) {
        saveGuestPlans(storedGuests.filter(gp => !failedIds.includes(gp.fileId)));
      }

      // 3. Handle ?join= param
      const joinFileId     = readJoinParam();
      const alreadyLoaded  = joinFileId
        ? loadedGuests.some(w => w.fileId === joinFileId)
        : false;

      if (joinFileId && !alreadyLoaded) {
        // Try direct access — works if drive.file scope already covers this file
        // (i.e. user previously opened it via Picker in a prior session).
        try {
          const data = await readJsonFile<AppData>(token, joinFileId);
          const newWs: Workspace = {
            id:            joinFileId,
            fileId:        joinFileId,
            ownerEmail:    "",
            name:          "Wspólny plan ślubny",
            data:          { ...EMPTY_DATA, ...data },
            collaborators: [],
            createdAt:     Date.now(),
            myRole:        "Edytor",
          };
          loadedGuests.push(newWs);
          upsertGuestPlan({ fileId: joinFileId, name: newWs.name, role: "Edytor" });
          localStorage.removeItem(LS.joinFileId);
        } catch {
          // No direct access — must use Picker (first-time join)
          const allWorkspaces = [ownWs, ...loadedGuests];
          setAllWs(allWorkspaces);
          setActiveWsId(ownWs.id);  // show own plan in background
          setNeedsPicker(true);
          setIsLoading(false);
          return;
        }
      } else if (joinFileId && alreadyLoaded) {
        localStorage.removeItem(LS.joinFileId);
      }

      // 4. Build final workspace list + activate
      const allWorkspaces = [ownWs, ...loadedGuests];
      setAllWs(allWorkspaces);

      // If the join target was freshly loaded, activate it; otherwise own plan
      const joinWs = joinFileId
        ? loadedGuests.find(w => w.fileId === joinFileId)
        : null;
      setActiveWsId((joinWs ?? ownWs).id);

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
        scope:     DRIVE_SCOPES,
        callback: (response: TokenResponse) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (response.error) { clearSession(); return; }
          bootstrapDrive(response.access_token);
        },
        error_callback: () => clearSession(),
      });

      if (hadSession) {
        timeoutRef.current = setTimeout(clearSession, SILENT_RESTORE_TIMEOUT);
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

  /**
   * Called after collaborator selects a shared file via Google Picker.
   * Saves the file to guest plans and makes it the active workspace.
   */
  const loadGuestFile = useCallback(async (pickedFileId: string) => {
    const t = _tokenRef.current;
    if (!t) return;
    setIsLoading(true);
    setNeedsPicker(false);
    try {
      const data = await readJsonFile<AppData>(t, pickedFileId);

      // Try to check actual Drive permission role (non-critical)
      let role: "Edytor" | "Podgląd" = "Edytor";
      try {
        const perms  = await listPermissions(t, pickedFileId);
        const myPerm = perms.find(p => p.emailAddress === userInfo?.email);
        if (myPerm?.role === "reader") role = "Podgląd";
      } catch { /* ignore */ }

      const ws: Workspace = {
        id:            pickedFileId,
        fileId:        pickedFileId,
        ownerEmail:    "",
        name:          "Wspólny plan ślubny",
        data:          { ...EMPTY_DATA, ...data },
        collaborators: [],
        createdAt:     Date.now(),
        myRole:        role,
      };

      upsertGuestPlan({ fileId: pickedFileId, name: ws.name, role });
      localStorage.removeItem(LS.joinFileId);

      setAllWs(prev => [...prev.filter(w => w.id !== pickedFileId), ws]);
      setActiveWsId(pickedFileId);
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
    clearSession(true); // fullClear = true removes guestPlans too
  }, [clearSession]);

  const updateActiveData = useCallback((data: AppData): void => {
    const wsId = activeWsIdRef.current;
    setAllWs(prev => prev.map(w =>
      w.id === wsId ? { ...w, data, updatedAt: Date.now() } : w,
    ));
    const t   = _tokenRef.current;
    const fid = fileIdRef.current;
    if (t && fid) updateJsonFile(t, fid, data).catch(console.error);
  }, []);

  const renameWorkspace = useCallback((name: string): void => {
    const wsId = activeWsIdRef.current;
    setAllWs(prev => prev.map(w => w.id === wsId ? { ...w, name } : w));
    if (wsId === ownFileIdRef.current) {
      localStorage.setItem(LS.wsName, name);
    } else if (wsId) {
      saveGuestPlans(getGuestPlans().map(p => p.fileId === wsId ? { ...p, name } : p));
    }
  }, []);

  const switchWorkspace = useCallback((wsId: string) => {
    setActiveWsId(wsId);
    setNeedsPicker(false);
    localStorage.removeItem(LS.joinFileId);
  }, []);

  // ----------------------------------------------------------
  // Derived values
  // ----------------------------------------------------------

  const myRole  = activeWorkspace?.myRole ?? null;
  const isGuest = myRole !== "Właściciel" && myRole !== null;
  const canEdit = myRole === "Właściciel" || myRole === "Edytor";
  const fileId  = activeWorkspace?.fileId ?? null;

  const users      = useMemo(() => userInfo ? [userInfo] : [], [userInfo]);
  const wsMap      = useMemo<WorkspacesMap>(
    () => Object.fromEntries(allWs.map(w => [w.id, w])),
    [allWs],
  );

  return useMemo(() => ({
    session, isLoading, driveError, isGuest, needsPicker, fileId,
    _loadGuestFile:    loadGuestFile,
    activeWorkspace,   currentUser: userInfo,
    myWorkspaces:      allWs,
    myRole,            canEdit,
    users,             workspaces: wsMap,
    googleLogin, logout, updateActiveData, renameWorkspace, switchWorkspace,
    login:                  () => ({ ok: true as const }),
    register:               () => ({ ok: true as const }),
    addCollaborator:        () => ({ error: "Użyj panelu Zaproś" }),
    removeCollaborator:     () => {},
    updateCollaboratorRole: () => {},
  }), [
    session, isLoading, driveError, isGuest, needsPicker, fileId,
    activeWorkspace, userInfo, allWs, myRole, canEdit, users, wsMap,
    googleLogin, logout, updateActiveData, renameWorkspace, switchWorkspace,
    loadGuestFile,
  ]);
}

// ============================================================
// PICKER SCREEN
// Shown when a collaborator needs to pick a shared file.
// ============================================================

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

  // Find the user's own plan so they can switch back without reloading
  const ownWs = auth.myWorkspaces.find(w => w.myRole === "Właściciel");

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__eyebrow">— Planner ślubny —</div>
        <h1 className="auth__title">Otwórz <em>wspólny plan</em></h1>
        <p className="auth__sub">
          Zalogowałeś się przez link zaproszenia.<br />
          Właściciel planu musiał już wcześniej{" "}
          <strong>zaprosić Cię przez email</strong> — wtedy plik pojawi się w Twoim Google Drive.
          Kliknij poniżej i wybierz <code>wedding-data.json</code>.
        </p>
        {error && <div className="auth__error" style={{ marginBottom: 16 }}>{error}</div>}
        <button
          className="btn btn--primary auth__submit"
          onClick={openPicker}
          disabled={picking}
        >
          {picking ? "Otwieranie…" : "Wybierz plik z Google Drive"}
        </button>
        {ownWs && (
          <button
            className="btn"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => auth.switchWorkspace(ownWs.id)}
          >
            Wróć do swojego planu
          </button>
        )}
        {!ownWs && (
          <button
            className="btn"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => {
              localStorage.removeItem(LS.joinFileId);
              window.location.reload();
            }}
          >
            Wróć do swojego planu
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// AUTH SCREEN
// ============================================================

interface AuthScreenProps { auth: AuthState; }

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
  const ws      = auth.activeWorkspace as Workspace | null;
  const isOwner = !auth.isGuest;

  const [email,        setEmail]        = useState("");
  const [role,         setRole]         = useState<"writer" | "reader">("writer");
  const [sending,      setSending]      = useState(false);
  const [sendError,    setSendError]    = useState("");
  const [sendSuccess,  setSendSuccess]  = useState("");
  const [permissions,  setPermissions]  = useState<DrivePermission[] | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [updatingPerm, setUpdatingPerm] = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);

  const inviteLink = auth.fileId
    ? `${window.location.origin}${window.location.pathname}?join=${auth.fileId}`
    : null;

  // Load collaborator list on mount
  useEffect(() => {
    if (!isOwner || !auth.fileId || !_tokenRef.current) return;
    setLoadingPerms(true);
    listPermissions(_tokenRef.current, auth.fileId)
      .then(perms => setPermissions(perms.filter(p => p.role !== "owner")))
      .catch(() => setPermissions([]))
      .finally(() => setLoadingPerms(false));
  }, [isOwner, auth.fileId]);

  // Invite via Drive API — PRIMARY action
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.fileId || !_tokenRef.current) {
      setSendError("Brak tokenu — odśwież stronę.");
      return;
    }
    setSending(true); setSendError(""); setSendSuccess("");
    try {
      await shareFile(_tokenRef.current, auth.fileId, email.trim(), role);
      setSendSuccess(
        `Zaproszono ${email.trim()} — dostali email od Google z dostępem do pliku.` +
        ` Teraz wyślij im też link zaproszenia poniżej.`,
      );
      setEmail("");
      // Refresh permissions list
      listPermissions(_tokenRef.current, auth.fileId)
        .then(perms => setPermissions(perms.filter(p => p.role !== "owner")))
        .catch(() => {});
    } catch {
      setSendError("Błąd — sprawdź email i spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  };

  // Change role for existing collaborator
  const handleRoleChange = async (permId: string, newRole: "writer" | "reader") => {
    if (!auth.fileId || !_tokenRef.current) return;
    setUpdatingPerm(permId);
    try {
      await updatePermission(_tokenRef.current, auth.fileId, permId, newRole);
      setPermissions(prev =>
        prev?.map(p => p.id === permId ? { ...p, role: newRole } : p) ?? prev,
      );
    } catch (err) {
      console.error("updatePermission failed:", err);
    } finally {
      setUpdatingPerm(null);
    }
  };

  // Remove collaborator
  const handleRemove = async (permId: string) => {
    if (!auth.fileId || !_tokenRef.current) return;
    await removePermission(_tokenRef.current, auth.fileId, permId).catch(console.error);
    setPermissions(prev => prev ? prev.filter(p => p.id !== permId) : prev);
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
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
              {isOwner ? <>Zarządzaj <em>dostępem</em></> : <>Twój <em>plan ślubny</em></>}
            </h2>
          </div>
          <button className="btn btn--ghost btn--icon" onClick={onClose}><Icon name="x" /></button>
        </div>

        {/* Logged-in user */}
        <div className="invite__list">
          <div className="ornament">Zalogowany jako</div>
          <div className="collab-row collab-row--owner">
            <AvatarEl user={auth.currentUser} email={auth.currentUser?.email || ws.ownerEmail} />
            <div className="collab-row__info">
              <div className="collab-row__name">{auth.currentUser?.name || ws.ownerEmail}</div>
              <div className="muted mono" style={{ fontSize: 11 }}>{auth.currentUser?.email}</div>
            </div>
            <span className="tag tag--accent">{auth.myRole}</span>
          </div>
        </div>

        {/* OWNER: invite form + link + collaborators list */}
        {isOwner && (
          <>
            {/* PRIMARY: invite by email */}
            <div style={{ marginTop: 20 }}>
              <div className="ornament">Zaproś osobę</div>
              <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>
                Osoba dostanie email od Google z dostępem do pliku.
                Następnie wyślij jej link zaproszenia, żeby wiedziała gdzie go otworzyć.
              </p>
              <form onSubmit={handleInvite} className="invite__form">
                <div className="invite__row">
                  <label className="auth__label" style={{ flex: 1 }}>
                    <span>Email Google</span>
                    <input
                      className="auth__input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="narzeczona@gmail.com"
                      required
                    />
                  </label>
                  <label className="auth__label" style={{ width: 130 }}>
                    <span>Dostęp</span>
                    <select
                      className="auth__input"
                      value={role}
                      onChange={e => setRole(e.target.value as "writer" | "reader")}
                    >
                      <option value="writer">Edytor</option>
                      <option value="reader">Podgląd</option>
                    </select>
                  </label>
                </div>
                {sendError   && <div className="auth__error"   style={{ marginTop: 6 }}>{sendError}</div>}
                {sendSuccess && <div className="auth__success" style={{ marginTop: 6 }}>{sendSuccess}</div>}
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={sending}
                  style={{ marginTop: 8 }}
                >
                  <Icon name="plus" size={14} />
                  {sending ? "Zapraszanie…" : "Zaproś"}
                </button>
              </form>
            </div>

            {/* SECONDARY: copy invite link */}
            {inviteLink && (
              <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--bg-alt, rgba(0,0,0,.04))", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                  Link zaproszenia
                </div>
                <p className="muted" style={{ fontSize: 11, margin: "0 0 8px" }}>
                  Wyślij <strong>po zaproszeniu przez email</strong> — osoba klika, loguje się i gotowe.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="auth__input"
                    readOnly
                    value={inviteLink}
                    style={{ flex: 1, fontSize: 10 }}
                  />
                  <button className="btn" onClick={copyLink} style={{ whiteSpace: "nowrap" }}>
                    {copied ? <><Icon name="check" size={14} /> Skopiowano</> : "Kopiuj"}
                  </button>
                </div>
              </div>
            )}

            {/* Collaborators list with role change */}
            <div style={{ marginTop: 20 }}>
              <div className="ornament">
                Osoby z dostępem{permissions !== null ? ` · ${permissions.length}` : ""}
              </div>
              {loadingPerms && (
                <div className="muted" style={{ padding: "12px 0", fontSize: 13 }}>Ładowanie…</div>
              )}
              {!loadingPerms && permissions?.length === 0 && (
                <div className="muted serif-italic" style={{ padding: "16px 0", textAlign: "center", fontStyle: "italic" }}>
                  Jeszcze nikt nie ma dostępu.
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
                  <select
                    className="auth__input"
                    style={{ width: 100, padding: "3px 6px", fontSize: 12 }}
                    value={p.role}
                    disabled={updatingPerm === p.id}
                    onChange={e => handleRoleChange(p.id, e.target.value as "writer" | "reader")}
                  >
                    <option value="writer">Edytor</option>
                    <option value="reader">Podgląd</option>
                  </select>
                  <button
                    className="btn btn--ghost btn--icon"
                    onClick={() => handleRemove(p.id)}
                    title="Cofnij dostęp"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* GUEST: info + return to own plan */}
        {!isOwner && (
          <div style={{ marginTop: 20 }}>
            <div className="ornament">Tryb gościa</div>
            <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>
              Przeglądasz plan udostępniony przez właściciela.
              {auth.myRole === "Podgląd" && " Masz dostęp tylko do podglądu."}
            </div>
            <button
              className="btn"
              style={{ marginTop: 8 }}
              onClick={() => {
                const ownWs = auth.myWorkspaces.find(w => w.myRole === "Właściciel");
                if (ownWs) {
                  auth.switchWorkspace(ownWs.id);
                  onClose();
                } else {
                  removeGuestPlan(auth.fileId!);
                  localStorage.removeItem(LS.joinFileId);
                  window.location.reload();
                }
              }}
            >
              Wróć do swojego planu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// AVATAR HELPER
// ============================================================

function AvatarEl({ user, email }: { user: GoogleUser | null; email: string }) {
  if (user?.picture) {
    return (
      <img
        src={user.picture}
        alt={user.name}
        className="avatar"
        style={{ borderRadius: "50%", objectFit: "cover", width: 36, height: 36 }}
        referrerPolicy="no-referrer"
      />
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
