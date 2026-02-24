// ============================================
// Source Guideline Evaluation Module
// ============================================

const SourceEvalModule = (() => {

  const AGREE_CRITERIA = [
    { id: 'scope', label: 'Scope and Purpose', desc: 'Are the objectives, health questions, and target population clearly described?' },
    { id: 'stakeholder', label: 'Stakeholder Involvement', desc: 'Were all relevant professional groups and patient representatives involved?' },
    { id: 'rigor', label: 'Rigour of Development', desc: 'Were systematic methods used to search for and select evidence?' },
    { id: 'clarity', label: 'Clarity of Presentation', desc: 'Are the recommendations specific, unambiguous, and easily identifiable?' },
    { id: 'applicability', label: 'Applicability', desc: 'Does the guideline provide advice on implementation and resource implications?' },
    { id: 'independence', label: 'Editorial Independence', desc: 'Were competing interests recorded and managed appropriately?' }
  ];

  function render(container) {
    const sources = State.getSourceGuidelines();

    container.innerHTML = `
      <div class="content-header">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="content-title">Source Guidelines</h1>
            <p class="content-subtitle">Register and evaluate existing guidelines that may serve as sources for adoption or adaptation.</p>
          </div>
          <button class="btn btn-primary" id="btn-add-source">+ Add Source</button>
        </div>
      </div>

      ${sources.length === 0 ? renderEmpty() : renderSources(sources)}
    `;

    attachEvents(container);
  }

  function renderEmpty() {
    return `
      <div class="empty-state">
        <div class="empty-state-illustration">📚</div>
        <div class="empty-state-title">No Source Guidelines</div>
        <div class="empty-state-text">
          Add existing guidelines (e.g., WHO, NICE, national guidelines) that address
          your PICO questions. These will be evaluated and compared during the ADOLOPMENT process.
        </div>
        <button class="btn btn-primary" id="btn-add-source-empty">+ Add Source Guideline</button>
      </div>
    `;
  }

  function renderSources(sources) {
    return `
      <div class="stagger-children" style="display:flex; flex-direction:column; gap:var(--space-4);">
        ${sources.map(s => renderSourceCard(s)).join('')}
      </div>
    `;
  }

  function renderSourceCard(s) {
    const trustBadge = {
      high: '<span class="badge badge-high">High Trust</span>',
      moderate: '<span class="badge badge-moderate">Moderate Trust</span>',
      low: '<span class="badge badge-low">Low Trust</span>',
      not_assessed: '<span class="badge badge-pending">Not Assessed</span>'
    };

    const currBadge = {
      current: '<span class="badge badge-high">Current</span>',
      recent: '<span class="badge badge-moderate">Recent</span>',
      outdated: '<span class="badge badge-verylow">Outdated</span>'
    };

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h4 style="margin-bottom:var(--space-1);">${escapeHtml(s.title)}</h4>
            <div class="text-sm text-muted">
              ${escapeHtml(s.organization || '')} ${s.year ? `(${s.year})` : ''}
              ${s.url ? ` · <a href="${escapeHtml(s.url)}" target="_blank">🔗 Link</a>` : ''}
            </div>
          </div>
          <div class="flex gap-2">
            ${trustBadge[s.trustworthiness] || trustBadge.not_assessed}
            ${currBadge[s.currency] || ''}
          </div>
        </div>
        ${s.notes ? `<p class="text-sm" style="margin-bottom:var(--space-3);">${escapeHtml(s.notes)}</p>` : ''}
        ${s.agreeScores ? renderAgreeBar(s.agreeScores) : ''}
        <div class="card-footer">
          <button class="btn btn-ghost btn-sm btn-assess-source" data-id="${s.id}">📋 Assess Quality</button>
          <button class="btn btn-ghost btn-sm btn-edit-source" data-id="${s.id}">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm btn-delete-source" data-id="${s.id}">🗑️ Delete</button>
        </div>
      </div>
    `;
  }

  function renderAgreeBar(scores) {
    if (!scores) return '';
    return `
      <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:var(--space-2); margin-top:var(--space-2);">
        ${AGREE_CRITERIA.map(c => {
      const score = scores[c.id] || 0;
      const pct = Math.round((score / 7) * 100);
      return `
            <div style="text-align:center;">
              <div class="text-sm" style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${c.label.split(' ')[0]}</div>
              <div style="height:4px; background:var(--color-neutral-200); border-radius:var(--radius-pill); margin-top:4px;">
                <div style="height:100%; width:${pct}%; background:${pct >= 70 ? 'var(--color-green-500)' : pct >= 40 ? 'var(--color-amber-500)' : 'var(--color-red-500)'}; border-radius:var(--radius-pill);"></div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  function attachEvents(container) {
    container.querySelectorAll('#btn-add-source, #btn-add-source-empty').forEach(btn => {
      btn.addEventListener('click', () => showSourceModal());
    });

    container.querySelectorAll('.btn-edit-source').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const src = State.getSourceGuidelines().find(s => s.id === id);
        if (src) showSourceModal(src);
      });
    });

    container.querySelectorAll('.btn-delete-source').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const ok = await App.confirmDialog({
          title: 'Delete Source Guideline',
          message: 'This will permanently remove this source guideline and its quality assessment. This cannot be undone.',
          confirmText: 'Delete',
          type: 'danger'
        });
        if (ok) {
          State.deleteSourceGuideline(id);
          App.showToast('Source deleted', 'info');
          App.navigate('sources');
        }
      });
    });

    container.querySelectorAll('.btn-assess-source').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const src = State.getSourceGuidelines().find(s => s.id === id);
        if (src) showAssessModal(src);
      });
    });
  }

  function showSourceModal(existing = null) {
    const isEdit = !!existing;
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit' : 'Add'} Source Guideline</h3>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Guideline Title</label>
            <input type="text" class="form-input" id="src-title" value="${escapeHtml(existing?.title || '')}"
              placeholder="Full title of the guideline">
          </div>
          <div style="display:flex; gap:var(--space-4);">
            <div class="form-group" style="flex:2">
              <label class="form-label">Organization</label>
              <input type="text" class="form-input" id="src-org" value="${escapeHtml(existing?.organization || '')}" placeholder="e.g., WHO, NICE">
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Year</label>
              <input type="text" class="form-input" id="src-year" value="${escapeHtml(existing?.year || '')}" placeholder="e.g., 2021">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">URL / DOI</label>
            <input type="text" class="form-input" id="src-url" value="${escapeHtml(existing?.url || '')}" placeholder="https://...">
          </div>
          <div style="display:flex; gap:var(--space-4);">
            <div class="form-group" style="flex:1">
              <label class="form-label">Trustworthiness</label>
              <select class="form-select" id="src-trust">
                <option value="not_assessed" ${(!existing?.trustworthiness || existing?.trustworthiness === 'not_assessed') ? 'selected' : ''}>Not Yet Assessed</option>
                <option value="high" ${existing?.trustworthiness === 'high' ? 'selected' : ''}>High</option>
                <option value="moderate" ${existing?.trustworthiness === 'moderate' ? 'selected' : ''}>Moderate</option>
                <option value="low" ${existing?.trustworthiness === 'low' ? 'selected' : ''}>Low</option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Currency</label>
              <select class="form-select" id="src-currency">
                <option value="">Select...</option>
                <option value="current" ${existing?.currency === 'current' ? 'selected' : ''}>Current</option>
                <option value="recent" ${existing?.currency === 'recent' ? 'selected' : ''}>Recent (needs minor update)</option>
                <option value="outdated" ${existing?.currency === 'outdated' ? 'selected' : ''}>Outdated</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-textarea" id="src-notes" rows="2" placeholder="Additional notes...">${escapeHtml(existing?.notes || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-save">${isEdit ? 'Update' : 'Add'}</button>
        </div>
      </div>
    `;
    overlay.classList.add('active');

    overlay.querySelector('#modal-close').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#modal-save').onclick = () => {
      const data = {
        title: document.getElementById('src-title').value.trim(),
        organization: document.getElementById('src-org').value.trim(),
        year: document.getElementById('src-year').value.trim(),
        url: document.getElementById('src-url').value.trim(),
        trustworthiness: document.getElementById('src-trust').value,
        currency: document.getElementById('src-currency').value,
        notes: document.getElementById('src-notes').value.trim()
      };
      if (!data.title) {
        App.showToast('Please enter the guideline title', 'error');
        return;
      }
      if (isEdit) {
        State.updateSourceGuideline(existing.id, data);
        App.showToast('Source updated!', 'success');
      } else {
        State.addSourceGuideline(data);
        App.showToast('Source added!', 'success');
      }
      overlay.classList.remove('active');
      App.navigate('sources');
    };
  }

  function showAssessModal(source) {
    const overlay = document.getElementById('modal-overlay');
    const scores = source.agreeScores || {};

    overlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">Quality Assessment (AGREE II)</h3>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="agree-overview-card mb-6">
            <div class="agree-gauge-container">
                <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-neutral-100)" stroke-width="10" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-primary-500)" stroke-width="10" 
                        stroke-dasharray="339.29" stroke-dashoffset="${339.29 * (1 - (calculateAvg(scores) / 7))}"
                        id="agree-gauge-fill" style="transition: stroke-dashoffset 0.5s ease;" />
                    <text x="60" y="65" text-anchor="middle" font-size="24" font-weight="700" fill="var(--color-text-primary)" id="agree-gauge-pct">${Math.round((calculateAvg(scores) / 7) * 100)}%</text>
                </svg>
            </div>
            <div>
                <div class="font-bold mb-1">Overall Quality Score</div>
                <div class="text-sm text-muted">Based on 6 domains of development rigor and transparency.</div>
                <div id="agree-trust-badge" class="mt-2">${getTrustBadge(calculateAvg(scores))}</div>
            </div>
          </div>

          <div class="agree-grid">
            ${AGREE_CRITERIA.map(c => `
              <div class="agree-domain-card">
                <div class="font-bold text-sm mb-1">${c.label}</div>
                <div class="text-xs text-muted mb-3">${c.desc}</div>
                <div class="scale-group">
                  ${[1, 2, 3, 4, 5, 6, 7].map(v => `
                    <div class="scale-option">
                      <input type="radio" name="agree-${c.id}" id="agree-${c.id}-${v}" value="${v}"
                        ${scores[c.id] === v ? 'checked' : ''} onchange="SourceEvalModule.updateGauge()">
                      <label for="agree-${c.id}-${v}">${v}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-save-assess">Save Assessment</button>
        </div>
      </div>
    `;
    overlay.classList.add('active');

    overlay.querySelector('#modal-close').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#modal-save-assess').onclick = () => {
      const agreeScores = {};
      let allRated = true;
      AGREE_CRITERIA.forEach(c => {
        const sel = document.querySelector(`input[name="agree-${c.id}"]:checked`);
        if (sel) {
          agreeScores[c.id] = parseInt(sel.value);
        } else {
          allRated = false;
        }
      });

      // Determine overall trustworthiness
      const avg = Object.values(agreeScores).reduce((a, b) => a + b, 0) / Math.max(Object.values(agreeScores).length, 1);
      let trust = 'not_assessed';
      if (avg >= 5.5) trust = 'high';
      else if (avg >= 3.5) trust = 'moderate';
      else if (avg > 0) trust = 'low';

      State.updateSourceGuideline(source.id, { agreeScores, trustworthiness: trust });
      overlay.classList.remove('active');
      App.showToast('Assessment saved!', 'success');
      App.navigate('sources');
    };
  }

  function calculateAvg(scores) {
    const vals = Object.values(scores);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function getTrustBadge(avg) {
    if (avg <= 0) return '<span class="badge badge-pending">Pending</span>';
    if (avg >= 5.5) return '<span class="badge badge-high">High Trust</span>';
    if (avg >= 3.5) return '<span class="badge badge-moderate">Moderate Trust</span>';
    return '<span class="badge badge-verylow">Low Trust</span>';
  }

  function updateGauge() {
    const scores = {};
    AGREE_CRITERIA.forEach(c => {
      const sel = document.querySelector(`input[name="agree-${c.id}"]:checked`);
      if (sel) scores[c.id] = parseInt(sel.value);
    });

    const avg = calculateAvg(scores);
    const pct = Math.round((avg / 7) * 100);

    const fill = document.getElementById('agree-gauge-fill');
    const text = document.getElementById('agree-gauge-pct');
    const badge = document.getElementById('agree-trust-badge');

    if (fill) fill.style.strokeDashoffset = 339.29 * (1 - (avg / 7));
    if (text) text.textContent = `${pct}%`;
    if (badge) badge.innerHTML = getTrustBadge(avg);
  }

  return { render, updateGauge };
})();
