// ============================================
// Vertical Project Timeline
// ============================================

const Timeline = (() => {

    function render(container) {
        const project = State.get();
        if (!project) return;

        const milestones = getMilestones(project);

        container.innerHTML = `
            <div class="timeline-container stagger-children">
                ${milestones.map(m => `
                    <div class="timeline-item">
                        <div class="timeline-marker ${m.complete ? 'complete' : ''}"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">${m.date}</div>
                            <div class="timeline-title">${m.title}</div>
                            <div class="timeline-desc text-sm text-muted">${m.desc}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function getMilestones(project) {
        const milestones = [];
        const meta = project.meta;

        // Project Creation
        milestones.push({
            title: 'Project Created',
            desc: `Guideline development initiated for "${meta.title}"`,
            date: formatDate(meta.dateCreated),
            complete: true
        });

        // PICO Questions
        if (project.picoQuestions.length > 0) {
            const firstPico = project.picoQuestions[0];
            milestones.push({
                title: 'PICO Questions Defined',
                desc: `${project.picoQuestions.length} questions registered for assessment.`,
                date: firstPico.dateCreated ? formatDate(firstPico.dateCreated) : 'Step 1 complete',
                complete: true
            });
        }

        // Source Guidelines
        if (project.sourceGuidelines.length > 0) {
            milestones.push({
                title: 'Source Guidelines Identified',
                desc: `${project.sourceGuidelines.length} guidelines selected as potential sources.`,
                date: 'Step 2 complete',
                complete: true
            });
        }

        // EtD Assessments
        const etdCount = Object.keys(project.etdAssessments).length;
        if (etdCount > 0) {
            milestones.push({
                title: 'EtD Framework Analysis',
                desc: `Assessment in progress across ${etdCount} PICO questions.`,
                date: 'Step 3 active',
                complete: true
            });
        }

        // Decisions
        const decCount = Object.keys(project.decisions).length;
        if (decCount > 0) {
            milestones.push({
                title: 'Adolopment Decisions',
                desc: `${decCount} questions have definitive Adopt/Adapt/De Novo decisions.`,
                date: 'Step 4 active',
                complete: true
            });
        }

        // Recommendations
        const recCount = Object.keys(project.recommendations).length;
        if (recCount > 0) {
            milestones.push({
                title: 'Recommendations Finalized',
                desc: `${recCount} official recommendations formulated.`,
                date: 'Step 5 active',
                complete: true
            });
        }

        return milestones;
    }

    function formatDate(ts) {
        if (!ts) return '';
        const date = new Date(ts);
        if (isNaN(date.getTime())) return ts; // Return raw string if unparseable
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return { render };
})();
