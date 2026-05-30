declare module "qrcode.react" {
  import type { ComponentType, SVGProps } from "react";

  export const QRCodeSVG: ComponentType<
    SVGProps<SVGSVGElement> & {
      value: string;
      size?: number;
      level?: "L" | "M" | "Q" | "H";
      includeMargin?: boolean;
      bgColor?: string;
      fgColor?: string;
    }
  >;
}