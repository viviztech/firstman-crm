import { CalendarClock, ClipboardCheck, Receipt, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const showcase = [
  {
    icon: UsersRound,
    title: "Enquiries",
    copy: "Track every lead from first contact to closed sale on one kanban board.",
  },
  {
    icon: ClipboardCheck,
    title: "Orders & tasks",
    copy: "Auto-generated checklists keep every engagement moving on schedule.",
  },
  {
    icon: CalendarClock,
    title: "Compliance calendar",
    copy: "Recurring filings roll forward automatically — nothing falls through.",
  },
  {
    icon: Receipt,
    title: "Invoicing",
    copy: "GST-ready invoices, payments and receivables in one place.",
  },
];

export function LoginBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-linear-to-br from-brand-deep via-[#341226] to-pink-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
      <div
        className="login-orbit-ring pointer-events-none absolute top-1/2 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div
        className="login-orbit-ring-reverse pointer-events-none absolute top-1/2 left-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-600/20 blur-3xl"
        aria-hidden="true"
      />

      <Link href="/" className="reveal relative flex items-center gap-3">
        <Image
          src="/brand/firstman-mark.png"
          alt="FirstMan"
          width={512}
          height={512}
          priority
          className="size-9 shrink-0 object-contain"
        />
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">FirstMan</p>
          <p className="text-[0.65rem] font-medium tracking-[0.18em] text-pink-200/80 uppercase">
            Corporate Services CRM
          </p>
        </div>
      </Link>

      <div className="reveal reveal-delay-1 relative max-w-md">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance text-white xl:text-4xl">
          One workspace for every enquiry, order and filing.
        </h1>
        <p className="mt-4 text-sm leading-6 text-pink-100/70">
          Sign in to pick up where your team left off.
        </p>
      </div>

      <div className="reveal reveal-delay-2 relative">
        <div className="relative h-[4.75rem]">
          {showcase.map(({ icon: Icon, title, copy }, index) => (
            <div
              key={title}
              data-i={index}
              className="login-showcase-slide absolute inset-0 flex items-start gap-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-pink-100 ring-1 ring-white/15">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm leading-5 text-pink-100/70">{copy}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="login-showcase-dots mt-5 flex gap-1.5">
          {showcase.map((item, index) => (
            <span
              key={item.title}
              data-i={index}
              className="login-showcase-dot h-1 flex-1 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
