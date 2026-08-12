import { ArrowRight, Building2, ChevronDown, FileCheck2, Landmark, Menu, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog } from "@/services/marketing-catalog";

const iconByIndex = [Building2, FileCheck2, Landmark, Scale, ShieldCheck] as const;

const SECONDARY_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Insights" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const [profile, catalog] = await Promise.all([getCompanyProfile(), getPublicCatalog()]);

  return (
    <header className="marketing-header sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="border-b border-slate-100 bg-slate-950 text-slate-300">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-[11px] font-medium sm:px-6 lg:px-8">
          <span>Business registration, tax, licensing and compliance</span>
          <span className="hidden sm:inline">Serving {profile.areasServed}</span>
        </div>
      </div>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-7 px-4 sm:px-6 lg:px-8">
        <Logo className="shrink-0" />

        <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Primary navigation">
          <details className="group/mega static h-full">
            <summary className="flex h-full cursor-pointer list-none items-center gap-1.5 px-3 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 [&::-webkit-details-marker]:hidden">
              Services <ChevronDown className="size-3.5 transition-transform group-open/mega:rotate-180" />
            </summary>
            <div className="absolute inset-x-0 top-[104px] border-y border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
              <div className="mx-auto grid max-w-7xl grid-cols-[1fr_3fr] gap-10 px-8 py-8">
                <div className="rounded-2xl bg-slate-950 p-7 text-white">
                  <p className="text-xs font-bold tracking-[0.18em] text-pink-300 uppercase">Full-service desk</p>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight">From first filing to every deadline after.</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Explore services by business need, with current pricing and document requirements.</p>
                  <Link href="/services" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-pink-300">
                    Browse all services <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-7 xl:grid-cols-3">
                  {catalog.slice(0, 5).map((vertical, index) => {
                    const Icon = iconByIndex[index] ?? FileCheck2;
                    const services = vertical.categories.flatMap((category) => category.services).slice(0, 5);
                    return (
                      <section key={vertical.id}>
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                          <span className="flex size-8 items-center justify-center rounded-lg bg-pink-50 text-pink-700"><Icon className="size-4" /></span>
                          {vertical.name.replace(" Services", "")}
                        </div>
                        <ul className="space-y-2">
                          {services.map((service) => (
                            <li key={service.id}><Link href={`/services/${service.slug}`} className="text-sm text-slate-600 hover:text-pink-700">{service.name}</Link></li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                  <section className="border-l border-slate-200 pl-7">
                    <p className="text-sm font-bold text-slate-950">Not sure where to start?</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Tell us your goal. We’ll map the filings, fees, and order of work.</p>
                    <Link href="/contact" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-pink-700">Get a recommendation <ArrowRight className="size-3.5" /></Link>
                  </section>
                </div>
              </div>
            </div>
          </details>
          {SECONDARY_LINKS.map((link) => <Link key={link.href} href={link.href} className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950">{link.label}</Link>)}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-slate-700")}>Client login</Link>
          <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "h-10 bg-pink-700 px-5 text-white hover:bg-pink-800")}>Talk to an expert <ArrowRight /></Link>
        </div>

        <details className="group/mobile ml-auto lg:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-800 [&::-webkit-details-marker]:hidden"><Menu className="size-5" /></summary>
          <div className="absolute inset-x-0 top-[104px] max-h-[calc(100vh-104px)] overflow-y-auto border-b bg-white p-4 shadow-xl">
            <details className="rounded-xl border border-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold [&::-webkit-details-marker]:hidden">Services <ChevronDown className="size-4" /></summary>
              <div className="space-y-5 border-t p-4">
                {catalog.map((vertical) => <section key={vertical.id}><p className="text-xs font-bold tracking-wide text-pink-700 uppercase">{vertical.name}</p><div className="mt-2 grid gap-2">{vertical.categories.flatMap((category) => category.services).slice(0, 6).map((service) => <Link key={service.id} href={`/services/${service.slug}`} className="text-sm text-slate-700">{service.name}</Link>)}</div></section>)}
                <Link href="/services" className="inline-flex items-center gap-2 text-sm font-bold text-pink-700">View all services <ArrowRight className="size-4" /></Link>
              </div>
            </details>
            <nav className="mt-3 grid gap-1">{SECONDARY_LINKS.map((link) => <Link key={link.href} href={link.href} className="rounded-lg px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50">{link.label}</Link>)}<Link href="/contact" className="mt-2 rounded-lg bg-pink-700 px-4 py-3 text-center font-semibold text-white">Talk to an expert</Link></nav>
          </div>
        </details>
      </div>
    </header>
  );
}
