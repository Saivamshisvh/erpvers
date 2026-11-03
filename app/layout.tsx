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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-950">
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
