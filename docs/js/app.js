// Main app controller — wires everything together
import { hasCompletedOnboarding, addRecord, makeRecord, fillGaps } from './services/storage.js';
import { detectLocation, isLocationStale } from './services/location.js';
import {
  captureInstallPrompt,
  dismissInstallHint,
  hasNativeInstallPrompt,
  installActionLabel,
  installInstructions,
  promptInstall,
  shouldShowInstallHint,
} from './services/install.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTimeline } from './views/timeline.js';
import { renderSettings } from './views/settings.js';
import { showDetail } from './views/detail.js';
import { showOnboarding } from './views/onboarding.js';

let currentLocation = null;
let activeTab = 'dashboard';
let tabBarWired = false;
let eventsWired = false;
let installEventsWired = false;

async function init() {
  wireInstallEvents();

  if (!hasCompletedOnboarding()) {
    showOnboarding(() => {
      boot();
    });
    return;
  }

  boot();
}

async function boot() {
  currentLocation = await detectCurrentLocation();
  logCurrentPresence(currentLocation);

  renderActiveTab();

  if (!tabBarWired) wireTabBar();
  if (!eventsWired) wireEvents();

  if (isLocationStale(24) && currentLocation?.cached) {
    showStaleBanner();
  }
}

function renderActiveTab() {
  if (!document.getElementById('tab-dashboard')) return;

  document.querySelectorAll('.tab-content').forEach((element) => {
    element.hidden = true;
  });
  document.getElementById(`tab-${activeTab}`).hidden = false;

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === activeTab);
  });

  switch (activeTab) {
    case 'dashboard':
      renderDashboard(
        currentLocation,
        (jurisdictionId) => showDetail(jurisdictionId, currentLocation),
        {
          showInstallHint: shouldShowInstallHint(),
          installPromptAvailable: hasNativeInstallPrompt(),
          installMessage: installInstructions(),
          installActionLabel: installActionLabel(),
        },
      );
      break;
    case 'timeline':
      renderTimeline();
      break;
    case 'settings':
      renderSettings(currentLocation, (jurisdictionId) => showDetail(jurisdictionId, currentLocation));
      break;
    default:
      break;
  }
}

function wireTabBar() {
  tabBarWired = true;

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      renderActiveTab();
    });
  });
}

function wireEvents() {
  eventsWired = true;

  document.addEventListener('refresh-location', async () => {
    const refreshButtons = document.querySelectorAll('.refresh-btn');
    refreshButtons.forEach((button) => {
      button.textContent = '⏳';
      button.disabled = true;
    });

    currentLocation = await detectCurrentLocation();
    logCurrentPresence(currentLocation);
    renderActiveTab();
  });

  document.addEventListener('data-changed', () => {
    renderActiveTab();
  });

  document.addEventListener('prompt-install', async () => {
    if (!hasNativeInstallPrompt()) {
      showInstallHelpModal();
      return;
    }

    await promptInstall();
    renderActiveTab();
  });

  document.addEventListener('show-install-help', () => {
    showInstallHelpModal();
  });

  document.addEventListener('dismiss-install-help', () => {
    dismissInstallHint();
    renderActiveTab();
  });
}

function wireInstallEvents() {
  if (installEventsWired) return;
  installEventsWired = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    captureInstallPrompt(event);
    renderActiveTab();
  });

  window.addEventListener('appinstalled', () => {
    renderActiveTab();
  });
}

async function detectCurrentLocation() {
  try {
    return await detectLocation();
  } catch (error) {
    console.warn('Location detection failed:', error);
    return null;
  }
}

function logCurrentPresence(location) {
  if (!location?.jurisdiction) return false;

  const countryCode = location.countryCode || [...location.jurisdiction.countryCodes][0] || 'XX';
  const record = makeRecord(new Date(), countryCode, location.jurisdiction.id, 'gps');
  const added = addRecord(record);

  if (added) {
    fillGaps(location.jurisdiction.id, countryCode);
  }

  return added;
}

function showInstallHelpModal() {
  const modal = document.getElementById('modal');
  const closeModal = () => {
    modal.classList.remove('open');
    modal.onclick = null;
  };

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Install Nomad Tracker</div>
    <div class="card">
      <div class="rule-card-label">Why install it</div>
      <div class="detail-section-copy">Installing the app gives you a home-screen icon, full-screen launch, faster repeat visits, and the most native feeling on iPhone.</div>
    </div>
    <div class="card">
      <div class="rule-card-label">On iPhone</div>
      <div class="planning-row">
        <div class="planning-row-title">1. Open in Safari</div>
        <div class="planning-row-detail">Apple only allows home-screen installation from Safari on iPhone.</div>
      </div>
      <div class="planning-row">
        <div class="planning-row-title">2. Tap Share</div>
        <div class="planning-row-detail">Use the Share button in the bottom toolbar.</div>
      </div>
      <div class="planning-row">
        <div class="planning-row-title">3. Choose Add to Home Screen</div>
        <div class="planning-row-detail">You will get an icon and a standalone app-style launch experience.</div>
      </div>
    </div>
    <button class="btn btn-primary" id="install-help-close">Close</button>`;

  modal.classList.add('open');
  modal.onclick = (event) => {
    if (event.target === modal) closeModal();
  };
  modal.querySelector('#install-help-close').addEventListener('click', closeModal);
}

function showStaleBanner() {
  document.getElementById('stale-location-banner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'stale-location-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:var(--orange);color:white;text-align:center;padding:calc(var(--safe-top) + 4px) 16px 8px;font-size:13px;font-weight:500;z-index:150;cursor:pointer';
  banner.textContent = 'Location data is stale. Tap to refresh.';
  banner.addEventListener('click', () => {
    banner.remove();
    document.dispatchEvent(new CustomEvent('refresh-location'));
  });
  document.body.appendChild(banner);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('SW registration failed:', error);
  });
}

document.addEventListener('DOMContentLoaded', init);
