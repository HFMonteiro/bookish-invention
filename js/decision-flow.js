// ============================================
// Interactive Decision Flowchart (SVG)
// ============================================

const DecisionFlow = (() => {

    function render(container, options = {}) {
        const { activePath = 'none' } = options;

        container.innerHTML = `
            <div class="decision-flow-container">
                <svg width="600" height="400" viewBox="0 0 600 400" class="decision-flow-svg">
                    <!-- Nodes -->
                    <g class="flow-node" id="node-pico" transform="translate(300, 50)">
                        <rect x="-80" y="-20" width="160" height="40" rx="20" fill="var(--color-primary-500)" />
                        <text y="5" text-anchor="middle" fill="white" font-weight="600" font-size="12">PICO Question</text>
                    </g>

                    <g class="flow-node" id="node-source" transform="translate(300, 130)">
                        <path d="M 0 -30 L 60 0 L 0 30 L -60 0 Z" fill="var(--color-neutral-100)" stroke="var(--color-neutral-300)" />
                        <text y="5" text-anchor="middle" fill="var(--color-text)" font-size="11">Source Avail?</text>
                    </g>

                    <g class="flow-node" id="node-etd" transform="translate(150, 220)">
                        <rect x="-70" y="-25" width="140" height="50" rx="8" fill="var(--color-neutral-50)" stroke="var(--color-neutral-300)" />
                        <text y="5" text-anchor="middle" fill="var(--color-text)" font-size="11">Compare EtD context</text>
                    </g>

                    <g class="flow-node" id="node-denovo" transform="translate(450, 220)">
                        <rect x="-70" y="-25" width="140" height="50" rx="8" fill="rgba(0,154,222,0.1)" stroke="var(--color-primary-300)" />
                        <text y="5" text-anchor="middle" fill="var(--color-primary-800)" font-weight="700" font-size="11">DE NOVO</text>
                    </g>

                    <g class="flow-node" id="node-context" transform="translate(150, 310)">
                        <path d="M 0 -25 L 50 0 L 0 25 L -50 0 Z" fill="var(--color-neutral-100)" stroke="var(--color-neutral-300)" />
                        <text y="5" text-anchor="middle" fill="var(--color-text)" font-size="10">Match?</text>
                    </g>

                    <g class="flow-node" id="node-adopt" transform="translate(50, 380)">
                        <rect x="-40" y="-20" width="80" height="40" rx="4" fill="var(--color-green-500)" />
                        <text y="5" text-anchor="middle" fill="white" font-weight="700" font-size="11">ADOPT</text>
                    </g>

                    <g class="flow-node" id="node-adapt" transform="translate(250, 380)">
                        <rect x="-40" y="-20" width="80" height="40" rx="4" fill="var(--color-amber-500)" />
                        <text y="5" text-anchor="middle" fill="white" font-weight="700" font-size="11">ADAPT</text>
                    </g>

                    <!-- Connections -->
                    <line x1="300" y1="70" x2="300" y2="100" stroke="var(--color-neutral-300)" marker-end="url(#arrow)" />
                    
                    <path d="M 240 130 L 150 130 L 150 195" fill="none" stroke="var(--color-neutral-300)" marker-end="url(#arrow)" />
                    <text x="200" y="125" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">Yes</text>

                    <path d="M 360 130 L 450 130 L 450 195" fill="none" stroke="var(--color-neutral-300)" marker-end="url(#arrow)" />
                    <text x="400" y="125" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">No</text>

                    <line x1="150" y1="245" x2="150" y2="285" stroke="var(--color-neutral-300)" marker-end="url(#arrow)" />

                    <path d="M 100 310 L 50 310 L 50 360" fill="none" stroke="var(--color-neutral-300)" marker-end="url(#arrow)" />
                    <text x="75" y="305" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">Yes</text>

                    <path d="M 200 310 L 250 310 L 250 360" fill="none" stroke="var(--color-neutral-300)" marker-end="url(#arrow)" />
                    <text x="225" y="305" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">No</text>

                    <!-- Markers -->
                    <defs>
                        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L0,6 L9,3 z" fill="var(--color-neutral-300)" />
                        </marker>
                    </defs>
                </svg>
            </div>
        `;

        highlightPath(container, activePath);
    }

    function highlightPath(container, path) {
        const svg = container.querySelector('svg');
        if (!svg) return;

        // Implementation of highlighting logic based on path
        // For now, it's just a placeholder for the full logic
    }

    return { render };
})();
