import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="FirstMan home"
      className={cn("flex items-center gap-2.5", className)}
    >
      <Image
        src="/brand/firstman-mark.png"
        alt=""
        width={512}
        height={512}
        priority
        className="size-9 shrink-0 object-contain"
      />
      <Image
        src="/brand/firstman-wordmark.png"
        alt="FirstMan"
        width={1255}
        height={220}
        priority
        className="h-7 w-auto"
      />
    </Link>
  );
}
