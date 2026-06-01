import { useTranslation } from "react-i18next";

import type { AppLanguage } from "../i18n";
import backgroundImg from "../assets/background.png";
import logoImg from "../assets/logo.png";

type LanguageSelectionPageProps = {
  onSelectLanguage: (language: AppLanguage) => void;
};

const languageCards: Array<{
  code: AppLanguage;
  label: string;
}> = [
  {
    code: "fr",
    label: "Français",
  },
  {
    code: "ar",
    label: "العربية",
  },
];

export function LanguageSelectionPage({ onSelectLanguage }: LanguageSelectionPageProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const tFr = i18n.getFixedT("fr");
  const tAr = i18n.getFixedT("ar");

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden text-slate-900">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(2, 132, 199, 0.28), rgba(2, 132, 199, 0.14)), url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 bg-white/8 backdrop-blur-[1px]" />

      <section className="relative z-10 grid min-h-screen w-full lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="relative flex min-h-[36vh] flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 px-5 py-5 text-white sm:min-h-[40vh] sm:px-8 sm:py-8 lg:min-h-screen lg:px-10 lg:py-10">
          <div className="absolute inset-0 opacity-45">
            <div className="absolute left-4 top-6 h-24 w-24 rounded-full border border-white/20 sm:left-6 sm:top-8 sm:h-32 sm:w-32" />
            <div className="absolute right-8 top-16 h-32 w-32 rounded-full border border-white/15 sm:right-10 sm:top-24 sm:h-44 sm:w-44" />
            <div className="absolute -bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/12 blur-3xl" />
          </div>

          <div className="relative z-10 inline-flex max-w-full items-center gap-3 self-start rounded-[1.5rem] border border-sky-100 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:gap-4 sm:rounded-[2rem] sm:px-7 sm:py-4">
            <img src={logoImg} alt="Logo Laverie de la residence" className="h-10 w-auto sm:h-14" />
            <span className="text-sm font-black tracking-tight text-slate-900 sm:text-lg lg:text-xl">
              {t("appName")}
            </span>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center sm:py-6">
            <div className="space-y-2">
              <p className="text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {tFr("chooseLanguageTitle")}
              </p>
              <p
                className="text-2xl font-black leading-[1.12] tracking-tight text-white/95 sm:text-4xl lg:text-5xl"
                dir="rtl"
                lang="ar"
              >
                {tAr("chooseLanguageTitle")}
              </p>
            </div>
          </div>

          <div aria-hidden="true" />
        </aside>

        <aside
          dir={isArabic ? "rtl" : "ltr"}
          lang={i18n.language}
          className="relative flex min-h-[64vh] items-center justify-center bg-white/90 px-5 py-6 sm:min-h-[60vh] sm:px-8 sm:py-8 lg:min-h-screen lg:px-10 lg:py-10"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.18))]" />

          <div className="relative z-10 w-full max-w-md space-y-4">
            <div className="space-y-1 text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600 sm:text-sm sm:tracking-[0.3em]">
                {tFr("selectedLanguage")} / {tAr("selectedLanguage")}
              </p>
              <p className="text-sm font-medium text-slate-500 sm:text-base">
                {tFr("chooseLanguageSubtitle")}
              </p>
              <p className="text-sm font-medium text-slate-500 sm:text-base" dir="rtl" lang="ar">
                {tAr("chooseLanguageSubtitle")}
              </p>
            </div>

            <div className="grid gap-3">
              {languageCards.map((language, index) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => onSelectLanguage(language.code)}
                  className="group flex w-full items-center justify-between rounded-[1.5rem] border border-sky-100 bg-white px-5 py-4 text-left shadow-[0_18px_50px_rgba(14,165,233,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(14,165,233,0.16)] focus:outline-none focus:ring-4 focus:ring-sky-200/80 animate-fade-in-up"
                  style={{ animationDelay: `${100 + index * 110}ms` }}
                >
                  <span className="text-lg font-extrabold text-slate-900 sm:text-xl">
                    {language.label}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-lg text-sky-500 transition group-hover:translate-x-1 group-hover:bg-sky-100">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}