// Visa day counting algorithms — ported from RulesEngine.swift
import { RULE_TYPES } from '../data/jurisdictions.js';
import { toDateStr, todayStr, parseDate, addDays, diffDays, getRecords } from './storage.js';

// Core: how many days used in a jurisdiction
export function daysUsed(jurisdiction, records, asOf = todayStr()) {
  const relevant = records.filter(r => r.jurisdictionId === jurisdiction.id);

  switch (jurisdiction.ruleType) {
    case RULE_TYPES.ROLLING:
      return daysInRollingWindow(relevant, jurisdiction.windowDays, asOf);
    case RULE_TYPES.PER_VISIT:
      return daysInCurrentVisit(relevant, asOf);
    case RULE_TYPES.CALENDAR_YEAR:
      return daysInCalendarYear(relevant, asOf);
    default:
      return 0;
  }
}

// Core: how many days remain
export function daysRemaining(jurisdiction, records, asOf = todayStr()) {
  const used = daysUsed(jurisdiction, records, asOf);
  return Math.max(0, jurisdiction.maxDays - used);
}

// Usage percentage (0-1)
export function usagePercentage(jurisdiction, records, asOf = todayStr()) {
  const used = daysUsed(jurisdiction, records, asOf);
  if (jurisdiction.maxDays <= 0) return 0;
  return Math.min(1, used / jurisdiction.maxDays);
}

// How many continuous days can you legally stay starting from asOf
export function continuousStayDaysAvailable(jurisdiction, records, asOf = todayStr()) {
  const relevant = records.filter(r => r.jurisdictionId === jurisdiction.id);
  const isPresentToday = relevant.some(r => r.date === asOf);

  switch (jurisdiction.ruleType) {
    case RULE_TYPES.ROLLING:
      return projectedRollingStayDays(relevant, jurisdiction.maxDays, jurisdiction.windowDays, asOf);

    case RULE_TYPES.PER_VISIT: {
      const used = daysInCurrentVisit(relevant, asOf);
      const inclusive = isPresentToday ? (jurisdiction.maxDays - used + 1) : (jurisdiction.maxDays - used);
      return Math.max(0, inclusive);
    }

    case RULE_TYPES.CALENDAR_YEAR: {
      const used = daysInCalendarYear(relevant, asOf);
      const inclusive = isPresentToday ? (jurisdiction.maxDays - used + 1) : (jurisdiction.maxDays - used);
      return Math.max(0, inclusive);
    }

    default:
      return 0;
  }
}

// Date when you must leave (if staying continuously)
export function mustLeaveBy(jurisdiction, records, asOf = todayStr()) {
  const stayable = continuousStayDaysAvailable(jurisdiction, records, asOf);
  if (stayable <= 0) return asOf;
  return addDays(asOf, stayable - 1);
}

// For rolling windows: how many extra days you gain from old days falling off
export function projectedExtraDays(jurisdiction, records, asOf = todayStr()) {
  if (jurisdiction.ruleType !== RULE_TYPES.ROLLING) return 0;

  const relevant = records.filter(r => r.jurisdictionId === jurisdiction.id);
  const isPresentToday = relevant.some(r => r.date === asOf);
  const naiveDays = Math.max(0, daysRemaining(jurisdiction, records, asOf) + (isPresentToday ? 1 : 0));
  const projected = continuousStayDaysAvailable(jurisdiction, records, asOf);

  return Math.max(0, projected - naiveDays);
}

// For rolling windows: when does the earliest day fall off?
export function nextDayFallsOff(jurisdiction, records, asOf = todayStr()) {
  if (jurisdiction.ruleType !== RULE_TYPES.ROLLING) return null;

  const relevant = records
    .filter(r => r.jurisdictionId === jurisdiction.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const windowStart = addDays(asOf, -jurisdiction.windowDays);
  const inWindow = relevant.filter(r => r.date >= windowStart && r.date <= asOf);
  if (inWindow.length === 0) return null;

  const earliest = inWindow[0];
  const fallOffDate = addDays(earliest.date, jurisdiction.windowDays + 1);
  const count = inWindow.filter(r => r.date === earliest.date).length;

  return { date: fallOffDate, count };
}

// For calendar year: when does the counter reset?
export function calendarYearResetDate(asOf = todayStr()) {
  const year = parseDate(asOf).getFullYear();
  return `${year + 1}-01-01`;
}

// Urgency level for display
export function urgencyLevel(jurisdiction, records, asOf = todayStr()) {
  const remaining = daysRemaining(jurisdiction, records, asOf);
  const used = daysUsed(jurisdiction, records, asOf);
  const max = jurisdiction.maxDays;
  const isPresentToday = records.some(
    r => r.jurisdictionId === jurisdiction.id && r.date === asOf
  );

  if (used === 0) return 'safe';
  if (used > max) return 'expired';
  if (remaining === 0) return isPresentToday ? 'critical' : 'expired';
  if (remaining <= 7) return 'critical';

  const pct = remaining / max;
  if (pct < 0.15) return 'critical';
  if (pct < 0.33) return 'warning';
  if (pct < 0.66) return 'caution';
  return 'safe';
}

// --- Private helpers ---

function daysInRollingWindow(records, windowDays, asOf) {
  const windowStart = addDays(asOf, -(windowDays - 1));
  const uniqueDays = new Set(
    records
      .filter(r => r.date >= windowStart && r.date <= asOf)
      .map(r => r.date)
  );
  return uniqueDays.size;
}

function daysInCurrentVisit(records, asOf) {
  const uniqueDates = [...new Set(records.map(r => r.date))].sort().reverse();
  let count = 0;
  let expected = asOf;

  for (const date of uniqueDates) {
    if (date === expected) {
      count++;
      expected = addDays(expected, -1);
    } else {
      break;
    }
  }
  return count;
}

function daysInCalendarYear(records, asOf) {
  const year = parseDate(asOf).getFullYear();
  const yearStart = `${year}-01-01`;
  const uniqueDays = new Set(
    records
      .filter(r => r.date >= yearStart && r.date <= asOf)
      .map(r => r.date)
  );
  return uniqueDays.size;
}

// Simulate continuous stay forward for rolling windows
function projectedRollingStayDays(records, maxDays, windowDays, asOf) {
  const existingDays = new Set(records.map(r => r.date));
  const occupiedDays = new Set(existingDays);
  let projectedDate = asOf;
  let legalDays = 0;

  while (legalDays < maxDays) {
    occupiedDays.add(projectedDate);

    const windowStart = addDays(projectedDate, -(windowDays - 1));
    let usedInWindow = 0;
    for (const d of occupiedDays) {
      if (d >= windowStart && d <= projectedDate) usedInWindow++;
    }

    if (usedInWindow > maxDays) break;
    legalDays++;
    projectedDate = addDays(projectedDate, 1);
  }

  return legalDays;
}
