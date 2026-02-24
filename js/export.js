// ============================================
// Export & Report Generation Module
// ============================================

const ExportModule = (() => {

  function render(container) {
    if (!State.hasProject()) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-illustration">📤</div>
          <div class="empty-state-title">No Project to Export</div>
          <div class="empty-state-text">Create a project first.</div>
          <button class="btn btn-primary" onclick="App.navigate('project')">Get Started</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="content-header">
        <h1 class="content-title">Export & Report</h1>
        <p class="content-subtitle">Generate reports and export your guideline data.</p>
      </div>

      <div class="cards-grid">
        <div class="card hover-lift">
          <div class="card-body">
            <div style="font-size:2rem; margin-bottom:var(--space-3);">📄</div>
            <h4 style="margin-bottom:var(--space-2);">Markdown Report</h4>
            <p class="text-sm text-muted mb-4">Full guideline report with all recommendations, EtD summaries, and decisions.</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-primary" id="btn-export-md">Generate Report</button>
          </div>
        </div>

        <div class="card hover-lift">
          <div class="card-body">
            <div style="font-size:2rem; margin-bottom:var(--space-3);">💾</div>
            <h4 style="margin-bottom:var(--space-2);">JSON Data</h4>
            <p class="text-sm text-muted mb-4">Export all project data as JSON for backup or sharing.</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-secondary" id="btn-export-json">Download JSON</button>
          </div>
        </div>

        <div class="card hover-lift">
          <div class="card-body">
            <div style="font-size:2rem; margin-bottom:var(--space-3);">🖨️</div>
            <h4 style="margin-bottom:var(--space-2);">Print View</h4>
            <p class="text-sm text-muted mb-4">Open a print-friendly version of the full report.</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-secondary" id="btn-export-print">Print Report</button>
          </div>
        </div>
      </div>

      <!-- Report Preview -->
      <div id="report-preview" style="display:none; margin-top:var(--space-8);">
        <div class="flex items-center justify-between mb-4">
          <h3>Report Preview</h3>
          <button class="btn btn-ghost" id="btn-copy-report">📋 Copy to Clipboard</button>
        </div>
        <div class="card" style="max-height:600px; overflow-y:auto;">
          <pre id="report-content" style="white-space:pre-wrap; font-size:var(--font-size-sm); line-height:1.6;"></pre>
        </div>
      </div>
    `;

    attachEvents(container);
  }

  function attachEvents(container) {
    container.querySelector('#btn-export-md')?.addEventListener('click', () => {
      const md = generateMarkdownReport();
      const preview = container.querySelector('#report-preview');
      const content = container.querySelector('#report-content');
      content.textContent = md;
      preview.style.display = 'block';
      preview.scrollIntoView({ behavior: 'smooth' });

      // Also download
      downloadFile(md, getFileName('md'), 'text/markdown');
      App.showToast('Report generated!', 'success');
    });

    container.querySelector('#btn-export-json')?.addEventListener('click', () => {
      const json = State.exportJSON();
      downloadFile(json, getFileName('json'), 'application/json');
      App.showToast('JSON exported!', 'success');
    });

    container.querySelector('#btn-export-print')?.addEventListener('click', () => {
      openPrintView();
    });

    container.querySelector('#btn-copy-report')?.addEventListener('click', () => {
      const content = container.querySelector('#report-content').textContent;
      navigator.clipboard.writeText(content).then(() => {
        App.showToast('Copied to clipboard!', 'success');
      });
    });
  }

  function generateMarkdownReport() {
    const project = State.get();
    const m = project.meta;
    const questions = State.getPicoQuestions();
    const sources = State.getSourceGuidelines();

    let md = '';

    // Title
    md += `# ${m.title}\n\n`;
    md += `**Status:** ${m.status}  \n`;
    md += `**Authors:** ${m.authors || 'N/A'}  \n`;
    md += `**Date:** ${new Date(m.dateModified).toLocaleDateString()}  \n`;
    md += `**Target Population:** ${m.targetPopulation || 'N/A'}  \n\n`;

    // Scope
    if (m.scope) {
      md += `## Scope\n\n${m.scope}\n\n`;
    }

    md += `---\n\n`;

    // Methodology
    md += `## Methodology\n\n`;
    md += `This guideline was developed using the **GRADE-ADOLOPMENT** methodology `;
    md += `(Schünemann HJ et al., J Clin Epidemiol 2017;81:101-110), which combines `;
    md += `adoption, adaptation, and de novo development of recommendations using the `;
    md += `GRADE Evidence to Decision (EtD) framework.\n\n`;

    // Source Guidelines
    if (sources.length > 0) {
      md += `## Source Guidelines\n\n`;
      sources.forEach((s, i) => {
        md += `${i + 1}. **${s.title}** — ${s.organization || ''} (${s.year || 'n.d.'})`;
        if (s.trustworthiness) md += ` [Trustworthiness: ${s.trustworthiness}]`;
        md += `\n`;
      });
      md += `\n`;
    }

    // PICO Questions & Recommendations
    md += `## Recommendations\n\n`;

    questions.forEach((q, i) => {
      const decision = State.getDecision(q.id);
      const rec = State.getRecommendation(q.id);
      const assessments = State.getEtdAssessments(q.id);

      md += `### Q${i + 1}: ${q.topic || 'PICO Question'}\n\n`;
      md += `| Component | Description |\n|-----------|-------------|\n`;
      md += `| Population | ${q.population || '—'} |\n`;
      md += `| Intervention | ${q.intervention || '—'} |\n`;
      md += `| Comparison | ${q.comparison || '—'} |\n`;
      md += `| Outcome | ${q.outcome || '—'} |\n`;
      md += `| Priority | ${q.priority || '—'} |\n\n`;

      // Decision
      if (decision?.type) {
        md += `**ADOLOPMENT Decision:** ${decision.type.toUpperCase()}\n\n`;
        if (decision.justification) {
          md += `*Justification:* ${decision.justification}\n\n`;
        }
      }

      // Recommendation
      if (rec?.text) {
        md += `**Recommendation:**\n> ${rec.text}\n\n`;

        if (rec.strength) {
          const strengthLabels = {
            strong_for: 'Strong recommendation FOR the intervention',
            conditional_for: 'Conditional recommendation FOR the intervention',
            conditional_against: 'Conditional recommendation AGAINST the intervention',
            strong_against: 'Strong recommendation AGAINST the intervention'
          };
          md += `- **Strength:** ${strengthLabels[rec.strength] || rec.strength}\n`;
        }
        if (rec.certainty) {
          md += `- **Certainty of evidence:** ${rec.certainty.replace(/_/g, ' ').toUpperCase()}\n`;
        }
        md += `\n`;
        if (rec.remarks) {
          md += `**Remarks:** ${rec.remarks}\n\n`;
        }
        if (rec.researchGaps) {
          md += `**Research Gaps:** ${rec.researchGaps}\n\n`;
        }
      }

      // EtD Summary
      if (Object.keys(assessments).length > 0) {
        md += `**EtD Framework Summary:**\n\n`;
        md += `| Domain | Judgment | Justification |\n|--------|----------|---------------|\n`;
        const domainNames = {
          priority: 'Priority of the Problem', certainty: 'Certainty of Evidence', benefits_harms: 'Balance of Benefits and Harms',
          values: 'Values and Preferences', resources: 'Resource Requirements', cost_effectiveness: 'Cost-Effectiveness',
          equity: 'Equity, Equality, and Non-Discrimination', acceptability: 'Acceptability', feasibility: 'Feasibility'
        };
        Object.entries(assessments).forEach(([domainId, data]) => {
          if (data.judgment) {
            md += `| ${domainNames[domainId] || domainId} | ${data.judgment.replace(/_/g, ' ')} | ${(data.justification || '—').substring(0, 80)} |\n`;
          }
        });
        md += `\n`;
      }

      md += `---\n\n`;
    });

    // Footer
    md += `\n*Generated by GRADE-ADOLOPMENT App on ${new Date().toLocaleDateString()}*\n`;

    return md;
  }

  function openPrintView() {
    const md = generateMarkdownReport();
    const html = markdownToHtml(md);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Guideline Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; line-height: 1.6; color: #1E293B; }
          h1 { color: #009ADE; border-bottom: 2px solid #009ADE; padding-bottom: 0.5rem; }
          h2 { color: #005c85; margin-top: 2rem; }
          h3 { color: #007bb2; }
          table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
          th, td { border: 1px solid #E2E8F0; padding: 8px 12px; text-align: left; font-size: 14px; }
          th { background: #F1F5F9; font-weight: 600; }
          blockquote { border-left: 4px solid #009ADE; margin: 1rem 0; padding: 0.5rem 1rem; background: #e6f4fb; }
          hr { border: none; border-top: 1px solid #E2E8F0; margin: 2rem 0; }
          @media print { body { margin: 0; padding: 1cm; } }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  function markdownToHtml(md) {
    return md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^---$/gm, '<hr>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\|(.+)\|\n\|[-| ]+\|\n/g, (match, headerRow) => {
        const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
        return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
      })
      .replace(/\|(.+)\|/g, (match, row) => {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
      })
      .replace(/(<\/tr>\n?)(?=\n(?!<tr>|\|))/g, '$1</tbody></table>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }

  function getFileName(ext) {
    const project = State.get();
    const name = (project?.meta?.title || 'guideline').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    return `${name}_${new Date().toISOString().split('T')[0]}.${ext}`;
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { render };
})();
