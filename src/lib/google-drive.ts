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

/** Update (overwrite) an existing JSON file on Drive. */
export async function updateJsonFile<T>(
  token: string,
  fileId: string,
  data: T,
): Promise<void> {
  const r = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
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
