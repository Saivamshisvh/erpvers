import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import PageHero from "@/components/shared/PageHero";
import ContactForm from "@/components/contact/ContactForm";
import ContactInfo from "@/components/contact/ContactInfo";
import FAQ from "@/components/shared/FAQ";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell ERP VERS about the Infor LN workflow, integration, or application you want to build. We respond directly, within one business day.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow="Contact"
          title={
            <>
              Let&apos;s make your ERP work <span className="text-cyan-300">better for your team.</span>
            </>
          }
          description="Tell us about the process, integration, portal, or mobile workflow you want to improve. We'll start with the problem—not a sales pitch."
        />
        <section className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-[1.3fr_0.9fr] lg:px-10">
            <ContactForm />
            <ContactInfo />
          </div>
        </section>
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
