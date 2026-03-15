import { ALL_JURISDICTIONS, countryFlag, ruleLabel } from '../data/jurisdictions.js';
import * as rules from '../services/rules-engine.js';
import { getRecords, todayStr } from '../services/storage.js';
import { generateTips } from '../services/tips-engine.js';

export function renderDashboard(location, onCardClick, appContext = {}) {
  const records = getRecords();
  const today = todayStr();
  const active = getActiveJurisdictions(location, records, today);
  const summaryJurisdiction = location?.jurisdiction || active[0] || null;
  const tips = generateTips(location?.jurisdiction || summaryJurisdiction, records, today);

  let html = '';
  html += renderInstallBanner(appContext);
  html += renderLocationHeader(location);
  html += renderSummaryCard(summaryJurisdiction, records, today, location);

  if (active.length === 0) {
    html += renderEmptyState();
  } else {
    html += `<div class="section-title-row">
      <div class="section-title-large">Jurisdictions</div>
      <div class="section-pill">${active.length} active</div>
    </div>`;

    html += active
      .map(jurisdiction => {
        const isActive = location?.jurisdiction?.id === jurisdiction.id;
        return renderJurisdictionCard(jurisdiction, records, today, isActive);
      })
      .join('');
  }

  html += renderTipsPanel(tips);

  const container = document.getElementById('tab-dashboard');
  container.innerHTML = `<div class="nav-title">Nomad Tracker</div>${html}`;

  container.querySelectorAll('[data-jurisdiction]').forEach((el) => {
    el.addEventListener('click', () => onCardClick(el.dataset.jurisdiction));
  });

  container.querySelectorAll('[data-action="refresh-location"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('refresh-location'));
    });
  });

  const installBtn = container.querySelector('[data-action="install-app"]');
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('prompt-install'));
    });
  }

  const installHelpBtn = container.querySelector('[data-action="show-install-help"]');
  if (installHelpBtn) {
    installHelpBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('show-install-help'));
    });
  }

  const dismissInstallBtn = container.querySelector('[data-action="dismiss-install-help"]');
  if (dismissInstallBtn) {
    dismissInstallBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('dismiss-install-help'));
    });
  }

  const tipsBtn = container.querySelector('.tips-header');
  if (tipsBtn) {
    tipsBtn.addEventListener('click', () => {
      const list = container.querySelector('.tips-list');
      const chevron = container.querySelector('.tips-chevron');
      if (!list) return;
      list.hidden = !list.hidden;
      chevron?.classList.toggle('collapsed', list.hidden);
    });
  }
}

function renderInstallBanner(appContext) {
  if (!appContext?.showInstallHint) return '';

  const action = appContext.installPromptAvailable ? 'install-app' : 'show-install-help';
  const actionLabel = appContext.installActionLabel || (appContext.installPromptAvailable ? 'Install App' : 'Install on iPhone');

  return `<div class="install-banner">
    <div class="install-copy">
      <div class="install-title">Put Nomad Tracker on your home screen</div>
      <div class="install-desc">${appContext.installMessage}</div>
    </div>
    <div class="install-actions">
      <button class="install-btn" data-action="${action}">${actionLabel}</button>
      <button class="install-dismiss" data-action="dismiss-install-help" aria-label="Dismiss install hint">✕</button>
    </div>
  </div>`;
}

function renderLocationHeader(location) {
  if (!location) {
    return `<div class="card location-shell">
      <div class="location-header">
        <div class="location-flag-shell">📍</div>
        <div class="location-info">
          <div class="location-label">Current location</div>
          <div class="location-city">Detecting location…</div>
          <div class="location-jurisdiction">Allow location and refresh to anchor today’s travel plan.</div>
        </div>
        <button class="refresh-btn" data-action="refresh-location" title="Refresh location">↻</button>
      </div>
    </div>`;
  }

  const cityCountry = location.city ? `${location.city}, ${location.country}` : location.country;
  const jurisdiction = location.jurisdiction;
  const liveLabel = location.cached ? 'cached' : 'live';

  return `<div class="card location-shell">
    <div class="location-header">
      <div class="location-flag-shell">${location.flag || countryFlag(location.countryCode)}</div>
      <div class="location-info">
        <div class="location-label">Current location</div>
        <div class="location-city">${cityCountry}</div>
        <div class="location-jurisdiction">${jurisdiction ? jurisdiction.name : 'Not currently in a tracked jurisdiction'}</div>
      </div>
      <div class="location-meta">
        <div class="location-dot ${location.cached ? 'stale' : ''}"></div>
        <div class="location-time">${liveLabel}</div>
      </div>
      <button class="refresh-btn" data-action="refresh-location" title="Refresh location">↻</button>
    </div>
    ${jurisdiction ? `<div class="location-tags">
      <span class="status-chip">${ruleLabel(jurisdiction)}</span>
      <span class="status-chip">${jurisdiction.maxDays} days</span>
    </div>` : ''}
  </div>`;
}

function renderSummaryCard(jurisdiction, records, today, location) {
  if (!jurisdiction) {
    return `<div class="summary-card summary-safe">
      <div class="summary-head">
        <div>
          <div class="summary-eyebrow">Travel Pulse</div>
          <div class="summary-title">Ready to start tracking</div>
          <div class="summary-copy">Enable GPS or add past travel to build a visa timeline that works like an app on your phone.</div>
        </div>
        <div class="summary-badge">Setup</div>
      </div>
      <div class="summary-metrics">
        ${metricCard('Tracked', countTrackedJurisdictions(records), 'jurisdictions with history')}
        ${metricCard('Logged', records.length, 'days recorded total')}
        ${metricCard('GPS', 'On phone', 'works from browser geolocation')}
        ${metricCard('Mode', 'PWA', 'installable with home-screen icon')}
      </div>
    </div>`;
  }

  const isCurrent = location?.jurisdiction?.id === jurisdiction.id;
  const urgency = rules.urgencyLevel(jurisdiction, records, today);
  const daysUsed = rules.daysUsed(jurisdiction, records, today);
  const daysRemaining = rules.daysRemaining(jurisdiction, records, today);
  const leaveBy = rules.mustLeaveBy(jurisdiction, records, today);
  const nextFallOff = rules.nextDayFallsOff(jurisdiction, records, today);
  const extraDays = rules.projectedExtraDays(jurisdiction, records, today);
  const fullReset = rules.fullAllowanceResetDate(jurisdiction, records, today);
  const recommendationAnchor = location?.jurisdiction || jurisdiction;
  const recommendations = recommendedDestinations(recommendationAnchor, records, today).slice(0, 3);

  let subheadline = `${daysRemaining} days left right now, with a projected stay through ${formatDateLong(leaveBy)}.`;
  if (!isCurrent && daysUsed === 0) {
    subheadline = `No active days are currently counting here. This is your strongest historical jurisdiction so you can keep planning from it.`;
  } else if (!isCurrent) {
    subheadline = `${daysRemaining} days are currently available here based on your recorded history, with a projected stay through ${formatDateLong(leaveBy)}.`;
  } else if (leaveBy === today) {
    subheadline = `Today is your last legal day in ${jurisdiction.name} unless older days fall out of the window overnight.`;
  }

  const summaryEyebrow = isCurrent ? 'Live Plan' : 'Recent History';
  const summaryTitle = isCurrent
    ? `Currently in ${jurisdiction.emoji} ${jurisdiction.name}`
    : `Travel Pulse for ${jurisdiction.emoji} ${jurisdiction.name}`;
  const summaryBadge = isCurrent ? urgencyLabel(urgency) : (daysUsed > 0 ? 'Tracked' : 'Open');

  return `<div class="summary-card summary-${urgency}">
    <div class="summary-head">
      <div>
        <div class="summary-eyebrow">${summaryEyebrow}</div>
        <div class="summary-title">${summaryTitle}</div>
        <div class="summary-copy">${subheadline}</div>
      </div>
      <div class="summary-badge">${summaryBadge}</div>
    </div>

    <div class="summary-metrics">
      ${metricCard('Remaining', daysRemaining, 'days currently open')}
      ${metricCard('Leave By', formatMonthDay(leaveBy), 'continuous stay projection')}
      ${metricCard('Tracked', countTrackedJurisdictions(records), 'jurisdictions with history')}
      ${metricCard('Logged', records.length, 'days recorded in total')}
    </div>

    ${(nextFallOff || extraDays > 0 || fullReset) ? `<div class="planning-block">
      <div class="planning-title">Planning Horizon</div>
      ${nextFallOff ? planningRow(
        nextFallOff.count === 1 ? '1 day falls off next' : `${nextFallOff.count} days fall off next`,
        `Window relief starts on ${formatDateLong(nextFallOff.date)}.`
      ) : ''}
      ${extraDays > 0 ? planningRow(
        `Your runway extends by about ${extraDays} days`,
        'Older days should expire from the rolling window while you stay.'
      ) : ''}
      ${fullReset ? planningRow(
        `Full allowance restores on ${formatDateLong(fullReset)}`,
        'That is the earliest date you would regain a clean slate if you left now.'
      ) : ''}
    </div>` : ''}

    ${recommendations.length ? `<div class="recommendations-block">
      <div class="planning-title">Good Next Moves</div>
      ${recommendations.map(item => `
        <div class="recommendation-row">
          <div class="recommendation-emoji">${item.jurisdiction.emoji}</div>
          <div class="recommendation-copy">
            <div class="recommendation-name">${item.jurisdiction.name}</div>
            <div class="recommendation-note">${item.reason}</div>
          </div>
          <div class="recommendation-days">${item.daysRemaining}d</div>
        </div>
      `).join('')}
    </div>` : ''}
  </div>`;
}

function renderEmptyState() {
  return `<div class="empty-state card empty-card">
    <div class="empty-icon">🌍</div>
    <div class="empty-title">No jurisdictions tracked yet</div>
    <div class="empty-desc">Your location will be detected automatically, or you can add past travel manually in Settings.</div>
  </div>`;
}

function renderJurisdictionCard(jurisdiction, records, today, isActive) {
  const used = rules.daysUsed(jurisdiction, records, today);
  const remaining = rules.daysRemaining(jurisdiction, records, today);
  const urgency = rules.urgencyLevel(jurisdiction, records, today);
  const max = jurisdiction.maxDays;
  const leaveBy = used > 0 ? rules.mustLeaveBy(jurisdiction, records, today) : null;
  const extra = rules.projectedExtraDays(jurisdiction, records, today);
  const fullReset = rules.fullAllowanceResetDate(jurisdiction, records, today);
  const pct = Math.min(100, (used / max) * 100);

  if (isActive) {
    return `<div class="card card-active border-${urgency}" data-jurisdiction="${jurisdiction.id}">
      <div class="active-card-head">
        <div>
          <div class="active-card-title">${jurisdiction.emoji} ${jurisdiction.name}</div>
          <div class="active-card-tags">
            <span class="active-badge bg-${urgency}">ACTIVE</span>
            <span class="rule-chip">${ruleLabel(jurisdiction)}</span>
          </div>
        </div>
        <div class="active-days-left urgency-${urgency}">
          <div class="active-days-number">${remaining}</div>
          <div class="active-days-label">days left</div>
        </div>
      </div>

      <div class="active-card-body">
        ${renderProgressRing(used, max, urgency, 102)}
        <div class="active-card-stats">
          ${statRow('Used', `${used}/${max} days`)}
          ${leaveBy ? statRow('Stay until', formatDateLong(leaveBy)) : ''}
          ${fullReset ? statRow('Full reset', formatMonthDay(fullReset)) : ''}
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${pct}%;background:var(--${urgencyColor(urgency)})"></div>
      </div>

      ${extra > 0 ? `<div class="active-projection">${extra} older day${extra === 1 ? '' : 's'} should expire while you stay, extending your runway.</div>` : ''}
    </div>`;
  }

  return `<div class="card compact-card" data-jurisdiction="${jurisdiction.id}">
    <div class="compact-icon urgency-bg-${urgency}">${jurisdiction.emoji}</div>
    <div class="compact-info">
      <div class="compact-name">${jurisdiction.name}</div>
      <div class="compact-sub">${used}/${max} days • ${ruleLabel(jurisdiction)}</div>
    </div>
    <div class="compact-remaining urgency-${urgency}">${remaining}</div>
    <div class="compact-chevron">›</div>
  </div>`;
}

function renderTipsPanel(tips) {
  if (!tips.length) return '';
  const expanded = tips.some((tip) => tip.priority !== 'low');

  return `<div class="card tips-shell">
    <button class="tips-header">
      <div>
        <div class="tips-header-row"><span class="tips-header-icon">💡</span><span class="tips-header-text">Tips & Suggestions</span></div>
        <div class="tips-subtitle">${tips.length} tailored for your current travel pattern</div>
      </div>
      <span class="tips-chevron ${expanded ? '' : 'collapsed'}">▼</span>
    </button>
    <div class="tips-list" ${expanded ? '' : 'hidden'}>
      ${tips.slice(0, 6).map(renderTipRow).join('')}
    </div>
  </div>`;
}

function renderTipRow(tip) {
  return `<div class="tip-card">
    <div class="tip-icon-shell priority-${tip.priority}">${tipEmoji(tip.icon)}</div>
    <div class="tip-main">
      <div class="tip-topline">
        <div class="tip-title">${tip.title}</div>
        <div class="tip-priority priority-${tip.priority}">${priorityLabel(tip.priority)}</div>
      </div>
      <div class="tip-message">${tip.message}</div>
    </div>
  </div>`;
}

function recommendedDestinations(currentJurisdiction, records, today) {
  return ALL_JURISDICTIONS
    .filter(jurisdiction => jurisdiction.id !== currentJurisdiction?.id)
    .map(jurisdiction => {
      const daysRemaining = rules.daysRemaining(jurisdiction, records, today);
      const used = rules.daysUsed(jurisdiction, records, today);
      const score = daysRemaining + Math.floor(jurisdiction.maxDays / 10) + (used === 0 ? 25 : 0);
      return {
        jurisdiction,
        daysRemaining,
        reason: recommendationReason(jurisdiction, daysRemaining),
        score,
      };
    })
    .filter(item => item.daysRemaining > 0)
    .sort((a, b) => b.score - a.score || a.jurisdiction.name.localeCompare(b.jurisdiction.name));
}

function recommendationReason(jurisdiction, remaining) {
  switch (jurisdiction.id) {
    case 'georgia':
      return '365 days per entry and a top Schengen cooldown base';
    case 'uk':
      return '180 days per visit if you need a long reset window';
    case 'albania':
    case 'montenegro':
    case 'serbia':
    case 'turkey':
      return `${remaining} days currently open outside the Schengen pool`;
    case 'colombia':
      return `Calendar-year counter with ${remaining} days left this year`;
    default:
      if (jurisdiction.ruleType === 'perVisit') return `${jurisdiction.maxDays} fresh days on your next entry`;
      if (jurisdiction.ruleType === 'rolling') return `${remaining} days open in its ${jurisdiction.windowDays}-day window`;
      return `${remaining} days left this calendar year`;
  }
}

function getActiveJurisdictions(location, records, today) {
  const activeIds = new Set(records.map(r => r.jurisdictionId));
  const active = ALL_JURISDICTIONS.filter(j => activeIds.has(j.id));

  if (location?.jurisdiction && !active.some(j => j.id === location.jurisdiction.id)) {
    active.unshift(location.jurisdiction);
  }

  active.sort((a, b) => {
    if (a.id === location?.jurisdiction?.id) return -1;
    if (b.id === location?.jurisdiction?.id) return 1;
    return rules.daysUsed(b, records, today) - rules.daysUsed(a, records, today);
  });

  return active;
}

function countTrackedJurisdictions(records) {
  return new Set(records.map(r => r.jurisdictionId)).size;
}

function metricCard(label, value, note) {
  return `<div class="summary-metric">
    <div class="summary-metric-label">${label}</div>
    <div class="summary-metric-value">${value}</div>
    <div class="summary-metric-note">${note}</div>
  </div>`;
}

function planningRow(title, detail) {
  return `<div class="planning-row">
    <div class="planning-row-title">${title}</div>
    <div class="planning-row-detail">${detail}</div>
  </div>`;
}

function statRow(label, value) {
  return `<div class="stat-row">
    <div class="stat-row-label">${label}</div>
    <div class="stat-row-value">${value}</div>
  </div>`;
}

function urgencyLabel(urgency) {
  switch (urgency) {
    case 'safe': return 'Comfortable';
    case 'caution': return 'Caution';
    case 'warning': return 'Watchlist';
    case 'critical': return 'Action Now';
    case 'expired': return 'Expired';
    default: return 'Status';
  }
}

function priorityLabel(priority) {
  switch (priority) {
    case 'critical': return 'Now';
    case 'high': return 'High';
    case 'medium': return 'Soon';
    default: return 'Info';
  }
}

function tipEmoji(icon) {
  const symbols = {
    'exclamation-triangle-fill': '⚠️',
    'exclamation-triangle': '⚠︎',
    clock: '🕒',
    'check-circle': '✅',
    'arrow-counterclockwise': '🔄',
    calendar: '📅',
    airplane: '✈️',
    'info-circle': 'ℹ️',
    star: '⭐',
    building: '🏛️',
    'exclamation-circle': '❗',
    sparkles: '✨',
  };

  return symbols[icon] || '💡';
}

function urgencyColor(urgency) {
  return {
    safe: 'green',
    caution: 'yellow',
    warning: 'orange',
    critical: 'red',
    expired: 'red',
  }[urgency] || 'green';
}

function formatMonthDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateLong(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function renderProgressRing(used, total, urgency, size) {
  const radius = size * 0.38;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, used / total) : 0;
  const offset = circumference * (1 - progress);
  const color = `var(--${urgencyColor(urgency)})`;
  const strokeWidth = size * 0.12;
  const center = size / 2;
  const textSize = size * 0.28;
  const subSize = size * 0.12;

  return `<svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="progress-ring-track" cx="${center}" cy="${center}" r="${radius}"
      stroke="${color}" stroke-opacity="var(--ring-track)" stroke-width="${strokeWidth}" />
    <circle class="progress-ring-fill" cx="${center}" cy="${center}" r="${radius}"
      stroke="${color}" stroke-width="${strokeWidth}"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${center} ${center})" />
    <text class="progress-ring-text" x="${center}" y="${center - 4}" text-anchor="middle"
      font-size="${textSize}">${used}</text>
    <text class="progress-ring-sub" x="${center}" y="${center + subSize + 2}" text-anchor="middle"
      font-size="${subSize}">of ${total}</text>
  </svg>`;
}
