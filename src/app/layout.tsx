import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://levylite.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "LevyLite — Affordable Strata Management Software for Small Operators",
    template: "%s | LevyLite",
  },
  description:
    "LevyLite is affordable strata management software built for small Australian operators. Levy tracking, AGM management, owner portal, and trust accounting — from $0.75/lot/month. No minimums. No sales calls.",
  keywords: [
    "strata management software",
    "strata software australia",
    "affordable strata software",
    "small strata operator",
    "levy management software",
    "strata manager software",
    "WA strata software",
    "body corporate software",
    "strata accounting software",
    "AGM management software",
    "owner portal strata",
    "strata software perth",
  ],
  authors: [{ name: "LevyLite", url: BASE_URL }],
  creator: "Kokoro Software",
  publisher: "Kokoro Software",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: BASE_URL,
    siteName: "LevyLite",
    title: "LevyLite — Affordable Strata Management Software for Small Operators",
    description:
      "Strata management software built for small Australian operators. From $0.75/lot/month. No minimums. No sales calls.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "LevyLite — Affordable Strata Management Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LevyLite — Affordable Strata Management Software",
    description:
      "Built for small Australian strata operators. From $0.75/lot/month. No minimums. No sales calls.",
    images: [`${BASE_URL}/og-image.png`],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LevyLite",
  url: BASE_URL,
  logo: `${BASE_URL}/kokoro-logo.png`,
  description:
    "Affordable strata management software for small Australian operators.",
  foundingDate: "2026",
  areaServed: "AU",
  sameAs: [],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LevyLite",
  url: BASE_URL,
  description:
    "Strata management software for small Australian operators. Levy tracking, AGM management, owner portals, and trust accounting — at a price that makes sense for small schemes.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "AUD",
    priceValidUntil: "2027-01-01",
    description: "Free tier: up to 5 lots, 1 scheme. Paid plans from $0.75/lot/month.",
    availability: "https://schema.org/InStock",
  },
  publisher: {
    "@type": "Organization",
    name: "Kokoro Software",
    url: "https://kokorosoftware.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="schema-software"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
