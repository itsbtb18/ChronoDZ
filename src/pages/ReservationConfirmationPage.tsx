import { useTranslation } from "react-i18next";

type ReservationConfirmationPageProps = {
  open: boolean;
  firstName: string;
  lastName: string;
  establishmentName: string;
  dateLabel: string;
  timeLabel: string;
  priceTotal: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReservationConfirmationPage({
  open,
  firstName,
  lastName,
  establishmentName,
  dateLabel,
  timeLabel,
  priceTotal,
  onConfirm,
  onCancel,
}: ReservationConfirmationPageProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  if (!open) {
    return null;
  }

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_24px_70px_rgba(14,165,233,0.16)]"
    >
      <div className="bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-5 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-100">
          {t("confirmationPage")}
        </p>
        <h3 className="mt-2 text-2xl font-bold">{t("confirmSubtitle")}</h3>
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label={t("firstName")} value={firstName || "-"} />
          <SummaryCard label={t("lastName")} value={lastName || "-"} />
          <SummaryCard label={t("establishment")} value={establishmentName || "-"} />
          <SummaryCard label={t("bookingDate")} value={dateLabel} />
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label={t("bookingTime")} value={timeLabel} compact />
            <SummaryCard label={t("priceTotal")} value={priceTotal} compact />
          </div>
        </div>

        <div className={`flex gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-sky-100 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-sky-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-500"
          >
            {t("confirmReservation")}
          </button>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-slate-50 p-4 ${compact ? "min-h-[88px]" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}