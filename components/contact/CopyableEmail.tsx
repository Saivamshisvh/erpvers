"use client";

import { useState } from "react";
import Icon from "@/components/shared/Icon";

type CopyableEmailProps = {
  email: string;
  className?: string;
};

export default function CopyableEmail({ email, className = "" }: CopyableEmailProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the visible email text can still be selected and copied by hand.
    }
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <a href={`mailto:${email}`} className="break-all font-semibold underline underline-offset-2">
        {email}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-md border border-current/20 px-2 py-1 text-xs font-semibold opacity-80 transition hover:opacity-100"
      >
        <Icon name={copied ? "check" : "copy"} className="size-3.5" />
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
