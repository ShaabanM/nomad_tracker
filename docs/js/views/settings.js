// Settings tab rendering
import { ALL_JURISDICTIONS, countryFlag, ruleDescription } from '../data/jurisdictions.js';
import { CITIZENSHIPS, getJurisdictionsForCitizenship } from '../data/citizenship-rules.js';
import * as rules from '../services/rules-engine.js';
import {
  getRecords,
  addDateRange,
  clearAllRecords,
  todayStr,
  toDateStr,
  addDays,
  diffDays,
  getCitizenship,
  setCitizenship,
  exportData,
  importData,
  getLocationOverride,
} from '../services/storage.js';
import { showLocationOverride } from './location-override.js';

export function renderSettings(location, onJurisdictionClick) {
  const records = getRecords();
  const today = todayStr();
  const container = document.getElementById('tab-settings');
  const citizenshipCode = getCitizenship();
  const citizenship = CITIZENSHIPS.find(c => c.code === citizenshipCode) || CITIZENSHIPS[0];
  const jurisdictions = getJurisdictionsForCitizenship(citizenshipCode);
  const override = getLocationOverride();

  // Location status
  const locationStatus = location
    ? `<div class="settings-row">
        <span class="settings-icon" style="color:var(--green)">📍</span>
        <span class="settings-label">${override ? 'Manual override active' : 'Location tracking active'}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Current location</span>
        <span class="settings-value">${location.countryCode ? countryFlag(location.countryCode) + ' ' + escapeHtml(location.country) : 'Unknown'}</span>
      </div>`
    : `<div class="settings-row">
        <span class="settings-icon" style="color:var(--red)">❌</span>
        <span class="settings-label">Location not available</span>
      </div>`;

  // All jurisdictions — citizenship-aware
  let jurisdictionRows = '';
  for (const j of jurisdictions) {
    if (j.visaRequired) {
      jurisdictionRows += `
        <div class="settings-row clickable" data-jurisdiction="${j.id}">
          <span class="settings-icon">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px">${escapeHtml(j.name)}</div>
            <div style="font-size:12px;color:var(--orange)">Visa required</div>
          </div>
          <span class="visa-badge">VISA</span>
        </div>`;
    } else if (j.homeCountry) {
      jurisdictionRows += `
        <div class="settings-row" data-jurisdiction="${j.id}">
          <span class="settings-icon">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px">${escapeHtml(j.name)}</div>
            <div style="font-size:12px;color:var(--green)">Home country</div>
          </div>
          <span class="home-badge">HOME</span>
        </div>`;
    } else if (j.unrestricted) {
      jurisdictionRows += `
        <div class="settings-row clickable" data-jurisdiction="${j.id}">
          <span class="settings-icon">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px">${escapeHtml(j.name)}</div>
            <div style="font-size:12px;color:var(--green)">Unrestricted access</div>
          </div>
          <span class="home-badge">FREE</span>
        </div>`;
    } else {
      const used = rules.daysUsed(j, records, today);
      const usedLabel = used > 0 ? `${used}/${j.maxDays}` : '';
      jurisdictionRows += `
        <div class="settings-row clickable" data-jurisdiction="${j.id}">
          <span class="settings-icon">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px">${escapeHtml(j.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${ruleDescription(j)}</div>
          </div>
          ${usedLabel ? `<span class="settings-value">${usedLabel}</span>` : ''}
          <span class="chevron-right"></span>
        </div>`;
    }
  }

  const visaFreeCount = jurisdictions.filter(j => !j.visaRequired).length;

  container.innerHTML = `
    <div class="nav-title">Settings</div>

    <div class="section-title">Citizenship</div>
    <div class="card">
      <div class="settings-row clickable" id="change-citizenship">
        <span class="settings-icon" style="font-size:24px">${citizenship.emoji}</span>
        <div class="flex-1">
          <div style="font-size:15px;font-weight:600">${escapeHtml(citizenship.name)}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${visaFreeCount} visa-free jurisdictions</div>
        </div>
        <span class="settings-value" style="font-size:13px">Change</span>
        <span class="chevron-right"></span>
      </div>
    </div>

    <div class="section-title">Location</div>
    <div class="card">
      ${locationStatus}
      <div class="settings-row clickable" id="override-row">
        <span class="settings-icon">${override ? '\u270F\uFE0F' : '\u{1F5FA}\uFE0F'}</span>
        <div class="flex-1">
          <div style="font-size:15px">${override ? 'Change manual location' : 'Set location manually'}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${override ? 'GPS is currently overridden' : 'Useful on desktop or when GPS is wrong'}</div>
        </div>
        <span class="chevron-right"></span>
      </div>
    </div>

    <div class="section-title">Add Past Travel</div>
    <div class="card">
      <button class="btn btn-bordered" id="add-travel-btn">➕ Add days to a jurisdiction</button>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">
        Use this to enter days you've already spent in a jurisdiction before installing.
      </div>
    </div>

    <div class="section-title">All Jurisdictions</div>
    <div class="card" style="padding:0 16px">${jurisdictionRows}</div>

    <div class="section-title">Backup & Restore</div>
    <div class="card">
      <button class="btn btn-bordered" id="export-btn">\u2B07\uFE0F Export data (JSON)</button>
      <button class="btn btn-bordered" id="import-btn" style="margin-top:8px">\u2B06\uFE0F Import data (JSON)</button>
      <input type="file" id="import-file" accept="application/json,.json" style="display:none">
      <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">
        Save a backup or move your records to another device. Imports merge by date + jurisdiction; duplicates are skipped.
      </div>
    </div>

    <div class="section-title">About</div>
    <div class="card">
      <div class="settings-row">
        <span class="settings-label">Tracked jurisdictions</span>
        <span class="settings-value">${jurisdictions.length}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Total days logged</span>
        <span class="settings-value">${records.length}</span>
      </div>
    </div>

    <div class="section-title">Danger Zone</div>
    <div class="card">
      <button class="btn btn-destructive" id="clear-all-btn">🗑 Clear All Data</button>
    </div>`;

  // Wire up citizenship change
  container.querySelector('#change-citizenship').addEventListener('click', () => {
    showCitizenshipModal(citizenshipCode, () => {
      renderSettings(location, onJurisdictionClick);
    });
  });

  // Wire up jurisdiction clicks
  container.querySelectorAll('[data-jurisdiction]').forEach(el => {
    el.addEventListener('click', () => onJurisdictionClick(el.dataset.jurisdiction));
  });

  // Wire up add travel button
  container.querySelector('#add-travel-btn').addEventListener('click', () => {
    showAddTravelModal();
  });

  // Wire up override
  container.querySelector('#override-row').addEventListener('click', () => {
    showLocationOverride();
  });

  // Export
  container.querySelector('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomad-tracker-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import
  const fileInput = container.querySelector('#import-file');
  container.querySelector('#import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = importData(data);
      alert(`Import complete.\nImported: ${result.imported}\nSkipped duplicates/invalid: ${result.skipped}`);
      document.dispatchEvent(new CustomEvent('data-changed'));
      renderSettings(location, onJurisdictionClick);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      fileInput.value = '';
    }
  });

  // Wire up clear all
  container.querySelector('#clear-all-btn').addEventListener('click', () => {
    if (confirm('This will delete ALL recorded travel days across all jurisdictions. This cannot be undone.')) {
      clearAllRecords();
      renderSettings(location, onJurisdictionClick);
      document.dispatchEvent(new CustomEvent('data-changed'));
    }
  });
}

function showCitizenshipModal(currentCode, onSelect) {
  const modal = document.getElementById('modal');
  const options = CITIZENSHIPS.map(c =>
    `<label class="citizenship-option">
      <input type="radio" name="citizenship" value="${c.code}" ${c.code === currentCode ? 'checked' : ''}>
      <span style="font-size:24px">${c.emoji}</span>
      <span style="font-size:16px;font-weight:500">${escapeHtml(c.name)}</span>
    </label>`
  ).join('');

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Select Citizenship</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
      Changing citizenship will update visa rules for all jurisdictions. Your travel records are not affected.
    </div>
    <div>${options}</div>
    <button class="btn btn-primary" id="citizenship-confirm" style="margin-top:16px">Confirm</button>
    <button class="btn btn-text" id="citizenship-cancel" style="margin-top:8px">Cancel</button>`;

  modal.classList.add('open');

  modal.querySelector('#citizenship-confirm').addEventListener('click', () => {
    const selected = modal.querySelector('input[name="citizenship"]:checked');
    if (selected) {
      setCitizenship(selected.value);
      modal.classList.remove('open');
      document.dispatchEvent(new CustomEvent('citizenship-changed'));
      onSelect();
    }
  });

  modal.querySelector('#citizenship-cancel').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  }, { once: true });
}

function showAddTravelModal() {
  const modal = document.getElementById('modal');
  const citizenshipCode = getCitizenship();
  const jurisdictions = getJurisdictionsForCitizenship(citizenshipCode);
  const trackable = jurisdictions.filter(j => !j.visaRequired && !j.homeCountry && !j.unrestricted);
  const options = trackable.map(j =>
    `<option value="${j.id}">${j.emoji} ${escapeHtml(j.name)}</option>`
  ).join('');

  const today = todayStr();
  const defaultStart = addDays(today, -7);

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Add Past Travel</div>
    <div class="form-group">
      <label class="form-label">Jurisdiction</label>
      <select class="form-select" id="modal-jurisdiction">${options}</select>
    </div>
    <div class="form-group">
      <label class="form-label">From</label>
      <input type="date" class="form-input" id="modal-start" value="${defaultStart}" max="${today}">
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <input type="date" class="form-input" id="modal-end" value="${today}" max="${today}">
    </div>
    <div id="modal-preview" style="font-size:13px;color:var(--text-secondary);margin-bottom:16px"></div>
    <button class="btn btn-primary" id="modal-add">Add Days</button>
    <button class="btn btn-text" id="modal-cancel" style="margin-top:8px">Cancel</button>`;

  modal.classList.add('open');

  const startInput = document.getElementById('modal-start');
  const endInput = document.getElementById('modal-end');
  const jSelect = document.getElementById('modal-jurisdiction');
  const preview = document.getElementById('modal-preview');
  const addBtn = document.getElementById('modal-add');

  const updatePreview = () => {
    const start = startInput.value;
    const end = endInput.value;
    if (!start || !end) { addBtn.disabled = true; preview.textContent = ''; return; }
    if (start > today || end > today) {
      preview.innerHTML = '<span style="color:var(--red)">Dates cannot be in the future.</span>';
      addBtn.disabled = true;
      return;
    }
    if (start > end) {
      preview.innerHTML = '<span style="color:var(--red)">"From" must be on or before "To".</span>';
      addBtn.disabled = true;
      return;
    }
    const days = diffDays(end, start) + 1;
    const j = trackable.find(j => j.id === jSelect.value);
    preview.textContent = `This will add ${days} day${days === 1 ? '' : 's'} to ${j?.name || 'jurisdiction'}.`;
    addBtn.disabled = false;
  };

  startInput.addEventListener('change', updatePreview);
  endInput.addEventListener('change', updatePreview);
  jSelect.addEventListener('change', updatePreview);
  updatePreview();

  document.getElementById('modal-cancel').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  addBtn.addEventListener('click', () => {
    const jId = jSelect.value;
    const start = startInput.value;
    const end = endInput.value;
    const j = trackable.find(j => j.id === jId);
    if (!j || !start || !end || start > end || start > today || end > today) return;
    const code = [...j.countryCodes][0] || 'XX';
    addDateRange(jId, code, new Date(start + 'T00:00'), new Date(end + 'T00:00'), 'manual');
    modal.classList.remove('open');
    document.dispatchEvent(new CustomEvent('data-changed'));
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  }, { once: true });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
