import type { complianceRecurrenceEnum, complianceStatusEnum } from "@/db/schema/compliance";
import type { documentStatusEnum } from "@/db/schema/documents";
import type { leadSourceEnum, leadStatusEnum } from "@/db/schema/leads";
import type { orderStatusEnum, orderTaskStatusEnum } from "@/db/schema/orders";

export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_STATUS_BADGE: Record<LeadStatus, { label: string; className: string }> = {
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

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
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

export const COMPLIANCE_RECURRENCE_LABEL: Record<ComplianceRecurrence, string> = {
  none: "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};
