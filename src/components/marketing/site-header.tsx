import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { WhatsAppCta } from "@/components/marketing/whatsapp-cta";
import { getCompanyProfile } from "@/services/company-profile";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const profile = await getCompanyProfile();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <WhatsAppCta whatsappNumber={profile.whatsappNumber} className="hidden sm:inline-flex" />
          <Link
            href="/contact"
            className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors"
          >
            Get started
          </Link>
        </div>
        <details className="md:hidden">
          <summary className="list-none rounded-lg border px-2.5 py-1.5 text-sm font-medium">
            Menu
          </summary>
          <nav
            className="absolute inset-x-0 top-16 flex flex-col gap-1 border-b bg-background p-4 shadow-sm"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
