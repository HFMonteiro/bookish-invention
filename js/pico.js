// ============================================
// PICO Question Builder Module
// ============================================

const PicoModule = (() => {

  function render(container) {
    const questions = State.getPicoQuestions();

    container.innerHTML = `
      <div class="content-header">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="content-title">PICO Questions</h1>
            <p class="content-subtitle">Define and prioritize your clinical questions in PICO format (Population, Intervention, Comparison, Outcome).</p>
          </div>
          <button class="btn btn-primary" id="btn-add-pico">+ Add Question</button>
        </div>
      </div>

      ${questions.length > 2 ? `
        <div class="search-bar">
          <span class="search-bar-icon">🔍</span>
          <input type="text" id="pico-search" placeholder="Search questions by topic, population, intervention...">
        </div>` : ''}

      ${questions.length === 0 ? renderEmpty() : renderQuestions(questions)}
    `;

    attachEvents(container);
  }

  function renderEmpty() {
    return `
      <div class="empty-state">
        <div class="empty-state-illustration">🔬</div>
        <div class="empty-state-title">No PICO Questions Yet</div>
        <div class="empty-state-text">
          Start by defining the key clinical questions that your guideline will address.
          Each question should follow the PICO format.
        </div>
        <button class="btn btn-primary" id="btn-add-pico-empty">+ Add Your First Question</button>
      </div>
    `;
  }

  function renderQuestions(questions) {
    return `
      <div class="stagger-children" style="display:flex; flex-direction:column; gap:var(--space-4);">
        ${questions.map((q, idx) => renderPicoCard(q, idx)).join('')}
      </div>
    `;
  }

  function renderPicoCard(q, idx) {
    const priorityBadge = {
      critical: '<span class="badge badge-verylow">Critical</span>',
      important: '<span class="badge badge-moderate">Important</span>',
      not_important: '<span class="badge badge-pending">Not Important</span>'
    };

    const decision = State.getDecision(q.id);
    const decisionBadge = decision && decision.type ?
      `<span class="badge badge-${decision.type}">${decision.type.charAt(0).toUpperCase() + decision.type.slice(1)}</span>` : '';

    return `
      <div class="pico-card" data-pico-id="${q.id}">
        <div class="pico-card-header">
          <div class="flex items-center gap-3">
            <span class="pico-card-id">Q${idx + 1}</span>
            ${q.topic ? `<span class="text-sm" style="font-weight:500;">${escapeHtml(q.topic)}</span>` : ''}
            ${priorityBadge[q.priority] || ''}
            ${decisionBadge}
          </div>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm btn-edit-pico" data-id="${q.id}" title="Edit">✏️</button>
            <button class="btn btn-ghost btn-sm btn-delete-pico" data-id="${q.id}" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="pico-grid">
          <div class="pico-field">
            <div class="pico-field-label">P — Population</div>
            <div class="pico-field-value">${escapeHtml(q.population) || '—'}</div>
          </div>
          <div class="pico-field">
            <div class="pico-field-label">I — Intervention</div>
            <div class="pico-field-value">${escapeHtml(q.intervention) || '—'}</div>
          </div>
          <div class="pico-field">
            <div class="pico-field-label">C — Comparison</div>
            <div class="pico-field-value">${escapeHtml(q.comparison) || '—'}</div>
          </div>
          <div class="pico-field">
            <div class="pico-field-label">O — Outcome</div>
            <div class="pico-field-value">${escapeHtml(q.outcome) || '—'}</div>
          </div>
        </div>
      </div>
    `;
  }

  function attachEvents(container) {
    container.querySelectorAll('#btn-add-pico, #btn-add-pico-empty').forEach(btn => {
      btn.addEventListener('click', () => showPicoModal());
    });

    container.querySelectorAll('.btn-edit-pico').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const pico = State.getPicoById(id);
        if (pico) showPicoModal(pico);
      });
    });

    // Delete with custom confirm (#11)
    container.querySelectorAll('.btn-delete-pico').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const ok = await App.confirmDialog({
          title: 'Delete PICO Question',
          message: 'This will also remove associated EtD assessments, decisions, and recommendations. This cannot be undone.',
          confirmText: 'Delete',
          type: 'danger'
        });
        if (ok) {
          State.deletePicoQuestion(id);
          App.showToast('Question deleted', 'info');
          App.navigate('pico');
        }
      });
    });

    // Search filter (#13)
    const searchInput = container.querySelector('#pico-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        container.querySelectorAll('.pico-card').forEach(card => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(q) ? '' : 'none';
        });
      });
    }
  }

  function showPicoModal(existing = null) {
    const isEdit = !!existing;
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal" style="max-width:640px;">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit' : 'New'} PICO Question</h3>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Topic / Short Title</label>
            <input type="text" class="form-input" id="pico-topic"
              value="${escapeHtml(existing?.topic || '')}"
              placeholder="e.g., Primary screening method">
          </div>
          <div class="form-group">
            <label class="form-label">Population (P)</label>
            <textarea class="form-textarea" id="pico-population" rows="2"
              placeholder="e.g., Women aged 30-49 in low-resource settings">${escapeHtml(existing?.population || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Intervention (I)</label>
            <textarea class="form-textarea" id="pico-intervention" rows="2"
              placeholder="e.g., HPV testing as primary screening">${escapeHtml(existing?.intervention || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Comparison (C)</label>
            <textarea class="form-textarea" id="pico-comparison" rows="2"
              placeholder="e.g., Cytology (Pap smear) as primary screening">${escapeHtml(existing?.comparison || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Outcome (O)</label>
            <textarea class="form-textarea" id="pico-outcome" rows="2"
              placeholder="e.g., Detection of CIN2+ lesions, cancer incidence and mortality">${escapeHtml(existing?.outcome || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <div class="scale-group">
              <div class="scale-option">
                <input type="radio" name="pico-priority" id="prio-critical" value="critical"
                  ${(existing?.priority || '') === 'critical' ? 'checked' : ''}>
                <label for="prio-critical">Critical</label>
              </div>
              <div class="scale-option">
                <input type="radio" name="pico-priority" id="prio-important" value="important"
                  ${(existing?.priority || 'important') === 'important' ? 'checked' : ''}>
                <label for="prio-important">Important</label>
              </div>
              <div class="scale-option">
                <input type="radio" name="pico-priority" id="prio-not" value="not_important"
                  ${(existing?.priority || '') === 'not_important' ? 'checked' : ''}>
                <label for="prio-not">Not Important</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-save">${isEdit ? 'Update' : 'Add'} Question</button>
        </div>
      </div>
    `;
    overlay.classList.add('active');

    overlay.querySelector('#modal-close').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#modal-cancel').onclick = () => overlay.classList.remove('active');
    overlay.querySelector('#modal-save').onclick = () => {
      const data = {
        topic: document.getElementById('pico-topic').value.trim(),
        population: document.getElementById('pico-population').value.trim(),
        intervention: document.getElementById('pico-intervention').value.trim(),
        comparison: document.getElementById('pico-comparison').value.trim(),
        outcome: document.getElementById('pico-outcome').value.trim(),
        priority: document.querySelector('input[name="pico-priority"]:checked')?.value || 'important'
      };

      if (!data.population && !data.intervention) {
        App.showToast('Please fill in at least Population and Intervention', 'error');
        return;
      }

      if (isEdit) {
        State.updatePicoQuestion(existing.id, data);
        App.showToast('Question updated!', 'success');
      } else {
        State.addPicoQuestion(data);
        App.showToast('Question added!', 'success');
      }

      overlay.classList.remove('active');
      App.navigate('pico');
      App.updateSidebar();
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
