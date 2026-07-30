export type ComplianceSeed = {
  clientName: string;
  serviceSlug?: string;
  title: string;
  description?: string;
  dueDateOffsetDays: number;
  recurrence: "none" | "monthly" | "quarterly" | "yearly";
  markFiled?: boolean;
};

export const COMPLIANCE_SEED: ComplianceSeed[] = [
  {
    clientName: "Rajesh Kumar",
    serviceSlug: "annual-compliance-pvt-ltd",
    title: "Annual Compliance Filing — FY 2025-26",
    dueDateOffsetDays: -6,
    recurrence: "yearly",
  },
  {
    clientName: "Priya Sharma",
    serviceSlug: "gst-monthly-filing",
    title: "GST Return — GSTR-3B",
    dueDateOffsetDays: -2,
    recurrence: "monthly",
  },
  {
    clientName: "Anil Mehta",
    serviceSlug: "annual-compliance-llp",
    title: "LLP Annual Filing — Form 11",
    dueDateOffsetDays: 4,
    recurrence: "yearly",
  },
  {
    clientName: "Sneha Reddy",
    serviceSlug: "dir-3-kyc",
    title: "DIR-3 KYC",
    dueDateOffsetDays: 9,
    recurrence: "yearly",
  },
  {
    clientName: "Vikram Singh",
    serviceSlug: "itr-filing",
    title: "Income Tax Return Filing",
    dueDateOffsetDays: 13,
    recurrence: "yearly",
  },
  {
    clientName: "Kavita Nair",
    serviceSlug: "gst-monthly-filing",
    title: "GST Return — GSTR-3B",
    dueDateOffsetDays: 25,
    recurrence: "monthly",
  },
  {
    clientName: "Arjun Gupta",
    title: "Trademark Renewal Reminder",
    description: "Confirm continued use before the renewal window closes.",
    dueDateOffsetDays: 45,
    recurrence: "none",
  },
  {
    clientName: "Meera Iyer",
    serviceSlug: "gst-monthly-filing",
    title: "GST Return — GSTR-3B",
    dueDateOffsetDays: -1,
    recurrence: "monthly",
    markFiled: true,
  },
];
