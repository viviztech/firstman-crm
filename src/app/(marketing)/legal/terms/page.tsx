import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Draft — last updated {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Our services</h2>
          <p>
            FirstMan Corporate Services provides company registration, tax, compliance, and related
            advisory services as described on this site. The exact scope, fees, and timeline for any
            engagement are confirmed directly with you before work begins.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Pricing and government fees</h2>
          <p>
            Prices shown on this site reflect our professional fees and typical government fees at
            the time of publishing. Government fees are set by the relevant authority and may change
            without notice — we'll confirm the current amount before starting your filing.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Timelines</h2>
          <p>
            Turnaround times shown on this site are typical estimates, not guarantees — actual
            timelines depend on government processing times and how quickly you're able to provide
            the documents we need.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Your responsibilities</h2>
          <p>
            You're responsible for providing accurate information and genuine documents. We're not
            liable for delays or rejections caused by inaccurate information you've provided.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Governing law</h2>
          <p>These terms are governed by the laws of India.</p>
        </section>
      </div>
    </div>
  );
}
