"use client";

import { ArrowRight, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { PublicServiceVertical } from "@/services/marketing-catalog";

const SECONDARY_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Insights" },
  { href: "/about", label: "About" },
];

export function MobileNav({ catalog }: { catalog: PublicServiceVertical[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="group/mobile ml-auto lg:hidden">
      <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-800 [&::-webkit-details-marker]:hidden">
        <Menu className="size-5" />
      </summary>
      <div className="absolute inset-x-0 top-[104px] max-h-[calc(100vh-104px)] overflow-y-auto border-b bg-white p-4 shadow-xl">
        <details className="rounded-xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold [&::-webkit-details-marker]:hidden">
            Services <ChevronDown className="size-4" />
          </summary>
          <div className="space-y-5 border-t p-4">
            {catalog.map((vertical) => (
              <section key={vertical.id}>
                <p className="text-xs font-bold tracking-wide text-pink-700 uppercase">
                  {vertical.name}
                </p>
                <div className="mt-2 grid gap-2">
                  {vertical.categories
                    .flatMap((category) => category.services)
                    .slice(0, 6)
                    .map((service) => (
                      <Link
                        key={service.id}
                        href={`/services/${service.slug}`}
                        onClick={closeMenu}
                        className="text-sm text-slate-700"
                      >
                        {service.name}
                      </Link>
                    ))}
                </div>
              </section>
            ))}
            <Link
              href="/services"
              onClick={closeMenu}
              className="inline-flex items-center gap-2 text-sm font-bold text-pink-700"
            >
              View all services <ArrowRight className="size-4" />
            </Link>
          </div>
        </details>
        <nav className="mt-3 grid gap-1">
          {SECONDARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="rounded-lg px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={closeMenu}
            className="mt-2 rounded-lg bg-pink-700 px-4 py-3 text-center font-semibold text-white"
          >
            Talk to an expert
          </Link>
        </nav>
      </div>
    </details>
  );
}
