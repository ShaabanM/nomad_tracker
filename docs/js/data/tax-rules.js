// Tax residency rules for the 5 countries in experimental tax mode.
// Primary use case: a Canadian nomad optimizing for UAE tax residency.
//
// Each country has:
//   code: ISO country code
//   name, emoji
//   jurisdictionId: maps to a jurisdiction in jurisdictions.js (so we can
//     navigate from tax view to the visa detail, and share records)
//   taxYearType: 'calendar' (Jan 1–Dec 31) or 'uk' (Apr 6–Apr 5)
//   threshold: the primary day-count threshold for residency
//   goal: 'maximize' (we WANT to reach this — UAE) or 'minimize' (we want
//     to stay below it — UK/FR/IT/CA)
//   softThresholds: ordered list of day-count markers to show on the
//     progress bar with context (e.g. UK 16/46/91/121/183)
//   rule, notes, tips: explanatory strings for the detail view
//
// IMPORTANT: Tax residency is complex and jurisdiction-specific. This is
// a tracking tool, not legal advice. Always confirm with a tax advisor.

export const TAX_COUNTRIES = [
  {
    code: 'AE',
    name: 'United Arab Emirates',
    shortName: 'UAE',
    emoji: '\u{1F1E6}\u{1F1EA}',
    jurisdictionId: 'uae',
    taxYearType: 'calendar',
    threshold: 183,
    goal: 'maximize',
    rule: '183+ days in UAE in a calendar year establishes UAE tax residency. Alternatively, 90+ days with a permanent residence and active employment / business.',
    notes: [
      'The UAE levies no personal income tax. Maintaining UAE tax residency is the primary goal for most globally mobile professionals.',
      'For treaty benefits, you need a Tax Residency Certificate (TRC) issued by the Federal Tax Authority.',
      'TRC for a calendar year typically requires 183+ physical days that year.',
      'Keep records of entry/exit stamps, residence visa, Ejari (lease), and utility bills.',
    ],
    tips: [
      'Alt 90-day rule: 90+ days in UAE with a permanent residence + active business or employment also qualifies.',
      'Leaving the UAE for more than 6 months in a 12-month period can invalidate residency visas (separate from tax rules).',
      'Aim to hit 183 days before treaty countries try to claim you as their resident.',
    ],
    softThresholds: [
      { days: 90, label: '90-day alt rule (with ties)', type: 'alt' },
      { days: 183, label: 'Primary 183-day threshold', type: 'primary' },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    shortName: 'UK',
    emoji: '\u{1F1EC}\u{1F1E7}',
    jurisdictionId: 'uk',
    taxYearType: 'uk',
    threshold: 183,
    goal: 'minimize',
    rule: 'Automatic UK tax resident if 183+ days in UK tax year (Apr 6 – Apr 5). Fewer days can still trigger residency via the Sufficient Ties Test.',
    notes: [
      'UK tax year runs April 6 to April 5 — NOT the calendar year.',
      'Sufficient Ties Test: UK ties include family, accommodation, work, 90+ days in either of the last 2 years, and spending more time in the UK than any other country.',
      '"Part day" rule: a day where you are in the UK at midnight counts as a full day.',
      'Transit days do not count if you leave the same day without engaging in substantive activity.',
    ],
    tips: [
      'If you were UK resident in any of the 3 prior tax years, the automatic non-resident threshold drops to 15 days.',
      'Maintain records of flights and accommodation — HMRC can and does audit.',
      'The "90-day tie" is triggered by 90+ days in UK in EITHER of the two prior tax years.',
    ],
    softThresholds: [
      { days: 16, label: 'Automatic non-resident (if prior UK resident in last 3 years)', type: 'safe' },
      { days: 46, label: 'Automatic non-resident (if not prior resident)', type: 'safe' },
      { days: 91, label: 'Ceiling with 4 ties', type: 'ties' },
      { days: 121, label: 'Ceiling with 3 ties', type: 'ties' },
      { days: 183, label: 'Automatic UK resident', type: 'primary' },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    shortName: 'France',
    emoji: '\u{1F1EB}\u{1F1F7}',
    jurisdictionId: 'schengen',
    taxYearType: 'calendar',
    threshold: 183,
    goal: 'minimize',
    rule: 'French tax resident if ANY of: 183+ days in France, France is your primary home ("foyer"), OR your center of economic interests is in France.',
    notes: [
      'France has four independent tests — ANY ONE of them makes you a tax resident.',
      'The 183-day rule is objective. The "foyer" (family home), "principal residence", and "economic center" tests are subjective and can trigger residency even under 183 days.',
      'Owning a home in France without living there does not automatically trigger residency, but consistent use does.',
    ],
    tips: [
      'Spending time evenly across multiple countries does NOT automatically avoid France — they check if you spent MORE time in France than anywhere else.',
      'Family living in France is a major trigger regardless of your day count.',
    ],
    softThresholds: [
      { days: 183, label: '183-day rule', type: 'primary' },
    ],
  },
  {
    code: 'IT',
    name: 'Italy',
    shortName: 'Italy',
    emoji: '\u{1F1EE}\u{1F1F9}',
    jurisdictionId: 'schengen',
    taxYearType: 'calendar',
    threshold: 183,
    goal: 'minimize',
    rule: 'Italian tax resident if registered with anagrafe, OR domiciled in Italy, OR 183+ days (184 in a leap year) physically present.',
    notes: [
      'Italy counts any fraction of a day as a day — arrival and departure days both count.',
      'Registration with the anagrafe (local civil registry) creates deemed residency regardless of physical days.',
      'Tax year is calendar year.',
      'From 2024, the "habitual abode" test also considers where you spend the majority of your time.',
    ],
    tips: [
      'Do not register with the anagrafe unless you intend to be a tax resident.',
      'In a leap year (e.g. 2028), the threshold is 184 days.',
    ],
    softThresholds: [
      { days: 183, label: '183-day rule', type: 'primary' },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    shortName: 'Canada',
    emoji: '\u{1F1E8}\u{1F1E6}',
    jurisdictionId: 'canada',
    taxYearType: 'calendar',
    threshold: 183,
    goal: 'minimize',
    rule: 'Canadian tax resident if 183+ days in a calendar year (sojourner rule), OR if you maintain significant residential ties (home, spouse, dependents).',
    notes: [
      'The 183-day rule applies only if you have NO significant residential ties. If you have ties, you may be a "factual resident" with even 0 days.',
      'Significant residential ties: a home available for your use, a spouse or common-law partner, dependents in Canada.',
      'Secondary ties (drivers license, bank accounts, health card, etc.) matter in combination.',
      'Leaving Canada requires severing ties, not just counting days.',
    ],
    tips: [
      'If you want to become a non-resident, file Form NR73 and sever ties — sell or rent out your home, close/transfer accounts, cancel provincial health card, get a new home abroad.',
      'Keep days under 183 AND ensure no significant residential ties.',
    ],
    softThresholds: [
      { days: 183, label: 'Sojourner rule (without ties)', type: 'primary' },
    ],
  },
];

export function findTaxCountry(code) {
  return TAX_COUNTRIES.find(c => c.code === code);
}
