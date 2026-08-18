import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/shared/Icon";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist or has moved.",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main>
        <section className="relative overflow-hidden bg-slate-950 py-24 sm:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.24),transparent_26%),radial-gradient(circle_at_20%_100%,rgba(37,99,235,0.23),transparent_30%)]" />
          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">Error 404</p>
            <h1 className="mt-5 text-6xl font-bold tracking-[-0.045em] text-white sm:text-7xl">
              This page went missing.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
              The page you're looking for doesn't exist, or it may have moved. Let's get you back on track.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button href="/">
                Back to homepage <Icon name="arrow" className="ml-2 size-4" />
              </Button>
              <Button href="/contact" variant="outline">
                Contact us
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
