import { useEffect, useId, useState } from "react";

export type ParsedWhatsAppQr =
  | { kind: "booking-validation"; bookingId: string; rawText: string }
  | { kind: "login"; phone: string; secretCode: string; rawText: string }
  | { kind: "unknown"; rawText: string };

type WhatsAppQrScannerProps = {
  onScan: (payload: ParsedWhatsAppQr) => void;
  onStatusChange?: (status: string) => void;
  instruction?: string;
};

export function WhatsAppQrScanner({
  onScan,
  onStatusChange,
  instruction,
}: WhatsAppQrScannerProps) {
  const containerId = useId().replace(/:/g, "-");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    let scanner: { clear: () => Promise<void> } | null = null;
    let cancelled = false;

    async function startScanner() {
      try {
        const module = await import("html5-qrcode");
        if (cancelled) {
          return;
        }

        const { Html5QrcodeScanner } = module;
        scanner = new Html5QrcodeScanner(
          containerId,
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            rememberLastUsedCamera: true,
            disableFlip: false,
          },
          false
        );

        onStatusChange?.("camera-starting");

        scanner.render(
          (decodedText) => {
            onScan(parseWhatsAppQr(decodedText));
            onStatusChange?.("qr-detected");
          },
          () => {
            onStatusChange?.("scanning");
          }
        );
      } catch {
        setIsSupported(false);
        onStatusChange?.("camera-unavailable");
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.clear().catch(() => undefined);
      }
    };
  }, [containerId, onScan, onStatusChange]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-slate-600">
        {isSupported
          ? instruction || "Placez le QR code WhatsApp devant la caméra de la tablette."
          : "La caméra n'est pas disponible dans cet environnement."}
      </div>
      <div id={containerId} className="overflow-hidden rounded-[1.5rem] border border-sky-100 bg-white shadow-inner" />
    </div>
  );
}

function parseWhatsAppQr(rawText: string): ParsedWhatsAppQr {
  if (rawText.startsWith("VALIDATE_BOOKING:")) {
    return {
      kind: "booking-validation",
      bookingId: rawText.replace("VALIDATE_BOOKING:", "").trim(),
      rawText,
    };
  }

  if (rawText.startsWith("LOGIN:")) {
    const parts = rawText.split(":");
    return {
      kind: "login",
      phone: parts[1] || "",
      secretCode: parts[2] || "",
      rawText,
    };
  }

  return { kind: "unknown", rawText };
}