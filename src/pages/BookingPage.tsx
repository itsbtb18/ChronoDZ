import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "../i18n";

type BookingPageProps = {
  language: AppLanguage;
  phoneNumber?: string;
};

type WashModeKey = "rapid" | "express" | "premium" | "vip";

type WashMode = {
  key: WashModeKey;
  label: string;
  duration: number;
  pricePerMinute: number;
  accent: string;
  description: string;
};

const WASH_MODES: WashMode[] = [
  {
    key: "rapid",
    label: "Rapide",
    duration: 10,
    pricePerMinute: 15,
    accent: "from-cyan-500 to-sky-600",
    description: "Cycle court et efficace pour un nettoyage rapide.",
  },
  {
    key: "express",
    label: "Express",
    duration: 15,
    pricePerMinute: 15,
    accent: "from-sky-500 to-blue-600",
    description: "Le meilleur équilibre entre vitesse et résultat.",
  },
  {
    key: "premium",
    label: "Premium",
    duration: 30,
    pricePerMinute: 15,
    accent: "from-blue-500 to-indigo-600",
    description: "Traitement approfondi avec un temps plus confortable.",
  },
  {
    key: "vip",
    label: "VIP",
    duration: 60,
    pricePerMinute: 15,
    accent: "from-slate-900 to-slate-700",
    description: "Le cycle le plus complet pour un rendu maximal.",
  },
];

export function BookingPage({ language, phoneNumber }: BookingPageProps) {
  const { i18n } = useTranslation();
  const isArabic = language === "ar";
  const [selectedModeKey, setSelectedModeKey] = useState<WashModeKey | null>("express");
  const [step, setStep] = useState<"choose" | "next">("choose");

  const selectedMode = useMemo(
    () => WASH_MODES.find((mode) => mode.key === selectedModeKey) ?? null,
    [selectedModeKey]
  );

  const totalPrice = selectedMode ? selectedMode.duration * selectedMode.pricePerMinute : 0;

  const handleNext = () => {
    if (!selectedMode) {
      return;
    }

    setStep("next");
  };

  const handleBack = () => {
    setStep("choose");
  };

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="relative min-h-screen w-screen overflow-hidden bg-slate-50 text-slate-900"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.14),_transparent_26%),linear-gradient(135deg,rgba(248,250,252,1),rgba(241,245,249,1),rgba(255,255,255,1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.55),rgba(255,255,255,0.18))] backdrop-blur-[1px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {step === "choose" ? (
          <section className="flex flex-1 items-stretch">
            <div className="grid min-h-screen w-full lg:grid-cols-[0.92fr_1.08fr]">
              <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 px-6 py-8 text-white sm:px-8 lg:px-10">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute -left-20 top-8 h-44 w-44 rounded-full bg-white/30 blur-3xl" />
                  <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl" />
                </div>

                <div className="relative space-y-6">
                  <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-sky-50/90">
                    Mode de lavage
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-100/80">
                      Connexion active
                    </p>
                    <h1 className="max-w-md text-4xl font-black leading-tight sm:text-5xl">
                      Choisissez votre programme de lavage
                    </h1>
                    <p className="max-w-lg text-base leading-7 text-sky-50/90">
                      Sélectionnez un mode, vérifiez la durée fixe, puis validez pour passer à l’étape suivante.
                    </p>
                  </div>
                </div>

                <div className="relative mt-8 grid gap-3 rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-sm text-sky-50/90 shadow-[0_16px_40px_rgba(2,132,199,0.18)] backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Tarif unitaire</span>
                    <span className="text-lg font-black text-white">15 DA / min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Durée sélectionnée</span>
                    <span className="text-lg font-black text-white">
                      {selectedMode ? `${selectedMode.duration} min` : "--"}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-sky-50/90">
                    {selectedMode ? selectedMode.description : "Choisissez un mode pour voir le total calculé."}
                  </div>
                </div>
              </aside>

              <div className="flex flex-col px-5 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">
                      Sélection du menu
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      Choisissez le mode de lavage
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Chaque mode possède une durée fixe et le total se calcule automatiquement selon le prix unitaire.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-right shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-sky-600">
                      Prix total
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{totalPrice} DA</p>
                  </div>
                </div>

                <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {WASH_MODES.map((mode, index) => {
                    const active = mode.key === selectedModeKey;
                    return (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setSelectedModeKey(mode.key)}
                        className={`group relative overflow-hidden rounded-[1.75rem] border p-5 text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] ${active ? "border-sky-500 bg-sky-50 shadow-[0_24px_60px_rgba(14,165,233,0.18)]" : "border-sky-100 bg-white/90"} animate-fade-in-up`}
                        style={{ animationDelay: `${index * 90}ms` }}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-5 ${active ? "opacity-10" : ""}`} />
                        <div className="relative flex h-full flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">
                                Mode {mode.key}
                              </p>
                              <h3 className="mt-2 text-2xl font-black text-slate-900">{mode.label}</h3>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] ${active ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700"}`}>
                              {mode.duration} min
                            </div>
                          </div>

                          <p className="min-h-[56px] text-sm leading-6 text-slate-500">
                            {mode.description}
                          </p>

                          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-slate-600">Prix unitaire</span>
                              <span className="font-black text-slate-900">{mode.pricePerMinute} DA / min</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <span className="font-semibold text-slate-600">Total</span>
                              <span className="text-lg font-black text-slate-900">{mode.duration * mode.pricePerMinute} DA</span>
                            </div>
                          </div>

                          <div className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-sky-600 text-white" : "bg-slate-50 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700"}`}>
                            {active ? "Mode sélectionné" : "Cliquer pour sélectionner"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-sky-100 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-500">Récapitulatif</p>
                    <p className="text-lg font-black text-slate-900">
                      {selectedMode ? `${selectedMode.label} • ${selectedMode.duration} min • ${totalPrice} DA` : "Aucun mode sélectionné"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!selectedMode}
                    className="group inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Suivant
                    <span className="ml-2 transition group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-3xl bg-white/85 p-8 text-center shadow-[0_30px_100px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">Étape suivante</p>
              <h2 className="mt-3 text-3xl font-black text-slate-900">Suite à venir</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                Le mode {selectedMode?.label} a été sélectionné avec un total de {totalPrice} DA. La prochaine étape sera ajoutée ensuite.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-sky-50"
                >
                  Retour
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-500"
                >
                  Continuer
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.55s ease-out both;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
