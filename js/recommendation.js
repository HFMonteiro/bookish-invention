// ============================================
// Recommendation Formulation Module
// ============================================

const RecommendationModule = (() => {

  function render(container) {
    const questions = State.getPicoQuestions();

    if (questions.length === 0) {
      container.innerHTML = `
        <div class="content-header">
          <h1 class="content-title">Recommendations</h1>
          <p class="content-subtitle">Formulate recommendations for each PICO question.</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-illustration">📝</div>
          <div class="empty-state-title">No PICO Questions</div>
          <div class="empty-state-text">Define PICO questions first to begin formulating recommendations.</div>
          <button class="btn btn-primary" onclick="App.navigate('pico')">Go to PICO Questions</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="content-header">
        <h1 class="content-title">Recommendations</h1>
        <p class="content-subtitle">
          Formulate each recommendation specifying strength (strong/conditional), direction (for/against),
          certainty of evidence, and implementation considerations.
        </p>
      </div>

      <div class="stagger-children" style="display:flex; flex-direction:column; gap:var(--space-6);">
        ${questions.map((q, i) => renderRecCard(q, i)).join('')}
      </div>
    `;

    attachEvents(container);
  }

  function renderRecCard(q, idx) {
    const rec = State.getRecommendation(q.id) || {};
    const decision = State.getDecision(q.id);
    const decBadge = decision?.type ?
      `<span class="badge badge-${decision.type}">${decision.type.charAt(0).toUpperCase() + decision.type.slice(1)}</span>` : '';

    return `
      <div class="card" data-pico-id="${q.id}">
        <div class="card-header">
          <div class="flex items-center gap-3">
            <span class="pico-card-id">Q${idx + 1}</span>
            <h4>${escapeHtml(q.topic || 'PICO Question')}</h4>
            ${decBadge}
          </div>
        </div>

        <!-- Recommendation Text -->
        <div class="form-group">
          <label class="form-label">Recommendation Statement</label>
          <textarea class="form-textarea rec-field" rows="4" data-pico="${q.id}" data-field="text"
            placeholder="Write the recommendation text. Use clear, actionable language. E.g.: 'We recommend HPV testing rather than cytology for primary cervical cancer screening in women aged 30-65 (strong recommendation, moderate certainty evidence).'">${escapeHtml(rec.text || '')}</textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
          <!-- Strength -->
          <div class="form-group">
            <label class="form-label">Strength of Recommendation</label>
            <div class="scale-group" style="flex-direction:column;">
              <div class="scale-option">
                <input type="radio" name="strength-${q.id}" id="strength-${q.id}-strong-for" value="strong_for"
                  ${rec.strength === 'strong_for' ? 'checked' : ''} data-pico="${q.id}" data-field="strength">
                <label for="strength-${q.id}-strong-for" style="width:100%; text-align:left;">
                  <span style="color:var(--color-green-700);">■</span> Strong recommendation FOR
                </label>
              </div>
              <div class="scale-option">
                <input type="radio" name="strength-${q.id}" id="strength-${q.id}-cond-for" value="conditional_for"
                  ${rec.strength === 'conditional_for' ? 'checked' : ''} data-pico="${q.id}" data-field="strength">
                <label for="strength-${q.id}-cond-for" style="width:100%; text-align:left;">
                  <span style="color:var(--color-amber-500);">■</span> Conditional recommendation FOR
                </label>
              </div>
              <div class="scale-option">
                <input type="radio" name="strength-${q.id}" id="strength-${q.id}-cond-against" value="conditional_against"
                  ${rec.strength === 'conditional_against' ? 'checked' : ''} data-pico="${q.id}" data-field="strength">
                <label for="strength-${q.id}-cond-against" style="width:100%; text-align:left;">
                  <span style="color:var(--color-amber-700);">■</span> Conditional recommendation AGAINST
                </label>
              </div>
              <div class="scale-option">
                <input type="radio" name="strength-${q.id}" id="strength-${q.id}-strong-against" value="strong_against"
                  ${rec.strength === 'strong_against' ? 'checked' : ''} data-pico="${q.id}" data-field="strength">
                <label for="strength-${q.id}-strong-against" style="width:100%; text-align:left;">
                  <span style="color:var(--color-red-700);">■</span> Strong recommendation AGAINST
                </label>
              </div>
            </div>
          </div>

          <!-- Certainty -->
          <div class="form-group">
            <label class="form-label">Certainty of Evidence</label>
            <div class="scale-group" style="flex-direction:column;">
              ${[
        { value: 'high', label: 'High', icon: '⊕⊕⊕⊕' },
        { value: 'moderate', label: 'Moderate', icon: '⊕⊕⊕⊖' },
        { value: 'low', label: 'Low', icon: '⊕⊕⊖⊖' },
        { value: 'very_low', label: 'Very Low', icon: '⊕⊖⊖⊖' }
      ].map(c => `
                <div class="scale-option">
                  <input type="radio" name="certainty-${q.id}" id="certainty-${q.id}-${c.value}" value="${c.value}"
                    ${rec.certainty === c.value ? 'checked' : ''} data-pico="${q.id}" data-field="certainty">
                  <label for="certainty-${q.id}-${c.value}" style="width:100%; text-align:left;">
                    <span class="badge badge-${c.value}" style="margin-right:var(--space-2);">${c.icon}</span> ${c.label}
                  </label>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Remarks -->
        <div class="form-group">
          <label class="form-label">Remarks & Implementation Considerations</label>
          <textarea class="form-textarea rec-field" rows="3" data-pico="${q.id}" data-field="remarks"
            placeholder="Additional notes, subgroup considerations, implementation advice, monitoring requirements...">${escapeHtml(rec.remarks || '')}</textarea>
        </div>

        <!-- Research priorities -->
        <div class="form-group">
          <label class="form-label">Research Priorities / Evidence Gaps</label>
          <textarea class="form-textarea rec-field" rows="2" data-pico="${q.id}" data-field="researchGaps"
            placeholder="Identify areas where more research is needed...">${escapeHtml(rec.researchGaps || '')}</textarea>
        </div>
      </div>
    `;
  }

  function attachEvents(container) {
    // Auto-save radios
    container.querySelectorAll('input[type="radio"][data-pico]').forEach(r => {
      r.addEventListener('change', (e) => {
        const picoId = e.target.dataset.pico;
        const field = e.target.dataset.field;
        const current = State.getRecommendation(picoId) || {};
        current[field] = e.target.value;
        State.setRecommendation(picoId, current);
        App.updateSidebar();
      });
    });

    // Auto-save textareas
    container.querySelectorAll('.rec-field').forEach(ta => {
      ta.addEventListener('blur', (e) => {
        const picoId = e.target.dataset.pico;
        const field = e.target.dataset.field;
        const current = State.getRecommendation(picoId) || {};
        current[field] = e.target.value;
        State.setRecommendation(picoId, current);
        App.updateSidebar();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
