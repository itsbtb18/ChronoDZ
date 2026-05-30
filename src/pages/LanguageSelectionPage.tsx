import { useTranslation } from "react-i18next";

import type { AppLanguage } from "../i18n";

type LanguageSelectionPageProps = {
  onSelectLanguage: (language: AppLanguage) => void;
};

const languageCards: Array<{
  code: AppLanguage;
  labelKey: "french" | "arabic";
  description: string;
  badge: string;
}> = [
  {
    code: "fr",
    labelKey: "french",
    description: "Interface claire et intuitive en français.",
    badge: "FR",
  },
  {
    code: "ar",
    labelKey: "arabic",
    description: "واجهة عربية باتجاه من اليمين إلى اليسار.",
    badge: "AR",
  },
];

export function LanguageSelectionPage({ onSelectLanguage }: LanguageSelectionPageProps) {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full gap-6 overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 p-6 shadow-[0_30px_80px_rgba(14,165,233,0.18)] backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div className="space-y-6 rounded-[1.5rem] bg-gradient-to-br from-sky-500 to-sky-700 p-8 text-white shadow-lg">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
              {t("appName")}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-100/90">
                {t("skyBlueTheme")}
              </p>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                {t("chooseLanguageTitle")}
              </h1>
              <p className="max-w-md text-base leading-7 text-sky-50/90">
                {t("chooseLanguageSubtitle")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-6 text-sky-50/90">
              {t("languageHint")}
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4 p-2 sm:p-4">
            {languageCards.map((language) => (
              <button
                key={language.code}
                type="button"
                onClick={() => onSelectLanguage(language.code)}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-200"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-sm font-bold text-white shadow-md shadow-sky-200">
                    {language.badge}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {t(language.labelKey)}
                    </p>
                    <p className="text-sm text-slate-500">{language.description}</p>
                  </div>
                </div>
                <span className="text-2xl text-sky-400 transition group-hover:translate-x-1">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}