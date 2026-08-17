"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/shared/Icon";
import CopyableEmail from "@/components/contact/CopyableEmail";

const CONTACT_EMAIL = "support@erpvers.com";

const services = [
  "Infor LN development",
  "Web applications & portals",
  "Mobile workflows",
  "ERP integrations",
  "Something else",
];

const inputStyles =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const service = String(data.get("service") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = `ERPVers enquiry — ${service}`;
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      `Service: ${service}`,
      "",
      message,
    ].filter((line): line is string => line !== null);

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    window.location.href = mailto;
    setStatus("sent");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-8">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950">Send us an enquiry</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Fill this in and we&apos;ll open a pre-filled email to {CONTACT_EMAIL} so you can review it before sending.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Full name *</span>
            <input required name="name" type="text" placeholder="Your full name" className={inputStyles} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Work email *</span>
            <input required name="email" type="email" placeholder="you@company.com" className={inputStyles} />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Company</span>
          <input name="company" type="text" placeholder="Your company (optional)" className={inputStyles} />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Service interested in *</span>
          <div className="relative">
            <select required name="service" defaultValue="" className={`${inputStyles} appearance-none pr-10`}>
              <option value="" disabled>
                Select a service
              </option>
              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            <Icon
              name="arrow"
              className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 rotate-90 text-slate-400"
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Message *</span>
          <textarea
            required
            name="message"
            rows={5}
            placeholder="Tell us about the workflow, integration, or problem you want to solve…"
            className={inputStyles}
          />
        </label>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 sm:w-auto"
        >
          Send message <Icon name="arrow" className="size-4" />
        </button>

        {status === "sent" && (
          <p className="text-sm font-medium text-emerald-600">
            We tried to open your email app with the details filled in. If nothing happened (this needs a mail app set
            up on your device), copy the address below and send it from your own inbox: <CopyableEmail email={CONTACT_EMAIL} />
          </p>
        )}
      </form>
    </div>
  );
}
