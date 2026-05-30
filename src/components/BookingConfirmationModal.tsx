import { useTranslation } from "react-i18next";

type BookingConfirmationModalProps = {
  open: boolean;
  firstName: string;
  lastName: string;
  dateLabel: string;
  timeLabel: string;
  duration: number;
  priceTotal: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function BookingConfirmationModal({
  open,
  firstName,
  lastName,
  dateLabel,
  timeLabel,
  duration,
  priceTotal,
  onClose,
  onConfirm,
}: BookingConfirmationModalProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-[2rem] border border-sky-100 bg-white shadow-[0_30px_90px_rgba(14,165,233,0.22)] transition-all duration-300 animate-[fadeIn_180ms_ease-out]"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="rounded-t-[2rem] bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-100">
            {t("confirmTitle")}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{t("confirmSubtitle")}</h3>
        </div>

        <div className="space-y-4 px-6 py-6 text-slate-900">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label={t("firstName")} value={firstName || "-"} />
            <DetailCard label={t("lastName")} value={lastName || "-"} />
            <DetailCard label={t("bookingDate")} value={dateLabel} />
            <DetailCard label={t("bookingTime")} value={timeLabel} />
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <p className="text-sm font-semibold text-sky-700">{t("selectedSlot")}</p>
            <p className="mt-1 text-base text-slate-700">
              {duration} {t("minuteUnit")} • {priceTotal}
            </p>
          </div>

          <div className={`flex gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-sky-100 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-sky-50"
            >
              {t("close")}
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
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}