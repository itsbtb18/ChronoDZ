// When a SUPER_ADMIN enters "management mode" for a given establishment, we
// store the selected establishment here. This lets the super admin reuse the
// existing assistant interface (/admin/dashboard/*) scoped to that
// establishment, without rebuilding every screen.

export type ManagedEstablishment = {
  id: number;
  name: string;
};

const STORAGE_KEY = "chrono-dz-managed-establishment";

export function getManagedEstablishment(): ManagedEstablishment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManagedEstablishment;
    if (typeof parsed?.id !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setManagedEstablishment(value: ManagedEstablishment) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearManagedEstablishment() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
