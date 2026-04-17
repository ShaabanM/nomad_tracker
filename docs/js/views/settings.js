// Settings tab rendering (Atlas design)
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

  const locationStatus = location
    ? `<div class="settings-row">
        <span class="settings-icon"><svg width="18" height="18" style="color:${override ? 'var(--accent)' : 'var(--green)'}"><use href="#icon-pin"/></svg></span>
        <span class="settings-label">${override ? 'Manual override active' : 'Location tracking active'}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Current location</span>
        <span class="settings-value">${location.countryCode ? countryFlag(location.countryCode) + ' ' + escapeHtml(location.country) : 'Unknown'}</span>
      </div>`
    : `<div class="settings-row">
        <span class="settings-icon"><svg width="18" height="18" style="color:var(--red)"><use href="#icon-close"/></svg></span>
        <span class="settings-label">Location not available</span>
      </div>`;

  let jurisdictionRows = '';
  for (const j of jurisdictions) {
    if (j.visaRequired) {
      jurisdictionRows += `
        <div class="settings-row clickable" data-jurisdiction="${j.id}">
          <span class="settings-icon" style="font-size:20px">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px;font-weight:500;letter-spacing:-0.01em">${escapeHtml(j.name)}</div>
            <div style="font-size:12px;color:var(--orange)">Visa required</div>
          </div>
          <span class="visa-badge">Visa</span>
        </div>`;
    } else if (j.homeCountry) {
      jurisdictionRows += `
        <div class="settings-row" data-jurisdiction="${j.id}">
          <span class="settings-icon" style="font-size:20px">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px;font-weight:500;letter-spacing:-0.01em">${escapeHtml(j.name)}</div>
            <div style="font-size:12px;color:var(--green)">Home country</div>
          </div>
          <span class="home-badge">Home</span>
        </div>`;
    } else if (j.unrestricted) {
      jurisdictionRows += `
        <div class="settings-row clickable" data-jurisdiction="${j.id}">
          <span class="settings-icon" style="font-size:20px">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px;font-weight:500;letter-spacing:-0.01em">${escapeHtml(j.name)}</div>
            <div style="font-size:12px;color:var(--green)">Unrestricted access</div>
          </div>
          <span class="home-badge">Free</span>
        </div>`;
    } else {
      const used = rules.daysUsed(j, records, today);
      const usedLabel = used > 0 ? `${used}/${j.maxDays}` : '';
      jurisdictionRows += `
        <div class="settings-row clickable" data-jurisdiction="${j.id}">
          <span class="settings-icon" style="font-size:20px">${j.emoji}</span>
          <div class="flex-1">
            <div style="font-size:15px;font-weight:500;letter-spacing:-0.01em">${escapeHtml(j.name)}</div>
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
      <div class="settings-row clickable" id="change-citizenship" style="padding:6px 0">
        <span class="settings-icon" style="font-size:28px">${citizenship.emoji}</span>
        <div class="flex-1">
          <div style="font-size:16px;font-weight:700;letter-spacing:-0.01em">${escapeHtml(citizenship.name)}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${visaFreeCount} visa-free jurisdictions</div>
        </div>
        <span class="settings-value" style="font-size:13px;color:var(--accent);font-weight:500">Change</span>
        <span class="chevron-right"></span>
      </div>
    </div>

    <div class="section-title">Location</div>
    <div class="card">
      ${locationStatus}
      <div class="settings-row clickable" id="override-row">
        <span class="settings-icon">${override
          ? '<svg width="18" height="18" style="color:var(--accent)"><use href="#icon-edit"/></svg>'
          : '<svg width="18" height="18" style="color:var(--text-secondary)"><use href="#icon-globe"/></svg>'}</span>
        <div class="flex-1">
          <div style="font-size:15px;font-weight:500">${override ? 'Change manual location' : 'Set location manually'}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${override ? 'GPS is currently overridden' : 'Useful on desktop or when GPS is wrong'}</div>
        </div>
        <span class="chevron-right"></span>
      </div>
    </div>

    <div class="section-title">Add past travel</div>
    <div class="card">
      <button class="btn btn-bordered" id="add-travel-btn">
        <svg width="16" height="16"><use href="#icon-plus"/></svg>
        Add days to a jurisdiction
      </button>
      <div style="font-size:12px;color:var(--text-tertiary);margin-top:10px;line-height:1.45">
        Enter days you already spent somewhere before installing.
      </div>
    </div>

    <div class="section-title">All jurisdictions</div>
    <div class="card settings-list">${jurisdictionRows}</div>

    <div class="section-title">Backup & restore</div>
    <div class="card">
      <button class="btn btn-bordered" id="export-btn">
        <svg width="16" height="16"><use href="#icon-download"/></svg>
        Export backup
      </button>
      <button class="btn btn-bordered" id="import-btn" style="margin-top:8px">
        <svg width="16" height="16"><use href="#icon-upload"/></svg>
        Import backup
      </button>
      <input type="file" id="import-file" accept="application/json,.json" style="display:none">
      <div style="font-size:12px;color:var(--text-tertiary);margin-top:10px;line-height:1.45">
        Save a JSON backup or restore on another device. Imports merge by date + jurisdiction; duplicates are skipped.
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

    <div class="section-title">Danger zone</div>
    <div class="card">
      <button class="btn btn-destructive" id="clear-all-btn">
        <svg width="14" height="14"><use href="#icon-trash"/></svg>
        Clear all data
      </button>
    </div>`;

  container.querySelector('#change-citizenship').addEventListener('click', () => {
    showCitizenshipModal(citizenshipCode, () => {
      renderSettings(location, onJurisdictionClick);
    });
  });

  container.querySelectorAll('[data-jurisdiction]').forEach(el => {
    el.addEventListener('click', () => onJurisdictionClick(el.dataset.jurisdiction));
  });

  container.querySelector('#add-travel-btn').addEventListener('click', () => {
    showAddTravelModal();
  });

  container.querySelector('#override-row').addEventListener('click', () => {
    showLocationOverride();
  });

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
      <span>${c.emoji}</span>
      <span>${escapeHtml(c.name)}</span>
    </label>`
  ).join('');

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Select citizenship</div>
    <div class="modal-desc">
      Changing citizenship updates visa rules across all jurisdictions. Your travel records are not affected.
    </div>
    <div class="citizenship-list">${options}</div>
    <button class="btn btn-primary" id="citizenship-confirm" style="margin-top:18px">Confirm</button>
    <button class="btn btn-text" id="citizenship-cancel" style="margin-top:4px">Cancel</button>`;

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
    <div class="modal-title">Add past travel</div>
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
    <div id="modal-preview" style="font-size:13px;color:var(--text-secondary);margin:6px 2px 16px"></div>
    <button class="btn btn-primary" id="modal-add">Add days</button>
    <button class="btn btn-text" id="modal-cancel" style="margin-top:4px">Cancel</button>`;

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
