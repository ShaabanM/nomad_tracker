// localStorage CRUD for StayRecords

const RECORDS_KEY = 'nomad_records';
const ONBOARDING_KEY = 'nomad_onboarding';
const LOCATION_KEY = 'nomad_last_location';
const CITIZENSHIP_KEY = 'nomad_citizenship';
const LAST_SEEN_KEY = 'nomad_last_seen';
const GAP_REVIEWED_KEY = 'nomad_gap_reviewed_through'; // last date through which gaps have been acknowledged
const OVERRIDE_LOCATION_KEY = 'nomad_override_location'; // manual location override

// Date helpers — all dates stored as YYYY-MM-DD strings
export function toDateStr(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export function todayStr() {
  return toDateStr(new Date());
}

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function diffDays(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  return Math.round((da - db) / 86400000);
}

// Records CRUD
export function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function addRecord(record) {
  const records = getRecords();
  // Prevent duplicates: same date + same jurisdictionId
  const exists = records.some(
    r => r.date === record.date && r.jurisdictionId === record.jurisdictionId
  );
  if (!exists) {
    records.push(record);
    saveRecords(records);
    return true;
  }
  return false;
}

export function updateRecordSource(id, source) {
  const records = getRecords();
  const r = records.find(x => x.id === id);
  if (r) {
    r.source = source;
    saveRecords(records);
  }
}

export function deleteRecord(id) {
  const records = getRecords().filter(r => r.id !== id);
  saveRecords(records);
}

export function clearJurisdiction(jurisdictionId) {
  const records = getRecords().filter(r => r.jurisdictionId !== jurisdictionId);
  saveRecords(records);
}

export function clearAllRecords() {
  saveRecords([]);
}

export function makeRecord(date, countryCode, jurisdictionId, source = 'manual') {
  return {
    id: crypto.randomUUID(),
    date: toDateStr(date),
    countryCode,
    jurisdictionId,
    source,
  };
}

// Add a date range of records (inclusive)
export function addDateRange(jurisdictionId, countryCode, startDate, endDate, source = 'manual') {
  const start = toDateStr(startDate);
  const end = toDateStr(endDate);
  if (start > end) return 0;
  let current = start;
  let added = 0;
  while (current <= end) {
    const record = makeRecord(parseDate(current), countryCode, jurisdictionId, source);
    if (addRecord(record)) added++;
    current = addDays(current, 1);
  }
  return added;
}

// --- Backfill / gap logic ---

// Return the very last recorded date across ALL jurisdictions, plus its jurisdiction.
export function getLastRecord() {
  const records = getRecords();
  if (records.length === 0) return null;
  let latest = records[0];
  for (const r of records) {
    if (r.date > latest.date) latest = r;
  }
  return latest;
}

// Compute gap info vs today.
// Returns { gapDays, gapStart, gapEnd, lastRecord } or null if no gap.
// gapDays = count of days between last record (exclusive) and today (exclusive).
// Today is handled separately (logged as 'gps' when we open the app).
export function computeGap() {
  const last = getLastRecord();
  if (!last) return null;
  const today = todayStr();
  if (last.date >= today) return null;

  const gapStart = addDays(last.date, 1);
  // gap ends the day before today (today gets logged fresh)
  const gapEndExclusive = today; // exclusive
  if (gapStart >= gapEndExclusive) return null;

  const gapDays = diffDays(gapEndExclusive, gapStart); // e.g., start=Apr 2, today=Apr 6 → 4 days (Apr 2,3,4,5)
  return { gapDays, gapStart, gapEndExclusive, lastRecord: last };
}

/**
 * Smart backfill.
 * - Always logs today if currentJurisdiction is trackable (not visa-required/home/unrestricted).
 * - If there's a gap and the current jurisdiction matches the last recorded jurisdiction,
 *   silently fills the gap as 'inferred'.
 * - If the current jurisdiction differs, leaves the gap unfilled and flags needsReview.
 *
 * Returns { todayLogged, filled, gap, needsReview }.
 */
export function smartBackfill(currentLocation) {
  const result = {
    todayLogged: false,
    filled: 0,
    gap: null,
    needsReview: false,
  };

  const currentJ = currentLocation?.jurisdiction;
  const isTrackable = !!(currentJ && !currentJ.visaRequired && !currentJ.homeCountry && !currentJ.unrestricted);

  const today = todayStr();
  const gap = computeGap();
  result.gap = gap;

  // Log today first (so it exists before we start computing gap fills off it)
  if (isTrackable) {
    const code = [...currentJ.countryCodes][0] || currentLocation.countryCode;
    const rec = makeRecord(new Date(), code, currentJ.id, 'gps');
    if (addRecord(rec)) result.todayLogged = true;
  }

  if (!gap) return result;

  const { gapStart, gapEndExclusive, lastRecord } = gap;

  // If current location matches last recorded jurisdiction → auto-fill silently
  if (isTrackable && lastRecord.jurisdictionId === currentJ.id) {
    const code = [...currentJ.countryCodes][0] || currentLocation.countryCode;
    let current = gapStart;
    while (current < gapEndExclusive) {
      const rec = makeRecord(parseDate(current), code, currentJ.id, 'inferred');
      if (addRecord(rec)) result.filled++;
      current = addDays(current, 1);
    }
  } else {
    // Mismatch — don't guess. Flag for review.
    // Only mark needsReview if user hasn't already reviewed through today.
    const reviewedThrough = getGapReviewedThrough();
    if (!reviewedThrough || reviewedThrough < today) {
      result.needsReview = true;
    }
  }

  return result;
}

// Fill a specific gap range with a chosen jurisdiction (user-triggered resolution)
export function fillGapRange(jurisdictionId, countryCode, startDate, endDate, source = 'inferred') {
  return addDateRange(jurisdictionId, countryCode, new Date(startDate), new Date(endDate), source);
}

// --- Last-seen + gap-review bookkeeping ---

export function getLastSeen() {
  const v = localStorage.getItem(LAST_SEEN_KEY);
  return v ? Number(v) : null;
}

export function setLastSeen(ts = Date.now()) {
  localStorage.setItem(LAST_SEEN_KEY, String(ts));
}

export function getGapReviewedThrough() {
  return localStorage.getItem(GAP_REVIEWED_KEY) || null;
}

export function setGapReviewedThrough(dateStr = todayStr()) {
  localStorage.setItem(GAP_REVIEWED_KEY, dateStr);
}

// Onboarding state
export function hasCompletedOnboarding() {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function setOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

// Last known location cache
export function getLastLocation() {
  try {
    return JSON.parse(localStorage.getItem(LOCATION_KEY));
  } catch {
    return null;
  }
}

export function saveLastLocation(location) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify({
    ...location,
    timestamp: Date.now(),
  }));
}

// Manual location override (user-set country). Null to clear.
export function getLocationOverride() {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_LOCATION_KEY));
  } catch {
    return null;
  }
}

export function setLocationOverride(override) {
  if (override === null) {
    localStorage.removeItem(OVERRIDE_LOCATION_KEY);
  } else {
    localStorage.setItem(OVERRIDE_LOCATION_KEY, JSON.stringify({
      ...override,
      timestamp: Date.now(),
    }));
  }
}

// Citizenship setting (defaults to 'CA' for backward compat)
export function getCitizenship() {
  return localStorage.getItem(CITIZENSHIP_KEY) || 'CA';
}

export function setCitizenship(code) {
  localStorage.setItem(CITIZENSHIP_KEY, code);
}

// --- Data export/import ---

export function exportData() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    citizenship: getCitizenship(),
    records: getRecords(),
    lastLocation: getLastLocation(),
    locationOverride: getLocationOverride(),
  };
}

// Imports records, merging by (date, jurisdictionId). Returns { imported, skipped }.
export function importData(data) {
  const result = { imported: 0, skipped: 0 };
  if (!data || !Array.isArray(data.records)) {
    throw new Error('Invalid backup file');
  }
  const existing = getRecords();
  const key = r => `${r.date}|${r.jurisdictionId}`;
  const seen = new Set(existing.map(key));
  for (const r of data.records) {
    if (!r.date || !r.jurisdictionId || !r.countryCode) {
      result.skipped++;
      continue;
    }
    if (seen.has(key(r))) {
      result.skipped++;
      continue;
    }
    existing.push({
      id: r.id || crypto.randomUUID(),
      date: r.date,
      countryCode: r.countryCode,
      jurisdictionId: r.jurisdictionId,
      source: r.source || 'manual',
    });
    seen.add(key(r));
    result.imported++;
  }
  saveRecords(existing);
  if (data.citizenship && typeof data.citizenship === 'string') {
    setCitizenship(data.citizenship);
  }
  return result;
}

// --- Deprecated shim (kept so old modules still import without breaking) ---
// Old behavior is replaced by smartBackfill. This is a no-op to avoid silent wrong fills.
export function fillGaps() {
  return 0;
}
