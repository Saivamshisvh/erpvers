import Icon from "@/components/shared/Icon";
import CopyableEmail from "@/components/contact/CopyableEmail";

const CONTACT_EMAIL = "support@erpvers.com";
const WHATSAPP_NUMBER = "919381920369";
const WHATSAPP_MESSAGE = "Hi ERPVers, I'd like to talk about a project.";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export default function ContactInfo() {
  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon name="mail" className="size-5" />
        </span>
        <h3 className="mt-5 text-lg font-bold text-slate-950">Email</h3>
        <p className="mt-2 text-sm text-blue-600">
          <CopyableEmail email={CONTACT_EMAIL} />
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon name="chat" className="size-5" />
        </span>
        <h3 className="mt-5 text-lg font-bold text-slate-950">WhatsApp</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Prefer a quick chat? Message us directly.</p>
        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Icon name="chat" className="size-4" /> Chat on WhatsApp
        </a>
      </div>

      <div className="rounded-2xl bg-slate-950 p-6 text-white">
        <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-cyan-300">
          <Icon name="shield" className="size-5" />
        </span>
        <h3 className="mt-5 text-lg font-bold">What to expect</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          You&apos;ll hear back from us directly within one business day — no account managers or hand-offs, just the people who&apos;ll actually do the work.
        </p>
      </div>
    </div>
  );
}
