import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — FirstMan Corporate Services",
  robots: { index: false, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Draft — last updated {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm text-muted-foreground">
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Information we collect</h2>
          <p>
            When you submit an enquiry through this site, we collect your name, phone number, and
            optionally your email, city, and the service you're interested in. We do not collect
            this information through any other means without telling you.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">How we use it</h2>
          <p>
            We use your details to respond to your enquiry by phone, WhatsApp, or email, and to
            deliver the services you engage us for. We do not sell or rent your information to third
            parties.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">WhatsApp and email communication</h2>
          <p>
            By submitting an enquiry, you consent to receiving messages from us related to that
            enquiry over WhatsApp, email, and phone. You can ask us to stop these messages at any
            time by replying "STOP" or contacting us directly.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Data retention</h2>
          <p>
            We retain enquiry and client data for as long as needed to provide our services and meet
            our own regulatory and record-keeping obligations.
          </p>
        </section>
        <section>
          <h2 className="mb-1.5 font-semibold text-foreground">Your rights</h2>
          <p>
            You can ask us what information we hold about you, or ask us to correct or delete it, by
            reaching out through our contact page.
          </p>
        </section>
      </div>
    </div>
  );
}
