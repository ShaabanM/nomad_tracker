// Timeline tab rendering
import { countryFlag } from '../data/jurisdictions.js';
import { getJurisdictionsForCitizenship } from '../data/citizenship-rules.js';
import { getRecords, toDateStr, parseDate, todayStr, getCitizenship } from '../services/storage.js';

let currentMonth = new Date();

export function renderTimeline() {
  const records = getRecords();
  const today = todayStr();
  const container = document.getElementById('tab-timeline');
  const jurisdictions = getJurisdictionsForCitizenship(getCitizenship());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Month records
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthRecords = records.filter(r => r.date.startsWith(monthStr));

  // Calendar data
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  // Record lookup by day number
  const recordsByDay = {};
  for (const r of monthRecords) {
    const day = parseInt(r.date.split('-')[2], 10);
    if (!recordsByDay[day]) recordsByDay[day] = [];
    recordsByDay[day].push(r);
  }

  // Today's day number (if in current month)
  const todayParts = today.split('-').map(Number);
  const todayDay = (todayParts[0] === year && todayParts[1] === month + 1) ? todayParts[2] : -1;

  // Build calendar grid
  let calendarHtml = `
    <div class="cal-header">S</div><div class="cal-header">M</div><div class="cal-header">T</div>
    <div class="cal-header">W</div><div class="cal-header">T</div><div class="cal-header">F</div>
    <div class="cal-header">S</div>`;

  // Empty cells before first day
  for (let i = 0; i < startWeekday; i++) {
    calendarHtml += '<div class="cal-day empty"></div>';
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dayRecords = recordsByDay[d] || [];
    const isToday = d === todayDay;
    const hasRecord = dayRecords.length > 0;
    const jurisdiction = hasRecord
      ? jurisdictions.find(j => j.id === dayRecords[0].jurisdictionId)
      : null;

    const classes = ['cal-day'];
    if (isToday) classes.push('today');
    else if (hasRecord) classes.push('has-record');

    calendarHtml += `
      <div class="${classes.join(' ')}">
        <span class="cal-day-num">${d}</span>
        ${jurisdiction ? `<span class="cal-day-emoji">${jurisdiction.emoji}</span>` : ''}
      </div>`;
  }

  // Monthly summary
  const byJurisdiction = {};
  for (const r of monthRecords) {
    if (!byJurisdiction[r.jurisdictionId]) byJurisdiction[r.jurisdictionId] = new Set();
    byJurisdiction[r.jurisdictionId].add(r.date);
  }

  const summaryEntries = Object.entries(byJurisdiction)
    .map(([id, dates]) => ({ id, count: dates.size }))
    .sort((a, b) => b.count - a.count);

  let summaryHtml = '';
  if (summaryEntries.length === 0) {
    summaryHtml = '<div style="font-size:13px;color:var(--text-secondary);padding:8px 0">No travel recorded this month.</div>';
  } else {
    for (const entry of summaryEntries) {
      const j = jurisdictions.find(j => j.id === entry.id);
      if (!j) continue;
      summaryHtml += `
        <div class="summary-row">
          <span class="summary-emoji">${j.emoji}</span>
          <span class="summary-name">${j.name}</span>
          <span class="summary-count">${entry.count} days</span>
        </div>`;
    }
  }

  container.innerHTML = `
    <div class="nav-title">Timeline</div>
    <div class="card">
      <div class="month-selector">
        <button class="month-btn" id="prev-month">\u2039</button>
        <span class="month-label">${monthName}</span>
        <button class="month-btn" id="next-month">\u203A</button>
      </div>
      <div class="calendar-grid">${calendarHtml}</div>
    </div>
    <div class="card">
      <div style="font-size:17px;font-weight:600;margin-bottom:8px">This Month</div>
      <div class="monthly-summary">${summaryHtml}</div>
    </div>`;

  // Wire up month nav
  container.querySelector('#prev-month').addEventListener('click', () => {
    currentMonth = new Date(year, month - 1, 1);
    renderTimeline();
  });
  container.querySelector('#next-month').addEventListener('click', () => {
    currentMonth = new Date(year, month + 1, 1);
    renderTimeline();
  });
}
