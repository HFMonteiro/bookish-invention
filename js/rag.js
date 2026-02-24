// ============================================
// RAG Knowledge Base — Client-side Retrieval
// ============================================

const RAG = (() => {
    let knowledgeBase = null;
    let invertedIndex = null;  // term → [{chunkId, tf}]
    let idfMap = null;         // term → idf score

    // ---- Load & Index ----
    async function init() {
        if (knowledgeBase) return;
        try {
            const resp = await fetch('./data/rag-knowledge.json');
            knowledgeBase = await resp.json();
            buildIndex();
        } catch (e) {
            console.error('RAG: Failed to load knowledge base:', e);
            knowledgeBase = { chunks: [], contextTips: {} };
        }
    }

    function tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);
    }

    function buildIndex() {
        invertedIndex = {};
        idfMap = {};
        const N = knowledgeBase.chunks.length;

        // Build term frequencies per chunk + document frequencies
        const docFreq = {};  // term → number of chunks containing it

        knowledgeBase.chunks.forEach(chunk => {
            const text = `${chunk.text} ${chunk.section} ${(chunk.keywords || []).join(' ')}`;
            const tokens = tokenize(text);
            const seen = new Set();
            const termCounts = {};

            tokens.forEach(t => {
                termCounts[t] = (termCounts[t] || 0) + 1;
                seen.add(t);
            });

            // Store TF for this chunk
            seen.forEach(term => {
                if (!invertedIndex[term]) invertedIndex[term] = [];
                invertedIndex[term].push({
                    chunkId: chunk.id,
                    tf: termCounts[term] / tokens.length  // normalized TF
                });
                docFreq[term] = (docFreq[term] || 0) + 1;
            });
        });

        // Compute IDF
        Object.keys(docFreq).forEach(term => {
            idfMap[term] = Math.log((N + 1) / (docFreq[term] + 1)) + 1;  // smoothed IDF
        });
    }

    // ---- Search (BM25-inspired) ----
    function search(query, maxResults = 5) {
        if (!knowledgeBase || !invertedIndex) return [];

        const queryTokens = tokenize(query);
        if (queryTokens.length === 0) return [];

        // Expand query with synonyms
        const expanded = expandQuery(queryTokens);

        const scores = {};  // chunkId → score

        expanded.forEach(token => {
            const postings = invertedIndex[token];
            if (!postings) return;
            const idf = idfMap[token] || 1;

            postings.forEach(({ chunkId, tf }) => {
                // BM25-like scoring: idf * tf * (k1 + 1) / (tf + k1)
                const k1 = 1.5;
                const score = idf * (tf * (k1 + 1)) / (tf + k1);
                scores[chunkId] = (scores[chunkId] || 0) + score;
            });
        });

        // Boost exact keyword matches
        knowledgeBase.chunks.forEach(chunk => {
            if (!scores[chunk.id]) return;
            const keywords = (chunk.keywords || []).map(k => k.toLowerCase());
            queryTokens.forEach(qt => {
                if (keywords.includes(qt)) {
                    scores[chunk.id] *= 1.5;  // keyword boost
                }
            });
        });

        // Sort and return top results
        const ranked = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxResults)
            .map(([chunkId, score]) => {
                const chunk = knowledgeBase.chunks.find(c => c.id === chunkId);
                return { ...chunk, score };
            });

        return ranked;
    }

    function expandQuery(tokens) {
        const synonyms = {
            'adopt': ['adoption', 'adopting', 'accept'],
            'adapt': ['adaptation', 'adapting', 'modify', 'adjust'],
            'denovo': ['novo', 'new', 'scratch', 'develop'],
            'etd': ['evidence', 'decision', 'framework'],
            'agree': ['quality', 'assessment', 'appraisal', 'trustworthiness'],
            'pico': ['population', 'intervention', 'comparison', 'outcome', 'question'],
            'cost': ['resources', 'costs', 'economic', 'budget'],
            'equity': ['inequity', 'disparity', 'equality', 'fairness'],
            'strength': ['strong', 'conditional', 'weak'],
            'certainty': ['quality', 'evidence', 'confidence'],
            'harms': ['harm', 'risk', 'adverse', 'safety'],
            'benefits': ['benefit', 'effectiveness', 'efficacy']
        };

        const expanded = [...tokens];
        tokens.forEach(t => {
            if (synonyms[t]) {
                synonyms[t].forEach(syn => {
                    if (!expanded.includes(syn)) expanded.push(syn);
                });
            }
        });
        return expanded;
    }

    // ---- Context-aware Tips ----
    function getTips(stepId) {
        if (!knowledgeBase || !knowledgeBase.contextTips) return [];
        return knowledgeBase.contextTips[stepId] || [];
    }

    // ---- UI ----
    function renderPanel(containerEl) {
        if (!containerEl) return;

        const currentStep = getCurrentStep();
        const tips = getTips(currentStep);

        containerEl.innerHTML = `
      <div class="rag-panel">
        <div class="rag-search-box">
          <input type="text" class="form-input rag-search-input" id="rag-search-input"
            placeholder="Ask about GRADE-ADOLOPMENT methodology..." autocomplete="off">
          <button class="btn btn-primary btn-sm" id="rag-search-btn">🔍 Search</button>
        </div>

        ${tips.length > 0 ? `
          <div class="rag-context-tips">
            <div class="rag-section-title">💡 Tips for this step</div>
            ${tips.map(tip => `
              <div class="rag-tip">${tip}</div>
            `).join('')}
          </div>
        ` : ''}

        <div id="rag-results" class="rag-results">
          <div class="rag-section-title">📚 Knowledge Base Ready</div>
          <p class="text-sm text-muted">Search across 40+ curated passages about GRADE-ADOLOPMENT methodology, EtD framework, AGREE II assessment, and recommendation formulation.</p>
        </div>

        <div class="rag-sources-info">
          <div class="rag-section-title">📖 Sources</div>
          <ul class="rag-source-list">
            <li>Schünemann et al. GRADE-ADOLOPMENT, J Clin Epidemiol 2017</li>
            <li>WHO Handbook for Guideline Development, 2014</li>
            <li>AGREE II Instrument, AGREE Research Trust</li>
            <li>WHO-INTEGRATE Framework</li>
          </ul>
        </div>
      </div>
    `;

        // Attach events
        const input = containerEl.querySelector('#rag-search-input');
        const btn = containerEl.querySelector('#rag-search-btn');
        const resultsEl = containerEl.querySelector('#rag-results');

        const doSearch = () => {
            const query = input.value.trim();
            if (!query) return;
            const results = search(query);
            renderResults(resultsEl, query, results);
        };

        btn.addEventListener('click', doSearch);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    function renderResults(container, query, results) {
        if (results.length === 0) {
            container.innerHTML = `
        <div class="rag-no-results">
          <div class="rag-section-title">No results found</div>
          <p class="text-sm text-muted">Try different keywords. For example: "adopt vs adapt", "certainty of evidence", "AGREE II", "feasibility".</p>
        </div>
      `;
            return;
        }

        container.innerHTML = `
      <div class="rag-section-title">Found ${results.length} relevant passage${results.length > 1 ? 's' : ''}</div>
      ${results.map((r, i) => `
        <div class="rag-result-card" style="animation-delay: ${i * 60}ms">
          <div class="rag-result-header">
            <span class="rag-result-source">${escapeHtml(r.source)}</span>
            <span class="rag-result-score">${Math.round(r.score * 100)}%</span>
          </div>
          <div class="rag-result-section">${escapeHtml(r.section)}</div>
          <div class="rag-result-text">${highlightQuery(escapeHtml(r.text), query)}</div>
          ${r.keywords ? `
            <div class="rag-result-keywords">
              ${r.keywords.slice(0, 5).map(k => `<span class="rag-keyword">${k}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    `;
    }

    function highlightQuery(text, query) {
        const tokens = tokenize(query);
        let result = text;
        tokens.forEach(token => {
            const regex = new RegExp(`\\b(${token}[a-z]*)`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        return result;
    }

    function getCurrentStep() {
        const hash = location.hash.replace('#', '');
        const stepMap = {
            'project': 'project',
            'pico': 'pico',
            'sources': 'sources',
            'etd': 'etd',
            'decision': 'decision',
            'recommendation': 'recommendation'
        };
        return stepMap[hash] || 'project';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    return { init, search, getTips, renderPanel };
})();
