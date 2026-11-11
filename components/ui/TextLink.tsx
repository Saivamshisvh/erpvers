import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/shared/Icon";

type TextLinkProps = {
  href: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
};

export default function TextLink({ href, children, tone = "light", className = "" }: TextLinkProps) {
  const color = tone === "dark" ? "text-cyan-300 hover:text-white" : "text-blue-600 hover:text-blue-800";
  return (
    <Link href={href} className={`group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition-colors ${color} ${className}`}>
      {children}
      <Icon name="arrow" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
