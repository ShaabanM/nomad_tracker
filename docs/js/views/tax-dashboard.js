// Tax mode dashboard — UAE residency hero + minimize-goal cards for
// UK / France / Italy / Canada.

import { TAX_COUNTRIES } from '../data/tax-rules.js';
import {
  allTaxSummaries,
  computeTaxSummary,
  taxYearBounds,
  currentTaxYear,
} from '../services/tax-engine.js';
import { getRecords, todayStr, getCitizenship } from '../services/storage.js';
import { showTaxDetail } from './tax-detail.js';
import { renderProgressRing } from './dashboard.js';

export function renderTaxDashboard(location, extras = {}) {
  const { displayYear = new Date().getFullYear() } = extras;
  const records = getRecords();
  const today = todayStr();

  const summaries = allTaxSummaries(displayYear, records, today);
  const uaeSummary = summaries.find(s => s.country.code === 'AE');
  const otherSummaries = summaries.filter(s => s.country.code !== 'AE');

  let html = '';

  // Top: big year navigator + mode context
  html += renderYearNav(displayYear);

  // UAE hero
  if (uaeSummary) html += renderUAEHero(uaeSummary, today);

  // "Minimize" section header
  html += `<div class="section-title" style="margin-top:20px">Tax residency risk (stay under threshold)</div>`;

  // Other country cards
  for (const s of otherSummaries) {
    html += renderTaxCountryCard(s);
  }

  // Footer note
  html += `<div class="tax-disclaimer">
    <div class="tax-disclaimer-icon">ℹ️</div>
    <div>
      <strong>This is a tracker, not legal advice.</strong> Tax residency rules are complex and fact-specific.
      Always confirm with a qualified tax advisor for your situation.
    </div>
  </div>`;

  const container = document.getElementById('tab-dashboard');

  // Preserve the existing mode toggle + nav title (dashboard.js renders them).
  // We inject our content under a wrapper the caller provides.
  const existingMount = container.querySelector('.tax-mount');
  if (existingMount) {
    existingMount.innerHTML = html;
  } else {
    container.insertAdjacentHTML('beforeend', `<div class="tax-mount">${html}</div>`);
  }

  // Wire card clicks
  container.querySelectorAll('[data-tax-country]').forEach(el => {
    el.addEventListener('click', () => {
      showTaxDetail(el.dataset.taxCountry, displayYear);
    });
  });

  // Year nav
  const prev = container.querySelector('#tax-year-prev');
  const next = container.querySelector('#tax-year-next');
  if (prev) prev.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('tax-year-change', { detail: { displayYear: displayYear - 1 } }));
  });
  if (next) next.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('tax-year-change', { detail: { displayYear: displayYear + 1 } }));
  });
}

function renderYearNav(displayYear) {
  return `<div class="tax-year-nav">
    <button class="month-btn" id="tax-year-prev" aria-label="Previous year"><svg width="16" height="16" style="transform:rotate(180deg)"><use href="#icon-chevron-right"/></svg></button>
    <div class="tax-year-label">
      <div class="tax-year-title">${displayYear}</div>
      <div class="tax-year-sub">UK shown on Apr–Apr basis</div>
    </div>
    <button class="month-btn" id="tax-year-next" aria-label="Next year"><svg width="16" height="16"><use href="#icon-chevron-right"/></svg></button>
  </div>`;
}

function renderUAEHero(summary, today) {
  const { country, days, threshold, urgency, status, bounds, daysLeft } = summary;
  const pct = Math.min(100, (days / threshold) * 100);
  const remaining = Math.max(0, threshold - days);
  const canStillReach = days + daysLeft >= threshold;

  let statusChip, statusText;
  if (status === 'secured') {
    statusChip = `<span class="pill safe">Secured</span>`;
    statusText = `You have hit the 183-day threshold for ${bounds.shortLabel}.`;
  } else if (canStillReach) {
    statusChip = `<span class="pill ${urgency}">On track</span>`;
    statusText = `Need <strong>${remaining}</strong> more day${remaining === 1 ? '' : 's'}. <strong>${daysLeft}</strong> day${daysLeft === 1 ? '' : 's'} left in the year.`;
  } else {
    statusChip = `<span class="pill expired">At risk</span>`;
    statusText = `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left — not enough to reach 183.`;
  }

  return `<div class="hero-card urgency-${urgency} tax-hero" data-tax-country="${country.code}">
    <div class="hero-flag-watermark">${country.emoji}</div>

    <div class="hero-row">
      <span class="hero-emoji">${country.emoji}</span>
      <span class="hero-name">${escapeHtml(country.shortName)} residency</span>
      ${statusChip}
    </div>

    <div class="hero-ring-wrap">
      ${renderProgressRing(days, threshold, urgency, 168)}
    </div>

    <div class="hero-stats">
      <div class="hero-big">
        <span class="urgency-${urgency}" style="font-size:22px">${days}</span>
        <span style="color:var(--text-secondary);font-weight:600;font-size:14px;margin-left:6px">days in UAE (${bounds.shortLabel})</span>
      </div>
      <div class="hero-rule" style="margin-top:6px">${statusText}</div>
      <div class="hero-chip" style="margin-top:12px">
        <svg width="12" height="12" style="opacity:0.7"><use href="#icon-calendar"/></svg>
        ${bounds.label} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining in year
      </div>
    </div>

    <div class="hero-progress">
      <div class="hero-progress-fill urgency-${urgency}" style="width:${pct}%"></div>
      ${renderSoftThresholdMarkers(country, threshold)}
    </div>

    <div class="hero-tap">Tap for details & thresholds</div>
  </div>`;
}

function renderTaxCountryCard(summary) {
  const { country, days, threshold, urgency, status, bounds, label } = summary;
  const pct = Math.min(100, (days / threshold) * 100);

  return `<div class="tax-card urgency-${urgency}" data-tax-country="${country.code}">
    <div class="tax-card-top">
      <span class="tax-card-emoji">${country.emoji}</span>
      <div class="tax-card-info">
        <div class="tax-card-name">${escapeHtml(country.name)}</div>
        <div class="tax-card-sub">${bounds.label} · ${statusChipText(status)}</div>
      </div>
      <div class="tax-card-count">
        <div class="tax-card-num mono-num urgency-${urgency}">${days}</div>
        <div class="tax-card-of">of ${threshold}</div>
      </div>
      <span class="j-card-chevron"><svg width="14" height="14"><use href="#icon-chevron-right"/></svg></span>
    </div>

    <div class="tax-progress">
      <div class="tax-progress-fill urgency-${urgency}" style="width:${pct}%"></div>
      ${renderSoftThresholdMarkers(country, threshold)}
    </div>

    <div class="tax-card-label urgency-${urgency}">${escapeHtml(label)}</div>
  </div>`;
}

function renderSoftThresholdMarkers(country, primaryThreshold) {
  if (!country.softThresholds || country.softThresholds.length < 2) return '';
  return country.softThresholds.filter(t => t.days < primaryThreshold).map(t => {
    const pct = (t.days / primaryThreshold) * 100;
    return `<span class="tax-tick ${t.type}" style="left:${pct}%" title="${escapeHtml(t.label)}"></span>`;
  }).join('');
}

function statusChipText(status) {
  switch (status) {
    case 'safe': return 'Safe';
    case 'caution': return 'Caution';
    case 'warning': return 'Warning';
    case 'critical': return 'Critical';
    case 'triggered': return 'Residency triggered';
    case 'secured': return 'Secured';
    default: return '';
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
