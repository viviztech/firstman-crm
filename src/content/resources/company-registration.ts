import { AUTHOR, type ResourceArticle } from "@/content/resources/types";

const PILLAR_SLUG = "company-registration-in-india";

export const COMPANY_REGISTRATION_ARTICLES: ResourceArticle[] = [
  {
    slug: PILLAR_SLUG,
    title: "Company Registration in India: The Complete Guide",
    description:
      "Everything you need to know about registering a business in India — structures, documents, cost, and timeline.",
    pillarSlug: PILLAR_SLUG,
    isPillar: true,
    publishedAt: "2026-06-02",
    updatedAt: "2026-07-15",
    author: AUTHOR,
    summary:
      "Registering a business in India means choosing a legal structure — Private Limited, LLP, OPC, Partnership, or Proprietorship — then filing the paperwork for that structure with the relevant government authority, typically taking anywhere from a few days to about two weeks.",
    sections: [
      {
        heading: 'What "company registration" actually covers',
        paragraphs: [
          '"Company registration" is often used loosely to mean starting any kind of registered business, but strictly speaking, only Private Limited Companies and One Person Companies are "companies" under the Companies Act, 2013. LLPs are registered under a separate law, and Proprietorships aren\'t registered as a distinct entity at all — they\'re identified through the licenses the business holds.',
          "The right starting point isn't the paperwork — it's picking the structure that matches how you plan to run and grow the business.",
        ],
      },
      {
        heading: "The main structures at a glance",
        bullets: [
          "Private Limited Company — separate legal entity, limited liability, the standard choice if you plan to raise funding.",
          "LLP — separate legal entity, limited liability, lighter compliance than a company, can't raise equity funding.",
          "One Person Company (OPC) — a company structure for a single founder, with a mandatory nominee.",
          "Partnership Firm — two or more partners, unlimited liability, simpler than an LLP but with less legal protection.",
          "Proprietorship — a single owner, no separate legal identity, the fastest way to start.",
        ],
      },
      {
        heading: "What you'll need before you start",
        paragraphs: [
          "Regardless of structure, you'll generally need identity and address proof for every director, partner, or owner, a registered office address with proof of ownership or a no-objection certificate from the owner, and — for companies and LLPs — a Digital Signature Certificate (DSC) and Director Identification Number (DIN) for each director or designated partner.",
        ],
      },
      {
        heading: "How long it takes and what it costs",
        paragraphs: [
          "Turnaround depends on the structure — a Proprietorship's registrations can often be done in a few days, while a full company incorporation through SPICe+ typically takes about two weeks once documents are in order. Costs split into professional fees (what we charge for the work) and government fees (fixed by the relevant authority) — see our pricing page for the current numbers for each structure.",
        ],
      },
      {
        heading: "After registration: what compliance looks like",
        paragraphs: [
          "Registration is the start, not the finish — companies and LLPs both have ongoing annual filing obligations that apply whether or not the business has any revenue. Skipping them leads to penalties and, eventually, the risk of the entity being struck off. Our annual compliance guide covers what's actually required, year to year.",
        ],
      },
    ],
    relatedServiceSlugs: [
      "pvt-ltd-registration",
      "llp-registration",
      "opc-registration",
      "proprietorship-registration",
    ],
    relatedArticleSlugs: [
      "documents-required-for-company-registration",
      "how-to-choose-a-business-structure",
      "cost-of-company-registration-in-india",
      "company-registration-process-timeline",
      "annual-compliance-guide",
    ],
  },
  {
    slug: "documents-required-for-company-registration",
    title: "Documents Required for Company Registration in India",
    description:
      "The exact identity, address, and office documents you'll need to register a Private Limited Company, LLP, or OPC.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-06-05",
    updatedAt: "2026-06-05",
    author: AUTHOR,
    summary:
      "Registering a company or LLP in India needs identity and address proof for each director or partner, a passport-size photo, a Digital Signature Certificate, and proof of the registered office address.",
    sections: [
      {
        heading: "For every director or partner",
        bullets: [
          "PAN card (mandatory for Indian nationals)",
          "Aadhaar card, passport, voter ID, or driving licence as identity proof",
          "A recent utility bill or bank statement as address proof (not older than 2 months)",
          "A passport-size photograph",
          "Passport, if any director is a foreign national",
        ],
      },
      {
        heading: "For the registered office",
        bullets: [
          "A recent utility bill or property tax receipt for the office address",
          "A No-Objection Certificate (NOC) from the property owner, if the office isn't owned by the company",
          "A rent agreement, if the premises are rented",
        ],
      },
      {
        heading: "Digital requirements",
        paragraphs: [
          "Every proposed director needs a Digital Signature Certificate (DSC) to sign incorporation forms electronically, and a Director Identification Number (DIN), which is typically applied for as part of the same incorporation filing rather than separately.",
        ],
      },
      {
        heading: "A note on accuracy",
        paragraphs: [
          "Mismatches between your PAN, Aadhaar, and address proof are the single most common cause of delay in incorporation filings — it's worth double-checking that names and addresses match exactly across documents before you submit.",
        ],
      },
    ],
    relatedServiceSlugs: ["pvt-ltd-registration", "llp-registration", "opc-registration"],
    relatedArticleSlugs: [PILLAR_SLUG, "company-registration-process-timeline"],
  },
  {
    slug: "how-to-choose-a-business-structure",
    title: "Private Limited, LLP, OPC, or Proprietorship: How to Choose",
    description:
      "A decision framework for picking a business structure in India, based on funding plans, team size, and compliance appetite.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-06-10",
    updatedAt: "2026-06-10",
    author: AUTHOR,
    summary:
      "Choosing a business structure mostly comes down to three questions: are you starting alone or with others, do you plan to raise outside funding, and how much annual compliance are you willing to take on.",
    sections: [
      {
        heading: "Start with three questions",
        bullets: [
          "Are you starting alone, or with co-founders? A solo founder can choose a Proprietorship or an OPC; two or more owners rules out both.",
          "Do you plan to raise equity funding? If yes, Private Limited is close to the only real option — LLPs and Proprietorships can't issue shares.",
          "How much compliance can you realistically keep up with? A Proprietorship has almost none; a Private Limited Company has the most, regardless of revenue.",
        ],
      },
      {
        heading: "Common paths",
        paragraphs: [
          "Solo founder testing an idea, no funding plans: Proprietorship, converting later if the business takes off.",
          "Solo founder who wants a company from day one: OPC.",
          "Two or more founders, professional services, no funding plans: LLP.",
          "Startup planning to raise from investors: Private Limited Company, from day one if possible.",
        ],
      },
      {
        heading: "Read the detailed comparisons",
        paragraphs: [
          "For a side-by-side breakdown of liability, compliance, and cost, see our Private Limited vs LLP, LLP vs OPC, and Proprietorship vs Private Limited comparison pages.",
        ],
      },
    ],
    relatedServiceSlugs: [
      "pvt-ltd-registration",
      "llp-registration",
      "opc-registration",
      "proprietorship-registration",
    ],
    relatedArticleSlugs: [PILLAR_SLUG],
  },
  {
    slug: "cost-of-company-registration-in-india",
    title: "How Much Does Company Registration Cost in India?",
    description:
      "A breakdown of professional fees, government fees, and ongoing costs for registering a business in India.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-06-18",
    updatedAt: "2026-06-18",
    author: AUTHOR,
    summary:
      "Company registration cost has two parts — a professional fee for the work of preparing and filing your incorporation, and a government fee set by the relevant authority — and the total varies by structure, authorized capital, and state.",
    sections: [
      {
        heading: "Professional fees vs government fees",
        paragraphs: [
          "The professional fee covers document preparation, filing, and follow-up with the registrar — this is what we charge, and it's fixed and published on our pricing page. The government fee is set by the Ministry of Corporate Affairs (or the relevant state authority) and varies by structure and, for companies, by authorized share capital and the state of registration.",
        ],
      },
      {
        heading: "What's usually excluded from a headline price",
        bullets: [
          "Stamp duty, which varies significantly by state",
          "DSC costs, if not already included",
          "Any add-on registrations you need alongside incorporation, like GST or Udyam",
        ],
      },
      {
        heading: "Ongoing costs after registration",
        paragraphs: [
          "Registration is a one-time cost, but running a Private Limited Company or LLP has recurring compliance costs every year — statutory audit, annual filings, and (for companies) accounting support. Our annual compliance guide breaks down what that typically involves.",
        ],
      },
      {
        heading: "See current pricing",
        paragraphs: [
          "Our pricing page lists the current starting price for every service, professional fee and government fee shown separately, so there's no guessing before you talk to us.",
        ],
      },
    ],
    relatedServiceSlugs: ["pvt-ltd-registration", "llp-registration"],
    relatedArticleSlugs: [PILLAR_SLUG, "annual-compliance-guide"],
  },
  {
    slug: "company-registration-process-timeline",
    title: "Company Registration Process: A Step-by-Step Timeline",
    description:
      "The actual sequence of steps to incorporate a company in India, from Digital Signature Certificate to your first GST registration.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-06-25",
    updatedAt: "2026-06-25",
    author: AUTHOR,
    summary:
      "Company incorporation in India runs through Digital Signature Certificate issuance, name reservation, filing SPICe+ with the registrar, and receiving your Certificate of Incorporation — typically about two weeks end to end once your documents are ready.",
    sections: [
      {
        heading: "The typical sequence",
        bullets: [
          "Digital Signature Certificate (DSC) — issued for each proposed director, usually within a day or two.",
          "Name reservation — proposed company names are checked for availability and filed via SPICe+ Part A.",
          "SPICe+ filing — the main incorporation form, covering company details, director appointments, PAN and TAN application, and MOA/AOA drafting in one filing.",
          "Certificate of Incorporation — issued by the Registrar of Companies once the filing is approved, along with your Corporate Identification Number (CIN).",
          "PAN and TAN — issued alongside incorporation as part of the same SPICe+ process.",
          "Bank account — opened using the Certificate of Incorporation and PAN.",
          "GST registration (if applicable) — a separate filing, needed once you cross the turnover threshold or if your business model requires it regardless of turnover.",
        ],
      },
      {
        heading: "What slows this down",
        paragraphs: [
          "The single biggest source of delay is document mismatches — a name spelled differently across PAN and Aadhaar, or an address proof that doesn't match what's declared. The second is name reservation rejections, which happen when a proposed name is too similar to an existing company or trademark.",
        ],
      },
    ],
    relatedServiceSlugs: ["pvt-ltd-registration"],
    relatedArticleSlugs: [PILLAR_SLUG, "documents-required-for-company-registration"],
  },
];
