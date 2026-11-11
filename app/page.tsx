import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import CTASection from "@/components/shared/CTASection";
import Hero from "@/components/home/Hero";
import HowWeWork from "@/components/home/HowWeWork";
import Industries from "@/components/home/Industries";
import PrepaidCredits from "@/components/shared/PrepaidCredits";
import Services from "@/components/home/Services";
import Solutions from "@/components/home/Solutions";
import ToolsStrip from "@/components/home/ToolsStrip";
import WhyERPVers from "@/components/home/WhyERPVers";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <ToolsStrip />
        <Services />
        <Solutions />
        <Industries />
        {/* Trusted partners / case studies - ready in components/home/CaseStudies.tsx, re-add <CaseStudies /> here once a client approves being featured. */}
        <WhyERPVers />
        <HowWeWork />
        <PrepaidCredits variant="teaser" />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
