// ============================================
// State Management — localStorage & Events
// ============================================

const State = (() => {
  const STORAGE_KEY = 'grade_adolopment_project';
  const listeners = new Map();

  // Default empty project structure
  function createEmptyProject() {
    return {
      meta: {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
        title: '',
        scope: '',
        authors: '',
        targetPopulation: '',
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        status: 'draft'
      },
      picoQuestions: [],
      sourceGuidelines: [],
      etdAssessments: {},  // keyed by PICO question ID
      decisions: {},       // keyed by PICO question ID
      recommendations: {}  // keyed by PICO question ID
    };
  }

  let currentProject = null;

  // Load from localStorage
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        currentProject = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return currentProject;
  }

  // Save to localStorage
  function save() {
    if (!currentProject) return;
    currentProject.meta.dateModified = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProject));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
    emit('change', currentProject);
  }

  // Get current project
  function get() {
    return currentProject;
  }

  // Create new project
  function createNew(meta = {}) {
    currentProject = createEmptyProject();
    Object.assign(currentProject.meta, meta);
    save();
    emit('projectCreated', currentProject);
    return currentProject;
  }

  // Update project meta
  function updateMeta(updates) {
    if (!currentProject) return;
    Object.assign(currentProject.meta, updates);
    save();
  }

  // ---- PICO Questions ----
  function addPicoQuestion(pico) {
    if (!currentProject) return;
    pico.id = pico.id || 'pico_' + Date.now().toString(36);
    pico.priority = pico.priority || 'important';
    pico.dateCreated = new Date().toISOString();
    currentProject.picoQuestions.push(pico);
    save();
    emit('picoAdded', pico);
    return pico;
  }

  function updatePicoQuestion(id, updates) {
    if (!currentProject) return;
    const idx = currentProject.picoQuestions.findIndex(p => p.id === id);
    if (idx >= 0) {
      Object.assign(currentProject.picoQuestions[idx], updates);
      save();
      emit('picoUpdated', currentProject.picoQuestions[idx]);
    }
  }

  function deletePicoQuestion(id) {
    if (!currentProject) return;
    currentProject.picoQuestions = currentProject.picoQuestions.filter(p => p.id !== id);
    delete currentProject.etdAssessments[id];
    delete currentProject.decisions[id];
    delete currentProject.recommendations[id];
    save();
    emit('picoDeleted', id);
  }

  function getPicoQuestions() {
    return currentProject ? currentProject.picoQuestions : [];
  }

  function getPicoById(id) {
    return currentProject ? currentProject.picoQuestions.find(p => p.id === id) : null;
  }

  // ---- Source Guidelines ----
  function addSourceGuideline(source) {
    if (!currentProject) return;
    source.id = source.id || 'src_' + Date.now().toString(36);
    currentProject.sourceGuidelines.push(source);
    save();
    emit('sourceAdded', source);
    return source;
  }

  function updateSourceGuideline(id, updates) {
    if (!currentProject) return;
    const idx = currentProject.sourceGuidelines.findIndex(s => s.id === id);
    if (idx >= 0) {
      Object.assign(currentProject.sourceGuidelines[idx], updates);
      save();
    }
  }

  function deleteSourceGuideline(id) {
    if (!currentProject) return;
    currentProject.sourceGuidelines = currentProject.sourceGuidelines.filter(s => s.id !== id);
    save();
    emit('sourceDeleted', id);
  }

  function getSourceGuidelines() {
    return currentProject ? currentProject.sourceGuidelines : [];
  }

  // ---- EtD Assessments ----
  function setEtdAssessment(picoId, domainId, data) {
    if (!currentProject) return;
    if (!currentProject.etdAssessments[picoId]) {
      currentProject.etdAssessments[picoId] = {};
    }
    currentProject.etdAssessments[picoId][domainId] = data;
    save();
    emit('etdUpdated', { picoId, domainId, data });
  }

  function getEtdAssessment(picoId, domainId) {
    if (!currentProject || !currentProject.etdAssessments[picoId]) return null;
    return currentProject.etdAssessments[picoId][domainId] || null;
  }

  function getEtdAssessments(picoId) {
    if (!currentProject) return {};
    return currentProject.etdAssessments[picoId] || {};
  }

  // ---- Decisions ----
  function setDecision(picoId, decision) {
    if (!currentProject) return;
    currentProject.decisions[picoId] = decision;
    save();
    emit('decisionUpdated', { picoId, decision });
  }

  function getDecision(picoId) {
    if (!currentProject) return null;
    return currentProject.decisions[picoId] || null;
  }

  // ---- Recommendations ----
  function setRecommendation(picoId, rec) {
    if (!currentProject) return;
    currentProject.recommendations[picoId] = rec;
    save();
    emit('recommendationUpdated', { picoId, rec });
  }

  function getRecommendation(picoId) {
    if (!currentProject) return null;
    return currentProject.recommendations[picoId] || null;
  }

  // ---- Import / Export ----
  function exportJSON() {
    if (!currentProject) return null;
    return JSON.stringify(currentProject, null, 2);
  }

  function importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.meta && data.picoQuestions) {
        currentProject = data;
        save();
        emit('projectLoaded', currentProject);
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  }

  // Clear all data
  function clearProject() {
    currentProject = null;
    localStorage.removeItem(STORAGE_KEY);
    emit('projectCleared');
  }

  // Check if project exists
  function hasProject() {
    return currentProject !== null && currentProject.meta.title !== '';
  }

  // ---- Event System ----
  function on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(callback);
  }

  function off(event, callback) {
    if (!listeners.has(event)) return;
    const cbs = listeners.get(event).filter(cb => cb !== callback);
    listeners.set(event, cbs);
  }

  function emit(event, data) {
    if (!listeners.has(event)) return;
    listeners.get(event).forEach(cb => {
      try { cb(data); } catch (e) { console.error('Event handler error:', e); }
    });
  }

  // ---- Progress Calculation ----
  function getProgress() {
    if (!currentProject) return { overall: 0, steps: {} };

    const steps = {};
    const picoCount = currentProject.picoQuestions.length;

    // Step 1: Project setup
    steps.project = currentProject.meta.title ? 100 : 0;

    // Step 2: PICO Questions
    steps.pico = picoCount > 0 ? 100 : 0;

    // Step 3: Source evaluation
    steps.sources = currentProject.sourceGuidelines.length > 0 ? 100 : 0;

    // Step 4: EtD assessment
    if (picoCount > 0) {
      let etdComplete = 0;
      currentProject.picoQuestions.forEach(pico => {
        const assessments = currentProject.etdAssessments[pico.id] || {};
        const domainsDone = Object.keys(assessments).filter(k => assessments[k].judgment).length;
        etdComplete += (domainsDone / 9) * 100;
      });
      steps.etd = Math.round(etdComplete / picoCount);
    } else {
      steps.etd = 0;
    }

    // Step 5: Decisions
    if (picoCount > 0) {
      const decisionCount = Object.keys(currentProject.decisions).filter(k =>
        currentProject.decisions[k] && currentProject.decisions[k].type
      ).length;
      steps.decision = Math.round((decisionCount / picoCount) * 100);
    } else {
      steps.decision = 0;
    }

    // Step 6: Recommendations
    if (picoCount > 0) {
      const recCount = Object.keys(currentProject.recommendations).filter(k =>
        currentProject.recommendations[k] && currentProject.recommendations[k].text
      ).length;
      steps.recommendation = Math.round((recCount / picoCount) * 100);
    } else {
      steps.recommendation = 0;
    }

    // Overall
    const stepValues = Object.values(steps);
    const overall = Math.round(stepValues.reduce((a, b) => a + b, 0) / stepValues.length);

    return { overall, steps };
  }

  return {
    load, save, get, createNew, updateMeta, hasProject, clearProject,
    addPicoQuestion, updatePicoQuestion, deletePicoQuestion, getPicoQuestions, getPicoById,
    addSourceGuideline, updateSourceGuideline, deleteSourceGuideline, getSourceGuidelines,
    setEtdAssessment, getEtdAssessment, getEtdAssessments,
    setDecision, getDecision,
    setRecommendation, getRecommendation,
    exportJSON, importJSON, getProgress,
    on, off
  };
})();
