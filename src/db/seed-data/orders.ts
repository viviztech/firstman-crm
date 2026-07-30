export type OrderSeed = {
  clientName: string;
  serviceSlug: string;
  status?: "pending" | "docs_awaited" | "in_progress" | "govt_processing" | "on_hold" | "completed";
};

export const ORDER_SEED: OrderSeed[] = [
  { clientName: "Rajesh Kumar", serviceSlug: "pvt-ltd-registration", status: "in_progress" },
  { clientName: "Priya Sharma", serviceSlug: "gst-registration" },
  { clientName: "Anil Mehta", serviceSlug: "llp-registration", status: "docs_awaited" },
  { clientName: "Vikram Singh", serviceSlug: "trademark-registration", status: "govt_processing" },
  { clientName: "Suresh Patel", serviceSlug: "gst-monthly-filing", status: "completed" },
  { clientName: "Karan Malhotra", serviceSlug: "annual-compliance-llp", status: "on_hold" },
  { clientName: "Deepak Bansal", serviceSlug: "fssai-registration" },
  { clientName: "Sanjay Bhatt", serviceSlug: "msme-udyam-registration", status: "in_progress" },
];
