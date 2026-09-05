"use client";

import {
  ArrowRight,
  Building2,
  ChevronDown,
  FileCheck2,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { MEGA_MENU_CURATED_SLUGS } from "@/content/featured-services";
import type { PublicServiceVertical } from "@/services/marketing-catalog";

const iconByIndex = [Building2, FileCheck2, Landmark, Scale, ShieldCheck] as const;

export function ServicesMegaMenu({ catalog }: { catalog: PublicServiceVertical[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeIfOutside(event: MouseEvent) {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (!details.contains(event.target as Node)) details.open = false;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current) detailsRef.current.open = false;
    }

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function closePanel() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="group/mega static h-full">
      <summary className="flex h-full cursor-pointer list-none items-center gap-1.5 px-3 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 [&::-webkit-details-marker]:hidden">
        Services{" "}
        <ChevronDown className="size-3.5 transition-transform group-open/mega:rotate-180" />
      </summary>
      <div className="absolute inset-x-0 top-[104px] border-y border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_3fr] gap-10 px-8 py-8">
          <div className="rounded-2xl border border-pink-100 bg-pink-50 p-7">
            <p className="text-xs font-bold tracking-[0.18em] text-pink-700 uppercase">
              Full-service desk
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              From first filing to every deadline after.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Explore services by business need, with current pricing and document requirements.
            </p>
            <Link
              href="/services"
              onClick={closePanel}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-pink-700"
            >
              Browse all services <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-2 gap-x-8 gap-y-7 xl:grid-cols-3">
              {catalog.slice(0, 5).map((vertical, index) => {
                const Icon = iconByIndex[index] ?? FileCheck2;
                const allServices = vertical.categories.flatMap((category) => category.services);
                const curatedSlugs = MEGA_MENU_CURATED_SLUGS[vertical.name] ?? [];
                const curated = curatedSlugs
                  .map((slug) => allServices.find((service) => service.slug === slug))
                  .filter((service): service is (typeof allServices)[number] => Boolean(service));
                const services = curated.length ? curated : allServices.slice(0, 5);
                return (
                  <section key={vertical.id}>
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-pink-50 text-pink-700">
                        <Icon className="size-4" />
                      </span>
                      {vertical.name.replace(" Services", "")}
                    </div>
                    <ul className="space-y-2">
                      {services.map((service) => (
                        <li key={service.id}>
                          <Link
                            href={`/services/${service.slug}`}
                            onClick={closePanel}
                            className="text-sm text-slate-600 hover:text-pink-700"
                          >
                            {service.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              <section className="border-l border-slate-200 pl-7">
                <p className="text-sm font-bold text-slate-950">Not sure where to start?</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tell us your goal. We’ll map the filings, fees, and order of work.
                </p>
                <Link
                  href="/contact"
                  onClick={closePanel}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-pink-700"
                >
                  Get a recommendation <ArrowRight className="size-3.5" />
                </Link>
              </section>
            </div>
            <Link
              href="/services"
              onClick={closePanel}
              className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-950 hover:border-pink-300 hover:text-pink-700"
            >
              See all services <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </details>
  );
}
