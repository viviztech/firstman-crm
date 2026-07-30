export type InvoiceSeed = {
  clientName: string;
  lineItems: { description: string; qty: number; ratePaise: number }[];
  gstRate: 0 | 18;
  dueDateOffsetDays: number;
  action: "draft" | "sent" | "cancelled";
  payments?: {
    amountPaise: number;
    method: "upi" | "bank_transfer" | "cash" | "card" | "cheque";
    reference?: string;
  }[];
};

export const INVOICE_SEED: InvoiceSeed[] = [
  {
    clientName: "Rajesh Kumar",
    lineItems: [
      { description: "Pvt Ltd Registration — professional fee", qty: 1, ratePaise: 1499900 },
      { description: "Government filing fee", qty: 1, ratePaise: 200000 },
    ],
    gstRate: 18,
    dueDateOffsetDays: 20,
    action: "draft",
  },
  {
    clientName: "Priya Sharma",
    lineItems: [{ description: "GST Registration — professional fee", qty: 1, ratePaise: 499900 }],
    gstRate: 18,
    dueDateOffsetDays: 10,
    action: "sent",
  },
  {
    clientName: "Anil Mehta",
    lineItems: [{ description: "LLP Registration — professional fee", qty: 1, ratePaise: 1299900 }],
    gstRate: 18,
    dueDateOffsetDays: 15,
    action: "sent",
    payments: [{ amountPaise: 700000, method: "upi", reference: "UPI-REF-1001" }],
  },
  {
    clientName: "Vikram Singh",
    lineItems: [
      { description: "Trademark Registration — professional fee", qty: 1, ratePaise: 699900 },
    ],
    gstRate: 18,
    dueDateOffsetDays: 5,
    action: "sent",
    payments: [{ amountPaise: 825882, method: "bank_transfer", reference: "NEFT-REF-2002" }],
  },
  {
    clientName: "Suresh Patel",
    lineItems: [{ description: "GST Monthly Filing — June 2026", qty: 1, ratePaise: 149900 }],
    gstRate: 18,
    dueDateOffsetDays: -10,
    action: "sent",
  },
  {
    clientName: "Karan Malhotra",
    lineItems: [{ description: "Annual Compliance LLP — consultation", qty: 2, ratePaise: 50000 }],
    gstRate: 0,
    dueDateOffsetDays: 30,
    action: "cancelled",
  },
  {
    clientName: "Meera Iyer",
    lineItems: [{ description: "GST Monthly Filing — May 2026", qty: 1, ratePaise: 149900 }],
    gstRate: 18,
    dueDateOffsetDays: 12,
    action: "sent",
    payments: [
      { amountPaise: 88441, method: "cash" },
      { amountPaise: 88441, method: "upi", reference: "UPI-REF-3003" },
    ],
  },
];
