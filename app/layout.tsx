import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://erpvers.com"),
  title: {
    default: "ERP VERS | Modern ERP solutions for manufacturers",
    template: "%s | ERP VERS",
  },
  description:
    "ERP VERS extends Infor LN with tailored web portals, mobile applications, integrations, and operational dashboards.",
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
      "Modern web, mobile, and integration solutions that extend Infor LN and enterprise ERP platforms.",
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-950">
        {children}
      </body>
    </html>
  );
}
