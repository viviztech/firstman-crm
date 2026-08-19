import type { PublicService } from "@/services/marketing-catalog";

type ServiceWithCategory = PublicService & { categoryName: string; verticalName: string };

export type ServicePageContent = {
  eyebrow: string;
  summary: string;
  idealFor: string[];
  outcomes: string[];
  process: { title: string; body: string }[];
  includes: string[];
};

function has(value: string, terms: string[]): boolean {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function getServicePageContent(service: ServiceWithCategory): ServicePageContent {
  const subject = `${service.name} ${service.categoryName} ${service.verticalName}`;
  const isFormation = has(subject, [
    "company registration",
    "incorporation",
    "proprietorship",
    "partnership",
    "llp",
    "section 8",
    "nidhi",
  ]);
  const isTax = has(subject, ["gst", "income tax", "tds", "tax", "return filing"]);
  const isLicense = has(subject, [
    "license",
    "registration services",
    "fssai",
    "udyam",
    "shop",
    "trade",
    "iec",
  ]);
  const isIp = has(subject, ["trademark", "copyright", "patent", "ipr"]);
  const isAccounting = has(subject, ["account", "bookkeeping", "audit", "balance sheet"]);
  const isDigital = has(subject, [
    "digital signature",
    "dsc",
    "website",
    "software",
    "it services",
  ]);

  let idealFor = [
    "Businesses that want the filing handled end to end",
    "Teams that need a clear document checklist and timeline",
    "Founders who want one accountable point of contact",
  ];
  let outcomes = [
    `A completed ${service.name} application prepared against current requirements`,
    "Document review before filing to reduce avoidable queries",
    "Status updates from submission through completion",
  ];
  let includes = [
    "Requirement and eligibility review",
    "Application preparation and filing support",
    "Query and clarification coordination",
    "Digital copies of final acknowledgements or certificates",
  ];

  if (isFormation) {
    idealFor = [
      "First-time founders formalising a new venture",
      "Existing firms moving to a more suitable structure",
      "Promoters who need incorporation and registrations coordinated together",
    ];
    outcomes = [
      "A legally recognised business structure",
      "Core incorporation records and registration numbers",
      "A clear post-incorporation compliance checklist",
    ];
    includes = [
      "Structure and name-readiness consultation",
      "Promoter/director KYC review",
      "Constitutional document preparation",
      "Government portal filing and follow-up",
      "Certificate and incorporation document handover",
    ];
  } else if (isTax) {
    idealFor = [
      "Registered businesses with periodic tax obligations",
      "Growing teams that need dependable filing discipline",
      "Businesses responding to notices or reconciliation gaps",
    ];
    outcomes = [
      "Accurate return preparation from the records supplied",
      "Filing acknowledgement and working papers",
      "Clear visibility of tax payable, credits, and unresolved items",
    ];
    includes = [
      "Source-data and ledger review",
      "Return computation and reconciliation",
      "Management confirmation before filing",
      "Portal submission and acknowledgement",
      "Exception list for follow-up items",
    ];
  } else if (isLicense) {
    idealFor = [
      "Businesses entering a regulated activity or market",
      "Operators opening a new location",
      "Companies renewing or amending an existing approval",
    ];
    outcomes = [
      "A complete license or registration application",
      "Department-ready supporting documents",
      "Follow-up through approval or formal response",
    ];
  } else if (isIp) {
    idealFor = [
      "Brands protecting a name, logo, product, or creative work",
      "Founders checking availability before launch",
      "Rights holders responding to objections or renewals",
    ];
    outcomes = [
      "A documented search and filing strategy",
      "Application filing with the appropriate class or category",
      "An organised record for future renewals and enforcement",
    ];
  } else if (isAccounting) {
    idealFor = [
      "Businesses that need dependable monthly books",
      "Management teams preparing for audit or fundraising",
      "Companies replacing spreadsheet-only finance processes",
    ];
    outcomes = [
      "Reconciled books and a review-ready audit trail",
      "Management reports that explain business performance",
      "A clean base for tax and statutory filings",
    ];
  } else if (isDigital) {
    idealFor = [
      "Directors and authorised signatories filing online",
      "Businesses modernising a customer or internal workflow",
      "Teams that need secure, documented digital enablement",
    ];
  }

  const summary = service.description
    ? `${service.description} FirstMan coordinates the documents, filing, follow-up, and final handover through one accountable workflow.`
    : `${service.name} is handled as an end-to-end engagement: we confirm applicability, prepare the required records, coordinate submission, and stay with the matter through completion.`;

  return {
    eyebrow: service.verticalName,
    summary,
    idealFor,
    outcomes,
    includes,
    process: [
      {
        title: "Scope and eligibility",
        body: `We confirm what ${service.name} requires for your entity, location, and current status before work begins.`,
      },
      {
        title: "Documents and preparation",
        body: "You receive a practical checklist. Our team reviews the records and prepares the application or working papers.",
      },
      {
        title: "Approval to file",
        body: "We share material details, fees, and assumptions for confirmation before anything is submitted.",
      },
      {
        title: "Submission and follow-up",
        body: `We file, track department movement, coordinate queries, and hand over the final ${service.isRecurring ? "filing acknowledgement" : "approval or deliverable"}.`,
      },
    ],
  };
}
