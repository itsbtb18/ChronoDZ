import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import backgroundImg from "../assets/background.png";
import logoImg from "../assets/logo.png";

type ClientBrandPanelProps = {
  /** Extra classes appended to the root <aside> (e.g. min-height tweaks per page). */
  className?: string;
  /** Optional content rendered at the bottom of the panel (summary card, stats, etc.). */
  footer?: ReactNode;
  /** Optional eyebrow text shown above the slogan. */
  eyebrow?: string;
};

function FeatureRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm font-medium text-white/90 sm:text-base">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}

/**
 * Unified brand panel used as the left column across every client-facing page
 * (language selection, login, booking wizard, confirmation...).
 *
 * Photo-forward design: the laundry background stays fully visible behind an
 * elegant dark gradient (no flat blue wash), with the logo, slogan, feature
 * highlights and an optional footer slot giving every client page one
 * consistent, premium template.
 */
export function ClientBrandPanel({ className = "", footer, eyebrow }: ClientBrandPanelProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={`relative isolate flex min-h-[42vh] flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 sm:py-12 lg:min-h-full ${className}`}
    >
      {/* Background photo */}
      <div
        className="absolute inset-0 -z-20 scale-105"
        style={{
          backgroundImage: `url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Elegant legibility gradients (dark, not blue) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/92 via-slate-950/55 to-slate-900/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/55 to-transparent" />
      {/* Subtle brand glow accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-28 bottom-10 h-72 w-72 rounded-full bg-sky-500/20 blur-[90px]" />
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-cyan-400/15 blur-[90px]" />
      </div>

      {/* Top: brand identity — the hero element (big, premium, modern) */}
      <div className="relative z-10 flex items-center gap-4 animate-fade-in sm:gap-6">
        <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-white shadow-[0_24px_60px_rgba(2,6,23,0.45)] ring-1 ring-white/60 sm:h-28 sm:w-28 sm:rounded-[1.85rem]">
          <span className="absolute -inset-1 -z-10 rounded-[1.85rem] bg-gradient-to-br from-sky-400/40 to-cyan-300/30 blur-md sm:rounded-[2.1rem]" />
          <img src={logoImg} alt={t("appName")} className="h-14 w-auto sm:h-20" />
        </span>
        <div className="leading-none">
          <p className="text-2xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_20px_rgba(2,6,23,0.5)] sm:text-4xl lg:text-[2.75rem]">
            {t("appName")}
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.42em] text-white/70 sm:mt-3 sm:text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            {t("brandTrustLabel")}
          </p>
        </div>
      </div>

      {/* Center: slogan + supporting copy + feature highlights */}
      <div className="relative z-10 flex flex-1 flex-col justify-center py-10 sm:py-12">
        {eyebrow ? (
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.32em] text-white/85 backdrop-blur animate-fade-in-up">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            {eyebrow}
          </span>
        ) : null}

        <h1 className="max-w-[15ch] text-4xl font-black leading-[1.02] tracking-tight drop-shadow-[0_6px_30px_rgba(2,6,23,0.45)] sm:text-5xl lg:text-6xl animate-fade-in-up delay-100">
          {t("brandSlogan")}
        </h1>

        <p className="mt-5 max-w-md text-sm leading-7 text-white/80 sm:text-base animate-fade-in-up delay-200">
          {t("brandTagline")}
        </p>

        <ul className="mt-8 grid gap-3.5 animate-fade-in-up delay-300">
          <FeatureRow>{t("brandFeature1")}</FeatureRow>
          <FeatureRow>{t("brandFeature2")}</FeatureRow>
          <FeatureRow>{t("brandFeature3")}</FeatureRow>
        </ul>
      </div>

      {/* Bottom: optional page-specific footer (summary / stats) */}
      {footer ? <div className="relative z-10 animate-fade-in-up delay-400">{footer}</div> : null}
    </aside>
  );
}
