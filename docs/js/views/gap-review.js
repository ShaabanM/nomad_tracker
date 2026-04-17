// Gap review modal (Atlas design)
import { findJurisdictionForCitizenship, getJurisdictionsForCitizenship } from '../data/citizenship-rules.js';
import {
  fillGapRange,
  setGapReviewedThrough,
  todayStr,
  toDateStr,
  parseDate,
  addDays,
  diffDays,
  getCitizenship,
} from '../services/storage.js';
import { countryFlag } from '../data/jurisdictions.js';

export function showGapReview(gap, currentLocation, onDone) {
  const modal = document.getElementById('modal');
  const citizenCode = getCitizenship();
  const lastJ = findJurisdictionForCitizenship(gap.lastRecord.jurisdictionId, citizenCode);
  const currentJ = currentLocation?.jurisdiction;
  const gapStart = gap.gapStart;
  const gapEnd = addDays(gap.gapEndExclusive, -1);
  const gapDays = gap.gapDays;

  const lastBlock = lastJ
    ? `<button class="opt-btn" data-option="last">
        <div class="opt-btn-icon" style="font-size:22px">${lastJ.emoji}</div>
        <div class="opt-btn-body">
          <div class="opt-btn-title">Still in ${escapeHtml(lastJ.name)}</div>
          <div class="opt-btn-desc">Fill all ${gapDays} day${gapDays === 1 ? '' : 's'} as ${escapeHtml(lastJ.name)}</div>
        </div>
        <span style="color:var(--text-tertiary)"><svg width="16" height="16"><use href="#icon-chevron-right"/></svg></span>
      </button>`
    : '';

  const currentBlock = (currentJ && currentJ.id !== lastJ?.id && !currentJ.visaRequired && !currentJ.homeCountry && !currentJ.unrestricted)
    ? `<button class="opt-btn" data-option="current">
        <div class="opt-btn-icon" style="font-size:22px">${currentJ.emoji}</div>
        <div class="opt-btn-body">
          <div class="opt-btn-title">Already in ${escapeHtml(currentJ.name)} the whole time</div>
          <div class="opt-btn-desc">Fill all ${gapDays} day${gapDays === 1 ? '' : 's'} as ${escapeHtml(currentJ.name)}</div>
        </div>
        <span style="color:var(--text-tertiary)"><svg width="16" height="16"><use href="#icon-chevron-right"/></svg></span>
      </button>`
    : '';

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Unlogged days</div>
    <div class="modal-desc">
      You didn't open the app for <strong style="color:var(--text)">${gapDays} day${gapDays === 1 ? '' : 's'}</strong>
      (${formatDateLong(gapStart)} – ${formatDateLong(gapEnd)}).<br>
      Last in <strong style="color:var(--text)">${lastJ ? escapeHtml(lastJ.name) : 'Unknown'}</strong>, now in <strong style="color:var(--text)">${currentJ ? escapeHtml(currentJ.name) : 'an untracked location'}</strong>.
    </div>

    ${lastBlock}
    ${currentBlock}

    <button class="opt-btn" data-option="split">
      <div class="opt-btn-icon">🔀</div>
      <div class="opt-btn-body">
        <div class="opt-btn-title">Split — I moved during this time</div>
        <div class="opt-btn-desc">Pick a transition date</div>
      </div>
      <span style="color:var(--text-tertiary)"><svg width="16" height="16"><use href="#icon-chevron-right"/></svg></span>
    </button>

    <button class="opt-btn" data-option="custom">
      <div class="opt-btn-icon">✋</div>
      <div class="opt-btn-body">
        <div class="opt-btn-title">Add trips manually</div>
        <div class="opt-btn-desc">Multiple legs or other countries</div>
      </div>
      <span style="color:var(--text-tertiary)"><svg width="16" height="16"><use href="#icon-chevron-right"/></svg></span>
    </button>

    <button class="btn btn-text" id="gap-skip" style="margin-top:10px">Skip — leave unlogged</button>
  `;

  modal.classList.add('open');

  modal.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const opt = btn.dataset.option;
      if (opt === 'last') {
        fillGapAs(lastJ, gapStart, gapEnd);
        close();
      } else if (opt === 'current') {
        fillGapAs(currentJ, gapStart, gapEnd);
        close();
      } else if (opt === 'split') {
        showSplitFlow(gap, lastJ, currentJ, onDone);
      } else if (opt === 'custom') {
        showCustomFlow(gap, onDone);
      }
    });
  });

  modal.querySelector('#gap-skip').addEventListener('click', () => {
    setGapReviewedThrough(todayStr());
    close();
  });

  const closeHandler = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.removeEventListener('click', closeHandler);
    }
  };
  modal.addEventListener('click', closeHandler);

  function close() {
    setGapReviewedThrough(todayStr());
    modal.classList.remove('open');
    onDone?.();
  }

  function fillGapAs(jurisdiction, startInclusive, endInclusive) {
    if (!jurisdiction || jurisdiction.visaRequired || jurisdiction.homeCountry || jurisdiction.unrestricted) return;
    const code = [...jurisdiction.countryCodes][0] || 'XX';
    fillGapRange(jurisdiction.id, code, parseDate(startInclusive), parseDate(endInclusive), 'inferred');
  }
}

function showSplitFlow(gap, lastJ, currentJ, onDone) {
  const modal = document.getElementById('modal');
  const gapStart = gap.gapStart;
  const gapEnd = addDays(gap.gapEndExclusive, -1);
  const mid = addDays(gapStart, Math.floor(gap.gapDays / 2));

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Split the gap</div>
    <div class="modal-desc">
      Pick the date you moved from <strong style="color:var(--text)">${lastJ ? escapeHtml(lastJ.name) : 'Unknown'}</strong>
      to <strong style="color:var(--text)">${currentJ ? escapeHtml(currentJ.name) : 'current location'}</strong>.
      Days on or after this date will be logged as ${currentJ ? escapeHtml(currentJ.name) : 'current'}.
    </div>

    <div class="form-group">
      <label class="form-label">Moved on</label>
      <input type="date" class="form-input" id="split-date" value="${mid}" min="${gapStart}" max="${gapEnd}">
    </div>

    <div id="split-preview" style="font-size:13px;color:var(--text-secondary);margin:4px 2px 18px;line-height:1.5"></div>

    <button class="btn btn-primary" id="split-confirm">Log these days</button>
    <button class="btn btn-text" id="split-back" style="margin-top:4px">Back</button>
  `;

  const updatePreview = () => {
    const t = document.getElementById('split-date').value;
    if (!t) return;
    const daysLast = Math.max(0, diffDays(t, gapStart));
    const daysCurrent = Math.max(0, diffDays(addDays(gapEnd, 1), t));
    document.getElementById('split-preview').innerHTML = `
      ${lastJ ? `${lastJ.emoji} ${escapeHtml(lastJ.name)}: <strong style="color:var(--text)">${daysLast}</strong> day${daysLast === 1 ? '' : 's'}<br>` : ''}
      ${currentJ ? `${currentJ.emoji} ${escapeHtml(currentJ.name)}: <strong style="color:var(--text)">${daysCurrent}</strong> day${daysCurrent === 1 ? '' : 's'}` : ''}
    `;
  };
  document.getElementById('split-date').addEventListener('change', updatePreview);
  updatePreview();

  document.getElementById('split-back').addEventListener('click', () => {
    showGapReview(gap, { jurisdiction: currentJ }, onDone);
  });

  document.getElementById('split-confirm').addEventListener('click', () => {
    const t = document.getElementById('split-date').value;
    if (!t) return;
    if (lastJ && t > gapStart) {
      const code = [...lastJ.countryCodes][0] || 'XX';
      fillGapRange(lastJ.id, code, parseDate(gapStart), parseDate(addDays(t, -1)), 'inferred');
    }
    if (currentJ && !currentJ.visaRequired && !currentJ.homeCountry && !currentJ.unrestricted && t <= gapEnd) {
      const code = [...currentJ.countryCodes][0] || 'XX';
      fillGapRange(currentJ.id, code, parseDate(t), parseDate(gapEnd), 'inferred');
    }
    setGapReviewedThrough(todayStr());
    modal.classList.remove('open');
    onDone?.();
  });
}

function showCustomFlow(gap, onDone) {
  const modal = document.getElementById('modal');
  const citizenCode = getCitizenship();
  const jurisdictions = getJurisdictionsForCitizenship(citizenCode);
  const trackable = jurisdictions.filter(j => !j.visaRequired && !j.homeCountry && !j.unrestricted);
  const options = trackable.map(j => `<option value="${j.id}">${j.emoji} ${escapeHtml(j.name)}</option>`).join('');

  const gapStart = gap.gapStart;
  const gapEnd = addDays(gap.gapEndExclusive, -1);

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">Add a trip</div>
    <div class="modal-desc">
      Log one leg at a time. Keep adding trips until the gap is covered.<br>
      Unlogged: <strong style="color:var(--text)">${gapStart}</strong> – <strong style="color:var(--text)">${gapEnd}</strong>.
    </div>

    <div class="form-group">
      <label class="form-label">Jurisdiction</label>
      <select class="form-select" id="custom-j">${options}</select>
    </div>
    <div class="form-group">
      <label class="form-label">From</label>
      <input type="date" class="form-input" id="custom-start" value="${gapStart}" min="${gapStart}" max="${gapEnd}">
    </div>
    <div class="form-group">
      <label class="form-label">To</label>
      <input type="date" class="form-input" id="custom-end" value="${gapEnd}" min="${gapStart}" max="${gapEnd}">
    </div>
    <div id="custom-preview" style="font-size:13px;color:var(--text-secondary);margin:4px 2px 16px"></div>

    <button class="btn btn-primary" id="custom-add">Add trip</button>
    <button class="btn btn-text" id="custom-done" style="margin-top:4px">Done</button>
  `;

  const updatePreview = () => {
    const start = document.getElementById('custom-start').value;
    const end = document.getElementById('custom-end').value;
    if (start && end && start <= end) {
      const days = diffDays(end, start) + 1;
      const j = trackable.find(j => j.id === document.getElementById('custom-j').value);
      document.getElementById('custom-preview').textContent = `This will add ${days} day${days === 1 ? '' : 's'} to ${j?.name || 'jurisdiction'}.`;
    } else {
      document.getElementById('custom-preview').textContent = 'Pick a valid date range.';
    }
  };
  document.getElementById('custom-start').addEventListener('change', updatePreview);
  document.getElementById('custom-end').addEventListener('change', updatePreview);
  document.getElementById('custom-j').addEventListener('change', updatePreview);
  updatePreview();

  document.getElementById('custom-add').addEventListener('click', () => {
    const jId = document.getElementById('custom-j').value;
    const start = document.getElementById('custom-start').value;
    const end = document.getElementById('custom-end').value;
    const j = trackable.find(j => j.id === jId);
    if (!j || !start || !end || start > end) return;
    const code = [...j.countryCodes][0] || 'XX';
    fillGapRange(j.id, code, parseDate(start), parseDate(end), 'manual');
    setGapReviewedThrough(todayStr());
    modal.classList.remove('open');
    onDone?.();
  });

  document.getElementById('custom-done').addEventListener('click', () => {
    setGapReviewedThrough(todayStr());
    modal.classList.remove('open');
    onDone?.();
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
