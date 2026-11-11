import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import WhatsAppButton from "@/components/shared/WhatsAppButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://erpvers.com"),
  title: {
    default: "ERP VERS | Modern ERP solutions for manufacturers",
    template: "%s | ERP VERS",
  },
  description:
    "ERP VERS extends Infor LN with web portals, mobile apps, and integrations - plus data analytics, data engineering, and SAP BTP services.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://erpvers.com",
    siteName: "ERP VERS",
    title: "ERP VERS | Modern ERP solutions for manufacturers",
    description:
      "Modern web, mobile, integration, and data solutions that extend Infor LN, SAP BTP, and enterprise ERP platforms.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ERP VERS",
  url: "https://erpvers.com",
  logo: "https://erpvers.com/logo.png",
  email: "support@erpvers.com",
  description:
    "ERP VERS extends Infor LN with web portals, mobile apps, and integrations, and provides data analytics, data engineering, and SAP BTP services.",
  knowsAbout: ["Infor LN", "Infor ION", "ERP integration", "Data analytics", "Data engineering", "SAP BTP"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-950">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-blue-700 focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
        <WhatsAppButton />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </body>
    </html>
  );
}
