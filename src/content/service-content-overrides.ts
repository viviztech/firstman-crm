import type { ServicePageContent } from "@/content/service-content";

/**
 * Keys for the override-driven sections rendered between "What you receive" and the FAQ.
 * Order defaults to DEFAULT_EXTRA_SECTION_ORDER; a page can supply its own extraSectionOrder
 * to render them in a different sequence without affecting other pages sharing the template.
 */
export type ExtraSectionKey =
  | "avoidResubmission"
  | "afterIncorporation"
  | "decisionFramework"
  | "localNote"
  | "scope"
  | "tco";

export const DEFAULT_EXTRA_SECTION_ORDER: ExtraSectionKey[] = [
  "avoidResubmission",
  "afterIncorporation",
  "decisionFramework",
  "localNote",
  "scope",
  "tco",
];

/**
 * Per-slug replacements for the generic classifier in service-content.ts, plus extra
 * page sections the shared /services/[slug] template doesn't render by default.
 * Only populate a slug here when the generic template is genuinely too thin for it —
 * most of the catalog should stay on the shared generator.
 */
export type ServiceContentOverride = {
  base?: Partial<
    Pick<
      ServicePageContent,
      "eyebrow" | "summary" | "idealFor" | "outcomes" | "includes" | "process"
    >
  >;
  heroNote?: string;
  decisionFramework?: {
    heading: string;
    intro: string;
    chooseInstead: { structure: string; when: string; href: string }[];
  };
  structureComparison?: {
    columns: string[];
    rows: { factor: string; values: string[] }[];
  };
  documentGroups?: { title: string; note?: string; items: string[] }[];
  /** Defaults to "Documents required for incorporation." — override for a non-incorporation filing. */
  documentGroupsHeading?: string;
  documentGroupsSubtext?: string;
  timeline?: { day: string; milestone: string }[];
  costBreakdown?: {
    intro: string;
    rows: { item: string; when: string; range: string; includedInFee: string }[];
    note: string;
  };
  rejectionReasons?: { reason: string; detail: string }[];
  /** Default kicker/heading assume an MCA incorporation filing ("SPICe+", "resubmission") —
   *  override both for services where "rejection" or "clarification query" fits the department's
   *  actual vocabulary better (e.g. GST REG-03, FSSAI FoSCoS). */
  rejectionReasonsKicker?: string;
  rejectionReasonsHeading?: string;
  complianceCalendar?: { milestone: string; dueBy: string; penalty: string }[];
  /** Default kicker/heading ("After incorporation" / "Your first 12 months of compliance.")
   *  assume a freshly incorporated company — override for a standalone registration/license. */
  complianceKicker?: string;
  complianceHeading?: string;
  localNote?: { heading: string; body: string };
  scopeTable?: { included: string[]; excluded: string[] };
  scopeIntro?: string;
  faqs?: { question: string; answer: string }[];
  lastUpdated?: string;
  metaTitle?: string;
  metaDescription?: string;
  extraSectionOrder?: ExtraSectionKey[];
};

export const SERVICE_CONTENT_OVERRIDES: Record<string, ServiceContentOverride> = {
  "pvt-ltd-registration": {
    base: {
      eyebrow: "Private Limited Company Registration",
      summary:
        "Private limited company registration is the process of incorporating a company under Section 2(68) of the Companies Act, 2013, through the MCA's SPICe+ form. It needs 2 directors, 2 shareholders, and one resident director, with no minimum paid-up capital. FirstMan's professional fee starts at {{FEE}}, with government fees, DSC, and stamp duty billed separately.",
      idealFor: [
        "Founders raising equity funding, issuing ESOPs, or bringing in co-founders as shareholders",
        "Businesses bidding for enterprise or government contracts that expect a registered company",
        "Teams that want the credibility and limited liability of a Pvt Ltd structure from day one",
      ],
      outcomes: [
        "Name approval from the Registrar of Companies",
        "Digital Signature Certificate (DSC) for directors",
        "Director Identification Number (DIN)",
        "Certificate of Incorporation",
        "MoA (Memorandum of Association) and AoA (Articles of Association)",
        "Company PAN",
        "Company TAN",
      ],
      includes: [
        "Name availability and trademark-conflict check before filing",
        "SPICe+ Part A and Part B filing with e-MoA/e-AoA drafting",
        "AGILE-PRO-S filing for PAN, TAN, EPFO, and ESIC",
        "DIN application for up to 2 directors",
        "WhatsApp progress updates through the filing",
      ],
      process: [
        {
          title: "Digital Signature Certificate",
          body: "Every proposed director applies for a Class III DSC to sign incorporation forms electronically.",
        },
        {
          title: "Name reservation (SPICe+ Part A)",
          body: "Up to two proposed names are checked against the existing company register and live trademarks before filing.",
        },
        {
          title: "SPICe+ Part B and AGILE-PRO-S",
          body: "The main incorporation form, bundled with e-MoA/e-AoA, plus the linked application for PAN, TAN, EPFO, and ESIC.",
        },
        {
          title: "Certificate of Incorporation",
          body: "Once the Registrar of Companies approves the filing, MCA issues the Certificate of Incorporation with your CIN, PAN, and TAN.",
        },
      ],
    },
    heroNote:
      "The {{FEE}} professional fee excludes government fees, DSC charges, and stamp duty on the MoA/AoA. Figures on this page use Tamil Nadu's stamp duty schedule; other states set their own rates and may vary.",
    decisionFramework: {
      heading: "Who should, and should not, register a Private Limited Company.",
      intro:
        "Register a Private Limited Company if you plan to raise funding, issue ESOPs, or add shareholders. Consider LLP, OPC, or a proprietorship instead if you don't need equity fundraising or want a lighter compliance load.",
      chooseInstead: [
        {
          structure: "LLP",
          when: "you and your partners want limited liability but not equity fundraising, and prefer lower annual compliance costs.",
          href: "/services/llp-registration",
        },
        {
          structure: "One Person Company",
          when: "you're a solo founder who wants the Pvt Ltd credibility signal without a second shareholder.",
          href: "/services/opc-registration",
        },
        {
          structure: "Sole proprietorship",
          when: "you need to start invoicing immediately and your personal liability exposure is low.",
          href: "/services/proprietorship-registration",
        },
      ],
    },
    structureComparison: {
      columns: ["Private Limited", "LLP", "OPC", "Proprietorship"],
      rows: [
        {
          factor: "Liability",
          values: [
            "Limited to shares held",
            "Limited to capital contribution",
            "Limited to shares held",
            "Unlimited, personal",
          ],
        },
        {
          factor: "Equity fundraising",
          values: [
            "Straightforward",
            "Not designed for equity investors",
            "Not possible while structured as OPC",
            "Not possible",
          ],
        },
        {
          factor: "Compliance load",
          values: [
            "Highest: audit, AOC-4, MGT-7, ADT-1",
            "Moderate: Form 8, Form 11",
            "Similar to Pvt Ltd, fewer members",
            "Lowest: ITR only",
          ],
        },
        {
          factor: "Minimum owners",
          values: ["2 shareholders, 2 directors", "2 partners", "1 member, 1 nominee", "1"],
        },
        {
          factor: "Investor/lender credibility",
          values: ["Highest", "Moderate", "Moderate", "Lowest"],
        },
      ],
    },
    documentGroups: [
      {
        title: "Indian directors and shareholders",
        note: "Address proof must not be older than 2 months. This is the single most common rejection trigger.",
        items: [
          "PAN card, with name matching Aadhaar exactly",
          "Aadhaar card, used for DSC and DIN application",
          "Recent passport-size photograph",
          "Address proof: bank statement, electricity, or mobile bill (within 2 months)",
          "Identity proof: voter ID, driving licence, or passport",
        ],
      },
      {
        title: "Registered office",
        items: [
          "Utility bill: electricity, water, or gas (within 2 months)",
          "Rent agreement or sale deed",
          "No Objection Certificate from the property owner, mandatory when rented or family-owned",
        ],
      },
      {
        title: "Foreign nationals and NRIs",
        note: "Apostille or notarisation requirements depend on the director's country of residence under the Hague Convention. Foreign shareholding also triggers FEMA/FDI reporting.",
        items: [
          "Passport, apostilled or notarised as applicable",
          "Overseas address proof, apostilled/notarised and translated if not in English",
        ],
      },
    ],
    timeline: [
      { day: "Day 1-2", milestone: "Documents collected; DSC applied and issued" },
      { day: "Day 2-3", milestone: "Name reservation filed via SPICe+ Part A" },
      { day: "Day 3-5", milestone: "SPICe+ Part B and AGILE-PRO-S drafted, reviewed, and filed" },
      { day: "Day 5-7", milestone: "ROC processes the filing; any resubmission addressed" },
      { day: "Day 7", milestone: "Certificate of Incorporation, PAN, and TAN issued" },
    ],
    costBreakdown: {
      intro:
        "Incorporation is only the first cost. A realistic year-one budget includes the professional fee, DSC, stamp duty, and MCA fee at setup, then a recurring layer of auditor fees, ROC filings, DIR-3 KYC, and income tax filing. Expect a realistic all-in range of roughly ₹25,000 to ₹45,000 for the full first year, not the {{FEE}} headline figure alone.",
      rows: [
        {
          item: "Professional fee (incorporation)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Digital Signature Certificates (2 directors)",
          when: "At filing",
          range: "₹1,500 – ₹3,000",
          includedInFee: "No, at cost",
        },
        {
          item: "Stamp duty on MoA/AoA",
          when: "At filing",
          range: "Varies by state",
          includedInFee: "No, statutory",
        },
        {
          item: "MCA/ROC incorporation fee",
          when: "At filing",
          range: "Based on authorised capital",
          includedInFee: "No, statutory",
        },
        {
          item: "First auditor appointment",
          when: "Within 30 days",
          range: "₹5,000 – ₹15,000",
          includedInFee: "No",
        },
        {
          item: "INC-20A filing",
          when: "Within 180 days",
          range: "₹1,500 – ₹3,000",
          includedInFee: "No",
        },
        {
          item: "AOC-4 + MGT-7 (annual filing)",
          when: "Within 30/60 days of AGM",
          range: "₹5,000 – ₹12,000",
          includedInFee: "No",
        },
        {
          item: "DIR-3 KYC (per director)",
          when: "By 30 September",
          range: "₹500 – ₹1,000",
          includedInFee: "No",
        },
        {
          item: "ITR filing (company)",
          when: "Annual",
          range: "₹3,000 – ₹8,000",
          includedInFee: "No",
        },
        {
          item: "Basic bookkeeping",
          when: "Monthly/quarterly",
          range: "₹3,000 – ₹8,000/month",
          includedInFee: "No",
        },
      ],
      note: "The {{FEE}} professional fee covers incorporation only. Everything from the first auditor appointment onward is a separate, clearly quoted engagement.",
    },
    rejectionReasons: [
      {
        reason: "Name or trademark conflict",
        detail:
          "MCA checks proposed names against the company register and the trademark database. We run this check before filing.",
      },
      {
        reason: "Address proof older than 2 months",
        detail:
          "The single most common clerical rejection. We date-check every document before submission.",
      },
      {
        reason: "PAN–Aadhaar name mismatch",
        detail:
          "Even a missing middle initial triggers a flag. We cross-verify both documents before filing.",
      },
      {
        reason: "Wrong NIC code",
        detail:
          "An incorrect National Industrial Classification code for your business activity can trigger a Registrar query. We map your activity to the correct code upfront.",
      },
      {
        reason: "Missing NOC",
        detail:
          "Rented or family-owned premises need a signed No Objection Certificate, collected before a query is raised.",
      },
      {
        reason: "Expired DSC",
        detail:
          "A DSC that lapses mid-process stalls the filing. We track validity windows against your filing timeline.",
      },
      {
        reason: "Authorised vs paid-up capital confusion",
        detail:
          "Authorised capital sets your MCA fee slab; paid-up capital is what shareholders actually pay in. We confirm both figures with you in writing before filing.",
      },
    ],
    complianceCalendar: [
      {
        milestone: "First board meeting",
        dueBy: "Within 30 days of incorporation",
        penalty: "Compoundable offence under Section 173",
      },
      {
        milestone: "First auditor appointment",
        dueBy: "Within 30 days of incorporation",
        penalty: "Fine on the company and officers in default",
      },
      {
        milestone: "INC-20A: Commencement of business",
        dueBy: "Within 180 days of incorporation",
        penalty: "₹50,000 fine on the company; ₹1,000/day on officers in default",
      },
      {
        milestone: "DIR-3 KYC (each director)",
        dueBy: "30 September every year",
        penalty: "₹5,000 late fee per director; DIN marked deactivated",
      },
      {
        milestone: "AOC-4: Financial statements",
        dueBy: "Within 30 days of AGM",
        penalty: "₹100/day additional fee, uncapped",
      },
      {
        milestone: "MGT-7/MGT-7A: Annual return",
        dueBy: "Within 60 days of AGM",
        penalty: "₹100/day additional fee, uncapped",
      },
      {
        milestone: "ADT-1: Auditor appointment intimation",
        dueBy: "Within 15 days of AGM",
        penalty: "Late filing fee under statutory rules",
      },
      {
        milestone: "ITR filing",
        dueBy:
          "31 October for companies requiring audit (confirm the date for the applicable year)",
        penalty: "Interest under Section 234A/B/C; loss of carry-forward benefits",
      },
    ],
    scopeIntro:
      "Stamp duty on the MoA and AoA differs state by state, so what you pay depends on where your registered office is; the figures on this page use Tamil Nadu's schedule. RoC Chennai processes filings for companies registered with a Tamil Nadu address, and founders who prefer to hand over physical documents rather than scan and upload them can do so at our Anna Nagar West office before we file.",
    scopeTable: {
      included: [
        "Name availability check and reservation (SPICe+ Part A)",
        "SPICe+ Part B filing with e-MoA and e-AoA drafting",
        "AGILE-PRO-S filing (PAN, TAN, EPFO, ESIC application)",
        "DIN application for up to 2 directors",
        "Certificate of Incorporation delivery",
        "Resubmission handling for filing-stage queries",
        "WhatsApp progress updates through the filing",
        "Dedicated case owner as single point of contact",
      ],
      excluded: [
        "Government/MCA incorporation fee (varies by authorised capital)",
        "Stamp duty on MoA/AoA (state-specific)",
        "Digital Signature Certificates for directors",
        "Notarisation/apostille for foreign director documents",
        "First auditor appointment",
        "INC-20A filing (available as a follow-on engagement)",
        "Annual ROC compliance",
        "Bookkeeping, GST registration, or trademark filing",
      ],
    },
    faqs: [
      {
        question:
          "What is the real, total cost of registering a Private Limited Company, not just the professional fee?",
        answer:
          "Budget ₹25,000 to ₹45,000 for the full first year, not {{FEE}} alone. That figure covers the professional fee, DSC, stamp duty, MCA fee, first auditor appointment, INC-20A, annual ROC filings, DIR-3 KYC, and ITR filing.",
      },
      {
        question: "Are there hidden charges on top of the {{FEE}} professional fee?",
        answer:
          "No charges are hidden, but several are genuinely separate and statutory: DSC, stamp duty, and the MCA incorporation fee are billed at actual cost because they vary by authorised capital and state. Every cost is listed before you pay.",
      },
      {
        question: "What happens if my proposed company name gets rejected?",
        answer:
          "MCA allows a second name attempt within the same SPICe+ Part A filing at no extra government fee. If both names are rejected, a fresh Part A filing is required, adding a small government fee and 2 to 3 days.",
      },
      {
        question: "Does FirstMan offer a refund if the registration doesn't go through?",
        answer:
          "Talk to your case owner about our refund policy for the specific reason a filing didn't proceed. It differs depending on whether the cause was an MCA rejection or a change on your side.",
      },
      {
        question: "Can I use my home or a residential address as the registered office?",
        answer:
          "Yes. MCA does not require a commercial address. A residential address works with valid ownership or rental proof not older than 2 months, and an NOC from the owner if it isn't in the director's own name.",
      },
      {
        question: "What if I don't file INC-20A within 180 days?",
        answer:
          "The company cannot legally commence business or borrow money until INC-20A is filed. Missing the 180-day deadline attracts a ₹50,000 fine on the company and ₹1,000 per day on every officer in default.",
      },
      {
        question: "Do I need GST registration immediately after incorporating?",
        answer:
          "Not immediately, unless you cross the GST turnover threshold, sell across state lines, or sell on e-commerce platforms, all of which require registration regardless of turnover.",
      },
      {
        question: "Can I convert my Private Limited Company to an LLP later?",
        answer:
          "Yes, conversion is legally permitted, but it is a formal MCA process with its own eligibility conditions, generally more involved than converting an LLP to a Pvt Ltd. Talk to us before assuming it's a simple downgrade path.",
      },
      {
        question: "How long does Pvt Ltd registration actually take?",
        answer:
          "Typically 7 business days from complete document submission to Certificate of Incorporation. Name conflicts or address-proof issues can extend this by 3 to 10 days.",
      },
      {
        question: "Do I need a minimum capital to start a Private Limited Company?",
        answer:
          "No. The Companies (Amendment) Act, 2015 removed the minimum paid-up capital requirement. Your authorised capital figure still determines your MCA incorporation fee slab.",
      },
      {
        question: "Can both directors also be the only two shareholders?",
        answer:
          "Yes. The same two people can hold both roles, since the minimum requirement is 2 directors and 2 shareholders, not 4 distinct individuals.",
      },
      {
        question: "What is the difference between DIN and DSC?",
        answer:
          "A DSC lets a director sign e-forms electronically. A DIN is a unique identifier assigned to every director, applied for through the SPICe+ form itself.",
      },
      {
        question: "Can a foreign national be a director in an Indian Private Limited Company?",
        answer:
          "Yes, but at least one director must be a resident Indian who stayed in India for 182+ days in the previous financial year. Foreign directors' documents need apostille or notarisation depending on their country's status under the Hague Convention.",
      },
      {
        question: "What is the NIC code and why does it matter?",
        answer:
          "The NIC code identifies your company's business activity in the SPICe+ filing. An incorrect code can trigger a Registrar query and delay approval.",
      },
      {
        question: "What happens if I miss the AOC-4 or MGT-7 deadline?",
        answer:
          "Both attract an additional filing fee of ₹100 per day of delay, with no upper cap. Prolonged non-filing can also lead to director disqualification under Section 164(2).",
      },
      {
        question:
          "Can I register a Private Limited Company entirely online without visiting Chennai?",
        answer:
          "Yes. The entire SPICe+ process is filed online, and DSC issuance is remote too. The Anna Nagar West office is available for founders who prefer in-person document handover, but it isn't required.",
      },
    ],
    lastUpdated: "September 2026",
    extraSectionOrder: [
      "scope",
      "tco",
      "afterIncorporation",
      "avoidResubmission",
      "decisionFramework",
    ],
    metaTitle: "Private Limited Company Registration India",
    metaDescription:
      "Private limited company registration from {{FEE}} professional fee, typically completed in 7 business days. Full scope and fee confirmed before you pay.",
  },
  "llp-registration": {
    base: {
      eyebrow: "LLP incorporation",
      summary:
        "LLP registration is the process of incorporating a Limited Liability Partnership under the LLP Act, 2008, through the MCA's FiLLiP form. It needs at least 2 partners, with at least one resident designated partner, and no minimum capital contribution. FirstMan's professional fee starts at {{FEE}}, with government fees, DSC, and stamp duty billed separately.",
      idealFor: [
        "Professional service firms and small businesses that want limited liability without company-level compliance",
        "Partners who want a registered structure but have no plans to raise equity funding",
        "Businesses that want to avoid a mandatory annual audit below a turnover or contribution threshold",
      ],
      outcomes: [
        "A separate legal entity with limited liability for every partner, recognised under the LLP Act, 2008",
        "Certificate of Incorporation, DPIN for designated partners, PAN, TAN, and your LLP Agreement filed in one coordinated engagement",
      ],
      includes: [
        "Name availability check before filing",
        "FiLLiP filing with DPIN allotment for designated partners",
        "LLP Agreement drafting and Form 3 filing",
        "PAN and TAN application",
        "WhatsApp progress updates through the filing",
      ],
      process: [
        {
          title: "Digital Signature Certificate",
          body: "Every designated partner applies for a Class III DSC to sign incorporation forms electronically.",
        },
        {
          title: "Name reservation",
          body: "The proposed LLP name is checked against the existing LLP and company register and live trademarks before filing.",
        },
        {
          title: "FiLLiP filing",
          body: "The incorporation form allots DPIN to designated partners and applies for PAN and TAN in one filing.",
        },
        {
          title: "Certificate of Incorporation and LLP Agreement",
          body: "Once MCA approves the filing, the Certificate of Incorporation is issued; the LLP Agreement is filed via Form 3 within 30 days.",
        },
      ],
    },
    heroNote:
      "The {{FEE}} professional fee excludes government fees, DSC charges, and stamp duty on the LLP Agreement. Figures on this page use Tamil Nadu's stamp duty schedule; other states set their own rates and may vary.",
    decisionFramework: {
      heading: "Who should, and should not, register an LLP.",
      intro:
        "Register an LLP if you want limited liability with a lighter annual compliance load than a company, and you have no plans to raise equity funding. Consider a Private Limited Company, OPC, or proprietorship instead depending on your funding and ownership plans.",
      chooseInstead: [
        {
          structure: "Private Limited Company",
          when: "you plan to raise equity funding, issue ESOPs, or need the credibility of a registered company for institutional investors.",
          href: "/services/pvt-ltd-registration",
        },
        {
          structure: "One Person Company",
          when: "you're a solo founder who wants a company structure without a second partner.",
          href: "/services/opc-registration",
        },
        {
          structure: "Sole proprietorship",
          when: "you need to start invoicing immediately as a single owner with minimal compliance.",
          href: "/services/proprietorship-registration",
        },
      ],
    },
    structureComparison: {
      columns: ["LLP", "Private Limited", "OPC", "Proprietorship"],
      rows: [
        {
          factor: "Liability",
          values: [
            "Limited to capital contribution",
            "Limited to shares held",
            "Limited to shares held",
            "Unlimited, personal",
          ],
        },
        {
          factor: "Equity fundraising",
          values: [
            "Not designed for equity investors",
            "Straightforward",
            "Not possible while structured as OPC",
            "Not possible",
          ],
        },
        {
          factor: "Compliance load",
          values: [
            "Moderate: Form 8, Form 11, audit only above threshold",
            "Highest: mandatory audit, AOC-4, MGT-7, ADT-1",
            "Similar to Pvt Ltd, fewer members",
            "Lowest: ITR only",
          ],
        },
        {
          factor: "Minimum owners",
          values: ["2 partners", "2 shareholders, 2 directors", "1 member, 1 nominee", "1"],
        },
        {
          factor: "Statutory audit",
          values: [
            "Only if turnover exceeds ₹40 lakh or contribution exceeds ₹25 lakh",
            "Mandatory every year regardless of size",
            "Mandatory every year regardless of size",
            "Not required by law",
          ],
        },
        {
          factor: "Investor/lender credibility",
          values: ["Moderate", "Highest", "Moderate", "Lowest"],
        },
      ],
    },
    documentGroups: [
      {
        title: "Indian partners",
        note: "Address proof must not be older than 2 months. This is the single most common rejection trigger.",
        items: [
          "PAN card, with name matching Aadhaar exactly",
          "Aadhaar card, used for DPIN and DSC",
          "Recent passport-size photograph",
          "Address proof: bank statement, electricity, or mobile bill (within 2 months)",
          "Identity proof: voter ID, driving licence, or passport",
        ],
      },
      {
        title: "Registered office",
        items: [
          "Utility bill: electricity, water, or gas (within 2 months)",
          "Rent agreement or sale deed",
          "No Objection Certificate from the property owner, mandatory when rented or family-owned",
        ],
      },
      {
        title: "Foreign nationals and NRIs",
        note: "Apostille or notarisation requirements depend on the partner's country of residence under the Hague Convention. Foreign capital contribution also triggers FEMA/FDI reporting.",
        items: [
          "Passport, apostilled or notarised as applicable",
          "Overseas address proof, apostilled/notarised and translated if not in English",
        ],
      },
    ],
    timeline: [
      { day: "Day 1-2", milestone: "Documents collected; DSC applied and issued" },
      { day: "Day 2-3", milestone: "Name reservation filed" },
      {
        day: "Day 3-6",
        milestone: "FiLLiP filed with DPIN allotment; LLP Agreement drafted in parallel",
      },
      { day: "Day 6-7", milestone: "ROC processes the filing; any resubmission addressed" },
      { day: "Day 7", milestone: "Certificate of Incorporation issued" },
    ],
    costBreakdown: {
      intro:
        "Incorporation is only the first cost. A realistic year-one budget includes the professional fee, DSC, stamp duty, and MCA fee at setup, then Form 3, Form 11, Form 8, and income tax filing. Expect a realistic all-in range of roughly ₹15,000 to ₹30,000 for the full first year, not the {{FEE}} headline figure alone.",
      rows: [
        {
          item: "Professional fee (incorporation)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Digital Signature Certificates (2 designated partners)",
          when: "At filing",
          range: "₹1,500 – ₹3,000",
          includedInFee: "No, at cost",
        },
        {
          item: "Stamp duty on the LLP Agreement",
          when: "At filing",
          range: "Varies by state",
          includedInFee: "No, statutory",
        },
        {
          item: "MCA/ROC incorporation fee",
          when: "At filing",
          range: "Based on contribution amount",
          includedInFee: "No, statutory",
        },
        {
          item: "Form 11 (Annual Return)",
          when: "By 30 May annually",
          range: "₹2,000 – ₹5,000",
          includedInFee: "No",
        },
        {
          item: "Form 8 (Statement of Account & Solvency)",
          when: "By 30 October annually",
          range: "₹2,000 – ₹5,000",
          includedInFee: "No",
        },
        {
          item: "Statutory audit (only above threshold)",
          when: "If turnover or contribution crosses the threshold",
          range: "₹8,000 – ₹20,000",
          includedInFee: "No",
        },
        {
          item: "ITR filing (LLP)",
          when: "Annual",
          range: "₹3,000 – ₹8,000",
          includedInFee: "No",
        },
        {
          item: "Basic bookkeeping",
          when: "Monthly/quarterly",
          range: "₹3,000 – ₹8,000/month",
          includedInFee: "No",
        },
      ],
      note: "The {{FEE}} professional fee covers incorporation, including LLP Agreement drafting and Form 3 filing. Form 11, Form 8, statutory audit (if applicable), and ITR are separate, clearly quoted engagements.",
    },
    rejectionReasons: [
      {
        reason: "Name or trademark conflict",
        detail:
          "MCA checks the proposed name against the existing LLP and company register and the trademark database. We run this check before filing.",
      },
      {
        reason: "Address proof older than 2 months",
        detail:
          "The single most common clerical rejection. We date-check every document before submission.",
      },
      {
        reason: "PAN-Aadhaar name mismatch",
        detail:
          "Even a missing middle initial triggers a flag. We cross-verify both documents before filing.",
      },
      {
        reason: "Capital contribution mismatch",
        detail:
          "The contribution amount in the LLP Agreement must match the figure filed in FiLLiP. We reconcile both before filing.",
      },
      {
        reason: "Missing NOC",
        detail:
          "Rented or family-owned premises need a signed No Objection Certificate, collected before a query is raised.",
      },
      {
        reason: "Expired DSC",
        detail:
          "A DSC that lapses mid-process stalls the filing. We track validity windows against your filing timeline.",
      },
      {
        reason: "Designated partner residency shortfall",
        detail:
          "At least one designated partner must have stayed in India for 182 days or more in the previous financial year. We verify this before filing, not after a query.",
      },
    ],
    complianceCalendar: [
      {
        milestone: "LLP Agreement (Form 3)",
        dueBy: "Within 30 days of incorporation",
        penalty:
          "The agreement isn't legally binding on the LLP until filed; an additional fee applies the longer the delay runs",
      },
      {
        milestone: "DIN/DPIN KYC (each designated partner)",
        dueBy: "30 September every year",
        penalty: "₹5,000 late fee per partner; DIN marked deactivated",
      },
      {
        milestone: "Form 11 (Annual Return)",
        dueBy: "30 May every year",
        penalty: "Additional fee per day of delay under the current fee schedule",
      },
      {
        milestone: "Form 8 (Statement of Account & Solvency)",
        dueBy: "30 October every year",
        penalty: "Additional fee per day of delay under the current fee schedule",
      },
      {
        milestone: "Statutory audit, if threshold crossed",
        dueBy: "Before the ITR due date",
        penalty: "Return cannot be accurately certified without it",
      },
      {
        milestone: "ITR filing",
        dueBy:
          "31 July for LLPs not requiring audit, 31 October for LLPs requiring audit (confirm the date for the applicable year)",
        penalty: "Interest under Section 234A/B/C; loss of carry-forward benefits",
      },
    ],
    localNote: {
      heading: "Registering an LLP from Chennai or Tamil Nadu",
      body: "The MCA process is identical nationwide, but every state sets its own stamp duty schedule for the LLP Agreement, so the amount you pay depends on where your registered office is. RoC Chennai processes filings for LLPs registered with a Tamil Nadu address, and familiarity with how that office raises and resolves queries shortens resubmission cycles. Founders who prefer to hand over physical documents rather than scan and upload them can do so at our Anna Nagar West office before we file.",
    },
    scopeTable: {
      included: [
        "Name availability check before filing",
        "FiLLiP filing with DPIN allotment for designated partners",
        "LLP Agreement drafting and Form 3 filing",
        "PAN and TAN application",
        "Certificate of Incorporation delivery",
        "Resubmission handling for filing-stage queries",
        "WhatsApp progress updates through the filing",
        "Dedicated case owner as single point of contact",
      ],
      excluded: [
        "Government/MCA incorporation fee (varies by contribution amount)",
        "Stamp duty on the LLP Agreement (state-specific)",
        "Digital Signature Certificates for designated partners",
        "Notarisation/apostille for foreign partner documents",
        "Annual Form 11 and Form 8 filings",
        "Statutory audit, if your turnover or contribution crosses the threshold",
        "ITR filing",
        "Bookkeeping, GST registration, or trademark filing",
      ],
    },
    faqs: [
      {
        question:
          "What is the real, total cost of registering an LLP, not just the professional fee?",
        answer:
          "Budget ₹15,000 to ₹30,000 for the full first year, not {{FEE}} alone. That figure covers the professional fee, DSC, stamp duty, MCA fee, Form 11, Form 8, and ITR filing.",
      },
      {
        question: "Are there hidden charges on top of the {{FEE}} professional fee?",
        answer:
          "No charges are hidden, but several are genuinely separate and statutory: DSC, stamp duty, and the MCA incorporation fee are billed at actual cost because they vary by contribution amount and state. Every cost is listed before you pay.",
      },
      {
        question: "What happens if my proposed LLP name gets rejected?",
        answer:
          "MCA allows a second name attempt at no extra government fee. If both names are rejected, a fresh filing is required, adding a small government fee and 2 to 3 days.",
      },
      {
        question: "Does FirstMan offer a refund if the registration doesn't go through?",
        answer:
          "Talk to your case owner about our refund policy for the specific reason a filing didn't proceed. It differs depending on whether the cause was an MCA rejection or a change on your side.",
      },
      {
        question: "Can I use my home or a residential address as the registered office?",
        answer:
          "Yes. MCA does not require a commercial address. A residential address works with valid ownership or rental proof not older than 2 months, and an NOC from the owner if it isn't in a partner's own name.",
      },
      {
        question: "What if I don't file the LLP Agreement within 30 days?",
        answer:
          "The LLP Agreement isn't legally binding on the LLP until it's filed via Form 3, and MCA charges an additional fee that increases the longer the delay runs. We file this within the 30-day window as part of your incorporation engagement.",
      },
      {
        question: "Do I need GST registration immediately after incorporating?",
        answer:
          "Not immediately, unless you cross the GST turnover threshold, sell across state lines, or sell on e-commerce platforms, all of which require registration regardless of turnover.",
      },
      {
        question: "Is a statutory audit mandatory for every LLP?",
        answer:
          "No. Audit is mandatory only once your annual turnover exceeds ₹40 lakh or your capital contribution exceeds ₹25 lakh. Below that, you still file Form 11 and Form 8, but without an audited statement.",
      },
      {
        question: "Can I convert my LLP to a Private Limited Company later?",
        answer:
          "Yes, conversion from LLP to a Private Limited Company is a well-established process under the Companies Act, 2013, and is generally more common and more straightforward than converting a company into an LLP.",
      },
      {
        question: "How long does LLP registration actually take?",
        answer:
          "Typically 7 business days from complete document submission to Certificate of Incorporation. Name conflicts or address-proof issues can extend this by 3 to 10 days.",
      },
      {
        question: "Do I need a minimum capital contribution to start an LLP?",
        answer:
          "No. There is no statutory minimum capital contribution for an LLP. Your contribution amount still affects the MCA incorporation fee slab and the stamp duty on the LLP Agreement.",
      },
      {
        question: "Can the same two people be both partners and designated partners?",
        answer:
          "Yes. The minimum requirement is 2 partners, and at least 2 of them must be designated partners. The same two people can hold both roles.",
      },
      {
        question: "What is the difference between DPIN and DIN?",
        answer:
          "They are now the same number. DPIN, once issued separately for LLP designated partners, has been merged with DIN, the identifier used for company directors, and is applied for through FiLLiP itself.",
      },
      {
        question: "Can a foreign national be a designated partner in an Indian LLP?",
        answer:
          "Yes, but at least one designated partner must be a resident Indian who stayed in India for 182+ days in the previous financial year. Foreign partners' documents need apostille or notarisation depending on their country's status under the Hague Convention.",
      },
      {
        question: "What happens if I miss the Form 11 or Form 8 deadline?",
        answer:
          "Both attract an additional fee for each day of delay under the current fee schedule. Prolonged non-filing can also affect the LLP's compliance status with the Registrar.",
      },
      {
        question: "Can I register an LLP entirely online without visiting Chennai?",
        answer:
          "Yes. The entire FiLLiP process is filed online, and DSC issuance is remote too. The Anna Nagar West office is available for founders who prefer in-person document handover, but it isn't required.",
      },
      {
        question:
          "Does FirstMan handle the annual Form 11 and Form 8 filings as part of incorporation?",
        answer:
          "No, these are separate engagements quoted after incorporation, since they depend on your LLP's financial activity during the year. See annual compliance for an LLP for details.",
      },
      {
        question: "Do I need a company secretary for my LLP?",
        answer:
          "No, an LLP has no requirement for a company secretary at any size. This is one of the compliance-cost differences from a Private Limited Company, which requires a full-time CS above a paid-up capital threshold.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "LLP Registration India",
    metaDescription:
      "LLP registration from {{FEE}} professional fee, typically completed in 7 business days. Full scope and fee confirmed before you pay.",
  },
  "opc-registration": {
    base: {
      eyebrow: "OPC incorporation",
      summary:
        "One Person Company registration is the process of incorporating a company under Section 2(62) of the Companies Act, 2013, with a single member and a mandatory nominee, through the MCA's SPICe+ form. It needs no minimum paid-up capital and only one director. FirstMan's professional fee starts at {{FEE}}, with government fees, DSC, and stamp duty billed separately.",
      idealFor: [
        "Solo founders who want the credibility and limited liability of a company structure without a second shareholder",
        "Freelancers and consultants formalising a single-owner business for contracts, loans, or vendor onboarding",
        "Founders who expect to add co-founders or investors later and plan to convert to a Private Limited Company",
      ],
      outcomes: [
        "A separate legal entity with limited liability, recognised under Section 2(62) of the Companies Act, 2013",
        "Certificate of Incorporation, DIN, PAN, TAN, and your nominee's consent (Form INC-3) filed in one coordinated engagement",
      ],
      includes: [
        "Name availability and trademark-conflict check before filing",
        "SPICe+ filing with e-MoA/e-AoA drafting",
        "Nominee consent (Form INC-3) preparation and filing",
        "AGILE-PRO-S filing for PAN, TAN, EPFO, and ESIC",
        "WhatsApp progress updates through the filing",
      ],
      process: [
        {
          title: "Digital Signature Certificate",
          body: "The sole member-director and the nominee apply for a Class III DSC to sign incorporation forms electronically.",
        },
        {
          title: "Name reservation (SPICe+ Part A)",
          body: "The proposed company name is checked against the existing company register and live trademarks before filing.",
        },
        {
          title: "SPICe+ Part B with nominee consent",
          body: "The main incorporation form is filed with e-MoA/e-AoA and Form INC-3, the nominee's written consent to act if the member is unable to continue.",
        },
        {
          title: "Certificate of Incorporation",
          body: "Once the Registrar approves the filing, MCA issues the Certificate of Incorporation with your CIN, PAN, and TAN.",
        },
      ],
    },
    heroNote:
      "The {{FEE}} professional fee excludes government fees, DSC charges, and stamp duty on the MoA/AoA. Figures on this page use Tamil Nadu's stamp duty schedule; other states set their own rates and may vary.",
    decisionFramework: {
      heading: "Who should, and should not, register a One Person Company.",
      intro:
        "Register an OPC if you're a solo founder who wants a company structure now and may add shareholders later. Consider a Private Limited Company, LLP, or proprietorship instead depending on your ownership and funding plans.",
      chooseInstead: [
        {
          structure: "Private Limited Company",
          when: "you already have a co-founder or investor lined up, since an OPC has only one member.",
          href: "/services/pvt-ltd-registration",
        },
        {
          structure: "LLP",
          when: "you want limited liability with more than one owner but don't need equity fundraising.",
          href: "/services/llp-registration",
        },
        {
          structure: "Sole proprietorship",
          when: "you want the lowest compliance burden and don't need a company structure yet.",
          href: "/services/proprietorship-registration",
        },
      ],
    },
    structureComparison: {
      columns: ["OPC", "Private Limited", "LLP", "Proprietorship"],
      rows: [
        {
          factor: "Liability",
          values: [
            "Limited to shares held",
            "Limited to shares held",
            "Limited to capital contribution",
            "Unlimited, personal",
          ],
        },
        {
          factor: "Number of owners",
          values: [
            "Exactly 1 member, plus a nominee",
            "2 to 200 shareholders",
            "2 or more partners, no upper limit",
            "1",
          ],
        },
        {
          factor: "Equity fundraising",
          values: [
            "Not possible while structured as OPC",
            "Straightforward",
            "Not designed for equity investors",
            "Not possible",
          ],
        },
        {
          factor: "Compliance load",
          values: [
            "Similar to Pvt Ltd, but no AGM and fewer board meetings",
            "Highest: AGM, 4 board meetings a year, mandatory audit",
            "Moderate: Form 8, Form 11, audit only above threshold",
            "Lowest: ITR only",
          ],
        },
        {
          factor: "Statutory audit",
          values: [
            "Mandatory every year regardless of size",
            "Mandatory every year regardless of size",
            "Only if turnover exceeds ₹40 lakh or contribution exceeds ₹25 lakh",
            "Not required by law",
          ],
        },
        {
          factor: "Investor/lender credibility",
          values: ["Moderate", "Highest", "Moderate", "Lowest"],
        },
      ],
    },
    documentGroups: [
      {
        title: "The sole member and nominee",
        note: "Both the member and the nominee must be Indian citizens resident in India. Address proof must not be older than 2 months.",
        items: [
          "PAN card, with name matching Aadhaar exactly",
          "Aadhaar card, used for DSC and DIN application",
          "Recent passport-size photograph, of both the member and the nominee",
          "Address proof: bank statement, electricity, or mobile bill (within 2 months)",
          "Nominee's written consent on Form INC-3",
        ],
      },
      {
        title: "Registered office",
        items: [
          "Utility bill: electricity, water, or gas (within 2 months)",
          "Rent agreement or sale deed",
          "No Objection Certificate from the property owner, mandatory when rented or family-owned",
        ],
      },
    ],
    timeline: [
      { day: "Day 1-2", milestone: "Documents collected; DSC applied for the member and nominee" },
      { day: "Day 2-3", milestone: "Name reservation filed via SPICe+ Part A" },
      {
        day: "Day 3-5",
        milestone: "SPICe+ Part B filed with nominee consent (Form INC-3) and AGILE-PRO-S",
      },
      { day: "Day 5-7", milestone: "ROC processes the filing; any resubmission addressed" },
      { day: "Day 7", milestone: "Certificate of Incorporation, PAN, and TAN issued" },
    ],
    costBreakdown: {
      intro:
        "Incorporation is only the first cost. A realistic year-one budget includes the professional fee, DSC, stamp duty, and MCA fee at setup, then a recurring layer of auditor fees, ROC filings, DIR-3 KYC, and income tax filing, much like a Private Limited Company. Expect a realistic all-in range of roughly ₹25,000 to ₹45,000 for the full first year, not the {{FEE}} headline figure alone.",
      rows: [
        {
          item: "Professional fee (incorporation)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Digital Signature Certificates (member and nominee)",
          when: "At filing",
          range: "₹1,500 – ₹3,000",
          includedInFee: "No, at cost",
        },
        {
          item: "Stamp duty on MoA/AoA",
          when: "At filing",
          range: "Varies by state",
          includedInFee: "No, statutory",
        },
        {
          item: "MCA/ROC incorporation fee",
          when: "At filing",
          range: "Based on authorised capital",
          includedInFee: "No, statutory",
        },
        {
          item: "First auditor appointment",
          when: "Within 30 days of incorporation",
          range: "₹5,000 – ₹15,000",
          includedInFee: "No",
        },
        {
          item: "INC-20A filing",
          when: "Within 180 days",
          range: "₹1,500 – ₹3,000",
          includedInFee: "No",
        },
        {
          item: "AOC-4 + MGT-7A (annual filing)",
          when: "Within 180 days of financial year-end",
          range: "₹5,000 – ₹12,000",
          includedInFee: "No",
        },
        {
          item: "DIR-3 KYC (sole director)",
          when: "By 30 September",
          range: "₹500 – ₹1,000",
          includedInFee: "No",
        },
        {
          item: "ITR filing (company)",
          when: "Annual",
          range: "₹3,000 – ₹8,000",
          includedInFee: "No",
        },
        {
          item: "Basic bookkeeping",
          when: "Monthly/quarterly",
          range: "₹3,000 – ₹8,000/month",
          includedInFee: "No",
        },
      ],
      note: "The {{FEE}} professional fee covers incorporation only. Everything from the first auditor appointment onward is a separate, clearly quoted engagement, the same as for a Private Limited Company.",
    },
    rejectionReasons: [
      {
        reason: "Name or trademark conflict",
        detail:
          "MCA checks the proposed name against the existing company register and the trademark database. We run this check before filing.",
      },
      {
        reason: "Address proof older than 2 months",
        detail:
          "The single most common clerical rejection. We date-check every document before submission.",
      },
      {
        reason: "PAN-Aadhaar name mismatch",
        detail:
          "Even a missing middle initial triggers a flag. We cross-verify both documents before filing.",
      },
      {
        reason: "Nominee consent missing or incomplete",
        detail:
          "Form INC-3, the nominee's written consent, must be filed alongside the incorporation form. A missing signature or mismatched detail is a common, avoidable rejection specific to OPCs.",
      },
      {
        reason: "Ineligible member or nominee",
        detail:
          "Only an Indian citizen resident in India can be the member or nominee of an OPC, and a person can hold this role in only one OPC at a time. We verify eligibility before filing.",
      },
      {
        reason: "Missing NOC",
        detail:
          "Rented or family-owned premises need a signed No Objection Certificate, collected before a query is raised.",
      },
      {
        reason: "Expired DSC",
        detail:
          "A DSC that lapses mid-process stalls the filing. We track validity windows against your filing timeline.",
      },
    ],
    complianceCalendar: [
      {
        milestone: "First auditor appointment",
        dueBy: "Within 30 days of incorporation",
        penalty: "Fine on the company and officers in default",
      },
      {
        milestone: "INC-20A: Commencement of business",
        dueBy: "Within 180 days of incorporation",
        penalty: "₹50,000 fine on the company; ₹1,000/day on officers in default",
      },
      {
        milestone: "DIR-3 KYC (sole director)",
        dueBy: "30 September every year",
        penalty: "₹5,000 late fee; DIN marked deactivated",
      },
      {
        milestone: "AOC-4: Financial statements",
        dueBy: "Within 180 days of financial year-end (an OPC holds no AGM to peg the date to)",
        penalty: "₹100/day additional fee, uncapped",
      },
      {
        milestone: "MGT-7A: Annual return (OPC's simplified form)",
        dueBy: "Within 60 days of the deemed AGM date, 30 September",
        penalty: "₹100/day additional fee, uncapped",
      },
      {
        milestone: "ITR filing",
        dueBy:
          "31 October, since an OPC always requires an audit (confirm the date for the applicable year)",
        penalty: "Interest under Section 234A/B/C; loss of carry-forward benefits",
      },
    ],
    localNote: {
      heading: "Registering a One Person Company from Chennai or Tamil Nadu",
      body: "The MCA process is identical nationwide, but every state sets its own stamp duty schedule for the MoA and AoA, so the amount you pay depends on where your registered office is. RoC Chennai processes filings for companies registered with a Tamil Nadu address, and familiarity with how that office raises and resolves queries shortens resubmission cycles. Founders who prefer to hand over physical documents rather than scan and upload them can do so at our Anna Nagar West office before we file.",
    },
    scopeTable: {
      included: [
        "Name availability and trademark-conflict check before filing",
        "SPICe+ filing with e-MoA/e-AoA drafting",
        "Nominee consent (Form INC-3) preparation and filing",
        "AGILE-PRO-S filing (PAN, TAN, EPFO, ESIC application)",
        "DIN application for the sole director",
        "Certificate of Incorporation delivery",
        "Resubmission handling for filing-stage queries",
        "WhatsApp progress updates through the filing",
      ],
      excluded: [
        "Government/MCA incorporation fee (varies by authorised capital)",
        "Stamp duty on MoA/AoA (state-specific)",
        "Digital Signature Certificates for the member and nominee",
        "First auditor appointment",
        "INC-20A filing (available as a follow-on engagement)",
        "Annual ROC compliance (AOC-4, MGT-7A, DIR-3 KYC)",
        "Bookkeeping, GST registration, or trademark filing",
      ],
    },
    faqs: [
      {
        question:
          "What is the real, total cost of registering a One Person Company, not just the professional fee?",
        answer:
          "Budget ₹25,000 to ₹45,000 for the full first year, not {{FEE}} alone. That figure covers the professional fee, DSC, stamp duty, MCA fee, first auditor appointment, INC-20A, annual ROC filings, DIR-3 KYC, and ITR filing.",
      },
      {
        question: "Are there hidden charges on top of the {{FEE}} professional fee?",
        answer:
          "No charges are hidden, but several are genuinely separate and statutory: DSC, stamp duty, and the MCA incorporation fee are billed at actual cost because they vary by authorised capital and state. Every cost is listed before you pay.",
      },
      {
        question: "What happens if my proposed company name gets rejected?",
        answer:
          "MCA allows a second name attempt within the same SPICe+ Part A filing at no extra government fee. If both names are rejected, a fresh Part A filing is required, adding a small government fee and 2 to 3 days.",
      },
      {
        question: "Does FirstMan offer a refund if the registration doesn't go through?",
        answer:
          "Talk to your case owner about our refund policy for the specific reason a filing didn't proceed. It differs depending on whether the cause was an MCA rejection or a change on your side.",
      },
      {
        question: "Can I use my home or a residential address as the registered office?",
        answer:
          "Yes. MCA does not require a commercial address. A residential address works with valid ownership or rental proof not older than 2 months, and an NOC from the owner if it isn't in the member's own name.",
      },
      {
        question: "What if I don't file INC-20A within 180 days?",
        answer:
          "The company cannot legally commence business or borrow money until INC-20A is filed. Missing the 180-day deadline attracts a ₹50,000 fine on the company and ₹1,000 per day on every officer in default.",
      },
      {
        question: "Do I need GST registration immediately after incorporating?",
        answer:
          "Not immediately, unless you cross the GST turnover threshold, sell across state lines, or sell on e-commerce platforms, all of which require registration regardless of turnover.",
      },
      {
        question: "Who can be the nominee for my OPC, and can I change them later?",
        answer:
          "The nominee must be an Indian citizen resident in India and cannot be a minor. You can change your nominee at any time by filing the required form with the Registrar, along with the new nominee's written consent.",
      },
      {
        question: "Do I have to convert my OPC to a Private Limited Company once it grows?",
        answer:
          "No. The mandatory conversion trigger based on paid-up capital or turnover was removed in 2021. You can continue operating as an OPC indefinitely, or convert voluntarily whenever it suits your business.",
      },
      {
        question: "Can an OPC have more than one director?",
        answer:
          "Yes. An OPC can appoint additional directors for day-to-day management, but it can only ever have one member. Directors and the member are not the same thing.",
      },
      {
        question: "Can a foreign national be the sole member of an OPC?",
        answer:
          "No. Only an Indian citizen who has been resident in India can be the member or nominee of an OPC. Foreign nationals and NRIs register a Private Limited Company instead.",
      },
      {
        question: "Does an OPC need to hold an Annual General Meeting?",
        answer:
          "No. Section 96 of the Companies Act, 2013 exempts an OPC from holding an AGM, though it still files annual financial statements and returns.",
      },
      {
        question: "Is a statutory audit mandatory for an OPC, the way an LLP has a threshold?",
        answer:
          "Yes. Unlike an LLP, an OPC must have its accounts audited every year regardless of turnover or capital, the same as a Private Limited Company.",
      },
      {
        question: "How long does OPC registration actually take?",
        answer:
          "Typically 7 business days from complete document submission to Certificate of Incorporation. Name conflicts or address-proof issues can extend this by 3 to 10 days.",
      },
      {
        question: "Do I need a minimum capital to start an OPC?",
        answer:
          "No. There is no statutory minimum paid-up capital for an OPC. Your authorised capital figure still determines your MCA incorporation fee slab.",
      },
      {
        question: "Can the same person be the member and the sole director?",
        answer:
          "Yes. A single person can be both the member and the director of an OPC. You only need a separate nominee, who does not need to be a director.",
      },
      {
        question: "Can I register an OPC entirely online without visiting Chennai?",
        answer:
          "Yes. The entire SPICe+ process is filed online, and DSC issuance is remote too. The Anna Nagar West office is available for founders who prefer in-person document handover, but it isn't required.",
      },
      {
        question: "Can I be the member or nominee of more than one OPC at a time?",
        answer:
          "No. A person can be the member or nominee of only one OPC at a time. This is a common eligibility trap we check before filing.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "One Person Company (OPC) Registration India",
    metaDescription:
      "OPC registration from {{FEE}} professional fee, typically completed in 7 business days. Full scope and fee confirmed before you pay.",
  },
  "proprietorship-registration": {
    base: {
      eyebrow: "Business registration",
      summary:
        "Sole proprietorship registration sets up your business's basic identity: Udyam (MSME) registration, GST registration where applicable, and a current bank account in the business name. There is no separate incorporation step, no minimum capital, and no government fee for Udyam or GST registration themselves. FirstMan's professional fee starts at {{FEE}}.",
      idealFor: [
        "Freelancers, consultants, and small traders starting out who want a simple, low-compliance structure",
        "Businesses testing an idea before committing to a company or LLP",
        "Single owners who don't need to raise funding or bring in partners",
      ],
      outcomes: [
        "Udyam (MSME) registration, recognised under the MSME Development Act, 2006",
        "GST registration where applicable, and a current bank account ready for business use",
      ],
      includes: [
        "Udyam/MSME registration on the government portal",
        "GST registration application and follow-up, where applicable",
        "Guidance on opening a current bank account in the business name",
        "Document preparation for the proprietor's PAN, Aadhaar, and address proof",
        "WhatsApp progress updates through the process",
      ],
      process: [
        {
          title: "Eligibility and requirement review",
          body: "We confirm which registrations your business actually needs. Udyam is near-universal; GST depends on your turnover and business type.",
        },
        {
          title: "Udyam (MSME) registration",
          body: "Registration is filed on the Udyam portal using the proprietor's Aadhaar, with no government fee.",
        },
        {
          title: "GST registration, where applicable",
          body: "If your turnover crosses the threshold, or you sell across state lines or on e-commerce platforms, we file your GST registration application.",
        },
        {
          title: "Bank account and handover",
          body: "With your registration certificates in hand, you can open a current bank account in the business name. We hand over all certificates and acknowledgements.",
        },
      ],
    },
    heroNote:
      "The {{FEE}} professional fee covers professional services only. Udyam registration carries no government fee, and neither does GST registration. A Shop and Establishment licence, where applicable in Tamil Nadu, carries its own separate municipal fee.",
    decisionFramework: {
      heading: "Who should, and should not, register as a sole proprietorship.",
      intro:
        "Register as a sole proprietorship if you're a single owner who wants to start immediately with minimal compliance and don't need external funding. Choose a Private Limited Company, LLP, or OPC instead if you need limited liability, plan to raise funding, or want a separate legal entity.",
      chooseInstead: [
        {
          structure: "Private Limited Company",
          when: "you plan to raise equity funding, issue ESOPs, or need the credibility of a registered company.",
          href: "/services/pvt-ltd-registration",
        },
        {
          structure: "LLP",
          when: "you want limited liability with one or more partners but don't need equity fundraising.",
          href: "/services/llp-registration",
        },
        {
          structure: "One Person Company",
          when: "you want a company structure and limited liability while remaining the sole owner.",
          href: "/services/opc-registration",
        },
      ],
    },
    structureComparison: {
      columns: ["Proprietorship", "Private Limited", "LLP", "OPC"],
      rows: [
        {
          factor: "Liability",
          values: [
            "Unlimited, personal",
            "Limited to shares held",
            "Limited to capital contribution",
            "Limited to shares held",
          ],
        },
        {
          factor: "Legal identity",
          values: [
            "Same legal person as the owner",
            "Separate legal entity",
            "Separate legal entity",
            "Separate legal entity",
          ],
        },
        {
          factor: "Equity fundraising",
          values: [
            "Not possible",
            "Straightforward",
            "Not designed for equity investors",
            "Not possible while structured as OPC",
          ],
        },
        {
          factor: "Compliance load",
          values: [
            "Lowest: ITR and GST returns only",
            "Highest: mandatory audit, AOC-4, MGT-7",
            "Moderate: Form 8, Form 11, audit only above threshold",
            "Similar to Pvt Ltd, but no AGM",
          ],
        },
        {
          factor: "Registration cost",
          values: [
            "No government fee for Udyam or GST",
            "MCA fee plus stamp duty on MoA/AoA",
            "MCA fee plus stamp duty on the LLP Agreement",
            "MCA fee plus stamp duty on MoA/AoA",
          ],
        },
        {
          factor: "Investor/lender credibility",
          values: ["Lowest", "Highest", "Moderate", "Moderate"],
        },
      ],
    },
    documentGroups: [
      {
        title: "The proprietor",
        note: "Address proof must not be older than 2 months for GST registration purposes.",
        items: [
          "PAN card, with name matching Aadhaar exactly",
          "Aadhaar card, used for Udyam e-KYC and GST registration",
          "Recent passport-size photograph",
          "Address proof: bank statement, electricity, or mobile bill (within 2 months)",
          "Identity proof: voter ID, driving licence, or passport",
        ],
      },
      {
        title: "Business address",
        note: "A residential address is acceptable for GST registration.",
        items: [
          "Utility bill: electricity, water, or gas (within 2 months), or a rent agreement",
          "No Objection Certificate from the property owner, mandatory when rented or family-owned",
        ],
      },
    ],
    timeline: [
      { day: "Day 1", milestone: "Documents collected; Udyam (MSME) registration filed" },
      { day: "Day 1-2", milestone: "Udyam registration certificate issued" },
      { day: "Day 2-4", milestone: "GST registration application filed, where applicable" },
      { day: "Day 4-5", milestone: "GST officer verification completed; GSTIN issued" },
      { day: "Day 5", milestone: "Current bank account opening initiated with your certificates" },
    ],
    costBreakdown: {
      intro:
        "A sole proprietorship has no incorporation cost the way a company or LLP does. Udyam and GST registration both carry no government fee. Your real year-one cost is the professional fee plus ongoing GST return filing and income tax filing. Expect a realistic all-in range of roughly ₹8,000 to ₹20,000 for the full first year, not the {{FEE}} headline figure alone.",
      rows: [
        {
          item: "Professional fee (registration)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Udyam (MSME) registration",
          when: "At filing",
          range: "No government fee",
          includedInFee: "Yes",
        },
        {
          item: "GST registration, where applicable",
          when: "At filing",
          range: "No government fee",
          includedInFee: "Yes",
        },
        {
          item: "Shop and Establishment licence, if applicable",
          when: "At filing",
          range: "Municipal fee, varies by state",
          includedInFee: "No, statutory",
        },
        {
          item: "GST return filing (GSTR-1, GSTR-3B)",
          when: "Monthly or quarterly",
          range: "₹1,000 – ₹3,000/month",
          includedInFee: "No",
        },
        {
          item: "Annual GST return (GSTR-9), if applicable",
          when: "Annual",
          range: "₹2,000 – ₹5,000",
          includedInFee: "No",
        },
        {
          item: "ITR filing (individual)",
          when: "Annual",
          range: "₹2,000 – ₹6,000",
          includedInFee: "No",
        },
        {
          item: "Basic bookkeeping",
          when: "Monthly/quarterly",
          range: "₹2,000 – ₹5,000/month",
          includedInFee: "No",
        },
      ],
      note: "The {{FEE}} professional fee covers Udyam and GST registration, where applicable. Ongoing GST return filing, annual return, and ITR filing are separate, clearly quoted engagements.",
    },
    rejectionReasons: [
      {
        reason: "PAN-Aadhaar name or date-of-birth mismatch",
        detail:
          "Udyam registration is Aadhaar-based. A mismatch between your PAN and Aadhaar details blocks e-KYC verification. We cross-verify both before filing.",
      },
      {
        reason: "Address proof older than 2 months",
        detail:
          "The single most common clerical rejection for GST registration. We date-check every document before submission.",
      },
      {
        reason: "Missing NOC for a rented or family-owned address",
        detail:
          "GST officers commonly raise a query when the address proof doesn't match the applicant's name and no NOC is on file. We collect this upfront.",
      },
      {
        reason: "Wrong HSN/SAC code selection",
        detail:
          "GST registration asks you to declare your business activity codes. An incorrect or mismatched code can trigger a departmental query. We map your actual activity to the correct codes before filing.",
      },
      {
        reason: "Aadhaar OTP or e-KYC failure",
        detail:
          "Udyam and GST registration both rely on Aadhaar-linked OTP verification. An outdated mobile number linked to Aadhaar is a common, avoidable delay. We confirm this before starting the filing.",
      },
      {
        reason: "GST site verification issues",
        detail:
          "Some GST applications are routed for physical or virtual site verification. An address that doesn't visibly match your business documentation can trigger a rejection. We prepare you for this before the officer visits.",
      },
    ],
    complianceCalendar: [
      {
        milestone: "GSTR-1 (outward supplies)",
        dueBy: "Monthly or quarterly, depending on your GST scheme",
        penalty: "Late fee per day of delay, subject to the current cap",
      },
      {
        milestone: "GSTR-3B (summary return and tax payment)",
        dueBy: "Monthly or quarterly, depending on your GST scheme",
        penalty: "Late fee plus interest on any tax paid late",
      },
      {
        milestone: "GSTR-9 (annual return), if applicable",
        dueBy: "By 31 December following the financial year",
        penalty: "Late fee per day of delay",
      },
      {
        milestone: "Tax audit threshold (Section 44AB)",
        dueBy: "Applies once turnover exceeds ₹1 crore (₹10 crore with limited cash transactions)",
        penalty: "Penalty under Section 271B for failing to get accounts audited when required",
      },
      {
        milestone: "ITR filing",
        dueBy:
          "31 July for non-audit cases, 31 October if tax audit applies (confirm the date for the applicable year)",
        penalty: "Interest under Section 234A/B/C",
      },
    ],
    localNote: {
      heading: "Registering a sole proprietorship from Chennai or Tamil Nadu",
      body: "Udyam and GST registration follow the same process nationwide, but a Tamil Nadu Shop and Establishment licence, where your business needs one, is issued by the local municipal or Greater Chennai Corporation office and carries its own fee schedule. GST verification for Tamil Nadu addresses is handled by the local GST range office, and familiarity with how that office raises queries shortens turnaround. Founders who prefer to hand over physical documents rather than scan and upload them can do so at our Anna Nagar West office before we file.",
    },
    scopeTable: {
      included: [
        "Udyam (MSME) registration on the government portal",
        "GST registration application, where applicable",
        "Document preparation and eligibility review",
        "Query coordination with the GST department",
        "Guidance on opening a current bank account",
        "Certificate and acknowledgement handover",
        "WhatsApp progress updates through the process",
        "Dedicated case owner as single point of contact",
      ],
      excluded: [
        "Shop and Establishment licence, where applicable (separate municipal fee)",
        "GST return filing (GSTR-1, GSTR-3B, GSTR-9)",
        "Income tax return filing",
        "Bookkeeping",
        "Trademark registration for your business name",
      ],
    },
    faqs: [
      {
        question:
          "What is the real, total cost of registering a sole proprietorship, not just the professional fee?",
        answer:
          "Budget ₹8,000 to ₹20,000 for the full first year, not {{FEE}} alone. That figure covers the professional fee plus ongoing GST return filing and income tax filing. Udyam and GST registration themselves carry no government fee.",
      },
      {
        question: "Are there hidden charges on top of the {{FEE}} professional fee?",
        answer:
          "No. Udyam and GST registration have no government fee. The only additional statutory cost is a Shop and Establishment licence fee, where your business needs one, which we quote separately.",
      },
      {
        question: "Do I legally need to register my sole proprietorship at all?",
        answer:
          "There is no single central registration for a sole proprietorship the way there is for a company. What you actually need are the registrations that make your business operational, such as Udyam, GST if you cross the threshold, and a current bank account, which typically requires at least one of these certificates.",
      },
      {
        question: "Does FirstMan offer a refund if the registration doesn't go through?",
        answer:
          "Talk to your case owner about our refund policy for the specific reason a filing didn't proceed. It differs depending on whether the cause was a departmental rejection or a change on your side.",
      },
      {
        question: "Can I use my home address as my business address for GST registration?",
        answer:
          "Yes. GST registration does not require a commercial address. A residential address works with valid ownership or rental proof not older than 2 months, and an NOC from the owner if it isn't in your own name.",
      },
      {
        question: "Do I need GST registration immediately?",
        answer:
          "Not immediately, unless you cross the GST turnover threshold, sell across state lines, or sell on e-commerce platforms, all of which require registration regardless of turnover. Many proprietors register anyway because clients and vendors ask for a GSTIN.",
      },
      {
        question: "What if I don't register for GST when I'm actually required to?",
        answer:
          "Operating without GST registration when you're liable to register attracts a penalty of 10% of the tax due, or ₹10,000, whichever is higher, and can extend to 100% of the tax due in cases of deliberate evasion.",
      },
      {
        question: "Can a sole proprietorship have employees?",
        answer:
          "Yes. A sole proprietorship can hire employees like any other business. Once you cross the applicable headcount thresholds, you may also need ESIC and EPF registration.",
      },
      {
        question:
          "Can I convert my sole proprietorship into a Private Limited Company or LLP later?",
        answer:
          "Yes, but there is no formal conversion process the way there is between a company and an LLP, since a proprietorship isn't a separate legal entity. In practice, you incorporate a new company or LLP and transfer the business, assets, and contracts into it.",
      },
      {
        question: "How long does sole proprietorship registration actually take?",
        answer:
          "Typically 5 business days for Udyam and GST registration combined, though GST approval timelines depend on the department's verification queue and can extend if a query is raised.",
      },
      {
        question: "Do I need a minimum investment or turnover to register?",
        answer:
          "No. There is no minimum investment or turnover requirement for Udyam or GST registration. Udyam registration is open to businesses of any size, from micro to medium.",
      },
      {
        question: "Is my personal property at risk if the business runs into debt?",
        answer:
          "Yes. A sole proprietorship has no separate legal identity from its owner, so your personal assets are not protected from business liabilities. This is the main reason growing businesses move to an LLP or Private Limited Company.",
      },
      {
        question: "Can a foreign national or NRI register a sole proprietorship in India?",
        answer:
          "This is not straightforward. Proprietorship registration generally expects a resident Indian owner, and FEMA rules restrict how NRIs and foreign nationals can directly own and operate an unincorporated business in India. A Private Limited Company or LLP is usually the workable route instead.",
      },
      {
        question: "What is the difference between Udyam registration and GST registration?",
        answer:
          "Udyam is an MSME recognition that unlocks government schemes, priority lending, and delayed-payment protection under the MSME Development Act, 2006. GST registration is a tax registration required once you cross the turnover threshold or meet other trigger conditions. Most small businesses need both, but they serve different purposes.",
      },
      {
        question: "Can I register a sole proprietorship entirely online without visiting Chennai?",
        answer:
          "Yes. Udyam and GST registration are both filed online. The Anna Nagar West office is available for founders who prefer in-person document handover, but it isn't required.",
      },
      {
        question: "Do I need a separate bank account for my proprietorship business?",
        answer:
          "It isn't legally mandatory, but banks and GST authorities expect a current account in the business name for meaningful transaction volume, and it keeps your business and personal finances clearly separated for tax purposes.",
      },
      {
        question: "What happens if I miss a GST return filing deadline?",
        answer:
          "A late fee applies for each day of delay, subject to the current cap, plus interest on any tax paid late. Repeated non-filing can also lead to GST registration cancellation by the department.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "Sole Proprietorship Registration India",
    metaDescription:
      "Sole proprietorship registration (Udyam and GST) from {{FEE}} professional fee, typically completed in 5 business days.",
  },
  "partnership-registration": {
    base: {
      eyebrow: "Partnership formation",
      summary:
        "Partnership firm registration is the process of drafting a Partnership Deed under the Indian Partnership Act, 1932, and optionally registering it with your state's Registrar of Firms. It needs at least 2 partners, no minimum capital, and no MCA filing. FirstMan's professional fee starts at {{FEE}}, with stamp duty and Registrar of Firms charges billed separately.",
      idealFor: [
        "Two or more partners who want a formal, documented business arrangement without company-level compliance",
        "Family businesses and professional practices that don't need limited liability or outside investment",
        "Partners who want the option to register with the Registrar of Firms now or later, as their business needs change",
      ],
      outcomes: [
        "A legally valid Partnership Deed defining each partner's capital, profit share, and responsibilities",
        "A firm PAN and, if you choose registration, a Certificate of Registration from the Registrar of Firms",
      ],
      includes: [
        "Partnership Deed drafting, covering capital, profit-sharing, and partner responsibilities",
        "Deed notarisation and stamp paper coordination",
        "Firm PAN application",
        "Registrar of Firms registration, if you choose to register",
        "WhatsApp progress updates through the process",
      ],
      process: [
        {
          title: "Deed drafting",
          body: "We draft the Partnership Deed covering capital contribution, profit and loss sharing, and each partner's role and authority.",
        },
        {
          title: "Notarisation and stamping",
          body: "The deed is executed on stamp paper and notarised. Stamp duty is calculated on your capital contribution and varies by state.",
        },
        {
          title: "Firm PAN application",
          body: "The firm applies for its own PAN, separate from each partner's individual PAN, needed for banking, GST, and tax filing.",
        },
        {
          title: "Registrar of Firms registration, if chosen",
          body: "Registration under Section 58 of the Indian Partnership Act, 1932 is optional but strengthens the firm's legal standing. We file Form 1 with the deed and required documents.",
        },
      ],
    },
    heroNote:
      "The {{FEE}} professional fee excludes stamp duty on the Partnership Deed and the Registrar of Firms' registration fee, if you choose to register. Figures on this page use Tamil Nadu's schedule; other states set their own rates and may vary.",
    decisionFramework: {
      heading: "Who should, and should not, form a partnership firm.",
      intro:
        "Form a partnership firm if two or more of you want a simple, documented arrangement without company-level compliance, and you're comfortable with personal liability. Choose an LLP or Private Limited Company instead if you want limited liability, and a sole proprietorship if there's actually only one owner.",
      chooseInstead: [
        {
          structure: "LLP",
          when: "you want limited liability for every partner without giving up the partnership structure.",
          href: "/services/llp-registration",
        },
        {
          structure: "Private Limited Company",
          when: "you plan to raise equity funding or need the credibility of a registered company.",
          href: "/services/pvt-ltd-registration",
        },
        {
          structure: "Sole proprietorship",
          when: "there's actually only one owner, not two or more partners.",
          href: "/services/proprietorship-registration",
        },
      ],
    },
    structureComparison: {
      columns: ["Partnership Firm", "LLP", "Private Limited", "Proprietorship"],
      rows: [
        {
          factor: "Liability",
          values: [
            "Unlimited, joint and several across partners",
            "Limited to capital contribution",
            "Limited to shares held",
            "Unlimited, personal",
          ],
        },
        {
          factor: "Legal identity",
          values: [
            "Not a separate legal entity from its partners",
            "Separate legal entity",
            "Separate legal entity",
            "Same legal person as the owner",
          ],
        },
        {
          factor: "Registration",
          values: [
            "Optional, with the state Registrar of Firms",
            "Mandatory, with the MCA",
            "Mandatory, with the MCA",
            "No central registration; Udyam and GST as needed",
          ],
        },
        {
          factor: "Number of owners",
          values: ["2 to 50 partners", "2 partners, no upper limit", "2 to 200 shareholders", "1"],
        },
        {
          factor: "Compliance load",
          values: [
            "Lowest of the registered structures: ITR only, no ROC filings",
            "Moderate: Form 8, Form 11, audit only above threshold",
            "Highest: mandatory audit, AOC-4, MGT-7",
            "Lowest: ITR and GST returns only",
          ],
        },
        {
          factor: "Investor/lender credibility",
          values: ["Low to moderate", "Moderate", "Highest", "Lowest"],
        },
      ],
    },
    documentGroups: [
      {
        title: "All partners",
        note: "Address proof must not be older than 2 months.",
        items: [
          "PAN card of each partner, with name matching Aadhaar exactly",
          "Aadhaar card of each partner",
          "Recent passport-size photograph of each partner",
          "Address proof: bank statement, electricity, or mobile bill (within 2 months)",
          "Identity proof: voter ID, driving licence, or passport",
        ],
      },
      {
        title: "Firm's place of business",
        items: [
          "Utility bill: electricity, water, or gas (within 2 months), or a rent agreement",
          "No Objection Certificate from the property owner, mandatory when rented or family-owned",
        ],
      },
    ],
    timeline: [
      { day: "Day 1-3", milestone: "Deed drafted and reviewed with all partners" },
      { day: "Day 3-5", milestone: "Deed executed on stamp paper and notarised" },
      { day: "Day 5-7", milestone: "Firm PAN application filed" },
      {
        day: "Day 7-10",
        milestone: "Registrar of Firms application (Form 1) filed, if registration is chosen",
      },
      {
        day: "Day 10-15",
        milestone:
          "Registrar of Firms processes the application; Certificate of Registration issued",
      },
    ],
    costBreakdown: {
      intro:
        "A partnership firm has no MCA incorporation cost, but stamp duty on the deed and the optional Registrar of Firms fee both vary by state and by your capital contribution. Expect a realistic all-in range of roughly ₹10,000 to ₹25,000 for the full first year, not the {{FEE}} headline figure alone.",
      rows: [
        {
          item: "Professional fee (deed and registration support)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Stamp duty on the Partnership Deed",
          when: "At execution",
          range: "Varies by state and capital contribution",
          includedInFee: "No, statutory",
        },
        {
          item: "Notarisation charges",
          when: "At execution",
          range: "₹500 – ₹2,000",
          includedInFee: "No",
        },
        {
          item: "Registrar of Firms registration fee, if chosen",
          when: "At filing",
          range: "Varies by state",
          includedInFee: "No, statutory",
        },
        {
          item: "Firm PAN application",
          when: "At filing",
          range: "Nominal NSDL fee, billed at cost",
          includedInFee: "Yes, professional handling",
        },
        {
          item: "ITR filing (firm, Form ITR-5)",
          when: "Annual",
          range: "₹3,000 – ₹8,000",
          includedInFee: "No",
        },
        {
          item: "Statutory audit, if turnover crosses the threshold",
          when: "Before the ITR due date",
          range: "₹8,000 – ₹20,000",
          includedInFee: "No",
        },
        {
          item: "Basic bookkeeping",
          when: "Monthly/quarterly",
          range: "₹2,000 – ₹6,000/month",
          includedInFee: "No",
        },
      ],
      note: "The {{FEE}} professional fee covers deed drafting, notarisation coordination, firm PAN application, and Registrar of Firms filing if you choose to register. Stamp duty and the Registrar's own fee are billed at actual cost since they vary by state.",
    },
    rejectionReasons: [
      {
        reason: "Capital or profit-share figures don't add up",
        detail:
          "The deed's stated capital contributions and profit-sharing ratios must be internally consistent and match what's declared to the Registrar of Firms. We reconcile these before filing.",
      },
      {
        reason: "Insufficient stamp duty paid",
        detail:
          "Each state sets its own stamp duty schedule for partnership deeds, based on capital contribution. Under-stamping is a common reason deeds get challenged later. We calculate the correct duty before execution.",
      },
      {
        reason: "Address proof older than 2 months",
        detail:
          "The single most common clerical rejection. We date-check every document before submission.",
      },
      {
        reason: "Missing NOC for the firm's place of business",
        detail:
          "Rented or family-owned premises need a signed No Objection Certificate, collected before a query is raised.",
      },
      {
        reason: "PAN-Aadhaar name mismatch",
        detail:
          "Even a missing middle initial triggers a flag, across any partner. We cross-verify every partner's documents before filing.",
      },
      {
        reason: "Firm name conflicts with an existing trademark or registered business",
        detail:
          "Unlike a company name, a partnership firm's name isn't checked against the MCA register before you start using it, which makes an independent trademark check even more important. We run this check before you commit to a name.",
      },
    ],
    complianceCalendar: [
      {
        milestone: "Partnership Deed execution and stamping",
        dueBy: "At formation",
        penalty:
          "An insufficiently stamped deed can be impounded and isn't admissible as evidence in court until the deficient duty and penalty are paid",
      },
      {
        milestone: "Firm PAN application",
        dueBy: "Soon after formation",
        penalty:
          "Banks and GST registration require a firm PAN, so delays here cascade into other setup steps",
      },
      {
        milestone: "Registrar of Firms registration, if chosen",
        dueBy: "Any time after formation",
        penalty:
          "An unregistered firm cannot sue a third party or a partner to enforce a contractual right arising from its business, under Section 69 of the Indian Partnership Act, 1932",
      },
      {
        milestone: "Statutory audit, if threshold crossed",
        dueBy: "Before the ITR due date",
        penalty: "Penalty under Section 271B for failing to get accounts audited when required",
      },
      {
        milestone: "ITR filing (Form ITR-5)",
        dueBy:
          "31 July for non-audit cases, 31 October if tax audit applies (confirm the date for the applicable year)",
        penalty: "Interest under Section 234A/B/C",
      },
    ],
    localNote: {
      heading: "Forming a partnership firm from Chennai or Tamil Nadu",
      body: "Partnership Deed stamp duty and Registrar of Firms registration are both handled at the state level, so Tamil Nadu has its own stamp duty schedule and its own Registrar of Firms office and process, distinct from other states. We coordinate directly with the Chennai Registrar of Firms office for registered deeds. Founders who prefer to hand over physical documents rather than scan and upload them can do so at our Anna Nagar West office before we file.",
    },
    scopeTable: {
      included: [
        "Partnership Deed drafting, covering capital, profit-sharing, and responsibilities",
        "Deed notarisation coordination",
        "Firm PAN application",
        "Registrar of Firms registration filing, if you choose to register",
        "Document preparation and eligibility review",
        "WhatsApp progress updates through the process",
        "Dedicated case owner as single point of contact",
      ],
      excluded: [
        "Stamp duty on the Partnership Deed (state-specific, based on capital contribution)",
        "Registrar of Firms registration fee, if you choose to register (state-specific)",
        "GST registration",
        "Statutory audit, if your turnover crosses the threshold",
        "ITR filing",
        "Bookkeeping or trademark registration for your firm name",
      ],
    },
    faqs: [
      {
        question:
          "What is the real, total cost of forming a partnership firm, not just the professional fee?",
        answer:
          "Budget ₹10,000 to ₹25,000 for the full first year, not {{FEE}} alone. That figure covers the professional fee, stamp duty, the Registrar of Firms fee if you register, and your firm's first ITR filing.",
      },
      {
        question: "Are there hidden charges on top of the {{FEE}} professional fee?",
        answer:
          "No. Stamp duty and the Registrar of Firms fee are billed at actual cost because both vary by state and by your capital contribution. Every cost is listed before you pay.",
      },
      {
        question: "Do I legally have to register my partnership firm with the Registrar of Firms?",
        answer:
          "No. Registration under the Indian Partnership Act, 1932 is optional. An unregistered firm is legally valid and can operate, but it cannot sue a third party or a partner to enforce a contractual right arising from its business until it registers.",
      },
      {
        question: "Does FirstMan offer a refund if the registration doesn't go through?",
        answer:
          "Talk to your case owner about our refund policy for the specific reason a filing didn't proceed. It differs depending on whether the cause was a departmental rejection or a change on your side.",
      },
      {
        question: "Can I use a residential address as my firm's place of business?",
        answer:
          "Yes. There's no requirement for a commercial address. A residential address works with valid ownership or rental proof, and an NOC from the owner if it isn't in a partner's own name.",
      },
      {
        question: "What happens if I don't stamp the Partnership Deed correctly?",
        answer:
          "An insufficiently stamped deed can be impounded, and it isn't admissible as evidence in court until the deficient duty, plus a penalty, is paid. We calculate the correct stamp duty for your state before execution.",
      },
      {
        question: "Do I need GST registration for my partnership firm?",
        answer:
          "Not immediately, unless you cross the GST turnover threshold, sell across state lines, or sell on e-commerce platforms, all of which require registration regardless of turnover.",
      },
      {
        question: "Is a partnership firm's income taxed differently from a company's?",
        answer:
          "The firm pays tax on its own profits, and each partner's share of that already-taxed profit is generally not taxed again in their individual hands, unlike how company profits and dividends can each attract tax.",
      },
      {
        question: "Can I convert my partnership firm into an LLP or Private Limited Company later?",
        answer:
          "Yes. A partnership firm can convert into an LLP under the LLP Act, 2008, or register as a company under the Companies Act, 2013, once you're ready for limited liability or outside investment.",
      },
      {
        question: "How long does partnership firm formation actually take?",
        answer:
          "Typically 7 business days for the deed, stamping, and firm PAN alone. If you choose to also register with the Registrar of Firms, add several more business days, since state timelines vary and can run past 15 business days during high-volume periods.",
      },
      {
        question: "Do I need a minimum capital to form a partnership?",
        answer:
          "No. There is no statutory minimum capital contribution for a partnership firm. Partners decide the contribution and profit-sharing ratio between themselves in the deed.",
      },
      {
        question: "Can partners be personally liable for each other's actions in the firm?",
        answer:
          "Yes. Every partner in a traditional partnership firm has unlimited, joint and several liability for the firm's debts and for actions other partners take in the ordinary course of the firm's business. This is the main reason growing partnerships often convert to an LLP.",
      },
      {
        question: "Can a foreign national be a partner in an Indian partnership firm?",
        answer:
          "This is not straightforward. Foreign investment into an unincorporated Indian partnership firm is restricted under FEMA rules and generally needs Reserve Bank of India approval. An LLP or Private Limited Company is usually the workable route instead.",
      },
      {
        question: "What is the maximum number of partners a firm can have?",
        answer:
          "Up to 50 partners, under the Companies Act, 2013 read with its rules. Beyond that, the association must register as a company.",
      },
      {
        question: "Can I register a partnership firm entirely online without visiting Chennai?",
        answer:
          "Deed drafting and firm PAN application can be handled entirely online. Registrar of Firms registration, where the process allows it, can also often be filed online, though some state offices still expect physical submission. The Anna Nagar West office is available if you prefer in-person handover.",
      },
      {
        question: "What happens if I don't file my firm's ITR on time?",
        answer:
          "Interest applies on any unpaid tax, and repeated non-filing can affect the firm's compliance standing and each partner's own tax position, since your share of firm profit flows into your individual return.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "Partnership Firm Registration India",
    metaDescription:
      "Partnership firm registration (deed, stamping, and optional Registrar of Firms filing) from {{FEE}} professional fee.",
  },
  "gst-registration": {
    base: {
      eyebrow: "GST Registration",
      summary:
        "GST registration is the process of obtaining a GSTIN under the Central Goods and Services Tax Act, 2017, by filing Form REG-01 on the GST portal. It becomes mandatory once your turnover crosses ₹40 lakh for goods (₹20 lakh in special category states) or ₹20 lakh for services (₹10 lakh in special category states) — or immediately, regardless of turnover, if you supply goods inter-state, sell through an e-commerce operator, or operate as a casual taxable person. FirstMan's professional fee starts at {{FEE}}; the government itself charges no fee for GST registration.",
      idealFor: [
        "Businesses that have crossed, or are about to cross, the ₹40 lakh/₹20 lakh turnover threshold (₹20 lakh/₹10 lakh in special category states)",
        "Anyone required to register regardless of turnover: inter-state goods suppliers, e-commerce sellers, and casual taxable persons",
        "Businesses that need input tax credit on purchases, or a GSTIN to bid for B2B and government contracts",
      ],
      outcomes: [
        "A 15-digit GSTIN (Goods and Services Tax Identification Number)",
        "Registration certificate (Form REG-06)",
        "Aadhaar-authenticated promoter/signatory profile on the GST portal",
        "A confirmed return-filing schedule — monthly, quarterly, or composition",
      ],
      includes: [
        "Threshold and mandatory-registration check specific to your business",
        "REG-01 preparation: business details, principal place of business, bank details, HSN/SAC mapping",
        "Aadhaar authentication coordination for every promoter and authorised signatory",
        "REG-03 clarification response, if the department raises one",
        "WhatsApp progress updates through approval",
      ],
      process: [
        {
          title: "Eligibility and scheme check",
          body: "We confirm whether registration is mandatory for you yet, and whether the composition scheme or regular registration fits your turnover and sales pattern better.",
        },
        {
          title: "REG-01 preparation and Aadhaar authentication",
          body: "We prepare your business, promoter, and bank details, map your goods/services to the correct HSN/SAC codes, and coordinate OTP-based Aadhaar authentication for every promoter and signatory.",
        },
        {
          title: "Filing and query response",
          body: "REG-01 is filed on the GST portal. If the department raises a REG-03 clarification, we prepare and file the REG-04 response within the 7-working-day window.",
        },
        {
          title: "GSTIN issuance and onboarding",
          body: "Once approved, your GSTIN and REG-06 certificate are issued, and we brief you on your confirmed return-filing cadence and due dates.",
        },
      ],
    },
    heroNote:
      "GST registration carries no government fee — the {{FEE}} figure is FirstMan's professional fee for preparing and filing your application end to end, including REG-03 query handling if one is raised.",
    documentGroups: [
      {
        title: "Identity and business",
        note: "Names across PAN, Aadhaar, and the application must match exactly — a mismatch is one of the most common query triggers.",
        items: [
          "PAN card of the business/proprietor/partners/directors",
          "Aadhaar card, for OTP-based authentication",
          "Passport-size photograph of each proprietor/partner/director",
          "Certificate of incorporation or partnership deed, for companies/LLPs/firms",
        ],
      },
      {
        title: "Principal place of business",
        note: "Address proof must clearly establish the premises as your place of business.",
        items: [
          "Electricity, water, or property tax receipt (recent)",
          "Rent/lease agreement, where the premises is rented",
          "No Objection Certificate from the owner, where applicable",
        ],
      },
      {
        title: "Bank details",
        note: "The account name must match your PAN/entity name exactly, and the cheque or statement image must be clearly legible.",
        items: ["Cancelled cheque, or the first page of a bank passbook/statement"],
      },
    ],
    timeline: [
      { day: "Day 1", milestone: "Documents collected; HSN/SAC codes confirmed; REG-01 drafted" },
      {
        day: "Day 1-2",
        milestone: "REG-01 filed; Aadhaar authentication completed by every promoter/signatory",
      },
      {
        day: "Day 3",
        milestone: "Deemed approval if Aadhaar-authenticated and flagged low-risk (Rule 14A)",
      },
      {
        day: "Day 4-7",
        milestone: "Standard-track approval, or a REG-03 query raised and answered via REG-04",
      },
      {
        day: "Up to Day 30",
        milestone:
          "If routed to physical verification (failed/skipped Aadhaar authentication), an officer visits the premises before approval",
      },
    ],
    costBreakdown: {
      intro:
        "GST registration itself is free from the government — the cost most businesses underestimate isn't the registration step, it's the recurring return-filing cycle that starts the moment your GSTIN is issued, whether or not you've made a sale yet.",
      rows: [
        {
          item: "Professional fee (registration)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Government fee",
          when: "At filing",
          range: "Nil",
          includedInFee: "No fee exists",
        },
        {
          item: "Digital Signature Certificate (companies/LLPs only)",
          when: "At filing, if applicable",
          range: "₹1,500 – ₹3,000",
          includedInFee: "No, at cost",
        },
        {
          item: "GSTR-1 + GSTR-3B filing",
          when: "Monthly or quarterly (QRMP)",
          range: "₹500 – ₹2,000 per return",
          includedInFee: "No",
        },
        {
          item: "CMP-08 filing (composition scheme)",
          when: "Quarterly, if opted",
          range: "₹500 – ₹1,500 per quarter",
          includedInFee: "No",
        },
        {
          item: "GSTR-9 annual return",
          when: "Annual, mandatory above ₹2 crore turnover",
          range: "₹3,000 – ₹10,000",
          includedInFee: "No",
        },
        {
          item: "Late filing fee, if a return is missed",
          when: "Per return, per day of delay",
          range: "₹20 – ₹50/day, capped by turnover slab",
          includedInFee: "No, statutory",
        },
      ],
      note: "Nil returns still have to be filed every period, even with zero sales — missing that deadline attracts the same late fee as a real return.",
    },
    rejectionReasonsKicker: "Avoid a REG-03 query",
    rejectionReasonsHeading:
      "Why GST applications get flagged for clarification, and how we prevent it.",
    rejectionReasons: [
      {
        reason: "Address proof issues",
        detail:
          "An outdated document, the wrong format, or proof that doesn't clearly establish commercial use of the premises. We format-check and date-check every document before filing.",
      },
      {
        reason: "Bank account proof mismatch",
        detail:
          "The account name not matching the applicant/entity name, or an unclear cancelled cheque or statement image. We verify this before submission, not after a query.",
      },
      {
        reason: "PAN mismatch",
        detail: "A name or detail on the application not matching PAN records exactly.",
      },
      {
        reason: "DSC issues for companies and LLPs",
        detail:
          "An expired, improperly installed, or mismatched Class III DSC blocks validation. We check DSC validity against your actual filing date.",
      },
      {
        reason: "Aadhaar authentication failure",
        detail:
          "A failed or skipped Aadhaar OTP authentication routes the application straight to mandatory physical verification, adding up to 30 working days. We walk every promoter and signatory through this step before submission.",
      },
      {
        reason: "Incorrect HSN/SAC codes",
        detail:
          "A classification that doesn't match your actual goods or services can trigger a departmental query on its own.",
      },
    ],
    complianceKicker: "After registration",
    complianceHeading: "What compliance follows, and by when.",
    complianceCalendar: [
      {
        milestone: "GSTR-1 (outward supplies)",
        dueBy: "Monthly, or quarterly under QRMP",
        penalty: "Late fee ₹50/day (₹20/day for nil returns), capped by turnover slab",
      },
      {
        milestone: "GSTR-3B (summary return and tax payment)",
        dueBy: "Monthly, or quarterly under QRMP",
        penalty: "Late fee plus 18% p.a. interest on the tax due",
      },
      {
        milestone: "CMP-08 (composition scheme)",
        dueBy: "Quarterly, if opted for composition",
        penalty: "Late fee applies; repeated default can end composition eligibility",
      },
      {
        milestone: "GSTR-9 (annual return)",
        dueBy: "31 December, mandatory above ₹2 crore turnover",
        penalty: "Late fee ₹200/day (₹100 CGST + ₹100 SGST), capped by turnover",
      },
      {
        milestone: "E-way bill, for applicable consignments",
        dueBy: "Before goods movement",
        penalty: "Goods can be detained in transit without a valid e-way bill",
      },
    ],
    localNote: {
      heading: "Filed against your Tamil Nadu GST jurisdiction.",
      body: "Your application is processed by the state or central GST officer assigned to your principal place of business's ward or circle. For businesses registering in Chennai and across Tamil Nadu, we confirm the correct jurisdiction before filing so the application reaches the right desk the first time, not after a REG-03 query about it.",
    },
    scopeIntro:
      "GST registration has no government fee, so the scope split below is about what's a one-time filing task versus what becomes an ongoing, separately billed obligation once your GSTIN is live.",
    scopeTable: {
      included: [
        "Eligibility and mandatory-registration check",
        "REG-01 preparation and filing",
        "Aadhaar authentication coordination for all promoters/signatories",
        "HSN/SAC classification for your goods/services",
        "REG-03 clarification response, if raised",
        "GSTIN and registration certificate (REG-06) handover",
        "WhatsApp progress updates through approval",
      ],
      excluded: [
        "Monthly/quarterly GSTR-1 and GSTR-3B filing (a separate recurring engagement)",
        "Digital Signature Certificate, for companies/LLPs where required",
        "Physical verification visit coordination, if the application is routed to that track",
        "Composition-to-regular (or regular-to-composition) scheme switch",
        "Amendment or cancellation of an existing GSTIN",
      ],
    },
    faqs: [
      {
        question: "Is there really no government fee for GST registration?",
        answer:
          "Correct — GST registration carries no government fee. If a quote you've received lists a separate 'government fee' for GST registration alone, ask what it's actually covering.",
      },
      {
        question: "What's the real penalty if I operate without registering when I'm required to?",
        answer:
          "Under Section 122 of the CGST Act, ₹10,000 or 10% of the tax due, whichever is higher, for an unintentional default — up to 100% of the tax due for deliberate evasion, plus 18% p.a. interest on the unpaid tax. Input tax credit for your unregistered period cannot be claimed back once you do register.",
      },
      {
        question: "Do I have to register even if my turnover is below the threshold?",
        answer:
          "Yes, in specific cases, regardless of turnover: inter-state supply of goods, selling through an e-commerce operator, or operating as a casual taxable person. Inter-state service providers get a threshold exemption that inter-state goods sellers don't.",
      },
      {
        question: "How long does GST registration actually take?",
        answer:
          "3 working days if your application is Aadhaar-authenticated and flagged low-risk under Rule 14A's deemed-approval track, 7 working days on the standard track, and up to 30 working days if it's routed to physical verification.",
      },
      {
        question: "What happens if the department raises a REG-03 query?",
        answer:
          "You get 7 working days to respond using Form REG-04. Missing that window leads to automatic rejection under CGST Rule 9, and you'd need to file a fresh application from scratch.",
      },
      {
        question: "Should I register under the composition scheme instead of regular GST?",
        answer:
          "Composition suits small goods businesses (turnover up to ₹1.5 crore, ₹75 lakh in special category states) that don't need input tax credit and don't sell inter-state. Talk to us before choosing — switching schemes later is a formal process, not a checkbox change.",
      },
      {
        question: "Can I claim input tax credit for purchases made before my GSTIN was issued?",
        answer:
          "No. Input tax credit for your unregistered period cannot be claimed retroactively once you register.",
      },
      {
        question: "What if my Aadhaar authentication fails?",
        answer:
          "Your application is routed to mandatory physical verification of the business premises, which can extend approval to up to 30 working days. We prepare you for this possibility before it happens, not after.",
      },
      {
        question: "Do I need a separate GST registration in every state I operate in?",
        answer:
          "Yes. GST registration is state-wise — a separate GSTIN is needed for each state where you have a place of business or cross the applicable threshold.",
      },
      {
        question: "What's the difference between my PAN and my GSTIN?",
        answer:
          "PAN is your permanent income-tax identity. GSTIN is a 15-digit number derived from your PAN plus your state code, issued specifically for GST compliance.",
      },
      {
        question: "What happens immediately after I get my GSTIN?",
        answer:
          "Monthly or quarterly return filing begins right away — GSTR-1 and GSTR-3B, or CMP-08 under composition — regardless of whether you've made any sales yet. Nil returns still have to be filed.",
      },
      {
        question: "Can I cancel my GST registration if I stop the business?",
        answer:
          "Yes, through a separate cancellation application — it doesn't happen automatically just because you stop filing returns, and any unfiled returns before cancellation still attract late fees.",
      },
      {
        question: "Do I need a commercial address for GST registration?",
        answer:
          "Not necessarily — a residential address works in most states with valid ownership or rental proof, though some states expect specific documentation for home-based businesses. We confirm your state's exact requirement before filing.",
      },
      {
        question: "Is a Digital Signature Certificate compulsory for GST registration?",
        answer:
          "Only for companies and LLPs, which must file using a Class III DSC. Proprietorships and most partnerships can complete authentication through Aadhaar e-sign instead.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "GST Registration Online India — GSTIN in 3-7 Business Days",
    metaDescription:
      "GST registration with no government fee — {{FEE}} professional fee only. Aadhaar-authenticated approval in 3-7 working days, REG-03 query handling included.",
  },
  "msme-udyam-registration": {
    base: {
      eyebrow: "Udyam / MSME Registration",
      summary:
        "Udyam registration is the process of self-declaring your business as a Micro, Small, or Medium Enterprise on the government's Udyam portal, using only Aadhaar and PAN — no documents are uploaded, and the process is completely free. Effective 1 April 2025, the classification limits were revised upward: Micro enterprises can have investment up to ₹2.5 crore and turnover up to ₹10 crore, Small up to ₹25 crore/₹100 crore, and Medium up to ₹125 crore/₹500 crore. FirstMan's {{FEE}} professional fee covers getting your classification and NIC code right the first time; the government charges nothing.",
      idealFor: [
        "Businesses that qualify as Micro, Small, or Medium under the revised limits (investment up to ₹125 crore, turnover up to ₹500 crore) and want the payment-protection, tender, and lending advantages that come with it",
        "Vendors and suppliers who need Udyam status to bid for MSME-reserved government tenders and procurement",
        "Businesses that want to be paid on time — a buyer purchasing from a Udyam-registered Micro or Small enterprise must pay within 45 days or owe compound interest",
      ],
      outcomes: [
        "A Udyam Registration Number and permanent certificate, with no renewal ever required",
        "Correct Micro/Small/Medium classification based on verified investment and turnover",
        "Legal standing to invoke the 45-day payment protection under the MSMED Act, 2006",
        "Eligibility for MSME-reserved government tenders and procurement exemptions",
      ],
      includes: [
        "Aadhaar and PAN verification, and NIC code selection matched to your actual business activity",
        "Investment and turnover figures reconciled against your ITR/GST data before submission",
        "Udyam Registration Number and certificate handover",
        "Guidance on the mandatory annual data update and reclassification rule",
        "WhatsApp progress updates through certificate issuance",
      ],
      process: [
        {
          title: "Eligibility and classification check",
          body: "We confirm your investment and turnover fall within the revised Micro/Small/Medium limits and work out the correct classification before filing — the stricter of the two figures decides it, not whichever category you'd prefer.",
        },
        {
          title: "NIC code and data preparation",
          body: "We match your business activity to the correct National Industrial Classification code — a wrong code blocks activity-specific scheme access even after you're registered — and prepare your Aadhaar, PAN, GSTIN, and bank details.",
        },
        {
          title: "Self-declaration filing",
          body: "Details are submitted on the Udyam portal, where they're validated in real time against Income Tax and GST records — no documents are uploaded.",
        },
        {
          title: "Certificate issuance and annual-update briefing",
          body: "Your Udyam Registration Number and certificate are issued instantly on successful validation. We brief you on the mandatory annual data refresh due every year by 31 March.",
        },
      ],
    },
    heroNote:
      "Udyam registration itself is completely free from the government and, once your details validate cleanly, is typically instant. The {{FEE}} professional fee is for getting your classification and NIC code right the first time — an error there means the wrong scheme access later, not a form rejection you'd notice immediately.",
    costBreakdown: {
      intro:
        "Udyam has no recurring government cost at all: a permanent certificate, a free annual update, and no renewal step. The only 'cost' most businesses run into is paying a third party for something the portal already does for free.",
      rows: [
        {
          item: "Professional fee (registration)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Government fee",
          when: "At filing",
          range: "Nil",
          includedInFee: "No fee exists",
        },
        {
          item: "Annual data update (turnover/investment refresh)",
          when: "Every year, by 31 March",
          range: "Nil — self-service on the official portal",
          includedInFee: "No fee exists",
        },
        {
          item: '"Udyam renewal" fee some third-party sites charge',
          when: "N/A",
          range: "₹0 — there is no renewal requirement",
          includedInFee: "Not a real government charge",
        },
      ],
      note: "If a website asks you to pay a 'Udyam renewal fee' or a periodic certificate fee, it isn't part of the official process — Udyam registration never expires and never needs renewing.",
    },
    rejectionReasonsKicker: "Avoid a stuck application",
    rejectionReasonsHeading: "Why Udyam applications get stuck, and how we prevent it.",
    rejectionReasons: [
      {
        reason: "Aadhaar or PAN typo",
        detail:
          "Even a single incorrect digit in a 12-digit Aadhaar or 10-digit PAN blocks validation outright. We verify both before submission.",
      },
      {
        reason: "Wrong NIC code",
        detail:
          "The NIC code decides scheme eligibility, not just a label — a software company filed under a manufacturing code can't access IT/ITeS-specific schemes even after registering. We match your actual activity to the correct code.",
      },
      {
        reason: "Turnover/investment figures that don't reconcile with ITR or GST",
        detail:
          "The portal cross-checks your declared figures against Income Tax and GST records in real time; a mismatch stalls validation. We reconcile your figures before you submit.",
      },
      {
        reason: "Self-classifying into a preferred category",
        detail:
          "Classification uses whichever of investment or turnover puts you in the stricter, lower category — not whichever you'd prefer. We calculate this correctly rather than let you guess and get flagged.",
      },
      {
        reason: "Skipping the mandatory annual update",
        detail:
          "Not a filing-stage rejection, but a live registration going stale — unreported growth or ownership changes cause data mismatches that can affect access to newer scheme benefits later.",
      },
    ],
    complianceKicker: "After registration",
    complianceHeading: "The one thing you actually have to do afterward.",
    complianceCalendar: [
      {
        milestone: "Annual data update (turnover/investment)",
        dueBy: "By 31 March every year",
        penalty: "No fine, but stale data can delay reclassification and scheme access",
      },
      {
        milestone: "Reclassification on upward growth",
        dueBy: "Takes effect the following financial year",
        penalty: "None — a transition year is built in automatically",
      },
      {
        milestone: "Reclassification on downward shrinkage",
        dueBy: "Takes effect immediately",
        penalty: "None — reclassification to the lower category is immediate",
      },
      {
        milestone: "Update after ownership or structure changes",
        dueBy: "As soon as they happen",
        penalty: "Portal data falls out of sync with your GST/Income Tax records if not updated",
      },
    ],
    scopeIntro:
      "Udyam registration has no government fee, so this split is about what we handle as the one-time filing versus what stays a quick, free, self-service step on your side afterward.",
    scopeTable: {
      included: [
        "Eligibility and classification check",
        "NIC code selection matched to your actual business",
        "Aadhaar/PAN/GSTIN/bank data preparation",
        "Udyam Registration Number and certificate handover",
        "Guidance on the mandatory annual update",
        "WhatsApp progress updates through certificate issuance",
      ],
      excluded: [
        "The annual data update itself in future years (free, self-service — we'll remind you)",
        "GST or Income Tax return filing that the update depends on",
        "Correction of an existing Udyam registration filed elsewhere",
        "Scheme-specific applications that use your Udyam status, such as collateral-free loan schemes",
      ],
    },
    faqs: [
      {
        question: "Is Udyam registration really free?",
        answer:
          "Yes, completely free directly through the government portal. Our {{FEE}} professional fee is for getting your classification, NIC code, and data right the first time.",
      },
      {
        question: "What are the current Micro/Small/Medium limits?",
        answer:
          "Effective 1 April 2025: Micro up to ₹2.5 crore investment / ₹10 crore turnover; Small up to ₹25 crore / ₹100 crore; Medium up to ₹125 crore / ₹500 crore.",
      },
      {
        question: "Do I need to upload any documents?",
        answer:
          "No. Udyam is a no-upload, self-declaration system based only on your Aadhaar and PAN, cross-verified against your Income Tax and GST records.",
      },
      {
        question:
          "How is my classification decided if my investment and turnover fall into different categories?",
        answer:
          "The stricter of the two applies. If your investment qualifies as Small but your turnover qualifies as Micro, you're classified as Micro.",
      },
      {
        question: "Do I have to renew my Udyam certificate?",
        answer:
          "No. It's a one-time, permanent certificate. If any website charges you a 'renewal fee,' it isn't part of the official process.",
      },
      {
        question: "What is the mandatory annual update, and what happens if I skip it?",
        answer:
          "You must refresh your turnover/investment figures by 31 March every year, based on your latest GST/ITR data. Skipping it doesn't cancel your registration, but stale data can affect scheme eligibility and delay reclassification.",
      },
      {
        question: "What's the 45-day payment rule, and does it actually help?",
        answer:
          "Any buyer purchasing from a Udyam-registered Micro or Small enterprise must pay within 45 days, or the agreed period if shorter. Delayed payment attracts compound interest at three times the RBI-notified rate, and that interest isn't deductible as a business expense for the buyer — a real financial incentive, not just a paper right.",
      },
      {
        question: "Can traders — retailers and wholesalers — register under Udyam?",
        answer:
          "Yes, for specified NIC codes covering trading activity, though scheme access differs from manufacturing and service enterprises.",
      },
      {
        question: "Does Udyam registration help with government tenders?",
        answer:
          "Yes. Many tenders are reserved for MSMEs, and registered enterprises get exemptions such as relaxed EMD and turnover eligibility during the application process.",
      },
      {
        question: "What happens if I outgrow my current classification?",
        answer:
          "Reclassification to a higher category applies from the following financial year, giving you a transition year. Reclassification to a lower category, if your business shrinks, applies immediately.",
      },
      {
        question: "Do exports count toward my turnover for classification?",
        answer:
          "No. Export turnover is excluded when calculating turnover for MSME classification.",
      },
      {
        question: "Is Udyam registration linked to my GST registration?",
        answer:
          "Yes. Your GSTIN, where applicable, is validated against the Udyam portal, and your turnover data for the annual update is drawn from your GST returns.",
      },
      {
        question: "Can I register under Udyam without a GSTIN?",
        answer:
          "Yes, if your business is exempt from mandatory GST registration — you can skip the GSTIN field and proceed with Aadhaar and PAN alone.",
      },
      {
        question: "What if I need my Udyam data corrected later?",
        answer:
          "Corrections and updates are made directly on the Udyam portal using your existing Udyam Registration Number — no fresh registration is needed.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "Udyam / MSME Registration Online — Free Process, Done Right",
    metaDescription:
      "Udyam registration with correct Micro/Small/Medium classification and NIC code selection. {{FEE}} professional fee; the government charges nothing.",
  },
  "iec-registration": {
    base: {
      eyebrow: "Import Export Code (IEC)",
      summary:
        "The Import Export Code (IEC) is a 10-digit, PAN-based identification number issued by the DGFT (Directorate General of Foreign Trade) that's mandatory for any commercial import or export from India. It's filed online via Form ANF-2A on the DGFT portal, carries a flat ₹500 government fee, and has lifetime validity with no renewal — but it must be updated online every year between April and June, or it gets deactivated. FirstMan's professional fee starts at {{FEE}}, separate from the ₹500 government fee.",
      idealFor: [
        "Businesses planning to import or export goods commercially — customs clearance is impossible without an active IEC",
        "Exporters who need IEC to receive payment through authorised banking channels or access government export incentive schemes",
        "Existing importers/exporters whose IEC has been deactivated for missing the annual April-June update window",
      ],
      outcomes: [
        "A 10-digit IEC certificate from DGFT, valid for life",
        "A PAN-based Importer Exporter Profile on the DGFT portal",
        "Confirmation of the mandatory annual update window so your IEC never lapses",
      ],
      includes: [
        "PAN, bank, and address-proof name reconciliation before filing, to prevent the single most common rejection cause",
        "ANF-2A preparation and filing on the DGFT portal",
        "Government fee (₹500) payment coordination",
        "Support through DGFT's NPCI-based real-time bank account validation",
        "WhatsApp progress updates through certificate issuance",
      ],
      process: [
        {
          title: "Name reconciliation across PAN, bank, and address proof",
          body: "We check your firm name, PAN name, and bank account name are identical before filing — this single mismatch, not a missing document, causes most IEC delays.",
        },
        {
          title: "ANF-2A preparation and filing",
          body: "The application is filed online on the DGFT portal with PAN, Aadhaar, address proof, bank certificate or cancelled cheque, and a photograph.",
        },
        {
          title: "Government fee payment and bank validation",
          body: "The ₹500 government fee is paid online, and your bank account is validated in real time under DGFT's NPCI-linked verification.",
        },
        {
          title: "Certificate issuance",
          body: "Once validated, your IEC certificate is issued by DGFT, typically within 1 to 3 business days.",
        },
      ],
    },
    heroNote:
      "The ₹500 DGFT government fee is separate from the {{FEE}} professional fee, and is paid directly on the government portal at the time of filing.",
    timeline: [
      {
        day: "Day 1",
        milestone: "Name reconciliation across PAN, bank, and address proof; ANF-2A drafted",
      },
      {
        day: "Day 1",
        milestone:
          "Application filed; ₹500 government fee paid; bank account validated in real time (NPCI-based)",
      },
      { day: "Day 2-3", milestone: "IEC certificate issued by DGFT" },
      {
        day: "If validation fails",
        milestone:
          'Application marked "Deficient" rather than rejected — corrected bank details resubmitted before issuance',
      },
    ],
    costBreakdown: {
      intro:
        "The only recurring cost of holding an IEC is remembering the free April-June annual update — miss it, and DGFT deactivates the code until it's refreshed, which can hold up a shipment at the worst possible time.",
      rows: [
        {
          item: "Professional fee (registration)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Government fee (DGFT)",
          when: "At filing",
          range: "₹500",
          includedInFee: "No, statutory",
        },
        {
          item: "Annual update (April-June window)",
          when: "Every year",
          range: "Nil — self-service on the DGFT portal",
          includedInFee: "No fee exists",
        },
        {
          item: "Reactivation after a missed annual update",
          when: "As needed",
          range: "Nil, but delays customs clearance until done",
          includedInFee: "No fee exists, but time-sensitive",
        },
      ],
      note: "Beyond the flat ₹500 government fee at filing, IEC has no other statutory charge — the annual update that keeps it active is also free.",
    },
    rejectionReasonsKicker: "Avoid a Deficient/Rejected status",
    rejectionReasonsHeading: "Why IEC applications get rejected, and how we prevent it.",
    rejectionReasons: [
      {
        reason: "Name mismatch between PAN and bank account",
        detail:
          'The single most common cause of delay — even "Pvt Ltd" versus "Private Limited" can trigger a manual review. We reconcile every name field before filing.',
      },
      {
        reason: "Failed real-time bank validation",
        detail:
          'DGFT\'s NPCI-linked check validates your PAN, name, and account number together; a mismatch marks the application "Deficient" rather than approved. We pre-check this before submission.',
      },
      {
        reason: "Address proof that doesn't match the application",
        detail: "An outdated or differently formatted address document raises a query on its own.",
      },
      {
        reason: "Incomplete or unclear document uploads",
        detail:
          "Scanned documents must be legible PDF/JPEG files — a blurry upload is a common, entirely avoidable delay.",
      },
      {
        reason: "Government fee not reflecting on the portal",
        detail:
          "Payment must clear and show up on the DGFT portal before the application proceeds. We confirm this rather than assume the filing is complete once payment is made.",
      },
    ],
    complianceKicker: "After issuance",
    complianceHeading: "The one annual task that keeps your IEC active.",
    complianceCalendar: [
      {
        milestone: "Annual IEC update",
        dueBy: "Every year, between April and June",
        penalty: 'IEC marked "deactivated" if missed — reactivation needed before further use',
      },
      {
        milestone: "Reactivation after deactivation",
        dueBy: "As soon as noticed",
        penalty: "Customs clearance blocked until the code is reactivated",
      },
      {
        milestone: "Modification after firm, bank, or address changes",
        dueBy: "As soon as they happen",
        penalty:
          "DGFT records fall out of sync, risking a bank-validation mismatch on future filings",
      },
    ],
    scopeIntro:
      "Beyond the flat ₹500 government fee, IEC has no other statutory charge — this split is about what's a one-time filing task versus what stays your responsibility every year afterward.",
    scopeTable: {
      included: [
        "Name reconciliation across PAN, bank, and address proof",
        "ANF-2A preparation and filing",
        "Government fee (₹500) payment coordination",
        "Support through DGFT's real-time bank account validation",
        "IEC certificate handover",
        "WhatsApp progress updates through certificate issuance",
      ],
      excluded: [
        "Annual April-June update in future years (free, self-service — we'll remind you)",
        "Import/export customs clearance and documentation for individual shipments",
        "Modification of an existing IEC — firm name, address, or bank change",
        "DGFT scheme-specific registration, such as RCMC or export incentive scheme applications",
      ],
    },
    faqs: [
      {
        question: "Does IEC expire or need renewal?",
        answer:
          "No, it has lifetime validity. But you must update it online every year between April and June, or DGFT deactivates it.",
      },
      {
        question: "What happens if I miss the annual update window?",
        answer:
          'DGFT marks the IEC "deactivated." It isn\'t cancelled, but customs clearance and export benefit access are blocked until you reactivate it by completing the update.',
      },
      {
        question: "What's the real cost of getting an IEC?",
        answer:
          "The {{FEE}} professional fee plus a flat ₹500 government fee — no other statutory charge exists, and the annual update afterward is free.",
      },
      {
        question: "Can I import or export without an IEC?",
        answer:
          "Not for commercial trade. Customs won't clear a commercial shipment without an active IEC. Certain narrow exemptions, such as personal-use goods not connected with trade, apply only in specific, notified cases — check with us if you think yours might qualify.",
      },
      {
        question: "Why do most IEC applications actually get delayed?",
        answer:
          "A name mismatch between your PAN, firm name, and bank account — not a missing document — causes most delays, especially since DGFT's real-time bank validation checks all three together.",
      },
      {
        question: "What is the new NPCI-based bank validation?",
        answer:
          "Since February 2026, DGFT validates your declared bank account in real time against NPCI records, checking your PAN, name, and account number together before accepting the application.",
      },
      {
        question: "What happens if bank validation fails?",
        answer:
          'The application is marked "Deficient" rather than rejected outright — you can correct the bank details and resubmit without starting the application over.',
      },
      {
        question: "Do I need a current account, or can I use a savings account?",
        answer:
          "DGFT doesn't mandate a current account specifically, but the account name must exactly match your PAN/firm name regardless of account type.",
      },
      {
        question: "Is IEC the same as GST registration?",
        answer:
          "No. GSTIN is for tax compliance; IEC is specifically for customs clearance and cross-border trade identification. Most exporters need both.",
      },
      {
        question: "Can a single person — a sole proprietor — get an IEC?",
        answer:
          "Yes. A sole proprietorship, partnership, LLP, or company can all apply, using the entity's PAN.",
      },
      {
        question: "Can I modify my IEC if my firm name or address changes?",
        answer:
          "Yes, through a modification application on the DGFT portal, separate from the initial registration.",
      },
      {
        question: "How fast can I actually get an IEC?",
        answer:
          "Typically 1 to 3 business days once your PAN, bank, and address details reconcile cleanly and the government fee reflects on the portal.",
      },
      {
        question: "Do I need a fresh IEC for every export shipment, or just once?",
        answer:
          "Just once. The same IEC covers all your future import/export shipments, as long as you keep it active with the annual update.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "Import Export Code (IEC) Registration — DGFT, ₹500 Govt Fee",
    metaDescription:
      "IEC registration in 1-3 business days. {{FEE}} professional fee plus the flat ₹500 DGFT government fee — no other statutory charge.",
  },
  "fssai-registration": {
    base: {
      eyebrow: "FSSAI Basic Registration",
      summary:
        "FSSAI Basic Registration is the mandatory food-safety registration for food business operators with an annual turnover up to ₹1.5 crore, filed through Form A on the FoSCoS portal. It carries a government fee of ₹100 per year and, for registrations granted from 1 April 2026 onward, perpetual validity with no renewal cycle. FirstMan's professional fee starts at {{FEE}}, separate from the government fee.",
      idealFor: [
        "Food businesses with annual turnover up to ₹1.5 crore — home kitchens, small manufacturers, petty food retailers, and single-outlet food service operators",
        "Businesses that need FSSAI compliance before they can legally sell, store, distribute, or manufacture any food product",
        "Operators who've outgrown a purely informal setup and need registration before a platform, distributor, or landlord will work with them",
      ],
      outcomes: [
        "An FSSAI Basic Registration certificate with a 14-digit registration number",
        "Compliance with Section 31 of the Food Safety and Standards Act, 2006, avoiding the Section 63 penalty for operating unregistered",
        "A registration number to display at your premises and print on packaging, as required",
      ],
      includes: [
        "Turnover check to confirm Basic Registration, not a State or Central License, is the correct category for you",
        "Form A preparation and filing on the FoSCoS portal",
        "Government fee (₹100/year) payment coordination",
        "Document review before upload to prevent the most common rejection triggers",
        "WhatsApp progress updates through certificate issuance",
      ],
      process: [
        {
          title: "Category and turnover check",
          body: "We confirm your annual turnover genuinely falls within the ₹1.5 crore Basic Registration band — above that, you'd need a State License instead, a different filing entirely.",
        },
        {
          title: "Form A preparation",
          body: "We prepare your business details, food category, and operator information for the simplified Form A application.",
        },
        {
          title: "FoSCoS filing and fee payment",
          body: "The application is filed online, and the ₹100/year government fee is paid and confirmed as reflecting on the portal.",
        },
        {
          title: "Certificate issuance",
          body: "Once the Designated Officer approves the application, your registration certificate is issued with your 14-digit FSSAI number.",
        },
      ],
    },
    heroNote:
      "The ₹100/year government fee is separate from the {{FEE}} professional fee. If your turnover is closer to, or above, ₹1.5 crore, tell us before we file — Basic Registration is the wrong category for a State License-eligible business, and choosing it anyway causes a rejection, not just a warning.",
    timeline: [
      {
        day: "Day 1-2",
        milestone: "Turnover/category check confirmed; Form A and documents prepared",
      },
      { day: "Day 3", milestone: "Application filed on FoSCoS; ₹100/year government fee paid" },
      {
        day: "Day 3-7",
        milestone:
          "Designated Officer reviews the application (up to 30 days if a query is raised and not promptly answered)",
      },
      { day: "Day 7", milestone: "Registration certificate issued, on a clean, query-free filing" },
    ],
    costBreakdown: {
      intro:
        "Basic Registration's government fee is genuinely small — the cost that actually catches food businesses out is staying on Basic Registration after their turnover has crossed into State License territory.",
      rows: [
        {
          item: "Professional fee (registration)",
          when: "At filing",
          range: "{{FEE}}",
          includedInFee: "Yes",
        },
        {
          item: "Government fee",
          when: "Per year of validity chosen",
          range: "₹100/year",
          includedInFee: "No, statutory",
        },
        {
          item: "State License, if turnover crosses ₹1.5 crore later",
          when: "At the time of crossing",
          range: "₹2,000 – ₹5,000/year",
          includedInFee: "No, a separate filing",
        },
        {
          item: "Renewal, for registrations issued before 1 April 2026",
          when: "Before the original validity term expires",
          range: "Same ₹100/year rate, for the renewed term",
          includedInFee: "No",
        },
      ],
      note: "Registrations issued from 1 April 2026 carry perpetual validity and never need renewal; ones issued before that date keep their original 1-to-5-year term and must still be renewed on schedule.",
    },
    rejectionReasonsKicker: "Avoid a rejected application",
    rejectionReasonsHeading: "Why FSSAI applications get rejected, and how we prevent it.",
    rejectionReasons: [
      {
        reason: "Blurry or unreadable document uploads",
        detail:
          "A common, entirely avoidable rejection trigger. We check every scan before it's submitted.",
      },
      {
        reason: "Name or address mismatches",
        detail: "Your ID proof, business address, and application details must all agree exactly.",
      },
      {
        reason: "Wrong category chosen",
        detail:
          "Applying for Basic Registration when your turnover actually needs a State License. We confirm your turnover band before filing, not after a rejection.",
      },
      {
        reason: "Turnover misdeclaration without supporting proof",
        detail:
          "Where a CA certificate is required to support a declared turnover figure, a missing or mismatched one is a common rejection trigger.",
      },
      {
        reason: "No response to a Designated Officer's query within 30 days",
        detail:
          "The system auto-rejects the application if you don't respond in time. We track every query and respond well inside the window.",
      },
      {
        reason: "Payment not reflecting within the stipulated FoSCoS window",
        detail:
          "The application is auto-rejected if the fee doesn't show up on the portal in time. We confirm payment reflects before treating the filing as complete.",
      },
    ],
    complianceKicker: "After registration",
    complianceHeading: "What keeps your registration valid.",
    complianceCalendar: [
      {
        milestone: "Display of registration certificate/number",
        dueBy: "At all times, at your business premises",
        penalty: "Can attract a compliance notice during an inspection",
      },
      {
        milestone: "Printing your FSSAI number on food packaging",
        dueBy: "On every applicable product label",
        penalty: "Non-compliance is itself a labelling violation",
      },
      {
        milestone: "Renewal, for pre-1 April 2026 registrations",
        dueBy: "Before your original validity term ends",
        penalty: "A lapsed registration is treated the same as operating unregistered",
      },
      {
        milestone: "Upgrading to a State License",
        dueBy: "As soon as turnover crosses ₹1.5 crore",
        penalty: "Continuing on Basic Registration above the threshold is itself a violation",
      },
    ],
    localNote: {
      heading: "Filed with the Tamil Nadu Food Safety Department.",
      body: "Basic Registration for a Chennai or Tamil Nadu food business is processed by the state's Designated Officer for your area. We confirm the correct jurisdiction before filing so the application reaches the right desk, and can coordinate document handover at our Anna Nagar West office if you'd rather do that than scan everything yourself.",
    },
    scopeIntro:
      "Basic Registration's government fee is small and fixed, so this split is about what's a one-time filing task versus what stays a separate engagement if your business grows past the ₹1.5 crore threshold.",
    scopeTable: {
      included: [
        "Turnover and category check",
        "Form A preparation and filing",
        "Government fee (₹100/year) payment coordination",
        "Document review before submission",
        "Registration certificate handover",
        "WhatsApp progress updates through certificate issuance",
      ],
      excluded: [
        "Upgrade to a State or Central License, if turnover crosses the threshold",
        "Renewal filing for pre-1 April 2026 registrations approaching expiry",
        "Food safety compliance audits or on-site inspection readiness",
        "Packaging/labelling compliance review beyond the FSSAI number requirement",
      ],
    },
    faqs: [
      {
        question: "What turnover qualifies for Basic Registration versus a full License?",
        answer:
          "Basic Registration covers annual turnover up to ₹1.5 crore. Above that, up to ₹50 crore needs a State License, and above ₹50 crore — or for specific categories like importers — needs a Central License.",
      },
      {
        question: "What's the real penalty for operating without FSSAI?",
        answer:
          "Under Section 63 of the Food Safety and Standards Act, 2006: imprisonment up to 6 months and a fine up to ₹5 lakh, for any person who manufactures, sells, stores, distributes, or imports food without the required registration or license.",
      },
      {
        question: "Is there really no full exemption for very small food businesses?",
        answer:
          "Correct — every food business needs at least Basic Registration; there's no informal-operation exemption. Only the category, Registration versus License, changes with your turnover and business type.",
      },
      {
        question: "Does my FSSAI registration expire?",
        answer:
          "Registrations granted from 1 April 2026 carry perpetual validity with no renewal. Ones granted before that date keep their original 1-to-5-year term and must be renewed on schedule.",
      },
      {
        question: "What if I chose a validity term before the perpetual-validity rule applied?",
        answer:
          "You keep that original term and need to renew it as scheduled. The perpetual-validity rule applies to registrations granted from 1 April 2026 onward, not retroactively.",
      },
      {
        question: "What happens if the Designated Officer asks a question about my application?",
        answer:
          "You get 30 days to respond. Missing that window leads to automatic rejection, and you'd need to reapply.",
      },
      {
        question: "What if my payment doesn't reflect on the FoSCoS portal in time?",
        answer:
          "The application is automatically rejected. We confirm your payment reflects on the portal before treating the filing as complete.",
      },
      {
        question:
          "Can I run a home-based food business — a cloud kitchen or tiffin service — on Basic Registration?",
        answer:
          "Yes, as long as your turnover stays within ₹1.5 crore. The category depends on turnover and business type, not on whether you have a commercial kitchen.",
      },
      {
        question: "Do I need to display my FSSAI number anywhere?",
        answer:
          "Yes, at your business premises and on the packaging or labelling of every applicable food product.",
      },
      {
        question: "What happens if my turnover crosses ₹1.5 crore after I register?",
        answer:
          "You need to upgrade to a State License. Continuing to operate on Basic Registration above the threshold is itself a compliance violation.",
      },
      {
        question: "Is a CA certificate required for FSSAI registration?",
        answer:
          "Not always — but where your declared turnover needs supporting proof, an unsupported or mismatched figure is a common rejection trigger. We confirm what your specific application needs.",
      },
      {
        question: "How long does FSSAI Basic Registration actually take?",
        answer:
          "Typically 7 business days for a clean, query-free filing; longer if the Designated Officer raises a query, since you then have up to 30 days to respond.",
      },
      {
        question: "Can I get FSSAI registration entirely online?",
        answer:
          "Yes, the entire Form A application is filed online through FoSCoS. Some Designated Officers may still request an in-person visit depending on your food category and premises.",
      },
      {
        question:
          "What if I actually need a State or Central License instead — can FirstMan help with that too?",
        answer:
          "Yes. FSSAI State License and FSSAI Central License are separate engagements for businesses above the ₹1.5 crore Basic Registration threshold — talk to us and we'll confirm which one actually fits your turnover.",
      },
    ],
    lastUpdated: "September 2026",
    metaTitle: "FSSAI Basic Registration Online — For Turnover up to ₹1.5 Crore",
    metaDescription:
      "FSSAI Basic Registration in 7 business days. {{FEE}} professional fee plus ₹100/year government fee. Confirm your turnover band before you file.",
  },
};

export function getServiceContentOverride(slug: string): ServiceContentOverride | undefined {
  return SERVICE_CONTENT_OVERRIDES[slug];
}

/**
 * Override content writes the service's fee as the literal token "{{FEE}}" wherever the
 * text should track the live price (e.g. a seed-data update) instead of going stale. This
 * substitutes the current formatted price everywhere that token appears, including inside
 * nested arrays/objects — every field on ServiceContentOverride is a plain JSON-safe string
 * structure, so a stringify/replace/parse round-trip is sufficient and avoids hand-walking
 * each field.
 */
export function resolveOverrideFee(
  override: ServiceContentOverride,
  feeFormatted: string,
): ServiceContentOverride {
  const json = JSON.stringify(override).replaceAll("{{FEE}}", feeFormatted);
  return JSON.parse(json) as ServiceContentOverride;
}
