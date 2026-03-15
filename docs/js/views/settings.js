// Settings tab rendering
import { ALL_JURISDICTIONS, countryFlag, ruleDescription } from '../data/jurisdictions.js';
import * as rules from '../services/rules-engine.js';
import { getRecords, addDateRange, clearAllRecords, todayStr, toDateStr } from '../services/storage.js';
import { isStandalone, shouldShowInstallHint } from '../services/install.js';

export function renderSettings(location, onJurisdictionClick) {
  const records = getRecords();
  const today = todayStr();
  const container = document.getElementById('tab-settings');
  const trackedJurisdictions = new Set(records.map((record) => record.jurisdictionId)).size;
  const manualEntries = records.filter((record) => record.source === 'manual').length;
  const installStatus = isStandalone() ? 'Installed' : (shouldShowInstallHint() ? 'Ready to install' : 'Browser mode');

  const locationStatus = location
    ? `<div class="settings-row">
        <span class="settings-icon" style="color:var(--green)">📍</span>
        <span class="settings-label">Location tracking active</span>
        <span class="settings-value">${location.cached ? 'cached' : 'live'}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Current location</span>
        <span class="settings-value">${location.countryCode ? `${countryFlag(location.countryCode)} ${location.country}` : 'Unknown'}</span>
      </div>`
    : `<div class="settings-row">
        <span class="settings-icon" style="color:var(--red)">✕</span>
        <span class="settings-label">Location not available</span>
        <span class="settings-value">Browser blocked or unavailable</span>
      </div>`;

  const jurisdictionRows = [...ALL_JURISDICTIONS]
    .sort((a, b) => {
      const byUsed = rules.daysUsed(b, records, today) - rules.daysUsed(a, records, today);
      return byUsed !== 0 ? byUsed : a.name.localeCompare(b.name);
    })
    .map((jurisdiction) => {
      const used = rules.daysUsed(jurisdiction, records, today);
      const remaining = rules.daysRemaining(jurisdiction, records, today);
      const usedLabel = used > 0 ? `${used}/${jurisdiction.maxDays}` : `${remaining} open`;
      return `
        <div class="settings-row clickable" data-jurisdiction="${jurisdiction.id}">
          <span class="settings-icon">${jurisdiction.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px">${jurisdiction.name}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${ruleDescription(jurisdiction)}</div>
          </div>
          <span class="settings-value">${usedLabel}</span>
          <span class="chevron-right"></span>
        </div>`;
    }).join('');

  container.innerHTML = `
    <div class="nav-title">Settings</div>

    <div class="section-title">Location Status</div>
    <div class="card">${locationStatus}</div>

    <div class="section-title">Install & Access</div>
    <div class="card">
      <div class="settings-row">
        <span class="settings-icon">📱</span>
        <span class="settings-label">Home-screen status</span>
        <span class="settings-value">${installStatus}</span>
      </div>
      <div class="settings-row">
        <span class="settings-icon">🌐</span>
        <span class="settings-label">Hosting mode</span>
        <span class="settings-value">Static PWA</span>
      </div>
    </div>

    <div class="section-title">Add Past Travel</div>
    <div class="card">
      <button class="btn btn-bordered" id="add-travel-btn">Add days to a jurisdiction</button>
      <div class="detail-muted mt-8">
        Use this to backfill historical stays, including the specific country inside a pooled zone like Schengen.
      </div>
    </div>

    <div class="section-title">All Jurisdictions</div>
    <div class="card" style="padding:0 16px">${jurisdictionRows}</div>

    <div class="section-title">About This Tracker</div>
    <div class="card">
      <div class="settings-row">
        <span class="settings-label">Citizenship profile</span>
        <span class="settings-value">🇨🇦 Canadian</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Supported jurisdictions</span>
        <span class="settings-value">${ALL_JURISDICTIONS.length}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Tracked now</span>
        <span class="settings-value">${trackedJurisdictions}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Total days logged</span>
        <span class="settings-value">${records.length}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Manual entries</span>
        <span class="settings-value">${manualEntries}</span>
      </div>
    </div>

    <div class="section-title">Danger Zone</div>
    <div class="card">
      <button class="btn btn-destructive" id="clear-all-btn">Clear All Data</button>
    </div>`;

  container.querySelectorAll('[data-jurisdiction]').forEach((element) => {
    element.addEventListener('click', () => onJurisdictionClick(element.dataset.jurisdiction));
  });

  container.querySelector('#add-travel-btn').addEventListener('click', () => {
    showAddTravelModal();
  });

  container.querySelector('#clear-all-btn').addEventListener('click', () => {
    if (!confirm('This will delete all recorded travel days across all jurisdictions. This cannot be undone.')) return;
    clearAllRecords();
    document.dispatchEvent(new CustomEvent('data-changed'));
  });
}

function showAddTravelModal() {
  const modal = document.getElementById('modal');
  const closeModal = () => {
    modal.classList.remove('open');
    modal.onclick = null;
  };
  const options = ALL_JURISDICTIONS.map((jurisdiction) => (
    `<option value="${jurisdiction.id}">${jurisdiction.emoji} ${jurisdiction.name}</option>`
  )).join('');

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Add Past Travel</div>
    <div class="form-group">
      <label class="form-label">Jurisdiction</label>
      <select class="form-select" id="modal-jurisdiction">${options}</select>
    </div>
    <div id="modal-country-field"></div>
    <div class="form-group">
      <label class="form-label">From</label>
      <input type="date" class="form-input" id="modal-start" value="${toDateStr(new Date())}">
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <input type="date" class="form-input" id="modal-end" value="${toDateStr(new Date())}">
    </div>
    <div id="modal-preview" class="detail-muted mb-12"></div>
    <button class="btn btn-primary" id="modal-add">Add Days</button>
    <button class="btn btn-text" id="modal-cancel">Cancel</button>`;

  modal.classList.add('open');
  modal.onclick = (event) => {
    if (event.target === modal) closeModal();
  };

  const renderCountryField = () => {
    const selected = ALL_JURISDICTIONS.find((jurisdiction) => jurisdiction.id === document.getElementById('modal-jurisdiction').value);
    const countryCodes = [...selected.countryCodes].sort();
    const field = document.getElementById('modal-country-field');

    if (countryCodes.length > 1) {
      field.innerHTML = `<div class="form-group">
        <label class="form-label">Country</label>
        <select class="form-select" id="modal-country">
          ${countryCodes.map((code) => (
            `<option value="${code}">${countryFlag(code)} ${new Intl.DisplayNames(['en'], { type: 'region' }).of(code)}</option>`
          )).join('')}
        </select>
      </div>`;
      return;
    }

    const code = countryCodes[0] || 'XX';
    field.innerHTML = `<div class="form-group">
      <label class="form-label">Country</label>
      <div class="form-input">${countryFlag(code)} ${new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code}</div>
      <input type="hidden" id="modal-country" value="${code}">
    </div>`;
  };

  const updatePreview = () => {
    const start = document.getElementById('modal-start').value;
    const end = document.getElementById('modal-end').value;
    if (!start || !end) return;
    const days = Math.max(1, Math.round((new Date(`${end}T00:00`) - new Date(`${start}T00:00`)) / 86400000) + 1);
    const jurisdiction = ALL_JURISDICTIONS.find((item) => item.id === document.getElementById('modal-jurisdiction').value);
    document.getElementById('modal-preview').textContent =
      `This will add ${days} day${days === 1 ? '' : 's'} to ${jurisdiction?.name || 'your selected jurisdiction'}.`;
  };

  renderCountryField();
  updatePreview();

  document.getElementById('modal-jurisdiction').addEventListener('change', () => {
    renderCountryField();
    updatePreview();
  });
  document.getElementById('modal-start').addEventListener('change', updatePreview);
  document.getElementById('modal-end').addEventListener('change', updatePreview);

  document.getElementById('modal-cancel').addEventListener('click', closeModal);

  document.getElementById('modal-add').addEventListener('click', () => {
    const jurisdictionId = document.getElementById('modal-jurisdiction').value;
    const start = document.getElementById('modal-start').value;
    const end = document.getElementById('modal-end').value;
    const jurisdiction = ALL_JURISDICTIONS.find((item) => item.id === jurisdictionId);
    const countryCode = document.getElementById('modal-country')?.value || [...(jurisdiction?.countryCodes || [])][0] || 'XX';

    if (!jurisdiction || !start || !end) return;
    if (start > end) {
      alert('The end date must be on or after the start date.');
      return;
    }

    addDateRange(jurisdictionId, countryCode, new Date(`${start}T00:00`), new Date(`${end}T00:00`), 'manual');
    closeModal();
    document.dispatchEvent(new CustomEvent('data-changed'));
  });
}
