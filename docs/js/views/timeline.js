// Timeline tab rendering (Atlas design)
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

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthRecords = records.filter(r => r.date.startsWith(monthStr));

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const recordsByDay = {};
  for (const r of monthRecords) {
    const day = parseInt(r.date.split('-')[2], 10);
    if (!recordsByDay[day]) recordsByDay[day] = [];
    recordsByDay[day].push(r);
  }

  const todayParts = today.split('-').map(Number);
  const todayDay = (todayParts[0] === year && todayParts[1] === month + 1) ? todayParts[2] : -1;

  let calendarHtml = `
    <div class="cal-header">S</div><div class="cal-header">M</div><div class="cal-header">T</div>
    <div class="cal-header">W</div><div class="cal-header">T</div><div class="cal-header">F</div>
    <div class="cal-header">S</div>`;

  for (let i = 0; i < startWeekday; i++) {
    calendarHtml += '<div class="cal-day empty"></div>';
  }

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
    summaryHtml = '<div style="font-size:13px;color:var(--text-tertiary);padding:12px 4px">No travel recorded this month.</div>';
  } else {
    for (const entry of summaryEntries) {
      const j = jurisdictions.find(j => j.id === entry.id);
      if (!j) continue;
      summaryHtml += `
        <div class="summary-row">
          <span class="summary-emoji">${j.emoji}</span>
          <span class="summary-name">${escapeHtml(j.name)}</span>
          <span class="summary-count">${entry.count} day${entry.count === 1 ? '' : 's'}</span>
        </div>`;
    }
  }

  const totalDays = monthRecords.length;

  container.innerHTML = `
    <div class="nav-title">Timeline</div>
    <div class="card">
      <div class="month-selector">
        <button class="month-btn" id="prev-month" aria-label="Previous month"><svg width="16" height="16" style="transform:rotate(180deg)"><use href="#icon-chevron-right"/></svg></button>
        <div style="display:flex;flex-direction:column;align-items:center">
          <span class="month-label">${monthName}</span>
          <span style="font-size:11px;color:var(--text-tertiary);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px">${totalDays} day${totalDays === 1 ? '' : 's'} logged</span>
        </div>
        <button class="month-btn" id="next-month" aria-label="Next month"><svg width="16" height="16"><use href="#icon-chevron-right"/></svg></button>
      </div>
      <div class="calendar-grid">${calendarHtml}</div>
    </div>
    <div class="card">
      <div class="rule-card-label">This month</div>
      <div class="monthly-summary">${summaryHtml}</div>
    </div>`;

  container.querySelector('#prev-month').addEventListener('click', () => {
    currentMonth = new Date(year, month - 1, 1);
    renderTimeline();
  });
  container.querySelector('#next-month').addEventListener('click', () => {
    currentMonth = new Date(year, month + 1, 1);
    renderTimeline();
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
