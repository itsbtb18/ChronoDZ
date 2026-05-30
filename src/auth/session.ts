export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export type AuthSession = {
  accessToken: string;
  role: UserRole;
  establishmentId: number | null;
  establishmentName: string | null;
  userId: number;
  phone: string;
};

const AUTH_STORAGE_KEY = "chrono-dz-auth";

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
  window.localStorage.setItem("chrono-dz-access-token", session.accessToken);
  window.localStorage.setItem("chrono-dz-role", session.role);
  window.localStorage.setItem("chrono-dz-phone-number", session.phone || "");

  if (session.role === "SUPER_ADMIN") {
    window.localStorage.setItem("chrono-dz-superadmin-token", session.accessToken);
  } else {
    window.localStorage.removeItem("chrono-dz-superadmin-token");
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem("chrono-dz-access-token");
  window.localStorage.removeItem("chrono-dz-superadmin-token");
  window.localStorage.removeItem("chrono-dz-role");
}

export function authHeader(): HeadersInit {
  const session = getAuthSession();
  if (!session?.accessToken) {
    return {};
  }

  return { Authorization: `Bearer ${session.accessToken}` };
}
