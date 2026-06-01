import React from "react";

export function DetailCard({
  label,
  value,
  accent = "sky",
  className,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "sky" | "emerald" | "rose" | "amber";
  className?: string;
}) {
  const accentClasses = {
    sky: "border-sky-100 bg-sky-50/70 text-sky-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    rose: "border-rose-100 bg-rose-50/70 text-rose-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-800",
  } as const;

  return (
    <div className={`rounded-[1.5rem] border p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ${accentClasses[accent]} ${className ?? ""}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">{label}</p>
      <p className="mt-2 text-lg font-black leading-snug text-slate-900">{value}</p>
    </div>
  );
}

export default DetailCard;
