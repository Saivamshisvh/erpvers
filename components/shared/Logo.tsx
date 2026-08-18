import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  inverse?: boolean;
};

export default function Logo({ inverse = false }: LogoProps) {
  return (
    <Link href="/" className="group inline-flex items-center" aria-label="ERP VERS home">
      <Image
        src={inverse ? "/logo-inverse.png" : "/logo.png"}
        alt="ERP VERS"
        width={640}
        height={325}
        priority
        className="h-11 w-auto transition-transform group-hover:scale-105 sm:h-12"
      />
    </Link>
  );
}
