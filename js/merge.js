// ============================================
// Team Merge — Guideline Conflict Resolution
// ============================================

const TeamMerge = (() => {
    let currentConflicts = [];
    let incomingProjectRef = null;

    /**
     * Shows the merge UI for a given project data
     */
    function show(incomingProject) {
        const localProject = State.get();
        if (!localProject) return;
        incomingProjectRef = incomingProject;

        const overlay = document.getElementById('modal-overlay');
        currentConflicts = detectConflicts(localProject, incomingProject);

        const modal = document.createElement('div');
        modal.className = 'modal modal-lg';
        modal.id = 'merge-modal';

        renderMergeContent(modal);

        document.body.appendChild(modal);
        overlay.classList.add('active');
        modal.classList.add('active');
    }

    function renderMergeContent(container) {
        container.innerHTML = `
            <div class="modal-header">
                <div class="modal-title">Merge Team Member's Work</div>
                <button class="modal-close" onclick="TeamMerge.close()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info mb-6">
                    Showing differences between <strong>Local Project</strong> and <strong>Imported File</strong>.
                    Select which judgments to keep.
                </div>

                <div class="merge-grid">
                    ${currentConflicts.length === 0
                ? '<div class="text-center py-8 text-muted">No conflicts detected. Everything matches!</div>'
                : currentConflicts.map((c, i) => `
                        <div class="merge-card" data-idx="${i}">
                            <div class="merge-target text-xs text-muted mb-2">${c.scope} · ${c.field}</div>
                            <div class="merge-conflict-grid">
                                <div class="merge-option ${c.choice === 'local' ? 'active' : ''}" onclick="TeamMerge.resolve(${i}, 'local')">
                                    <div class="text-xs uppercase font-bold text-muted mb-1">LOCAL</div>
                                    <div class="merge-val">${formatVal(c.localVal)}</div>
                                </div>
                                <div class="merge-vs">VS</div>
                                <div class="merge-option ${c.choice === 'incoming' ? 'active' : ''}" onclick="TeamMerge.resolve(${i}, 'incoming')">
                                    <div class="text-xs uppercase font-bold text-primary mb-1">INCOMING</div>
                                    <div class="merge-val">${formatVal(c.incomingVal)}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="TeamMerge.close()">Cancel</button>
                <button class="btn btn-primary" id="btn-merge-apply" onclick="TeamMerge.apply()" ${currentConflicts.length > 0 && currentConflicts.some(c => !c.choice) ? 'disabled' : ''}>Apply Merge</button>
            </div>
        `;
    }

    function resolve(idx, choice) {
        if (idx < 0 || idx >= currentConflicts.length) return;
        currentConflicts[idx].choice = choice;

        // Update visual state
        const modal = document.getElementById('merge-modal');
        if (modal) {
            const card = modal.querySelector(`.merge-card[data-idx="${idx}"]`);
            if (card) {
                const options = card.querySelectorAll('.merge-option');
                options.forEach(opt => opt.classList.remove('active'));
                const activeIdx = choice === 'local' ? 0 : 1;
                if (options[activeIdx]) options[activeIdx].classList.add('active');
            }

            // Enable apply button when all resolved
            const applyBtn = modal.querySelector('#btn-merge-apply');
            if (applyBtn) {
                applyBtn.disabled = !currentConflicts.every(c => c.choice);
            }
        }
    }

    function apply() {
        const unresolved = currentConflicts.filter(c => !c.choice);
        if (unresolved.length > 0) {
            App.showToast(`${unresolved.length} conflict(s) still need resolution`, 'error');
            return;
        }

        // Apply each resolved conflict
        currentConflicts.forEach(c => {
            if (c.type === 'etd' && c.choice === 'incoming') {
                const incomingData = incomingProjectRef.etdAssessments[c.picoId]?.[c.domainId];
                if (incomingData) {
                    State.setEtdAssessment(c.picoId, c.domainId, incomingData);
                }
            }
            // 'local' choice = keep current, no action needed
        });

        App.showToast(`Merged ${currentConflicts.length} conflict(s) successfully!`, 'success');
        close();

        // Refresh view
        const hash = location.hash.replace('#', '') || 'dashboard';
        App.navigate(hash);
    }

    function detectConflicts(local, incoming) {
        const conflicts = [];

        if (incoming.etdAssessments) {
            Object.keys(incoming.etdAssessments).forEach(picoId => {
                const localPico = local.etdAssessments[picoId] || {};
                const incomingPico = incoming.etdAssessments[picoId];

                Object.keys(incomingPico).forEach(domainId => {
                    const locJudg = localPico[domainId]?.judgment;
                    const incJudg = incomingPico[domainId]?.judgment;

                    if (locJudg && incJudg && locJudg !== incJudg) {
                        conflicts.push({
                            type: 'etd',
                            scope: `PICO ${picoId.substring(0, 8)}`,
                            field: domainId.replace(/_/g, ' '),
                            localVal: locJudg,
                            incomingVal: incJudg,
                            picoId, domainId,
                            choice: null
                        });
                    }
                });
            });
        }

        return conflicts;
    }

    function formatVal(v) {
        if (!v) return '—';
        return v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function close() {
        const modal = document.getElementById('merge-modal');
        const overlay = document.getElementById('modal-overlay');
        if (modal) modal.remove();
        if (overlay) overlay.classList.remove('active');
        currentConflicts = [];
        incomingProjectRef = null;
    }

    return { show, close, resolve, apply };
})();
