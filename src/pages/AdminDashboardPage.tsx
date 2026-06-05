import { Navigate, useNavigate } from "react-router-dom";

import { getAuthSession } from "../auth/session";
import { clearManagedEstablishment, getManagedEstablishment } from "../auth/managedEstablishment";
import type { AppLanguage } from "../i18n";
import { AdminAssistantPage } from "./AdminAssistantPage";

type AdminDashboardPageProps = {
  language: AppLanguage;
};

export function AdminDashboardPage({ language: _language }: AdminDashboardPageProps) {
  const session = getAuthSession();
  const navigate = useNavigate();
  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  // For a super admin, the establishment being managed comes from the
  // "management mode" selection. If none is set, bounce back to their dashboard.
  const managed = isSuperAdmin ? getManagedEstablishment() : null;

  if (isSuperAdmin && !managed) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  const establishmentName = isSuperAdmin
    ? managed!.name
    : session?.establishmentName || "Laverie de la residence - Administration";
  const establishmentId = isSuperAdmin ? managed!.id : (session?.establishmentId ?? null);

  const exitManagement = () => {
    clearManagedEstablishment();
    navigate("/superadmin/establishments", { replace: true });
  };

  return (
    <>
      {isSuperAdmin && (
        <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-white shadow-[0_8px_24px_rgba(99,102,241,0.25)]">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7v14m18-14v14M5 7l7-4 7 4M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4" />
            </svg>
            <span className="text-xs font-semibold truncate">
              Mode gestion super admin — <span className="font-black">{establishmentName}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={exitManagement}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1 text-[11px] font-bold hover:bg-white/25 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Retour super admin
          </button>
        </div>
      )}
      <AdminAssistantPage
        establishmentName={establishmentName}
        establishmentId={establishmentId}
      />
    </>
  );
}
