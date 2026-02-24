// ============================================
// State Management — localStorage & Events
// ============================================

const State = (() => {
  const listeners = new Map();

  const STORAGE_KEY = 'grade_adolopment_projects';
  const CURRENT_ID_KEY = 'grade_current_project_id';

  function createEmptyProject() {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
    return {
      meta: {
        id,
        title: 'New Guideline Project',
        organization: '',
        scope: '',
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        authors: '',
        status: 'draft'
      },
      picoQuestions: [],
      sourceGuidelines: [],
      sourceGuidelineEtd: {},
      etdAssessments: {},
      decisions: {},
      recommendations: {}
    };
  }

  let projects = [];
  let currentId = null;
  let currentProject = null;

  // Load from localStorage
  function load() {
    try {
      const rawProjects = localStorage.getItem(STORAGE_KEY);
      const rawCurrentId = localStorage.getItem(CURRENT_ID_KEY);

      projects = rawProjects ? JSON.parse(rawProjects) : [];
      currentId = rawCurrentId;

      if (projects.length === 0) {
        // No projects, don't create one automatically yet
        currentProject = null;
      } else {
        currentProject = projects.find(p => p.meta.id === currentId) || projects[0];
        currentId = currentProject.meta.id;
      }
    } catch (e) {
      console.warn('Failed to load projects:', e);
    }
    return currentProject;
  }

  // Save to localStorage
  function save() {
    if (!currentProject) return;
    currentProject.meta.dateModified = new Date().toISOString();

    // Update proyect in array
    const idx = projects.findIndex(p => p.meta.id === currentProject.meta.id);
    if (idx !== -1) projects[idx] = currentProject;
    else projects.push(currentProject);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(CURRENT_ID_KEY, currentProject.meta.id);
    } catch (e) {
      console.warn('Failed to save projects:', e);
    }
    emit('change', currentProject);
  }

  // Get current project
  function get() { return currentProject; }

  // Create new project
  function createNew(meta = {}) {
    currentProject = createEmptyProject();
    if (meta) Object.assign(currentProject.meta, meta);
    save();
    emit('projectCreated', currentProject);
    return currentProject;
  }

  function switchProject(id) {
    const p = projects.find(proj => proj.meta.id === id);
    if (p) {
      currentProject = p;
      currentId = id;
      localStorage.setItem(CURRENT_ID_KEY, id);
      emit('projectSwitched', currentProject);
    }
  }

  function listProjects() { return projects; }

  function deleteProject(id) {
    projects = projects.filter(p => p.meta.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    if (currentId === id) {
      currentProject = projects[0] || null;
      currentId = currentProject ? currentProject.meta.id : null;
      localStorage.setItem(CURRENT_ID_KEY, currentId || '');
    }
    emit('change', currentProject);
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

  function updatePicoQuestion(id, data) {
    if (!currentProject) return;
    const idx = currentProject.picoQuestions.findIndex(q => q.id === id);
    if (idx !== -1) {
      currentProject.picoQuestions[idx] = { ...currentProject.picoQuestions[idx], ...data };
      save();
      emit('picoUpdated', currentProject.picoQuestions[idx]);
    }
  }

  // ---- SoF Data (Outcomes) ----
  function setPicoOutcomes(picoId, outcomes) {
    const pico = getPicoById(picoId);
    if (pico) {
      pico.outcomes = outcomes;
      save();
    }
  }

  function getPicoOutcomes(picoId) {
    const pico = getPicoById(picoId);
    return pico ? (pico.outcomes || []) : [];
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

  // ---- Source Guideline EtD (for comparison) ----
  function setSourceEtd(sourceId, picoId, domainId, data) {
    if (!currentProject) return;
    if (!currentProject.sourceGuidelineEtd[sourceId]) {
      currentProject.sourceGuidelineEtd[sourceId] = {};
    }
    if (!currentProject.sourceGuidelineEtd[sourceId][picoId]) {
      currentProject.sourceGuidelineEtd[sourceId][picoId] = {};
    }
    currentProject.sourceGuidelineEtd[sourceId][picoId][domainId] = data;
    save();
  }

  function getSourceEtd(sourceId, picoId, domainId) {
    if (!currentProject || !currentProject.sourceGuidelineEtd[sourceId]) return null;
    if (!currentProject.sourceGuidelineEtd[sourceId][picoId]) return null;
    return currentProject.sourceGuidelineEtd[sourceId][picoId][domainId] || null;
  }

  function getSourceEtds(sourceId, picoId) {
    if (!currentProject || !currentProject.sourceGuidelineEtd[sourceId]) return {};
    return currentProject.sourceGuidelineEtd[sourceId][picoId] || {};
  }

  // ---- PICO Outcomes (Summary of Findings) ----
  function setPicoOutcomes(picoId, outcomes) {
    if (!currentProject) return;
    if (!currentProject.sofOutcomes) currentProject.sofOutcomes = {};
    currentProject.sofOutcomes[picoId] = outcomes;
    save();
    emit('outcomesUpdated', { picoId, outcomes });
  }

  function getPicoOutcomes(picoId) {
    if (!currentProject || !currentProject.sofOutcomes) return [];
    return currentProject.sofOutcomes[picoId] || [];
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
        // Ensure it has a unique ID
        if (!data.meta.id) {
          data.meta.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
        }
        currentProject = data;
        currentId = data.meta.id;
        // Remove existing project with same ID if any
        projects = projects.filter(p => p.meta.id !== currentId);
        projects.push(currentProject);
        save();
        emit('projectLoaded', currentProject);
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  }

  // Clear current project
  function clearProject() {
    if (!currentProject) return;
    const idToRemove = currentProject.meta.id;
    projects = projects.filter(p => p.meta.id !== idToRemove);
    currentProject = projects[0] || null;
    currentId = currentProject ? currentProject.meta.id : null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(CURRENT_ID_KEY, currentId || '');
    } catch (e) {
      console.warn('Failed to save after clear:', e);
    }
    emit('projectCleared');
  }

  // Check if project exists
  function hasProject() {
    return currentProject !== null && currentProject.meta && currentProject.meta.title !== '';
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
    switchProject, listProjects, deleteProject,
    addPicoQuestion, updatePicoQuestion, deletePicoQuestion, getPicoQuestions, getPicoById, setPicoOutcomes, getPicoOutcomes,
    addSourceGuideline, updateSourceGuideline, deleteSourceGuideline, getSourceGuidelines,
    setEtdAssessment, getEtdAssessment, getEtdAssessments,
    setSourceEtd, getSourceEtd, getSourceEtds,
    setDecision, getDecision,
    setRecommendation, getRecommendation,
    exportJSON, importJSON, getProgress,
    on, off
  };
})();
