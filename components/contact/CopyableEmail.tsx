"use client";

import { useState } from "react";
import Icon from "@/components/shared/Icon";

type CopyableEmailProps = {
  email: string;
  className?: string;
};

/**
 * Legacy, synchronous copy fallback. Doesn't depend on the async Clipboard
 * API (which can silently hang waiting on a permission grant in some
 * browsers) — this works immediately off a real user click.
 */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
}

export default function CopyableEmail({ email, className = "" }: CopyableEmailProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  function resolve(ok: boolean) {
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 2000);
  }

  function handleCopy() {
    let settled = false;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(email)
        .then(() => {
          if (!settled) {
            settled = true;
            resolve(true);
          }
        })
        .catch(() => {
          if (!settled) {
            settled = true;
            resolve(legacyCopy(email));
          }
        });

      // The Clipboard API can hang waiting on a permission prompt instead of
      // rejecting. Don't leave the button looking dead — fall back fast.
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(legacyCopy(email));
        }
      }, 300);
    } else {
      resolve(legacyCopy(email));
    }
  }

  const label = state === "copied" ? "Copied" : state === "failed" ? "Select & copy" : "Copy";

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
        <Icon name={state === "copied" ? "check" : "copy"} className="size-3.5" />
        {label}
      </button>
    </span>
  );
}
