import { ArrowLeftIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function SettingsPageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-white px-5 py-6 shadow-[0_18px_45px_-32px_rgba(107,28,64,0.35)] sm:px-7">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 sm:block"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(186 42 102 / 0.14) 1.5px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to left, black 5%, transparent 95%)",
        }}
      />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 text-white shadow-sm shadow-pink-200">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href="/settings"
              className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-800"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" /> Settings
            </Link>
            <h1 className="text-2xl font-bold tracking-[-0.035em] text-[#0b203a]">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
        {actions}
      </div>
    </section>
  );
}
