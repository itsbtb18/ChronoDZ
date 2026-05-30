import { getAuthSession } from "../auth/session";
import type { AppLanguage } from "../i18n";
import { AdminAssistantPage } from "./AdminAssistantPage";

type AdminDashboardPageProps = {
  language: AppLanguage;
};

export function AdminDashboardPage({ language }: AdminDashboardPageProps) {
  const session = getAuthSession();
  const establishmentName = session?.establishmentName || "Chrono Dz - Administration";

  return (
    <>
      <AdminAssistantPage
        establishmentName={establishmentName}
        establishmentId={session?.establishmentId ?? null}
      />
    </>
  );
}
