import type { StatColor } from "@/components/dashboard/dashboard-colors";
import type { recurrenceEnum, serviceRelationTypeEnum } from "@/db/schema/catalog";
import type { complianceRecurrenceEnum, complianceStatusEnum } from "@/db/schema/compliance";
import type { documentStatusEnum } from "@/db/schema/documents";
import type { enquirySourceEnum, enquiryStatusEnum } from "@/db/schema/enquiries";
import type { invoiceKindEnum, invoiceStatusEnum, paymentMethodEnum } from "@/db/schema/invoices";
import type { orderStatusEnum, orderTaskStatusEnum } from "@/db/schema/orders";

export type ServiceRelationType = (typeof serviceRelationTypeEnum.enumValues)[number];
export type ServiceRecurrence = (typeof recurrenceEnum.enumValues)[number];

export const SERVICE_RELATION_TYPE_LABEL: Record<ServiceRelationType, string> = {
  upsell: "Upsell",
  renewal: "Renewal",
  prerequisite: "Prerequisite",
};

export const SERVICE_RECURRENCE_LABEL: Record<ServiceRecurrence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export type EnquiryStatus = (typeof enquiryStatusEnum.enumValues)[number];
export type EnquirySource = (typeof enquirySourceEnum.enumValues)[number];

export const ENQUIRY_STATUS_ORDER: EnquiryStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export const ENQUIRY_STATUS_BADGE: Record<EnquiryStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  contacted: {
    label: "Contacted",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
  qualified: {
    label: "Qualified",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  proposal_sent: {
    label: "Proposal Sent",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  negotiation: {
    label: "Negotiation",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  won: {
    label: "Won",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  lost: {
    label: "Lost",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export const ENQUIRY_STATUS_STAT_COLOR: Record<EnquiryStatus, StatColor> = {
  new: "blue",
  contacted: "slate",
  qualified: "purple",
  proposal_sent: "amber",
  negotiation: "orange",
  won: "green",
  lost: "red",
};

export const ENQUIRY_SOURCE_LABEL: Record<EnquirySource, string> = {
  whatsapp: "WhatsApp",
  website: "Website",
  meta_ads: "Meta Ads",
  google: "Google",
  referral: "Referral",
  walk_in: "Walk-in",
  other: "Other",
};

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type OrderTaskStatus = (typeof orderTaskStatusEnum.enumValues)[number];
export type DocumentStatus = (typeof documentStatusEnum.enumValues)[number];

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "pending",
  "docs_awaited",
  "in_progress",
  "govt_processing",
  "on_hold",
  "completed",
  "cancelled",
];

export const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
  docs_awaited: {
    label: "Docs Awaited",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  govt_processing: {
    label: "Govt. Processing",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  on_hold: {
    label: "On Hold",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

/**
 * Job card statuses that represent active work-in-progress, for the Job Card page's "WIP"
 * grouping badge (ADR 0002/0003) — a presentational grouping only, not a schema change:
 * order_status keeps its existing seven granular values.
 */
export const WIP_STATUSES: OrderStatus[] = [
  "pending",
  "docs_awaited",
  "in_progress",
  "govt_processing",
  "on_hold",
];

export function isWipStatus(status: OrderStatus): boolean {
  return WIP_STATUSES.includes(status);
}

/** Maps each job-card status to the shared dashboard accent palette (stat tiles, header banner). */
export const ORDER_STATUS_STAT_COLOR: Record<OrderStatus, StatColor> = {
  pending: "slate",
  docs_awaited: "amber",
  in_progress: "blue",
  govt_processing: "purple",
  on_hold: "orange",
  completed: "green",
  cancelled: "red",
};

/** Solid-ring treatment for the current step of the Job Card status stepper — a filled badge
 * reads as "done", so the active step needs its own outlined-but-colored variant instead. */
export const ORDER_STATUS_STEP_RING: Record<OrderStatus, string> = {
  pending: "border-slate-400 text-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-slate-300",
  docs_awaited: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300",
  in_progress: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300",
  govt_processing:
    "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-300",
  on_hold: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-300",
  completed: "border-green-500 text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-300",
  cancelled: "border-red-500 text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300",
};

export const ORDER_TASK_STATUS_BADGE: Record<
  OrderTaskStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  done: {
    label: "Done",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  blocked: {
    label: "Blocked",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export const ORDER_TASK_STATUS_STAT_COLOR: Record<OrderTaskStatus, StatColor> = {
  pending: "slate",
  in_progress: "blue",
  done: "green",
  blocked: "red",
};

export const DOCUMENT_STATUS_BADGE: Record<DocumentStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
  received: {
    label: "Received",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  verified: {
    label: "Verified",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export const DOCUMENT_STATUS_STAT_COLOR: Record<DocumentStatus, StatColor> = {
  pending: "slate",
  received: "blue",
  verified: "green",
  rejected: "red",
};

export type ComplianceStatus = (typeof complianceStatusEnum.enumValues)[number];
export type ComplianceRecurrence = (typeof complianceRecurrenceEnum.enumValues)[number];

export const COMPLIANCE_STATUS_BADGE: Record<
  ComplianceStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
  due_soon: {
    label: "Due Soon",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  filed: {
    label: "Filed",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  na: {
    label: "N/A",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
};

export const COMPLIANCE_STATUS_STAT_COLOR: Record<ComplianceStatus, StatColor> = {
  upcoming: "slate",
  due_soon: "amber",
  filed: "green",
  overdue: "red",
  na: "slate",
};

export const COMPLIANCE_RECURRENCE_LABEL: Record<ComplianceRecurrence, string> = {
  none: "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  partially_paid: {
    label: "Partially Paid",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
};

export const INVOICE_STATUS_STAT_COLOR: Record<InvoiceStatus, StatColor> = {
  draft: "slate",
  sent: "blue",
  partially_paid: "amber",
  paid: "green",
  overdue: "red",
  cancelled: "slate",
};

export type InvoiceKind = (typeof invoiceKindEnum.enumValues)[number];

export const INVOICE_KIND_BADGE: Record<InvoiceKind, { label: string; className: string }> = {
  proforma: {
    label: "Proforma",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  tax: {
    label: "Tax Invoice",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
};
