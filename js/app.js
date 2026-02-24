// ============================================
// App — Main Application Router & Init
// Improvements: #1 Pipeline, #2 Dark Mode, #3 Auto-save,
// #4 Page Transitions, #5 Keyboard Shortcuts, #6-10 Sidebar,
// #11 Confirm Dialog, #14 Help Panel, #20 Milestones
// ============================================

const App = (() => {
    const modules = {
        dashboard: { module: () => DashboardModule, label: 'Dashboard', icon: '📊', section: 'overview' },
        project: { module: () => ProjectModule, label: 'Project Settings', icon: '📋', section: 'setup', step: 1 },
        pico: { module: () => PicoModule, label: 'PICO Questions', icon: '🔬', section: 'setup', step: 2 },
        sources: { module: () => SourceEvalModule, label: 'Source Guidelines', icon: '📚', section: 'setup', step: 3 },
        etd: { module: () => EtdModule, label: 'EtD Framework', icon: '⚖️', section: 'assess', step: 4 },
        decision: { module: () => DecisionModule, label: 'ADOLOPMENT Decision', icon: '🎯', section: 'assess', step: 5 },
        recommendation: { module: () => RecommendationModule, label: 'Recommendations', icon: '📝', section: 'finalize', step: 6 },
        export: { module: () => ExportModule, label: 'Export & Report', icon: '📤', section: 'finalize' }
    };

    // Pipeline step order (only numbered steps)
    const pipelineSteps = [
        { key: 'project', label: 'Project', shortLabel: 'Setup', stepNum: 1 },
        { key: 'pico', label: 'PICO Questions', shortLabel: 'PICO', stepNum: 2 },
        { key: 'sources', label: 'Source Guidelines', shortLabel: 'Sources', stepNum: 3 },
        { key: 'etd', label: 'EtD Framework', shortLabel: 'EtD', stepNum: 4 },
        { key: 'decision', label: 'ADOLOPMENT Decision', shortLabel: 'Decision', stepNum: 5 },
        { key: 'recommendation', label: 'Recommendations', shortLabel: 'Recs', stepNum: 6 }
    ];

    let currentView = 'dashboard';
    let lastSaveTime = null;
    let previousMilestones = {};

    function init() {
        State.load();
        buildSidebar();
        updateSidebar();
        initTheme();          // #2 Dark mode
        initKeyboardShortcuts(); // #5
        initAutoSave();        // #3
        captureMilestoneBaseline();

        // Initialize RAG knowledge base for help panel
        if (typeof RAG !== 'undefined') {
            RAG.init().then(() => {
                const helpBody = document.getElementById('help-panel-body');
                if (helpBody) RAG.renderPanel(helpBody);
            });
        }

        // Listen for state changes to update pipeline/sidebar
        State.on('change', () => {
            updateSidebar();
            renderPipeline();
            updateAutoSaveTime();
            checkMilestones();
        });

        // Hash-based routing
        window.addEventListener('hashchange', () => {
            const hash = location.hash.replace('#', '') || 'dashboard';
            navigate(hash, false);
        });

        const initHash = location.hash.replace('#', '') || (State.hasProject() ? 'dashboard' : 'project');
        navigate(initHash, false);
    }

    // ============================================
    // Sidebar (#6-10)
    // ============================================
    function buildSidebar() {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        const sections = {
            overview: 'Overview',
            setup: 'Setup',
            assess: 'Assessment',
            finalize: 'Finalize'
        };

        let html = '';
        Object.entries(sections).forEach(([sectionKey, sectionLabel]) => {
            html += `<div class="nav-section-label">${sectionLabel}</div>`;
            Object.entries(modules).forEach(([key, mod]) => {
                if (mod.section === sectionKey) {
                    html += `
            <button class="nav-item" data-view="${key}" id="nav-${key}">
              <span class="nav-item-step">${mod.step || mod.icon}</span>
              <span class="nav-item-label">${mod.label}</span>
              ${mod.step ? `<div class="nav-item-progress"><div class="nav-item-progress-fill" id="nav-progress-${key}" style="width:0%"></div></div>` : ''}
            </button>
          `;
                }
            });
        });
        nav.innerHTML = html;

        // Attach nav click events
        nav.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                navigate(btn.dataset.view);
            });
        });
    }

    // ============================================
    // Navigation with Page Transition (#4)
    // ============================================
    function navigate(view, pushHash = true) {
        if (!modules[view]) view = 'dashboard';
        currentView = view;

        if (pushHash) {
            location.hash = view;
        }

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update topbar
        const topTitle = document.getElementById('topbar-title');
        if (topTitle) topTitle.textContent = modules[view].label;

        const breadcrumb = document.getElementById('topbar-breadcrumb');
        if (breadcrumb) {
            const project = State.get();
            breadcrumb.textContent = project?.meta?.title || 'GRADE-ADOLOPMENT';
        }

        // Update pipeline
        renderPipeline();

        // Refresh RAG context tips for current step
        if (typeof RAG !== 'undefined') {
            const helpBody = document.getElementById('help-panel-body');
            if (helpBody && helpBody.querySelector('.rag-panel')) {
                RAG.renderPanel(helpBody);
            }
        }

        // Page transition (#4)
        const container = document.getElementById('main-content');
        if (container) {
            container.classList.add('page-exit');
            setTimeout(() => {
                container.classList.remove('page-exit');
                container.innerHTML = '<div class="module-view active page-enter"><div class="content"></div></div>';
                const contentEl = container.querySelector('.content');
                const modConfig = modules[view];
                const modInstance = modConfig.module();
                modInstance.render(contentEl);
            }, 120);
        }
    }

    // ============================================
    // Pipeline Stepper (#1)
    // ============================================
    function renderPipeline() {
        const el = document.getElementById('pipeline');
        if (!el) return;

        if (!State.hasProject()) {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'flex';

        const progress = State.getProgress();
        let html = '';

        pipelineSteps.forEach((step, i) => {
            const pct = progress.steps[step.key] || 0;
            const isActive = currentView === step.key;
            const isCompleted = pct === 100;

            let cls = 'pipeline-step';
            if (isActive) cls += ' active';
            if (isCompleted) cls += ' completed';

            html += `
        <div class="${cls}" data-view="${step.key}" onclick="App.navigate('${step.key}')">
          <div class="pipeline-node">
            <div class="pipeline-node-number">${isCompleted ? '✓' : step.stepNum}</div>
            <span>${step.shortLabel}</span>
          </div>
        </div>
      `;

            // Connector between steps
            if (i < pipelineSteps.length - 1) {
                let connCls = 'pipeline-connector';
                if (isCompleted) connCls += ' completed';
                else if (isActive) connCls += ' active';
                html += `<div class="${connCls}"></div>`;
            }
        });

        el.innerHTML = html;
    }

    // ============================================
    // Sidebar Update (#6)
    // ============================================
    function updateSidebar() {
        const progress = State.getProgress();

        // Overall progress
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = progress.overall + '%';
        const pctLabel = document.getElementById('progress-pct');
        if (pctLabel) pctLabel.textContent = progress.overall + '%';

        // Per-step progress (#6)
        const stepMap = { project: 'project', pico: 'pico', sources: 'sources', etd: 'etd', decision: 'decision', recommendation: 'recommendation' };
        Object.entries(stepMap).forEach(([key, stepKey]) => {
            const navItem = document.getElementById(`nav-${key}`);
            if (navItem) {
                const pct = progress.steps[stepKey] || 0;
                navItem.classList.toggle('completed', pct === 100);
            }
            // Mini progress bar
            const progressFill = document.getElementById(`nav-progress-${key}`);
            if (progressFill) {
                const pct = progress.steps[stepKey] || 0;
                progressFill.style.width = pct + '%';
                progressFill.classList.toggle('complete', pct === 100);
            }
        });

        // Project name
        const projectName = document.getElementById('sidebar-project-name');
        if (projectName) {
            const project = State.get();
            projectName.textContent = project?.meta?.title || 'No project';
        }
    }

    // ============================================
    // Dark Mode (#2)
    // ============================================
    function initTheme() {
        const saved = localStorage.getItem('grade_theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeIcon(saved);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('grade_theme', next);
        updateThemeIcon(next);
    }

    function updateThemeIcon(theme) {
        const btn = document.getElementById('btn-theme');
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // ============================================
    // Auto-save Indicator (#3)
    // ============================================
    function initAutoSave() {
        updateAutoSaveTime();
    }

    function updateAutoSaveTime() {
        lastSaveTime = new Date();
        const el = document.getElementById('autosave-time');
        if (el) {
            el.textContent = 'Saved ' + lastSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        const dot = document.getElementById('autosave-dot');
        if (dot) {
            dot.classList.add('saving');
            setTimeout(() => dot.classList.remove('saving'), 600);
        }
    }

    // ============================================
    // Keyboard Shortcuts (#5)
    // ============================================
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S / Cmd+S — Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                State.save();
                showToast('Project saved!', 'success');
            }
            // Escape — Close modal or help panel
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal-overlay');
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
                const helpPanel = document.getElementById('help-panel');
                if (helpPanel && helpPanel.classList.contains('open')) {
                    helpPanel.classList.remove('open');
                }
            }
            // ? — Toggle help panel
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
                toggleHelpPanel();
            }
        });
    }

    // ============================================
    // Help Panel (#14)
    // ============================================
    function toggleHelpPanel() {
        const panel = document.getElementById('help-panel');
        if (panel) panel.classList.toggle('open');
    }

    function getHelpContent() {
        return `
      <div class="help-section">
        <h4>What is GRADE-ADOLOPMENT?</h4>
        <p>GRADE-ADOLOPMENT is a methodology for developing clinical practice guidelines that combines three strategies:</p>
        <ul>
          <li><strong>Adoption</strong> — Accept an existing recommendation as-is</li>
          <li><strong>Adaptation</strong> — Modify for local context</li>
          <li><strong>De Novo</strong> — Develop new recommendation from scratch</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>Workflow</h4>
        <p>Follow the 6-step pipeline:</p>
        <ul>
          <li><strong>Step 1:</strong> Define project scope and metadata</li>
          <li><strong>Step 2:</strong> Build PICO questions</li>
          <li><strong>Step 3:</strong> Register and evaluate source guidelines</li>
          <li><strong>Step 4:</strong> Complete EtD framework assessment (9 domains)</li>
          <li><strong>Step 5:</strong> Make adopt/adapt/de novo decisions</li>
          <li><strong>Step 6:</strong> Formulate final recommendations</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>Evidence to Decision Domains</h4>
        <p>The 9 EtD domains are:</p>
        <ul>
          <li>Priority of the problem</li>
          <li>Certainty of evidence</li>
          <li>Balance of benefits and harms</li>
          <li>Values and preferences</li>
          <li>Resource requirements</li>
          <li>Cost-effectiveness</li>
          <li>Health equity</li>
          <li>Acceptability</li>
          <li>Feasibility</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>Keyboard Shortcuts</h4>
        <ul>
          <li><strong>Ctrl+S</strong> — Save project</li>
          <li><strong>Escape</strong> — Close modal/panel</li>
          <li><strong>?</strong> — Toggle this help panel</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>References</h4>
        <p>Schünemann HJ et al. <em>GRADE Evidence to Decision (EtD) frameworks for adoption, adaptation, and de novo development of trustworthy recommendations.</em> J Clin Epidemiol. 2017;81:101-110.</p>
        <p>WHO Handbook for Guideline Development, 2nd Edition, 2014.</p>
      </div>
    `;
    }

    // ============================================
    // Custom Confirm Dialog (#11)
    // ============================================
    function confirmDialog({ title, message, confirmText = 'Delete', cancelText = 'Cancel', type = 'danger' }) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('modal-overlay');
            overlay.innerHTML = `
        <div class="modal" style="max-width:400px;">
          <div class="confirm-dialog">
            <div class="confirm-dialog-icon ${type}">
              ${type === 'danger' ? '🗑️' : '⚠️'}
            </div>
            <div class="confirm-dialog-title">${title}</div>
            <div class="confirm-dialog-text">${message}</div>
            <div class="confirm-dialog-actions">
              <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
              <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${confirmText}</button>
            </div>
          </div>
        </div>
      `;
            overlay.classList.add('active');
            overlay.querySelector('#confirm-cancel').onclick = () => { overlay.classList.remove('active'); resolve(false); };
            overlay.querySelector('#confirm-ok').onclick = () => { overlay.classList.remove('active'); resolve(true); };
        });
    }

    // ============================================
    // Milestone Celebrations (#20)
    // ============================================
    function captureMilestoneBaseline() {
        if (!State.hasProject()) {
            previousMilestones = {};
            return;
        }
        const p = State.getProgress();
        previousMilestones = { ...p.steps };
    }

    function checkMilestones() {
        if (!State.hasProject()) return;
        const p = State.getProgress();
        const labels = {
            project: 'Project Setup',
            pico: 'PICO Questions',
            sources: 'Source Guidelines',
            etd: 'EtD Assessment',
            decision: 'ADOLOPMENT Decisions',
            recommendation: 'Recommendations'
        };

        Object.entries(p.steps).forEach(([key, pct]) => {
            if (pct === 100 && (previousMilestones[key] || 0) < 100) {
                showCelebration(`${labels[key] || key} complete!`);
            }
        });

        if (p.overall === 100 && Object.values(previousMilestones).some(v => v < 100)) {
            setTimeout(() => showCelebration('🎉 Guideline fully completed!'), 800);
        }

        previousMilestones = { ...p.steps };
    }

    function showCelebration(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast toast-celebration';
        toast.innerHTML = `
      <span class="celebration-emoji">🎉</span>
      <span>${message}</span>
    `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ============================================
    // Toast Notification
    // ============================================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span>${message}</span>
    `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    return { init, navigate, updateSidebar, showToast, toggleTheme, toggleHelpPanel, confirmDialog, renderPipeline };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
