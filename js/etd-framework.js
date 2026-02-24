// ============================================
// Evidence to Decision (EtD) Framework Module
// ============================================

const EtdModule = (() => {
  let etdTemplate = null;

  async function loadTemplate() {
    if (etdTemplate) return etdTemplate;
    try {
      const resp = await fetch('./data/etd-template.json');
      etdTemplate = await resp.json();
    } catch (e) {
      console.error('Failed to load EtD template:', e);
      etdTemplate = { domains: [] };
    }
    return etdTemplate;
  }

  async function render(container) {
    await loadTemplate();
    const questions = State.getPicoQuestions();

    if (questions.length === 0) {
      container.innerHTML = `
        <div class="content-header">
          <h1 class="content-title">Evidence to Decision Framework</h1>
          <p class="content-subtitle">Complete the EtD assessment for each PICO question across the 9 GRADE domains.</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-illustration">📊</div>
          <div class="empty-state-title">No PICO Questions</div>
          <div class="empty-state-text">You need to define PICO questions first before completing EtD assessments.</div>
          <button class="btn btn-primary" onclick="App.navigate('pico')">Go to PICO Questions</button>
        </div>
      `;
      return;
    }

    // PICO selector tabs
    const currentPicoId = window._currentEtdPico || questions[0].id;
    window._currentEtdPico = currentPicoId;
    const currentPico = State.getPicoById(currentPicoId) || questions[0];
    const assessments = State.getEtdAssessments(currentPico.id);

    const completedDomains = etdTemplate.domains.filter(d => assessments[d.id]?.judgment).length;
    const progressPct = Math.round((completedDomains / 9) * 100);

    container.innerHTML = `
      <div class="content-header">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="content-title">Evidence to Decision Framework</h1>
            <p class="content-subtitle">Assess each domain for the selected PICO question.</p>
          </div>
          <div class="flex items-center gap-3">
            <button class="btn btn-ghost btn-sm" id="btn-toggle-sof">📋 View SoF Table</button>
            <button class="btn btn-ghost btn-sm" onclick="EtdCompare.show('${currentPico.id}')">⚖️ Compare with Source</button>
            <span class="text-sm text-muted">${completedDomains}/9 domains</span>
            <div style="width:120px; height:6px; background:var(--color-neutral-200); border-radius:var(--radius-pill);">
              <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg,var(--color-primary-500),var(--color-teal-500)); border-radius:var(--radius-pill); transition:width 0.3s;"></div>
            </div>
          </div>
        </div>
      </div>

      <div id="etd-main-content">
        <!-- Tabs -->
        <div class="tabs mb-6" id="etd-view-tabs">
            <div class="tab ${(window._etdSubView || 'assess') === 'assess' ? 'active' : ''}" data-view="assess">Domain Assessment</div>
            <div class="tab ${(window._etdSubView || 'assess') === 'sof' ? 'active' : ''}" data-view="sof">Summary of Findings (SoF)</div>
        </div>

        <div id="etd-subview-container">
            ${(window._etdSubView || 'assess') === 'assess' ? renderAssessView(currentPico, assessments) : renderSofView(currentPico)}
        </div>
      </div>

      <div style="margin-top:var(--space-6); text-align:right;">
        <button class="btn btn-primary btn-lg" id="btn-etd-next">
          Continue to Decision →
        </button>
      </div>
    `;

    attachEvents(container, currentPico.id);
  }

  function renderAssessView(currentPico, assessments) {
    return `
      <!-- PICO Question Selector -->
      <div class="tabs" id="etd-pico-tabs">
        ${State.getPicoQuestions().map((q, i) => `
          <button class="tab ${q.id === currentPico.id ? 'active' : ''}" data-pico-id="${q.id}">
            Q${i + 1}: ${escapeHtml(q.topic || q.population?.substring(0, 30) + '...')}
          </button>
        `).join('')}
      </div>

      <!-- Current PICO Summary -->
      <div class="card mb-6" style="background: var(--color-primary-50); border-color: var(--color-primary-200);">
        <div class="pico-grid">
          <div class="pico-field"><div class="pico-field-label">Population</div><div class="pico-field-value">${escapeHtml(currentPico.population)}</div></div>
          <div class="pico-field"><div class="pico-field-label">Intervention</div><div class="pico-field-value">${escapeHtml(currentPico.intervention)}</div></div>
          <div class="pico-field"><div class="pico-field-label">Comparison</div><div class="pico-field-value">${escapeHtml(currentPico.comparison)}</div></div>
          <div class="pico-field"><div class="pico-field-label">Outcome</div><div class="pico-field-value">${escapeHtml(currentPico.outcome)}</div></div>
        </div>
      </div>

      <!-- EtD Domains -->
      <div id="etd-domains">
        ${etdTemplate.domains.map(d => renderDomain(d, assessments[d.id], currentPico.id)).join('')}
      </div>
    `;
  }

  function renderDomain(domain, assessment, picoId) {
    const isComplete = assessment?.judgment;
    const openClass = '';  // collapsed by default

    return `
      <div class="etd-domain ${openClass}" data-domain-id="${domain.id}">
        <div class="etd-domain-header">
          <div class="etd-domain-header-left">
            <div class="etd-domain-number" ${isComplete ? 'style="background:var(--color-green-500);"' : ''}>${isComplete ? '✓' : domain.number}</div>
            <div>
              <div class="etd-domain-title">${domain.title}</div>
              <div class="etd-domain-status">${isComplete ? getJudgmentLabel(domain, assessment.judgment) : 'Not assessed'}</div>
            </div>
          </div>
          <span class="etd-domain-chevron">▼</span>
        </div>
        <div class="etd-domain-body">
          <p class="text-sm text-muted mb-4">${domain.description}</p>
          <div style="background:var(--color-neutral-50); padding:var(--space-3); border-radius:var(--radius-md); margin-bottom:var(--space-4);">
            <p class="text-sm"><strong>Guidance:</strong> ${domain.guidance}</p>
          </div>

          <!-- Scale -->
          <div class="form-group">
            <label class="form-label">Judgment</label>
            <div class="scale-group">
              ${domain.scale.map(opt => `
                <div class="scale-option">
                  <input type="radio" name="etd-${domain.id}-judgment" id="etd-${domain.id}-${opt.value}"
                    value="${opt.value}" ${assessment?.judgment === opt.value ? 'checked' : ''}
                    data-domain="${domain.id}" data-field="judgment">
                  <label for="etd-${domain.id}-${opt.value}" ${opt.color ? `style="border-color:${opt.color}"` : ''}>${opt.label}</label>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Text fields -->
          ${domain.fields.filter(f => f.type === 'textarea').map(f => `
            <div class="form-group">
              <label class="form-label">${f.label}</label>
              <textarea class="form-textarea etd-field" rows="3" data-domain="${domain.id}" data-field="${f.id}"
                placeholder="${f.placeholder || ''}">${escapeHtml(assessment?.[f.id] || '')}</textarea>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function getJudgmentLabel(domain, value) {
    const opt = domain.scale.find(o => o.value === value);
    return opt ? opt.label : value;
  }

  function attachEvents(container, picoId) {
    // Toggle domain accordion
    container.querySelectorAll('.etd-domain-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('open');
      });
    });

    // PICO tab switching
    container.querySelectorAll('#etd-pico-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        window._currentEtdPico = tab.dataset.picoId;
        App.navigate('etd');
      });
    });

    // SoF tab switching
    container.querySelectorAll('#etd-view-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        window._etdSubView = tab.dataset.view;
        render(container);
      });
    });

    // Toggle button in header
    container.querySelector('#btn-toggle-sof')?.addEventListener('click', () => {
      window._etdSubView = (window._etdSubView === 'sof') ? 'assess' : 'sof';
      render(container);
    });

    // Add outcome
    container.querySelector('#btn-add-outcome')?.addEventListener('click', () => showOutcomeModal(picoId));

    // Edit outcome
    container.querySelectorAll('.btn-edit-outcome').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const outcomes = State.getPicoOutcomes(picoId);
        showOutcomeModal(picoId, outcomes[idx], idx);
      });
    });

    // Delete outcome
    container.querySelectorAll('.btn-delete-outcome').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const ok = await App.confirmDialog({ title: 'Delete Outcome', message: 'Remove this outcome from the SoF table?' });
        if (ok) {
          const outcomes = State.getPicoOutcomes(picoId);
          outcomes.splice(idx, 1);
          State.setPicoOutcomes(picoId, outcomes);
          render(container);
        }
      });
    });

    // Auto-save on textarea blur
    container.querySelectorAll('.etd-field').forEach(textarea => {
      textarea.addEventListener('blur', (e) => {
        const domainId = e.target.dataset.domain;
        const fieldId = e.target.dataset.field;
        saveField(picoId, domainId, fieldId, e.target.value);
      });
    });

    // Next button
    container.querySelector('#btn-etd-next')?.addEventListener('click', () => {
      App.navigate('decision');
    });
  }

  function saveField(picoId, domainId, fieldId, value) {
    const current = State.getEtdAssessment(picoId, domainId) || {};
    current[fieldId] = value;
    State.setEtdAssessment(picoId, domainId, current);
    App.updateSidebar();
  }

  function showOutcomeModal(picoId, existing = null, editIdx = -1) {
    const isEdit = !!existing;
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit' : 'Add'} Outcome</h3>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Outcome Name</label>
            <input type="text" class="form-input" id="sof-name" value="${escapeHtml(existing?.name || '')}" placeholder="e.g., Mortality at 30 days">
          </div>
          <div class="form-group">
            <label class="form-label">Relative Effect (95% CI)</label>
            <input type="text" class="form-input" id="sof-relative" value="${escapeHtml(existing?.relative || '')}" placeholder="e.g., RR 0.85 (0.70-0.95)">
          </div>
          <div class="form-group">
            <label class="form-label">Anticipated Absolute Effect</label>
            <input type="text" class="form-input" id="sof-absolute" value="${escapeHtml(existing?.absolute || '')}" placeholder="e.g., 10 fewer per 1000">
          </div>
          <div style="display:flex; gap:var(--space-4);">
            <div class="form-group" style="flex:1">
              <label class="form-label">Certainty</label>
              <select class="form-select" id="sof-certainty">
                  <option value="high" ${existing?.certainty === 'high' ? 'selected' : ''}>High</option>
                  <option value="moderate" ${existing?.certainty === 'moderate' ? 'selected' : ''}>Moderate</option>
                  <option value="low" ${existing?.certainty === 'low' ? 'selected' : ''}>Low</option>
                  <option value="very_low" ${existing?.certainty === 'very_low' ? 'selected' : ''}>Very Low</option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Participants / Studies</label>
              <input type="text" class="form-input" id="sof-parts" value="${escapeHtml(existing?.participants || '')}" placeholder="e.g., 1500 (3 studies)">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-save-outcome">${isEdit ? 'Update' : 'Add'}</button>
        </div>
      </div>
    `;
    overlay.classList.add('active');

    const close = () => overlay.classList.remove('active');
    overlay.querySelector('#modal-close').onclick = close;
    overlay.querySelector('#modal-cancel').onclick = close;
    overlay.querySelector('#modal-save-outcome').onclick = () => {
      const data = {
        name: document.getElementById('sof-name').value.trim(),
        relative: document.getElementById('sof-relative').value.trim(),
        absolute: document.getElementById('sof-absolute').value.trim(),
        certainty: document.getElementById('sof-certainty').value,
        participants: document.getElementById('sof-parts').value.trim()
      };
      if (!data.name) return;

      const outcomes = State.getPicoOutcomes(picoId);
      if (isEdit) outcomes[editIdx] = data;
      else outcomes.push(data);

      State.setPicoOutcomes(picoId, outcomes);
      close();
      render(document.getElementById('main-content'));
    };
  }

  // Summary of Findings view
  function renderSofView(currentPico) {
    const outcomes = State.getPicoOutcomes(currentPico.id);
    const certaintyIcons = {
      high: '⊕⊕⊕⊕',
      moderate: '⊕⊕⊕⊖',
      low: '⊕⊕⊖⊖',
      very_low: '⊕⊖⊖⊖'
    };

    return `
      <div class="card mb-6">
        <div class="flex items-center justify-between mb-4">
          <h4>Summary of Findings — ${escapeHtml(currentPico.topic || 'PICO')}</h4>
          <button class="btn btn-primary btn-sm" id="btn-add-outcome">+ Add Outcome</button>
        </div>
        ${outcomes.length === 0 ? `
          <div class="empty-state" style="padding:var(--space-8);">
            <div class="empty-state-illustration">📋</div>
            <div class="empty-state-title">No Outcomes Yet</div>
            <div class="empty-state-text">Add clinical outcomes to build the Summary of Findings table.</div>
          </div>
        ` : `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Outcome</th>
                  <th>Relative Effect (95% CI)</th>
                  <th>Anticipated Absolute Effect</th>
                  <th>Certainty</th>
                  <th>Participants (Studies)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${outcomes.map((o, idx) => `
                  <tr>
                    <td><strong>${escapeHtml(o.name)}</strong></td>
                    <td>${escapeHtml(o.relative || '—')}</td>
                    <td>${escapeHtml(o.absolute || '—')}</td>
                    <td><span class="badge badge-${o.certainty === 'high' ? 'high' : o.certainty === 'moderate' ? 'moderate' : 'verylow'}">${certaintyIcons[o.certainty] || '—'} ${(o.certainty || '').replace('_', ' ')}</span></td>
                    <td>${escapeHtml(o.participants || '—')}</td>
                    <td>
                      <button class="btn btn-ghost btn-xs btn-edit-outcome" data-idx="${idx}">✏️</button>
                      <button class="btn btn-ghost btn-xs btn-delete-outcome" data-idx="${idx}">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
