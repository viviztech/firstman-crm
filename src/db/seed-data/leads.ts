export type LeadSeed = {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  source: "whatsapp" | "website" | "meta_ads" | "google" | "referral" | "walk_in" | "other";
  status: "new" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "lost";
  lostReason?: string;
  serviceSlug?: string;
  notes?: string;
  /** Days offset from seed time — negative is overdue, positive is upcoming, undefined is none. */
  nextFollowUpOffsetDays?: number;
};

export const LEAD_SEED: LeadSeed[] = [
  {
    name: "Rohit Malviya",
    phone: "+919811100011",
    email: "rohit.malviya@gmail.com",
    city: "Delhi",
    source: "website",
    status: "new",
    serviceSlug: "pvt-ltd-registration",
    nextFollowUpOffsetDays: -2,
  },
  {
    name: "Sunita Rane",
    phone: "+919822100022",
    email: "sunita.rane@gmail.com",
    city: "Pune",
    source: "meta_ads",
    status: "contacted",
    serviceSlug: "gst-registration",
    nextFollowUpOffsetDays: 1,
  },
  {
    name: "Farhan Sheikh",
    phone: "+919833100033",
    city: "Mumbai",
    source: "google",
    status: "qualified",
    serviceSlug: "llp-registration",
    nextFollowUpOffsetDays: 3,
  },
  {
    name: "Geeta Subramaniam",
    phone: "+919844100044",
    email: "geeta.s@gmail.com",
    city: "Chennai",
    source: "referral",
    status: "proposal_sent",
    serviceSlug: "trademark-registration",
    nextFollowUpOffsetDays: -1,
  },
  {
    name: "Vivek Choudhary",
    phone: "+919855100055",
    city: "Jaipur",
    source: "whatsapp",
    status: "negotiation",
    serviceSlug: "annual-compliance-pvt-ltd",
    nextFollowUpOffsetDays: 2,
  },
  {
    name: "Ayesha Khatoon",
    phone: "+919866100066",
    email: "ayesha.k@gmail.com",
    city: "Lucknow",
    source: "walk_in",
    status: "new",
    serviceSlug: "fssai-registration",
  },
  {
    name: "Nikhil Wadhwa",
    phone: "+919877100077",
    city: "Chandigarh",
    source: "website",
    status: "contacted",
    serviceSlug: "msme-udyam-registration",
    nextFollowUpOffsetDays: -5,
  },
  {
    name: "Preeti Ghosh",
    phone: "+919888100088",
    email: "preeti.ghosh@gmail.com",
    city: "Kolkata",
    source: "google",
    status: "lost",
    lostReason: "Chose a competitor with lower pricing",
    serviceSlug: "iso-certification",
  },
  {
    name: "Tarun Oberoi",
    phone: "+919899100099",
    city: "Gurugram",
    source: "meta_ads",
    status: "qualified",
    serviceSlug: "opc-registration",
    nextFollowUpOffsetDays: 5,
  },
  {
    name: "Lakshmi Narayanan",
    phone: "+919900100010",
    email: "lakshmi.n@gmail.com",
    city: "Coimbatore",
    source: "referral",
    status: "new",
    serviceSlug: "proprietorship-registration",
    nextFollowUpOffsetDays: -3,
  },
  {
    name: "Imran Qureshi",
    phone: "+919911100021",
    city: "Bhopal",
    source: "whatsapp",
    status: "proposal_sent",
    serviceSlug: "iec-registration",
    nextFollowUpOffsetDays: 1,
  },
  {
    name: "Shalini Bhatia",
    phone: "+919922100032",
    email: "shalini.bhatia@gmail.com",
    city: "Amritsar",
    source: "website",
    status: "lost",
    lostReason: "Not ready to register this quarter",
    serviceSlug: "partnership-registration",
  },
  {
    name: "Devendra Pillai",
    phone: "+919933100043",
    city: "Nashik",
    source: "google",
    status: "contacted",
    serviceSlug: "gst-monthly-filing",
    nextFollowUpOffsetDays: 4,
  },
  {
    name: "Rukhsar Ansari",
    phone: "+919944100054",
    email: "rukhsar.ansari@gmail.com",
    city: "Indore",
    source: "meta_ads",
    status: "new",
    serviceSlug: "trademark-objection",
    nextFollowUpOffsetDays: -1,
  },
  {
    name: "Harpreet Sandhu",
    phone: "+919955100065",
    city: "Ludhiana",
    source: "walk_in",
    status: "negotiation",
    serviceSlug: "annual-compliance-llp",
    nextFollowUpOffsetDays: 6,
  },
  {
    name: "Ob Fernandes",
    phone: "+919966100076",
    email: "ob.fernandes@gmail.com",
    city: "Goa",
    source: "referral",
    status: "qualified",
    serviceSlug: "dir-3-kyc",
    nextFollowUpOffsetDays: 2,
  },
];

export const FOLLOWUP_SEED_INDEXES = [0, 1, 3, 4, 9] as const;
