import { ArrowRight, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { ServicesMegaMenu } from "@/components/marketing/services-mega-menu";
import { buttonVariants } from "@/components/ui/button";
import { telHref } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog } from "@/services/marketing-catalog";

const SECONDARY_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Insights" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const [catalog, profile] = await Promise.all([getPublicCatalog(), getCompanyProfile()]);

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
          {profile.phone ? (
            <a
              href={telHref(profile.phone)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:text-pink-700"
            >
              <Phone className="size-4" />
              {profile.phone}
            </a>
          ) : null}
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

        {profile.phone ? (
          <a
            href={telHref(profile.phone)}
            aria-label={`Call ${profile.phone}`}
            className="flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:border-pink-300 hover:text-pink-700 sm:hidden"
          >
            <Phone className="size-4" />
          </a>
        ) : null}

        <MobileNav catalog={catalog} phone={profile.phone} />
      </div>
    </header>
  );
}
