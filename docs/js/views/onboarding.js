// Onboarding flow for first launch
import { ALL_JURISDICTIONS } from '../data/jurisdictions.js';
import { setOnboardingComplete, addDateRange, toDateStr } from '../services/storage.js';
import { detectLocation } from '../services/location.js';

export function showOnboarding(onComplete) {
  const overlay = document.getElementById('onboarding');
  overlay.classList.remove('hidden');

  let currentPage = 0;
  let detectedLocation = null;

  const pages = [
    renderWelcomePage,
    renderLocationPage,
    renderInitialDaysPage,
  ];

  function render() {
    overlay.innerHTML = pages[currentPage](detectedLocation);
    wireUp();
  }

  function wireUp() {
    // Next button
    const nextBtn = overlay.querySelector('#onboarding-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentPage++;
        render();
      });
    }

    // Location enable
    const enableBtn = overlay.querySelector('#enable-location');
    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        enableBtn.textContent = 'Detecting...';
        enableBtn.disabled = true;
        detectedLocation = await detectLocation();
        render();
      });
    }

    // Get started
    const startBtn = overlay.querySelector('#get-started');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const jId = overlay.querySelector('#onb-jurisdiction')?.value;
        const arrivalDate = overlay.querySelector('#onb-arrival')?.value;

        if (jId && jId !== 'none' && arrivalDate) {
          const j = ALL_JURISDICTIONS.find(j => j.id === jId);
          if (j) {
            const code = [...j.countryCodes][0] || 'XX';
            addDateRange(j.id, code, new Date(arrivalDate + 'T00:00'), new Date(), 'manual');
          }
        }

        setOnboardingComplete();
        overlay.classList.add('hidden');
        onComplete();
      });
    }

    // Skip
    const skipBtn = overlay.querySelector('#onboarding-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        setOnboardingComplete();
        overlay.classList.add('hidden');
        onComplete();
      });
    }

    // Use detected location button
    const useDetectedBtn = overlay.querySelector('#use-detected');
    if (useDetectedBtn) {
      useDetectedBtn.addEventListener('click', () => {
        const select = overlay.querySelector('#onb-jurisdiction');
        if (select && detectedLocation?.jurisdiction) {
          select.value = detectedLocation.jurisdiction.id;
        }
      });
    }
  }

  render();
}

function renderWelcomePage() {
  return `<div class="onboarding-page">
    <div class="onboarding-icon">\u{1F30D}</div>
    <div class="onboarding-title">Nomad Tracker</div>
    <div class="onboarding-desc">Track your visa days automatically.<br>Never overstay anywhere.</div>
    <ul class="feature-list">
      <li class="feature-item"><span class="feature-icon">\u{1F4CD}</span>Auto-detects your country via GPS</li>
      <li class="feature-item"><span class="feature-icon">\u{1F4C5}</span>Understands rolling windows, per-visit, and calendar year rules</li>
      <li class="feature-item"><span class="feature-icon">\u{1F514}</span>Warns you before you approach limits</li>
      <li class="feature-item"><span class="feature-icon">\u270B</span>Easy manual overrides for past travel</li>
    </ul>
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Next</button>
    </div>
  </div>`;
}

function renderLocationPage(detectedLocation) {
  const detected = detectedLocation
    ? `<div style="color:var(--green);font-size:16px;font-weight:600">\u2705 Location detected: ${detectedLocation.country || detectedLocation.countryCode}</div>`
    : `<button class="btn btn-primary" id="enable-location">Enable Location</button>`;

  return `<div class="onboarding-page">
    <div class="onboarding-icon">\u{1F4CD}</div>
    <div class="onboarding-title">Location Access</div>
    <div class="onboarding-desc">Nomad Tracker uses your location to automatically detect which country you're in each time you open the app.</div>
    ${detected}
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Next</button>
    </div>
  </div>`;
}

function renderInitialDaysPage(detectedLocation) {
  const options = ALL_JURISDICTIONS.map(j =>
    `<option value="${j.id}">${j.emoji} ${j.name}</option>`
  ).join('');

  const detectedBtn = detectedLocation?.jurisdiction
    ? `<button class="btn btn-bordered" id="use-detected" style="margin-bottom:12px">\u{1F4CD} Use detected: ${detectedLocation.jurisdiction.emoji} ${detectedLocation.jurisdiction.name}</button>`
    : '';

  return `<div class="onboarding-page">
    <div class="onboarding-icon">\u{1F4C5}</div>
    <div class="onboarding-title">Already Traveling?</div>
    <div class="onboarding-desc">If you've already been in a jurisdiction, set your arrival date so we can count those days.</div>

    <div style="width:100%;max-width:320px">
      <div class="form-group">
        <label class="form-label">Jurisdiction</label>
        <select class="form-select" id="onb-jurisdiction">
          <option value="none">None \u2014 starting fresh</option>
          ${options}
        </select>
      </div>

      ${detectedBtn}

      <div class="form-group">
        <label class="form-label">Arrived on</label>
        <input type="date" class="form-input" id="onb-arrival" value="${toDateStr(new Date())}">
      </div>
    </div>

    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="get-started">Get Started</button>
      <button class="btn btn-text" id="onboarding-skip" style="margin-top:8px">Skip \u2014 I'll set this up later</button>
    </div>
  </div>`;
}
