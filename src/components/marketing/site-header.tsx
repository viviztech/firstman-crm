import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { ServicesMegaMenu } from "@/components/marketing/services-mega-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPublicCatalog } from "@/services/marketing-catalog";

const SECONDARY_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Insights" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const catalog = await getPublicCatalog();

  return (
    <header className="marketing-header sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-7 px-4 sm:px-6 lg:px-8">
        <Logo className="shrink-0" />

        <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Primary navigation">
          <ServicesMegaMenu catalog={catalog} />
          {SECONDARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-slate-700")}
          >
            Client login
          </Link>
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-10 bg-pink-700 px-5 text-white hover:bg-pink-800",
            )}
          >
            Talk to an expert <ArrowRight />
          </Link>
        </div>

        <MobileNav catalog={catalog} />
      </div>
    </header>
  );
}
