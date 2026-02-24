// ============================================
// Radar Chart Visualization (Pure SVG)
// ============================================

const RadarChart = (() => {

    // Scores mapping: qualitative judgment -> 1-5 score
    // Unique judgment values across all EtD domains
    const judgmentScores = {
        // High-end (score 5)
        'high': 5, 'favors_intervention': 5, 'large_savings': 5, 'increased': 5, 'yes': 5,
        // Somewhat positive (score 4)
        'moderate': 4, 'probably_favors_intervention': 4, 'moderate_savings': 4, 'probably_increased': 4, 'probably_yes': 4, 'probably': 4,
        // Neutral-positive (score 3)
        'possibly': 3, 'no_difference': 3, 'negligible': 3, 'probably_no_impact': 3, 'varies': 3, 'dont_know': 3,
        // Somewhat negative (score 2)
        'low': 2, 'probably_favors_comparison': 2, 'moderate_costs': 2, 'probably_reduced': 2, 'probably_no': 2,
        // Low-end (score 1)
        'very_low': 1, 'favors_comparison': 1, 'large_costs': 1, 'reduced': 1, 'no': 1, 'not_priority': 1
    };

    /**
     * Renders a radar chart into an SVG element
     * @param {HTMLElement} container
     * @param {Object} options
     * @param {Array} options.datasets - [{ label, data: {domainId: value}, color }]
     * @param {Array} options.labels - ['Domain 1', ...]
     * @param {Array} options.domainIds - ['domain1', ...]
     * @param {Number} options.size - width/height
     */
    function render(container, options) {
        const { datasets, labels, domainIds, size = 300 } = options;
        const padding = 50;
        const radius = (size / 2) - padding;
        const center = size / 2;
        const angleStep = (Math.PI * 2) / domainIds.length;

        let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="radar-chart">`;

        // 1. Draw background circles (grid)
        for (let i = 1; i <= 5; i++) {
            const r = (radius / 5) * i;
            svg += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="var(--color-neutral-200)" stroke-width="1" />`;
        }

        // 2. Draw axes and labels
        domainIds.forEach((id, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x2 = center + Math.cos(angle) * radius;
            const y2 = center + Math.sin(angle) * radius;

            svg += `<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="var(--color-neutral-300)" stroke-width="1" />`;

            const labelRadius = radius + 20;
            const lx = center + Math.cos(angle) * labelRadius;
            const ly = center + Math.sin(angle) * labelRadius;
            const anchor = Math.abs(lx - center) < 1 ? 'middle' : (lx > center ? 'start' : 'end');
            svg += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="10" fill="var(--color-text-muted)" dominant-baseline="middle">${labels[i]}</text>`;
        });

        // 3. Draw datasets
        datasets.forEach(ds => {
            let points = [];
            domainIds.forEach((id, i) => {
                const val = ds.data[id];
                const score = judgmentScores[val] || 3;
                const r = (radius / 5) * score;
                const angle = i * angleStep - Math.PI / 2;
                const px = center + Math.cos(angle) * r;
                const py = center + Math.sin(angle) * r;
                points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
            });

            const pointsStr = points.join(' ');
            svg += `
            <polygon points="${pointsStr}" fill="${ds.color}" fill-opacity="0.2" stroke="${ds.color}" stroke-width="2" />
            ${points.map(p => {
                const [x, y] = p.split(',');
                return `<circle cx="${x}" cy="${y}" r="3" fill="${ds.color}" />`;
            }).join('')}
        `;
        });

        svg += `</svg>`;
        container.innerHTML = svg;
    }

    return { render };
})();
