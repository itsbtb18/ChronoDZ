export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export type AuthSession = {
  accessToken: string;
  role: UserRole;
  establishmentId: number | null;
  establishmentName: string | null;
  userId: number;
  phone: string;
  firstName?: string;
  lastName?: string;
};

const AUTH_STORAGE_KEY = "laverie-de-la-residence-auth";

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = atob(paddedPayload);
    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.role) {
      return null;
    }

    if (isJwtExpired(parsed.accessToken)) {
      clearAuthSession();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.localStorage.setItem("laverie-de-la-residence-access-token", session.accessToken);
  window.localStorage.setItem("laverie-de-la-residence-role", session.role);
  window.localStorage.setItem("laverie-de-la-residence-phone-number", session.phone || "");

  if (session.role === "SUPER_ADMIN") {
    window.localStorage.setItem("laverie-de-la-residence-superadmin-token", session.accessToken);
  } else {
    window.localStorage.removeItem("laverie-de-la-residence-superadmin-token");
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem("laverie-de-la-residence-access-token");
  window.localStorage.removeItem("laverie-de-la-residence-superadmin-token");
  window.localStorage.removeItem("laverie-de-la-residence-role");
}

export function authHeader(): HeadersInit {
  const session = getAuthSession();
  if (!session?.accessToken) {
    return {};
  }

  return { Authorization: `Bearer ${session.accessToken}` };
}
