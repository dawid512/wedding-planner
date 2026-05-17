import { appConfig, hasGoogleClientId } from "../config/app-config";

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleIdentityPromise: Promise<typeof window.google> | null = null;

export function getGoogleClientId(): string {
  if (!hasGoogleClientId()) {
    throw new Error(
      "Missing VITE_GOOGLE_CLIENT_ID. Configure Google Identity Services before enabling Google login.",
    );
  }

  return appConfig.googleClientId;
}

export async function loadGoogleIdentity(): Promise<typeof window.google> {
  if (window.google) {
    return window.google;
  }

  if (!googleIdentityPromise) {
    googleIdentityPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.google) resolve(window.google);
          else reject(new Error("Google Identity Services loaded without window.google."));
        });
        existingScript.addEventListener("error", () => {
          reject(new Error("Failed to load Google Identity Services script."));
        });
        return;
      }

      const script = document.createElement("script");
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) resolve(window.google);
        else reject(new Error("Google Identity Services loaded without window.google."));
      };
      script.onerror = () => reject(new Error("Failed to load Google Identity Services script."));
      document.head.appendChild(script);
    });
  }

  return googleIdentityPromise;
}
