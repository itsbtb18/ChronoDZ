import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { authHeader, getAuthSession } from "../auth/session";
import { type AppLanguage } from "../i18n";
import logoImg from "../assets/logo.png";
import detailsBg from "../assets/details_background.png";

type ModeDetailPageProps = {
  language: AppLanguage;
};

type ApiMode = {
  id: number;
  nom: string;
  duree: number;
  prix_base: string | number;
  prix_effectif: string | number;
  capacite_max?: string | number;
  types_vetements?: string[];
  message_guide?: string;
  textiles_interdits?: string[];
  consigne_securite?: string;
  recommande?: boolean;
};

// Dégradé bleu de l'application
const APP_GRADIENT = "from-sky-500 via-blue-600 to-indigo-600";

export function ModeDetailPage({ language }: ModeDetailPageProps) {
  const { modeId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isArabic = language === "ar";
  const session = getAuthSession();
  const establishmentId = session?.establishmentId ?? 1;

  const [mode, setMode] = useState<ApiMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    let mounted = true;

    const loadMode = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const response = await fetch(`/api/establishments/${establishmentId}/modes/`, {
          headers: authHeader(),
        });
        if (!response.ok) {
          if (mounted) setNotFound(true);
          return;
        }
        const data = (await response.json()) as ApiMode[];
        const found = Array.isArray(data)
          ? data.find((m) => String(m.id) === String(modeId))
          : null;
        if (mounted) {
          if (found) setMode(found);
          else setNotFound(true);
        }
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadMode();
    return () => {
      mounted = false;
    };
  }, [establishmentId, modeId]);

  const goBack = () => navigate("/appointments/mode");

  const chooseMode = () => {
    if (typeof window !== "undefined" && modeId) {
      window.sessionStorage.setItem("chrono-selected-mode", String(modeId));
    }
    navigate("/appointments/mode");
  };

  const price = mode ? Number(mode.prix_effectif ?? mode.prix_base ?? 0) : 0;
  const duration = mode ? Number(mode.duree) || 0 : 0;
  const clothTypes = mode?.types_vetements ?? [];
  const forbiddenTypes = mode?.textiles_interdits ?? [];
  const hasCapacity = mode?.capacite_max != null && Number(mode.capacite_max) > 0;

  const BackButton = (
    <button
      type="button"
      onClick={goBack}
      className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 hover:shadow-md"
    >
      <span className="text-base transition group-hover:-translate-x-0.5">{isArabic ? "→" : "←"}</span>
      {t("modeDetailBack")}
    </button>
  );

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="relative flex min-h-screen w-full flex-col"
    >
      {/* ── Image de fond pleine page + teinte bleue (continue) ── */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${detailsBg})` }}
      />
      <div className={`fixed inset-0 -z-10 bg-gradient-to-br ${APP_GRADIENT} opacity-80`} />

      {/* ── Top bar (plein écran) ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6">
        {/* Logo à gauche (agrandi) */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(14,165,233,0.18)] ring-1 ring-sky-100 sm:h-14 sm:w-14">
            <img src={logoImg} alt="Logo" className="h-8 w-auto sm:h-10" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-black tracking-tight text-slate-900 sm:text-lg">Laverie de la residence</p>
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.22em] text-sky-500 sm:block">Votre laverie de confiance</p>
          </div>
        </div>
        {/* Retour à droite */}
        {BackButton}
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-32">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
        </div>
      ) : notFound || !mode ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <p className="text-base font-black text-slate-700">{t("modeDetailNotFound")}</p>
          <div className="mt-6">{BackButton}</div>
        </div>
      ) : (
        <>
          {/* ── HERO (transparent, posé sur le fond global continu) ── */}
          <section className="relative z-10 px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-12">
            {/* Sur-titre agrandi */}
            <p className="text-sm font-black uppercase tracking-[0.3em] text-white/85 sm:text-base">{t("modeDetailHeroKicker")}</p>

            {/* Titre + badges (même niveau) */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-3">
              <h1 className="text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl">{mode.nom}</h1>
              <div className="flex flex-wrap items-center gap-2.5">
                {mode.recommande && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm sm:text-[0.7rem]">
                    <svg className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9-4.4-2.31-4.4 2.31.84-4.9L4.36 8.68l4.92-.72 2.2-4.46z" /></svg>
                    {t("modeRecommendedBadge")}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-white/80 px-3.5 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm sm:text-[0.7rem]">
                  {duration} min
                </span>
              </div>
            </div>

            {/* CTA principal */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={chooseMode}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-blue-700 shadow-[0_14px_34px_rgba(2,6,23,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(2,6,23,0.28)] sm:w-auto"
              >
                {t("modeDetailChoose")}
                <span className="transition group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </section>

          {/* ── Contenu ── */}
          <div className="relative z-10 w-full flex-1 px-4 pb-12 sm:px-6 sm:pb-16">
            {/* SECTION 1 — Fiche technique */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
              <StatCard label={t("modeDetailDuration")} value={`${duration}`} unit="min" icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" /></svg>
              } />
              <StatCard label={t("modeDetailTotal")} value={Number(price).toLocaleString("fr-FR")} unit="DA" highlight icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-10v1m0 9v1m0-11a9 9 0 100 18 9 9 0 000-18z" /></svg>
              } />
              <StatCard label={t("modeDetailCapacity")} value={hasCapacity ? `${Number(mode.capacite_max)}` : "—"} unit={hasCapacity ? "kg" : ""} icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              } />
            </div>

            {/* SECTION 2 — Pourquoi choisir ce mode ? */}
            {mode.message_guide ? (
              <SectionCard
                tone="indigo"
                title={t("modeDetailWhyTitle")}
                icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 00-3.6 10.8c.4.3.6.7.6 1.2v.5a1 1 0 001 1h4a1 1 0 001-1v-.5c0-.5.2-.9.6-1.2A6 6 0 0012 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 21h5M10 18h4" /></svg>}
                className="mt-6"
              >
                <p className="text-base leading-7 text-slate-700">{mode.message_guide}</p>
              </SectionCard>
            ) : null}

            {/* SECTIONS 3 & 4 côte à côte */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* SECTION 3 — Ce que vous POUVEZ laver ✅ */}
              {clothTypes.length > 0 ? (
                <SectionCard
                  tone="emerald"
                  title={t("modeDetailAllowedTitle")}
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                >
                  <ul className="grid gap-2.5">
                    {clothTypes.map((type) => (
                      <li key={type} className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-4 py-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{type}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              ) : null}

              {/* SECTION 4 — À éviter / vérifier ❌⚠️ */}
              {(forbiddenTypes.length > 0 || mode.consigne_securite) ? (
                <SectionCard
                  tone="rose"
                  title={t("modeDetailForbiddenTitle")}
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                >
                  {forbiddenTypes.length > 0 ? (
                    <ul className="grid gap-2.5">
                      {forbiddenTypes.map((type) => (
                        <li key={type} className="flex items-center gap-3 rounded-xl bg-rose-50/70 px-4 py-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </span>
                          <span className="text-sm font-semibold text-slate-700">{type}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {mode.consigne_securite ? (
                    <div className={`flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 ${forbiddenTypes.length > 0 ? "mt-4" : ""}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9l-8 13.8A2 2 0 004 21h16a2 2 0 001.7-3.3l-8-13.8a2 2 0 00-3.4 0z" /></svg>
                      </span>
                      <div>
                        <p className="text-[0.7rem] font-black uppercase tracking-[0.15em] text-amber-600">{t("modeDetailSafetyLabel")}</p>
                        <p className="mt-1 text-sm leading-6 text-amber-900">{mode.consigne_securite}</p>
                      </div>
                    </div>
                  ) : null}
                </SectionCard>
              ) : null}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value, unit, icon, highlight }: { label: string; value: string; unit: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-4 rounded-[1.5rem] border bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] ${highlight ? "border-sky-200 ring-1 ring-sky-100" : "border-slate-100"}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${highlight ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white" : "bg-sky-50 text-sky-600"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-black tracking-tight text-slate-900">
          {value}{unit ? <span className="ml-1 text-sm font-bold text-slate-400">{unit}</span> : null}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ tone, title, icon, children, className }: { tone: "indigo" | "emerald" | "rose"; title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  const tones = {
    indigo: { border: "border-indigo-100", headBg: "bg-indigo-50/60", headBorder: "border-indigo-50", chip: "bg-indigo-100 text-indigo-600", title: "text-indigo-600" },
    emerald: { border: "border-emerald-100", headBg: "bg-emerald-50/60", headBorder: "border-emerald-50", chip: "bg-emerald-100 text-emerald-600", title: "text-emerald-600" },
    rose: { border: "border-rose-100", headBg: "bg-rose-50/60", headBorder: "border-rose-50", chip: "bg-rose-100 text-rose-600", title: "text-rose-600" },
  } as const;
  const c = tones[tone];
  return (
    <div className={`rounded-[1.5rem] border ${c.border} bg-white p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-6 ${className ?? ""}`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.chip}`}>{icon}</div>
        <p className={`text-sm font-black uppercase tracking-[0.12em] ${c.title}`}>{title}</p>
      </div>
      {children}
    </div>
  );
}
