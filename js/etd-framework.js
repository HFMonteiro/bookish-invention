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
            <span class="text-sm text-muted">${completedDomains}/9 domains</span>
            <div style="width:120px; height:6px; background:var(--color-neutral-200); border-radius:var(--radius-pill);">
              <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg,var(--color-primary-500),var(--color-teal-500)); border-radius:var(--radius-pill); transition:width 0.3s;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- PICO Question Selector -->
      <div class="tabs" id="etd-pico-tabs">
        ${questions.map((q, i) => `
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

      <div style="margin-top:var(--space-6); text-align:right;">
        <button class="btn btn-primary btn-lg" id="btn-etd-next">
          Continue to Decision →
        </button>
      </div>
    `;

    attachEvents(container, currentPico.id);
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

    // Auto-save on scale change
    container.querySelectorAll('input[type="radio"][data-domain]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const domainId = e.target.dataset.domain;
        const fieldId = e.target.dataset.field;
        saveField(picoId, domainId, fieldId, e.target.value);
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

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
