import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Industries from "@/components/home/Industries";
import PrepaidCredits from "@/components/shared/PrepaidCredits";
import Services from "@/components/home/Services";
import Solutions from "@/components/home/Solutions";
import WhyERPVers from "@/components/home/WhyERPVers";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Solutions />
        <Industries />
        {/* Trusted partners / case studies — ready in components/home/CaseStudies.tsx, re-add <CaseStudies /> here once a client approves being featured. */}
        <WhyERPVers />
        <PrepaidCredits variant="teaser" />
      </main>
      <Footer />
    </>
  );
}
