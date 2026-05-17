const DEFAULT_GOOGLE_APP_FOLDER_NAME = "WeddingPlanner";

export const appConfig = {
  googleClientId:     import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()      || "",
  googleAppFolderName: import.meta.env.VITE_GOOGLE_APP_FOLDER_NAME?.trim() || DEFAULT_GOOGLE_APP_FOLDER_NAME,
  googlePickerApiKey: import.meta.env.VITE_GOOGLE_PICKER_API_KEY?.trim() || "",
} as const;

export function hasGoogleClientId(): boolean {
  return appConfig.googleClientId.length > 0;
}
