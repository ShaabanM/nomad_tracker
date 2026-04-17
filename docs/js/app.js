// Main app controller — wires everything together
import {
  hasCompletedOnboarding,
  smartBackfill,
  setLastSeen,
  getLastSeen,
  getCitizenship,
  getLocationOverride,
} from './services/storage.js';
import { detectLocation, isLocationStale } from './services/location.js';
import { findJurisdictionForCitizenship } from './data/citizenship-rules.js';
import { jurisdictionForCountry } from './data/jurisdictions.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTimeline } from './views/timeline.js';
import { renderSettings } from './views/settings.js';
import { showDetail } from './views/detail.js';
import { showOnboarding } from './views/onboarding.js';
import { showGapReview } from './views/gap-review.js';

let currentLocation = null;
let activeTab = 'dashboard';
let pendingGap = null; // { gapDays, gapStart, gapEndExclusive, lastRecord, currentJurisdictionId }
let lastBackfillResult = null;
let taxDisplayYear = new Date().getFullYear();

// Boot
async function init() {
  // Show onboarding if first launch
  if (!hasCompletedOnboarding()) {
    showOnboarding(() => {
      boot();
    });
    return;
  }

  boot();
}

async function boot() {
  // Detect location (GPS or cached). Manual override wins if set.
  try {
    currentLocation = await resolveCurrentLocation();
  } catch (e) {
    console.warn('Location detection failed:', e);
  }

  // Apply citizenship-specific rules to the resolved jurisdiction
  applyCitizenshipRules();

  // Smart backfill: logs today, fills safe gaps, flags ambiguous gaps for review
  lastBackfillResult = smartBackfill(currentLocation);

  if (lastBackfillResult.needsReview && lastBackfillResult.gap) {
    pendingGap = {
      ...lastBackfillResult.gap,
      currentJurisdictionId: currentLocation?.jurisdiction?.id || null,
    };
  } else {
    pendingGap = null;
  }

  setLastSeen();

  renderActiveTab();
  wireTabBar();
  wireEvents();

  // Show stale location banner if GPS was unavailable and we're relying on cache
  if (isLocationStale(24) && currentLocation?.cached && !currentLocation?.override) {
    showStaleBanner();
  }
}

async function resolveCurrentLocation() {
  // Manual override trumps GPS
  const override = getLocationOverride();
  if (override) {
    return {
      ...override,
      jurisdiction: jurisdictionForCountry(override.countryCode),
      override: true,
    };
  }
  return await detectLocation();
}

function applyCitizenshipRules() {
  if (currentLocation?.jurisdiction) {
    const citizenJ = findJurisdictionForCitizenship(currentLocation.jurisdiction.id, getCitizenship());
    if (citizenJ) currentLocation.jurisdiction = citizenJ;
  }
}

function renderActiveTab() {
  document.querySelectorAll('.tab-content').forEach(el => el.hidden = true);
  document.getElementById(`tab-${activeTab}`).hidden = false;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });

  const extras = { pendingGap, lastBackfillResult, taxDisplayYear };

  switch (activeTab) {
    case 'dashboard':
      renderDashboard(currentLocation, (jId) => showDetail(jId, currentLocation), extras);
      break;
    case 'timeline':
      renderTimeline();
      break;
    case 'settings':
      renderSettings(currentLocation, (jId) => showDetail(jId, currentLocation));
      break;
  }
}

function wireTabBar() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderActiveTab();
    });
  });
}

function wireEvents() {
  // Refresh location
  document.addEventListener('refresh-location', async () => {
    const refreshBtns = document.querySelectorAll('.refresh-btn');
    refreshBtns.forEach(b => { b.textContent = '\u23F3'; b.disabled = true; });

    try {
      currentLocation = await resolveCurrentLocation();
      applyCitizenshipRules();
      lastBackfillResult = smartBackfill(currentLocation);
      if (lastBackfillResult.needsReview && lastBackfillResult.gap) {
        pendingGap = {
          ...lastBackfillResult.gap,
          currentJurisdictionId: currentLocation?.jurisdiction?.id || null,
        };
      } else {
        pendingGap = null;
      }
    } catch (e) {
      console.warn('Refresh failed:', e);
    }

    renderActiveTab();
  });

  // Data changed (from settings, detail, etc.) — recompute gap state
  document.addEventListener('data-changed', () => {
    // Recompute gap after data changes (e.g., user added past trips)
    lastBackfillResult = smartBackfill(currentLocation);
    if (lastBackfillResult.needsReview && lastBackfillResult.gap) {
      pendingGap = {
        ...lastBackfillResult.gap,
        currentJurisdictionId: currentLocation?.jurisdiction?.id || null,
      };
    } else {
      pendingGap = null;
    }
    renderActiveTab();
  });

  // Citizenship changed — re-resolve jurisdiction and re-render
  document.addEventListener('citizenship-changed', () => {
    applyCitizenshipRules();
    renderActiveTab();
  });

  // Gap review requested
  document.addEventListener('open-gap-review', () => {
    if (!pendingGap) return;
    showGapReview(pendingGap, currentLocation, () => {
      document.dispatchEvent(new CustomEvent('data-changed'));
    });
  });

  // Mode switch (visa <-> tax)
  document.addEventListener('mode-changed', () => {
    renderActiveTab();
  });

  // Tax year navigation
  document.addEventListener('tax-year-change', (e) => {
    taxDisplayYear = e.detail.displayYear;
    renderActiveTab();
  });

  // Location override changed
  document.addEventListener('location-override-changed', async () => {
    currentLocation = await resolveCurrentLocation();
    applyCitizenshipRules();
    lastBackfillResult = smartBackfill(currentLocation);
    if (lastBackfillResult.needsReview && lastBackfillResult.gap) {
      pendingGap = {
        ...lastBackfillResult.gap,
        currentJurisdictionId: currentLocation?.jurisdiction?.id || null,
      };
    } else {
      pendingGap = null;
    }
    renderActiveTab();
  });
}

function showStaleBanner() {
  const banner = document.createElement('div');
  banner.className = 'app-banner stale';
  banner.textContent = 'Location data is stale. Tap to refresh.';
  banner.addEventListener('click', () => {
    banner.remove();
    document.dispatchEvent(new CustomEvent('refresh-location'));
  });
  document.body.appendChild(banner);
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    // Detect updates so we can prompt a reload
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });
  }).catch(err => {
    console.warn('SW registration failed:', err);
  });
}

function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.className = 'app-banner update';
  banner.textContent = 'A new version is available. Tap to update.';
  banner.addEventListener('click', () => {
    location.reload();
  });
  document.body.appendChild(banner);
}

// Start
document.addEventListener('DOMContentLoaded', init);
