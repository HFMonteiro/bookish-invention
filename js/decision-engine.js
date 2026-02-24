// ============================================
// Decision Engine — Adopt / Adapt / De novo
// ============================================

const DecisionModule = (() => {

  function render(container) {
    const questions = State.getPicoQuestions();

    if (questions.length === 0) {
      container.innerHTML = `
        <div class="content-header">
          <h1 class="content-title">ADOLOPMENT Decisions</h1>
          <p class="content-subtitle">For each PICO question, decide whether to adopt, adapt, or develop de novo.</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-illustration">⚖️</div>
          <div class="empty-state-title">No PICO Questions</div>
          <div class="empty-state-text">Define PICO questions and complete EtD assessments first.</div>
          <button class="btn btn-primary" onclick="App.navigate('pico')">Go to PICO Questions</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="content-header">
        <h1 class="content-title">ADOLOPMENT Decisions</h1>
        <p class="content-subtitle">
          For each PICO question, determine whether to <strong>Adopt</strong> (use existing recommendation as-is),
          <strong>Adapt</strong> (modify for local context), or develop <strong>De Novo</strong> (create new recommendation).
        </p>
      </div>

      <div id="decision-flow-viz" style="margin-bottom:var(--space-8); background:var(--color-bg-card); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-4);"></div>

      <div class="stagger-children" style="display:flex; flex-direction:column; gap:var(--space-6);">
        ${questions.map((q, i) => renderDecisionCard(q, i)).join('')}
      </div>
    `;

    attachEvents(container);

    // Render visual flowchart
    const flowViz = document.getElementById('decision-flow-viz');
    if (flowViz) DecisionFlow.render(flowViz);
  }

  function renderDecisionCard(q, idx) {
    const decision = State.getDecision(q.id) || {};
    const assessments = State.getEtdAssessments(q.id);
    const completedDomains = Object.keys(assessments).filter(k => assessments[k]?.judgment).length;
    const suggestion = suggestDecision(q.id);

    return `
      <div class="card" data-pico-id="${q.id}">
        <div class="card-header">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="pico-card-id" style="font-size:var(--font-size-sm);">Q${idx + 1}</span>
              <h4>${escapeHtml(q.topic || 'PICO Question')}</h4>
              <span class="badge badge-pending">${completedDomains}/9 EtD domains</span>
            </div>
          </div>
        </div>

        ${suggestion.message ? `
          <div style="background:${suggestion.color}08; border:1px solid ${suggestion.color}30; border-radius:var(--radius-md); padding:var(--space-3) var(--space-4); margin-bottom:var(--space-4);">
            <p class="text-sm"><strong>💡 Suggestion:</strong> ${suggestion.message}</p>
          </div>
        ` : ''}

        <!-- Decision Type -->
        <div class="form-group">
          <label class="form-label">Decision</label>
          <div class="scale-group" style="gap:var(--space-3);">
            <div class="scale-option">
              <input type="radio" name="decision-${q.id}" id="decision-${q.id}-adopt" value="adopt"
                ${decision.type === 'adopt' ? 'checked' : ''} data-pico="${q.id}">
              <label for="decision-${q.id}-adopt" style="padding:var(--space-3) var(--space-6);">
                <span style="display:block; font-size:1.2rem;">✅</span>
                <strong>Adopt</strong>
                <span style="display:block; font-size:var(--font-size-xs); color:var(--color-text-muted); margin-top:2px;">Use as-is</span>
              </label>
            </div>
            <div class="scale-option">
              <input type="radio" name="decision-${q.id}" id="decision-${q.id}-adapt" value="adapt"
                ${decision.type === 'adapt' ? 'checked' : ''} data-pico="${q.id}">
              <label for="decision-${q.id}-adapt" style="padding:var(--space-3) var(--space-6);">
                <span style="display:block; font-size:1.2rem;">🔄</span>
                <strong>Adapt</strong>
                <span style="display:block; font-size:var(--font-size-xs); color:var(--color-text-muted); margin-top:2px;">Modify for context</span>
              </label>
            </div>
            <div class="scale-option">
              <input type="radio" name="decision-${q.id}" id="decision-${q.id}-denovo" value="denovo"
                ${decision.type === 'denovo' ? 'checked' : ''} data-pico="${q.id}">
              <label for="decision-${q.id}-denovo" style="padding:var(--space-3) var(--space-6);">
                <span style="display:block; font-size:1.2rem;">🆕</span>
                <strong>De Novo</strong>
                <span style="display:block; font-size:var(--font-size-xs); color:var(--color-text-muted); margin-top:2px;">Create new</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Source reference (for adopt/adapt) -->
        <div class="form-group">
          <label class="form-label">Source Guideline Reference</label>
          <select class="form-select decision-source" data-pico="${q.id}">
            <option value="">Select source guideline...</option>
            ${State.getSourceGuidelines().map(s => `
              <option value="${s.id}" ${decision.sourceId === s.id ? 'selected' : ''}>${escapeHtml(s.title)} (${s.year || 'n.d.'})</option>
            `).join('')}
          </select>
        </div>

        <!-- Justification -->
        <div class="form-group">
          <label class="form-label">Justification</label>
          <textarea class="form-textarea decision-justification" data-pico="${q.id}" rows="3"
            placeholder="Explain why this decision was made. For adaptations, describe what contextual factors differ...">${escapeHtml(decision.justification || '')}</textarea>
        </div>

        <!-- Domains that differ (for adapt) -->
        <div class="form-group">
          <label class="form-label">Domains Requiring Contextual Changes <span class="form-label-hint">(for adaptation)</span></label>
          <div style="display:flex; flex-wrap:wrap; gap:var(--space-2);">
            ${['values', 'resources', 'cost_effectiveness', 'equity', 'acceptability', 'feasibility'].map(d => `
              <label style="display:flex; align-items:center; gap:var(--space-1); font-size:var(--font-size-sm); cursor:pointer;">
                <input type="checkbox" class="decision-domain-diff" data-pico="${q.id}" data-domain="${d}"
                  ${decision.diffDomains?.includes(d) ? 'checked' : ''}>
                ${d.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function suggestDecision(picoId) {
    const assessments = State.getEtdAssessments(picoId);
    const sources = State.getSourceGuidelines();
    const completedDomains = Object.keys(assessments).filter(k => assessments[k]?.judgment).length;

    if (completedDomains < 3) {
      return { message: 'Complete more EtD domains to receive a suggestion.', color: '#94A3B8' };
    }

    if (sources.length === 0) {
      return { message: 'No source guidelines registered. Consider developing de novo or add source guidelines first.', color: '#009ADE' };
    }

    const highTrustSources = sources.filter(s => s.trustworthiness === 'high');
    if (highTrustSources.length === 0) {
      return { message: 'No high-trustworthiness source guidelines found. Consider adaptation with caution or de novo development.', color: '#F5A623' };
    }

    // Simple heuristic based on contextual domains
    const contextDomains = ['values', 'resources', 'cost_effectiveness', 'equity', 'acceptability', 'feasibility'];
    let contextChanges = 0;
    contextDomains.forEach(d => {
      const a = assessments[d];
      if (a && a.judgment) {
        if (['no', 'probably_no', 'large_costs', 'reduced', 'favors_comparison'].includes(a.judgment)) {
          contextChanges++;
        }
      }
    });

    if (contextChanges === 0 && highTrustSources.length > 0) {
      return { message: 'Context aligns well with source guidelines. Consider <strong>Adoption</strong>.', color: '#4CAF50' };
    } else if (contextChanges <= 2) {
      return { message: `${contextChanges} contextual domain(s) differ from source. Consider <strong>Adaptation</strong>.`, color: '#F5A623' };
    } else {
      return { message: `${contextChanges} contextual domains differ significantly. Consider <strong>De Novo</strong> development.`, color: '#009ADE' };
    }
  }

  function attachEvents(container) {
    // Decision type radio
    container.querySelectorAll('input[type="radio"][data-pico]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const picoId = e.target.dataset.pico;
        const current = State.getDecision(picoId) || {};
        current.type = e.target.value;
        State.setDecision(picoId, current);
        App.updateSidebar();
      });
    });

    // Source select
    container.querySelectorAll('.decision-source').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const picoId = e.target.dataset.pico;
        const current = State.getDecision(picoId) || {};
        current.sourceId = e.target.value;
        State.setDecision(picoId, current);
      });
    });

    // Justification
    container.querySelectorAll('.decision-justification').forEach(ta => {
      ta.addEventListener('blur', (e) => {
        const picoId = e.target.dataset.pico;
        const current = State.getDecision(picoId) || {};
        current.justification = e.target.value;
        State.setDecision(picoId, current);
      });
    });

    // Diff domains checkboxes
    container.querySelectorAll('.decision-domain-diff').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const picoId = e.target.dataset.pico;
        const domain = e.target.dataset.domain;
        const current = State.getDecision(picoId) || {};
        if (!current.diffDomains) current.diffDomains = [];
        if (e.target.checked) {
          if (!current.diffDomains.includes(domain)) current.diffDomains.push(domain);
        } else {
          current.diffDomains = current.diffDomains.filter(d => d !== domain);
        }
        State.setDecision(picoId, current);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
