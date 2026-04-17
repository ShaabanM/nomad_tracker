// Tax detail modal — deep dive for a single tax country.

import { findTaxCountry } from '../data/tax-rules.js';
import {
  computeTaxSummary,
  taxYearBounds,
} from '../services/tax-engine.js';
import {
  getRecords,
  addDateRange,
  deleteRecord,
  todayStr,
  addDays,
  diffDays,
  parseDate,
} from '../services/storage.js';
import { renderProgressRing } from './dashboard.js';
import { findJurisdiction, countryFlag } from '../data/jurisdictions.js';

export function showTaxDetail(countryCode, displayYear) {
  const country = findTaxCountry(countryCode);
  if (!country) return;

  const records = getRecords();
  const summary = computeTaxSummary(country, displayYear, records);
  const modal = document.getElementById('modal');

  const pct = Math.min(100, (summary.days / country.threshold) * 100);
  const remaining = Math.max(0, country.threshold - summary.days);

  // Soft thresholds list
  const softRows = (country.softThresholds || [])
    .map(t => {
      const hit = summary.days >= t.days;
      const cls = hit ? 'tax-soft-row hit' : 'tax-soft-row';
      const iconHtml = hit
        ? '<svg width="14" height="14" style="color:var(--red)"><use href="#icon-close"/></svg>'
        : '<svg width="14" height="14" style="color:var(--green)"><use href="#icon-chevron-right" /></svg>';
      return `<div class="${cls}">
        <div class="tax-soft-days">${t.days}</div>
        <div class="tax-soft-body">
          <div class="tax-soft-title">${escapeHtml(t.label)}</div>
        </div>
        <div class="tax-soft-icon">${iconHtml}</div>
      </div>`;
    })
    .join('');

  // Day log for records in this tax year (filtered by country code)
  const countryRecords = records
    .filter(r => r.countryCode === country.code && r.date >= summary.bounds.start && r.date <= summary.bounds.end)
    .sort((a, b) => b.date.localeCompare(a.date));
  const logRows = countryRecords.slice(0, 30).map(r => renderDayRow(r)).join('');
  const moreText = countryRecords.length > 30
    ? `<div style="font-size:12px;color:var(--text-tertiary);padding-top:6px">+ ${countryRecords.length - 30} more days</div>`
    : '';

  const notes = (country.notes || []).map(n =>
    `<div class="note-item"><span class="note-bullet">•</span><span>${escapeHtml(n)}</span></div>`).join('');
  const tips = (country.tips || []).map(t =>
    `<div class="tip-item"><span class="tip-bullet">→</span><span>${escapeHtml(t)}</span></div>`).join('');

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>

    <div class="hero-card urgency-${summary.urgency}" style="margin-bottom:14px">
      <div class="hero-flag-watermark">${country.emoji}</div>
      <div class="hero-row">
        <span class="hero-emoji">${country.emoji}</span>
        <span class="hero-name">${escapeHtml(country.name)}</span>
        <span class="pill ${summary.urgency}">${country.goal === 'maximize' ? 'Target' : 'Limit'}</span>
      </div>
      <div class="hero-ring-wrap">
        ${renderProgressRing(summary.days, country.threshold, summary.urgency, 172)}
      </div>
      <div class="hero-stats">
        <div class="hero-big">
          <span class="urgency-${summary.urgency}" style="font-size:22px">${summary.days}</span>
          <span style="color:var(--text-secondary);font-weight:600;font-size:14px;margin-left:6px">of ${country.threshold} days</span>
        </div>
        <div class="hero-rule">${escapeHtml(summary.label)}</div>
        <div class="hero-chip">
          <svg width="12" height="12" style="opacity:0.7"><use href="#icon-calendar"/></svg>
          ${summary.bounds.label} · ${summary.daysLeft} day${summary.daysLeft === 1 ? '' : 's'} left
        </div>
      </div>
      <div class="hero-progress">
        <div class="hero-progress-fill urgency-${summary.urgency}" style="width:${pct}%"></div>
      </div>
    </div>

    <div class="card">
      <div class="rule-card-label">How residency is determined</div>
      <div class="rule-card-desc">${escapeHtml(country.rule)}</div>
    </div>

    ${softRows ? `<div class="card">
      <div class="rule-card-label">Thresholds</div>
      <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:8px">Your ${summary.days} day${summary.days === 1 ? '' : 's'} against each marker:</div>
      ${softRows}
    </div>` : ''}

    ${notes ? `<div class="card">
      <div class="rule-card-label">Important notes</div>
      ${notes}
    </div>` : ''}

    ${tips ? `<div class="card">
      <div class="rule-card-label">Tips</div>
      ${tips}
    </div>` : ''}

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="rule-card-label" style="margin:0">Day log (${summary.bounds.shortLabel})</div>
        <span style="font-size:12px;color:var(--text-tertiary);font-variant-numeric:tabular-nums">${countryRecords.length} days</span>
      </div>
      ${countryRecords.length === 0 ? '<div style="font-size:13px;color:var(--text-tertiary)">No days recorded yet this tax year.</div>' : ''}
      ${logRows}
      ${moreText}
    </div>

    <button class="btn btn-bordered" id="tax-add-days" style="margin-bottom:8px">
      <svg width="16" height="16"><use href="#icon-plus"/></svg>
      Add past days in ${escapeHtml(country.shortName)}
    </button>
    <button class="btn btn-text" id="tax-close" style="margin-top:4px">Close</button>
  `;

  modal.classList.add('open');

  modal.querySelectorAll('.day-log-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.day-log-row');
      deleteRecord(row.dataset.recordId);
      document.dispatchEvent(new CustomEvent('data-changed'));
      showTaxDetail(countryCode, displayYear);
    });
  });

  modal.querySelector('#tax-add-days').addEventListener('click', () => {
    showAddDays(country, displayYear);
  });

  modal.querySelector('#tax-close').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  const closeHandler = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.removeEventListener('click', closeHandler);
    }
  };
  modal.addEventListener('click', closeHandler);
}

function showAddDays(country, displayYear) {
  const modal = document.getElementById('modal');
  const today = todayStr();
  const bounds = taxYearBounds(country, displayYear);
  const defaultStart = addDays(today, -7) < bounds.start ? bounds.start : addDays(today, -7);
  const defaultEnd = today > bounds.end ? bounds.end : today;

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Add past days</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <span style="font-size:28px">${country.emoji}</span>
      <span style="font-size:17px;font-weight:700;letter-spacing:-0.02em">${escapeHtml(country.name)}</span>
    </div>
    <div class="modal-desc">
      Log days you've physically spent in ${escapeHtml(country.shortName)}. Tax year ${bounds.label}.
    </div>
    <div class="form-group">
      <label class="form-label">From</label>
      <input type="date" class="form-input" id="tax-add-start" value="${defaultStart}" max="${today}">
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <input type="date" class="form-input" id="tax-add-end" value="${defaultEnd}" max="${today}">
    </div>
    <div id="tax-add-preview" style="font-size:13px;color:var(--text-secondary);margin:4px 2px 16px"></div>
    <button class="btn btn-primary" id="tax-add-confirm">Add days</button>
    <button class="btn btn-text" id="tax-add-back" style="margin-top:4px">Back</button>
  `;

  const startInput = document.getElementById('tax-add-start');
  const endInput = document.getElementById('tax-add-end');
  const preview = document.getElementById('tax-add-preview');
  const confirmBtn = document.getElementById('tax-add-confirm');

  const update = () => {
    const s = startInput.value, e = endInput.value;
    if (!s || !e) { confirmBtn.disabled = true; preview.textContent = ''; return; }
    if (s > today || e > today) { preview.innerHTML = '<span style="color:var(--red)">Dates cannot be in the future.</span>'; confirmBtn.disabled = true; return; }
    if (s > e) { preview.innerHTML = '<span style="color:var(--red)">"From" must be on or before "To".</span>'; confirmBtn.disabled = true; return; }
    const days = diffDays(e, s) + 1;
    preview.textContent = `This will add ${days} day${days === 1 ? '' : 's'} in ${country.shortName}.`;
    confirmBtn.disabled = false;
  };
  startInput.addEventListener('change', update);
  endInput.addEventListener('change', update);
  update();

  document.getElementById('tax-add-back').addEventListener('click', () => {
    showTaxDetail(country.code, displayYear);
  });

  confirmBtn.addEventListener('click', () => {
    const s = startInput.value, e = endInput.value;
    if (!s || !e || s > e || s > today || e > today) return;
    // We need a jurisdictionId to store. Use the country's mapped jurisdictionId.
    // For FR/IT records we store under 'schengen' jurisdictionId so the visa
    // engine treats them correctly; the tax engine filters by countryCode so
    // everything stays consistent.
    addDateRange(country.jurisdictionId, country.code, new Date(s + 'T00:00'), new Date(e + 'T00:00'), 'manual');
    document.dispatchEvent(new CustomEvent('data-changed'));
    showTaxDetail(country.code, displayYear);
  });
}

function renderDayRow(r) {
  return `
    <div class="day-log-row" data-record-id="${r.id}">
      <span class="day-log-flag">${countryFlag(r.countryCode)}</span>
      <span class="day-log-date">${formatDateLong(r.date)}</span>
      <span class="day-log-source" title="${sourceTitle(r.source)}">${sourceIcon(r.source)}</span>
      <button class="day-log-delete" title="Delete"><svg width="14" height="14"><use href="#icon-close"/></svg></button>
    </div>`;
}

function sourceIcon(source) {
  if (source === 'gps') return '\u{1F4CD}';
  if (source === 'inferred') return '\u2728';
  return '\u270B';
}
function sourceTitle(source) {
  if (source === 'gps') return 'Logged via GPS';
  if (source === 'inferred') return 'Inferred';
  return 'Manual';
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
