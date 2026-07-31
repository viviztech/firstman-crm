import type { Metadata } from "next";
import Link from "next/link";
import { getCompanyProfile } from "@/services/company-profile";

export const metadata: Metadata = {
  title: "About — FirstMan Corporate Services",
  description:
    "FirstMan Corporate Services helps businesses in Tamil Nadu register, stay compliant, and grow — with transparent pricing and real-time updates.",
};

export default async function AboutPage() {
  const profile = await getCompanyProfile();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <span className="text-brand text-sm font-semibold uppercase tracking-wide">About us</span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Your first step, taken properly.
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        FirstMan Corporate Services handles the paperwork side of starting and running a business —
        company registration, GST, trademarks, licenses, and the annual filings that keep it all
        compliant — so founders can focus on the business itself.
      </p>
      <p className="mt-4 text-lg text-muted-foreground">
        We currently work with clients across {profile.areasServed}, and every engagement runs
        through the same internal process our own team uses to track filings, deadlines, and
        documents — nothing sits in an inbox waiting to be remembered.
      </p>

      <h2 className="mt-12 text-xl font-bold">How we work</h2>
      <dl className="mt-6 flex flex-col gap-6">
        <div>
          <dt className="font-semibold">Transparent pricing</dt>
          <dd className="mt-1 text-muted-foreground">
            Every price on this site is the price our team actually quotes — see the{" "}
            <Link href="/pricing" className="text-brand hover:underline">
              full pricing list
            </Link>
            .
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Real progress updates</dt>
          <dd className="mt-1 text-muted-foreground">
            You'll hear from us by WhatsApp and email as your filing moves — not just when it's
            done.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">One team, start to finish</dt>
          <dd className="mt-1 text-muted-foreground">
            The person who takes your details is on the same team that files your paperwork.
          </dd>
        </div>
      </dl>

      {profile.address || profile.gstin || profile.llpin ? (
        <>
          <h2 className="mt-12 text-xl font-bold">Registered office</h2>
          <dl className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground">
            <div>
              <dt className="font-semibold text-foreground">{profile.legalName || profile.name}</dt>
              {profile.address ? <dd className="mt-1">{profile.address}</dd> : null}
            </div>
            {profile.llpin ? (
              <div className="flex gap-2">
                <dt className="font-semibold text-foreground">LLPIN</dt>
                <dd>{profile.llpin}</dd>
              </div>
            ) : null}
            {profile.gstin ? (
              <div className="flex gap-2">
                <dt className="font-semibold text-foreground">GSTIN</dt>
                <dd>{profile.gstin}</dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : null}

      <div className="mt-12 rounded-xl border bg-muted/30 p-6">
        <h2 className="font-semibold">Ready to get started?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what you need and we'll get back to you — usually the same day.
        </p>
        <Link
          href="/contact"
          className="bg-brand text-brand-foreground hover:bg-brand/90 mt-4 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
