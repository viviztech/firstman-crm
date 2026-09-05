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
    heading: string;
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
        "Private limited company registration is the process of incorporating a company under Section 2(68) of the Companies Act, 2013, through the MCA's SPICe+ form. It needs 2 directors, 2 shareholders, and one resident director, with no minimum paid-up capital. FirstMan's professional fee starts at {{FEE}}, with government fees, DSC, and stamp duty billed separately.",
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
