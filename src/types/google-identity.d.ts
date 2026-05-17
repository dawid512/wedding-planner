export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: GoogleIdInitializeConfig): void;
          renderButton(parent: HTMLElement, options: GoogleIdButtonConfig): void;
          prompt(momentListener?: (notification: GooglePromptMomentNotification) => void): void;
        };
      };
    };
  }

  interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
    clientId?: string;
  }

  interface GoogleIdInitializeConfig {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: "signin" | "signup" | "use";
    ux_mode?: "popup" | "redirect";
    login_uri?: string;
    nonce?: string;
  }

  interface GoogleIdButtonConfig {
    type?: "standard" | "icon";
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    shape?: "rectangular" | "pill" | "circle" | "square";
    logo_alignment?: "left" | "center";
    width?: string | number;
    locale?: string;
  }

  interface GooglePromptMomentNotification {
    isDisplayed(): boolean;
    isNotDisplayed(): boolean;
    isSkippedMoment(): boolean;
    isDismissedMoment(): boolean;
    getNotDisplayedReason(): string;
    getSkippedReason(): string;
    getDismissedReason(): string;
  }
}
