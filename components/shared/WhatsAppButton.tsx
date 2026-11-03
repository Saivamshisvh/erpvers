import Icon from "@/components/shared/Icon";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

export default function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-5 z-40 grid size-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 sm:right-8 lg:right-10"
    >
      <Icon name="chat" className="size-6" />
    </a>
  );
}
