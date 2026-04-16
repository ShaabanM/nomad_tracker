// Manual location override — lets the user pick a country when GPS is wrong
// or unavailable (e.g., desktop PWA, VPN, no signal).
import { ALL_JURISDICTIONS, countryFlag } from '../data/jurisdictions.js';
import { setLocationOverride, getLocationOverride } from '../services/storage.js';

export function showLocationOverride() {
  const modal = document.getElementById('modal');
  const current = getLocationOverride();

  // Build a flat country list from all jurisdictions.
  const countries = [];
  for (const j of ALL_JURISDICTIONS) {
    for (const code of j.countryCodes) {
      countries.push({ code, jId: j.id, jName: j.name });
    }
  }
  // Dedupe by code
  const seen = new Set();
  const unique = countries.filter(c => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  }).sort((a, b) => a.code.localeCompare(b.code));

  const regionNames = (() => {
    try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; }
  })();
  const countryName = (code) => regionNames ? regionNames.of(code) || code : code;

  const options = unique.map(c =>
    `<option value="${c.code}" ${current?.countryCode === c.code ? 'selected' : ''}>${countryFlag(c.code)} ${escapeHtml(countryName(c.code))} — ${escapeHtml(c.jName)}</option>`
  ).join('');

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Set location manually</div>
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.45;margin-bottom:16px">
      GPS or reverse-geocoding got it wrong? Pick your country here. This will override auto-detection until you clear it.
    </div>

    <div class="form-group">
      <label class="form-label">Country</label>
      <select class="form-select" id="override-country">
        <option value="">— Select a country —</option>
        ${options}
      </select>
    </div>

    <button class="btn btn-primary" id="override-save">Save override</button>
    ${current ? `<button class="btn btn-bordered" id="override-clear" style="margin-top:8px">Clear override (use GPS)</button>` : ''}
    <button class="btn btn-text" id="override-cancel" style="margin-top:8px">Cancel</button>
  `;

  modal.classList.add('open');

  modal.querySelector('#override-save').addEventListener('click', () => {
    const code = modal.querySelector('#override-country').value;
    if (!code) return;
    const name = countryName(code);
    setLocationOverride({
      countryCode: code,
      country: name,
      city: '',
    });
    modal.classList.remove('open');
    document.dispatchEvent(new CustomEvent('location-override-changed'));
  });

  const clearBtn = modal.querySelector('#override-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      setLocationOverride(null);
      modal.classList.remove('open');
      document.dispatchEvent(new CustomEvent('location-override-changed'));
    });
  }

  modal.querySelector('#override-cancel').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  const closeHandler = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.removeEventListener('click', closeHandler);
    }
  };
  modal.addEventListener('click', closeHandler);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
