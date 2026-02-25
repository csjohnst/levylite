import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ExceptionlessProvider } from "@/components/exceptionless-provider";

export const metadata: Metadata = {
  title: "LevyLite",
  description: "Strata management for small operators",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
        <ExceptionlessProvider />
        <Script
          src="https://umami.kokorosoftware.com/script.js"
          data-website-id="24992dcf-2877-43a6-b362-3875a091cbd9"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
