import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog } from "@/services/marketing-catalog";

export async function SiteFooter() {
  const [profile, catalog] = await Promise.all([getCompanyProfile(), getPublicCatalog()]);
  const year = new Date().getFullYear();
  const popular = catalog.flatMap((v) => v.categories.flatMap((c) => c.services)).slice(0, 8);
  const exploreLinks = [
    ["/services", "All services"],
    ["/pricing", "Transparent pricing"],
    ["/compare", "Compare structures"],
    ["/resources", "Business insights"],
    ["/about", "About FirstMan"],
    ["/contact", "Contact"],
  ] as const;
  return (
    <footer className="marketing-site border-t border-slate-200 bg-slate-100 text-slate-600">
      <div className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-pink-700 uppercase">
              Ready for the next filing?
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Get a clear scope before you spend.
            </h2>
          </div>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-pink-600 px-5 text-sm font-bold text-white hover:bg-pink-500"
          >
            Talk to an expert <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Logo className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-2" />
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
            Formation, licensing, tax, accounting, intellectual property and statutory
            compliance—managed by one corporate services team.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            {profile.address ? (
              <p className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-pink-600" />
                {profile.address}
              </p>
            ) : null}
            {profile.phone ? (
              <a href={`tel:${profile.phone}`} className="flex gap-2 hover:text-slate-950">
                <Phone className="size-4 text-pink-600" />
                {profile.phone}
              </a>
            ) : null}
            {profile.email ? (
              <a href={`mailto:${profile.email}`} className="flex gap-2 hover:text-slate-950">
                <Mail className="size-4 text-pink-600" />
                {profile.email}
              </a>
            ) : null}
          </div>
        </div>
        <nav>
          <h3 className="text-xs font-bold tracking-[.15em] text-slate-950 uppercase">
            Popular services
          </h3>
          <ul className="mt-5 space-y-3 text-sm">
            {popular.map((s) => (
              <li key={s.id}>
                <Link href={`/services/${s.slug}`} className="hover:text-pink-700">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav>
          <h3 className="text-xs font-bold tracking-[.15em] text-slate-950 uppercase">Explore</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {exploreLinks.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-pink-700">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h3 className="text-xs font-bold tracking-[.15em] text-slate-950 uppercase">
            Corporate details
          </h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Service area</dt>
              <dd className="mt-1 text-slate-600">{profile.areasServed}</dd>
            </div>
            {profile.gstin ? (
              <div>
                <dt className="text-slate-500">GSTIN</dt>
                <dd className="mt-1 text-slate-600">{profile.gstin}</dd>
              </div>
            ) : null}
            {profile.llpin ? (
              <div>
                <dt className="text-slate-500">LLPIN</dt>
                <dd className="mt-1 text-slate-600">{profile.llpin}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>
            © {year} {profile.legalName || profile.name}. All rights reserved.
          </span>
          <div className="flex gap-5">
            <Link href="/legal/privacy" className="hover:text-slate-950">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-slate-950">
              Terms
            </Link>
            <Link href="/login" className="hover:text-slate-950">
              Client login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
