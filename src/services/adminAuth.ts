export interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authType: 'google';
  loggedInAt: number;
}

export interface AdminSettings {
  googleClientId: string;
  allowedEmails: string[];
}

const STORAGE_KEY_SESSION = 'propdf_admin_session';
const STORAGE_KEY_SETTINGS = 'propdf_admin_settings';

export const DEFAULT_GOOGLE_CLIENT_ID =
  '842801470827-ptk8safmckgjovgk0qj8e552t842h7dd.apps.googleusercontent.com';
export const DEFAULT_ADMIN_EMAIL = 'contentmakermytube@gmail.com';

const DEFAULT_SETTINGS: AdminSettings = {
  googleClientId: DEFAULT_GOOGLE_CLIENT_ID,
  allowedEmails: [DEFAULT_ADMIN_EMAIL],
};

// Retrieve settings from localStorage or fallback to production defaults
export function getAdminSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const clientId = parsed.googleClientId && parsed.googleClientId.trim().length > 0
      ? parsed.googleClientId.trim()
      : DEFAULT_SETTINGS.googleClientId;

    const emails = Array.isArray(parsed.allowedEmails) && parsed.allowedEmails.length > 0
      ? parsed.allowedEmails
      : DEFAULT_SETTINGS.allowedEmails;

    return {
      googleClientId: clientId,
      allowedEmails: emails,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save settings to localStorage
export function saveAdminSettings(updates: Partial<AdminSettings>): AdminSettings {
  const current = getAdminSettings();
  const next: AdminSettings = {
    ...current,
    ...updates,
  };
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save admin settings', e);
  }
  return next;
}

// Get currently logged-in admin user from sessionStorage
export function getCurrentAdmin(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentAdmin() !== null;
}

// Decode Google JWT Token without external libraries
export function decodeGoogleJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode Google JWT', err);
    return null;
  }
}

// Login via Google OAuth credential
export function loginWithGoogleCredential(credential: string): { success: boolean; error?: string; user?: AdminUser } {
  const payload = decodeGoogleJwt(credential);
  if (!payload || !payload.email) {
    return { success: false, error: 'Недійсний токен авторизації Google' };
  }

  const settings = getAdminSettings();
  const email = String(payload.email).toLowerCase().trim();

  // Enforce whitelist: ONLY allowed emails can access
  const isAllowed = settings.allowedEmails.some(
    (allowed) => allowed.toLowerCase().trim() === email
  );

  if (!isAllowed) {
    return {
      success: false,
      error: `Доступ заборонено: обліковий запис "${email}" не є адміністратором цього сайту.`,
    };
  }

  const user: AdminUser = {
    id: payload.sub || email,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
    authType: 'google',
    loggedInAt: Date.now(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save session', e);
  }

  return { success: true, user };
}

// Logout admin
export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
  } catch (e) {
    console.error('Failed to remove session', e);
  }
}
