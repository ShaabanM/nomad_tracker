// Onboarding flow for first launch
import { ALL_JURISDICTIONS } from '../data/jurisdictions.js';
import { CITIZENSHIPS, getJurisdictionsForCitizenship } from '../data/citizenship-rules.js';
import { setOnboardingComplete, addDateRange, toDateStr, setCitizenship, getCitizenship } from '../services/storage.js';
import { detectLocation } from '../services/location.js';

export function showOnboarding(onComplete) {
  const overlay = document.getElementById('onboarding');
  overlay.classList.remove('hidden');

  let currentPage = 0;
  let detectedLocation = null;

  const pages = [
    renderWelcomePage,
    renderCitizenshipPage,
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
        // Save citizenship on the citizenship page before advancing
        if (currentPage === 1) {
          const selected = overlay.querySelector('input[name="citizenship"]:checked');
          if (selected) {
            setCitizenship(selected.value);
          }
        }
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
          const jurisdictions = getJurisdictionsForCitizenship(getCitizenship());
          const j = jurisdictions.find(j => j.id === jId);
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
    <div class="onboarding-icon">🌍</div>
    <div class="onboarding-title">Nomad Tracker</div>
    <div class="onboarding-desc">Track your visa days automatically.<br>Never overstay anywhere.</div>
    <ul class="feature-list">
      <li class="feature-item"><span class="feature-icon">📍</span>Auto-detects your country via GPS</li>
      <li class="feature-item"><span class="feature-icon">📅</span>Understands rolling windows, per-visit, and calendar year rules</li>
      <li class="feature-item"><span class="feature-icon">🔔</span>Warns you before you approach limits</li>
      <li class="feature-item"><span class="feature-icon">✋</span>Easy manual overrides for past travel</li>
    </ul>
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Next</button>
    </div>
  </div>`;
}

function renderCitizenshipPage() {
  const options = CITIZENSHIPS.map(c =>
    `<label class="citizenship-option">
      <input type="radio" name="citizenship" value="${c.code}" ${c.code === 'CA' ? 'checked' : ''}>
      <span style="font-size:24px">${c.emoji}</span>
      <span style="font-size:16px;font-weight:500">${c.name}</span>
    </label>`
  ).join('');

  return `<div class="onboarding-page">
    <div class="onboarding-icon">🛂</div>
    <div class="onboarding-title">Your Passport</div>
    <div class="onboarding-desc">Select your citizenship. This determines visa-free access and day limits for each country.</div>
    <div class="citizenship-list" style="width:100%;max-width:320px">
      ${options}
    </div>
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Next</button>
    </div>
  </div>`;
}

function renderLocationPage(detectedLocation) {
  const detected = detectedLocation
    ? `<div style="color:var(--green);font-size:16px;font-weight:600">✅ Location detected: ${detectedLocation.country || detectedLocation.countryCode}</div>`
    : `<button class="btn btn-primary" id="enable-location">Enable Location</button>`;

  return `<div class="onboarding-page">
    <div class="onboarding-icon">📍</div>
    <div class="onboarding-title">Location Access</div>
    <div class="onboarding-desc">Nomad Tracker uses your location to automatically detect which country you're in each time you open the app.</div>
    ${detected}
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Next</button>
    </div>
  </div>`;
}

function renderInitialDaysPage(detectedLocation) {
  // Only show visa-free jurisdictions for the selected citizenship
  const jurisdictions = getJurisdictionsForCitizenship(getCitizenship());
  const visaFree = jurisdictions.filter(j => !j.visaRequired && !j.homeCountry && !j.unrestricted);
  const options = visaFree.map(j =>
    `<option value="${j.id}">${j.emoji} ${j.name}</option>`
  ).join('');

  const detectedBtn = detectedLocation?.jurisdiction
    ? `<button class="btn btn-bordered" id="use-detected" style="margin-bottom:12px">📍 Use detected: ${detectedLocation.jurisdiction.emoji} ${detectedLocation.jurisdiction.name}</button>`
    : '';

  return `<div class="onboarding-page">
    <div class="onboarding-icon">📅</div>
    <div class="onboarding-title">Already Traveling?</div>
    <div class="onboarding-desc">If you've already been in a jurisdiction, set your arrival date so we can count those days.</div>

    <div style="width:100%;max-width:320px">
      <div class="form-group">
        <label class="form-label">Jurisdiction</label>
        <select class="form-select" id="onb-jurisdiction">
          <option value="none">None — starting fresh</option>
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
      <button class="btn btn-text" id="onboarding-skip" style="margin-top:8px">Skip — I'll set this up later</button>
    </div>
  </div>`;
}
