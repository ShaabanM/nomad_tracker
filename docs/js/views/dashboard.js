// Dashboard tab rendering (Atlas design system)
import { countryFlag, ruleLabel, ruleDescription } from '../data/jurisdictions.js';
import { getJurisdictionsForCitizenship, findJurisdictionForCitizenship } from '../data/citizenship-rules.js';
import * as rules from '../services/rules-engine.js';
import { getRecords, todayStr, getCitizenship, getLocationOverride, getMode, setMode } from '../services/storage.js';
import { showLocationOverride } from './location-override.js';
import { renderTaxDashboard } from './tax-dashboard.js';

export function renderDashboard(location, onCardClick, extras = {}) {
  const records = getRecords();
  const today = todayStr();
  const { pendingGap, lastBackfillResult, taxDisplayYear } = extras;
  const mode = getMode();

  const container = document.getElementById('tab-dashboard');

  // Always render the title + mode toggle first
  let headerHtml = `<div class="nav-title">Nomad Tracker</div>${renderModeToggle(mode)}`;

  if (mode === 'tax') {
    container.innerHTML = headerHtml;
    wireModeToggle(container);
    renderTaxDashboard(location, { displayYear: taxDisplayYear || new Date().getFullYear() });
    return;
  }

  // Visa mode (default)
  let html = '';

  // Gap review banner (if unresolved ambiguous gap)
  if (pendingGap) {
    html += renderGapBanner(pendingGap);
  }

  // Inline "filled N days automatically" toast if we just did a silent backfill
  if (lastBackfillResult && lastBackfillResult.filled > 0) {
    html += renderBackfillToast(lastBackfillResult);
  }

  // Location hero
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

  container.innerHTML = headerHtml + html;
  wireModeToggle(container);

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

/* ---- Mode toggle (Visa / Tax) ---- */

function renderModeToggle(mode) {
  return `<div class="mode-toggle" role="tablist" aria-label="Mode">
    <button class="mode-btn ${mode === 'visa' ? 'active' : ''}" data-mode="visa" role="tab" aria-selected="${mode === 'visa'}">
      <svg width="14" height="14"><use href="#icon-globe"/></svg>
      Visa
    </button>
    <button class="mode-btn ${mode === 'tax' ? 'active' : ''}" data-mode="tax" role="tab" aria-selected="${mode === 'tax'}">
      <svg width="14" height="14"><use href="#icon-sparkle"/></svg>
      Tax
      <span class="mode-beta">BETA</span>
    </button>
  </div>`;
}

function wireModeToggle(container) {
  container.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.mode;
      if (m === getMode()) return;
      setMode(m);
      document.dispatchEvent(new CustomEvent('mode-changed'));
    });
  });
}

/* ---- Gap banner + backfill toast ---- */

function renderGapBanner(gap) {
  const lastDate = gap.lastRecord?.date || '?';
  return `<div class="gap-banner" id="gap-review-btn">
    <div class="gap-banner-icon">
      <svg width="20" height="20"><use href="#icon-calendar-cross"/></svg>
    </div>
    <div class="gap-banner-text">
      <div class="gap-banner-title">${gap.gapDays} unlogged day${gap.gapDays === 1 ? '' : 's'}</div>
      <div class="gap-banner-desc">Since ${formatDate(lastDate)} · tap to review</div>
    </div>
    <div class="gap-banner-chevron"><svg width="16" height="16"><use href="#icon-chevron-right"/></svg></div>
  </div>`;
}

function renderBackfillToast(result) {
  const d = result.filled;
  return `<div class="toast">
    <div class="toast-icon"><svg width="14" height="14"><use href="#icon-sparkle"/></svg></div>
    <div>Auto-logged <strong>${d}</strong> missed day${d === 1 ? '' : 's'} based on your location.</div>
  </div>`;
}

/* ---- Location hero ---- */

function renderLocationHeader(location) {
  const override = getLocationOverride();

  if (!location) {
    return `<div class="card location-card">
      <div class="location-header">
        <div class="location-flag">\u{1F4CD}</div>
        <div class="location-info">
          <div class="location-city">Detecting location…</div>
          <div class="location-jurisdiction">Tap refresh or set manually</div>
        </div>
        <button class="icon-btn refresh-btn" title="Refresh location" aria-label="Refresh">
          <svg><use href="#icon-refresh"/></svg>
        </button>
        <button class="icon-btn override-btn accent" title="Set location manually" aria-label="Set location manually">
          <svg><use href="#icon-edit"/></svg>
        </button>
      </div>
    </div>`;
  }

  const flag = countryFlag(location.countryCode);
  const cityCountry = location.city
    ? `${escapeHtml(location.city)}, ${escapeHtml(location.country)}`
    : escapeHtml(location.country);
  const jurisdictionName = location.jurisdiction?.name || 'Not a tracked jurisdiction';

  const statusClass = override ? 'manual' : (location.cached ? 'cached' : '');
  const statusLabel = override ? 'Manual' : (location.cached ? 'Cached' : 'Live');

  return `<div class="card location-card">
    <div class="location-header">
      <div class="location-flag">${flag}</div>
      <div class="location-info">
        <div class="location-city">${cityCountry}</div>
        <div class="location-jurisdiction">${escapeHtml(jurisdictionName)}</div>
      </div>
      <div class="location-status ${statusClass}">
        <span class="location-dot"></span>
        <span>${statusLabel}</span>
      </div>
      <button class="icon-btn refresh-btn" title="Refresh location" aria-label="Refresh">
        <svg><use href="#icon-refresh"/></svg>
      </button>
      <button class="icon-btn override-btn accent" title="Set location manually" aria-label="Set location manually">
        <svg><use href="#icon-edit"/></svg>
      </button>
    </div>
  </div>`;
}

/* ---- Sorting + active jurisdictions ---- */

function getActiveJurisdictions(location, records, today) {
  const jurisdictions = getJurisdictionsForCitizenship(getCitizenship());
  const activeIds = new Set(records.map(r => r.jurisdictionId));
  const active = jurisdictions.filter(j => activeIds.has(j.id));

  if (location?.jurisdiction && !active.find(j => j.id === location.jurisdiction.id)) {
    active.unshift(location.jurisdiction);
  }

  active.sort((a, b) => {
    if (a.id === location?.jurisdiction?.id) return -1;
    if (b.id === location?.jurisdiction?.id) return 1;
    if (a.visaRequired !== b.visaRequired) return a.visaRequired ? 1 : -1;
    if (a.homeCountry !== b.homeCountry) return a.homeCountry ? 1 : -1;
    if (a.unrestricted !== b.unrestricted) return a.unrestricted ? 1 : -1;
    return rules.daysUsed(b, records, today) - rules.daysUsed(a, records, today);
  });

  return active;
}

/* ---- Jurisdiction cards ---- */

function renderJurisdictionCard(jurisdiction, records, today, isActive) {
  // Visa-required card (special status)
  if (jurisdiction.visaRequired) {
    return renderStatusCard(jurisdiction, 'VISA', 'visa-badge', 'Visa required', 'card-visa-required');
  }
  if (jurisdiction.homeCountry) {
    return renderStatusCard(jurisdiction, 'HOME', 'home-badge', 'Home country', '');
  }
  if (jurisdiction.unrestricted) {
    return renderStatusCard(jurisdiction, 'FREE', 'home-badge', 'Unrestricted access', '');
  }

  const used = rules.daysUsed(jurisdiction, records, today);
  const remaining = rules.daysRemaining(jurisdiction, records, today);
  const urgency = rules.urgencyLevel(jurisdiction, records, today);
  const max = jurisdiction.maxDays;

  if (isActive) {
    return renderHeroCard(jurisdiction, records, today, used, remaining, urgency, max);
  }

  // Compact row card
  const pct = max > 0 ? Math.min(1, used / max) : 0;
  return `<div class="j-card" data-jurisdiction="${jurisdiction.id}">
    <div class="j-card-ring">${renderMiniRing(pct, urgency, 42)}</div>
    <div class="j-card-body">
      <div class="j-card-name">${jurisdiction.emoji} ${escapeHtml(jurisdiction.name)}</div>
      <div class="j-card-sub">${used}/${max} days · ${ruleLabel(jurisdiction)}</div>
    </div>
    <div class="j-card-count">
      <div class="j-card-count-num urgency-${urgency}">${remaining}</div>
      <div class="j-card-count-label">left</div>
    </div>
    <span class="j-card-chevron"><svg width="14" height="14"><use href="#icon-chevron-right"/></svg></span>
  </div>`;
}

function renderStatusCard(j, label, badgeClass, subLine, extraClass) {
  return `<div class="j-card ${extraClass}" data-jurisdiction="${j.id}">
    <div class="j-card-emoji">${j.emoji}</div>
    <div class="j-card-body">
      <div class="j-card-name">${escapeHtml(j.name)}</div>
      <div class="j-card-sub">${escapeHtml(subLine)}</div>
    </div>
    <span class="${badgeClass}">${label}</span>
    <span class="j-card-chevron"><svg width="14" height="14"><use href="#icon-chevron-right"/></svg></span>
  </div>`;
}

function renderHeroCard(j, records, today, used, remaining, urgency, max) {
  const leaveBy = used > 0 ? rules.mustLeaveBy(j, records, today) : null;
  const extra = rules.projectedExtraDays(j, records, today);
  const pct = Math.min(100, (used / max) * 100);

  return `<div class="hero-card urgency-${urgency}" data-jurisdiction="${j.id}">
    <div class="hero-flag-watermark">${j.emoji}</div>

    <div class="hero-row">
      <span class="hero-emoji">${j.emoji}</span>
      <span class="hero-name">${escapeHtml(j.name)}</span>
      <span class="pill ${urgency}">Active</span>
    </div>

    <div class="hero-ring-wrap">
      ${renderProgressRing(used, max, urgency, 156)}
    </div>

    <div class="hero-stats">
      <div class="hero-big">
        <span class="urgency-${urgency}">${remaining}</span>
        <span style="color:var(--text-secondary);font-weight:600;font-size:13px;margin-left:6px">days remaining</span>
      </div>
      <div class="hero-rule">${ruleLabel(j)} · ${used} of ${max} used</div>
      ${leaveBy ? `<div class="hero-chip">
        <svg width="12" height="12" style="opacity:0.7"><use href="#icon-calendar"/></svg>
        Can stay until ${formatDate(leaveBy)}
      </div>` : ''}
      ${extra > 0 ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:8px">+${extra} older day${extra === 1 ? '' : 's'} fall off while you stay</div>` : ''}
    </div>

    <div class="hero-progress">
      <div class="hero-progress-fill urgency-${urgency}" style="width:${pct}%"></div>
    </div>
  </div>`;
}

/* ---- Progress Ring (gradient stroke + end dot + soft glow) ---- */

export function renderProgressRing(used, total, urgency, size) {
  const r = size * 0.40;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const offset = circumference * (1 - pct);
  const strokeWidth = size * 0.095;
  const center = size / 2;
  const textSize = size * 0.32;
  const subSize = size * 0.10;

  const gid = `ring-grad-${urgency}-${size}`;
  const [c1, c2] = gradientStops(urgency);
  const glow = glowColor(urgency);

  // Endpoint dot position (at current progress)
  const angle = -Math.PI / 2 + 2 * Math.PI * pct;
  const dotX = center + r * Math.cos(angle);
  const dotY = center + r * Math.sin(angle);
  const dotR = strokeWidth * 0.55;

  // Animation initial (fully undrawn)
  const cssVars = `--ring-glow:${glow};--ring-initial:${circumference};`;

  return `<svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="${cssVars}">
    <defs>
      <linearGradient id="${gid}" gradientTransform="rotate(90)">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <circle class="progress-ring-track" cx="${center}" cy="${center}" r="${r}"
      stroke="${c1}" stroke-opacity="var(--ring-track)" stroke-width="${strokeWidth}" />
    <circle class="progress-ring-fill" cx="${center}" cy="${center}" r="${r}"
      stroke="url(#${gid})" stroke-width="${strokeWidth}"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${center} ${center})" />
    ${pct > 0.001 && pct < 0.999 ? `<circle class="progress-ring-dot" cx="${dotX}" cy="${dotY}" r="${dotR}" style="color:${c2}" />` : ''}
    <text class="progress-ring-text" x="${center}" y="${center - 2}" text-anchor="middle" dominant-baseline="middle"
      font-size="${textSize}">${used}</text>
    <text class="progress-ring-sub" x="${center}" y="${center + subSize + 10}" text-anchor="middle"
      font-size="${subSize}">OF ${total}</text>
  </svg>`;
}

function renderMiniRing(pct, urgency, size) {
  const r = size * 0.38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const strokeWidth = size * 0.14;
  const center = size / 2;
  const gid = `miniring-${urgency}-${Math.random().toString(36).slice(2,7)}`;
  const [c1, c2] = gradientStops(urgency);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="${gid}" gradientTransform="rotate(90)">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${c1}" stroke-opacity="0.14" stroke-width="${strokeWidth}" />
    <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${strokeWidth}"
      stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${center} ${center})" />
  </svg>`;
}

function gradientStops(urgency) {
  switch (urgency) {
    case 'safe': return ['#30C759', '#5FE380'];
    case 'caution': return ['#F5C400', '#FFE066'];
    case 'warning': return ['#FF9500', '#FFBE5A'];
    case 'critical':
    case 'expired': return ['#FF3B30', '#FF7A70'];
    default: return ['#4D6BFF', '#7A95FF'];
  }
}

function glowColor(urgency) {
  switch (urgency) {
    case 'safe': return 'rgba(48,199,89,0.40)';
    case 'caution': return 'rgba(245,196,0,0.40)';
    case 'warning': return 'rgba(255,149,0,0.40)';
    case 'critical':
    case 'expired': return 'rgba(255,59,48,0.45)';
    default: return 'rgba(77,107,255,0.40)';
  }
}

/* ---- Tips panel ---- */

function renderTipsPanel(currentJurisdiction, records, today) {
  const tips = generateTipsInline(currentJurisdiction, records, today);
  if (tips.length === 0) return '';

  const rows = tips.slice(0, 5).map(t => `
    <div class="tip priority-${t.priority}">
      <div class="tip-icon">${tipIconEmoji(t.icon)}</div>
      <div class="tip-content">
        <div class="tip-title">${escapeHtml(t.title)}</div>
        <div class="tip-message">${escapeHtml(t.message)}</div>
      </div>
    </div>
  `).join('');

  return `<div class="tips-wrap">
    <button class="tips-header">
      <span class="tips-header-icon"><svg width="13" height="13"><use href="#icon-sparkle"/></svg></span>
      <span class="tips-header-text">Tips & Suggestions</span>
      <span class="tips-chevron"><svg width="14" height="14"><use href="#icon-chevron-down"/></svg></span>
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
        tips.push({ icon: 'alert', title: `Leave ${currentJurisdiction.name} by ${leaveDate}`, message: `Only ${remaining} day${remaining === 1 ? '' : 's'} remaining. Book your departure now.`, priority: 'critical' });
      } else if (remaining <= 14) {
        tips.push({ icon: 'alert', title: `${remaining} days remaining in ${currentJurisdiction.name}`, message: `Start planning your departure. Must leave by ${leaveDate}.`, priority: 'high' });
      } else if (remaining <= 30) {
        tips.push({ icon: 'clock', title: `${remaining} days remaining`, message: `Can stay until ${leaveDate} if you remain continuously.`, priority: 'medium' });
      } else {
        tips.push({ icon: 'check', title: `Comfortable in ${currentJurisdiction.name}`, message: `${remaining} of ${max} days remaining. Can stay until ${leaveDate}.`, priority: 'low' });
      }
    }

    const fallOff = rules.nextDayFallsOff(currentJurisdiction, records, today);
    if (fallOff) {
      tips.push({ icon: 'refresh', title: 'Days falling off the window', message: `${fallOff.count} day${fallOff.count === 1 ? '' : 's'} will fall off on ${formatDate(fallOff.date)}, giving you more allowance.`, priority: 'low' });
    }

    if (currentJurisdiction.ruleType === 'calendarYear') {
      const resetDate = rules.calendarYearResetDate(today);
      tips.push({ icon: 'calendar', title: `Counter resets ${formatDate(resetDate)}`, message: 'Calendar year system. Day count resets to 0 on January 1.', priority: 'low' });
    }
  }

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
        tips.push({ icon: 'airplane', title: 'Plan your Schengen exit', message: `Consider: ${exitOptions.join(', ')}.`, priority: 'high' });
      }
    }
    tips.push({ icon: 'info', title: 'Schengen rolling window', message: "90/180 rule uses a rolling window. A 1-day trip outside doesn't meaningfully help.", priority: 'low' });
  }

  const georgiaJ = findJurisdictionForCitizenship('georgia', citizenCode);
  if (currentJurisdiction?.id !== 'georgia' && georgiaJ && !georgiaJ.visaRequired) {
    if (rules.daysUsed(georgiaJ, records, today) === 0) {
      tips.push({ icon: 'star', title: `Georgia: ${georgiaJ.maxDays} days visa-free`, message: 'Perfect for a Schengen cooldown. Vibrant nomad community in Tbilisi.', priority: 'low' });
    }
  }

  if (currentJurisdiction?.id === 'montenegro') {
    tips.push({ icon: 'building', title: 'Register within 24 hours', message: 'Register with police within 24hrs. Hotels do it automatically. For Airbnbs, you must do it yourself.', priority: 'high' });
  }

  const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
  tips.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  return tips;
}

function tipIconEmoji(icon) {
  const map = {
    alert: '\u26A0\uFE0F',
    clock: '\u{1F552}',
    check: '\u2705',
    refresh: '\u{1F504}',
    calendar: '\u{1F4C5}',
    airplane: '\u2708\uFE0F',
    info: '\u2139\uFE0F',
    star: '\u2B50',
    building: '\u{1F3DB}\uFE0F',
  };
  return map[icon] || '\u{1F4A1}';
}

/* ---- helpers ---- */

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
