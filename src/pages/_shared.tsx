// Shared UI helpers used across page components

import React, { useRef, useState, useCallback } from "react";
import { getAuthToken } from "../auth";
import {
  uploadImageToDrive,
  getDriveThumbnailUrl,
  deleteDriveFile,
  findOrCreateFolder,
  findOrCreateSubfolder,
} from "../lib/google-drive";

// ============================================================
// DATE INPUT — with × clear button (visible on mobile edit mode)
// ============================================================

interface DateInputProps {
  type?: "date" | "datetime-local" | "time";
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function DateInput({ type = "date", value, onChange, className = "field__input", style }: DateInputProps) {
  return (
    <div className="date-input-wrap" style={style}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
      {value && (
        <button
          type="button"
          className="date-clear-btn"
          onClick={() => onChange("")}
          title="Wyczyść datę"
          aria-label="Wyczyść datę"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ============================================================
// PAGE HEADER
// ============================================================

interface StatItem {
  num: number | string;
  label: string;
}

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  sub?: string;
  stats?: StatItem[];
}

export function PageHeader({ eyebrow, title, sub, stats }: PageHeaderProps) {
  return (
    <div className="page__header">
      <div>
        <div className="page__eyebrow">{eyebrow}</div>
        <h1 className="page__title">{title}</h1>
        {sub && <div className="page__sub">{sub}</div>}
      </div>
      {stats && (
        <div className="page__stats">
          {stats.map((s, i) => (
            <div className="stat" key={i}>
              <div className="stat__num">{s.num}</div>
              <div className="stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PHOTO UPLOAD — uploads to WeddingPlanner/attachments/ on Drive
// ============================================================

/**
 * Cached attachments folder ID — shared across all PhotoUpload instances
 * so we don't search Drive on every render.
 */
let _attachmentsFolderId: string | null = null;

async function getAttachmentsFolderId(token: string): Promise<string> {
  if (_attachmentsFolderId) return _attachmentsFolderId;
  // WeddingPlanner folder is the top-level app folder (same name as appConfig.googleAppFolderName)
  const rootFolderId = await findOrCreateFolder(token, "WeddingPlanner");
  const attachFolderId = await findOrCreateSubfolder(token, rootFolderId, "attachments");
  _attachmentsFolderId = attachFolderId;
  return attachFolderId;
}

interface PhotoUploadProps {
  /** Current Drive file ID for this photo (undefined = no photo) */
  photoId?: string;
  /** Called with the new Drive file ID after upload, or undefined when photo deleted */
  onChange: (photoId: string | undefined) => void;
  /** Whether the component is in edit mode */
  editing: boolean;
}

export function PhotoUpload({ photoId, onChange, editing }: PhotoUploadProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const thumbnailUrl = photoId ? getDriveThumbnailUrl(photoId, "w800") : null;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Wybierz plik graficzny (jpg, png, webp…)");
      return;
    }
    const token = getAuthToken();
    if (!token) { setError("Brak sesji — odśwież stronę."); return; }
    setUploading(true);
    setError(null);
    try {
      const folderId = await getAttachmentsFolderId(token);
      const newId    = await uploadImageToDrive(token, folderId, file);
      onChange(newId);
    } catch (err) {
      setError("Błąd uploadu — spróbuj ponownie.");
      console.error("PhotoUpload error:", err);
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleDelete = useCallback(async () => {
    if (!photoId) return;
    const token = getAuthToken();
    if (token) deleteDriveFile(token, photoId).catch(() => {});
    onChange(undefined);
  }, [photoId, onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // No photo, not editing — show nothing
  if (!photoId && !editing) return null;

  return (
    <div className="photo-upload">
      {thumbnailUrl && (
        <div className="photo-upload__img-wrap">
          <img
            src={thumbnailUrl}
            alt="Zdjęcie inspiracji"
            className="photo-upload__img"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {editing && (
            <button
              className="photo-upload__del"
              onClick={handleDelete}
              title="Usuń zdjęcie"
            >
              ×
            </button>
          )}
        </div>
      )}

      {editing && !photoId && (
        <div
          className={"photo-upload__drop" + (uploading ? " photo-upload__drop--loading" : "")}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading
            ? <span className="muted mono" style={{ fontSize: 12 }}>Przesyłanie…</span>
            : <>
                <span className="photo-upload__icon">📷</span>
                <span className="muted" style={{ fontSize: 12 }}>Kliknij lub przeciągnij zdjęcie</span>
              </>
          }
        </div>
      )}

      {error && (
        <div className="photo-upload__error" onClick={() => setError(null)}>{error}</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
