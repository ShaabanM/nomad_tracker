// Main app controller — wires everything together
import { hasCompletedOnboarding, getRecords, addRecord, makeRecord, fillGaps, todayStr, getCitizenship } from './services/storage.js';
import { detectLocation, isLocationStale } from './services/location.js';
import { findJurisdictionForCitizenship } from './data/citizenship-rules.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTimeline } from './views/timeline.js';
import { renderSettings } from './views/settings.js';
import { showDetail } from './views/detail.js';
import { showOnboarding } from './views/onboarding.js';

let currentLocation = null;
let activeTab = 'dashboard';

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
  // Detect location
  try {
    currentLocation = await detectLocation();
  } catch (e) {
    console.warn('Location detection failed:', e);
  }

  // Re-resolve jurisdiction with citizenship-aware rules
  resolveJurisdiction();

  // Log today if we have a trackable location (not visa-required)
  if (currentLocation?.jurisdiction && !currentLocation.jurisdiction.visaRequired && !currentLocation.jurisdiction.homeCountry) {
    const code = [...currentLocation.jurisdiction.countryCodes][0] || currentLocation.countryCode;
    const record = makeRecord(new Date(), code, currentLocation.jurisdiction.id, 'gps');
    addRecord(record);

    // Fill any gap days
    fillGaps(currentLocation.jurisdiction.id, code);
  }

  // Render active tab
  renderActiveTab();
  wireTabBar();
  wireEvents();

  // Show stale location banner if needed
  if (isLocationStale(24) && currentLocation?.cached) {
    showStaleBanner();
  }
}

function resolveJurisdiction() {
  if (currentLocation?.jurisdiction) {
    // Re-resolve with citizenship-specific rules
    const citizenJ = findJurisdictionForCitizenship(currentLocation.jurisdiction.id, getCitizenship());
    if (citizenJ) {
      currentLocation.jurisdiction = citizenJ;
    }
  }
}

function renderActiveTab() {
  // Hide all tabs, show active
  document.querySelectorAll('.tab-content').forEach(el => el.hidden = true);
  document.getElementById(`tab-${activeTab}`).hidden = false;

  // Update tab bar active state
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });

  // Render content
  switch (activeTab) {
    case 'dashboard':
      renderDashboard(currentLocation, (jId) => showDetail(jId, currentLocation));
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
      currentLocation = await detectLocation();
      resolveJurisdiction();

      if (currentLocation?.jurisdiction && !currentLocation.jurisdiction.visaRequired && !currentLocation.jurisdiction.homeCountry) {
        const code = [...currentLocation.jurisdiction.countryCodes][0] || currentLocation.countryCode;
        const record = makeRecord(new Date(), code, currentLocation.jurisdiction.id, 'gps');
        addRecord(record);
        fillGaps(currentLocation.jurisdiction.id, code);
      }
    } catch (e) {
      console.warn('Refresh failed:', e);
    }

    renderActiveTab();
  });

  // Data changed (from settings, detail, etc.)
  document.addEventListener('data-changed', () => {
    renderActiveTab();
  });

  // Citizenship changed — re-resolve jurisdiction and re-render
  document.addEventListener('citizenship-changed', () => {
    resolveJurisdiction();
    renderActiveTab();
  });
}

function showStaleBanner() {
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:var(--orange);color:white;text-align:center;padding:calc(var(--safe-top) + 4px) 16px 8px;font-size:13px;font-weight:500;z-index:150;cursor:pointer';
  banner.textContent = 'Location data is stale. Tap to refresh.';
  banner.addEventListener('click', () => {
    banner.remove();
    document.dispatchEvent(new CustomEvent('refresh-location'));
  });
  document.body.appendChild(banner);
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(err => {
    console.warn('SW registration failed:', err);
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
