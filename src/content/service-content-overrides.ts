import type { ServicePageContent } from "@/content/service-content";

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
    intro: string;
    chooseInstead: { structure: string; when: string; href: string }[];
  };
  structureComparison?: {
    columns: string[];
    rows: { factor: string; values: string[] }[];
  };
  documentGroups?: { title: string; note?: string; items: string[] }[];
  timeline?: { day: string; milestone: string }[];
  costBreakdown?: {
    intro: string;
    rows: { item: string; when: string; range: string; includedInFee: string }[];
    note: string;
  };
  rejectionReasons?: { reason: string; detail: string }[];
  complianceCalendar?: { milestone: string; dueBy: string; penalty: string }[];
  localNote?: { heading: string; body: string };
  scopeTable?: { included: string[]; excluded: string[] };
  faqs?: { question: string; answer: string }[];
  lastUpdated?: string;
  metaTitle?: string;
  metaDescription?: string;
};

export const SERVICE_CONTENT_OVERRIDES: Record<string, ServiceContentOverride> = {
  "pvt-ltd-registration": {
    base: {
      eyebrow: "Company incorporation",
      summary:
        "Private limited company registration is the process of incorporating a company under Section 2(68) of the Companies Act, 2013, through the MCA's SPICe+ form. It needs 2 directors, 2 shareholders, and one resident director, with no minimum paid-up capital. FirstMan's professional fee starts at ₹10,999, with government fees, DSC, and stamp duty billed separately.",
      idealFor: [
        "Founders raising equity funding, issuing ESOPs, or bringing in co-founders as shareholders",
        "Businesses bidding for enterprise or government contracts that expect a registered company",
        "Teams that want the credibility and limited liability of a Pvt Ltd structure from day one",
      ],
      outcomes: [
        "A separate legal entity with limited liability, recognised under Section 2(68)",
        "Certificate of Incorporation, DIN, PAN, TAN, and your MoA/AoA in one coordinated filing",
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
      "The ₹10,999 professional fee excludes government fees, DSC charges, and stamp duty on the MoA/AoA. Figures on this page use Tamil Nadu's stamp duty schedule; other states set their own rates and may vary.",
    decisionFramework: {
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
        "Incorporation is only the first cost. A realistic year-one budget includes the professional fee, DSC, stamp duty, and MCA fee at setup, then a recurring layer of auditor fees, ROC filings, DIR-3 KYC, and income tax filing. Expect a realistic all-in range of roughly ₹25,000 to ₹45,000 for the full first year, not the ₹10,999 headline figure alone.",
      rows: [
        {
          item: "Professional fee (incorporation)",
          when: "At filing",
          range: "₹10,999",
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
      note: "The ₹10,999 professional fee covers incorporation only. Everything from the first auditor appointment onward is a separate, clearly quoted engagement.",
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
    localNote: {
      heading: "Registering from Chennai or Tamil Nadu",
      body: "The MCA process is identical nationwide, but every state sets its own stamp duty schedule for the MoA and AoA, so the amount you pay depends on where your registered office is. RoC Chennai processes filings for companies registered with a Tamil Nadu address, and familiarity with how that office raises and resolves queries shortens resubmission cycles. Founders who prefer to hand over physical documents rather than scan and upload them can do so at our Anna Nagar West office before we file.",
    },
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
          "Budget ₹25,000 to ₹45,000 for the full first year, not ₹10,999 alone. That figure covers the professional fee, DSC, stamp duty, MCA fee, first auditor appointment, INC-20A, annual ROC filings, DIR-3 KYC, and ITR filing.",
      },
      {
        question: "Are there hidden charges on top of the ₹10,999 professional fee?",
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
    metaTitle: "Private Limited Company Registration India",
    metaDescription:
      "Private limited company registration from ₹10,999 professional fee, typically completed in 7 business days. Full scope and fee confirmed before you pay.",
  },
};

export function getServiceContentOverride(slug: string): ServiceContentOverride | undefined {
  return SERVICE_CONTENT_OVERRIDES[slug];
}
