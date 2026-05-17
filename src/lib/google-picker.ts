// Google Picker API wrapper
// Loads gapi and opens a file picker dialog.
// When the user selects a file, the app gets drive.file read+write access to it
// — even if the file was created by another user (as long as it was shared with them).

const GAPI_SCRIPT_ID = "google-gapi";
const GAPI_SRC       = "https://apis.google.com/js/api.js";

// ---------------------------------------------------------------------------
// Minimal runtime types (no global augmentation to avoid conflicts)
// ---------------------------------------------------------------------------

interface GapiWindow {
  gapi?: {
    load(lib: string, callback: () => void): void;
  };
  google: {
    picker: {
      Action:       { PICKED: string; CANCEL: string };
      DocsView:     new () => GPickerDocsView;
      DocsViewMode: { LIST: unknown };
      PickerBuilder: new () => GPickerBuilder;
    };
  };
}

interface GPickerDocsView {
  setIncludeFolders(v: boolean): this;
  setMimeTypes(types: string): this;
  setMode(mode: unknown): this;
  setQuery(q: string): this;
}

interface GPickerBuilder {
  addView(view: GPickerDocsView): this;
  setOAuthToken(token: string): this;
  setDeveloperKey(key: string): this;
  setTitle(title: string): this;
  setCallback(cb: (data: GPickerCallbackData) => void): this;
  build(): { setVisible(v: boolean): void };
}

interface GPickerCallbackData {
  action: string;
  docs?: Array<{ id: string; name: string; mimeType: string }>;
}

// ---------------------------------------------------------------------------
// Script loaders
// ---------------------------------------------------------------------------

let gapiLoadPromise: Promise<void> | null = null;

function loadGapi(): Promise<void> {
  if ((window as unknown as GapiWindow).gapi) return Promise.resolve();
  if (gapiLoadPromise) return gapiLoadPromise;

  gapiLoadPromise = new Promise((resolve, reject) => {
    if (document.getElementById(GAPI_SCRIPT_ID)) {
      const check = setInterval(() => {
        if ((window as unknown as GapiWindow).gapi) { clearInterval(check); resolve(); }
      }, 50);
      return;
    }
    const script = document.createElement("script");
    script.id    = GAPI_SCRIPT_ID;
    script.src   = GAPI_SRC;
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error("Failed to load gapi script"));
    document.head.appendChild(script);
  });

  return gapiLoadPromise;
}

let pickerLibLoaded = false;

function loadPickerLib(): Promise<void> {
  return loadGapi().then(
    () => new Promise(resolve => {
      if (pickerLibLoaded) { resolve(); return; }
      (window as unknown as GapiWindow).gapi!.load("picker", () => {
        pickerLibLoaded = true;
        resolve();
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PickerResult {
  fileId:   string;
  fileName: string;
}

/**
 * Open the Google Picker dialog.
 * Returns the picked file's ID — the app then has full drive.file read+write access.
 * @param hint  Optional search query pre-filled in the picker (e.g. "wedding-data")
 */
export function openFilePicker(
  oauthToken: string,
  apiKey:     string,
  hint?:      string,
): Promise<PickerResult> {
  return loadPickerLib().then(
    () => new Promise((resolve, reject) => {
      const g = (window as unknown as GapiWindow).google;

      const view = new g.picker.DocsView()
        .setIncludeFolders(false)
        .setMimeTypes("application/json")
        .setMode(g.picker.DocsViewMode.LIST);

      if (hint) view.setQuery(hint);

      const picker = new g.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(oauthToken)
        .setDeveloperKey(apiKey)
        .setTitle("Wybierz plik planu ślubnego")
        .setCallback((data: GPickerCallbackData) => {
          if (data.action === g.picker.Action.PICKED && data.docs?.[0]) {
            resolve({ fileId: data.docs[0].id, fileName: data.docs[0].name });
          } else if (data.action === g.picker.Action.CANCEL) {
            reject(new Error("Picker cancelled"));
          }
        })
        .build();

      picker.setVisible(true);
    }),
  );
}
