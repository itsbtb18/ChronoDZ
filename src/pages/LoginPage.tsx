import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "../i18n";

type LoginPageProps = {
  language: AppLanguage;
  onChangeLanguage?: (language: AppLanguage) => void;
  onSubmit?: (payload: { phoneNumber: string; secretCode: string }) => void;
  onOpenSuperAdmin?: () => void;
};

export function LoginPage({ language, onChangeLanguage, onSubmit, onOpenSuperAdmin }: LoginPageProps) {
  const { t, i18n } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [secretCode, setSecretCode] = useState("");

  const isArabic = language === "ar";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.({ phoneNumber, secretCode });
  };

  const switchLanguage = (nextLanguage: AppLanguage) => {
    i18n.changeLanguage(nextLanguage);
    onChangeLanguage?.(nextLanguage);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#ffffff_45%,_#f8fbff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section
          dir={isArabic ? "rtl" : "ltr"}
          lang={language}
          className="grid w-full overflow-hidden rounded-[2rem] border border-sky-100 bg-white/88 shadow-[0_30px_80px_rgba(14,165,233,0.18)] backdrop-blur md:grid-cols-[0.95fr_1.05fr]"
        >
          <aside className="flex flex-col justify-between gap-8 bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 p-8 text-white">
            <div className="space-y-5">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
                {t("appName")}
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                  {t("loginTitle")}
                </h1>
                <p className="max-w-md text-base leading-7 text-sky-50/90">
                  {t("loginSubtitle")}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-6 text-sky-50/90">
              <p className="font-semibold text-white">{t("termsHint")}</p>
              <p>{t("welcomeBack")}</p>
            </div>
          </aside>

          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-500">
                  {t("skyBlueTheme")}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {t("loginTitle")}
                </h2>
              </div>

              <div className="inline-flex overflow-hidden rounded-full border border-sky-100 bg-sky-50 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => switchLanguage("fr")}
                  className={`rounded-full px-4 py-2 transition ${language === "fr" ? "bg-sky-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Français
                </button>
                <button
                  type="button"
                  onClick={() => switchLanguage("ar")}
                  className={`rounded-full px-4 py-2 transition ${language === "ar" ? "bg-sky-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
                >
                  العربية
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="phoneNumber"
                  className={`block text-sm font-semibold text-slate-700 ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("phoneNumber")}
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  inputMode="numeric"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder={t("phonePlaceholder")}
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="secretCode"
                  className={`block text-sm font-semibold text-slate-700 ${isArabic ? "text-right" : "text-left"}`}
                >
                  {t("secretCode")}
                </label>
                <input
                  id="secretCode"
                  name="secretCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  type="password"
                  placeholder={t("secretCodePlaceholder")}
                  value={secretCode}
                  onChange={(event) => setSecretCode(event.target.value)}
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-2xl bg-sky-600 px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                {t("signIn")}
              </button>

              <button
                type="button"
                onClick={onOpenSuperAdmin}
                className="flex w-full items-center justify-center rounded-2xl border border-sky-100 bg-white px-5 py-3.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
              >
                {t("superAdminDashboardTitle")}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}