import { useMemo, useState } from "react";

import { TicketPrinter } from "./TicketPrinter";

type CreatedCustomerPayload = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  secretCode: string;
};

type AdminCustomerAccountFormProps = {
  establishmentName: string;
  onCreateAccount?: (payload: CreatedCustomerPayload) => Promise<void> | void;
  fullPage?: boolean;
};

export function AdminCustomerAccountForm({
  establishmentName,
  onCreateAccount,
  fullPage = true,
}: AdminCustomerAccountFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreatedCustomerPayload | null>(null);

  const canPrint = useMemo(() => {
    return firstName.trim() && lastName.trim() && phoneNumber.trim() && secretCode.trim();
  }, [firstName, lastName, phoneNumber, secretCode]);

  const ticketReceipt = useMemo(
    () => ({
      establishmentName,
      clientFirstName: lastCreated?.firstName || firstName || "",
      clientLastName: lastCreated?.lastName || lastName || "",
      clientPhone: lastCreated?.phoneNumber || normalizePhoneNumber(phoneNumber) || "",
      secretCode: lastCreated?.secretCode || secretCode || null,
      qrText: `LOGIN:${lastCreated?.phoneNumber || normalizePhoneNumber(phoneNumber) || ""}:${lastCreated?.secretCode || secretCode || ""}`,
      createdAt: new Date().toISOString(),
    }),
    [establishmentName, firstName, lastCreated, lastName, phoneNumber, secretCode]
  );

  const generateSecretCode = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSecretCode(code);
    return code;
  };

  const handleGenerateAndPrint = async () => {
    const generatedCode = secretCode || generateSecretCode();

    const payload: CreatedCustomerPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: normalizePhoneNumber(phoneNumber),
      secretCode: generatedCode,
    };

    if (!payload.firstName || !payload.lastName || !payload.phoneNumber) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateAccount?.(payload);
      setLastCreated(payload);
      // Do not auto-print here. Parent will handle preview/printing and notifications.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={fullPage ? "h-screen w-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#ffffff_45%,_#f8fbff_100%)] text-slate-900 overflow-hidden" : "text-slate-900"}>
      <div className={fullPage ? "grid h-full w-full gap-0 lg:grid-cols-[1.05fr_0.95fr]" : "grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"}>
        <section className={fullPage ? "border-r border-sky-100 bg-white/90 backdrop-blur overflow-y-auto" : "rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_30px_90px_rgba(14,165,233,0.10)] sm:p-8"}>
          <div className={fullPage ? "p-8 space-y-2" : "mb-6 space-y-2"}>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-500">
              Admin assistant
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Création de compte client
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Saisissez les informations du client présentiel, générez un code secret à 6 chiffres,
              puis imprimez un bon thermique prêt à remettre au client.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="Nom"
              value={lastName}
              onChange={setLastName}
              placeholder="Nom du client"
            />
            <Field
              label="Prénom"
              value={firstName}
              onChange={setFirstName}
              placeholder="Prénom du client"
            />
            <Field
              label="Téléphone"
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="05XXXXXXXX"
              inputMode="numeric"
              dir="ltr"
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Field
              label="Code secret 6 chiffres"
              value={secretCode}
              onChange={setSecretCode}
              placeholder="Généré automatiquement"
              inputMode="numeric"
              dir="ltr"
            />

            <button
              type="button"
              onClick={generateSecretCode}
              className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3.5 font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-md"
            >
              Générer le code
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerateAndPrint}
              disabled={isSubmitting || !canPrint}
              className="rounded-2xl bg-sky-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Préparation du bon..." : "Imprimer le Bon"}
            </button>

            <button
              type="button"
              onClick={() => {
                setFirstName("");
                setLastName("");
                setPhoneNumber("");
                setSecretCode("");
                setLastCreated(null);
              }}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Réinitialiser
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm leading-6 text-slate-600">
            Le bon imprimé est optimisé pour une largeur thermique de 80 mm. Le ticket contient
            les données client et un QR de connexion prêt à être scanné.
          </div>
        </section>

        <section className={fullPage ? "bg-white/90 backdrop-blur overflow-y-auto" : "rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_30px_90px_rgba(14,165,233,0.10)] sm:p-8"}>
          <div className={fullPage ? "p-8 mb-5" : "mb-5"}>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-500">
              Aperçu ticket
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Bon thermique 80 mm</h2>
          </div>

          <TicketPrinter
            receipt={ticketReceipt}
            title="Ticket de création de compte"
          />
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  dir = "ltr",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: React.HTMLInputTypeAttribute;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        dir={dir}
        className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function normalizePhoneNumber(value: string) {
  return value.replace(/[\s\-().]/g, "").trim();
}