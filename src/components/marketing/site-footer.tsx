import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog } from "@/services/marketing-catalog";

export async function SiteFooter() {
  const [profile, catalog] = await Promise.all([getCompanyProfile(), getPublicCatalog()]);
  const featuredServices = catalog.flatMap((category) => category.services).slice(0, 6);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="flex flex-col gap-3 md:col-span-1">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Company registration, GST, and compliance — done right, tracked end to end.
          </p>
          <p className="text-sm text-muted-foreground">Serving {profile.areasServed}.</p>
        </div>

        <nav aria-label="Services">
          <h3 className="mb-3 text-sm font-semibold">Services</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {featuredServices.map((service) => (
              <li key={service.id}>
                <Link href={`/services/${service.slug}`} className="hover:text-foreground">
                  {service.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/services" className="hover:text-foreground">
                View all services →
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="mb-3 text-sm font-semibold">Company</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Contact">
          <h3 className="mb-3 text-sm font-semibold">Get in touch</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {profile.phone ? (
              <li>
                <a href={`tel:${profile.phone}`} className="hover:text-foreground">
                  {profile.phone}
                </a>
              </li>
            ) : null}
            {profile.email ? (
              <li>
                <a href={`mailto:${profile.email}`} className="hover:text-foreground">
                  {profile.email}
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/contact" className="hover:text-foreground">
                Send us a message
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            © {year} {profile.name}. All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
