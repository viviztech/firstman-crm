import { ArrowRight, BadgeCheck, Building2, CheckCircle2, FileCheck2, Landmark, Scale, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingEnquiryForm } from "@/components/marketing/enquiry-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog, getPublicServices } from "@/services/marketing-catalog";

export const metadata: Metadata = { title: "FirstMan Corporate Services — Start, run and protect your business", description: "Company registration, GST, licensing, accounting, IP and compliance services with transparent pricing and accountable execution." };

const lifecycle = [
  { label: "Start", icon: Building2, copy: "Choose a structure and register the business correctly." },
  { label: "Enable", icon: Landmark, copy: "Get tax registrations, licenses and digital signatures." },
  { label: "Operate", icon: FileCheck2, copy: "Keep books, file returns and manage recurring obligations." },
  { label: "Protect", icon: ShieldCheck, copy: "Secure your brand, records and statutory standing." },
];

export default async function MarketingHomePage() {
  const [profile, catalog, services] = await Promise.all([getCompanyProfile(), getPublicCatalog(), getPublicServices()]);
  const featuredSlugs = ["pvt-ltd-registration", "llp-registration", "gst-registration", "trademark-registration", "income-tax-return-filing", "accounting-bookkeeping"];
  const featured = featuredSlugs.map((slug) => services.find((service) => service.slug === slug)).filter((service): service is (typeof services)[number] => Boolean(service)).concat(services).slice(0, 6);

  return <div className="marketing-site">
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="marketing-orbit" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8 lg:py-32">
        <div>
          <Badge className="border-pink-400/30 bg-pink-400/10 text-pink-200"><Sparkles /> Corporate services, without the black box</Badge>
          <h1 className="mt-7 max-w-4xl text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">Build the business.<br/><span className="text-pink-400">We’ll manage the filings.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">From incorporation to monthly books and annual compliance, FirstMan gives founders one expert team, one document trail, and clear progress at every step.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/contact" className="inline-flex h-12 items-center gap-2 rounded-lg bg-pink-600 px-6 text-sm font-bold text-white hover:bg-pink-500">Plan my requirements <ArrowRight className="size-4" /></Link><Link href="/services" className="inline-flex h-12 items-center rounded-lg border border-white/20 px-6 text-sm font-bold text-white hover:bg-white/10">Explore {services.length}+ services</Link></div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-300">{["Upfront professional fees", "Dedicated case ownership", "WhatsApp progress updates"].map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-pink-400" />{item}</span>)}</div>
        </div>
        <div className="relative">
          <div className="rounded-3xl border border-white/10 bg-white/[.06] p-5 shadow-2xl backdrop-blur sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs font-bold tracking-[.18em] text-pink-300 uppercase">Business lifecycle</p><p className="mt-1 text-sm text-slate-400">One team across every stage</p></div><BadgeCheck className="size-7 text-pink-400" /></div>
            <div className="mt-2">{lifecycle.map(({ label, icon: Icon, copy }, index) => <div key={label} className="group grid grid-cols-[44px_1fr] gap-4 py-4"><div className="relative flex size-11 items-center justify-center rounded-xl bg-white/10 text-pink-300"><Icon className="size-5" />{index < lifecycle.length - 1 ? <span className="absolute top-12 h-5 w-px bg-white/10" /> : null}</div><div><p className="font-bold">{label}</p><p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p></div></div>)}</div>
          </div>
        </div>
      </div>
    </section>

    <section className="border-b border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">{[[`${services.length}+`,"specialist services"],[`${catalog.length}`,"business practice areas"],["End-to-end","filing ownership"],[profile.areasServed,"service coverage"]].map(([value,label]) => <div key={label} className="px-4 py-7 text-center first:pl-0 lg:text-left"><p className="text-xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p></div>)}</div></section>

    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]"><div><p className="marketing-kicker">Practice areas</p><h2 className="marketing-heading mt-4">A specialist desk for every business obligation.</h2><p className="mt-5 max-w-md leading-7 text-slate-600">Services are organised around how a business actually operates—not around government portal names.</p><Link href="/services" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-pink-700">See the complete service directory <ArrowRight className="size-4" /></Link></div>
      <div className="grid gap-4 sm:grid-cols-2">{catalog.map((vertical, index) => {const Icon=[Building2,Landmark,Scale,FileCheck2,ShieldCheck][index]??FileCheck2; const count=vertical.categories.reduce((sum,c)=>sum+c.services.length,0); return <Card key={vertical.id} className="border-slate-200 py-0 shadow-none transition-all hover:-translate-y-1 hover:border-pink-200 hover:shadow-xl hover:shadow-slate-950/5"><CardHeader className="p-6 pb-3"><span className="flex size-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Icon className="size-5" /></span><CardTitle className="mt-5 text-lg font-bold text-slate-950">{vertical.name}</CardTitle></CardHeader><CardContent className="px-6 pb-5 text-sm leading-6 text-slate-600">{count} services across {vertical.categories.map(c=>c.name).slice(0,2).join(" and ")}.</CardContent><CardFooter className="border-slate-100 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-600">Explore practice area <ArrowRight className="ml-auto size-3.5" /></CardFooter></Card>})}</div></div>
    </section>

    <section className="bg-slate-50 py-20 lg:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="marketing-kicker">Frequently requested</p><h2 className="marketing-heading mt-4">Start with a proven workflow.</h2></div><Link href="/pricing" className="text-sm font-bold text-pink-700">View all pricing →</Link></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{featured.slice(0,6).map(service=><Link key={service.id} href={`/services/${service.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-pink-300 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><h3 className="font-bold text-slate-950 group-hover:text-pink-700">{service.name}</h3><ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-pink-700" /></div><p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{service.description ?? `Complete ${service.name.toLowerCase()} support, from document review to final handover.`}</p><div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs"><span className="font-bold text-slate-950">From {formatMoney(service.basePricePaise)}</span><span className="text-slate-500">~{service.estimatedDays} business days</span></div></Link>)}</div></div></section>

    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="grid overflow-hidden rounded-3xl bg-slate-950 lg:grid-cols-[.8fr_1.2fr]"><div className="p-8 text-white sm:p-12"><p className="text-xs font-bold tracking-[.18em] text-pink-300 uppercase">Start with clarity</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">Tell us what the business needs next.</h2><p className="mt-4 leading-7 text-slate-300">We’ll identify the right service, prerequisites, realistic timeline, and total expected fee before you commit.</p><div className="mt-8 space-y-3 text-sm text-slate-300">{["No-obligation requirement review","Same-day response during business hours","One point of contact from the first conversation"].map(x=><p key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 text-pink-400" />{x}</p>)}</div></div><div className="bg-white p-4 sm:p-8"><MarketingEnquiryForm services={services.map(s=>({id:s.id,name:s.name}))}/></div></div></section>
  </div>;
}
