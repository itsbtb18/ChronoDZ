import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { authHeader } from "../auth/session";
import type { AppLanguage } from "../i18n";

type Booking = {
  id: number;
  booking_reference: string;
  user_first_name?: string;
  user_last_name?: string;
  user_phone: string;
  resource_label: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "EN_ATTENTE" | "PAYE" | "ANNULE";
  payment_method?: "CASH" | "BARIDIMOB" | null;
  total_price: string;
  establishment_name: string;
  validated_by_phone?: string;
  validated_at?: string;
};

type AdminBookingDetailPageProps = {
  language: AppLanguage;
};

function getClientName(booking: Booking) {
  return [booking.user_first_name, booking.user_last_name].filter(Boolean).join(" ") || booking.user_phone;
}

function dateToLongLabel(dateValue: string, language: AppLanguage) {
  const current = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(current);
}

function getMinutesFromTime(timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  return hours * 60 + minutes;
}

function getWashMode(booking: Booking) {
  const start = booking.start_time.slice(0, 5);
  const end = booking.end_time.slice(0, 5);
  const duration = Math.max(getMinutesFromTime(end) - getMinutesFromTime(start), 10);
  if (duration <= 15) return "Rapide";
  if (duration <= 30) return "Express";
  if (duration <= 45) return "Premium";
  return "VIP";
}

function formatDateTime(isoString: string | undefined, language: AppLanguage) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-sky-100/50 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.02)] hover:shadow-[0_15px_30px_rgba(15,23,42,0.04)] transition-all duration-300">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-500">{label}</p>
      <p className="mt-2.5 break-words text-sm sm:text-base font-bold leading-6 text-slate-900">{value}</p>
    </div>
  );
}

export function AdminBookingDetailPage({ language }: AdminBookingDetailPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const bookingId = params.bookingId ? Number(params.bookingId) : null;
  const navigationState = location.state as { booking?: Booking; returnTo?: string } | null;
  const initialBooking = useMemo(() => {
    return navigationState?.booking ?? null;
  }, [location.state]);
  const [booking, setBooking] = useState<Booking | null>(initialBooking);
  const [loading, setLoading] = useState(!initialBooking);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadBooking = async () => {
      if (!bookingId || booking) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/bookings/${bookingId}/`, {
          headers: authHeader(),
        });

        if (!response.ok) {
          throw new Error("Réservation introuvable.");
        }

        const payload = (await response.json()) as Booking;
        if (active) {
          setBooking(payload);
        }
      } catch (errorValue) {
        if (active) {
          setError(errorValue instanceof Error ? errorValue.message : "Erreur de chargement.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadBooking();

    return () => {
      active = false;
    };
  }, [booking, bookingId]);

  const backToDashboard = () => navigate(navigationState?.returnTo ?? "/admin/dashboard/calendar", { replace: true });

  return (
    <main className="min-h-screen w-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-sky-50/20 to-white text-slate-900 pb-12 animate-fade-in-up">
      {/* Decorative background blooms */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-100/40 blur-3xl animate-float-soft" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-indigo-50/30 blur-3xl animate-float-soft delay-300" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between rounded-[2rem] border border-sky-100/60 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <div className="flex items-center gap-4 min-w-0">
            {/* Calendar icon with custom gradient */}
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-sky-500/20">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-sky-600 border border-sky-100/50 mb-1">
                Détail Réservation
              </div>
              <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                {booking ? getClientName(booking) : "Chargement..."}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={backToDashboard}
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:-translate-x-0.5 active:scale-95 cursor-pointer"
            >
              <svg className="w-4.5 h-4.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Retour au calendrier
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-[2rem] border border-sky-100/50 bg-white/80 backdrop-blur-xl shadow-lg">
            <div className="h-10 w-10 rounded-full border-[3px] border-slate-200 border-t-sky-500 animate-spin" />
            <p className="mt-4 text-sm font-semibold text-slate-400">Chargement de la réservation...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-[2rem] border border-rose-100 bg-rose-50/50 backdrop-blur-xl shadow-lg text-rose-800 max-w-2xl mx-auto text-center px-6">
            <svg className="w-12 h-12 text-rose-500 mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
            <h3 className="text-lg font-black">{error}</h3>
            <button
              type="button"
              onClick={backToDashboard}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Retour au calendrier
            </button>
          </div>
        ) : booking ? (
          <div className="w-full space-y-6">
            <section className="rounded-[2rem] border border-sky-100/40 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.03)] relative overflow-hidden">
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-sky-100/10 blur-2xl" />
                <div className="absolute left-0 bottom-0 h-32 w-32 rounded-full bg-cyan-100/10 blur-2xl" />
              </div>

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Référence</p>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900">{booking.booking_reference}</h2>
                    </div>
                  </div>
                  <span className={`rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] border ${
                    booking.status === "PAYE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : booking.status === "ANNULE"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {booking.status === "PAYE" ? "Payé" : booking.status === "ANNULE" ? "Annulé" : "En attente"}
                  </span>
                </div>

                <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <DetailCard label="Client" value={getClientName(booking)} />
                  <DetailCard label="Téléphone" value={booking.user_phone} />
                  <DetailCard label="Machine / Ressource" value={booking.resource_label} />
                  <DetailCard label="Mode de lavage" value={getWashMode(booking)} />
                  <DetailCard label="Date" value={dateToLongLabel(booking.booking_date, language)} />
                  <DetailCard label="Horaire" value={`${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`} />
                  <DetailCard label="Montant" value={`${booking.total_price} DA`} />
                  <DetailCard label="Établissement" value={booking.establishment_name} />
                  
                  {/* Payment Info */}
                  <DetailCard
                    label="Moyen de paiement"
                    value={
                      booking.status === "PAYE"
                        ? booking.payment_method === "BARIDIMOB"
                          ? "BaridiMob"
                          : "Espèces"
                        : "En attente"
                    }
                  />
                  <DetailCard
                    label="Date / Heure de paiement"
                    value={booking.status === "PAYE" ? formatDateTime(booking.validated_at, language) : "-"}
                  />
                  <DetailCard label="Validé par" value={booking.validated_by_phone || "-"} />
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}