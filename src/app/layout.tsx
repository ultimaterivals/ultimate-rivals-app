import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Ultimate Rivals", template: "%s | Ultimate Rivals" },
  description: "Plataforma oficial Ultimate Rivals",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  themeColor: "#f4c430",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
