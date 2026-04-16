// Dashboard tab rendering
import { countryFlag, ruleLabel, ruleDescription } from '../data/jurisdictions.js';
import { getJurisdictionsForCitizenship, findJurisdictionForCitizenship } from '../data/citizenship-rules.js';
import * as rules from '../services/rules-engine.js';
import { getRecords, todayStr, getCitizenship, getLocationOverride } from '../services/storage.js';
import { showLocationOverride } from './location-override.js';

export function renderDashboard(location, onCardClick, extras = {}) {
  const records = getRecords();
  const today = todayStr();
  const { pendingGap, lastBackfillResult } = extras;

  let html = '';

  // Update available notification handled in app.js

  // Gap review banner (if unresolved ambiguous gap)
  if (pendingGap) {
    html += renderGapBanner(pendingGap, location);
  }

  // Inline "filled N days automatically" toast if we just did a silent backfill
  if (lastBackfillResult && lastBackfillResult.filled > 0) {
    html += renderBackfillToast(lastBackfillResult);
  }

  // Location header
  html += renderLocationHeader(location);

  // Active jurisdictions
  const active = getActiveJurisdictions(location, records, today);

  if (active.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">\u{1F30D}</div>
        <div class="empty-title">No jurisdictions tracked yet</div>
        <div class="empty-desc">Your location will be detected automatically, or you can add past travel in Settings.</div>
      </div>`;
  } else {
    for (const j of active) {
      const isActive = location?.jurisdiction?.id === j.id;
      html += renderJurisdictionCard(j, records, today, isActive);
    }
  }

  // Tips
  html += renderTipsPanel(location?.jurisdiction, records, today);

  const container = document.getElementById('tab-dashboard');
  container.innerHTML = `<div class="nav-title">Nomad Tracker</div>${html}`;

  // Wire up card clicks
  container.querySelectorAll('[data-jurisdiction]').forEach(el => {
    el.addEventListener('click', () => onCardClick(el.dataset.jurisdiction));
  });

  // Wire up refresh button
  const refreshBtn = container.querySelector('.refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('refresh-location'));
    });
  }

  // Wire up override (set location manually)
  const overrideBtn = container.querySelector('.override-btn');
  if (overrideBtn) {
    overrideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLocationOverride();
    });
  }

  // Wire up gap review button
  const gapBtn = container.querySelector('#gap-review-btn');
  if (gapBtn) {
    gapBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('open-gap-review'));
    });
  }

  // Wire up tips toggle
  const tipsBtn = container.querySelector('.tips-header');
  if (tipsBtn) {
    tipsBtn.addEventListener('click', () => {
      const list = container.querySelector('.tips-list');
      const chev = container.querySelector('.tips-chevron');
      if (list) {
        list.hidden = !list.hidden;
        chev?.classList.toggle('collapsed', list.hidden);
      }
    });
  }
}

function renderGapBanner(gap, location) {
  const gapStart = gap.gapStart;
  const lastDate = gap.lastRecord?.date || '?';
  return `<div class="card" id="gap-review-btn" style="background:var(--yellow);color:#1c1c1e;cursor:pointer;display:flex;align-items:center;gap:12px;padding:14px 16px">
    <div style="font-size:24px">\u{1F5D3}\uFE0F</div>
    <div style="flex:1">
      <div style="font-size:14px;font-weight:600">${gap.gapDays} unlogged day${gap.gapDays === 1 ? '' : 's'}</div>
      <div style="font-size:12px;opacity:0.75">Since ${formatDate(lastDate)}. Tap to review where you were.</div>
    </div>
    <div style="font-size:18px;font-weight:300">\u203A</div>
  </div>`;
}

function renderBackfillToast(result) {
  const d = result.filled;
  return `<div class="card" style="background:rgba(52,199,89,0.12);border-color:rgba(52,199,89,0.3);padding:10px 14px;display:flex;align-items:center;gap:10px">
    <div style="font-size:16px">\u2728</div>
    <div style="flex:1;font-size:13px;color:var(--text-secondary)">Auto-logged <strong style="color:var(--text)">${d}</strong> missed day${d === 1 ? '' : 's'} based on your location.</div>
  </div>`;
}

function renderLocationHeader(location) {
  const override = getLocationOverride();

  if (!location) {
    return `<div class="card">
      <div class="location-header">
        <div class="location-flag">\u{1F4CD}</div>
        <div class="location-info">
          <div class="location-city">Detecting location...</div>
          <div class="location-jurisdiction">Tap refresh to try again</div>
        </div>
        <button class="refresh-btn" title="Refresh location">\u{21BB}</button>
        <button class="override-btn" title="Set location manually" style="background:none;border:none;color:var(--accent);font-size:13px;padding:8px;cursor:pointer">Set</button>
      </div>
    </div>`;
  }

  const flag = countryFlag(location.countryCode);
  const cityCountry = location.city
    ? `${escapeHtml(location.city)}, ${escapeHtml(location.country)}`
    : escapeHtml(location.country);
  const jurisdictionName = location.jurisdiction?.name || 'Not a tracked jurisdiction';

  const sourceLabel = override ? 'manual' : (location.cached ? 'cached' : 'live');
  const dotClass = override ? '' : (location.cached ? 'stale' : '');

  return `<div class="card">
    <div class="location-header">
      <div class="location-flag">${flag}</div>
      <div class="location-info">
        <div class="location-city">${cityCountry}</div>
        <div class="location-jurisdiction">${escapeHtml(jurisdictionName)}</div>
      </div>
      <div class="location-status">
        <div class="location-dot ${dotClass}"></div>
        <div class="location-time">${sourceLabel}</div>
      </div>
      <button class="refresh-btn" title="Refresh location">\u{21BB}</button>
      <button class="override-btn" title="Set location manually" style="background:none;border:none;color:var(--accent);font-size:13px;padding:6px 4px;cursor:pointer;margin-left:4px">\u270F\uFE0F</button>
    </div>
  </div>`;
}

function getActiveJurisdictions(location, records, today) {
  const jurisdictions = getJurisdictionsForCitizenship(getCitizenship());
  const activeIds = new Set(records.map(r => r.jurisdictionId));
  const active = jurisdictions.filter(j => activeIds.has(j.id));

  if (location?.jurisdiction && !active.find(j => j.id === location.jurisdiction.id)) {
    active.unshift(location.jurisdiction);
  }

  // Sort: current first, then by days used descending
  active.sort((a, b) => {
    if (a.id === location?.jurisdiction?.id) return -1;
    if (b.id === location?.jurisdiction?.id) return 1;
    // Visa-required and special jurisdictions sort to the end
    if (a.visaRequired !== b.visaRequired) return a.visaRequired ? 1 : -1;
    if (a.homeCountry !== b.homeCountry) return a.homeCountry ? 1 : -1;
    if (a.unrestricted !== b.unrestricted) return a.unrestricted ? 1 : -1;
    return rules.daysUsed(b, records, today) - rules.daysUsed(a, records, today);
  });

  return active;
}

function renderJurisdictionCard(jurisdiction, records, today, isActive) {
  // Visa-required card
  if (jurisdiction.visaRequired) {
    return `<div class="card card-visa-required" data-jurisdiction="${jurisdiction.id}">
      <div class="j-card-compact">
        <span class="j-card-emoji">${jurisdiction.emoji}</span>
        <div class="j-card-compact-info">
          <div class="j-card-compact-name">${escapeHtml(jurisdiction.name)}</div>
          <div class="j-card-compact-sub" style="color:var(--orange)">Visa required</div>
        </div>
        <span class="visa-badge">VISA</span>
      </div>
    </div>`;
  }

  // Home country card
  if (jurisdiction.homeCountry) {
    return `<div class="card" data-jurisdiction="${jurisdiction.id}">
      <div class="j-card-compact">
        <span class="j-card-emoji">${jurisdiction.emoji}</span>
        <div class="j-card-compact-info">
          <div class="j-card-compact-name">${escapeHtml(jurisdiction.name)}</div>
          <div class="j-card-compact-sub" style="color:var(--green)">Home country</div>
        </div>
        <span class="home-badge">HOME</span>
      </div>
    </div>`;
  }

  // Unrestricted card
  if (jurisdiction.unrestricted) {
    return `<div class="card" data-jurisdiction="${jurisdiction.id}">
      <div class="j-card-compact">
        <span class="j-card-emoji">${jurisdiction.emoji}</span>
        <div class="j-card-compact-info">
          <div class="j-card-compact-name">${escapeHtml(jurisdiction.name)}</div>
          <div class="j-card-compact-sub" style="color:var(--green)">Unrestricted access</div>
        </div>
        <span class="home-badge">FREE</span>
      </div>
    </div>`;
  }

  const used = rules.daysUsed(jurisdiction, records, today);
  const remaining = rules.daysRemaining(jurisdiction, records, today);
  const urgency = rules.urgencyLevel(jurisdiction, records, today);
  const max = jurisdiction.maxDays;

  if (isActive) {
    const leaveBy = used > 0 ? rules.mustLeaveBy(jurisdiction, records, today) : null;
    const extra = rules.projectedExtraDays(jurisdiction, records, today);
    const pct = Math.min(100, (used / max) * 100);

    return `<div class="card card-active border-${urgency}" data-jurisdiction="${jurisdiction.id}">
      <div class="j-card-expanded">
        <div class="j-card-header">
          <span class="j-card-emoji">${jurisdiction.emoji}</span>
          <span class="j-card-name">${escapeHtml(jurisdiction.name)}</span>
          <span class="active-badge bg-${urgency}">ACTIVE</span>
        </div>
        ${renderProgressRing(used, max, urgency, 110)}
        <div class="j-card-stats">
          <div class="j-card-remaining urgency-${urgency}">${remaining} days remaining</div>
          <div class="j-card-rule">${ruleLabel(jurisdiction)}</div>
          ${leaveBy ? `<div class="j-card-leave">Can stay until ${formatDate(leaveBy)}</div>` : ''}
          ${extra > 0 ? `<div class="j-card-projected">${extra} older day${extra === 1 ? '' : 's'} should fall off while you stay</div>` : ''}
        </div>
        <div class="progress-bar" style="margin-top:12px">
          <div class="progress-bar-fill" style="width:${pct}%;background:var(--${urgencyColor(urgency)})"></div>
        </div>
      </div>
    </div>`;
  }

  // Compact card
  return `<div class="card" data-jurisdiction="${jurisdiction.id}">
    <div class="j-card-compact">
      <span class="j-card-emoji">${jurisdiction.emoji}</span>
      <div class="j-card-compact-info">
        <div class="j-card-compact-name">${escapeHtml(jurisdiction.name)}</div>
        <div class="j-card-compact-sub">${used}/${max} days \u2022 ${ruleLabel(jurisdiction)}</div>
      </div>
      <span class="j-card-compact-count urgency-${urgency}">${remaining}</span>
      <span class="j-card-compact-left">left</span>
    </div>
  </div>`;
}

export function renderProgressRing(used, total, urgency, size) {
  const r = size * 0.38;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const offset = circumference * (1 - pct);
  const color = `var(--${urgencyColor(urgency)})`;
  const trackOpacity = 'var(--ring-track)';
  const strokeWidth = size * 0.12;
  const center = size / 2;
  const textSize = size * 0.28;
  const subSize = size * 0.12;

  return `<svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="progress-ring-track" cx="${center}" cy="${center}" r="${r}"
      stroke="${color}" stroke-opacity="${trackOpacity}" stroke-width="${strokeWidth}" />
    <circle class="progress-ring-fill" cx="${center}" cy="${center}" r="${r}"
      stroke="${color}" stroke-width="${strokeWidth}"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${center} ${center})" />
    <text class="progress-ring-text" x="${center}" y="${center - 4}" text-anchor="middle"
      font-size="${textSize}">${used}</text>
    <text class="progress-ring-sub" x="${center}" y="${center + subSize + 2}" text-anchor="middle"
      font-size="${subSize}">of ${total}</text>
  </svg>`;
}

function renderTipsPanel(currentJurisdiction, records, today) {
  const tips = generateTipsInline(currentJurisdiction, records, today);
  if (tips.length === 0) return '';

  const rows = tips.slice(0, 5).map(t => `
    <div class="tip-row">
      <div class="tip-icon">${tipIcon(t.icon, t.priority)}</div>
      <div class="tip-content">
        <div class="tip-title">${escapeHtml(t.title)}</div>
        <div class="tip-message">${escapeHtml(t.message)}</div>
      </div>
    </div>
  `).join('');

  return `<div class="card">
    <button class="tips-header">
      <span class="tips-header-icon">\u{1F4A1}</span>
      <span class="tips-header-text">Tips & Suggestions</span>
      <span class="tips-chevron">\u25BC</span>
    </button>
    <div class="tips-list">${rows}</div>
  </div>`;
}

// Inline tips
function generateTipsInline(currentJurisdiction, records, today) {
  const tips = [];

  if (currentJurisdiction && !currentJurisdiction.visaRequired && !currentJurisdiction.homeCountry && !currentJurisdiction.unrestricted) {
    const remaining = rules.daysRemaining(currentJurisdiction, records, today);
    const used = rules.daysUsed(currentJurisdiction, records, today);
    const max = currentJurisdiction.maxDays;

    if (used > 0) {
      const leaveBy = rules.mustLeaveBy(currentJurisdiction, records, today);
      const leaveDate = formatDate(leaveBy);

      if (remaining <= 7) {
        tips.push({ icon: 'exclamation-triangle-fill', title: `Leave ${currentJurisdiction.name} by ${leaveDate}`, message: `Only ${remaining} day${remaining === 1 ? '' : 's'} remaining! Book your departure now.`, priority: 'critical', category: 'deadline' });
      } else if (remaining <= 14) {
        tips.push({ icon: 'exclamation-triangle', title: `${remaining} days remaining in ${currentJurisdiction.name}`, message: `Start planning your departure. Must leave by ${leaveDate}.`, priority: 'high', category: 'deadline' });
      } else if (remaining <= 30) {
        tips.push({ icon: 'clock', title: `${remaining} days remaining`, message: `Can stay until ${leaveDate} if you remain continuously.`, priority: 'medium', category: 'deadline' });
      } else {
        tips.push({ icon: 'check-circle', title: `Comfortable in ${currentJurisdiction.name}`, message: `${remaining} of ${max} days remaining. Can stay until ${leaveDate}.`, priority: 'low', category: 'status' });
      }
    }

    const fallOff = rules.nextDayFallsOff(currentJurisdiction, records, today);
    if (fallOff) {
      tips.push({ icon: 'arrow-counterclockwise', title: 'Days falling off the window', message: `${fallOff.count} day${fallOff.count === 1 ? '' : 's'} will fall off on ${formatDate(fallOff.date)}, giving you more allowance.`, priority: 'low', category: 'info' });
    }

    if (currentJurisdiction.ruleType === 'calendarYear') {
      const resetDate = rules.calendarYearResetDate(today);
      tips.push({ icon: 'calendar', title: `Counter resets ${formatDate(resetDate)}`, message: 'Calendar year system. Day count resets to 0 on January 1.', priority: 'low', category: 'info' });
    }
  }

  // Schengen exit suggestions (only if Schengen is visa-free for this citizenship)
  const citizenCode = getCitizenship();
  const schengenJ = findJurisdictionForCitizenship('schengen', citizenCode);
  if (currentJurisdiction?.id === 'schengen' && schengenJ && !schengenJ.visaRequired) {
    const remaining = rules.daysRemaining(schengenJ, records, today);
    if (remaining <= 30) {
      const exitOptions = [];
      const candidates = [
        { id: 'georgia', label: 'Georgia' },
        { id: 'albania', label: 'Albania' },
        { id: 'montenegro', label: 'Montenegro' },
        { id: 'turkey', label: 'Turkey' },
        { id: 'uk', label: 'UK' },
      ];
      for (const c of candidates) {
        const j = findJurisdictionForCitizenship(c.id, citizenCode);
        if (j && !j.visaRequired) {
          exitOptions.push(`${c.label} (${j.maxDays}${j.unrestricted ? '+' : ''} days)`);
        }
      }
      if (exitOptions.length > 0) {
        tips.push({ icon: 'airplane', title: 'Plan your Schengen exit', message: `Consider: ${exitOptions.join(', ')}.`, priority: 'high', category: 'suggestion' });
      }
    }
    tips.push({ icon: 'info-circle', title: 'Schengen rolling window', message: "90/180 rule uses a rolling window. A 1-day trip outside doesn't meaningfully help.", priority: 'low', category: 'info' });
  }

  // Georgia promotion (only if visa-free for this citizenship)
  const georgiaJ = findJurisdictionForCitizenship('georgia', citizenCode);
  if (currentJurisdiction?.id !== 'georgia' && georgiaJ && !georgiaJ.visaRequired) {
    if (rules.daysUsed(georgiaJ, records, today) === 0) {
      tips.push({ icon: 'star', title: `Georgia: ${georgiaJ.maxDays} days visa-free`, message: 'Perfect for a Schengen cooldown. Vibrant nomad community in Tbilisi.', priority: 'low', category: 'suggestion' });
    }
  }

  // Montenegro registration
  if (currentJurisdiction?.id === 'montenegro') {
    tips.push({ icon: 'building', title: 'Register within 24 hours', message: 'Register with police within 24hrs. Hotels do it automatically. For Airbnbs, you must do it yourself.', priority: 'high', category: 'action' });
  }

  const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
  tips.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  return tips;
}

function tipIcon(icon, priority) {
  const colors = { critical: 'var(--red)', high: 'var(--orange)', medium: 'var(--yellow)', low: 'var(--accent)' };
  const color = colors[priority] || 'var(--accent)';
  const symbols = {
    'exclamation-triangle-fill': '\u26A0\uFE0F',
    'exclamation-triangle': '\u26A0',
    'clock': '\u{1F552}',
    'check-circle': '\u2705',
    'arrow-counterclockwise': '\u{1F504}',
    'calendar': '\u{1F4C5}',
    'airplane': '\u2708\uFE0F',
    'info-circle': '\u2139\uFE0F',
    'star': '\u2B50',
    'building': '\u{1F3DB}\uFE0F',
    'exclamation-circle': '\u2757',
  };
  return symbols[icon] || '\u{1F4A1}';
}

function urgencyColor(urgency) {
  const map = { safe: 'green', caution: 'yellow', warning: 'orange', critical: 'red', expired: 'red' };
  return map[urgency] || 'green';
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
