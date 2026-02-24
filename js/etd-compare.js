// ============================================
// EtD Comparison Panel — Source vs Local
// ============================================

const EtdCompare = (() => {
    let currentPicoId = null;
    let selectedSourceId = null;

    /**
     * Renders the comparison modal/overlay
     */
    function show(picoId) {
        currentPicoId = picoId;
        const pico = State.getPicoById(picoId);
        const sources = State.getSourceGuidelines();

        if (sources.length === 0) {
            App.showToast('Add source guidelines first to compare.', 'info');
            return;
        }

        // Default to first source if none selected
        if (!selectedSourceId) selectedSourceId = sources[0].id;

        const overlay = document.getElementById('modal-overlay');
        const modal = document.createElement('div');
        modal.className = 'modal modal-lg';
        modal.id = 'etd-compare-modal';

        renderModalContent(modal, pico, sources);

        document.body.appendChild(modal);
        overlay.classList.add('active');
        modal.classList.add('active');
    }

    function renderModalContent(container, pico, sources) {
        const sourceAssessments = State.getSourceEtds(selectedSourceId, currentPicoId);
        const localAssessments = State.getEtdAssessments(currentPicoId);
        const selectedSource = sources.find(s => s.id === selectedSourceId);

        container.innerHTML = `
            <div class="modal-header">
                <div class="modal-title">Evidence to Decision Comparison</div>
                <button class="modal-close" onclick="EtdCompare.close()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="compare-header-grid">
                    <div class="pico-summary-card">
                        <div class="text-xs text-muted mb-1">PICO QUESTION</div>
                        <div class="font-bold">${pico.topic || pico.population || 'PICO Question'}</div>
                    </div>
                    <div class="source-selector-card">
                        <div class="text-xs text-muted mb-1">COMPARE WITH SOURCE</div>
                        <select class="form-input" onchange="EtdCompare.handleSourceChange(this.value)">
                            ${sources.map(s => `<option value="${s.id}" ${s.id === selectedSourceId ? 'selected' : ''}>${s.title}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="compare-layout">
                    <div class="compare-sidebar">
                        <div class="radar-container" id="compare-radar"></div>
                        <div class="decision-suggestion" id="compare-suggestion"></div>
                    </div>
                    <div class="compare-grid" id="compare-grid">
                        ${renderGrid(localAssessments, sourceAssessments)}
                    </div>
                </div>
            </div>
        `;

        // Render Radar Chart
        const domainLabels = ['Priority', 'Certainty', 'Benefits', 'Values', 'Resources', 'Cost-eff', 'Equity', 'Accept', 'Feasibility'];
        const domainIds = ['priority', 'certainty', 'benefits_harms', 'values', 'resources', 'cost_effectiveness', 'equity', 'acceptability', 'feasibility'];

        const localData = {};
        const sourceData = {};
        domainIds.forEach(id => {
            localData[id] = localAssessments[id]?.judgment || 'no_difference';
            sourceData[id] = sourceAssessments[id]?.judgment || 'no_difference';
        });

        RadarChart.render(container.querySelector('#compare-radar'), {
            datasets: [
                { label: 'Local Context', data: localData, color: 'var(--color-primary-500)' },
                { label: 'Source Guideline', data: sourceData, color: 'var(--color-neutral-400)' }
            ],
            labels: domainLabels,
            domainIds: domainIds,
            size: 260
        });

        updateSuggestion(container.querySelector('#compare-suggestion'), localData, sourceData);
    }

    function renderGrid(local, source) {
        const domainLabels = {
            priority: 'Priority', certainty: 'Certainty', benefits_harms: 'Benefits/Harms',
            values: 'Values', resources: 'Resources', cost_effectiveness: 'Cost-eff',
            equity: 'Equity', acceptability: 'Acceptability', feasibility: 'Feasibility'
        };

        return Object.entries(domainLabels).map(([id, label]) => {
            const locVal = local[id]?.judgment || '-';
            const srcVal = source[id]?.judgment || '-';
            const isDiff = locVal !== srcVal && locVal !== '-' && srcVal !== '-';

            return `
                <div class="compare-row ${isDiff ? 'row-diff' : ''}">
                    <div class="compare-domain">${label}</div>
                    <div class="compare-cell cell-source">
                        <div class="compare-judgment">${formatLabel(srcVal)}</div>
                        <button class="btn btn-ghost btn-xs mt-1" onclick="EtdCompare.editSourceDomain('${id}')">Edit Source</button>
                    </div>
                    <div class="compare-cell cell-local">
                        <div class="compare-judgment">${formatLabel(locVal)}</div>
                        <div class="text-xs text-muted mt-1">From assessment</div>
                    </div>
                    <div class="compare-status">${isDiff ? '⚠️ Differs' : '✅ Matches'}</div>
                </div>
            `;
        }).join('');
    }

    function formatLabel(val) {
        if (val === '-') return '<span class="text-muted">No data</span>';
        return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function updateSuggestion(container, local, source) {
        let diffs = 0;
        Object.keys(local).forEach(id => {
            if (local[id] !== source[id] && local[id] !== 'no_difference' && source[id] !== 'no_difference') diffs++;
        });

        let suggestion = '';
        if (diffs === 0) {
            suggestion = `<div class="alert alert-success mt-4"><strong>Suggestion: ADOPT</strong><br>Contextual judgments match the source guideline perfectly.</div>`;
        } else if (diffs <= 3) {
            suggestion = `<div class="alert alert-warning mt-4"><strong>Suggestion: ADAPT</strong><br>${diffs} domains differ from source. Adaptation is recommended.</div>`;
        } else {
            suggestion = `<div class="alert alert-info mt-4"><strong>Suggestion: DE NOVO</strong><br>Major contextual differences (${diffs} domains). De novo development may be needed.</div>`;
        }
        container.innerHTML = suggestion;
    }

    function handleSourceChange(sourceId) {
        selectedSourceId = sourceId;
        const modal = document.getElementById('etd-compare-modal');
        if (modal) {
            const pico = State.getPicoById(currentPicoId);
            const sources = State.getSourceGuidelines();
            renderModalContent(modal, pico, sources);
        }
    }

    function editSourceDomain(domainId) {
        const currentVal = State.getSourceEtd(selectedSourceId, currentPicoId, domainId)?.judgment || '';

        // Simple prompt for now (can be improved to a sub-modal)
        const newVal = prompt(`Enter source judgment for ${domainId}:`, currentVal);
        if (newVal !== null) {
            State.setSourceEtd(selectedSourceId, currentPicoId, domainId, { judgment: newVal });
            handleSourceChange(selectedSourceId); // Refresh
        }
    }

    function close() {
        const modal = document.getElementById('etd-compare-modal');
        const overlay = document.getElementById('modal-overlay');
        if (modal) modal.remove();
        if (overlay) overlay.classList.remove('active');
    }

    return { show, close, handleSourceChange, editSourceDomain };
})();
