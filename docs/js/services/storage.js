// localStorage CRUD for StayRecords

const RECORDS_KEY = 'nomad_records';
const ONBOARDING_KEY = 'nomad_onboarding';
const LOCATION_KEY = 'nomad_last_location';
const CITIZENSHIP_KEY = 'nomad_citizenship';

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

// Add a date range of records
export function addDateRange(jurisdictionId, countryCode, startDate, endDate, source = 'manual') {
  const start = toDateStr(startDate);
  const end = toDateStr(endDate);
  let current = start;
  let added = 0;
  while (current <= end) {
    const record = makeRecord(parseDate(current), countryCode, jurisdictionId, source);
    if (addRecord(record)) added++;
    current = addDays(current, 1);
  }
  return added;
}

// Gap filling: fill in days between last record and today (max 30)
export function fillGaps(jurisdictionId, countryCode) {
  const records = getRecords().filter(r => r.jurisdictionId === jurisdictionId);
  if (records.length === 0) return 0;

  const today = todayStr();
  const sorted = records.map(r => r.date).sort();
  const lastDate = sorted[sorted.length - 1];

  if (lastDate >= today) return 0;

  let current = addDays(lastDate, 1);
  let filled = 0;
  const maxGap = 30;

  while (current < today && filled < maxGap) {
    const record = makeRecord(parseDate(current), countryCode, jurisdictionId, 'gps');
    if (addRecord(record)) filled++;
    current = addDays(current, 1);
  }
  return filled;
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

// Citizenship setting (defaults to 'CA' for backward compat)
export function getCitizenship() {
  return localStorage.getItem(CITIZENSHIP_KEY) || 'CA';
}

export function setCitizenship(code) {
  localStorage.setItem(CITIZENSHIP_KEY, code);
}
