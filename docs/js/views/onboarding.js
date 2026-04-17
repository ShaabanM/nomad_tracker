// Onboarding flow (Atlas design — gradient backgrounds, page dots)
import { ALL_JURISDICTIONS } from '../data/jurisdictions.js';
import { CITIZENSHIPS, getJurisdictionsForCitizenship } from '../data/citizenship-rules.js';
import {
  setOnboardingComplete,
  addDateRange,
  toDateStr,
  todayStr,
  addDays,
  setCitizenship,
  getCitizenship,
} from '../services/storage.js';
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
    overlay.innerHTML = pages[currentPage](detectedLocation, currentPage, pages.length);
    wireUp();
  }

  function wireUp() {
    const nextBtn = overlay.querySelector('#onboarding-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage === 1) {
          const selected = overlay.querySelector('input[name="citizenship"]:checked');
          if (selected) setCitizenship(selected.value);
        }
        currentPage++;
        render();
      });
    }

    const enableBtn = overlay.querySelector('#enable-location');
    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        enableBtn.textContent = 'Detecting…';
        enableBtn.disabled = true;
        detectedLocation = await detectLocation();
        render();
      });
    }

    const startBtn = overlay.querySelector('#get-started');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const jId = overlay.querySelector('#onb-jurisdiction')?.value;
        const arrivalDate = overlay.querySelector('#onb-arrival')?.value;
        const today = todayStr();

        if (jId && jId !== 'none' && arrivalDate && arrivalDate <= today) {
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

    const skipBtn = overlay.querySelector('#onboarding-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        setOnboardingComplete();
        overlay.classList.add('hidden');
        onComplete();
      });
    }

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

function renderDots(current, total) {
  let html = '<div class="page-dots">';
  for (let i = 0; i < total; i++) {
    html += `<span class="page-dot${i === current ? ' active' : ''}"></span>`;
  }
  html += '</div>';
  return html;
}

function renderWelcomePage(_detected, current, total) {
  return `<div class="onboarding-page">
    <div class="onboarding-icon">🌍</div>
    <div class="onboarding-title">Nomad Tracker</div>
    <div class="onboarding-desc">Track your visa days automatically. Never overstay anywhere.</div>
    <ul class="feature-list">
      <li class="feature-item"><span class="feature-icon">📍</span>Auto-detects your country via GPS</li>
      <li class="feature-item"><span class="feature-icon">📅</span>Rolling, per-visit &amp; calendar year rules</li>
      <li class="feature-item"><span class="feature-icon">🔔</span>Warns you before you approach limits</li>
      <li class="feature-item"><span class="feature-icon">✋</span>Easy manual overrides for past travel</li>
    </ul>
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Get started</button>
      ${renderDots(current, total)}
    </div>
  </div>`;
}

function renderCitizenshipPage(_detected, current, total) {
  const options = CITIZENSHIPS.map(c =>
    `<label class="citizenship-option">
      <input type="radio" name="citizenship" value="${c.code}" ${c.code === 'CA' ? 'checked' : ''}>
      <span>${c.emoji}</span>
      <span>${c.name}</span>
    </label>`
  ).join('');

  return `<div class="onboarding-page">
    <div class="onboarding-icon">🛂</div>
    <div class="onboarding-title">Your passport</div>
    <div class="onboarding-desc">This determines your visa-free access and day limits in each country.</div>
    <div class="citizenship-list" style="width:100%;max-width:340px">
      ${options}
    </div>
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Continue</button>
      ${renderDots(current, total)}
    </div>
  </div>`;
}

function renderLocationPage(detectedLocation, current, total) {
  const detected = detectedLocation
    ? `<div style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:rgba(48,199,89,0.16);color:var(--green);font-size:14px;font-weight:600">
         ✓ Detected: ${detectedLocation.country || detectedLocation.countryCode}
       </div>`
    : `<button class="btn btn-primary" id="enable-location" style="max-width:220px">Enable location</button>`;

  return `<div class="onboarding-page">
    <div class="onboarding-icon">📍</div>
    <div class="onboarding-title">Location access</div>
    <div class="onboarding-desc">Nomad Tracker detects which country you're in each time you open the app.</div>
    ${detected}
    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="onboarding-next">Next</button>
      ${renderDots(current, total)}
    </div>
  </div>`;
}

function renderInitialDaysPage(detectedLocation, current, total) {
  const jurisdictions = getJurisdictionsForCitizenship(getCitizenship());
  const visaFree = jurisdictions.filter(j => !j.visaRequired && !j.homeCountry && !j.unrestricted);
  const detectedId = detectedLocation?.jurisdiction?.id;
  const options = visaFree.map(j =>
    `<option value="${j.id}" ${j.id === detectedId ? 'selected' : ''}>${j.emoji} ${j.name}</option>`
  ).join('');

  const selectedNone = detectedId ? '' : 'selected';

  const today = todayStr();
  const defaultArrival = addDays(today, -3);

  const detectedBtn = detectedLocation?.jurisdiction
    ? `<button class="btn btn-bordered" id="use-detected" style="margin-bottom:12px">📍 Use detected: ${detectedLocation.jurisdiction.emoji} ${detectedLocation.jurisdiction.name}</button>`
    : '';

  return `<div class="onboarding-page">
    <div class="onboarding-icon">📅</div>
    <div class="onboarding-title">Already traveling?</div>
    <div class="onboarding-desc">If you've already been somewhere, set your arrival date so we can count those days.</div>

    <div style="width:100%;max-width:340px">
      <div class="form-group">
        <label class="form-label">Jurisdiction</label>
        <select class="form-select" id="onb-jurisdiction">
          <option value="none" ${selectedNone}>None — starting fresh</option>
          ${options}
        </select>
      </div>

      ${detectedBtn}

      <div class="form-group">
        <label class="form-label">Arrived on</label>
        <input type="date" class="form-input" id="onb-arrival" value="${defaultArrival}" max="${today}">
      </div>
    </div>

    <div class="onboarding-bottom">
      <button class="btn btn-primary" id="get-started">Start tracking</button>
      <button class="btn btn-text" id="onboarding-skip" style="margin-top:0">Skip — set up later</button>
      ${renderDots(current, total)}
    </div>
  </div>`;
}
