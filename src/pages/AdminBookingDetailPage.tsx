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

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-sky-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-500">{label}</p>
      <p className="mt-2 break-words text-base font-bold leading-6 text-slate-900">{value}</p>
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-between gap-4 rounded-[2rem] border border-sky-100 bg-white/80 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-500">Détail réservation</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {booking ? getClientName(booking) : "Chargement du rendez-vous"}
            </h1>
          </div>
          <button
            type="button"
            onClick={backToDashboard}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Retour au calendrier
          </button>
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-sky-100 bg-white p-10 text-center text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            Chargement...
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            {error}
          </div>
        ) : booking ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-500">Référence</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">{booking.booking_reference}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{booking.establishment_name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.22em] ${
                  booking.status === "PAYE"
                    ? "bg-emerald-50 text-emerald-700"
                    : booking.status === "ANNULE"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                }`}>
                  {booking.status === "PAYE" ? "Payé" : booking.status === "ANNULE" ? "Annulé" : "En attente"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <DetailCard label="Client" value={getClientName(booking)} />
                <DetailCard label="Téléphone" value={booking.user_phone} />
                <DetailCard label="Référence" value={booking.booking_reference} />
                <DetailCard label="Mode / Poste" value={booking.resource_label} />
                <DetailCard label="Date" value={dateToLongLabel(booking.booking_date, language)} />
                <DetailCard label="Horaire" value={`${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`} />
                <DetailCard label="Montant" value={`${booking.total_price} DA`} />
                <DetailCard label="Validé par" value={booking.validated_by_phone || "-"} />
              </div>
            </section>

            <aside className="space-y-4 rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-500">Actions</p>
              <button
                type="button"
                onClick={backToDashboard}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Revenir au calendrier
              </button>
              <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
                La page détail est dédiée à la consultation du rendez-vous. Les actions de validation et d’annulation restent dans le calendrier principal.
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}