// All 16 jurisdictions with rules for Canadian citizens

export const RULE_TYPES = {
  ROLLING: 'rolling',
  PER_VISIT: 'perVisit',
  CALENDAR_YEAR: 'calendarYear',
};

export const ALL_JURISDICTIONS = [
  {
    id: 'schengen',
    name: 'Schengen Area',
    emoji: '\u{1F1EA}\u{1F1FA}',
    ruleType: RULE_TYPES.ROLLING,
    maxDays: 90,
    windowDays: 180,
    notes: [
      'The 90/180 rule applies to ALL 29 Schengen countries combined \u2014 days in France, Germany, Italy, etc. are pooled together.',
      'The EU Entry/Exit System (EES) now digitally tracks all entries and exits. Overstays are detected automatically.',
      'ETIAS (online travel authorization) expected Q4 2026. The 90/180 rule still applies with ETIAS.',
      'Passport must be valid for at least 3 months after your planned departure.',
    ],
    tips: [
      'A 1-day trip outside Schengen does NOT meaningfully help. The rolling window means you need substantial time outside.',
      'After 90 consecutive days, you must wait 90 days outside before your full allowance renews.',
      'Georgia (365 days visa-free) is the top Schengen cooldown destination.',
      'Albania, Montenegro, and Serbia are nearby non-Schengen options with their own 90/180 rules.',
      'Consider a Digital Nomad Visa (Spain, Portugal, Croatia) for stays longer than 90 days.',
    ],
    countryCodes: new Set([
      'AT','BE','BG','HR','CZ','DK','EE','FI','FR','DE',
      'GR','HU','IS','IT','LV','LI','LT','LU','MT','NL',
      'NO','PL','PT','RO','SK','SI','ES','SE','CH',
    ]),
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    emoji: '\u{1F1EC}\u{1F1E7}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 180,
    notes: [
      'Up to 6 months per visit. No formal rolling window or annual cap.',
      'UK ETA is mandatory for Canadians (\u00A316, valid 2 years).',
      "Immigration officers assess whether you're a 'genuine visitor' \u2014 frequent long stays will raise flags.",
      'Youth Mobility Scheme available for Canadians aged 18-35 (up to 2 years).',
    ],
    tips: [
      "Each re-entry technically grants a fresh 6-month period, but don't abuse this \u2014 officers will refuse entry if you appear to be living in the UK.",
      "The 'genuine visitor' test is the real constraint, not a fixed day count.",
      'Overstaying is a criminal offence and affects future UK, Schengen, and US applications.',
    ],
    countryCodes: new Set(['GB']),
  },
  {
    id: 'turkey',
    name: 'Turkey',
    emoji: '\u{1F1F9}\u{1F1F7}',
    ruleType: RULE_TYPES.ROLLING,
    maxDays: 90,
    windowDays: 180,
    notes: [
      'Canadians can enter visa-free for up to 90 days. No e-Visa needed.',
      "Turkey's counter is completely separate from Schengen.",
      'Passport must be valid for at least 6 months beyond departure.',
    ],
    tips: [
      'Turkey is a popular Schengen cooldown destination \u2014 Istanbul and Antalya have great digital nomad infrastructure.',
      'Same 90/180 rolling window as Schengen but counted independently.',
    ],
    countryCodes: new Set(['TR']),
  },
  {
    id: 'georgia',
    name: 'Georgia',
    emoji: '\u{1F1EC}\u{1F1EA}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 365,
    notes: [
      "One of the world's most generous visa-free policies \u2014 a full year with no visa.",
      'A brief border crossing resets the counter to a fresh 365 days.',
      'Passport must be valid for 6 months with at least 1 blank page.',
      'Visa-free stay is for tourism only \u2014 working requires a separate visa.',
    ],
    tips: [
      'Georgia is the #1 Schengen cooldown destination. You can spend your entire 90-day Schengen pause here with room to spare.',
      'Tbilisi has a vibrant expat and digital nomad community.',
      'Low cost of living and fast internet make it ideal for remote work.',
    ],
    countryCodes: new Set(['GE']),
  },
  {
    id: 'albania',
    name: 'Albania',
    emoji: '\u{1F1E6}\u{1F1F1}',
    ruleType: RULE_TYPES.ROLLING,
    maxDays: 90,
    windowDays: 180,
    notes: [
      'NOT in the Schengen Area \u2014 days here do NOT count against your Schengen 90/180.',
      'Has its own separate 90/180 counter.',
      'Passport must be valid for at least 3 months on arrival.',
      "Digital Nomad 'Unique Permit' available for up to 1 year.",
    ],
    tips: [
      "Popular as a 'Schengen pause' destination \u2014 affordable, growing nomad scene.",
      'Tirana and the Albanian Riviera are popular digital nomad spots.',
    ],
    countryCodes: new Set(['AL']),
  },
  {
    id: 'montenegro',
    name: 'Montenegro',
    emoji: '\u{1F1F2}\u{1F1EA}',
    ruleType: RULE_TYPES.ROLLING,
    maxDays: 90,
    windowDays: 180,
    notes: [
      'NOT in Schengen. Independent counter.',
      'MANDATORY: Register with local police within 24 hours of arrival. Hotels do this automatically.',
      'If staying privately (Airbnb, friends), you or the host MUST register at the police station.',
      'Passport must be valid for 6 months with at least 1 blank page.',
    ],
    tips: [
      "Beautiful coastline. Digital nomad visa available requiring ~\u20AC1,350/month minimum income.",
      "Don't forget the 24-hour registration requirement \u2014 fines for non-compliance.",
    ],
    countryCodes: new Set(['ME']),
  },
  {
    id: 'serbia',
    name: 'Serbia',
    emoji: '\u{1F1F7}\u{1F1F8}',
    ruleType: RULE_TYPES.ROLLING,
    maxDays: 90,
    windowDays: 180,
    notes: [
      'NOT in Schengen. Independent counter.',
      'Passport must be valid for 6 months beyond intended stay.',
    ],
    tips: [
      'Belgrade is popular for nightlife and low cost of living.',
      'No registration hassle like Montenegro.',
    ],
    countryCodes: new Set(['RS']),
  },
  {
    id: 'mexico',
    name: 'Mexico',
    emoji: '\u{1F1F2}\u{1F1FD}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 180,
    notes: [
      'Up to 180 days per entry, but the officer decides how many days to grant.',
      'You are NOT automatically given 180 days \u2014 some officers grant less.',
      'No formal rolling window or annual cap.',
      'FMM fee is included in airline tickets for air arrivals.',
    ],
    tips: [
      'One of the most popular long-term digital nomad destinations due to generous rules.',
      "If you receive fewer days than desired, you can politely request more \u2014 but it's discretionary.",
      'Repeated near-continuous stays may draw immigration scrutiny.',
    ],
    countryCodes: new Set(['MX']),
  },
  {
    id: 'japan',
    name: 'Japan',
    emoji: '\u{1F1EF}\u{1F1F5}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 90,
    notes: [
      '90 days per visit. No formal rolling window or annual cap.',
      'Immigration officers have full discretion to refuse entry if they suspect visa-running.',
    ],
    tips: [
      'While technically you can do back-to-back 90-day stays, wait several months between long stays to avoid scrutiny.',
      'No paid work allowed on visa-free stays.',
    ],
    countryCodes: new Set(['JP']),
  },
  {
    id: 'south_korea',
    name: 'South Korea',
    emoji: '\u{1F1F0}\u{1F1F7}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 180,
    notes: [
      '180 days per visit \u2014 unusually generous, specific to the Canada-South Korea bilateral agreement.',
      'K-ETA temporarily waived for Canadians through December 31, 2026.',
      'Most other nationalities only get 30-90 days.',
    ],
    tips: [
      'Excellent option for a long stay outside Schengen \u2014 180 days is very generous.',
      'Great infrastructure, fast internet, and vibrant culture.',
    ],
    countryCodes: new Set(['KR']),
  },
  {
    id: 'thailand',
    name: 'Thailand',
    emoji: '\u{1F1F9}\u{1F1ED}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 60,
    notes: [
      '60 days visa-free by air, extendable by 30 days at a local immigration office (1,900 THB).',
      'By land/sea: only 15 days, limited to 2 land entries per calendar year.',
      'Thailand Digital Arrival Card (TDAC) must be completed before arrival.',
      'Proof of funds may be requested: 10,000 THB per person.',
    ],
    tips: [
      'Extend to 90 days total by visiting a local immigration office before your 60 days expire.',
      "Thailand has become stricter about serial visa runners \u2014 don't do too many back-to-back entries.",
      'Passport must be valid for 6 months with 2 blank pages.',
    ],
    countryCodes: new Set(['TH']),
  },
  {
    id: 'colombia',
    name: 'Colombia',
    emoji: '\u{1F1E8}\u{1F1F4}',
    ruleType: RULE_TYPES.CALENDAR_YEAR,
    maxDays: 180,
    notes: [
      'CALENDAR YEAR system \u2014 180 days max per calendar year (Jan 1 - Dec 31).',
      '90 days on entry, extendable once for another 90 days.',
      'A border run does NOT give you more days within the same calendar year.',
      'Entry fee of ~85 CAD charged upon arrival.',
    ],
    tips: [
      'Unlike most countries, leaving and re-entering does NOT reset your counter. All days count toward the annual 180-day cap.',
      'Plan your Colombia time carefully around the calendar year boundary if you want to maximize days.',
      'Counter resets every January 1.',
    ],
    countryCodes: new Set(['CO']),
  },
  {
    id: 'argentina',
    name: 'Argentina',
    emoji: '\u{1F1E6}\u{1F1F7}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 90,
    notes: [
      '90 days per entry. Border run resets the clock.',
      'Argentina is tightening enforcement on frequent border crossers.',
      'Overstaying results in a fine at the airport, not criminal charges.',
      "You can apply for a 'prorroga' (extension) for another 90 days at Migraciones.",
    ],
    tips: [
      "Quick ferry to Uruguay from Buenos Aires resets the clock \u2014 but immigration is increasingly scrutinizing this pattern.",
      'Apply for a prorroga within 60 days of entry for a cheaper extension.',
    ],
    countryCodes: new Set(['AR']),
  },
  {
    id: 'brazil',
    name: 'Brazil',
    emoji: '\u{1F1E7}\u{1F1F7}',
    ruleType: RULE_TYPES.ROLLING,
    maxDays: 180,
    windowDays: 365,
    notes: [
      'e-Visa REQUIRED for Canadians as of January 2026. Visa-free era has ended.',
      '90 days per visit, up to 180 days in any 12-month rolling period.',
      'e-Visa costs ~51 USD, applied for online, most approvals within 48-72 hours.',
    ],
    tips: [
      "Don't forget to get your e-Visa before traveling \u2014 you cannot enter visa-free anymore.",
      'The 180-day annual cap uses a rolling 12-month window, not a calendar year.',
    ],
    countryCodes: new Set(['BR']),
  },
  {
    id: 'morocco',
    name: 'Morocco',
    emoji: '\u{1F1F2}\u{1F1E6}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 90,
    notes: [
      '90 days per visit. Exit and re-enter for a fresh 90 days.',
      'The 90 days is exactly 90 days, NOT three calendar months.',
      'If you overstay, you must remain until seen by a prosecutor \u2014 very unpleasant.',
    ],
    tips: [
      "Geographically convenient for Schengen visa runners \u2014 quick trip from Spain pauses your Schengen clock.",
      'To extend without leaving, contact the Service to Foreigners at least 15 days before expiry.',
    ],
    countryCodes: new Set(['MA']),
  },
  {
    id: 'uae',
    name: 'UAE',
    emoji: '\u{1F1E6}\u{1F1EA}',
    ruleType: RULE_TYPES.ROLLING,
    maxDays: 90,
    windowDays: 180,
    notes: [
      '90 days within a 180-day rolling window.',
      'Can extend once for an additional 90 days (AED 650 / ~240 CAD).',
      'UAE does not recognize dual nationality \u2014 enter on the same passport you\'ll exit with.',
      'If you hold Emirati citizenship, you MUST enter on your UAE passport.',
    ],
    tips: [
      'If you have any connection to Emirati citizenship (e.g., through a parent), be very careful which passport you use.',
      'Extension available at ICA offices for an additional 90 days.',
    ],
    countryCodes: new Set(['AE']),
  },
  {
    id: 'canada',
    name: 'Canada',
    emoji: '\u{1F1E8}\u{1F1E6}',
    ruleType: RULE_TYPES.PER_VISIT,
    maxDays: 180,
    notes: [
      'Canadians have no limit in their home country. Tracked here for tax residency purposes.',
      'Visiting non-citizens typically get 6 months per visit.',
    ],
    tips: [
      'For Canadians spending significant time abroad, tracking Canada days matters for CRA residency rules.',
    ],
    countryCodes: new Set(['CA']),
  },
];

// Lookup helpers
export function findJurisdiction(id) {
  return ALL_JURISDICTIONS.find(j => j.id === id);
}

export function jurisdictionForCountry(countryCode) {
  const code = countryCode.toUpperCase();
  return ALL_JURISDICTIONS.find(j => j.countryCodes.has(code));
}

export function countryFlag(countryCode) {
  const code = countryCode.toUpperCase();
  const offset = 0x1F1E6 - 65; // 'A' = 65
  return String.fromCodePoint(
    ...code.split('').map(c => c.charCodeAt(0) + offset)
  );
}

export function ruleLabel(jurisdiction) {
  switch (jurisdiction.ruleType) {
    case RULE_TYPES.ROLLING:
      return `Rolling ${jurisdiction.windowDays}-day window`;
    case RULE_TYPES.PER_VISIT:
      return 'Per visit';
    case RULE_TYPES.CALENDAR_YEAR:
      return 'Calendar year';
  }
}

export function ruleDescription(jurisdiction) {
  switch (jurisdiction.ruleType) {
    case RULE_TYPES.ROLLING:
      return `${jurisdiction.maxDays} days in any ${jurisdiction.windowDays}-day window`;
    case RULE_TYPES.PER_VISIT:
      return `${jurisdiction.maxDays} days per visit`;
    case RULE_TYPES.CALENDAR_YEAR:
      return `${jurisdiction.maxDays} days per calendar year`;
  }
}
