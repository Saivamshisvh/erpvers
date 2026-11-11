import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark" | "outline";
  className?: string;
  /** Opens the link in a new tab. Use for links that leave the site. */
  external?: boolean;
};

const styles = {
  primary: "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700",
  secondary: "border border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50",
  dark: "bg-slate-950 text-white hover:bg-slate-800",
  outline: "border border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/10",
};

export default function Button({ href, children, variant = "primary", className = "", external = false }: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${styles[variant]} ${className}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
