import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Text-reconstruction of the FirstMan wordmark (bold "FIRSTMAN" + the "Your First Step"
 * tagline in brand magenta) until the real logo asset file is provided — swap for an
 * <Image> once it lands in /public.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex flex-col leading-none", className)}>
      <span className="text-xl font-extrabold tracking-tight text-foreground">
        FIRSTMAN<span className="align-super text-[0.5em]">®</span>
      </span>
      <span className="text-brand -mt-0.5 font-serif text-xs italic">Your First Step</span>
    </Link>
  );
}
