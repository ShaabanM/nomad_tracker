// Timeline tab rendering
import { ALL_JURISDICTIONS } from '../data/jurisdictions.js';
import { getRecords, todayStr } from '../services/storage.js';

let currentMonth = new Date();

export function renderTimeline() {
  const records = getRecords();
  const today = todayStr();
  const container = document.getElementById('tab-timeline');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthRecords = records.filter((record) => record.date.startsWith(monthPrefix));

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const recordsByDay = groupRecordsByDay(monthRecords);
  const todayParts = today.split('-').map(Number);
  const todayDay = (todayParts[0] === year && todayParts[1] === month + 1) ? todayParts[2] : -1;

  const uniqueDays = new Set(monthRecords.map((record) => record.date)).size;
  const manualDays = new Set(monthRecords.filter((record) => record.source === 'manual').map((record) => record.date)).size;
  const jurisdictionCount = new Set(monthRecords.map((record) => record.jurisdictionId)).size;
  const gpsDays = Math.max(0, uniqueDays - manualDays);

  const calendarHtml = renderCalendar(recordsByDay, daysInMonth, startWeekday, todayDay);
  const summaryHtml = renderMonthlySummary(monthRecords);

  container.innerHTML = `
    <div class="nav-title">Timeline</div>

    <div class="insight-grid">
      ${insightCard('Logged days', uniqueDays, 'Unique days recorded this month')}
      ${insightCard('Jurisdictions', jurisdictionCount, 'Different visa zones touched')}
      ${insightCard('Manual days', manualDays, 'Added from your past travel')}
      ${insightCard('GPS days', gpsDays, 'Captured from live location')}
    </div>

    <div class="card">
      <div class="month-selector">
        <button class="month-btn" id="prev-month">‹</button>
        <span class="month-label">${monthName}</span>
        <button class="month-btn" id="next-month">›</button>
      </div>
      <div class="calendar-grid">${calendarHtml}</div>
    </div>

    <div class="card">
      <div class="detail-card-header">
        <div style="font-size:17px;font-weight:600">This Month</div>
        <div class="detail-muted">${uniqueDays} logged day${uniqueDays === 1 ? '' : 's'}</div>
      </div>
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

function renderCalendar(recordsByDay, daysInMonth, startWeekday, todayDay) {
  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let html = weekdayLabels.map((label, index) => `<div class="cal-header" data-weekday="${index}">${label}</div>`).join('');

  for (let index = 0; index < startWeekday; index += 1) {
    html += '<div class="cal-day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayRecords = recordsByDay[day] || [];
    const isToday = day === todayDay;
    const hasRecord = dayRecords.length > 0;
    const jurisdiction = hasRecord
      ? ALL_JURISDICTIONS.find((item) => item.id === dayRecords[0].jurisdictionId)
      : null;

    const classes = ['cal-day'];
    if (isToday) classes.push('today');
    else if (hasRecord) classes.push('has-record');

    html += `
      <div class="${classes.join(' ')}">
        <span class="cal-day-num">${day}</span>
        ${jurisdiction ? `<span class="cal-day-emoji">${jurisdiction.emoji}</span>` : ''}
      </div>`;
  }

  return html;
}

function renderMonthlySummary(monthRecords) {
  const byJurisdiction = {};

  monthRecords.forEach((record) => {
    if (!byJurisdiction[record.jurisdictionId]) byJurisdiction[record.jurisdictionId] = new Set();
    byJurisdiction[record.jurisdictionId].add(record.date);
  });

  const summaryEntries = Object.entries(byJurisdiction)
    .map(([id, dates]) => ({ id, count: dates.size }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  if (!summaryEntries.length) {
    return '<div class="detail-empty">No travel recorded this month yet.</div>';
  }

  return summaryEntries.map((entry) => {
    const jurisdiction = ALL_JURISDICTIONS.find((item) => item.id === entry.id);
    if (!jurisdiction) return '';
    return `
      <div class="summary-row">
        <span class="summary-emoji">${jurisdiction.emoji}</span>
        <span class="summary-name">${jurisdiction.name}</span>
        <span class="summary-count">${entry.count} days</span>
      </div>`;
  }).join('');
}

function groupRecordsByDay(monthRecords) {
  const grouped = {};

  monthRecords.forEach((record) => {
    const day = parseInt(record.date.split('-')[2], 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(record);
  });

  return grouped;
}

function insightCard(label, value, note) {
  return `<div class="card insight-card">
    <div class="insight-label">${label}</div>
    <div class="insight-value">${value}</div>
    <div class="insight-note">${note}</div>
  </div>`;
}
