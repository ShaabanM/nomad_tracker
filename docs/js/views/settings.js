// Settings tab rendering
import { ALL_JURISDICTIONS, countryFlag, ruleDescription } from '../data/jurisdictions.js';
import * as rules from '../services/rules-engine.js';
import { getRecords, addDateRange, clearAllRecords, todayStr, toDateStr } from '../services/storage.js';

export function renderSettings(location, onJurisdictionClick) {
  const records = getRecords();
  const today = todayStr();
  const container = document.getElementById('tab-settings');

  // Location status
  const locationStatus = location
    ? `<div class="settings-row">
        <span class="settings-icon" style="color:var(--green)">\u{1F4CD}</span>
        <span class="settings-label">Location tracking active</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Current location</span>
        <span class="settings-value">${location.countryCode ? countryFlag(location.countryCode) + ' ' + location.country : 'Unknown'}</span>
      </div>`
    : `<div class="settings-row">
        <span class="settings-icon" style="color:var(--red)">\u274C</span>
        <span class="settings-label">Location not available</span>
      </div>`;

  // All jurisdictions
  let jurisdictionRows = '';
  for (const j of ALL_JURISDICTIONS) {
    const used = rules.daysUsed(j, records, today);
    const usedLabel = used > 0 ? `${used}/${j.maxDays}` : '';
    jurisdictionRows += `
      <div class="settings-row clickable" data-jurisdiction="${j.id}">
        <span class="settings-icon">${j.emoji}</span>
        <div class="flex-1">
          <div style="font-size:15px">${j.name}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${ruleDescription(j)}</div>
        </div>
        ${usedLabel ? `<span class="settings-value">${usedLabel}</span>` : ''}
        <span class="chevron-right"></span>
      </div>`;
  }

  container.innerHTML = `
    <div class="nav-title">Settings</div>

    <div class="section-title">Location Status</div>
    <div class="card">${locationStatus}</div>

    <div class="section-title">Add Past Travel</div>
    <div class="card">
      <button class="btn btn-bordered" id="add-travel-btn">\u2795 Add days to a jurisdiction</button>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">
        Use this to enter days you've already spent in a jurisdiction before installing.
      </div>
    </div>

    <div class="section-title">All Jurisdictions</div>
    <div class="card" style="padding:0 16px">${jurisdictionRows}</div>

    <div class="section-title">About</div>
    <div class="card">
      <div class="settings-row">
        <span class="settings-label">Citizenship</span>
        <span class="settings-value">\u{1F1E8}\u{1F1E6} Canadian</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Tracked jurisdictions</span>
        <span class="settings-value">${ALL_JURISDICTIONS.length}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Total days logged</span>
        <span class="settings-value">${records.length}</span>
      </div>
    </div>

    <div class="section-title">Danger Zone</div>
    <div class="card">
      <button class="btn btn-destructive" id="clear-all-btn">\u{1F5D1} Clear All Data</button>
    </div>`;

  // Wire up jurisdiction clicks
  container.querySelectorAll('[data-jurisdiction]').forEach(el => {
    el.addEventListener('click', () => onJurisdictionClick(el.dataset.jurisdiction));
  });

  // Wire up add travel button
  container.querySelector('#add-travel-btn').addEventListener('click', () => {
    showAddTravelModal();
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

function showAddTravelModal() {
  const modal = document.getElementById('modal');
  const options = ALL_JURISDICTIONS.map(j =>
    `<option value="${j.id}">${j.emoji} ${j.name}</option>`
  ).join('');

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Add Past Travel</div>
    <div class="form-group">
      <label class="form-label">Jurisdiction</label>
      <select class="form-select" id="modal-jurisdiction">${options}</select>
    </div>
    <div class="form-group">
      <label class="form-label">From</label>
      <input type="date" class="form-input" id="modal-start" value="${toDateStr(new Date())}">
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <input type="date" class="form-input" id="modal-end" value="${toDateStr(new Date())}">
    </div>
    <div id="modal-preview" style="font-size:13px;color:var(--text-secondary);margin-bottom:16px"></div>
    <button class="btn btn-primary" id="modal-add">Add Days</button>
    <button class="btn btn-text" id="modal-cancel" style="margin-top:8px">Cancel</button>`;

  modal.classList.add('open');

  const updatePreview = () => {
    const start = document.getElementById('modal-start').value;
    const end = document.getElementById('modal-end').value;
    if (start && end) {
      const days = Math.max(1, Math.round((new Date(end + 'T00:00') - new Date(start + 'T00:00')) / 86400000) + 1);
      const j = ALL_JURISDICTIONS.find(j => j.id === document.getElementById('modal-jurisdiction').value);
      document.getElementById('modal-preview').textContent =
        `This will add ${days} day${days === 1 ? '' : 's'} to ${j?.name || 'jurisdiction'}`;
    }
  };

  document.getElementById('modal-start').addEventListener('change', updatePreview);
  document.getElementById('modal-end').addEventListener('change', updatePreview);
  document.getElementById('modal-jurisdiction').addEventListener('change', updatePreview);
  updatePreview();

  document.getElementById('modal-cancel').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  document.getElementById('modal-add').addEventListener('click', () => {
    const jId = document.getElementById('modal-jurisdiction').value;
    const start = document.getElementById('modal-start').value;
    const end = document.getElementById('modal-end').value;
    const j = ALL_JURISDICTIONS.find(j => j.id === jId);
    if (j && start && end) {
      const code = [...j.countryCodes][0] || 'XX';
      addDateRange(jId, code, new Date(start + 'T00:00'), new Date(end + 'T00:00'), 'manual');
      modal.classList.remove('open');
      document.dispatchEvent(new CustomEvent('data-changed'));
    }
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  }, { once: true });
}
