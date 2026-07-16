import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark";
  className?: string;
};

const styles = {
  primary: "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700",
  secondary: "border border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50",
  dark: "bg-slate-950 text-white hover:bg-slate-800",
};

export default function Button({ href, children, variant = "primary", className = "" }: ButtonProps) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
