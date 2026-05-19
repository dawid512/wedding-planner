// Google Drive REST API wrapper — read/write JSON files on user's Drive

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const USERINFO_API = "https://www.googleapis.com/oauth2/v3/userinfo";

// ============================================================
// User Info
// ============================================================

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export async function getUserInfo(token: string): Promise<GoogleUserInfo> {
  const r = await fetch(USERINFO_API, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`getUserInfo failed: ${r.status} ${r.statusText}`);
  return r.json() as Promise<GoogleUserInfo>;
}

// ============================================================
// Folder helpers
// ============================================================

/** Find an existing Drive folder by name, or create it. Returns the folder ID. */
export async function findOrCreateFolder(token: string, folderName: string): Promise<string> {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  const search = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!search.ok) throw new Error(`findFolder search failed: ${search.status}`);
  const { files } = (await search.json()) as { files: { id: string; name: string }[] };
  if (files && files.length > 0) return files[0].id;

  // Not found — create it
  const create = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!create.ok) throw new Error(`createFolder failed: ${create.status}`);
  const folder = (await create.json()) as { id: string };
  return folder.id;
}

// ============================================================
// File helpers
// ============================================================

/** Find a file by name inside a folder. Returns file ID or null. */
export async function findFile(
  token: string,
  folderId: string,
  fileName: string,
): Promise<string | null> {
  const q = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
  const r = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`findFile failed: ${r.status}`);
  const { files } = (await r.json()) as { files: { id: string }[] };
  return files && files.length > 0 ? files[0].id : null;
}

/** Download and parse a JSON file from Drive. */
export async function readJsonFile<T>(token: string, fileId: string): Promise<T> {
  const r = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`readJsonFile failed: ${r.status}`);
  return r.json() as Promise<T>;
}

/**
 * Download a JSON file from Drive AND fetch its ETag in parallel.
 * The ETag is used for optimistic concurrency control (If-Match header on writes).
 * Every write to the file changes its ETag, so a conditional write will fail with
 * 412 Precondition Failed if someone else wrote between our read and our write.
 */
export async function readJsonFileWithEtag<T>(
  token: string,
  fileId: string,
): Promise<{ data: T; etag: string }> {
  const [metaRes, dataRes] = await Promise.all([
    fetch(`${DRIVE_API}/files/${fileId}?fields=etag`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  if (!metaRes.ok) throw new Error(`readJsonFileWithEtag meta failed: ${metaRes.status}`);
  if (!dataRes.ok) throw new Error(`readJsonFileWithEtag data failed: ${dataRes.status}`);
  const { etag } = (await metaRes.json()) as { etag: string };
  const data = (await dataRes.json()) as T;
  return { data, etag };
}

/** Create a new JSON file inside a Drive folder. Returns the new file ID. */
export async function createJsonFile<T>(
  token: string,
  folderId: string,
  fileName: string,
  data: T,
): Promise<string> {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const body = JSON.stringify(data);

  const form = new FormData();
  form.append("metadata", new Blob([metadata], { type: "application/json" }));
  form.append("file", new Blob([body], { type: "application/json" }));

  const r = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!r.ok) throw new Error(`createJsonFile failed: ${r.status}`);
  const { id } = (await r.json()) as { id: string };
  return id;
}

/**
 * Update (overwrite) an existing JSON file on Drive.
 * Pass `ifMatchEtag` to enable optimistic concurrency control:
 * if the file was modified after you read it, Drive returns 412 and
 * the function throws an error with message "LOCK_CONFLICT".
 */
export async function updateJsonFile<T>(
  token: string,
  fileId: string,
  data: T,
  ifMatchEtag?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (ifMatchEtag) headers["If-Match"] = ifMatchEtag;

  const r = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (r.status === 412) throw new Error("LOCK_CONFLICT");
  if (!r.ok) throw new Error(`updateJsonFile failed: ${r.status}`);
}

// ============================================================
// Permissions (sharing / collaboration)
// ============================================================

export interface DrivePermission {
  id: string;
  emailAddress: string;
  displayName?: string;
  role: "reader" | "writer" | "owner";
  photoLink?: string;
}

/** Share a Drive file with another Google user. */
export async function shareFile(
  token: string,
  fileId: string,
  email: string,
  role: "reader" | "writer",
): Promise<void> {
  const r = await fetch(
    `${DRIVE_API}/files/${fileId}/permissions?sendNotificationEmail=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "user", role, emailAddress: email }),
    },
  );
  if (!r.ok) throw new Error(`shareFile failed: ${r.status}`);
}

/** List all permissions on a Drive file. */
export async function listPermissions(
  token: string,
  fileId: string,
): Promise<DrivePermission[]> {
  const r = await fetch(
    `${DRIVE_API}/files/${fileId}/permissions?fields=permissions(id,emailAddress,displayName,role,photoLink)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`listPermissions failed: ${r.status}`);
  const { permissions } = (await r.json()) as { permissions: DrivePermission[] };
  return permissions || [];
}

/** Remove a permission (revoke access) from a Drive file. */
export async function removePermission(
  token: string,
  fileId: string,
  permissionId: string,
): Promise<void> {
  const r = await fetch(`${DRIVE_API}/files/${fileId}/permissions/${permissionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok && r.status !== 404) throw new Error(`removePermission failed: ${r.status}`);
}

/**
 * Get effective capabilities for the current user on a file.
 * Works for all roles (owner / writer / reader) and is more reliable
 * than parsing listPermissions — a reader can only see their own entry
 * in listPermissions, which can be ambiguous. capabilities.canEdit is
 * the authoritative answer.
 */
export async function getFileCapabilities(
  token: string,
  fileId: string,
): Promise<{ canEdit: boolean }> {
  const r = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=capabilities(canEdit)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`getFileCapabilities failed: ${r.status}`);
  const { capabilities } = (await r.json()) as { capabilities?: { canEdit?: boolean } };
  return { canEdit: capabilities?.canEdit ?? false };
}

/**
 * Get file capabilities + owner email in a single Drive API request.
 * Used when loading shared plans so we can display the owner's email
 * as the workspace name instead of a generic label.
 */
export async function getFileMeta(
  token: string,
  fileId: string,
): Promise<{ canEdit: boolean; ownerEmail: string }> {
  const r = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=capabilities(canEdit),owners(emailAddress)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`getFileMeta failed: ${r.status}`);
  const { capabilities, owners } = (await r.json()) as {
    capabilities?: { canEdit?: boolean };
    owners?: Array<{ emailAddress?: string }>;
  };
  return {
    canEdit:    capabilities?.canEdit ?? false,
    ownerEmail: owners?.[0]?.emailAddress ?? "",
  };
}

/**
 * List all Drive files with this name that the user can access.
 * Used for auto-discovery: guest sees shared wedding plan on login without
 * needing a ?join= link.
 *
 * NOTE: sharedWithMe=true was removed — files shared via the Drive API
 * permissions endpoint don't always appear in the "Shared with me"
 * collection. We query ALL accessible files with this name; the caller
 * filters out the user's own file (by comparing against ownWs.fileId).
 */
export async function listSharedFiles(
  token: string,
  fileName: string,
): Promise<Array<{ id: string; name: string }>> {
  const q = `name='${fileName}' and trashed=false`;
  const r = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`listSharedFiles failed: ${r.status}`);
  const { files } = (await r.json()) as { files?: Array<{ id: string; name: string }> };
  return files || [];
}

/** Update an existing permission (change role). */
export async function updatePermission(
  token: string,
  fileId: string,
  permissionId: string,
  role: "reader" | "writer",
): Promise<void> {
  const r = await fetch(`${DRIVE_API}/files/${fileId}/permissions/${permissionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });
  if (!r.ok) throw new Error(`updatePermission failed: ${r.status}`);
}
