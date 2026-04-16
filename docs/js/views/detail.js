// Jurisdiction detail modal
import { countryFlag, ruleLabel, ruleDescription } from '../data/jurisdictions.js';
import { findJurisdictionForCitizenship } from '../data/citizenship-rules.js';
import * as rules from '../services/rules-engine.js';
import {
  getRecords,
  addDateRange,
  clearJurisdiction,
  deleteRecord,
  todayStr,
  toDateStr,
  parseDate,
  addDays,
  diffDays,
  getCitizenship,
} from '../services/storage.js';
import { renderProgressRing } from './dashboard.js';

export function showDetail(jurisdictionId, location) {
  const jurisdiction = findJurisdictionForCitizenship(jurisdictionId, getCitizenship());
  if (!jurisdiction) return;

  const records = getRecords();
  const today = todayStr();
  const modal = document.getElementById('modal');
  const isHere = location?.jurisdiction?.id === jurisdiction.id;
  const jRecords = records.filter(r => r.jurisdictionId === jurisdiction.id).sort((a, b) => b.date.localeCompare(a.date));

  // Visa-required detail view
  if (jurisdiction.visaRequired) {
    modal.querySelector('.modal-sheet').innerHTML = `
      <div class="modal-handle"></div>
      <div class="card" style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">${jurisdiction.emoji}</div>
        <div style="font-size:22px;font-weight:700">${escapeHtml(jurisdiction.name)}</div>
        <div style="margin-top:16px">
          <span class="visa-badge" style="font-size:16px;padding:6px 16px">VISA REQUIRED</span>
        </div>
        <div style="font-size:14px;color:var(--text-secondary);margin-top:16px;line-height:1.5">
          ${escapeHtml(jurisdiction.visaInfo || 'A visa is required for this destination.')}
        </div>
      </div>
      ${jRecords.length > 0 ? renderDayLog(jRecords, jurisdiction) : ''}
      <button class="btn btn-text" id="detail-close" style="margin-top:8px">Close</button>`;
    modal.classList.add('open');
    wireCloseAndDelete(modal, jurisdictionId, jurisdiction, location, jRecords);
    return;
  }

  // Home country detail view
  if (jurisdiction.homeCountry) {
    modal.querySelector('.modal-sheet').innerHTML = `
      <div class="modal-handle"></div>
      <div class="card" style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">${jurisdiction.emoji}</div>
        <div style="font-size:22px;font-weight:700">${escapeHtml(jurisdiction.name)}</div>
        <div style="margin-top:16px">
          <span class="home-badge" style="font-size:16px;padding:6px 16px">HOME COUNTRY</span>
        </div>
        <div style="font-size:14px;color:var(--text-secondary);margin-top:16px;line-height:1.5">
          This is your home country. No visa or stay limits apply.
        </div>
      </div>
      <button class="btn btn-text" id="detail-close" style="margin-top:8px">Close</button>`;
    modal.classList.add('open');
    wireCloseAndDelete(modal, jurisdictionId, jurisdiction, location, []);
    return;
  }

  // Unrestricted access detail view
  if (jurisdiction.unrestricted) {
    const notesHtml = (jurisdiction.notes?.length > 0)
      ? `<div class="card">
          <div class="rule-card-label">⚠️ Notes</div>
          ${jurisdiction.notes.map(n => `<div class="note-item"><span class="note-bullet">•</span><span>${escapeHtml(n)}</span></div>`).join('')}
        </div>`
      : '';
    const tipsHtml = (jurisdiction.tips?.length > 0)
      ? `<div class="card">
          <div class="rule-card-label">💡 Tips</div>
          ${jurisdiction.tips.map(t => `<div class="tip-item"><span class="tip-bullet">→</span><span>${escapeHtml(t)}</span></div>`).join('')}
        </div>`
      : '';

    modal.querySelector('.modal-sheet').innerHTML = `
      <div class="modal-handle"></div>
      <div class="card" style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">${jurisdiction.emoji}</div>
        <div style="font-size:22px;font-weight:700">${escapeHtml(jurisdiction.name)}</div>
        <div style="margin-top:16px">
          <span class="home-badge" style="font-size:16px;padding:6px 16px">UNRESTRICTED</span>
        </div>
        <div style="font-size:14px;color:var(--text-secondary);margin-top:16px;line-height:1.5">
          You have unrestricted access. No time limits on stays.
        </div>
      </div>
      ${notesHtml}
      ${tipsHtml}
      <button class="btn btn-text" id="detail-close" style="margin-top:8px">Close</button>`;
    modal.classList.add('open');
    wireCloseAndDelete(modal, jurisdictionId, jurisdiction, location, []);
    return;
  }

  const used = rules.daysUsed(jurisdiction, records, today);
  const remaining = rules.daysRemaining(jurisdiction, records, today);
  const urgency = rules.urgencyLevel(jurisdiction, records, today);
  const max = jurisdiction.maxDays;
  const leaveBy = used > 0 ? rules.mustLeaveBy(jurisdiction, records, today) : null;
  const pct = Math.min(100, (used / max) * 100);

  // Source breakdown
  const sourceCounts = { gps: 0, inferred: 0, manual: 0 };
  for (const r of jRecords) {
    sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
  }
  const hasInferred = sourceCounts.inferred > 0;

  // Rule explanation
  let ruleExplanation = '';
  switch (jurisdiction.ruleType) {
    case 'rolling':
      ruleExplanation = `On any given day, immigration looks back ${jurisdiction.windowDays} days and counts how many you spent here. If that count reaches ${max}, you cannot enter.`;
      break;
    case 'perVisit':
      ruleExplanation = `Each time you leave and re-enter, you get a fresh ${max}-day allowance. Your clock resets on re-entry.`;
      break;
    case 'calendarYear':
      ruleExplanation = `All days in a calendar year count toward the ${max}-day limit. Resets on January 1. Leaving and re-entering does NOT reset the counter.`;
      break;
  }

  // Day falloff for rolling
  let falloffHtml = '';
  const falloff = rules.nextDayFallsOff(jurisdiction, records, today);
  if (falloff) {
    falloffHtml = `<div style="margin-top:8px;font-size:12px;color:var(--accent)">\u{1F504} Next day falls off: ${formatDate(falloff.date)}</div>`;
  }

  // Notes
  const notesHtml = jurisdiction.notes.length > 0
    ? `<div class="card">
        <div class="rule-card-label">\u26A0\uFE0F Important Notes</div>
        ${jurisdiction.notes.map(n => `<div class="note-item"><span class="note-bullet">\u2022</span><span>${escapeHtml(n)}</span></div>`).join('')}
      </div>`
    : '';

  // Tips
  const tipsHtml = jurisdiction.tips.length > 0
    ? `<div class="card">
        <div class="rule-card-label">\u{1F4A1} Tips</div>
        ${jurisdiction.tips.map(t => `<div class="tip-item"><span class="tip-bullet">\u2192</span><span>${escapeHtml(t)}</span></div>`).join('')}
      </div>`
    : '';

  const logRows = jRecords.slice(0, 30).map(r => renderDayRow(r)).join('');

  const moreText = jRecords.length > 30 ? `<div style="font-size:12px;color:var(--text-secondary);padding-top:4px">+ ${jRecords.length - 30} more days</div>` : '';

  // Source legend (if any inferred days)
  const sourceLegend = hasInferred
    ? `<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;display:flex;gap:14px;flex-wrap:wrap">
        <span>\u{1F4CD} GPS (${sourceCounts.gps})</span>
        <span>\u270B Manual (${sourceCounts.manual})</span>
        <span>\u{2728} Inferred (${sourceCounts.inferred})</span>
      </div>`
    : '';

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>

    <div class="card card-active border-${urgency}" style="text-align:center">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-size:36px">${jurisdiction.emoji}</span>
        ${isHere ? '<span style="font-size:12px;font-weight:600;color:white;background:var(--green);padding:3px 10px;border-radius:20px">\u{1F4CD} You are here</span>' : ''}
      </div>
      ${renderProgressRing(used, max, urgency, 150)}
      <div style="margin-top:12px">
        <div style="font-size:22px;font-weight:700">${remaining} days remaining</div>
        ${leaveBy ? `<div style="font-size:14px;color:var(--text-secondary);margin-top:4px">Can stay until ${formatDateLong(leaveBy)}</div>` : ''}
      </div>
      <div class="progress-bar" style="margin-top:12px">
        <div class="progress-bar-fill" style="width:${pct}%;background:var(--${urgencyColor(urgency)})"></div>
      </div>
    </div>

    <div class="card">
      <div class="rule-card-label">\u{1F4D6} Rule</div>
      <div style="font-size:15px;margin-bottom:4px">${ruleDescription(jurisdiction)}</div>
      <div class="rule-card-desc">${ruleExplanation}</div>
      ${falloffHtml}
    </div>

    ${notesHtml}
    ${tipsHtml}

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="rule-card-label">\u{1F4C5} Day Log</div>
        <span style="font-size:12px;color:var(--text-secondary)">${jRecords.length} days</span>
      </div>
      ${sourceLegend}
      ${jRecords.length === 0 ? '<div style="font-size:13px;color:var(--text-secondary)">No days recorded yet.</div>' : ''}
      ${logRows}
      ${moreText}
    </div>

    <button class="btn btn-bordered" id="detail-add-days" style="margin-bottom:8px">\u2795 Add Past Days</button>
    <button class="btn btn-destructive" id="detail-clear">\u{1F5D1} Clear All Days for ${escapeHtml(jurisdiction.name)}</button>
    <button class="btn btn-text" id="detail-close" style="margin-top:8px">Close</button>`;

  modal.classList.add('open');

  // Wire up delete buttons
  modal.querySelectorAll('.day-log-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.day-log-row');
      const id = row.dataset.recordId;
      deleteRecord(id);
      document.dispatchEvent(new CustomEvent('data-changed'));
      showDetail(jurisdictionId, location); // re-render
    });
  });

  // Wire up add days
  modal.querySelector('#detail-add-days').addEventListener('click', () => {
    showAddDaysForJurisdiction(jurisdiction, location);
  });

  // Wire up clear
  modal.querySelector('#detail-clear').addEventListener('click', () => {
    if (confirm(`Delete all recorded days for ${jurisdiction.name}? This cannot be undone.`)) {
      clearJurisdiction(jurisdiction.id);
      document.dispatchEvent(new CustomEvent('data-changed'));
      modal.classList.remove('open');
    }
  });

  // Wire up close
  modal.querySelector('#detail-close').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  // Close on overlay click
  const closeHandler = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.removeEventListener('click', closeHandler);
    }
  };
  modal.addEventListener('click', closeHandler);
}

function showAddDaysForJurisdiction(jurisdiction, location) {
  const modal = document.getElementById('modal');
  const today = todayStr();
  const countryCodes = [...jurisdiction.countryCodes];
  const countryOptions = countryCodes.length > 1
    ? `<div class="form-group">
        <label class="form-label">Country</label>
        <select class="form-select" id="add-country">
          ${countryCodes.sort().map(c => `<option value="${c}">${countryFlag(c)} ${escapeHtml(countryName(c))}</option>`).join('')}
        </select>
      </div>`
    : '';

  // Smart defaults: start = 7 days ago, end = today. Capped at today.
  const defaultStart = addDays(today, -7);
  const defaultEnd = today;

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Add Past Days</div>
    <div style="font-size:22px;margin-bottom:16px">${jurisdiction.emoji} ${escapeHtml(jurisdiction.name)}</div>
    <div class="form-group">
      <label class="form-label">From</label>
      <input type="date" class="form-input" id="add-start" value="${defaultStart}" max="${today}">
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <input type="date" class="form-input" id="add-end" value="${defaultEnd}" max="${today}">
    </div>
    ${countryOptions}
    <div id="add-preview" style="font-size:13px;color:var(--text-secondary);margin-bottom:16px"></div>
    <button class="btn btn-primary" id="add-confirm">Add Days</button>
    <button class="btn btn-text" id="add-back" style="margin-top:8px">Back</button>`;

  const startInput = document.getElementById('add-start');
  const endInput = document.getElementById('add-end');
  const preview = document.getElementById('add-preview');
  const confirmBtn = document.getElementById('add-confirm');

  const updatePreview = () => {
    const start = startInput.value;
    const end = endInput.value;
    if (!start || !end) {
      preview.textContent = '';
      confirmBtn.disabled = true;
      return;
    }
    if (start > today || end > today) {
      preview.innerHTML = '<span style="color:var(--red)">Dates cannot be in the future.</span>';
      confirmBtn.disabled = true;
      return;
    }
    if (start > end) {
      preview.innerHTML = '<span style="color:var(--red)">"From" must be on or before "To".</span>';
      confirmBtn.disabled = true;
      return;
    }
    const days = diffDays(end, start) + 1;
    preview.textContent = `This will add ${days} day${days === 1 ? '' : 's'} to ${jurisdiction.name}.`;
    confirmBtn.disabled = false;
  };

  startInput.addEventListener('change', updatePreview);
  endInput.addEventListener('change', updatePreview);
  updatePreview();

  document.getElementById('add-back').addEventListener('click', () => {
    showDetail(jurisdiction.id, location);
  });

  confirmBtn.addEventListener('click', () => {
    const start = startInput.value;
    const end = endInput.value;
    const code = document.getElementById('add-country')?.value || countryCodes[0] || 'XX';
    if (!start || !end || start > end || start > today || end > today) return;
    addDateRange(jurisdiction.id, code, new Date(start + 'T00:00'), new Date(end + 'T00:00'), 'manual');
    document.dispatchEvent(new CustomEvent('data-changed'));
    showDetail(jurisdiction.id, location);
  });
}

function urgencyColor(urgency) {
  return { safe: 'green', caution: 'yellow', warning: 'orange', critical: 'red', expired: 'red' }[urgency] || 'green';
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function sourceIcon(source) {
  if (source === 'gps') return '\u{1F4CD}';
  if (source === 'inferred') return '\u2728';
  return '\u270B'; // manual
}

function sourceTitle(source) {
  if (source === 'gps') return 'Logged via GPS';
  if (source === 'inferred') return 'Inferred — assumed you stayed in this jurisdiction';
  return 'Manually added';
}

function renderDayRow(r) {
  return `
    <div class="day-log-row" data-record-id="${r.id}">
      <span class="day-log-flag">${countryFlag(r.countryCode)}</span>
      <span class="day-log-date">${formatDateLong(r.date)}</span>
      <span class="day-log-source" title="${sourceTitle(r.source)}">${sourceIcon(r.source)}</span>
      <button class="day-log-delete" title="Delete">\u2715</button>
    </div>
  `;
}

function renderDayLog(jRecords, jurisdiction) {
  const logRows = jRecords.slice(0, 30).map(r => renderDayRow(r)).join('');
  const moreText = jRecords.length > 30 ? `<div style="font-size:12px;color:var(--text-secondary)">+ ${jRecords.length - 30} more days</div>` : '';
  return `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="rule-card-label">📅 Day Log</div>
      <span style="font-size:12px;color:var(--text-secondary)">${jRecords.length} days</span>
    </div>
    ${logRows}
    ${moreText}
  </div>
  <button class="btn btn-destructive" id="detail-clear">🗑 Clear All Days for ${escapeHtml(jurisdiction.name)}</button>`;
}

function wireCloseAndDelete(modal, jurisdictionId, jurisdiction, location, jRecords) {
  // Delete buttons
  modal.querySelectorAll('.day-log-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.day-log-row');
      deleteRecord(row.dataset.recordId);
      document.dispatchEvent(new CustomEvent('data-changed'));
      showDetail(jurisdictionId, location);
    });
  });

  // Clear button
  const clearBtn = modal.querySelector('#detail-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm(`Delete all recorded days for ${jurisdiction.name}? This cannot be undone.`)) {
        clearJurisdiction(jurisdiction.id);
        document.dispatchEvent(new CustomEvent('data-changed'));
        modal.classList.remove('open');
      }
    });
  }

  // Close
  const closeBtn = modal.querySelector('#detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  const closeHandler = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.removeEventListener('click', closeHandler);
    }
  };
  modal.addEventListener('click', closeHandler);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function countryName(code) {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code); }
  catch { return code; }
}
