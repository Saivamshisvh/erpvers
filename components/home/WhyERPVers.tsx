const features = [
    {
      title: "ERP Expertise",
      description:
        "Deep experience in Infor LN customization, extensions, integrations, and enterprise workflows.",
    },
    {
      title: "Modern Web Applications",
      description:
        "Responsive portals, dashboards, and web applications built with modern technologies.",
    },
    {
      title: "Seamless Integrations",
      description:
        "REST APIs, ION, BODs, and secure integrations between ERP and external systems.",
    },
    {
      title: "Long-Term Partnership",
      description:
        "From implementation to enhancements and support, we help clients grow with confidence.",
    },
  ];
  
  export default function WhyERPVers() {
    return (
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Why Choose ERP VERS
            </p>
  
            <h2 className="mt-4 text-4xl font-bold text-slate-900">
              Built for ERP. Designed for Growth.
            </h2>
  
            <p className="mt-6 text-lg text-slate-600">
              We combine enterprise ERP expertise with modern web technologies to
              deliver scalable, secure and user-friendly business solutions.
            </p>
          </div>
  
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-8 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <h3 className="text-xl font-semibold text-slate-900">
                  {feature.title}
                </h3>
  
                <p className="mt-4 leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }