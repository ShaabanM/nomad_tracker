// Tax-year day counting and residency status evaluation.
//
// Works off the same records store as the visa engine. Records are indexed
// by countryCode, so France/Italy days are extracted from Schengen records.

import { TAX_COUNTRIES } from '../data/tax-rules.js';
import { getRecords, todayStr, parseDate, addDays } from './storage.js';

/**
 * Return the start/end (YYYY-MM-DD, inclusive) for the tax year `year`
 * for a given country. For 'calendar' countries this is Jan 1–Dec 31.
 * For UK, year X means the tax year starting Apr 6, X and ending Apr 5, X+1.
 */
export function taxYearBounds(country, year) {
  if (country.taxYearType === 'uk') {
    return {
      start: `${year}-04-06`,
      end: `${year + 1}-04-05`,
      label: `Apr ${year} – Apr ${year + 1}`,
      shortLabel: `${year}/${String(year + 1).slice(2)}`,
    };
  }
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: `${year}`,
    shortLabel: `${year}`,
  };
}

/**
 * Returns the "current" tax year for a country as of the given date.
 */
export function currentTaxYear(country, asOf = todayStr()) {
  const [y, m, d] = asOf.split('-').map(Number);
  if (country.taxYearType === 'uk') {
    if (m > 4 || (m === 4 && d >= 6)) return y;
    return y - 1;
  }
  return y;
}

/**
 * Count unique days in a given country's records within the tax year range.
 * (Unique by date to avoid double-counting if multiple records land on same day.)
 */
export function daysInCountryForYear(records, country, year) {
  const { start, end } = taxYearBounds(country, year);
  const dates = new Set();
  for (const r of records) {
    if (r.countryCode !== country.code) continue;
    if (r.date < start || r.date > end) continue;
    dates.add(r.date);
  }
  return dates.size;
}

/**
 * Days remaining until we hit the threshold (for minimize) or to reach
 * the threshold (for maximize). Always a non-negative number; caller can
 * decide direction.
 */
export function daysUntilThreshold(country, days) {
  return Math.max(0, country.threshold - days);
}

/**
 * Total days left in the tax year after "today". Used to see how many
 * more days are even possible.
 */
export function daysLeftInTaxYear(country, year, asOf = todayStr()) {
  const { end } = taxYearBounds(country, year);
  if (asOf > end) return 0;
  // diffDays(end, asOf) + 1 (inclusive)
  const a = new Date(end + 'T00:00');
  const b = new Date(asOf + 'T00:00');
  return Math.max(0, Math.round((a - b) / 86400000) + 1);
}

/**
 * Evaluate residency status for a country given a day count.
 * Returns one of: 'safe' | 'caution' | 'warning' | 'critical' | 'triggered' | 'secured'
 *
 * For minimize-goal countries: hitting threshold = triggered (bad).
 * For maximize-goal countries (UAE): hitting threshold = secured (good).
 */
/**
 * Compute status given day count, threshold, and days remaining in the
 * tax year. For maximize goals we grade on achievability — being at 40
 * days in January is fine; being at 40 days in November is not.
 */
export function taxStatus(country, days, daysLeftInYear = null) {
  if (country.goal === 'maximize') {
    if (days >= country.threshold) return 'secured';
    const remaining = country.threshold - days;
    // If we have no info on time left, fall back to a pure "distance from
    // target" heuristic (legacy behavior).
    if (daysLeftInYear == null) {
      if (remaining <= 15) return 'caution';
      if (remaining <= 45) return 'warning';
      return 'critical';
    }
    // Not enough days left to even reach the target → critical
    if (daysLeftInYear < remaining) return 'critical';
    // Buffer = how much slack we have if we stayed in-country every
    // remaining day. buffer=0 means we MUST be in-country every day.
    const buffer = daysLeftInYear - remaining;
    if (buffer >= 45) return 'safe';       // plenty of headroom
    if (buffer >= 15) return 'caution';    // tight but fine
    return 'warning';                      // must be very disciplined
  }
  // Minimize — want to stay below threshold
  if (days >= country.threshold) return 'triggered';
  const pct = days / country.threshold;
  if (pct >= 0.90) return 'critical';
  if (pct >= 0.65) return 'warning';
  if (pct >= 0.33) return 'caution';
  return 'safe';
}

/**
 * Map a tax status to the urgency color key used by the design system
 * (safe / caution / warning / critical / expired). Lets us share styling.
 */
export function statusToUrgency(status) {
  switch (status) {
    case 'secured': return 'safe';
    case 'safe': return 'safe';
    case 'caution': return 'caution';
    case 'warning': return 'warning';
    case 'critical': return 'critical';
    case 'triggered': return 'expired';
    default: return 'safe';
  }
}

/**
 * Human label for the status of a given country at a given day count.
 */
export function statusLabel(country, status, days) {
  if (country.goal === 'maximize') {
    if (status === 'secured') return 'Residency secured';
    const remaining = country.threshold - days;
    if (status === 'safe') return `On track — ${remaining} more needed`;
    if (status === 'caution') return `On pace — ${remaining} more needed`;
    if (status === 'warning') return `Tight — need ${remaining} more`;
    return `At risk — need ${remaining} more`;
  }
  // minimize
  if (status === 'triggered') return 'Residency triggered';
  const remaining = country.threshold - days;
  if (status === 'critical') return `⚠ ${remaining} days until triggered`;
  if (status === 'warning') return `${remaining} days under threshold`;
  if (status === 'caution') return `${remaining} days under threshold`;
  return 'Comfortably safe';
}

/**
 * For a country + year, compute all the numbers the UI needs in one go.
 */
export function computeTaxSummary(country, year, records = null, asOf = todayStr()) {
  const recs = records || getRecords();
  const days = daysInCountryForYear(recs, country, year);
  const bounds = taxYearBounds(country, year);
  const daysLeft = daysLeftInTaxYear(country, year, asOf);
  const status = taxStatus(country, days, daysLeft);
  return {
    days,
    threshold: country.threshold,
    remaining: Math.max(0, country.threshold - days),
    status,
    urgency: statusToUrgency(status),
    bounds,
    daysLeft,
    label: statusLabel(country, status, days),
    goal: country.goal,
  };
}

/**
 * Summary across all tax countries for a given "display year" (calendar year).
 * For UK we use currentTaxYear() relative to the displayYear end so it tracks
 * the UK year whose start-year is the closest.
 */
export function allTaxSummaries(displayYear, records = null, asOf = todayStr()) {
  return TAX_COUNTRIES.map(country => {
    // For calendar countries, tax year = displayYear.
    // For UK tax year, the "year label" is the start year so we match up
    // with the displayed calendar year (e.g. display 2026 → UK 2026/27).
    const year = displayYear;
    return { country, ...computeTaxSummary(country, year, records, asOf) };
  });
}
