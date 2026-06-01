import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { authHeader, getAuthSession } from "../auth/session";
import type { AppLanguage } from "../i18n";

type AdminCustomerDetailPageProps = {
  language: AppLanguage;
};

type Customer = {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  date_joined: string;
  secret_code_preview?: string;
  establishment_name?: string | null;
};

type Booking = {
  id: number;
  booking_reference: string;
  resource_label: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "EN_ATTENTE" | "PAYE" | "ANNULE";
  total_price: string;
  validated_by_phone?: string;
  validated_at?: string;
};

export function AdminCustomerDetailPage({ language }: AdminCustomerDetailPageProps) {
  const navigate = useNavigate();
  const params = useParams();
  const session = getAuthSession();
  const customerId = params.customerId ? Number(params.customerId) : null;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [secretCode, setSecretCode] = useState("");

  useEffect(() => {
    let active = true;

    const loadCustomer = async () => {
      if (!customerId) {
        setError("Client introuvable.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${customerId}/`, { headers: authHeader() });
        if (!response.ok) {
          throw new Error("Client introuvable.");
        }

        const payload = (await response.json()) as Customer;
        if (!active) {
          return;
        }

        setCustomer(payload);
        setFirstName(payload.first_name || "");
        setLastName(payload.last_name || "");
        setPhone(payload.phone || "");

        const bookingResponse = await fetch(`/api/bookings/?search=${encodeURIComponent(payload.phone)}`, {
          headers: authHeader(),
        });

        if (bookingResponse.ok) {
          const bookingPayload = (await bookingResponse.json()) as Booking[];
          if (active) {
            setBookings(bookingPayload.filter((booking) => booking.total_price !== undefined));
          }
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

    void loadCustomer();

    return () => {
      active = false;
    };
  }, [customerId]);

  const bookingStats = useMemo(() => {
    return {
      total: bookings.length,
      paid: bookings.filter((booking) => booking.status === "PAYE").length,
      pending: bookings.filter((booking) => booking.status === "EN_ATTENTE").length,
      cancelled: bookings.filter((booking) => booking.status === "ANNULE").length,
    };
  }, [bookings]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customerId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      };

      if (secretCode.trim()) {
        payload.secret_code = secretCode.trim();
      }

      const response = await fetch(`/api/users/${customerId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json();
        throw new Error(errorPayload.detail || "Erreur de mise à jour.");
      }

      const updated = (await response.json()) as Customer;
      setCustomer(updated);
      setSecretCode("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Erreur de mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    // open the in-site confirmation modal
    setShowDeleteModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const confirmDelete = async () => {
    if (!customerId) return;
    setDeleting(true);
    setError(null);

    try {
      // delete bookings first
      if (bookings && bookings.length > 0) {
        for (const b of bookings) {
          const res = await fetch(`/api/bookings/${b.id}/`, {
            method: "DELETE",
            headers: authHeader(),
          });

          if (!res.ok) {
            let body = "";
            try {
              const parsed = await res.json();
              body = parsed.detail || JSON.stringify(parsed);
            } catch (e) {
              body = await res.text().catch(() => "(no body)");
            }
            throw new Error(`Impossible de supprimer la réservation ${b.id}: ${body}`);
          }
        }
      }

      // delete user
      const response = await fetch(`/api/users/${customerId}/`, {
        method: "DELETE",
        headers: authHeader(),
      });

      if (!response.ok) {
        let serverMsg = "Impossible de supprimer le client.";
        try {
          const payload = await response.json();
          serverMsg = payload.detail || payload.message || JSON.stringify(payload);
          console.error("Delete client server response:", payload);
        } catch (parseErr) {
          console.error("Delete client: failed to parse error body", parseErr);
        }
        throw new Error(serverMsg);
      }

      setShowDeleteModal(false);
      navigate("/admin/dashboard/creation", { replace: true });
    } catch (err) {
      console.error("Delete client error:", err);
      setError(err instanceof Error ? err.message : "Impossible de supprimer le client.");
    } finally {
      setDeleting(false);
    }
  };

  const randomSecretCode = () => String(Math.floor(100000 + Math.random() * 900000));

  return (
    <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/30 to-white text-slate-900">
      <div className="grid h-full w-full grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between gap-3 border-b border-sky-100/60 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-500">Fiche client</p>
            <h1 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">
              {customer ? `${customer.first_name} ${customer.last_name}` : "Client"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard/creation", { replace: true })}
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Retour
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-0">
          {loading ? (
            <div className="grid h-full place-items-center px-4 text-slate-500">Chargement...</div>
          ) : error ? (
            <div className="grid h-full place-items-center px-4 text-rose-700">{error}</div>
          ) : customer ? (
            <div className="grid h-full gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <section className="min-h-0 overflow-y-auto border-r border-sky-100/60 bg-white/80 backdrop-blur-xl">
                <form onSubmit={handleSave} className="grid min-h-0 gap-0">
                  <div className="border-b border-sky-100/60 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-black tracking-tight sm:text-xl">Informations client</h2>
                      <div className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">
                        {customer.role}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Nom
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-2 w-full rounded-[1.25rem] border border-sky-100 bg-white px-4 py-3.5 outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Prénom
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-2 w-full rounded-[1.25rem] border border-sky-100 bg-white px-4 py-3.5 outline-none transition focus:border-sky-400"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-slate-700 xl:col-span-2">
                      Numéro de téléphone
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-2 w-full rounded-[1.25rem] border border-sky-100 bg-white px-4 py-3.5 outline-none transition focus:border-sky-400"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-slate-700 xl:col-span-2">
                      Nouveau code secret
                      <div className="mt-2 flex gap-3">
                        <input
                          type="text"
                          value={secretCode}
                          onChange={(e) => setSecretCode(e.target.value)}
                          className="min-w-0 flex-1 rounded-[1.25rem] border border-sky-100 bg-white px-4 py-3.5 tracking-[0.28em] outline-none transition focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => setSecretCode(randomSecretCode())}
                          className="shrink-0 rounded-[1.25rem] bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 hover:from-sky-500 hover:to-cyan-400"
                        >
                          Générer
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="mt-auto flex gap-3 border-t border-sky-100/60 px-4 py-4 sm:px-6 lg:px-8">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[1.25rem] bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_35px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 hover:from-sky-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex min-h-12 items-center justify-center rounded-[1.25rem] border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleting ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </form>
              </section>

              <aside className="grid min-h-0 gap-0 grid-rows-[auto_1fr] bg-white/70 backdrop-blur-xl">
                <div className="border-b border-sky-100/60 px-4 py-4 sm:px-6 lg:px-8">
                  <h2 className="text-lg font-black tracking-tight sm:text-xl">Résumé</h2>
                </div>

                <div className="min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                      <div className="rounded-[1.25rem] border border-sky-100 bg-sky-50/30 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-500">Téléphone</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{customer.phone}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-sky-100 bg-sky-50/30 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-500">Créé le</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {new Date(customer.date_joined).toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR")}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-sky-100 bg-sky-50/30 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-500">Établissement</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{customer.establishment_name || session?.establishmentName || "-"}</p>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-500">Historique</p>
                          <h3 className="mt-2 text-xl font-black tracking-tight">Réservations</h3>
                        </div>
                        <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">
                          {bookingStats.total}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                        <StatCard label="Total" value={bookingStats.total} tone="sky" />
                        <StatCard label="Payés" value={bookingStats.paid} tone="emerald" />
                        <StatCard label="En attente" value={bookingStats.pending} tone="amber" />
                        <StatCard label="Annulés" value={bookingStats.cancelled} tone="rose" />
                      </div>

                      {bookings.length === 0 ? (
                        <div className="mt-4 rounded-[1.25rem] border border-dashed border-sky-100 px-4 py-8 text-center text-sm text-slate-500">
                          Aucun rendez-vous.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {bookings.map((booking) => (
                            <button
                              key={booking.id}
                              type="button"
                              onClick={() => navigate(`/admin/dashboard/bookings/${booking.id}`)}
                              className="flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-sky-100 bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{booking.booking_reference}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {booking.booking_date} • {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-400">{booking.resource_label}</p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                  booking.status === "PAYE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : booking.status === "ANNULE"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {booking.status === "PAYE" ? "Payé" : booking.status === "ANNULE" ? "Annulé" : "En attente"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={cancelDelete} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-black text-slate-900">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-slate-600">
              {bookings && bookings.length > 0
                ? `Ce client a ${bookings.length} réservation(s). Supprimer le compte supprimera également ses réservations.`
                : "Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible."}
            </p>

            {bookings && bookings.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto rounded-md border border-sky-100 p-3">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-black text-sm text-slate-900">{b.booking_reference}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{b.booking_date} • {b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-500">{b.resource_label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleting}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-2xl bg-rose-600 px-4 py-2 font-black text-white disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Supprimer le compte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "sky" | "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    sky: "border-sky-100 bg-sky-50/30 text-sky-500",
    emerald: "border-emerald-100 bg-emerald-50/30 text-emerald-500",
    amber: "border-amber-100 bg-amber-50/30 text-amber-500",
    rose: "border-rose-100 bg-rose-50/30 text-rose-500",
  }[tone];

  return (
    <div className={`rounded-[1.25rem] border p-4 ${toneClasses}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.3em]">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
