import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="FirstMan home" className={cn("flex items-center", className)}>
      <Image
        src="/fm-corp-logo-tp.png"
        alt="FirstMan — Your First Step"
        width={1050}
        height={239}
        priority
        className="h-11 w-auto object-contain"
      />
    </Link>
  );
}
