"use client";

import { QRCodeSVG } from "qrcode.react";

type AppQRCodeProps = {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
};

export function AppQRCode({ value, size = 160, level = "M" }: AppQRCodeProps) {
  return (
    <div
      className="inline-flex rounded-lg border bg-white p-3"
      aria-label="QR code for app download"
    >
      <QRCodeSVG value={value} size={size} level={level} />
    </div>
  );
}
