declare module "html5-qrcode" {
  export type Html5QrcodeScanType = "SCAN_TYPE_CAMERA" | "SCAN_TYPE_FILE";

  export interface Html5QrcodeScannerConfig {
    fps?: number;
    qrbox?: number | { width: number; height: number };
    aspectRatio?: number;
    rememberLastUsedCamera?: boolean;
    disableFlip?: boolean;
  }

  export class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: Html5QrcodeScannerConfig,
      verbose?: boolean
    );
    render(
      onSuccess: (decodedText: string, decodedResult: unknown) => void,
      onError?: (errorMessage: string, error: unknown) => void
    ): void;
    clear(): Promise<void>;
  }
}