import { AUTHOR, type ResourceArticle } from "@/content/resources/types";

const PILLAR_SLUG = "annual-compliance-guide";

export const ANNUAL_COMPLIANCE_ARTICLES: ResourceArticle[] = [
  {
    slug: PILLAR_SLUG,
    title: "Annual Compliance for Private Limited Companies and LLPs",
    description:
      "What annual compliance actually means for a Private Limited Company or LLP, why it applies even with zero revenue, and what happens if you skip it.",
    pillarSlug: PILLAR_SLUG,
    isPillar: true,
    publishedAt: "2026-07-01",
    updatedAt: "2026-07-20",
    author: AUTHOR,
    summary:
      "Annual compliance is the set of yearly filings every Private Limited Company and LLP must complete regardless of turnover — including a statutory audit for companies, ROC filings, director KYC, and income tax returns — and missing them leads to escalating penalties.",
    sections: [
      {
        heading: "Why compliance applies even with no revenue",
        paragraphs: [
          "A common misconception is that a dormant or low-revenue company has nothing to file. It doesn't work that way — a Private Limited Company owes its annual filings (board meetings, audit, AOC-4, MGT-7) whether it earned ₹0 or ₹10 crore. An LLP's filing obligations are lighter but still apply annually.",
        ],
      },
      {
        heading: "What compliance looks like, by structure",
        bullets: [
          "Private Limited Company — board meetings, statutory audit, AOC-4 and MGT-7 filings with the Registrar, DIR-3 KYC for every director, and an income tax return.",
          "LLP — Form 11 (annual return), Form 8 (statement of accounts), an income tax return, and audit only past certain turnover or contribution thresholds.",
        ],
      },
      {
        heading: "What happens if you miss a deadline",
        paragraphs: [
          "Late filings attract a per-day penalty that adds up quickly, and repeated non-compliance risks director disqualification or the company being struck off the register — see our penalties guide for specifics.",
        ],
      },
      {
        heading: "How we handle this for clients",
        paragraphs: [
          "Every compliance item we manage for a client runs on a tracked due-date calendar with reminders well ahead of each deadline — the goal is that you never find out about a filing the day it's due.",
        ],
      },
    ],
    relatedServiceSlugs: ["annual-compliance-pvt-ltd", "annual-compliance-llp", "dir-3-kyc"],
    relatedArticleSlugs: [
      "annual-compliance-checklist-private-limited",
      "what-is-dir-3-kyc",
      "penalties-for-missing-compliance-deadlines",
      "annual-compliance-calendar",
      "company-registration-in-india",
    ],
  },
  {
    slug: "annual-compliance-checklist-private-limited",
    title: "Annual Compliance Checklist for Private Limited Companies",
    description:
      "Every recurring filing a Private Limited Company owes each year, in one checklist.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-07-03",
    updatedAt: "2026-07-03",
    author: AUTHOR,
    summary:
      "A Private Limited Company's annual compliance checklist includes at least four board meetings, a statutory audit, AOC-4 and MGT-7 filings with the Registrar of Companies, DIR-3 KYC for every director, and an income tax return.",
    sections: [
      {
        heading: "The checklist",
        bullets: [
          "Hold at least four board meetings during the year, with a gap of no more than 120 days between two consecutive meetings.",
          "Appoint a statutory auditor and complete the annual audit of financial statements.",
          "Hold an Annual General Meeting (AGM) within six months of the financial year end.",
          "File AOC-4 (financial statements) within 30 days of the AGM.",
          "File MGT-7 or MGT-7A (annual return) within 60 days of the AGM.",
          "File DIR-3 KYC for every director who holds a DIN.",
          "File the company's income tax return.",
        ],
      },
      {
        heading: "Beyond the annual filings",
        paragraphs: [
          "Companies also need to maintain statutory registers, minute books, and proper books of account throughout the year — these aren't filed anywhere by default, but they're what an auditor or regulator will ask to see if there's ever a review.",
        ],
      },
      {
        heading: "For exact due dates",
        paragraphs: [
          "See our annual compliance calendar for the specific months each of these typically falls in.",
        ],
      },
    ],
    relatedServiceSlugs: ["annual-compliance-pvt-ltd"],
    relatedArticleSlugs: [PILLAR_SLUG, "annual-compliance-calendar", "what-is-dir-3-kyc"],
  },
  {
    slug: "what-is-dir-3-kyc",
    title: "What is DIR-3 KYC and Who Needs to File It?",
    description:
      "DIR-3 KYC explained — who must file it, what happens if you miss it, and how it's filed.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-07-07",
    updatedAt: "2026-07-07",
    author: AUTHOR,
    summary:
      "DIR-3 KYC is an annual filing every individual holding a Director Identification Number (DIN) must complete, and missing the deadline gets your DIN deactivated until it's filed with a late fee.",
    sections: [
      {
        heading: "Who needs to file it",
        paragraphs: [
          "Anyone who holds a DIN — whether or not they're currently an active director of any company — is required to file DIR-3 KYC every year. This includes directors of dormant companies and people who've since resigned from all directorships but never surrendered their DIN.",
        ],
      },
      {
        heading: "What happens if you miss it",
        paragraphs: [
          "Your DIN is marked \"Deactivated due to non-filing of DIR-3 KYC\", which blocks you from being appointed or continuing as a director on any company's filings until you file it again along with the applicable late fee. It doesn't take effect instantly on the deadline, but it isn't a risk worth taking either.",
        ],
      },
      {
        heading: "How it's filed",
        paragraphs: [
          "For most directors, it's a straightforward web-based confirmation of details already on file (DIR-3 KYC Web). If your personal details — mobile number, email, or address — have changed since your last filing, you'll need the full DIR-3 KYC e-form instead, which requires fresh documentation and digital signature.",
        ],
      },
    ],
    relatedServiceSlugs: ["dir-3-kyc"],
    relatedArticleSlugs: [PILLAR_SLUG, "annual-compliance-checklist-private-limited"],
  },
  {
    slug: "penalties-for-missing-compliance-deadlines",
    title: "Penalties for Missing Annual Compliance Deadlines",
    description:
      "What it actually costs to file late — and what happens if non-compliance continues.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-07-12",
    updatedAt: "2026-07-12",
    author: AUTHOR,
    summary:
      "Missing a Registrar of Companies filing deadline triggers a penalty that accrues per day the filing remains outstanding, and sustained non-compliance can lead to director disqualification or the company being struck off the register.",
    sections: [
      {
        heading: "Late filing penalties",
        paragraphs: [
          "Most Registrar of Companies filings — including AOC-4 and MGT-7 — attract an additional fee for every day of delay past the due date, on top of the normal filing fee. Because it's charged per day rather than a flat fine, a filing that's a few months late can end up costing many times the original fee.",
        ],
      },
      {
        heading: "Beyond the late fee",
        bullets: [
          "Directors of a company that fails to file for three consecutive financial years can be disqualified from being appointed as a director of any company for a period.",
          "A company that stays non-compliant for an extended period risks being struck off the register by the Registrar of Companies.",
          "LLPs face their own late filing fees on Form 8 and Form 11, calculated similarly on a per-day basis.",
        ],
      },
      {
        heading: "The cheapest fix is not being late",
        paragraphs: [
          "Every one of these penalties is entirely avoidable — the underlying filings themselves aren't expensive or complicated once you have a system tracking the due dates. That tracking is most of what a compliance retainer with us actually does.",
        ],
      },
    ],
    relatedServiceSlugs: ["annual-compliance-pvt-ltd", "annual-compliance-llp"],
    relatedArticleSlugs: [PILLAR_SLUG, "annual-compliance-calendar"],
  },
  {
    slug: "annual-compliance-calendar",
    title: "Annual Compliance Calendar: Key Due Dates to Track",
    description:
      "The recurring due dates a Private Limited Company or LLP needs to track every year.",
    pillarSlug: PILLAR_SLUG,
    isPillar: false,
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    author: AUTHOR,
    summary:
      "The main recurring due dates for Indian companies and LLPs are DIR-3 KYC by September 30, AOC-4 within 30 days of the AGM, MGT-7 within 60 days of the AGM, LLP Form 11 by May 30, and LLP Form 8 by October 30 — alongside monthly or quarterly GST returns.",
    sections: [
      {
        heading: "For Private Limited Companies",
        bullets: [
          "DIR-3 KYC — by 30 September each year, for every director holding a DIN.",
          "Annual General Meeting (AGM) — within 6 months of the financial year end (by 30 September for a March year-end).",
          "AOC-4 — within 30 days of the AGM.",
          "MGT-7 / MGT-7A — within 60 days of the AGM.",
          "Income tax return — typically by 31 October for companies (since a statutory audit is mandatory), unless extended.",
        ],
      },
      {
        heading: "For LLPs",
        bullets: [
          "Form 11 (annual return) — by 30 May each year.",
          "Form 8 (statement of accounts and solvency) — by 30 October each year.",
          "Income tax return — the standard due date applies, earlier if the LLP isn't subject to audit.",
        ],
      },
      {
        heading: "Ongoing, not just annual",
        paragraphs: [
          "GST returns are filed monthly or quarterly depending on your scheme, separate from the yearly filings above — and TDS returns are quarterly if the entity deducts tax at source.",
        ],
      },
      {
        heading: "A note on exact dates",
        paragraphs: [
          "These deadlines are set by statute and have stayed stable for several years, but government notifications occasionally extend specific due dates. We confirm the current applicable date for every filing we handle, rather than relying on a generic calendar.",
        ],
      },
    ],
    relatedServiceSlugs: ["annual-compliance-pvt-ltd", "annual-compliance-llp", "dir-3-kyc"],
    relatedArticleSlugs: [PILLAR_SLUG, "annual-compliance-checklist-private-limited"],
  },
];
