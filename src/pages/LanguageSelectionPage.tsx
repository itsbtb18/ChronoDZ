import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "../i18n";
import backgroundImg from "../assets/background.png";
import logoImg from "../assets/logo.png";

type LanguageSelectionPageProps = {
  onSelectLanguage: (language: AppLanguage) => void;
};

const languageCards: Array<{ code: AppLanguage; label: string; sub: string }> = [
  { code: "fr", label: "Français", sub: "Continuer en français" },
  { code: "ar", label: "العربية", sub: "المتابعة بالعربية" },
];

function CheckIcon() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/**
 * One brand column (slogan + tagline + features) rendered in a single locale.
 * Alignment follows the locale's reading direction — RTL hugs the right edge,
 * LTR hugs the left edge — so the feature rows line up with their heading.
 */
function BrandSide({ t, dir }: { t: TFunction; dir: "ltr" | "rtl" }) {
  const isRtl = dir === "rtl";
  return (
    <div
      dir={dir}
      className={`flex w-full max-w-md flex-col justify-center items-start lg:me-auto ${
        isRtl ? "text-right" : "text-left"
      } animate-fade-in-up`}
    >
      <h2 className="text-3xl font-black leading-[1.08] tracking-tight drop-shadow-[0_6px_30px_rgba(2,6,23,0.5)] sm:text-4xl xl:text-5xl">
        {t("brandSlogan")}
      </h2>
      <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">{t("brandTagline")}</p>
      <ul className="mt-7 flex w-full flex-col gap-3.5">
        {[t("brandFeature1"), t("brandFeature2"), t("brandFeature3")].map((feature) => (
          <li
            key={feature}
            className="flex w-full items-center gap-3 text-sm font-medium text-white/90 sm:text-base"
          >
            <CheckIcon />
            <span className="leading-snug">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LanguageSelectionPage({ onSelectLanguage }: LanguageSelectionPageProps) {
  const { i18n } = useTranslation();
  const tFr = i18n.getFixedT("fr");
  const tAr = i18n.getFixedT("ar");

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      {/* Full-screen background photo */}
      <div
        className="absolute inset-0 -z-20 scale-105"
        style={{ backgroundImage: `url(${backgroundImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      {/* Legibility gradients (dark, not blue) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/85 via-slate-950/62 to-slate-950/90" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(2,6,23,0.05),rgba(2,6,23,0.7))]" />
      {/* Brand glow accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-sky-500/20 blur-[120px]" />
        <div className="absolute right-[8%] bottom-[14%] h-72 w-72 rounded-full bg-cyan-400/15 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        {/* Top header — the hero logo, big and centered */}
        <header className="flex flex-col items-center gap-4 px-4 pb-2 pt-10 text-center sm:pt-12 animate-scale-in">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.9rem] bg-white shadow-[0_30px_75px_rgba(2,6,23,0.55)] ring-1 ring-white/60 sm:h-28 sm:w-28">
            <span className="absolute -inset-1.5 -z-10 rounded-[2.2rem] bg-gradient-to-br from-sky-400/50 to-cyan-300/40 blur-lg" />
            <img src={logoImg} alt={tFr("appName")} className="h-16 w-auto sm:h-20" />
          </div>
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_4px_24px_rgba(2,6,23,0.7)] sm:text-5xl">
              {tFr("appName")}
            </h1>
            <p className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.42em] text-white/65 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              {tFr("brandTrustLabel")}
            </p>
          </div>
        </header>

        {/* Body — brand sides flanking the language choice, edge to edge */}
        <section className="grid flex-1 grid-cols-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_minmax(340px,400px)_1fr] lg:gap-8 lg:px-10">
          {/* Left — French brand content */}
          <div className="order-2 lg:order-1">
            <BrandSide t={tFr} dir="ltr" />
          </div>

          {/* Center — language choice (no boxed card) */}
          <div className="order-1 lg:order-2 mx-auto w-full max-w-md">
            <div className="space-y-1 text-center animate-fade-in-up">
              <p className="text-lg font-black text-white sm:text-xl">{tFr("chooseLanguageTitle")}</p>
              <p className="text-lg font-black text-white/90 sm:text-xl" dir="rtl" lang="ar">
                {tAr("chooseLanguageTitle")}
              </p>
            </div>

            <div className="mt-6 grid gap-3.5">
              {languageCards.map((language, index) => {
                const isAr = language.code === "ar";
                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => onSelectLanguage(language.code)}
                    dir={isAr ? "rtl" : "ltr"}
                    className="group/btn flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_18px_45px_rgba(2,6,23,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_64px_rgba(14,165,233,0.32)] focus:outline-none focus:ring-4 focus:ring-sky-400/50 animate-fade-in-up"
                    style={{ animationDelay: `${120 + index * 110}ms` }}
                  >
                    <span className={isAr ? "text-right" : "text-left"}>
                      <span className="block text-lg font-black text-slate-900 sm:text-xl">{language.label}</span>
                      <span className="block text-xs font-medium text-slate-500">{language.sub}</span>
                    </span>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-lg text-white shadow-[0_10px_24px_rgba(14,165,233,0.4)] transition group-hover/btn:scale-110">
                      {isAr ? "←" : "→"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — Arabic brand content */}
          <div className="order-3">
            <BrandSide t={tAr} dir="rtl" />
          </div>
        </section>
      </div>
    </main>
  );
}
