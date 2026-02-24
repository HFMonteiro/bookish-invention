// ============================================
// Dashboard & Progress Module
// Improvements: #12 EtD Heatmap, #17 Better empty states
// ============================================

const DashboardModule = (() => {

  // EtD domain short labels for the heatmap
  const domainLabels = [
    'Priority', 'Certainty', 'Benefits', 'Values',
    'Resources', 'Cost-eff', 'Equity', 'Accept', 'Feasibility'
  ];

  const domainIds = [
    'priority', 'certainty', 'benefits_harms',
    'values', 'resources', 'cost_effectiveness',
    'equity', 'acceptability', 'feasibility'
  ];

  function render(container) {
    const project = State.get();

    if (!State.hasProject()) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-illustration">📊</div>
          <div class="empty-state-title">No Active Project</div>
          <div class="empty-state-text">Create or import a project to see the dashboard.</div>
          <button class="btn btn-primary" onclick="App.navigate('project')">Get Started</button>
        </div>
      `;
      return;
    }

    const progress = State.getProgress();
    const questions = State.getPicoQuestions();
    const sources = State.getSourceGuidelines();
    const decisions = project.decisions || {};

    // Count decision types
    const adoptCount = Object.values(decisions).filter(d => d.type === 'adopt').length;
    const adaptCount = Object.values(decisions).filter(d => d.type === 'adapt').length;
    const denovoCount = Object.values(decisions).filter(d => d.type === 'denovo').length;

    // Count recommendations
    const recCount = Object.values(project.recommendations || {}).filter(r => r.text).length;

    container.innerHTML = `
      <div class="content-header">
        <h1 class="content-title">Dashboard</h1>
        <p class="content-subtitle">Overview of your GRADE-ADOLOPMENT guideline development progress.</p>
      </div>

      <!-- Overall Progress Ring -->
      <div class="card mb-6" style="text-align:center; padding:var(--space-8);">
        <div style="display:inline-block; position:relative; margin-bottom:var(--space-4);">
          <svg width="120" height="120" class="progress-ring-circle">
            <circle class="progress-ring-bg" cx="60" cy="60" r="52" stroke-width="8"/>
            <circle class="progress-ring-fill" cx="60" cy="60" r="52" stroke-width="8"
              stroke-dasharray="${2 * Math.PI * 52}"
              stroke-dashoffset="${2 * Math.PI * 52 * (1 - progress.overall / 100)}" />
          </svg>
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column;">
            <span style="font-size:var(--font-size-3xl); font-weight:var(--font-weight-extrabold); color:var(--color-primary-500);">${progress.overall}%</span>
            <span class="text-sm text-muted">Overall</span>
          </div>
        </div>
        <h3>Guideline Progress</h3>
        <p class="text-sm text-muted">${escapeHtml(project.meta.title)}</p>
      </div>

      <!-- Stats Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:var(--space-4); margin-bottom:var(--space-6);">
        <div class="stat-card hover-lift">
          <div class="stat-card-value">${questions.length}</div>
          <div class="stat-card-label">PICO Questions</div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-value">${sources.length}</div>
          <div class="stat-card-label">Source Guidelines</div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-value" style="color:var(--color-green-500);">${adoptCount}</div>
          <div class="stat-card-label">Adopted</div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-value" style="color:var(--color-amber-500);">${adaptCount}</div>
          <div class="stat-card-label">Adapted</div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-value" style="color:var(--color-primary-500);">${denovoCount}</div>
          <div class="stat-card-label">De Novo</div>
        </div>
        <div class="stat-card hover-lift">
          <div class="stat-card-value">${recCount}</div>
          <div class="stat-card-label">Recommendations</div>
        </div>
      </div>

      <!-- Step Progress -->
      <div class="card mb-6">
        <h4 style="margin-bottom:var(--space-4);">Workflow Progress</h4>
        ${renderStepProgress(progress.steps)}
      </div>

      <!-- EtD Heatmap (#12) -->
      ${questions.length > 0 ? renderEtdHeatmap(questions) : ''}

      <!-- Questions Summary Table -->
      ${questions.length > 0 ? renderQuestionsTable(questions) : ''}

      <!-- Project Timeline -->
      <div class="card mb-6">
        <h4 style="margin-bottom:var(--space-4);">Project Timeline</h4>
        <div id="timeline-viz"></div>
      </div>
    `;

    // Render timeline AFTER DOM is built
    const timelineViz = document.getElementById('timeline-viz');
    if (timelineViz && typeof Timeline !== 'undefined') Timeline.render(timelineViz);
  }

  function renderStepProgress(steps) {
    const stepLabels = {
      project: { label: 'Project Setup', icon: '📋' },
      pico: { label: 'PICO Questions', icon: '🔬' },
      sources: { label: 'Source Guidelines', icon: '📚' },
      etd: { label: 'EtD Assessment', icon: '📊' },
      decision: { label: 'ADOLOPMENT Decision', icon: '⚖️' },
      recommendation: { label: 'Recommendations', icon: '📝' }
    };

    return Object.entries(stepLabels).map(([key, info]) => {
      const pct = steps[key] || 0;
      return `
        <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-3); cursor:pointer;" onclick="App.navigate('${key}')">
          <span style="width:24px; text-align:center;">${info.icon}</span>
          <span class="text-sm" style="width:160px;">${info.label}</span>
          <div style="flex:1; height:6px; background:var(--color-neutral-200); border-radius:var(--radius-pill);">
            <div style="width:${pct}%; height:100%; background:${pct === 100 ? 'var(--color-green-500)' : 'linear-gradient(90deg,var(--color-primary-500),var(--color-teal-500))'}; border-radius:var(--radius-pill); transition:width 0.5s;"></div>
          </div>
          <span class="text-sm text-muted" style="width:40px; text-align:right;">${pct}%</span>
        </div>
      `;
    }).join('');
  }

  // EtD Heatmap (#12)
  function renderEtdHeatmap(questions) {
    let rows = '';
    questions.forEach((q, i) => {
      const assessments = State.getEtdAssessments(q.id);
      let cells = '';
      domainIds.forEach((domainId, j) => {
        const a = assessments[domainId];
        const judgment = a?.judgment || '';
        const shortJ = judgment.replace(/_/g, ' ').substring(0, 8);
        cells += `<div class="etd-heatmap-cell ${judgment ? '' : 'empty'}" data-judgment="${judgment}" title="${domainLabels[j]}: ${judgment || 'Not assessed'}">${judgment ? shortJ : '—'}</div>`;
      });
      rows += `
        <div style="display:contents;">
          <div style="font-size:var(--font-size-xs); font-weight:var(--font-weight-semibold); display:flex; align-items:center; padding-right:var(--space-2); white-space:nowrap;">Q${i + 1}</div>
          ${cells}
        </div>
      `;
    });

    // Header row
    let headerCells = '<div></div>'; // empty for Q column
    domainLabels.forEach(label => {
      headerCells += `<div style="font-size:9px; text-align:center; color:var(--color-text-muted); font-weight:var(--font-weight-semibold); overflow:hidden; text-overflow:ellipsis;">${label}</div>`;
    });

    return `
      <div class="card mb-6">
        <h4 style="margin-bottom:var(--space-2);">EtD Assessment Heatmap</h4>
        <p class="text-sm text-muted" style="margin-bottom:var(--space-4);">Visual overview of judgments across all PICO questions and EtD domains.</p>
        <div class="etd-heatmap" style="grid-template-columns: 30px repeat(9, 1fr);">
          ${headerCells}
          ${rows}
        </div>
        <div style="display:flex; gap:var(--space-4); margin-top:var(--space-4); flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:var(--space-2); font-size:var(--font-size-xs); color:var(--color-text-muted);">
            <div style="width:12px; height:12px; border-radius:2px; background:var(--color-green-100);"></div> Favorable
          </div>
          <div style="display:flex; align-items:center; gap:var(--space-2); font-size:var(--font-size-xs); color:var(--color-text-muted);">
            <div style="width:12px; height:12px; border-radius:2px; background:var(--color-amber-100);"></div> Uncertain
          </div>
          <div style="display:flex; align-items:center; gap:var(--space-2); font-size:var(--font-size-xs); color:var(--color-text-muted);">
            <div style="width:12px; height:12px; border-radius:2px; background:var(--color-red-100);"></div> Unfavorable
          </div>
          <div style="display:flex; align-items:center; gap:var(--space-2); font-size:var(--font-size-xs); color:var(--color-text-muted);">
            <div style="width:12px; height:12px; border-radius:2px; background:var(--color-neutral-100);"></div> Not assessed
          </div>
        </div>
      </div>
    `;
  }

  function renderQuestionsTable(questions) {
    return `
      <div class="card">
        <h4 style="margin-bottom:var(--space-4);">PICO Questions Summary</h4>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Topic</th>
                <th>Priority</th>
                <th>EtD Progress</th>
                <th>Decision</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              ${questions.map((q, i) => {
      const etdAssessments = State.getEtdAssessments(q.id);
      const etdDone = Object.keys(etdAssessments).filter(k => etdAssessments[k]?.judgment).length;
      const dec = State.getDecision(q.id);
      const rec = State.getRecommendation(q.id);
      return `
                  <tr style="cursor:pointer;" onclick="App.navigate('pico')">
                    <td><strong>Q${i + 1}</strong></td>
                    <td>${escapeHtml(q.topic || q.population?.substring(0, 40))}</td>
                    <td><span class="badge badge-${q.priority === 'critical' ? 'verylow' : q.priority === 'important' ? 'moderate' : 'pending'}">${q.priority}</span></td>
                    <td>
                      <div style="display:flex; align-items:center; gap:var(--space-2);">
                        <div style="flex:1; height:4px; background:var(--color-neutral-200); border-radius:var(--radius-pill);">
                          <div style="width:${Math.round((etdDone / 9) * 100)}%; height:100%; background:var(--color-primary-500); border-radius:var(--radius-pill);"></div>
                        </div>
                        <span class="text-sm text-muted">${etdDone}/9</span>
                      </div>
                    </td>
                    <td>${dec?.type ? `<span class="badge badge-${dec.type}">${dec.type}</span>` : '<span class="badge badge-pending">Pending</span>'}</td>
                    <td>${rec?.text ? '<span class="badge badge-high">Done</span>' : '<span class="badge badge-pending">Pending</span>'}</td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDecisionBadge(type) {
    const map = { adopt: 'badge-high', adapt: 'badge-moderate', denovo: 'badge-pending' };
    const label = type ? (type.charAt(0).toUpperCase() + type.slice(1)) : 'Pending';
    return `<span class="badge ${map[type] || 'badge-pending'}">${label}</span>`;
  }

  function renderDirectionBadge(dir) {
    const map = { favors_intervention: 'badge-high', favors_comparison: 'badge-verylow', no_difference: 'badge-moderate' };
    const labels = { favors_intervention: 'For', favors_comparison: 'Against', no_difference: 'Neutral' };
    return `<span class="badge ${map[dir] || 'badge-pending'}">${labels[dir] || 'Pending'}</span>`;
  }

  function renderStrengthBadge(s) {
    const map = { strong: 'badge-high', conditional: 'badge-moderate' };
    const label = s ? (s.charAt(0).toUpperCase() + s.slice(1)) : 'Pending';
    return `<span class="badge ${map[s] || 'badge-pending'}">${label}</span>`;
  }

  function renderCertaintyBadge(c) {
    const map = { high: 'badge-high', moderate: 'badge-moderate', low: 'badge-verylow', very_low: 'badge-verylow' };
    const label = c ? (c.replace('_', ' ').charAt(0).toUpperCase() + c.replace('_', ' ').slice(1)) : 'Pending';
    return `<span class="badge ${map[c] || 'badge-pending'}">${label}</span>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
