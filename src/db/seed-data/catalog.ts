import type { ChecklistTemplateItem, recurrenceEnum } from "@/db/schema/catalog";

type Recurrence = (typeof recurrenceEnum.enumValues)[number];

export type CatalogSeedService = {
  name: string;
  slug: string;
  description: string;
  basePricePaise: number;
  govtFeePaise?: number;
  estimatedDays: number;
  isRecurring: boolean;
  recurrence?: Recurrence;
  checklistTemplate: ChecklistTemplateItem[];
  requiredDocuments: string[];
};

export type CatalogSeedCategory = {
  name: string;
  sort: number;
  services: CatalogSeedService[];
};

const DIRECTOR_KYC_DOCS = [
  "PAN Card of all directors/partners",
  "Aadhaar Card of all directors/partners",
  "Passport-size photograph",
  "Address proof of registered office",
  "NOC from property owner",
];

export const CATALOG_SEED: CatalogSeedCategory[] = [
  {
    name: "Company Registration",
    sort: 1,
    services: [
      {
        name: "Private Limited Company Registration",
        slug: "pvt-ltd-registration",
        description: "End-to-end incorporation of a Private Limited Company via SPICe+.",
        basePricePaise: 1499900,
        govtFeePaise: 200000,
        estimatedDays: 15,
        isRecurring: false,
        checklistTemplate: [
          { title: "Name approval (RUN)", dayOffset: 2 },
          { title: "Obtain Digital Signature Certificates", dayOffset: 3 },
          { title: "Draft MOA & AOA", dayOffset: 5 },
          { title: "File SPICe+ with ROC", dayOffset: 8 },
          { title: "Receive Certificate of Incorporation", dayOffset: 15 },
        ],
        requiredDocuments: DIRECTOR_KYC_DOCS,
      },
      {
        name: "LLP Registration",
        slug: "llp-registration",
        description: "Incorporation of a Limited Liability Partnership.",
        basePricePaise: 1199900,
        govtFeePaise: 150000,
        estimatedDays: 15,
        isRecurring: false,
        checklistTemplate: [
          { title: "Name approval (RUN-LLP)", dayOffset: 2 },
          { title: "Obtain Digital Signature Certificates", dayOffset: 3 },
          { title: "Draft LLP Agreement", dayOffset: 6 },
          { title: "File FiLLiP with ROC", dayOffset: 9 },
          { title: "Receive Certificate of Incorporation", dayOffset: 15 },
        ],
        requiredDocuments: DIRECTOR_KYC_DOCS,
      },
      {
        name: "One Person Company (OPC) Registration",
        slug: "opc-registration",
        description: "Incorporation of a One Person Company.",
        basePricePaise: 1399900,
        govtFeePaise: 180000,
        estimatedDays: 15,
        isRecurring: false,
        checklistTemplate: [
          { title: "Name approval (RUN)", dayOffset: 2 },
          { title: "Obtain Digital Signature Certificate", dayOffset: 3 },
          { title: "Draft MOA & AOA with nominee consent", dayOffset: 5 },
          { title: "File SPICe+ with ROC", dayOffset: 8 },
          { title: "Receive Certificate of Incorporation", dayOffset: 15 },
        ],
        requiredDocuments: DIRECTOR_KYC_DOCS,
      },
      {
        name: "Partnership Firm Registration",
        slug: "partnership-registration",
        description: "Drafting and registration of a Partnership Deed.",
        basePricePaise: 599900,
        govtFeePaise: 50000,
        estimatedDays: 10,
        isRecurring: false,
        checklistTemplate: [
          { title: "Draft Partnership Deed", dayOffset: 3 },
          { title: "Notarize deed", dayOffset: 5 },
          { title: "Apply for PAN in firm name", dayOffset: 7 },
          { title: "Register with Registrar of Firms (optional)", dayOffset: 10 },
        ],
        requiredDocuments: [
          "PAN Card of all partners",
          "Aadhaar Card of all partners",
          "Address proof of firm's place of business",
        ],
      },
      {
        name: "Proprietorship Registration",
        slug: "proprietorship-registration",
        description: "Sole proprietorship setup with basic registrations.",
        basePricePaise: 299900,
        estimatedDays: 7,
        isRecurring: false,
        checklistTemplate: [
          { title: "Apply for Udyam registration", dayOffset: 2 },
          { title: "Apply for GST registration (if applicable)", dayOffset: 5 },
          { title: "Open current bank account", dayOffset: 7 },
        ],
        requiredDocuments: [
          "PAN Card",
          "Aadhaar Card",
          "Passport-size photograph",
          "Address proof",
        ],
      },
    ],
  },
  {
    name: "Taxation & GST",
    sort: 2,
    services: [
      {
        name: "GST Registration",
        slug: "gst-registration",
        description: "New GST registration and GSTIN allotment.",
        basePricePaise: 199900,
        estimatedDays: 7,
        isRecurring: false,
        checklistTemplate: [
          { title: "Prepare application (REG-01)", dayOffset: 1 },
          { title: "Submit application with documents", dayOffset: 2 },
          { title: "Respond to any department query", dayOffset: 5 },
          { title: "Receive GSTIN", dayOffset: 7 },
        ],
        requiredDocuments: [
          "PAN Card",
          "Aadhaar Card",
          "Address proof of business",
          "Bank account statement/cancelled cheque",
          "Passport-size photograph",
        ],
      },
      {
        name: "GST Monthly Filing",
        slug: "gst-monthly-filing",
        description: "Recurring monthly GSTR-1 and GSTR-3B filing.",
        basePricePaise: 99900,
        estimatedDays: 5,
        isRecurring: true,
        recurrence: "monthly",
        checklistTemplate: [
          { title: "Collect sales/purchase data", dayOffset: 1 },
          { title: "Reconcile ITC", dayOffset: 3 },
          { title: "File GSTR-1", dayOffset: 4 },
          { title: "File GSTR-3B", dayOffset: 5 },
        ],
        requiredDocuments: ["Sales register", "Purchase register", "Bank statement"],
      },
      {
        name: "ITR Filing",
        slug: "itr-filing",
        description: "Recurring annual Income Tax Return filing.",
        basePricePaise: 249900,
        estimatedDays: 5,
        isRecurring: true,
        recurrence: "yearly",
        checklistTemplate: [
          { title: "Collect Form 16 / income details", dayOffset: 1 },
          { title: "Compute tax liability", dayOffset: 3 },
          { title: "File return", dayOffset: 4 },
          { title: "Share acknowledgement (ITR-V)", dayOffset: 5 },
        ],
        requiredDocuments: [
          "PAN Card",
          "Form 16 / income proof",
          "Bank statement",
          "Investment proofs",
        ],
      },
    ],
  },
  {
    name: "Compliance & Filings",
    sort: 3,
    services: [
      {
        name: "Annual Compliance — Private Limited",
        slug: "annual-compliance-pvt-ltd",
        description: "Recurring yearly ROC annual filing for Private Limited companies.",
        basePricePaise: 1499900,
        estimatedDays: 30,
        isRecurring: true,
        recurrence: "yearly",
        checklistTemplate: [
          { title: "Prepare financial statements", dayOffset: 10 },
          { title: "Conduct board meeting & AGM", dayOffset: 15 },
          { title: "File AOC-4", dayOffset: 25 },
          { title: "File MGT-7", dayOffset: 30 },
        ],
        requiredDocuments: ["Financial statements", "Board resolutions", "Audit report"],
      },
      {
        name: "Annual Compliance — LLP",
        slug: "annual-compliance-llp",
        description: "Recurring yearly ROC annual filing for LLPs.",
        basePricePaise: 999900,
        estimatedDays: 20,
        isRecurring: true,
        recurrence: "yearly",
        checklistTemplate: [
          { title: "Prepare statement of accounts", dayOffset: 8 },
          { title: "File Form 8", dayOffset: 15 },
          { title: "File Form 11", dayOffset: 20 },
        ],
        requiredDocuments: ["Statement of accounts & solvency", "Partner KYC"],
      },
      {
        name: "DIR-3 KYC",
        slug: "dir-3-kyc",
        description: "Recurring yearly KYC filing for directors.",
        basePricePaise: 99900,
        govtFeePaise: 50000,
        estimatedDays: 2,
        isRecurring: true,
        recurrence: "yearly",
        checklistTemplate: [
          { title: "Collect director KYC documents", dayOffset: 1 },
          { title: "File DIR-3 KYC", dayOffset: 2 },
        ],
        requiredDocuments: ["PAN Card", "Aadhaar Card", "Mobile & email OTP verification"],
      },
    ],
  },
  {
    name: "Intellectual Property",
    sort: 4,
    services: [
      {
        name: "Trademark Registration",
        slug: "trademark-registration",
        description: "Trademark search, filing and prosecution.",
        basePricePaise: 699900,
        govtFeePaise: 450000,
        estimatedDays: 20,
        isRecurring: false,
        checklistTemplate: [
          { title: "Conduct trademark search", dayOffset: 2 },
          { title: "Prepare & file TM-A application", dayOffset: 5 },
          { title: "Receive filing acknowledgement", dayOffset: 7 },
          { title: "Track examination report", dayOffset: 20 },
        ],
        requiredDocuments: [
          "Logo/wordmark",
          "Applicant identity proof",
          "Business proof (if applicable)",
        ],
      },
      {
        name: "Trademark Objection Reply",
        slug: "trademark-objection",
        description: "Response to examination report / objection on a filed trademark.",
        basePricePaise: 499900,
        estimatedDays: 15,
        isRecurring: false,
        checklistTemplate: [
          { title: "Review examination report", dayOffset: 2 },
          { title: "Draft reply with evidence of use", dayOffset: 8 },
          { title: "File reply", dayOffset: 15 },
        ],
        requiredDocuments: ["Examination report", "Evidence of use (invoices, ads)"],
      },
    ],
  },
  {
    name: "Licenses & Registrations",
    sort: 5,
    services: [
      {
        name: "FSSAI Registration",
        slug: "fssai-registration",
        description: "Food business FSSAI basic registration/license.",
        basePricePaise: 249900,
        govtFeePaise: 10000,
        estimatedDays: 10,
        isRecurring: false,
        checklistTemplate: [
          { title: "Prepare application & documents", dayOffset: 2 },
          { title: "Submit application on FoSCoS", dayOffset: 3 },
          { title: "Respond to queries", dayOffset: 7 },
          { title: "Receive FSSAI certificate", dayOffset: 10 },
        ],
        requiredDocuments: [
          "PAN Card",
          "Address proof of food business",
          "Passport-size photograph",
        ],
      },
      {
        name: "MSME / Udyam Registration",
        slug: "msme-udyam-registration",
        description: "Udyam registration for MSME recognition.",
        basePricePaise: 99900,
        estimatedDays: 3,
        isRecurring: false,
        checklistTemplate: [
          { title: "Verify Aadhaar & PAN details", dayOffset: 1 },
          { title: "Submit Udyam application", dayOffset: 2 },
          { title: "Receive Udyam certificate", dayOffset: 3 },
        ],
        requiredDocuments: ["Aadhaar Card", "PAN Card", "Business address proof"],
      },
      {
        name: "Import Export Code (IEC)",
        slug: "iec-registration",
        description: "IEC allotment from DGFT for import/export businesses.",
        basePricePaise: 299900,
        govtFeePaise: 50000,
        estimatedDays: 5,
        isRecurring: false,
        checklistTemplate: [
          { title: "Prepare DGFT application", dayOffset: 1 },
          { title: "Submit application with documents", dayOffset: 2 },
          { title: "Receive IEC certificate", dayOffset: 5 },
        ],
        requiredDocuments: ["PAN Card", "Bank certificate/cancelled cheque", "Address proof"],
      },
      {
        name: "ISO Certification",
        slug: "iso-certification",
        description: "ISO 9001/certification consulting and audit coordination.",
        basePricePaise: 1499900,
        estimatedDays: 25,
        isRecurring: false,
        checklistTemplate: [
          { title: "Gap assessment", dayOffset: 5 },
          { title: "Documentation & QMS setup", dayOffset: 15 },
          { title: "Coordinate certification audit", dayOffset: 22 },
          { title: "Receive ISO certificate", dayOffset: 25 },
        ],
        requiredDocuments: ["Business registration proof", "Process documentation"],
      },
    ],
  },
];
