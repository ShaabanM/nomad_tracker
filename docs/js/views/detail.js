// Jurisdiction detail modal
import { ALL_JURISDICTIONS, countryFlag, ruleDescription, ruleLabel } from '../data/jurisdictions.js';
import * as rules from '../services/rules-engine.js';
import { getRecords, addDateRange, clearJurisdiction, deleteRecord, todayStr, toDateStr } from '../services/storage.js';
import { renderProgressRing } from './dashboard.js';

export function showDetail(jurisdictionId, location) {
  const jurisdiction = ALL_JURISDICTIONS.find((item) => item.id === jurisdictionId);
  if (!jurisdiction) return;

  const records = getRecords();
  const today = todayStr();
  const used = rules.daysUsed(jurisdiction, records, today);
  const remaining = rules.daysRemaining(jurisdiction, records, today);
  const urgency = rules.urgencyLevel(jurisdiction, records, today);
  const max = jurisdiction.maxDays;
  const isHere = location?.jurisdiction?.id === jurisdiction.id;
  const leaveBy = used > 0 || isHere ? rules.mustLeaveBy(jurisdiction, records, today) : null;
  const projectedStay = used > 0 || isHere ? rules.continuousStayDaysAvailable(jurisdiction, records, today) : max;
  const extraDays = rules.projectedExtraDays(jurisdiction, records, today);
  const nextFallOff = rules.nextDayFallsOff(jurisdiction, records, today);
  const fullReset = rules.fullAllowanceResetDate(jurisdiction, records, today);
  const pct = Math.min(100, (used / max) * 100);
  const jRecords = records
    .filter((record) => record.jurisdictionId === jurisdiction.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const modal = document.getElementById('modal');
  const closeModal = () => {
    modal.classList.remove('open');
    modal.onclick = null;
  };

  const heroTitle = buildHeroTitle(jurisdiction, remaining, urgency, isHere, used);
  const heroCopy = buildHeroCopy(jurisdiction, remaining, leaveBy, isHere, used, extraDays);
  const planningHtml = renderPlanningCard(jurisdiction, leaveBy, projectedStay, nextFallOff, extraDays, fullReset);
  const notesHtml = renderBulletCard('Important Notes', '⚠️', jurisdiction.notes, 'note-item', 'note-bullet');
  const tipsHtml = renderBulletCard('Practical Tips', '💡', jurisdiction.tips, 'tip-item', 'tip-bullet');
  const logRows = jRecords.slice(0, 40).map((record) => `
    <div class="day-log-row" data-record-id="${record.id}">
      <span class="day-log-flag">${countryFlag(record.countryCode)}</span>
      <span class="day-log-date">${formatDateLong(record.date)}</span>
      <span class="day-log-source">${record.source === 'gps' ? 'GPS' : 'Manual'}</span>
      <button class="day-log-delete" title="Delete">✕</button>
    </div>
  `).join('');
  const moreText = jRecords.length > 40
    ? `<div class="history-footnote">+ ${jRecords.length - 40} more logged day${jRecords.length - 40 === 1 ? '' : 's'}</div>`
    : '';

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>

    <div class="card card-active border-${urgency} detail-hero">
      <div class="detail-hero-head">
        <div>
          <div class="detail-hero-kicker">${isHere ? 'Live jurisdiction' : 'Jurisdiction detail'}</div>
          <div class="detail-hero-title">${jurisdiction.emoji} ${jurisdiction.name}</div>
          <div class="detail-hero-copy">${heroCopy}</div>
        </div>
        <div class="detail-hero-badge">${heroTitle}</div>
      </div>

      <div class="detail-hero-body">
        ${renderProgressRing(used, max, urgency, 148)}
        <div class="detail-stats-grid">
          ${detailMetric('Rule', ruleLabel(jurisdiction), ruleDescription(jurisdiction))}
          ${detailMetric('Remaining', `${remaining} days`, leaveBy ? `Stay through ${formatDateLong(leaveBy)}` : 'No days recorded yet')}
          ${detailMetric('Projected stay', `${projectedStay} days`, 'If you remain continuously from today')}
          ${detailMetric('Full reset', fullReset ? formatDateLong(fullReset) : 'Not needed', fullReset ? 'If you left today' : 'No reset date applies right now')}
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${pct}%;background:var(--${urgencyColor(urgency)})"></div>
      </div>
    </div>

    <div class="card">
      <div class="rule-card-label">📘 Rule Summary</div>
      <div class="detail-section-copy">${ruleDescription(jurisdiction)}</div>
      <div class="rule-card-desc">${ruleExplanation(jurisdiction)}</div>
    </div>

    ${planningHtml}
    ${notesHtml}
    ${tipsHtml}

    <div class="card">
      <div class="detail-card-header">
        <div class="rule-card-label">📅 Day Log</div>
        <div class="detail-muted">${jRecords.length} logged day${jRecords.length === 1 ? '' : 's'}</div>
      </div>
      ${jRecords.length === 0 ? '<div class="detail-empty">No days recorded yet for this jurisdiction.</div>' : ''}
      ${logRows}
      ${moreText}
    </div>

    <button class="btn btn-bordered" id="detail-add-days">Add Past Days</button>
    <button class="btn btn-destructive" id="detail-clear">Clear All Days for ${jurisdiction.name}</button>
    <button class="btn btn-text" id="detail-close">Close</button>`;

  modal.classList.add('open');
  modal.onclick = (event) => {
    if (event.target === modal) closeModal();
  };

  modal.querySelectorAll('.day-log-delete').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const row = button.closest('.day-log-row');
      deleteRecord(row.dataset.recordId);
      document.dispatchEvent(new CustomEvent('data-changed'));
      showDetail(jurisdictionId, location);
    });
  });

  modal.querySelector('#detail-add-days').addEventListener('click', () => {
    showAddDaysForJurisdiction(jurisdiction, location);
  });

  modal.querySelector('#detail-clear').addEventListener('click', () => {
    if (!confirm(`Delete all recorded days for ${jurisdiction.name}? This cannot be undone.`)) return;
    clearJurisdiction(jurisdiction.id);
    document.dispatchEvent(new CustomEvent('data-changed'));
    closeModal();
  });

  modal.querySelector('#detail-close').addEventListener('click', closeModal);
}

function showAddDaysForJurisdiction(jurisdiction, location) {
  const modal = document.getElementById('modal');
  const closeModal = () => {
    modal.classList.remove('open');
    modal.onclick = null;
  };
  const countryCodes = [...jurisdiction.countryCodes];
  const countryOptions = countryCodes.length > 1
    ? `<div class="form-group">
        <label class="form-label">Country</label>
        <select class="form-select" id="add-country">
          ${countryCodes.sort().map((code) => `
            <option value="${code}">${countryFlag(code)} ${new Intl.DisplayNames(['en'], { type: 'region' }).of(code)}</option>
          `).join('')}
        </select>
      </div>`
    : '';

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Add Past Days</div>
    <div class="detail-muted mb-12">${jurisdiction.emoji} ${jurisdiction.name}</div>
    <div class="form-group">
      <label class="form-label">From</label>
      <input type="date" class="form-input" id="add-start" value="${toDateStr(new Date())}">
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <input type="date" class="form-input" id="add-end" value="${toDateStr(new Date())}">
    </div>
    ${countryOptions}
    <div id="add-preview" class="detail-muted mb-12"></div>
    <button class="btn btn-primary" id="add-confirm">Add Days</button>
    <button class="btn btn-text" id="add-back">Back</button>`;

  modal.classList.add('open');
  modal.onclick = (event) => {
    if (event.target === modal) closeModal();
  };

  const updatePreview = () => {
    const start = document.getElementById('add-start').value;
    const end = document.getElementById('add-end').value;
    if (!start || !end) return;
    const startDate = new Date(`${start}T00:00`);
    const endDate = new Date(`${end}T00:00`);
    const days = Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
    document.getElementById('add-preview').textContent =
      `This will add ${days} day${days === 1 ? '' : 's'} to ${jurisdiction.name}.`;
  };

  document.getElementById('add-start').addEventListener('change', updatePreview);
  document.getElementById('add-end').addEventListener('change', updatePreview);
  updatePreview();

  document.getElementById('add-back').addEventListener('click', () => {
    showDetail(jurisdiction.id, location);
  });

  document.getElementById('add-confirm').addEventListener('click', () => {
    const start = document.getElementById('add-start').value;
    const end = document.getElementById('add-end').value;
    const code = document.getElementById('add-country')?.value || countryCodes[0] || 'XX';
    if (!start || !end) return;
    if (start > end) {
      alert('The end date must be on or after the start date.');
      return;
    }

    addDateRange(jurisdiction.id, code, new Date(`${start}T00:00`), new Date(`${end}T00:00`), 'manual');
    document.dispatchEvent(new CustomEvent('data-changed'));
    showDetail(jurisdiction.id, location);
  });
}

function renderPlanningCard(jurisdiction, leaveBy, projectedStay, nextFallOff, extraDays, fullReset) {
  const rows = [];

  if (leaveBy) {
    rows.push(planningRow(
      'Continuous stay projection',
      `If you remain continuously, you can stay through ${formatDateLong(leaveBy)} for about ${projectedStay} total day${projectedStay === 1 ? '' : 's'} from today.`
    ));
  }

  if (jurisdiction.ruleType === 'rolling' && nextFallOff) {
    rows.push(planningRow(
      `${nextFallOff.count} day${nextFallOff.count === 1 ? '' : 's'} fall off next`,
      `Window relief starts on ${formatDateLong(nextFallOff.date)}.`
    ));
  }

  if (jurisdiction.ruleType === 'rolling' && extraDays > 0) {
    rows.push(planningRow(
      `Runway extends by about ${extraDays} day${extraDays === 1 ? '' : 's'}`,
      'Older days should expire from the rolling window while you stay.'
    ));
  }

  if (jurisdiction.ruleType === 'rolling' && fullReset) {
    rows.push(planningRow(
      `Full allowance restores on ${formatDateLong(fullReset)}`,
      'That is the earliest clean-slate date if you leave now.'
    ));
  }

  if (jurisdiction.ruleType === 'calendarYear' && fullReset) {
    rows.push(planningRow(
      `Counter resets on ${formatDateLong(fullReset)}`,
      'Leaving and re-entering does not reset a calendar-year allowance.'
    ));
  }

  if (jurisdiction.ruleType === 'perVisit') {
    rows.push(planningRow(
      'Fresh allowance on re-entry',
      'This jurisdiction resets per visit, though immigration officers may still scrutinize repeated long stays.'
    ));
  }

  if (!rows.length) return '';

  return `<div class="card">
    <div class="rule-card-label">🧭 Planning Horizon</div>
    ${rows.join('')}
  </div>`;
}

function renderBulletCard(title, icon, items, itemClass, bulletClass) {
  if (!items.length) return '';

  return `<div class="card">
    <div class="rule-card-label">${icon} ${title}</div>
    ${items.map((item) => `
      <div class="${itemClass}">
        <span class="${bulletClass}">${itemClass === 'note-item' ? '•' : '→'}</span>
        <span>${item}</span>
      </div>
    `).join('')}
  </div>`;
}

function detailMetric(label, value, note) {
  return `<div class="detail-metric">
    <div class="detail-metric-label">${label}</div>
    <div class="detail-metric-value">${value}</div>
    <div class="detail-metric-note">${note}</div>
  </div>`;
}

function planningRow(title, detail) {
  return `<div class="planning-row">
    <div class="planning-row-title">${title}</div>
    <div class="planning-row-detail">${detail}</div>
  </div>`;
}

function buildHeroTitle(jurisdiction, remaining, urgency, isHere, used) {
  if (urgency === 'expired') return 'Expired';
  if (remaining === 0 && isHere) return 'Final Day';
  if (urgency === 'critical') return 'Action';
  if (used === 0) return 'Open';
  return `${remaining} days`;
}

function buildHeroCopy(jurisdiction, remaining, leaveBy, isHere, used, extraDays) {
  if (used === 0 && !isHere) {
    return `You have no active counted days in ${jurisdiction.name} right now, but this view tracks the rule set and any historical stays you recorded.`;
  }

  if (leaveBy === todayStr()) {
    return `Today is your last legal day in ${jurisdiction.name}. Plan your exit now and watch for any overnight rolling-window relief.`;
  }

  const extensionNote = extraDays > 0
    ? ` Older days may fall out of the window while you stay, buying you about ${extraDays} extra day${extraDays === 1 ? '' : 's'}.`
    : '';

  if (isHere) {
    return `${remaining} day${remaining === 1 ? '' : 's'} remain, and your current stay projects through ${formatDateLong(leaveBy)}.${extensionNote}`;
  }

  return `${remaining} day${remaining === 1 ? '' : 's'} are currently available here based on your logged history.${extensionNote}`;
}

function ruleExplanation(jurisdiction) {
  switch (jurisdiction.ruleType) {
    case 'rolling':
      return `Immigration looks back ${jurisdiction.windowDays} days from any given date and counts how many of those days you were present. Once that count reaches ${jurisdiction.maxDays}, you must leave or wait for older days to expire from the window.`;
    case 'perVisit':
      return `Each entry starts a fresh allowance of up to ${jurisdiction.maxDays} days. The formal clock resets when you leave and return, but real-world officer discretion still matters in countries that watch for repeated long stays.`;
    case 'calendarYear':
      return `All days spent during the calendar year count toward the ${jurisdiction.maxDays}-day cap. Leaving and re-entering does not reset the counter; only the new calendar year does.`;
    default:
      return '';
  }
}

function urgencyColor(urgency) {
  return { safe: 'green', caution: 'yellow', warning: 'orange', critical: 'red', expired: 'red' }[urgency] || 'green';
}

function formatDateLong(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
