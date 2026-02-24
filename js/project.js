// ============================================
// Project Management Module
// Improvements: #17 Empty states, #19 Onboarding cards
// ============================================

const ProjectModule = (() => {

  function render(container) {
    const project = State.get();

    if (!State.hasProject()) {
      container.innerHTML = renderWelcome();
      attachWelcomeEvents(container);
    } else {
      container.innerHTML = renderSettings(project);
      attachSettingsEvents(container);
    }
  }

  function renderWelcome() {
    return `
      <div class="content-header" style="text-align:center; margin-bottom:var(--space-12);">
        <div style="margin-bottom:var(--space-4);">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:80px; height:80px; border-radius:var(--radius-xl);
            background:linear-gradient(135deg, #009ADE, #00A19A); font-size:2rem; color:white; box-shadow:0 8px 30px rgba(0,154,222,0.3); margin-bottom:var(--space-4);">
            G
          </div>
        </div>
        <h1 class="content-title" style="font-size:var(--font-size-4xl);">GRADE-ADOLOPMENT</h1>
        <p class="content-subtitle" style="max-width:600px; margin:0 auto;">
          Develop trustworthy clinical practice guidelines using the GRADE Evidence to Decision framework.
          Adopt, adapt, or create de novo recommendations systematically.
        </p>
      </div>

      <div class="cards-grid">
        <!-- New Project Card -->
        <div class="card onboarding-card card-new" id="card-new-project">
          <div class="card-body">
            <div class="onboarding-card-icon">📋</div>
            <h4 style="margin-bottom:var(--space-2);">New Guideline</h4>
            <p class="text-sm text-muted">Start a new clinical practice guideline project from scratch.</p>
          </div>
        </div>

        <!-- Import Card -->
        <div class="card onboarding-card card-import" id="card-import-project">
          <div class="card-body">
            <div class="onboarding-card-icon">📂</div>
            <h4 style="margin-bottom:var(--space-2);">Import Project</h4>
            <p class="text-sm text-muted">Load a previously exported JSON project file.</p>
          </div>
          <input type="file" accept=".json" id="import-file" style="display:none;">
        </div>

        <!-- Demo Card -->
        <div class="card onboarding-card card-demo" id="card-demo-project">
          <div class="card-body">
            <div class="onboarding-card-icon">🎓</div>
            <h4 style="margin-bottom:var(--space-2);">Demo Project</h4>
            <p class="text-sm text-muted">Explore a pre-filled example based on cervical cancer screening.</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderSettings(project) {
    const m = project.meta;
    return `
      <div class="content-header">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="content-title">Project Settings</h1>
            <p class="content-subtitle">Core project information and metadata.</p>
          </div>
          <div class="flex gap-3">
            <button class="btn btn-danger btn-sm" id="btn-clear-project">🗑️ Delete Project</button>
          </div>
        </div>
      </div>

      <div class="card mb-6">
        <h4 style="margin-bottom:var(--space-4);">General Information</h4>
        <div class="form-group">
          <label class="form-label">Guideline Title <span style="color:var(--color-red-500);">*</span></label>
          <input type="text" class="form-input" id="setting-title" value="${escapeHtml(m.title)}"
            placeholder="e.g., Cervical Cancer Screening Guidelines">
        </div>
        <div class="form-group">
          <label class="form-label">Scope</label>
          <textarea class="form-textarea" id="setting-scope" rows="3"
            placeholder="Define the scope and objectives of this guideline...">${escapeHtml(m.scope)}</textarea>
        </div>
        <div style="display:flex; gap:var(--space-4);">
          <div class="form-group" style="flex:1">
            <label class="form-label">Authors</label>
            <input type="text" class="form-input" id="setting-authors" value="${escapeHtml(m.authors)}"
              placeholder="e.g., Dr. Smith, Dr. Jones">
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Target Population</label>
            <input type="text" class="form-input" id="setting-population" value="${escapeHtml(m.targetPopulation || '')}"
              placeholder="e.g., Women aged 30-65">
          </div>
        </div>
        <div style="display:flex; gap:var(--space-4);">
          <div class="form-group" style="flex:1">
            <label class="form-label">Status</label>
            <select class="form-select" id="setting-status">
              <option value="draft" ${m.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="in_progress" ${m.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="review" ${m.status === 'review' ? 'selected' : ''}>Under Review</option>
              <option value="final" ${m.status === 'final' ? 'selected' : ''}>Final</option>
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Last Modified</label>
            <input type="text" class="form-input" value="${new Date(m.dateModified).toLocaleString()}" readonly
              style="background:var(--color-neutral-50);">
          </div>
        </div>
        <div style="text-align:right;">
          <button class="btn btn-primary" id="btn-save-settings">Save Settings</button>
        </div>
      </div>
    `;
  }

  function attachWelcomeEvents(container) {
    container.querySelector('#card-new-project')?.addEventListener('click', () => {
      State.createNew({ title: 'New Guideline', status: 'draft' });
      App.showToast('Project created!', 'success');
      App.navigate('project');
    });

    container.querySelector('#card-import-project')?.addEventListener('click', () => {
      container.querySelector('#import-file')?.click();
    });

    container.querySelector('#import-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (State.importJSON(ev.target.result)) {
          App.showToast('Project imported successfully!', 'success');
          App.navigate('project');
        } else {
          App.showToast('Invalid project file', 'error');
        }
      };
      reader.readAsText(file);
    });

    container.querySelector('#card-demo-project')?.addEventListener('click', () => {
      loadDemoProject();
      App.showToast('Demo project loaded!', 'success');
      App.navigate('dashboard');
    });
  }

  function attachSettingsEvents(container) {
    container.querySelector('#btn-save-settings')?.addEventListener('click', () => {
      const title = document.getElementById('setting-title').value.trim();

      // Form validation (#15)
      if (!title) {
        document.getElementById('setting-title').classList.add('error');
        App.showToast('Title is required', 'error');
        return;
      }
      document.getElementById('setting-title').classList.remove('error');

      State.updateMeta({
        title,
        scope: document.getElementById('setting-scope').value.trim(),
        authors: document.getElementById('setting-authors').value.trim(),
        targetPopulation: document.getElementById('setting-population').value.trim(),
        status: document.getElementById('setting-status').value
      });
      App.showToast('Settings saved!', 'success');
      App.updateSidebar();
      App.renderPipeline();
    });

    container.querySelector('#btn-clear-project')?.addEventListener('click', async () => {
      const ok = await App.confirmDialog({
        title: 'Delete Project',
        message: 'This will permanently delete all project data including PICO questions, assessments, and recommendations. This cannot be undone.',
        confirmText: 'Delete Everything',
        type: 'danger'
      });
      if (ok) {
        State.clearProject();
        App.showToast('Project deleted', 'info');
        App.navigate('project');
      }
    });
  }

  function loadDemoProject() {
    State.createNew({
      title: 'Cervical Cancer Screening Guideline — National Adaptation',
      scope: 'This guideline aims to adapt WHO cervical cancer screening recommendations for the national context, addressing primary HPV testing vs cytology-based screening in women aged 30-65.',
      authors: 'Guideline Development Group',
      targetPopulation: 'Women aged 30-65 years',
      status: 'in_progress'
    });

    State.addPicoQuestion({
      topic: 'Primary HPV testing vs cytology',
      population: 'Women aged 30-65 years with no previous cervical abnormalities',
      intervention: 'HPV DNA testing as primary screening method',
      comparison: 'Conventional cytology (Pap smear)',
      outcome: 'Detection of CIN2+ lesions, reduction in cervical cancer incidence and mortality',
      priority: 'critical'
    });

    State.addPicoQuestion({
      topic: 'Screening interval after negative HPV test',
      population: 'Women aged 30-65 with a negative HPV test result',
      intervention: 'Extended screening interval (5 years)',
      comparison: 'Standard 3-year interval',
      outcome: 'Safety, detection of interval cancers, cost-effectiveness',
      priority: 'important'
    });

    State.addPicoQuestion({
      topic: 'Self-sampling for HPV testing',
      population: 'Under-screened or hard-to-reach women aged 30-65',
      intervention: 'Self-collected vaginal samples for HPV testing',
      comparison: 'Clinician-collected cervical samples',
      outcome: 'Test accuracy, participation rates, acceptability',
      priority: 'important'
    });

    State.addSourceGuideline({
      title: 'WHO guideline for screening and treatment of cervical pre-cancer lesions for cervical cancer prevention',
      organization: 'World Health Organization',
      year: '2021',
      url: 'https://www.who.int/publications/i/item/9789240030824',
      trustworthiness: 'high',
      currency: 'current',
      notes: 'Comprehensive WHO guideline addressing HPV testing strategies.'
    });

    State.addSourceGuideline({
      title: 'European guidelines for quality assurance in cervical cancer screening',
      organization: 'European Commission',
      year: '2015',
      trustworthiness: 'high',
      currency: 'recent',
      notes: 'Established European framework for organised screening.'
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
