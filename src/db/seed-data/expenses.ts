export type ExpenseSeed = {
  dateOffsetDays: number;
  category: string;
  description?: string;
  amountPaise: number;
  orderClientName?: string;
  orderServiceSlug?: string;
};

export const EXPENSE_SEED: ExpenseSeed[] = [
  { dateOffsetDays: -5, category: "Office Rent", amountPaise: 4500000 },
  { dateOffsetDays: -3, category: "Salaries", amountPaise: 12000000 },
  {
    dateOffsetDays: -2,
    category: "Software Subscriptions",
    description: "CRM + accounting tools",
    amountPaise: 350000,
  },
  {
    dateOffsetDays: -1,
    category: "Government Fees",
    description: "ROC filing fee paid on client's behalf",
    amountPaise: 200000,
    orderClientName: "Rajesh Kumar",
    orderServiceSlug: "pvt-ltd-registration",
  },
  { dateOffsetDays: 0, category: "Office Supplies", amountPaise: 85000 },
];
