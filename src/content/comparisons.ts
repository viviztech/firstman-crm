export type ComparisonAttribute = {
  label: string;
  valueA: string;
  valueB: string;
};

export type ComparisonFaq = {
  question: string;
  answer: string;
};

export type Comparison = {
  slug: string;
  title: string;
  description: string;
  entityA: { name: string; serviceSlug: string };
  entityB: { name: string; serviceSlug: string };
  /** Answer-first paragraph for AEO/GEO extractability — the direct answer before any detail. */
  summary: string;
  attributes: ComparisonAttribute[];
  verdict: { forA: string; forB: string };
  faqs: ComparisonFaq[];
};

export const COMPARISONS: Comparison[] = [
  {
    slug: "private-limited-vs-llp",
    title: "Private Limited vs LLP",
    description:
      "Private Limited Company and LLP compared on liability, compliance, funding, and cost — which one fits your business.",
    entityA: { name: "Private Limited Company", serviceSlug: "pvt-ltd-registration" },
    entityB: { name: "LLP", serviceSlug: "llp-registration" },
    summary:
      "A Private Limited Company suits businesses planning to raise equity funding or issue ESOPs, while an LLP suits businesses that want limited liability with a lighter, cheaper compliance load and no plans to raise venture capital.",
    attributes: [
      {
        label: "Governing law",
        valueA: "Companies Act, 2013",
        valueB: "LLP Act, 2008",
      },
      {
        label: "Minimum owners",
        valueA: "2 directors, 2 shareholders (can be the same people)",
        valueB: "2 designated partners",
      },
      {
        label: "Liability",
        valueA: "Limited to shares held",
        valueB: "Limited to agreed contribution",
      },
      {
        label: "Can raise equity funding / issue shares",
        valueA: "Yes — the standard structure for VC-backed startups",
        valueB: "No — LLPs cannot issue shares",
      },
      {
        label: "ESOPs for employees",
        valueA: "Yes",
        valueB: "Not in the conventional sense",
      },
      {
        label: "Annual compliance burden",
        valueA:
          "Higher — statutory audit required regardless of turnover, board meetings, ROC filings",
        valueB: "Lighter — audit only required past certain turnover/contribution thresholds",
      },
      {
        label: "Typical annual filings",
        valueA: "AOC-4, MGT-7, ITR, board resolutions",
        valueB: "Form 8, Form 11, ITR",
      },
      {
        label: "Best suited for",
        valueA: "Startups seeking investment, businesses planning to scale fast",
        valueB:
          "Professional services, family businesses, founders bootstrapping without external funding",
      },
    ],
    verdict: {
      forA: "Choose Private Limited if you plan to raise funding from investors, offer ESOPs, or need the credibility that comes with the most recognized startup structure in India.",
      forB: "Choose an LLP if you want limited liability without the compliance overhead of a company, and you're not planning to raise equity capital.",
    },
    faqs: [
      {
        question: "Can an LLP be converted to a Private Limited Company later?",
        answer:
          "Yes. It's a well-established process if your LLP later needs to raise equity funding — but it takes time and paperwork, so it's worth thinking through your funding plans before you register.",
      },
      {
        question: "Which is cheaper to maintain — Private Limited or LLP?",
        answer:
          "An LLP is generally cheaper to run year to year, since it isn't required to appoint a statutory auditor unless it crosses certain turnover or contribution thresholds, unlike a Private Limited Company which must be audited annually regardless of size.",
      },
      {
        question: "Do both structures give limited liability protection?",
        answer:
          "Yes — in both a Private Limited Company and an LLP, owners are personally liable only up to their investment or agreed contribution, not for the business's debts beyond that.",
      },
    ],
  },
  {
    slug: "llp-vs-opc",
    title: "LLP vs One Person Company (OPC)",
    description:
      "LLP and OPC compared for solo founders and small teams — ownership, liability, and compliance differences.",
    entityA: { name: "LLP", serviceSlug: "llp-registration" },
    entityB: { name: "One Person Company (OPC)", serviceSlug: "opc-registration" },
    summary:
      "An LLP needs at least two partners, while an OPC lets a single founder own the entire company with limited liability — the right choice mostly comes down to whether you have a co-founder.",
    attributes: [
      {
        label: "Governing law",
        valueA: "LLP Act, 2008",
        valueB: "Companies Act, 2013",
      },
      {
        label: "Minimum owners",
        valueA: "2 designated partners",
        valueB: "1 (plus a mandatory nominee)",
      },
      {
        label: "Liability",
        valueA: "Limited to agreed contribution",
        valueB: "Limited to shares held",
      },
      {
        label: "Ownership structure",
        valueA: "Shared between partners per the LLP agreement",
        valueB: "Single shareholder — full control stays with one person",
      },
      {
        label: "Can add more owners later",
        valueA: "Yes, by admitting new partners",
        valueB: "Requires conversion to a Private Limited Company",
      },
      {
        label: "Annual compliance burden",
        valueA: "Lighter — Form 8, Form 11, audit only past certain thresholds",
        valueB: "Similar to a Private Limited Company — annual filings and statutory audit",
      },
      {
        label: "Best suited for",
        valueA: "Two or more founders running a professional or services business",
        valueB:
          "A solo founder who wants a company structure (not a proprietorship) without a co-founder",
      },
    ],
    verdict: {
      forA: "Choose an LLP if there are two or more of you starting the business together and you want a lighter compliance load than a company.",
      forB: "Choose an OPC if you're starting alone but want the credibility and continuity of a company structure rather than a proprietorship.",
    },
    faqs: [
      {
        question: "Can I start an OPC and add a partner later?",
        answer:
          "An OPC is designed for single ownership — bringing in a co-owner means converting to a Private Limited Company, which is a separate process. If you already know you'll have a co-founder, it's usually simpler to register an LLP or Private Limited Company from the start.",
      },
      {
        question: "Does an OPC need a nominee?",
        answer:
          "Yes — every OPC must name a nominee who would take over the company if the sole owner is unable to continue. This is a mandatory part of OPC registration.",
      },
      {
        question: "Is an OPC's compliance load closer to an LLP or a Private Limited Company?",
        answer:
          "Closer to a Private Limited Company — an OPC files annual returns and requires a statutory audit in a similar way, which is heavier than a typical LLP's compliance load.",
      },
    ],
  },
  {
    slug: "proprietorship-vs-private-limited",
    title: "Proprietorship vs Private Limited Company",
    description:
      "Sole Proprietorship and Private Limited Company compared — liability, credibility, and how quickly you can start.",
    entityA: { name: "Sole Proprietorship", serviceSlug: "proprietorship-registration" },
    entityB: { name: "Private Limited Company", serviceSlug: "pvt-ltd-registration" },
    summary:
      "A Proprietorship is the fastest and cheapest way to start, with no liability protection, while a Private Limited Company takes longer to set up but separates your personal assets from the business and is what most investors expect to see.",
    attributes: [
      {
        label: "Separate legal entity",
        valueA: "No — the business and owner are legally the same",
        valueB: "Yes — the company exists independently of its owners",
      },
      {
        label: "Liability",
        valueA: "Unlimited — personal assets are at risk for business debts",
        valueB: "Limited to shares held",
      },
      {
        label: "Setup time",
        valueA: "Fastest — often just the registrations the business needs (e.g. GST, Udyam)",
        valueB: "Longer — full incorporation via SPICe+",
      },
      {
        label: "Ongoing compliance",
        valueA: "Minimal — mainly the owner's personal income tax return",
        valueB: "Higher — statutory audit, board meetings, annual ROC filings",
      },
      {
        label: "Can raise equity funding",
        valueA: "No",
        valueB: "Yes",
      },
      {
        label: "Continuity",
        valueA: "Ends with the proprietor",
        valueB: "Perpetual succession — continues independently of any one owner",
      },
      {
        label: "Best suited for",
        valueA: "Small, owner-run businesses testing an idea with minimal overhead",
        valueB: "Businesses planning to grow, hire, raise funding, or bring in partners",
      },
    ],
    verdict: {
      forA: "Choose a Proprietorship if you want to start quickly with minimal cost and compliance, and you're comfortable with unlimited personal liability.",
      forB: "Choose Private Limited if you want to protect your personal assets, plan to raise funding, or need the credibility of a registered company with clients and investors.",
    },
    faqs: [
      {
        question: "Can a Proprietorship be converted to a Private Limited Company later?",
        answer:
          "Yes, and it's a common path — many founders start as a Proprietorship to validate an idea, then convert once the business needs liability protection or outside funding.",
      },
      {
        question: "Do I need to register a Proprietorship?",
        answer:
          "There's no single incorporation certificate the way there is for a company — a Proprietorship typically registers through the licenses the business needs to operate, such as GST or Udyam (MSME) registration.",
      },
      {
        question: "Is my personal property at risk with a Proprietorship?",
        answer:
          "Yes. Because a Proprietorship isn't a separate legal entity, the owner is personally liable for business debts — this is the main trade-off against Private Limited's limited liability protection.",
      },
    ],
  },
];

export function getComparisonBySlug(slug: string): Comparison | undefined {
  return COMPARISONS.find((comparison) => comparison.slug === slug);
}
