import { Award, Building2, Compass, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCompanyProfile } from "@/services/company-profile";

export const metadata: Metadata = {
  title: "About FirstMan Corporate Services",
  description:
    "FirstMan Corporate Services is an arm of FirstMan Techno Enterprises Limited, working with new-age entrepreneurs on incorporation, compliance, and business growth.",
};

const coreValues = [
  {
    title: "Transparency",
    icon: ShieldCheck,
    body: "We believe being transparent with customers, clients, employees, and every other stakeholder builds a strong value proposition.",
  },
  {
    title: "Integrity",
    icon: Award,
    body: "While staying transparent, we never compromise on integrity — in scope, in pricing, or in execution.",
  },
  {
    title: "Diversity & inclusion",
    icon: Users,
    body: "Diversity across our workforce, client composition, portfolio, and industry keeps us a sustainable consulting firm with a competitive edge.",
  },
  {
    title: "Achievement motivation",
    icon: Target,
    body: "We drive achievement-based motivation and inculcate an entrepreneurial spirit in everything we take on.",
  },
];

export default async function AboutPage() {
  const profile = await getCompanyProfile();
  return (
    <div className="marketing-site">
      <section className="border-b border-slate-200 bg-linear-to-b from-pink-50/70 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <p className="text-xs font-bold tracking-[.18em] text-pink-700 uppercase">
            About FirstMan
          </p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold tracking-[-.04em] text-balance text-slate-950 sm:text-6xl">
            Entrepreneurship, simplified.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">
            FirstMan Corporate Services is an arm of Technology &amp; Consulting company{" "}
            <span className="font-semibold text-slate-900">
              FirstMan Techno Enterprises Limited
            </span>
            , working with new-age entrepreneurs across {profile.areasServed} to realize their
            dreams — from incorporation through every obligation after it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Tabs defaultValue="about-us" className="gap-10">
          <TabsList variant="line" className="h-auto gap-6 border-b border-slate-200 pb-0">
            <TabsTrigger
              value="about-us"
              className="rounded-none px-1 pb-4 text-sm font-bold data-active:text-pink-700 group-data-[variant=line]/tabs-list:data-active:after:bg-pink-700"
            >
              About Us
            </TabsTrigger>
            <TabsTrigger
              value="firstman-way"
              className="rounded-none px-1 pb-4 text-sm font-bold data-active:text-pink-700 group-data-[variant=line]/tabs-list:data-active:after:bg-pink-700"
            >
              FirstMan Way
            </TabsTrigger>
            <TabsTrigger
              value="core-values"
              className="rounded-none px-1 pb-4 text-sm font-bold data-active:text-pink-700 group-data-[variant=line]/tabs-list:data-active:after:bg-pink-700"
            >
              Our Core Values
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about-us">
            <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
              <div className="rounded-3xl bg-slate-50 p-8">
                <Building2 className="size-7 text-pink-700" />
                <p className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                  One shop for every aspiring entrepreneur.
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Business consulting, incorporation, statutory registrations, licensing, and
                  scaling support — under one roof.
                </p>
              </div>
              <div className="space-y-5 text-base leading-7 text-slate-600">
                <p>
                  With the mission of{" "}
                  <span className="font-semibold text-slate-900">
                    “Entrepreneurship Simplified”
                  </span>
                  , we work with new-age entrepreneurs to help them realize their dreams. FirstMan
                  is a one-shop solution for all the needs of aspiring entrepreneurs. We specialize
                  in Business Consulting Services — incorporation, business operations, and all
                  statutory registrations and licensing needed to run a business and scale it beyond
                  MSME.
                </p>
                <p>
                  Alongside this, we provide Research and Analytics solutions that help
                  organisations thrive in a world of volatility, uncertainty, complexity, and
                  ambiguity.
                </p>
                <p>
                  FirstMan is striving hard to become one of the most innovative and customized
                  business solutions providers for every growing entrepreneur working to achieve
                  their dreams.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="firstman-way">
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              We undertake every assignment with commitment, striving to deliver professional,
              quality service in a short turnaround time. Our strong-minded professionals are
              committed to providing a quality experience to clients across the widest range of
              business solutions.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 p-6">
                <Target className="size-5 text-pink-700" />
                <h3 className="mt-4 text-lg font-bold text-slate-950">Mission</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  To provide a wide range of business solutions that meet the demands and
                  requirements of clients amid the dynamic changes in economics and market
                  scenarios.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 p-6">
                <Compass className="size-5 text-pink-700" />
                <h3 className="mt-4 text-lg font-bold text-slate-950">Vision</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  To be a global consulting firm for aspiring entrepreneurs across the world.
                </p>
              </article>
            </div>
          </TabsContent>

          <TabsContent value="core-values">
            <div className="grid gap-6 sm:grid-cols-2">
              {coreValues.map((value) => (
                <article key={value.title} className="rounded-2xl border border-slate-200 p-6">
                  <value.icon className="size-5 text-pink-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{value.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{value.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 flex items-start gap-2 text-sm leading-6 text-slate-500">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-pink-600" />
              Transparency, integrity, diversity, and achievement motivation guide every engagement
              we take on.
            </p>
          </TabsContent>
        </Tabs>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="rounded-3xl bg-slate-50 p-8 sm:flex sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Bring us the business goal.</h2>
            <p className="mt-2 text-slate-600">
              We’ll map the registrations, filings, and order of work.
            </p>
          </div>
          <Link
            href="/contact"
            className="mt-5 inline-flex h-11 items-center rounded-lg bg-pink-700 px-5 text-sm font-bold text-white hover:bg-pink-800 sm:mt-0"
          >
            Talk to an expert
          </Link>
        </div>
      </section>
    </div>
  );
}
