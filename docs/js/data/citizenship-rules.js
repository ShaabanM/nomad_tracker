// Citizenship-specific visa rules for all 16 jurisdictions
// Merges with base ALL_JURISDICTIONS data from jurisdictions.js

import { ALL_JURISDICTIONS, RULE_TYPES } from './jurisdictions.js';

export const CITIZENSHIPS = [
  { code: 'CA', name: 'Canadian', emoji: '🇨🇦' },
  { code: 'MX', name: 'Mexican', emoji: '🇲🇽' },
  { code: 'SA', name: 'Saudi Arabian', emoji: '🇸🇦' },
];

// Per-citizenship rule overrides. CA = {} because base data IS Canadian rules.
// Each override can contain: visaRequired, homeCountry, unrestricted, ruleType, maxDays, windowDays, notes, tips, visaInfo
const CITIZENSHIP_OVERRIDES = {
  CA: {
    // Base jurisdictions.js data is already Canadian. Canada itself is home country.
    canada: { homeCountry: true },
  },

  MX: {
    // 14/15 visa-free. Turkey requires eVisa, Mexico is home country.
    schengen: {
      ruleType: RULE_TYPES.ROLLING, maxDays: 90, windowDays: 180,
      notes: [
        'The 90/180 rule applies to ALL 29 Schengen countries combined.',
        'ETIAS (travel authorization, ~EUR 7) expected Q4 2026. The 90/180 rule still applies.',
        'Passport must be valid for at least 3 months after planned departure.',
      ],
      tips: [
        'A 1-day trip outside Schengen does NOT meaningfully help. The rolling window means you need substantial time outside.',
        'After 90 consecutive days, you must wait 90 days outside before your full allowance renews.',
        'Georgia (365 days visa-free) is the top Schengen cooldown destination.',
      ],
    },
    uk: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 180,
      notes: [
        'Up to 6 months per visit. No formal rolling window or annual cap.',
        'UK ETA is mandatory for Mexicans (£16, valid 2 years).',
        "Immigration officers assess whether you're a 'genuine visitor'.",
      ],
      tips: [
        "Each re-entry grants a fresh 6-month period, but don't abuse this.",
      ],
    },
    turkey: {
      visaRequired: true,
      visaInfo: 'eVisa required. 30 days, single entry. Apply at evisa.gov.tr.',
    },
    georgia: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 365,
      notes: [
        "One of the world's most generous visa-free policies — a full year.",
        'A brief border crossing resets the counter to a fresh 365 days.',
      ],
      tips: [
        'Georgia is the #1 Schengen cooldown destination.',
        'Tbilisi has a vibrant expat and digital nomad community.',
      ],
    },
    albania: {
      ruleType: RULE_TYPES.ROLLING, maxDays: 90, windowDays: 180,
      notes: [
        'NOT in the Schengen Area — days here do NOT count against Schengen.',
        'Has its own separate 90/180 counter.',
      ],
    },
    montenegro: {
      ruleType: RULE_TYPES.ROLLING, maxDays: 90, windowDays: 180,
      notes: [
        'NOT in Schengen. Independent counter.',
        'MANDATORY: Register with local police within 24 hours of arrival.',
      ],
    },
    serbia: {
      ruleType: RULE_TYPES.ROLLING, maxDays: 90, windowDays: 180,
      notes: ['NOT in Schengen. Independent counter.'],
    },
    mexico: {
      homeCountry: true,
    },
    japan: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 90,
      notes: [
        '90 days per visit. Extendable by 90 days at Immigration Office (up to 180 total).',
        'Immigration officers have discretion to refuse entry if they suspect visa-running.',
      ],
    },
    south_korea: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 90,
      notes: [
        '90 days per visit for Mexican citizens.',
        'K-ETA temporarily waived through December 31, 2026.',
      ],
      tips: [
        'Good infrastructure, fast internet, vibrant culture.',
      ],
    },
    thailand: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 60,
      notes: [
        '60 days visa-free by air, extendable by 30 days at local immigration (1,900 THB).',
        'Thailand Digital Arrival Card (TDAC) required before arrival.',
      ],
      tips: [
        'Extend to 90 days total by visiting immigration before your 60 days expire.',
      ],
    },
    colombia: {
      ruleType: RULE_TYPES.CALENDAR_YEAR, maxDays: 180,
      notes: [
        'CALENDAR YEAR system — 180 days max per calendar year (Jan 1 - Dec 31).',
        '90 days on entry, extendable once for another 90 days.',
        'A border run does NOT give you more days within the same calendar year.',
      ],
      tips: [
        'Leaving and re-entering does NOT reset your counter. All days count toward the annual 180-day cap.',
      ],
    },
    argentina: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 90,
      notes: ['90 days per entry. Border run resets the clock.'],
    },
    brazil: {
      ruleType: RULE_TYPES.ROLLING, maxDays: 90, windowDays: 180,
      notes: [
        'Mexicans can enter visa-free for up to 90 days.',
        '90 days within a 180-day rolling window.',
      ],
      tips: [
        'Unlike Canadians, Mexicans do NOT need an eVisa for Brazil.',
      ],
    },
    morocco: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 90,
      notes: ['90 days per visit. Exit and re-enter for a fresh 90 days.'],
    },
    uae: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 180,
      notes: [
        '180 days visa-free for Mexican citizens.',
        'Free of charge at port of entry.',
      ],
    },
    canada: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 180,
      notes: [
        'Mexicans typically need an eTA (electronic travel authorization) for visa-free entry, up to 6 months per visit.',
      ],
    },
  },

  SA: {
    // 8/16 visa-free: UK, Turkey, Georgia, Montenegro, South Korea, Thailand, Morocco, UAE (unrestricted)
    schengen: {
      visaRequired: true,
      visaInfo: 'Visa required. Apply at embassy/consulate. EUR 80 fee.',
    },
    uk: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 180,
      notes: [
        'Up to 6 months per visit.',
        'UK ETA mandatory for Saudi nationals (£16, valid 2 years).',
        "Immigration officers assess whether you're a 'genuine visitor'.",
      ],
    },
    turkey: {
      ruleType: RULE_TYPES.ROLLING, maxDays: 90, windowDays: 180,
      notes: [
        'Saudi nationals can enter visa-free for up to 90 days.',
        "Turkey's counter is separate from Schengen.",
        'Passport must be valid for at least 150 days beyond arrival.',
      ],
      tips: [
        'Turkey is a popular destination — Istanbul and Antalya have great infrastructure.',
      ],
    },
    georgia: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 360,
      notes: [
        '360 days visa-free for Saudi nationals.',
        'Passport must be valid throughout the stay.',
      ],
      tips: [
        'Nearly a full year visa-free. Great for long-term stays.',
        'Tbilisi has a vibrant expat community.',
      ],
    },
    albania: {
      visaRequired: true,
      visaInfo: 'eVisa required. Apply online. EUR 60–245.',
    },
    montenegro: {
      ruleType: RULE_TYPES.ROLLING, maxDays: 90, windowDays: 180,
      notes: [
        'NOT in Schengen. Independent counter.',
        'MANDATORY: Register with local police within 24 hours.',
      ],
    },
    serbia: {
      visaRequired: true,
      visaInfo: 'eVisa available at welcometoserbia.gov.rs.',
    },
    mexico: {
      visaRequired: true,
      visaInfo: 'Visa required. Apply at Mexican embassy/consulate.',
    },
    japan: {
      visaRequired: true,
      visaInfo: 'eVisa available online for tourism (up to 90 days).',
    },
    south_korea: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 30,
      notes: [
        '30 days per visit for Saudi nationals.',
        'K-ETA waived through December 31, 2026.',
        'E-Arrival Card must be completed before landing.',
      ],
    },
    thailand: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 60,
      notes: [
        '60 days visa-free, extendable by 30 days at Thai immigration.',
        'Thailand Digital Arrival Card (TDAC) required.',
      ],
    },
    colombia: {
      visaRequired: true,
      visaInfo: 'eVisa required. Tourism/business up to 90 days.',
    },
    argentina: {
      visaRequired: true,
      visaInfo: 'Visa required. Apply at Argentine embassy/consulate.',
    },
    brazil: {
      visaRequired: true,
      visaInfo: 'Visa required. Embassy visa. Brazil applies reciprocity.',
    },
    morocco: {
      ruleType: RULE_TYPES.PER_VISIT, maxDays: 90,
      notes: [
        '90 days visa-free for Saudi nationals.',
        'Passport must be valid for 6+ months from arrival.',
      ],
    },
    uae: {
      unrestricted: true,
      notes: [
        'GCC freedom of movement — unrestricted entry, stay, and work.',
        'Can enter with national ID card (no passport required).',
        'No time limit on stays.',
      ],
      tips: [
        'As a GCC national, you have full freedom of movement in the UAE.',
      ],
    },
    canada: {
      visaRequired: true,
      visaInfo: 'Visa required. Apply at Canadian embassy/consulate.',
    },
  },
};

/**
 * Returns the full jurisdiction array with citizenship-specific rules merged in.
 * Each jurisdiction gets: visaRequired, homeCountry, unrestricted flags.
 */
export function getJurisdictionsForCitizenship(citizenshipCode = 'CA') {
  const overrides = CITIZENSHIP_OVERRIDES[citizenshipCode] || {};

  return ALL_JURISDICTIONS.map(base => {
    const override = overrides[base.id];

    // No override = same as base (Canadian rules)
    if (!override) {
      return { ...base, visaRequired: false, homeCountry: false, unrestricted: false };
    }

    if (override.visaRequired) {
      return {
        ...base,
        visaRequired: true,
        visaInfo: override.visaInfo || 'Visa required.',
        homeCountry: false,
        unrestricted: false,
      };
    }

    if (override.homeCountry) {
      return {
        ...base,
        homeCountry: true,
        visaRequired: false,
        unrestricted: false,
      };
    }

    if (override.unrestricted) {
      return {
        ...base,
        unrestricted: true,
        visaRequired: false,
        homeCountry: false,
        notes: override.notes || base.notes,
        tips: override.tips || base.tips,
      };
    }

    // Merge: override fields take priority, fall back to base
    return {
      ...base,
      ruleType: override.ruleType || base.ruleType,
      maxDays: override.maxDays ?? base.maxDays,
      windowDays: override.windowDays ?? base.windowDays,
      notes: override.notes || base.notes,
      tips: override.tips || base.tips,
      visaRequired: false,
      homeCountry: false,
      unrestricted: false,
    };
  });
}

/**
 * Find a single jurisdiction by ID with citizenship-specific rules.
 */
export function findJurisdictionForCitizenship(id, citizenshipCode = 'CA') {
  return getJurisdictionsForCitizenship(citizenshipCode).find(j => j.id === id);
}
