import { getAuthSession } from "../auth/session";
import type { AppLanguage } from "../i18n";
import { AdminAssistantPage } from "./AdminAssistantPage";

type AdminDashboardPageProps = {
  language: AppLanguage;
};

export function AdminDashboardPage({ language }: AdminDashboardPageProps) {
  const session = getAuthSession();
  const establishmentName = session?.establishmentName || "Laverie de la residence - Administration";

  return (
    <>
      <AdminAssistantPage
        establishmentName={establishmentName}
        establishmentId={session?.establishmentId ?? null}
      />
    </>
  );
}
