import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <Image
        src="/logo.png"
        alt="FirstMan — Your First Step"
        width={212}
        height={50}
        priority
        className="h-9 w-auto"
      />
    </Link>
  );
}
