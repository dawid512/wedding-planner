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
  getFileCapabilities,
  getFileMeta,
  listSharedFiles,
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

/**
 * Stored in user-config.json on the user's own Drive.
 * Tracks fileIds of wedding plans shared with this user.
 * Replaces the old localStorage guest plan storage — persists across devices.
 */
interface UserConfig {
  sharedPlans:   string[];  // fileIds of shared plans
  defaultPlanId?: string;   // fileId of the plan to open by default on login
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
  setDefaultPlan: (wsId: string | null) => void;  // ustaw/wyczyść domyślny plan
  defaultPlanId: string | null;                   // aktualnie ustawiony domyślny plan
  _loadGuestFile: (fileId: string) => Promise<void>;
  _clearDriveError: () => void;
  /**
   * Try to acquire the edit lock for the current workspace.
   * Reads fresh data from Drive to check for an active lock by someone else.
   * Returns ok:true on success, ok:false with lockedBy email on conflict.
   */
  acquireLock: () => Promise<{ ok: true } | { ok: false; lockedBy: string }>;
  /**
   * Release the edit lock (on cancel or auto-kick).
   * Reads fresh Drive data, strips _editLock, writes back.
   */
  releaseLock: () => void;

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
const _tokenRef:  { current: string | null } = { current: null };
/** Timestamp (Date.now()) of when the current token was set — used to detect expiry */
const _tokenAge:  { current: number }        = { current: 0 };

// ============================================================
// CONSTANTS
// ============================================================

const LS = {
  email:      "wp_g_email",
  name:       "wp_g_name",
  fileId:     "wp_g_file_id",      // own plan file ID
  folderId:   "wp_g_folder_id",    // own plan folder ID
  wsName:     "wp_g_ws_name",      // own plan name
  activeWsId: "wp_g_active_ws_id", // last active workspace ID (persisted)
};

const DATA_FILE   = "wedding-data.json";
const CONFIG_FILE = "user-config.json"; // stores shared plan fileIds in Drive
/** Edit lock TTL — lock older than this is considered expired and can be overridden. */
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

// drive scope = full read/write to all Drive files the user has permission on.
// drive.file alone was too restrictive: files shared via Drive API returned 404
// and the Picker returned 401 when trying to list "Shared with me" files.
const DRIVE_SCOPES           = "https://www.googleapis.com/auth/drive openid email profile";
const SILENT_RESTORE_TIMEOUT = 12_000;

// ============================================================
// DRIVE CONFIG HELPER
// Reads/creates user-config.json in the user's WeddingPlanner folder.
// Stores fileIds of plans shared with this user — persists across devices.
// ============================================================

async function ensureUserConfig(
  token: string,
  folderId: string,
): Promise<{ config: UserConfig; configFileId: string }> {
  const empty: UserConfig = { sharedPlans: [] };
  let cfId = await findFile(token, folderId, CONFIG_FILE);
  if (!cfId) {
    cfId = await createJsonFile(token, folderId, CONFIG_FILE, empty);
    return { config: empty, configFileId: cfId };
  }
  try {
    const config = await readJsonFile<UserConfig>(token, cfId);
    return { config: { ...config, sharedPlans: config.sharedPlans ?? [] }, configFileId: cfId };
  } catch {
    return { config: empty, configFileId: cfId };
  }
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

  const [defaultPlanId, setDefaultPlanId] = useState<string | null>(null);

  const tokenClientRef   = useRef<TokenClient | null>(null);
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWsIdRef    = useRef<string | null>(null);
  activeWsIdRef.current  = activeWsId;
  /** Cached current user-config.json content (to allow partial updates without re-reading) */
  const configRef        = useRef<UserConfig>({ sharedPlans: [] });
  const fileIdRef        = useRef<string | null>(null);
  const ownFileIdRef     = useRef<string | null>(null);
  /** File ID of user-config.json in Drive — set during bootstrapDrive */
  const configFileIdRef  = useRef<string | null>(null);

  // Derived — active workspace (recalculated every render)
  const activeWorkspace = allWs.find(w => w.id === activeWsId) ?? null;
  fileIdRef.current     = activeWorkspace?.fileId ?? null;

  // ----------------------------------------------------------
  // Clear session state
  // ----------------------------------------------------------

  const clearSession = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    _tokenRef.current       = null;
    configFileIdRef.current = null;
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
    localStorage.removeItem(LS.activeWsId);
    // Legacy keys — clean up if present from old versions
    localStorage.removeItem("wp_g_guest_plans");
    localStorage.removeItem("wp_g_join_file_id");
  }, []);

  // ----------------------------------------------------------
  // Bootstrap own (owner) plan
  // Returns ws + folderId so bootstrapDrive can pass folderId to ensureUserConfig
  // ----------------------------------------------------------

  const bootstrapOwnPlan = useCallback(async (
    token: string,
    email: string,
  ): Promise<{ ws: Workspace; folderId: string }> => {
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
      // File inaccessible (deleted or stale ID) — nuke both cached IDs and re-bootstrap fully
      console.warn("Own plan file inaccessible, re-bootstrapping from scratch…");
      localStorage.removeItem(LS.fileId);
      localStorage.removeItem(LS.folderId);
      fId = await findOrCreateFolder(token, appConfig.googleAppFolderName);
      localStorage.setItem(LS.folderId, fId);
      dFileId = await findFile(token, fId, DATA_FILE) ||
                await createJsonFile(token, fId, DATA_FILE, EMPTY_DATA);
      localStorage.setItem(LS.fileId, dFileId);
      appData = await readJsonFile<AppData>(token, dFileId);
    }

    ownFileIdRef.current = dFileId;

    const ws: Workspace = {
      id:            dFileId,
      fileId:        dFileId,
      ownerEmail:    email,
      name:          localStorage.getItem(LS.wsName) || "Mój ślub",
      data:          { ...EMPTY_DATA, ...appData },
      collaborators: [],
      createdAt:     Date.now(),
      myRole:        "Właściciel",
    };
    return { ws, folderId: fId };
  }, []);

  // ----------------------------------------------------------
  // Main bootstrap after receiving an access token
  // ----------------------------------------------------------

  const bootstrapDrive = useCallback(async (token: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    _tokenRef.current = token;
    _tokenAge.current = Date.now();
    setIsLoading(true);
    setDriveError(null);

    try {
      const info  = await getUserInfo(token);
      const gUser: GoogleUser = { email: info.email, name: info.name, picture: info.picture };
      // NOTE: setUserInfo early (needed for avatar), but setSession is deferred to the very end
      // so React batches session + workspaces in one render — no "Brak planu" flash.
      setUserInfo(gUser);
      localStorage.setItem(LS.email, info.email);
      localStorage.setItem(LS.name,  info.name);

      // 1. Bootstrap own plan + get folderId
      const { ws: ownWs, folderId } = await bootstrapOwnPlan(token, info.email);

      // 2. Load user-config.json — stores fileIds of shared plans (cross-device)
      const { config, configFileId } = await ensureUserConfig(token, folderId);
      configFileIdRef.current = configFileId;
      configRef.current = config;
      if (config.defaultPlanId) setDefaultPlanId(config.defaultPlanId);

      // 3. Load all known shared plans from user-config.json
      const loadedGuests: Workspace[] = [];
      const failedIds:    string[]    = [];

      await Promise.all(config.sharedPlans.map(async (gFileId) => {
        if (gFileId === ownWs.fileId) return; // skip own plan
        try {
          const [data, meta] = await Promise.all([
            readJsonFile<AppData>(token, gFileId),
            getFileMeta(token, gFileId).catch(() => ({ canEdit: false, ownerEmail: "" })),
          ]);
          const role: "Edytor" | "Podgląd" = meta.canEdit ? "Edytor" : "Podgląd";

          loadedGuests.push({
            id:            gFileId,
            fileId:        gFileId,
            ownerEmail:    meta.ownerEmail,
            name:          meta.ownerEmail || "Wspólny plan ślubny",
            data:          { ...EMPTY_DATA, ...data },
            collaborators: [],
            createdAt:     Date.now(),
            myRole:        role,
          });
        } catch {
          failedIds.push(gFileId); // access revoked or file deleted
        }
      }));

      // Remove stale entries from user-config.json
      if (failedIds.length > 0) {
        const cleaned: UserConfig = {
          sharedPlans: config.sharedPlans.filter(id => !failedIds.includes(id)),
        };
        updateJsonFile(token, configFileId, cleaned).catch(() => {});
      }

      // 4. Auto-discover new shared plans via Drive search (no join link needed).
      //    Finds wedding-data.json files accessible to the user that aren't already loaded.
      const newlyDiscovered: string[] = [];
      try {
        const sharedFiles = await listSharedFiles(token, DATA_FILE);
        await Promise.all(sharedFiles.map(async (sf) => {
          const alreadyKnown =
            sf.id === ownWs.fileId ||
            loadedGuests.some(g => g.fileId === sf.id) ||
            failedIds.includes(sf.id);
          if (alreadyKnown) return;

          try {
            const [data, meta] = await Promise.all([
              readJsonFile<AppData>(token, sf.id),
              getFileMeta(token, sf.id).catch(() => ({ canEdit: false, ownerEmail: "" })),
            ]);
            const role: "Edytor" | "Podgląd" = meta.canEdit ? "Edytor" : "Podgląd";

            loadedGuests.push({
              id:            sf.id,
              fileId:        sf.id,
              ownerEmail:    meta.ownerEmail,
              name:          meta.ownerEmail || "Wspólny plan ślubny",
              data:          { ...EMPTY_DATA, ...data },
              collaborators: [],
              createdAt:     Date.now(),
              myRole:        role,
            });
            newlyDiscovered.push(sf.id);
          } catch { /* file not readable — skip */ }
        }));
      } catch { /* listSharedFiles failed — non-critical */ }

      // Persist newly discovered plans to user-config.json
      if (newlyDiscovered.length > 0) {
        const existingIds = config.sharedPlans.filter(id => !failedIds.includes(id));
        const allIds = [...new Set([...existingIds, ...newlyDiscovered])];
        updateJsonFile(token, configFileId, { sharedPlans: allIds }).catch(() => {});
      }

      // 5. Build final workspace list + activate.
      // setSession called last so React 18 batches all state updates → no intermediate flash.
      const allWorkspaces = [ownWs, ...loadedGuests];

      // Restore active workspace — priority: defaultPlanId > lastActiveId > ownWs
      const defaultId     = config.defaultPlanId;
      const savedActiveId = localStorage.getItem(LS.activeWsId);
      const restoredWs    = (defaultId     ? allWorkspaces.find(w => w.id === defaultId)     : null)
                         ?? (savedActiveId ? allWorkspaces.find(w => w.id === savedActiveId) : null)
                         ?? ownWs;

      setSession(info.email);
      setAllWs(allWorkspaces);
      setActiveWsId(restoredWs.id);

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
   * Saves the fileId to user-config.json so it's remembered across devices.
   */
  const loadGuestFile = useCallback(async (pickedFileId: string) => {
    const t = _tokenRef.current;
    if (!t) return;
    setIsLoading(true);
    setNeedsPicker(false);
    try {
      const [data, meta] = await Promise.all([
        readJsonFile<AppData>(t, pickedFileId),
        getFileMeta(t, pickedFileId).catch(() => ({ canEdit: true, ownerEmail: "" })),
      ]);
      const role: "Edytor" | "Podgląd" = meta.canEdit ? "Edytor" : "Podgląd";

      const ws: Workspace = {
        id:            pickedFileId,
        fileId:        pickedFileId,
        ownerEmail:    meta.ownerEmail,
        name:          meta.ownerEmail || "Wspólny plan ślubny",
        data:          { ...EMPTY_DATA, ...data },
        collaborators: [],
        createdAt:     Date.now(),
        myRole:        role,
      };

      setAllWs(prev => {
        // Persist newly picked plan to user-config.json (cross-device)
        if (configFileIdRef.current) {
          const guestIds = prev
            .filter(w => w.myRole !== "Właściciel" && w.id !== pickedFileId)
            .map(w => w.fileId);
          updateJsonFile(t, configFileIdRef.current, {
            sharedPlans: [...guestIds, pickedFileId],
          }).catch(() => {});
        }
        return [...prev.filter(w => w.id !== pickedFileId), ws];
      });
      setActiveWsId(pickedFileId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDriveError(msg);
      setNeedsPicker(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const t = _tokenRef.current;
    if (t) { try { window.google?.accounts?.oauth2?.revoke(t, () => {}); } catch {} }
    clearSession();
  }, [clearSession]);

  const updateActiveData = useCallback((data: AppData): void => {
    const wsId = activeWsIdRef.current;
    // Optimistic update — UI reflects new data immediately
    setAllWs(prev => prev.map(w =>
      w.id === wsId ? { ...w, data, updatedAt: Date.now() } : w,
    ));
    const t   = _tokenRef.current;
    const fid = fileIdRef.current;
    if (!t || !fid) return;

    updateJsonFile(t, fid, data).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("403")) {
        // Drive rejected write — owner likely changed role to reader.
        try {
          const caps = await getFileCapabilities(t, fid);
          if (!caps.canEdit) {
            setAllWs(prev => prev.map(w =>
              w.id === wsId ? { ...w, myRole: "Podgląd" } : w,
            ));
          }
        } catch { /* ignore — best-effort */ }
        setDriveError("Właściciel zmienił Twój dostęp na Podgląd. Zmiany nie zostały zapisane.");
      } else {
        console.error("updateActiveData Drive error:", msg);
      }
    });
  }, []);

  const renameWorkspace = useCallback((name: string): void => {
    const wsId = activeWsIdRef.current;
    setAllWs(prev => prev.map(w => w.id === wsId ? { ...w, name } : w));
    if (wsId === ownFileIdRef.current) {
      localStorage.setItem(LS.wsName, name);
    }
    // Guest plan names are ephemeral (in-memory only); user-config.json stores fileIds, not names.
  }, []);

  const switchWorkspace = useCallback((wsId: string) => {
    setActiveWsId(wsId);
    setNeedsPicker(false);
    localStorage.setItem(LS.activeWsId, wsId); // persist choice across refreshes

    // Async role refresh — capabilities API is authoritative (works for all roles)
    const t = _tokenRef.current;
    if (!t || wsId === ownFileIdRef.current) return;
    getFileCapabilities(t, wsId).then(caps => {
      const freshRole: "Edytor" | "Podgląd" = caps.canEdit ? "Edytor" : "Podgląd";
      setAllWs(prev => prev.map(w =>
        w.id === wsId ? { ...w, myRole: freshRole } : w,
      ));
    }).catch(() => { /* silent */ });
  }, []);

  /**
   * Set (or clear) the default plan — saved to user-config.json in Drive.
   * On next login, bootstrapDrive will activate this plan automatically.
   */
  const setDefaultPlan = useCallback((wsId: string | null) => {
    const token      = _tokenRef.current;
    const configId   = configFileIdRef.current;
    if (!token || !configId) return;

    const newConfig: UserConfig = { ...configRef.current, defaultPlanId: wsId ?? undefined };
    configRef.current = newConfig;
    setDefaultPlanId(wsId);
    updateJsonFile(token, configId, newConfig).catch(() => { /* silent */ });
  }, []);

  /**
   * Acquire the soft edit lock for the active workspace.
   *
   * Uses a write-then-verify strategy to detect simultaneous lock attempts
   * without relying on If-Match (which is not supported on the Drive media
   * upload endpoint):
   *   1. Read fresh file content — check whether another user has a valid lock.
   *   2. Write our lock (with a precise lockedAt timestamp as a nonce).
   *   3. Wait 350 ms, then re-read and confirm OUR lock is present.
   *      If someone else's lock is there instead, they won and we return { ok: false }.
   *
   * The 350 ms window ensures that if two users write simultaneously,
   * the second verify read will see the final state and one of them will back off.
   */
  const acquireLock = useCallback(async (): Promise<{ ok: true } | { ok: false; lockedBy: string }> => {
    const t    = _tokenRef.current;
    const fid  = fileIdRef.current;
    const wsId = activeWsIdRef.current;

    const myEmail = localStorage.getItem(LS.email) ?? undefined;
    if (!t || !fid || !myEmail) return { ok: false, lockedBy: "?" };

    try {
      // Step 1: read fresh data from Drive, check for an active lock by someone else
      const freshData = await readJsonFile<AppData>(t, fid);
      const existingLock = freshData._editLock;

      if (
        existingLock &&
        existingLock.email !== myEmail &&
        Date.now() - existingLock.lockedAt < LOCK_TTL_MS
      ) {
        return { ok: false, lockedBy: existingLock.email };
      }

      // Step 2: write our lock — lockedAt acts as a unique nonce
      const lockedAt = Date.now();
      await updateJsonFile(t, fid, { ...freshData, _editLock: { email: myEmail, lockedAt } });

      // Step 3: verify — wait briefly then re-read; if our lock is gone, someone beat us
      await new Promise<void>(res => setTimeout(res, 350));
      const verifyData = await readJsonFile<AppData>(t, fid);
      const verifyLock = verifyData._editLock;

      if (!verifyLock || verifyLock.email !== myEmail || verifyLock.lockedAt !== lockedAt) {
        // Someone else's write landed after ours — back off
        return { ok: false, lockedBy: verifyLock?.email ?? "?" };
      }

      // Lock confirmed — update local state with latest Drive data
      setAllWs(prev => prev.map(w =>
        w.id === wsId ? { ...w, data: { ...verifyData } } : w,
      ));

      return { ok: true };
    } catch {
      return { ok: false, lockedBy: "?" };
    }
  }, []);

  /**
   * Release the soft edit lock.
   * Reads current Drive data, strips _editLock, writes back.
   * Called on cancel-edit and on inactivity auto-kick.
   */
  const releaseLock = useCallback(() => {
    const t   = _tokenRef.current;
    const fid = fileIdRef.current;
    const wsId = activeWsIdRef.current;
    if (!t || !fid) return;

    // Optimistic local state update — strip lock immediately
    setAllWs(prev => prev.map(w => {
      if (w.id !== wsId) return w;
      const cleanData = { ...w.data };
      delete cleanData._editLock;
      // Fire-and-forget Drive update (read fresh → strip lock → write)
      readJsonFile<AppData>(t, fid).then(freshData => {
        const stripped = { ...freshData };
        delete stripped._editLock;
        return updateJsonFile(t, fid, stripped);
      }).catch(() => { /* silent — lock will expire on its own via TTL */ });
      return { ...w, data: cleanData };
    }));
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

  const clearDriveError = useCallback(() => setDriveError(null), []);

  return useMemo(() => ({
    session, isLoading, driveError, isGuest, needsPicker, fileId,
    _loadGuestFile:    loadGuestFile,
    _clearDriveError:  clearDriveError,
    activeWorkspace,   currentUser: userInfo,
    myWorkspaces:      allWs,
    myRole,            canEdit,
    users,             workspaces: wsMap,
    googleLogin, logout, updateActiveData, renameWorkspace, switchWorkspace,
    setDefaultPlan, defaultPlanId,
    acquireLock, releaseLock,
    login:                  () => ({ ok: true as const }),
    register:               () => ({ ok: true as const }),
    addCollaborator:        () => ({ error: "Użyj panelu Zaproś" }),
    removeCollaborator:     () => {},
    updateCollaboratorRole: () => {},
  }), [
    session, isLoading, driveError, isGuest, needsPicker, fileId,
    activeWorkspace, userInfo, allWs, myRole, canEdit, users, wsMap,
    googleLogin, logout, updateActiveData, renameWorkspace, switchWorkspace,
    setDefaultPlan, defaultPlanId,
    loadGuestFile, clearDriveError, acquireLock, releaseLock,
  ]);
}

// ============================================================
// PICKER SCREEN
// Fallback shown when a collaborator needs to pick a shared file manually.
// ============================================================

export function PickerScreen({ auth }: { auth: AuthState }) {
  const [picking, setPicking] = useState(false);
  const [error,   setError]   = useState("");

  const openPicker = async () => {
    const t          = _tokenRef.current;
    const tokenAgeMs = Date.now() - _tokenAge.current;
    if (!t || tokenAgeMs > 55 * 60 * 1000) {
      setError("Sesja wygasła — wyloguj się i zaloguj ponownie.");
      return;
    }
    if (!appConfig.googlePickerApiKey) {
      setError("Brak klucza Picker API. Skontaktuj się z administratorem.");
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

  const ownWs = auth.myWorkspaces.find(w => w.myRole === "Właściciel");

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__eyebrow">— Planner ślubny —</div>
        <h1 className="auth__title">Otwórz <em>wspólny plan</em></h1>
        <p className="auth__sub">
          Właściciel planu musiał wcześniej <strong>zaprosić Cię przez email</strong> — wtedy plik
          pojawi się w Twoim Google Drive. Kliknij poniżej i wybierz <code>wedding-data.json</code>.
        </p>
        {error && <div className="auth__error" style={{ marginBottom: 16 }}>{error}</div>}
        <button
          className="btn btn--primary auth__submit"
          onClick={openPicker}
          disabled={picking}
        >
          {picking ? "Otwieranie…" : "Wybierz plik z Google Drive"}
        </button>
        {ownWs ? (
          <button
            className="btn"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => auth.switchWorkspace(ownWs.id)}
          >
            Wróć do swojego planu
          </button>
        ) : (
          <button
            className="btn"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => window.location.reload()}
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
          <span className="mono">Zakres: <code>drive</code> — odczyt i zapis plików na Twoim Google Drive.</span>
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

const InviteModal = React.memo(function InviteModal({ auth, onClose }: InviteModalProps) {
  const ws      = auth.activeWorkspace as Workspace | null;
  const isOwner = !auth.isGuest;

  // Capture fileId once at mount — prevents effect from re-firing on unrelated auth changes
  const fileId = auth.fileId;

  const [email,        setEmail]        = useState("");
  const [role,         setRole]         = useState<"writer" | "reader">("writer");
  const [sending,      setSending]      = useState(false);
  const [sendError,    setSendError]    = useState("");
  const [sendSuccess,  setSendSuccess]  = useState("");
  const [permissions,  setPermissions]  = useState<DrivePermission[] | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [updatingPerm, setUpdatingPerm] = useState<string | null>(null);

  // Load collaborator list on mount — only depends on stable values
  useEffect(() => {
    if (!isOwner || !fileId || !_tokenRef.current) return;
    let cancelled = false;
    setLoadingPerms(true);
    listPermissions(_tokenRef.current, fileId)
      .then(perms => { if (!cancelled) setPermissions(perms.filter(p => p.role !== "owner")); })
      .catch(() => { if (!cancelled) setPermissions([]); })
      .finally(() => { if (!cancelled) setLoadingPerms(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — fileId is stable for the lifetime of this modal

  // Invite via Drive API — sends email automatically
  const handleInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileId || !_tokenRef.current) {
      setSendError("Brak tokenu — odśwież stronę.");
      return;
    }
    setSending(true); setSendError(""); setSendSuccess("");
    try {
      await shareFile(_tokenRef.current, fileId, email.trim(), role);
      setSendSuccess(
        `Zaproszono ${email.trim()} — dostali email od Google z dostępem do pliku.` +
        ` Zobaczy Twój plan po zalogowaniu się do planera.`,
      );
      setEmail("");
      // Refresh permissions list
      listPermissions(_tokenRef.current, fileId)
        .then(perms => setPermissions(perms.filter(p => p.role !== "owner")))
        .catch(() => {});
    } catch {
      setSendError("Błąd — sprawdź email i spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  }, [email, role, fileId]);

  // Change role for existing collaborator
  const handleRoleChange = useCallback(async (permId: string, newRole: "writer" | "reader") => {
    if (!fileId || !_tokenRef.current) return;
    setUpdatingPerm(permId);
    try {
      await updatePermission(_tokenRef.current, fileId, permId, newRole);
      setPermissions(prev =>
        prev?.map(p => p.id === permId ? { ...p, role: newRole } : p) ?? prev,
      );
    } catch (err) {
      console.error("updatePermission failed:", err);
    } finally {
      setUpdatingPerm(null);
    }
  }, [fileId]);

  // Remove collaborator
  const handleRemove = useCallback(async (permId: string) => {
    if (!fileId || !_tokenRef.current) return;
    await removePermission(_tokenRef.current, fileId, permId).catch(console.error);
    setPermissions(prev => prev ? prev.filter(p => p.id !== permId) : prev);
  }, [fileId]);

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

        {/* OWNER: invite form + collaborators list */}
        {isOwner && (
          <>
            <div style={{ marginTop: 20 }}>
              <div className="ornament">Zaproś osobę</div>
              <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>
                Osoba dostanie email od Google z dostępem do pliku i zobaczy plan automatycznie
                po zalogowaniu się do planera.
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
});

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

  const activeWs    = auth.activeWorkspace;
  const hasMultiple = auth.myWorkspaces.length > 1;

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
          {/* User info */}
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

          {/* Workspace switcher — shown only when user has access to multiple plans */}
          {hasMultiple && (
            <>
              <div className="user-menu__section-label">Twoje plany</div>
              {auth.myWorkspaces.map(ws => {
                const wsFull    = ws as Workspace;
                const isActive  = activeWs?.id === ws.id;
                const isDefault = auth.defaultPlanId === ws.id;
                const roleLabel = wsFull.myRole === "Właściciel" ? "Wł" : wsFull.myRole === "Edytor" ? "Ed" : "Pp";
                return (
                  <div key={ws.id} style={{ display: "flex", alignItems: "center" }}>
                    <button
                      className={"user-menu__item" + (isActive ? " user-menu__item--active" : "")}
                      style={{ flex: 1 }}
                      onClick={() => { auth.switchWorkspace(ws.id); setOpen(false); }}
                    >
                      <span className="user-menu__ws-role">{roleLabel}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {ws.name}
                      </span>
                      {isActive && <Icon name="check" size={12} />}
                    </button>
                    {/* Ustaw/wyczyść domyślny */}
                    <button
                      className="btn btn--ghost btn--icon"
                      style={{ flexShrink: 0, width: 28, height: 28, padding: 0,
                               color: isDefault ? "var(--accent)" : "var(--ink-faint)",
                               fontSize: 14 }}
                      title={isDefault ? "Usuń jako domyślny" : "Ustaw jako domyślny plan startowy"}
                      onClick={(e) => {
                        e.stopPropagation();
                        auth.setDefaultPlan(isDefault ? null : ws.id);
                      }}
                    >
                      ★
                    </button>
                  </div>
                );
              })}
              <div className="user-menu__div" />
            </>
          )}

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
