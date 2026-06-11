const canvas = document.getElementById("cadCanvas");
const ctx = canvas.getContext("2d");
const profileCanvas = document.getElementById("profileCanvas");
const profileCtx = profileCanvas?.getContext("2d");
const DEFAULT_ROAD_WIDTH = 7;
const DEFAULT_SIDEWALK_WIDTH = 2.5;
const EDGE_SNAP_SCREEN_TOLERANCE = 18;
const TOOLBAR_SCALE_MIN = 0.68;
const TOOLBAR_SCALE_MAX = 1.12;
const TOOLBAR_SCALE_STEP = 0.05;
const TOOLBAR_SCALE_DEFAULT = 0.82;
const TOOLBAR_SCALE_STORAGE_KEY = "sondacadToolbarScale";
const WORKSPACE_LAYOUT_STORAGE_KEY = "sondacadWorkspaceLayout";
const RIBBON_ORDER_STORAGE_KEY = "sondacadRibbonOrder";
const RIBBON_BUTTON_ORDER_STORAGE_KEY = "sondacadRibbonButtonOrder";
const TOP_COMMAND_ORDER_STORAGE_KEY = "sondacadTopCommandOrder";
const DEFAULT_TOP_COMMAND_ORDER = [
  "toolbarScaleControls",
  "layoutControls",
  "manualLink",
  "newProjectBtn",
  "clearLotTopBtn",
  "undoBtn",
  "fitBtn",
  "fileInputAction",
  "pdfCadInputAction",
  "exportDropdown",
  "exportJsonBtn",
  "exportSvgBtn",
  "exportDxfBtn",
  "exportPdfBtn",
  "exportDwgBtn",
  "exportModel2dBtn",
  "exportModel3dBtn",
  "exportModelsBundleBtn"
];
const DEFAULT_WORKSPACE_LAYOUT = {
  leftPanel: true,
  rightPanel: true,
  ribbon: true
};
const PDFJS_PATH = "./assets/pdfjs/pdf.min.mjs";
const PDFJS_WORKER_PATH = "./assets/pdfjs/pdf.worker.min.mjs";
const PROFILE_PITCH_MIN = 4;
const PROFILE_PITCH_MAX = 82;
const PROFILE_ORBIT_PRESETS = {
  iso: { yaw: 28, pitch: 24 },
  top: { yaw: 0, pitch: 82 },
  front: { yaw: 0, pitch: 4 },
  back: { yaw: 180, pitch: 4 },
  right: { yaw: 90, pitch: 4 },
  left: { yaw: -90, pitch: 4 }
};
const STRATIGRAPHIC_PROFILES = {
  manual: {
    name: "Camadas dos SPs",
    layers: [
      { name: "Solo superficial", from: 0, to: 0.12 },
      { name: "Argila arenosa", from: 0.12, to: 0.52 },
      { name: "Solo residual", from: 0.52, to: 1 }
    ]
  },
  tropical: {
    name: "Residual tropical",
    layers: [
      { name: "Aterro / solo superficial", from: 0, to: 0.12 },
      { name: "Argila arenosa", from: 0.12, to: 0.45 },
      { name: "Silte residual", from: 0.45, to: 0.72 },
      { name: "Solo residual", from: 0.72, to: 1 }
    ]
  },
  sedimentar: {
    name: "Sedimentar arenoso",
    layers: [
      { name: "Solo superficial", from: 0, to: 0.10 },
      { name: "Areia fina", from: 0.10, to: 0.38 },
      { name: "Argila siltosa", from: 0.38, to: 0.66 },
      { name: "Areia compacta", from: 0.66, to: 1 }
    ]
  },
  aluvial: {
    name: "Aluvial saturado",
    layers: [
      { name: "Aterro", from: 0, to: 0.10 },
      { name: "Argila mole", from: 0.10, to: 0.42 },
      { name: "Areia saturada", from: 0.42, to: 0.70 },
      { name: "Silte arenoso", from: 0.70, to: 1 }
    ]
  },
  rocha: {
    name: "Rocha alterada",
    layers: [
      { name: "Solo superficial", from: 0, to: 0.10 },
      { name: "Argila residual", from: 0.10, to: 0.36 },
      { name: "Saprolito", from: 0.36, to: 0.68 },
      { name: "Rocha alterada", from: 0.68, to: 1 }
    ]
  }
};

const state = {
  tool: "select",
  activeView: "cad",
  selected: null,
  hover: null,
  drag: null,
  action: null,
  offset: null,
  directDistance: {
    text: "",
    value: null
  },
  shortcut: {
    text: "",
    timer: null
  },
  measureStart: null,
  measureStartRef: null,
  drawStart: null,
  polyPoints: [],
  arcStep: null,
  mouseRawWorld: { x: 0, y: 0 },
  history: [],
  historyLabel: "",
  lastCommand: "select",
  context: {
    rightDownAt: 0,
    rightDownPos: null,
    longPressTimer: null,
    menuOpen: false
  },
  formSnapshotArmed: false,
  edgeListSignature: "",
  ortho: {
    mode: "shift",
    enabled: false,
    shiftDown: false
  },
  osnap: {
    enabled: true,
    marker: null,
    modes: {
      endpoint: true,
      midpoint: true,
      center: true,
      node: true,
      quadrant: true,
      intersection: true,
      extension: true,
      perpendicular: true,
      tangent: false,
      parallel: false,
      nearest: true
    }
  },
  mouseWorld: { x: 0, y: 0 },
  view: { scale: 12, x: 90, y: 470 },
  toolbarScale: readStoredToolbarScale(),
  workspaceLayout: readStoredWorkspaceLayout(),
  profile: {
    zoom: 1,
    x: 0,
    y: 0,
    drag: null,
    userAdjusted: false,
    modelSignature: "",
    orientation: "iso",
    yaw: PROFILE_ORBIT_PRESETS.iso.yaw,
    pitch: PROFILE_ORBIT_PRESETS.iso.pitch,
    stratProfile: "manual",
    stratVariation: "ondulado",
    viewCubeVisible: true,
    navBarVisible: true
  },
  layers: {
    grid: true,
    terrain: true,
    drawings: true,
    points: true,
    dimensions: true,
    notes: true,
    imports: true
  }
};

let project = createDefaultProject();
let modelTabs = [];
let activeModelTabId = "";

function createDefaultProject() {
  return {
    name: "Novo croqui de sondagem",
    client: "",
    plotScale: "1:200",
    stratigraphicProfile: "manual",
    stratigraphicVariation: "ondulado",
    sptReportSource: "",
    terrain: [],
    points: [],
    dimensions: [],
    entities: [],
    notes: [],
    imports: { lines: [], polylines: [], circles: [], texts: [] }
  };
}

const DEFAULT_TERRAIN = [
  { x: 0, y: 0 },
  { x: 42, y: 0 },
  { x: 46, y: 26 },
  { x: 24, y: 34 },
  { x: -4, y: 28 },
  { x: -6, y: 8 }
];

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function projectSnapshot() {
  return JSON.stringify(project);
}

function initializeModelTabs() {
  modelTabs = [createModelTab("Modelo 1", project)];
  activeModelTabId = modelTabs[0].id;
  drawModelTabs();
}

function createModelTab(label, data = createDefaultProject()) {
  return {
    id: uid("model"),
    label,
    project: cloneProjectData(data)
  };
}

function cloneProjectData(data) {
  return normalizeProject(JSON.parse(JSON.stringify(data || createDefaultProject())));
}

function activeModelTab() {
  return modelTabs.find((tab) => tab.id === activeModelTabId) || null;
}

function syncActiveModelTab() {
  const tab = activeModelTab();
  if (tab) tab.project = cloneProjectData(project);
}

function resetProjectInteractionState() {
  state.selected = null;
  state.drag = null;
  state.action = null;
  state.offset = null;
  state.measureStart = null;
  state.measureStartRef = null;
  state.drawStart = null;
  state.polyPoints = [];
  state.arcStep = null;
  state.formSnapshotArmed = false;
  state.edgeListSignature = "";
  state.profile.modelSignature = "";
  state.history = [];
  clearDirectDistance();
  updateUndoState();
}

function loadProjectIntoWorkspace(nextProject, statusText = "") {
  project = normalizeProject(nextProject);
  resetProjectInteractionState();
  bindProjectFields();
  refreshSelectionForm();
  updateDistanceList();
  updateSptImportSummary(project.sptReportSource ? `Relatorio carregado: ${project.sptReportSource}` : "Importe a ficha Sondamais para preencher espessuras e tipos de solo dos SPs.");
  drawModelTabs();
  if (modelHasGeometry(project)) fitToModel();
  else draw();
  if (state.activeView === "profile") drawProfile3D();
  if (statusText) setStatus(statusText);
}

function modelHasGeometry(model) {
  const imports = model.imports || {};
  return !!(
    model.terrain?.length ||
    model.entities?.length ||
    model.points?.length ||
    model.notes?.length ||
    imports.lines?.length ||
    imports.polylines?.length ||
    imports.circles?.length ||
    imports.texts?.length
  );
}

function switchModelTab(tabId) {
  if (tabId === activeModelTabId) return;
  const tab = modelTabs.find((item) => item.id === tabId);
  if (!tab) return;
  syncActiveModelTab();
  activeModelTabId = tab.id;
  loadProjectIntoWorkspace(tab.project, `Aba ativa: ${tab.label}`);
}

function addModelTab() {
  syncActiveModelTab();
  const tab = createModelTab(`Modelo ${modelTabs.length + 1}`, createDefaultProject());
  modelTabs.push(tab);
  activeModelTabId = tab.id;
  loadProjectIntoWorkspace(tab.project, `${tab.label} criado`);
}

function closeModelTab(tabId) {
  if (modelTabs.length <= 1) {
    setStatus("Mantenha ao menos uma aba de modelo aberta");
    return;
  }
  const index = modelTabs.findIndex((item) => item.id === tabId);
  if (index < 0) return;
  const closingActive = tabId === activeModelTabId;
  if (!closingActive) syncActiveModelTab();
  const [closed] = modelTabs.splice(index, 1);
  if (closingActive) {
    const next = modelTabs[Math.max(0, index - 1)] || modelTabs[0];
    activeModelTabId = next.id;
    loadProjectIntoWorkspace(next.project, `${closed.label} fechado`);
    return;
  }
  drawModelTabs();
  setStatus(`${closed.label} fechado`);
}

function drawModelTabs() {
  const list = document.getElementById("modelTabsList");
  if (!list) return;
  list.innerHTML = "";
  modelTabs.forEach((tab) => {
    const wrap = document.createElement("div");
    wrap.className = tab.id === activeModelTabId ? "model-tab-wrap is-active" : "model-tab-wrap";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "model-tab";
    button.textContent = tab.label;
    button.addEventListener("click", () => switchModelTab(tab.id));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "model-tab-close";
    close.textContent = "x";
    close.title = `Fechar ${tab.label}`;
    close.setAttribute("aria-label", `Fechar ${tab.label}`);
    close.disabled = modelTabs.length <= 1;
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeModelTab(tab.id);
    });
    wrap.append(button, close);
    list.appendChild(wrap);
  });
}

function saveHistory(label) {
  const snapshot = projectSnapshot();
  const last = state.history[state.history.length - 1];
  if (last?.snapshot === snapshot) return;
  state.history.push({ snapshot, label, at: Date.now() });
  if (state.history.length > 60) state.history.shift();
  updateUndoState();
}

function undoLastCommand() {
  const last = state.history.pop();
  if (!last) {
    setStatus("Nada para desfazer");
    updateUndoState();
    return;
  }
  project = normalizeProject(JSON.parse(last.snapshot));
  state.selected = null;
  state.drag = null;
  state.measureStart = null;
  state.measureStartRef = null;
  state.drawStart = null;
  state.polyPoints = [];
  state.arcStep = null;
  state.formSnapshotArmed = false;
  bindProjectFields();
  refreshSelectionForm();
  updateDistanceList();
  updateUndoState();
  draw();
  setStatus(`Desfeito: ${last.label}`);
}

function updateUndoState() {
  const btn = document.getElementById("undoBtn");
  if (btn) btn.disabled = state.history.length === 0;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
  resizeProfileCanvas();
}

function resizeProfileCanvas() {
  if (!profileCanvas || !profileCtx) return;
  const rect = profileCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  if (rect.width < 1 || rect.height < 1) return;
  profileCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
  profileCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
  profileCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawProfile3D();
}

function screenSize() {
  const ratio = window.devicePixelRatio || 1;
  return { w: canvas.width / ratio, h: canvas.height / ratio };
}

function worldToScreen(p) {
  return {
    x: state.view.x + p.x * state.view.scale,
    y: state.view.y - p.y * state.view.scale
  };
}

function screenToWorld(p) {
  return {
    x: (p.x - state.view.x) / state.view.scale,
    y: (state.view.y - p.y) / state.view.scale
  };
}

function snapPoint(p, options = {}) {
  const updateMarker = options.updateMarker !== false;
  if (state.osnap.enabled) {
    const osnap = findOsnapPoint(p);
    if (osnap) {
      if (updateMarker) state.osnap.marker = osnap;
      return osnap.point;
    }
  }
  if (updateMarker) state.osnap.marker = null;
  if (!document.getElementById("snapToggle").checked) return p;
  const step = Number(document.getElementById("snapInput").value) || 0.5;
  return {
    x: Math.round(p.x / step) * step,
    y: Math.round(p.y / step) * step
  };
}

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits).replace(".", ",");
}

function parseNumber(value) {
  if (!hasValue(value)) return NaN;
  return Number(String(value).trim().replace(",", "."));
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function directDistanceValue() {
  const value = parseNumber(state.directDistance.text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function clearDirectDistance() {
  state.directDistance.text = "";
  state.directDistance.value = null;
}

function clearShortcutBuffer() {
  if (state.shortcut.timer) clearTimeout(state.shortcut.timer);
  state.shortcut.text = "";
  state.shortcut.timer = null;
}

function readStoredToolbarScale() {
  try {
    const stored = Number(localStorage.getItem(TOOLBAR_SCALE_STORAGE_KEY));
    if (Number.isFinite(stored)) return clamp(stored, TOOLBAR_SCALE_MIN, TOOLBAR_SCALE_MAX);
  } catch (error) {
    // Local storage may be unavailable when opened from restricted contexts.
  }
  return TOOLBAR_SCALE_DEFAULT;
}

function readStoredWorkspaceLayout() {
  try {
    const stored = JSON.parse(localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) || "null");
    if (stored && typeof stored === "object") {
      return {
        leftPanel: stored.leftPanel !== false,
        rightPanel: stored.rightPanel !== false,
        ribbon: stored.ribbon !== false
      };
    }
  } catch (error) {
    // Best-effort persistence only.
  }
  return { ...DEFAULT_WORKSPACE_LAYOUT };
}

function saveWorkspaceLayout() {
  try {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(state.workspaceLayout));
  } catch (error) {
    // Best-effort persistence only.
  }
}

function applyWorkspaceLayout(announce = false) {
  const app = document.querySelector(".app");
  if (!app) return;
  app.classList.toggle("layout-left-hidden", !state.workspaceLayout.leftPanel);
  app.classList.toggle("layout-right-hidden", !state.workspaceLayout.rightPanel);
  app.classList.toggle("layout-ribbon-hidden", !state.workspaceLayout.ribbon);
  const bindings = [
    ["toggleLeftPanelBtn", "leftPanel"],
    ["toggleRightPanelBtn", "rightPanel"],
    ["toggleRibbonBtn", "ribbon"]
  ];
  bindings.forEach(([id, key]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const active = !!state.workspaceLayout[key];
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  saveWorkspaceLayout();
  setTimeout(() => {
    resizeCanvas();
    resizeProfileCanvas();
  }, 0);
  if (announce) setStatus("Layout atualizado");
}

function setWorkspaceLayout(next, announce = true) {
  state.workspaceLayout = { ...state.workspaceLayout, ...next };
  applyWorkspaceLayout(announce);
}

function toggleWorkspacePart(part) {
  setWorkspaceLayout({ [part]: !state.workspaceLayout[part] });
}

function focusDrawingArea() {
  setWorkspaceLayout({ leftPanel: false, rightPanel: false, ribbon: false });
  setStatus("Area livre ativada");
}

function resetWorkspaceLayout() {
  state.workspaceLayout = { ...DEFAULT_WORKSPACE_LAYOUT };
  try {
    localStorage.removeItem(RIBBON_ORDER_STORAGE_KEY);
    localStorage.removeItem(RIBBON_BUTTON_ORDER_STORAGE_KEY);
    localStorage.removeItem(TOP_COMMAND_ORDER_STORAGE_KEY);
  } catch (error) {
    // Best-effort persistence only.
  }
  applyDefaultTopCommandOrder();
  applyDefaultRibbonOrder();
  applyDefaultRibbonButtonOrder();
  applyWorkspaceLayout(false);
  setStatus("Layout padrao restaurado");
}

function applyToolbarScale() {
  document.documentElement.style.setProperty("--toolbar-scale", String(state.toolbarScale));
  const value = document.getElementById("toolbarScaleValue");
  if (value) value.textContent = `${Math.round(state.toolbarScale * 100)}%`;
  const smaller = document.getElementById("toolbarSmallerBtn");
  const larger = document.getElementById("toolbarLargerBtn");
  if (smaller) smaller.disabled = state.toolbarScale <= TOOLBAR_SCALE_MIN + 0.001;
  if (larger) larger.disabled = state.toolbarScale >= TOOLBAR_SCALE_MAX - 0.001;
}

function setToolbarScale(value, announce = true) {
  const next = Math.round(clamp(value, TOOLBAR_SCALE_MIN, TOOLBAR_SCALE_MAX) * 100) / 100;
  state.toolbarScale = next;
  try {
    localStorage.setItem(TOOLBAR_SCALE_STORAGE_KEY, String(next));
  } catch (error) {
    // Best-effort persistence only.
  }
  applyToolbarScale();
  if (announce) setStatus(`Barra de ferramentas ${Math.round(next * 100)}%`);
}

function changeToolbarScale(delta) {
  setToolbarScale(state.toolbarScale + delta);
}

function quickActionsContainer() {
  return document.querySelector(".quick-actions");
}

function quickActionItems(container = quickActionsContainer()) {
  return Array.from(container?.children || []);
}

function quickActionKey(item) {
  if (!item) return "";
  if (item.id) return item.id;
  if (item.classList.contains("toolbar-scale-controls")) return "toolbarScaleControls";
  if (item.classList.contains("layout-controls")) return "layoutControls";
  if (item.classList.contains("manual-link")) return "manualLink";
  if (item.querySelector?.("#fileInput")) return "fileInputAction";
  if (item.querySelector?.("#pdfCadInput")) return "pdfCadInputAction";
  return item.dataset.key || item.textContent.trim().replace(/\s+/g, "_").toLowerCase();
}

function storedTopCommandOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(TOP_COMMAND_ORDER_STORAGE_KEY) || "null");
    if (Array.isArray(stored)) return stored.filter(Boolean);
  } catch (error) {
    // Best-effort persistence only.
  }
  return [];
}

function applyTopCommandOrder(order = storedTopCommandOrder()) {
  const container = quickActionsContainer();
  if (!container) return;
  const items = quickActionItems(container);
  const byKey = new Map(items.map((item) => [quickActionKey(item), item]));
  const used = new Set();
  order.forEach((key) => {
    const item = byKey.get(key);
    if (!item || used.has(key)) return;
    container.appendChild(item);
    used.add(key);
  });
  items.forEach((item) => {
    const key = quickActionKey(item);
    if (!used.has(key)) container.appendChild(item);
  });
}

function applyDefaultTopCommandOrder() {
  applyTopCommandOrder(DEFAULT_TOP_COMMAND_ORDER);
}

function saveTopCommandOrder() {
  const container = quickActionsContainer();
  if (!container) return;
  try {
    localStorage.setItem(TOP_COMMAND_ORDER_STORAGE_KEY, JSON.stringify(quickActionItems(container).map(quickActionKey)));
  } catch (error) {
    // Best-effort persistence only.
  }
}

function initializeTopCommandDrag() {
  const container = quickActionsContainer();
  if (!container) return;
  applyTopCommandOrder();
  let dragging = null;
  quickActionItems(container).forEach((item) => {
    item.draggable = true;
    item.classList.add("top-action-draggable");
  });
  container.addEventListener("dragstart", (event) => {
    const item = event.target.closest(".quick-actions > *");
    if (!item || event.target.closest("input, select, textarea")) return;
    dragging = item;
    item.classList.add("is-command-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", quickActionKey(item));
  });
  container.addEventListener("dragover", (event) => {
    if (!dragging) return;
    event.preventDefault();
    quickActionItems(container).forEach((item) => item.classList.remove("is-drop-target"));
    const target = event.target.closest(".quick-actions > *");
    if (!target || target === dragging) {
      container.appendChild(dragging);
      return;
    }
    target.classList.add("is-drop-target");
    const rect = target.getBoundingClientRect();
    const after = event.clientX > rect.left + rect.width / 2;
    container.insertBefore(dragging, after ? target.nextSibling : target);
  });
  container.addEventListener("drop", (event) => {
    if (!dragging) return;
    event.preventDefault();
    saveTopCommandOrder();
    setStatus("Caixa da barra superior reposicionada");
  });
  container.addEventListener("dragend", () => {
    quickActionItems(container).forEach((item) => item.classList.remove("is-command-dragging", "is-drop-target"));
    dragging = null;
    saveTopCommandOrder();
  });
}

function ribbonGroups() {
  return Array.from(document.querySelectorAll(".ribbon-group[data-toolbar-group]"));
}

function defaultRibbonOrder() {
  return ribbonGroups().map((group) => group.dataset.toolbarGroup);
}

function storedRibbonOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(RIBBON_ORDER_STORAGE_KEY) || "null");
    if (Array.isArray(stored)) return stored.filter(Boolean);
  } catch (error) {
    // Best-effort persistence only.
  }
  return [];
}

function applyRibbonOrder(order = storedRibbonOrder()) {
  const ribbon = document.querySelector(".ribbon");
  if (!ribbon) return;
  const groups = ribbonGroups();
  const byId = new Map(groups.map((group) => [group.dataset.toolbarGroup, group]));
  const used = new Set();
  order.forEach((id) => {
    const group = byId.get(id);
    if (!group || used.has(id)) return;
    ribbon.appendChild(group);
    used.add(id);
  });
  groups.forEach((group) => {
    if (!used.has(group.dataset.toolbarGroup)) ribbon.appendChild(group);
  });
}

function applyDefaultRibbonOrder() {
  applyRibbonOrder(["base", "draw", "modify", "annotation"]);
}

function saveRibbonOrder() {
  try {
    localStorage.setItem(RIBBON_ORDER_STORAGE_KEY, JSON.stringify(defaultRibbonOrder()));
  } catch (error) {
    // Best-effort persistence only.
  }
}

function ribbonButtonKey(button) {
  return button.id || button.dataset.tool || button.textContent.trim().replace(/\s+/g, "_").toLowerCase();
}

function ribbonButtonOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(RIBBON_BUTTON_ORDER_STORAGE_KEY) || "null");
    if (stored && typeof stored === "object") return stored;
  } catch (error) {
    // Best-effort persistence only.
  }
  return {};
}

function ribbonButtons(container) {
  return Array.from(container?.querySelectorAll(":scope > button") || []);
}

function captureDefaultRibbonButtonLayout() {
  ribbonGroups().forEach((group) => {
    const container = group.querySelector(".ribbon-tools");
    ribbonButtons(container).forEach((button, index) => {
      if (!button.dataset.defaultToolbarGroup) button.dataset.defaultToolbarGroup = group.dataset.toolbarGroup;
      if (!button.dataset.defaultToolbarOrder) button.dataset.defaultToolbarOrder = String(index);
    });
  });
}

function applyDefaultRibbonButtonOrder() {
  const groupsById = new Map(ribbonGroups().map((group) => [group.dataset.toolbarGroup, group]));
  const allButtons = Array.from(document.querySelectorAll(".ribbon-tools > button"));
  allButtons
    .sort((a, b) => Number(a.dataset.defaultToolbarOrder || 0) - Number(b.dataset.defaultToolbarOrder || 0))
    .forEach((button) => {
      const group = groupsById.get(button.dataset.defaultToolbarGroup);
      const container = group?.querySelector(".ribbon-tools");
      if (container) container.appendChild(button);
    });
}

function applyRibbonButtonOrder() {
  const order = ribbonButtonOrder();
  ribbonGroups().forEach((group) => {
    const container = group.querySelector(".ribbon-tools");
    if (!container) return;
    const buttons = ribbonButtons(container);
    const byKey = new Map(buttons.map((button) => [ribbonButtonKey(button), button]));
    const groupOrder = Array.isArray(order[group.dataset.toolbarGroup]) ? order[group.dataset.toolbarGroup] : [];
    const used = new Set();
    groupOrder.forEach((key) => {
      const button = byKey.get(key);
      if (!button || used.has(key)) return;
      container.appendChild(button);
      used.add(key);
    });
    buttons.forEach((button) => {
      const key = ribbonButtonKey(button);
      if (!used.has(key)) container.appendChild(button);
    });
  });
}

function saveRibbonButtonOrder() {
  const order = {};
  ribbonGroups().forEach((group) => {
    const container = group.querySelector(".ribbon-tools");
    order[group.dataset.toolbarGroup] = ribbonButtons(container).map(ribbonButtonKey);
  });
  try {
    localStorage.setItem(RIBBON_BUTTON_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch (error) {
    // Best-effort persistence only.
  }
}

function initializeRibbonButtonDrag() {
  captureDefaultRibbonButtonLayout();
  applyRibbonButtonOrder();
  const containers = Array.from(document.querySelectorAll(".ribbon-tools"));
  let draggingButton = null;
  containers.forEach((container) => {
    ribbonButtons(container).forEach((button) => {
      button.draggable = true;
      button.classList.add("toolbar-button-draggable");
    });
    container.addEventListener("dragstart", (event) => {
      const button = event.target.closest(".ribbon-tools > button");
      if (!button) return;
      draggingButton = button;
      button.classList.add("is-button-dragging");
      event.stopPropagation();
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", ribbonButtonKey(button));
    });
    container.addEventListener("dragover", (event) => {
      if (!draggingButton) return;
      event.preventDefault();
      const targetButton = event.target.closest(".ribbon-tools > button");
      if (!targetButton || targetButton === draggingButton) {
        container.appendChild(draggingButton);
        return;
      }
      const rect = targetButton.getBoundingClientRect();
      const after = event.clientX > rect.left + rect.width / 2;
      container.insertBefore(draggingButton, after ? targetButton.nextSibling : targetButton);
    });
    container.addEventListener("drop", (event) => {
      if (!draggingButton) return;
      event.preventDefault();
      event.stopPropagation();
      saveRibbonButtonOrder();
      setStatus("Botao reposicionado");
    });
    container.addEventListener("dragend", () => {
      if (draggingButton) draggingButton.classList.remove("is-button-dragging");
      draggingButton = null;
      saveRibbonButtonOrder();
    });
  });
}

function initializeRibbonDrag() {
  const ribbon = document.querySelector(".ribbon");
  if (!ribbon) return;
  applyRibbonOrder();
  let dragging = null;
  ribbon.addEventListener("dragstart", (event) => {
    if (event.target.closest(".ribbon-tools > button")) return;
    const group = event.target.closest(".ribbon-group[data-toolbar-group]");
    if (!group) return;
    dragging = group;
    group.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", group.dataset.toolbarGroup);
  });
  ribbon.addEventListener("dragover", (event) => {
    if (!dragging) return;
    const target = event.target.closest(".ribbon-group[data-toolbar-group]");
    if (!target || target === dragging) return;
    event.preventDefault();
    ribbonGroups().forEach((group) => group.classList.remove("is-drop-target"));
    target.classList.add("is-drop-target");
    const rect = target.getBoundingClientRect();
    const after = event.clientX > rect.left + rect.width / 2;
    ribbon.insertBefore(dragging, after ? target.nextSibling : target);
  });
  ribbon.addEventListener("drop", (event) => {
    if (!dragging) return;
    event.preventDefault();
    saveRibbonOrder();
    setStatus("Blocos da barra reorganizados");
  });
  ribbon.addEventListener("dragend", () => {
    ribbonGroups().forEach((group) => group.classList.remove("is-dragging", "is-drop-target"));
    dragging = null;
    saveRibbonOrder();
  });
}

function setDirectDistanceText(text) {
  state.directDistance.text = text;
  state.directDistance.value = directDistanceValue();
}

function directDistanceSuffix() {
  const value = directDistanceValue();
  return value ? ` | Dist ${fmt(value)} m` : state.directDistance.text ? ` | Dist ${state.directDistance.text}` : "";
}

function offsetPendingSuffix() {
  return state.offset ? ` | OFFSET ${fmt(Math.abs(state.offset.distance))} m` : "";
}

function canUseDirectDistance() {
  if (state.activeView !== "cad") return false;
  if (state.action) return true;
  return Boolean(state.drawStart && ["line", "road", "sidewalk", "circle"].includes(state.tool));
}

function directionPoint(base, target, length = null) {
  if (!base || !target) return target;
  const dx = target.x - base.x;
  const dy = target.y - base.y;
  const currentLength = Math.hypot(dx, dy);
  const requested = length ?? directDistanceValue();
  if (!requested || currentLength < 0.000001) return target;
  return {
    x: round(base.x + (dx / currentLength) * requested, 4),
    y: round(base.y + (dy / currentLength) * requested, 4)
  };
}

function directTarget(base, target) {
  return directionPoint(base, target, directDistanceValue());
}

function fmtElevation(value) {
  if (!hasValue(value)) return "";
  const normalized = String(value).trim().replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? fmt(number, 2) : String(value).trim();
}

function pointElevationLabel(point) {
  const elev = fmtElevation(point.elev);
  return elev ? `Cota ${elev} m` : "";
}

function pointElevationValue(point) {
  const elev = parseNumber(point.elev);
  return Number.isFinite(elev) ? elev : 0;
}

function pointDepthValue(point) {
  const depth = parseNumber(point.depth);
  return Number.isFinite(depth) && depth > 0 ? depth : 0;
}

function pointPileLengthValue(point) {
  const length = parseNumber(point.pileLength);
  return Number.isFinite(length) && length > 0 ? length : 0;
}

function pointHasRefusal(point) {
  const text = `${point.impenetrable ? "impenetravel" : ""} ${point.refusalType || ""} ${point.layersText || ""} ${point.note || ""}`;
  if (point.impenetrable === false && !hasValue(point.refusalType)) return false;
  if (/impenetravel|nega|recusa|matacao|rocha|bloco/i.test(removeAccents(text))) return true;
  return false;
  return /impenetravel|impenetravel|nega|recusa|matacao|matacao|matac[aã]o|rocha/i.test(removeAccents(text));
}

function pointRefusalDepthValue(point) {
  const refusal = parseNumber(point.refusalDepth);
  if (Number.isFinite(refusal) && refusal > 0) return refusal;
  const text = removeAccents(`${point.layersText || ""}\n${point.note || ""}`).toLowerCase();
  const after = text.match(/(?:impenetravel|nega|recusa|matacao|rocha|bloco)[^\d]{0,28}(\d+(?:[,.]\d+)?)/i);
  if (after) {
    const value = parseNumber(after[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const before = text.match(/(\d+(?:[,.]\d+)?)\s*m?[^\n;]{0,28}(?:impenetravel|nega|recusa|matacao|rocha|bloco)/i);
  if (before) {
    const value = parseNumber(before[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return pointDepthValue(point);
}

function pointRefusalKind(point) {
  const text = removeAccents(`${point.refusalType || ""} ${point.layersText || ""} ${point.note || ""}`).toLowerCase();
  if (text.includes("matacao") || text.includes("bloco")) return "matacao";
  if (text.includes("rocha")) return "rocha";
  return pointHasRefusal(point) ? "rocha" : "none";
}

function pointRefusalName(point) {
  const kind = pointRefusalKind(point);
  if (kind === "matacao") return "Matacao / bloco";
  if (kind === "rocha") return "Rocha impenetravel";
  return "Rocha / matacao";
}

function refusalTypeLabel(choice) {
  if (choice === "matacao") return "Matacao / bloco";
  if (choice === "rocha") return "Rocha impenetravel";
  return "";
}

function pointModelDepthValue(point) {
  const drilledDepth = pointDepthValue(point);
  const pileLength = pointPileLengthValue(point);
  let modelDepth = Math.max(1, drilledDepth, pileLength);
  if (pointHasRefusal(point)) {
    const refusal = pointRefusalDepthValue(point) || drilledDepth || pileLength || modelDepth;
    modelDepth = Math.max(modelDepth, refusal + Math.max(1.2, modelDepth * 0.14));
  }
  return modelDepth;
}

function removeAccents(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isOrthoActive() {
  if (state.ortho.mode === "off") return false;
  if (state.ortho.mode === "shift") return state.ortho.shiftDown;
  return state.ortho.enabled;
}

function orthoBaseForTool() {
  if (state.action?.base) return state.action.base;
  if ((state.tool === "line" || state.tool === "road" || state.tool === "sidewalk") && state.drawStart) return state.drawStart;
  if (state.tool === "circle" && state.drawStart) return state.drawStart;
  if (state.tool === "polyline" && state.polyPoints.length) return state.polyPoints[state.polyPoints.length - 1];
  if ((state.tool === "dimension" || state.tool === "dimensionContinue") && state.measureStart) return state.measureStart;
  return null;
}

function applyOrtho(point, base) {
  if (!base || !isOrthoActive()) return point;
  const dx = point.x - base.x;
  const dy = point.y - base.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? { x: point.x, y: base.y }
    : { x: base.x, y: point.y };
}

function applyDraftConstraints(point) {
  return applyOrtho(point, orthoBaseForTool());
}

function draw() {
  const { w, h } = screenSize();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, w, h);

  if (state.layers.grid) drawGrid(w, h);
  if (state.layers.imports) drawImports();
  if (state.layers.terrain) drawTerrain();
  if (state.layers.drawings) drawEntities();
  if (state.layers.dimensions) drawDimensions();
  if (state.layers.points) drawPoints();
  if (state.layers.notes) drawNotes();
  drawCadPreview();
  drawActionPreview();
  drawMeasurePreview();
  drawSelection();
  drawOsnapMarker();
  updateStats();
  if (state.activeView === "profile") drawProfile3D();
}

function drawGrid(w, h) {
  const gridStep = Number(document.getElementById("gridStepInput").value) || 2;
  const minor = gridStep * state.view.scale;
  if (minor < 7) return;
  const topLeft = screenToWorld({ x: 0, y: 0 });
  const bottomRight = screenToWorld({ x: w, y: h });
  const minX = Math.floor(topLeft.x / gridStep) * gridStep;
  const maxX = Math.ceil(bottomRight.x / gridStep) * gridStep;
  const minY = Math.floor(bottomRight.y / gridStep) * gridStep;
  const maxY = Math.ceil(topLeft.y / gridStep) * gridStep;

  ctx.save();
  ctx.lineWidth = 1;
  for (let x = minX; x <= maxX; x += gridStep) {
    const s = worldToScreen({ x, y: 0 });
    ctx.strokeStyle = Math.abs(x % (gridStep * 5)) < 0.001 ? "#d9dfd5" : "#edf1ea";
    line(s.x, 0, s.x, h);
  }
  for (let y = minY; y <= maxY; y += gridStep) {
    const s = worldToScreen({ x: 0, y });
    ctx.strokeStyle = Math.abs(y % (gridStep * 5)) < 0.001 ? "#d9dfd5" : "#edf1ea";
    line(0, s.y, w, s.y);
  }
  const origin = worldToScreen({ x: 0, y: 0 });
  ctx.strokeStyle = "#b9c7b4";
  line(origin.x, 0, origin.x, h);
  line(0, origin.y, w, origin.y);
  ctx.restore();
}

function drawTerrain() {
  if (!project.terrain.length) return;
  ctx.save();
  ctx.beginPath();
  project.terrain.forEach((p, i) => {
    const s = worldToScreen(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(47, 111, 69, 0.08)";
  ctx.strokeStyle = "#2f6f45";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  project.terrain.forEach((p, i) => {
    const a = p;
    const b = project.terrain[(i + 1) % project.terrain.length];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const d = distance(a, b);
    const s = worldToScreen(mid);
    drawLabel(`${fmt(d)} m`, s.x, s.y, "#2f6f45", "rgba(255,255,255,0.86)");
  });

  project.terrain.forEach((p, index) => {
    const s = worldToScreen(p);
    ctx.fillStyle = isSelected("vertex", index) ? "#bd7d20" : "#ffffff";
    ctx.strokeStyle = "#2f6f45";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawEntities() {
  ctx.save();
  project.entities.forEach((entity) => {
    const selected = isSelected("entity", entity.id);
    ctx.strokeStyle = selected ? "#bd7d20" : "#345f89";
    ctx.fillStyle = "rgba(52, 95, 137, 0.08)";
    ctx.lineWidth = selected ? 2.4 : 1.7;
    ctx.setLineDash([]);
    if (entity.type === "road") {
      drawRoadEntity(entity, selected);
      return;
    }
    if (entity.type === "sidewalk") {
      drawSidewalkEntity(entity, selected);
      return;
    }
    if (entity.type === "line") {
      const a = worldToScreen(entity.a);
      const b = worldToScreen(entity.b);
      line(a.x, a.y, b.x, b.y);
    }
    if (entity.type === "polyline") {
      if (entity.layer === "PASSEIO" || entity.layer === "RUA") {
        drawLayeredAreaPolyline(entity, selected);
        return;
      }
      drawPolyline(entity.points, entity.closed);
    }
    if (entity.type === "circle") {
      const c = worldToScreen(entity.center);
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.abs(entity.r * state.view.scale), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (entity.type === "arc") {
      drawArcEntity(entity);
    }
  });
  ctx.restore();
}

function drawLayeredAreaPolyline(entity, selected = false) {
  const screenPoints = entity.points.map(worldToScreen);
  if (screenPoints.length < 2) return;
  ctx.save();
  ctx.beginPath();
  screenPoints.forEach((p, index) => {
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  if (entity.closed) ctx.closePath();
  if (entity.layer === "RUA") {
    ctx.fillStyle = selected ? "#5c5f61" : "#464a4d";
    ctx.strokeStyle = selected ? "#bd7d20" : "#24282a";
  } else {
    ctx.fillStyle = selected ? "rgba(218, 207, 184, 0.94)" : "rgba(221, 213, 195, 0.86)";
    ctx.strokeStyle = selected ? "#bd7d20" : "#9b927f";
  }
  ctx.lineWidth = selected ? 2.4 : 1.5;
  if (entity.closed) ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRoadEntity(entity, selected = false) {
  const points = roadPolygon(entity);
  if (!points.length) return;
  const screenPoints = points.map(worldToScreen);
  ctx.save();
  ctx.beginPath();
  screenPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = selected ? "#5c5f61" : "#464a4d";
  ctx.strokeStyle = selected ? "#bd7d20" : "#24282a";
  ctx.lineWidth = selected ? 2.4 : 1.6;
  ctx.fill();
  ctx.stroke();

  const a = worldToScreen(entity.a);
  const b = worldToScreen(entity.b);
  ctx.strokeStyle = "#d9c55e";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([10, 8]);
  line(a.x, a.y, b.x, b.y);
  ctx.restore();
}

function drawSidewalkEntity(entity, selected = false) {
  const points = roadPolygon(entity, DEFAULT_SIDEWALK_WIDTH);
  if (!points.length) return;
  const screenPoints = points.map(worldToScreen);
  ctx.save();
  ctx.beginPath();
  screenPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = selected ? "rgba(218, 207, 184, 0.94)" : "rgba(221, 213, 195, 0.86)";
  ctx.strokeStyle = selected ? "#bd7d20" : "#9b927f";
  ctx.lineWidth = selected ? 2.4 : 1.5;
  ctx.fill();
  ctx.stroke();

  const a = worldToScreen(entity.a);
  const b = worldToScreen(entity.b);
  ctx.strokeStyle = "#f5f1df";
  ctx.lineWidth = 1.1;
  ctx.setLineDash([6, 5]);
  line(a.x, a.y, b.x, b.y);
  ctx.setLineDash([]);
  ctx.strokeStyle = "#6f756d";
  ctx.lineWidth = 1.2;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const p1 = worldToScreen(point);
    const p2 = worldToScreen(next);
    line(p1.x, p1.y, p2.x, p2.y);
  });
  ctx.restore();
}

function drawPolyline(points, closed) {
  if (!points?.length) return;
  ctx.beginPath();
  points.forEach((p, i) => {
    const s = worldToScreen(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  if (closed) ctx.closePath();
  if (closed) ctx.fill();
  ctx.stroke();
}

function drawArcEntity(entity) {
  const c = worldToScreen(entity.center);
  const r = Math.abs(entity.r * state.view.scale);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, -entity.end, -entity.start, true);
  ctx.stroke();
}

function drawPoints() {
  ctx.save();
  project.points.forEach((p) => {
    const s = worldToScreen(p);
    const selected = isSelected("point", p.id);
    ctx.strokeStyle = selected ? "#bd7d20" : "#2b67b1";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = selected ? 3 : 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - 11, s.y);
    ctx.lineTo(s.x + 11, s.y);
    ctx.moveTo(s.x, s.y - 11);
    ctx.lineTo(s.x, s.y + 11);
    ctx.stroke();
    drawLabel(p.name, s.x + 12, s.y - 14, "#1e477b", "rgba(255,255,255,0.92)", "left");
    const coord = `X ${fmt(p.x, 2)}  Y ${fmt(p.y, 2)}`;
    drawTinyText(coord, s.x + 12, s.y + 16, "#657061", "left");
    const elev = pointElevationLabel(p);
    if (elev) drawTinyText(elev, s.x + 12, s.y + 30, "#3d674b", "left");
  });
  ctx.restore();
}

function drawNotes() {
  ctx.save();
  ctx.font = "13px Segoe UI, Arial";
  project.notes.forEach((n) => {
    const s = worldToScreen(n);
    drawLabel(n.text, s.x, s.y, isSelected("note", n.id) ? "#bd7d20" : "#20251f", "rgba(255,255,255,0.86)", "center");
  });
  ctx.restore();
}

function drawDimensions() {
  ctx.save();
  ctx.lineWidth = 1.5;
  project.dimensions.forEach((d) => {
    const a = resolveRefPoint(d.a);
    const b = resolveRefPoint(d.b);
    if (!a || !b) return;
    const isAutoDimension = d.kind === "auto" || d.kind === "auto-xy";
    drawDimensionLine(a, b, d.label || `${fmt(distance(a, b))} m`, isAutoDimension ? "#bd7d20" : "#6d5b38", {
      offset: d.offset,
      selected: isSelected("dimension", d.id)
    });
  });
  ctx.restore();
}

function dimensionOffset(dimension, a = null, b = null) {
  const offset = dimension?.offset && Number.isFinite(dimension.offset.x) && Number.isFinite(dimension.offset.y)
    ? dimension.offset
    : { x: 0, y: 0 };
  return a && b ? projectDimensionOffset(a, b, offset) : offset;
}

function dimensionNormal(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: -dy / length, y: dx / length };
}

function projectDimensionOffset(a, b, offset = { x: 0, y: 0 }) {
  const normal = dimensionNormal(a, b);
  const amount = (offset.x || 0) * normal.x + (offset.y || 0) * normal.y;
  return {
    x: round(normal.x * amount, 4),
    y: round(normal.y * amount, 4)
  };
}

function offsetWorldPoint(point, offset) {
  return { x: point.x + offset.x, y: point.y + offset.y };
}

function dimensionWorldGeometry(a, b, offset = { x: 0, y: 0 }) {
  const straightOffset = projectDimensionOffset(a, b, offset);
  const da = offsetWorldPoint(a, straightOffset);
  const db = offsetWorldPoint(b, straightOffset);
  return {
    a,
    b,
    da,
    db,
    offset: straightOffset,
    label: { x: (da.x + db.x) / 2, y: (da.y + db.y) / 2 }
  };
}

function drawDimensionLine(a, b, label, color, options = {}) {
  const offset = dimensionOffset(options);
  const geom = dimensionWorldGeometry(a, b, offset);
  const sa = worldToScreen(geom.a);
  const sb = worldToScreen(geom.b);
  const sda = worldToScreen(geom.da);
  const sdb = worldToScreen(geom.db);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (Math.hypot(geom.offset.x, geom.offset.y) > 0.001) {
    ctx.save();
    ctx.strokeStyle = options.selected ? "#bd7d20" : "rgba(109,91,56,0.65)";
    ctx.setLineDash([3, 4]);
    line(sa.x, sa.y, sda.x, sda.y);
    line(sb.x, sb.y, sdb.x, sdb.y);
    ctx.restore();
  }
  ctx.lineWidth = options.selected ? 2.3 : 1.5;
  ctx.setLineDash([]);
  line(sda.x, sda.y, sdb.x, sdb.y);
  ctx.setLineDash([]);
  drawArrow(sda, sdb, color);
  drawArrow(sdb, sda, color);
  const mid = { x: (sda.x + sdb.x) / 2, y: (sda.y + sdb.y) / 2 };
  drawLabel(label, mid.x, mid.y - 8, options.selected ? "#8b5d18" : color, "rgba(255,255,255,0.92)");
  if (options.selected) {
    ctx.save();
    ctx.strokeStyle = "#bd7d20";
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(mid.x - 40, mid.y - 22, 80, 28);
    ctx.restore();
  }
}

function drawArrow(from, to, color) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 7;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + Math.cos(angle + 0.45) * size, from.y + Math.sin(angle + 0.45) * size);
  ctx.lineTo(from.x + Math.cos(angle - 0.45) * size, from.y + Math.sin(angle - 0.45) * size);
  ctx.closePath();
  ctx.fill();
}

function drawImports() {
  const imp = project.imports;
  ctx.save();
  ctx.strokeStyle = "rgba(32, 37, 31, 0.45)";
  ctx.fillStyle = "rgba(32, 37, 31, 0.5)";
  ctx.lineWidth = 1;

  imp.lines.forEach((l) => {
    const a = worldToScreen(l.a);
    const b = worldToScreen(l.b);
    line(a.x, a.y, b.x, b.y);
  });

  imp.polylines.forEach((poly) => {
    if (!poly.points.length) return;
    ctx.beginPath();
    poly.points.forEach((p, i) => {
      const s = worldToScreen(p);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    if (poly.closed) ctx.closePath();
    ctx.stroke();
  });

  imp.circles.forEach((c) => {
    const s = worldToScreen(c);
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(2, Math.abs(c.r * state.view.scale)), 0, Math.PI * 2);
    ctx.stroke();
  });

  imp.texts.forEach((t) => {
    const s = worldToScreen(t);
    drawTinyText(t.text, s.x, s.y, "rgba(32,37,31,0.65)", "left");
  });
  ctx.restore();
}

function drawCadPreview() {
  ctx.save();
  ctx.strokeStyle = "#bd7d20";
  ctx.fillStyle = "rgba(189, 125, 32, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  const current = applyDraftConstraints(state.mouseWorld);

  if ((state.tool === "line" || state.tool === "rectangle" || state.tool === "circle" || state.tool === "road" || state.tool === "sidewalk") && state.drawStart) {
    const directed = directTarget(state.drawStart, current);
    if (state.tool === "line") {
      const a = worldToScreen(state.drawStart);
      const b = worldToScreen(directed);
      line(a.x, a.y, b.x, b.y);
      drawTinyText(`${fmt(distance(state.drawStart, directed))} m`, b.x + 10, b.y - 10, "#8b5d18", "left");
    }
    if (state.tool === "rectangle") {
      drawPolyline(rectanglePoints(state.drawStart, current), true);
    }
    if (state.tool === "circle") {
      const c = worldToScreen(state.drawStart);
      ctx.beginPath();
      ctx.arc(c.x, c.y, distance(state.drawStart, directed) * state.view.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.tool === "road") {
      drawRoadEntity({ a: state.drawStart, b: directed, width: DEFAULT_ROAD_WIDTH }, true);
    }
    if (state.tool === "sidewalk") {
      drawSidewalkEntity({ a: state.drawStart, b: directed, width: DEFAULT_SIDEWALK_WIDTH }, true);
    }
  }

  if (state.tool === "polyline" && state.polyPoints.length) {
    drawPolyline([...state.polyPoints, current], false);
  }

  if (state.tool === "arc" && state.arcStep) {
    if (state.arcStep.phase === "radius") {
      const c = worldToScreen(state.arcStep.center);
      const p = worldToScreen(current);
      line(c.x, c.y, p.x, p.y);
      ctx.beginPath();
      ctx.arc(c.x, c.y, distance(state.arcStep.center, current) * state.view.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.arcStep.phase === "end") {
      const start = angleBetween(state.arcStep.center, state.arcStep.startPoint);
      const end = angleBetween(state.arcStep.center, current);
      drawArcEntity({ center: state.arcStep.center, r: state.arcStep.r, start, end });
    }
  }
  ctx.restore();
}

function drawActionPreview() {
  if (!state.action?.base) return;
  const target = directTarget(state.action.base, applyDraftConstraints(state.mouseWorld));
  const dx = target.x - state.action.base.x;
  const dy = target.y - state.action.base.y;
  const start = worldToScreen(state.action.base);
  const end = worldToScreen(target);
  ctx.save();
  ctx.strokeStyle = state.action.type === "copy" ? "#2b67b1" : "#bd7d20";
  ctx.fillStyle = state.action.type === "copy" ? "rgba(43, 103, 177, 0.08)" : "rgba(189, 125, 32, 0.08)";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  line(start.x, start.y, end.x, end.y);
  drawArrow(end, start, ctx.strokeStyle);
  const bounds = selectionBounds(state.selected);
  if (bounds) {
    const a = worldToScreen({ x: bounds.minX + dx, y: bounds.minY + dy });
    const b = worldToScreen({ x: bounds.maxX + dx, y: bounds.maxY + dy });
    ctx.strokeRect(a.x, b.y, b.x - a.x, a.y - b.y);
  }
  const label = `${state.action.type === "copy" ? "Copiar" : "Move"} ${fmt(Math.hypot(dx, dy))} m`;
  drawLabel(label, end.x, end.y - 18, ctx.strokeStyle, "rgba(255,255,255,0.94)");
  ctx.restore();
}

function drawMeasurePreview() {
  if (!state.measureStart || (state.tool !== "dimension" && state.tool !== "dimensionContinue")) return;
  const end = state.mouseWorld;
  const constrained = applyOrtho(end, state.measureStart);
  drawDimensionLine(state.measureStart, constrained, `${fmt(distance(state.measureStart, constrained))} m`, "#bd7d20");
}

function drawOsnapMarker() {
  const marker = state.osnap.marker;
  if (!marker || !state.osnap.enabled) return;
  const s = worldToScreen(marker.point);
  ctx.save();
  ctx.strokeStyle = "#e11919";
  ctx.fillStyle = "rgba(225, 25, 25, 0.08)";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([]);
  if (marker.type === "endpoint" || marker.type === "node") {
    ctx.strokeRect(s.x - 6, s.y - 6, 12, 12);
  } else if (marker.type === "midpoint") {
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 7);
    ctx.lineTo(s.x + 7, s.y + 7);
    ctx.lineTo(s.x - 7, s.y + 7);
    ctx.closePath();
    ctx.stroke();
  } else if (marker.type === "center") {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    line(s.x - 9, s.y, s.x + 9, s.y);
    line(s.x, s.y - 9, s.x, s.y + 9);
  } else if (marker.type === "intersection") {
    line(s.x - 8, s.y - 8, s.x + 8, s.y + 8);
    line(s.x - 8, s.y + 8, s.x + 8, s.y - 8);
  } else if (marker.type === "quadrant") {
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 7);
    ctx.lineTo(s.x + 7, s.y);
    ctx.lineTo(s.x, s.y + 7);
    ctx.lineTo(s.x - 7, s.y);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawTinyText(osnapLabel(marker.type), s.x + 10, s.y - 12, "#e11919", "left");
  ctx.restore();
}

function drawProfile3D() {
  if (!profileCanvas || !profileCtx) return;
  const { w, h } = profileScreenSize();
  if (w < 20 || h < 20) return;
  drawProfileBackground(w, h);

  const points = project.points.filter((p) => Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)));
  updateProfileStats(points);
  if (!points.length) {
    profileCtx.fillStyle = "#657061";
    profileCtx.font = "13px Segoe UI, Arial";
    profileCtx.fillText("Sem pontos SP para perfil 3D", 24, 36);
    return;
  }

  const ext = modelExtents();
  const depthMax = Math.max(4, ...points.map(pointModelDepthValue));
  const zTop = Math.max(...points.map(pointElevationValue), 0);
  const zBottom = Math.min(...points.map((p) => pointElevationValue(p) - pointModelDepthValue(p)), zTop - depthMax);
  const signature = profileModelSignature(points, ext, zTop, zBottom);
  if (signature !== state.profile.modelSignature) {
    state.profile.modelSignature = signature;
    if (!state.profile.userAdjusted) resetProfileCamera(false);
  }
  const transform = profileTransform(ext, zTop, zBottom, w, h);
  drawProfileBlock(points, ext, transform, zBottom);
  drawProfileLayerSides(points, ext, transform, zBottom);
  drawProfileSurface(points, ext, transform);
  drawProfileDimensions(transform, points);
  drawBoreholes(points, transform);
  drawProfileAxes(ext, transform, zBottom);
  drawProfileLegend(points);
  updateProfileStatus();
}

function profileScreenSize() {
  const ratio = window.devicePixelRatio || 1;
  return { w: profileCanvas.width / ratio, h: profileCanvas.height / ratio };
}

function profileTransform(ext, zTop, zBottom, w, h) {
  const exag = Number(document.getElementById("profileExaggerationInput")?.value) || 3;
  const projection = profileProjection();
  const minX = Number.isFinite(ext.minX) ? ext.minX : 0;
  const minY = Number.isFinite(ext.minY) ? ext.minY : 0;
  const maxX = Number.isFinite(ext.maxX) ? ext.maxX : minX + 40;
  const maxY = Number.isFinite(ext.maxY) ? ext.maxY : minY + 30;
  const raw = (p) => {
    const z = Number.isFinite(p.z) ? p.z : interpolateTerrainZ(p.x, p.y, project.points);
    const x = p.x - minX;
    const y = p.y - minY;
    const depth = z - zBottom;
    return {
      x: x * projection.xx + y * projection.xy,
      y: x * projection.yx + y * projection.yy - depth * projection.zy * exag
    };
  };
  const corners = [];
  [minX, maxX].forEach((x) => {
    [minY, maxY].forEach((y) => {
      [zTop, zBottom].forEach((z) => corners.push(raw({ x, y, z })));
    });
  });
  const minRawX = Math.min(...corners.map((p) => p.x));
  const maxRawX = Math.max(...corners.map((p) => p.x));
  const minRawY = Math.min(...corners.map((p) => p.y));
  const maxRawY = Math.max(...corners.map((p) => p.y));
  const rawWidth = Math.max(1, maxRawX - minRawX);
  const rawHeight = Math.max(1, maxRawY - minRawY);
  const scale = Math.max(3, Math.min((w - 120) / rawWidth, (h - 115) / rawHeight));
  const baseOrigin = {
    x: w / 2 - ((minRawX + maxRawX) / 2) * scale,
    y: h / 2 - ((minRawY + maxRawY) / 2) * scale + 10
  };
  const center = { x: w / 2, y: h / 2 };
  return (p) => {
    const projected = raw(p);
    const base = {
      x: baseOrigin.x + projected.x * scale,
      y: baseOrigin.y + projected.y * scale
    };
    return {
      x: center.x + (base.x - center.x) * state.profile.zoom + state.profile.x,
      y: center.y + (base.y - center.y) * state.profile.zoom + state.profile.y
    };
  };
}

function profileProjection() {
  const yaw = (Number.isFinite(state.profile.yaw) ? state.profile.yaw : PROFILE_ORBIT_PRESETS.iso.yaw) * Math.PI / 180;
  const pitch = clamp(Number.isFinite(state.profile.pitch) ? state.profile.pitch : PROFILE_ORBIT_PRESETS.iso.pitch, PROFILE_PITCH_MIN, PROFILE_PITCH_MAX) * Math.PI / 180;
  const sinPitch = Math.sin(pitch);
  return {
    xx: Math.cos(yaw),
    xy: Math.sin(yaw),
    yx: Math.sin(yaw) * sinPitch,
    yy: -Math.cos(yaw) * sinPitch,
    zy: Math.max(0.025, Math.cos(pitch) * 0.26)
  };
}

function profileOrientationLabel() {
  const labels = {
    iso: "ISO",
    top: "TOP",
    front: "N",
    back: "S",
    right: "E",
    left: "W"
  };
  if (state.profile.orientation === "orbit") {
    return `ORB ${Math.round(normalizeProfileYaw(state.profile.yaw))}/${Math.round(state.profile.pitch)}`;
  }
  return labels[state.profile.orientation] || "ISO";
}

function drawProfileBackground(w, h) {
  profileCtx.clearRect(0, 0, w, h);
  profileCtx.fillStyle = "#f5f7f2";
  profileCtx.fillRect(0, 0, w, h);
  profileCtx.save();
  profileCtx.strokeStyle = "rgba(128, 145, 125, 0.12)";
  profileCtx.lineWidth = 1;
  for (let x = 0; x <= w; x += 42) {
    profileCtx.beginPath();
    profileCtx.moveTo(x, 0);
    profileCtx.lineTo(x, h);
    profileCtx.stroke();
  }
  for (let y = 0; y <= h; y += 42) {
    profileCtx.beginPath();
    profileCtx.moveTo(0, y);
    profileCtx.lineTo(w, y);
    profileCtx.stroke();
  }
  profileCtx.restore();
}

function profileModelSignature(points, ext, zTop, zBottom) {
  return [
    round(ext.minX, 2),
    round(ext.minY, 2),
    round(ext.maxX, 2),
    round(ext.maxY, 2),
    round(zTop, 2),
    round(zBottom, 2),
    points.map((p) => `${p.id}:${round(p.x, 2)},${round(p.y, 2)},${round(pointElevationValue(p), 2)},${round(pointDepthValue(p), 2)},${round(pointModelDepthValue(p), 2)},${String(p.layersText || "").trim()},${p.pileLength || ""},${p.impenetrable ? 1 : 0},${p.refusalDepth || ""},${p.refusalType || ""}`).join("|")
  ].join(";");
}

function resetProfileCamera(redraw = true) {
  state.profile.zoom = 1;
  state.profile.x = 0;
  state.profile.y = 0;
  state.profile.drag = null;
  state.profile.userAdjusted = false;
  if (profileCanvas) profileCanvas.classList.remove("is-panning", "is-orbiting");
  updateProfileStatus();
  if (redraw) drawProfile3D();
}

function updateProfileStatus() {
  const status = document.getElementById("profileStatusText");
  if (!status) return;
  const zoom = Math.round(state.profile.zoom * 100);
  const view = profileOrientationLabel();
  const action = state.profile.drag?.mode === "orbit" ? "Orbita 3D" : state.profile.drag ? "Pan 3D" : "Perfil 3D";
  status.textContent = `${action} ${view} | Zoom ${zoom}%`;
  updateProfileNavigationUi();
}

function normalizeProfileYaw(yaw) {
  if (!Number.isFinite(yaw)) return PROFILE_ORBIT_PRESETS.iso.yaw;
  return ((yaw + 180) % 360 + 360) % 360 - 180;
}

function setProfileOrbit(yaw, pitch, redraw = true) {
  state.profile.orientation = "orbit";
  state.profile.yaw = normalizeProfileYaw(yaw);
  state.profile.pitch = clamp(pitch, PROFILE_PITCH_MIN, PROFILE_PITCH_MAX);
  state.profile.userAdjusted = true;
  if (redraw) drawProfile3D();
  else updateProfileStatus();
}

function rotateProfileOrbit(deltaYaw, deltaPitch = 0) {
  setProfileOrbit(state.profile.yaw + deltaYaw, state.profile.pitch + deltaPitch, true);
  setStatus(`Orbita 3D ${Math.round(state.profile.yaw)}/${Math.round(state.profile.pitch)}`);
}

function setProfileOrientation(orientation) {
  const allowed = ["iso", "top", "front", "back", "right", "left"];
  state.profile.orientation = allowed.includes(orientation) ? orientation : "iso";
  const preset = PROFILE_ORBIT_PRESETS[state.profile.orientation] || PROFILE_ORBIT_PRESETS.iso;
  state.profile.yaw = preset.yaw;
  state.profile.pitch = preset.pitch;
  resetProfileCamera(false);
  setStatus(`Vista 3D ${profileOrientationLabel()}`);
  drawProfile3D();
}

function setProfileViewCubeVisible(visible) {
  state.profile.viewCubeVisible = !!visible;
  updateProfileNavigationUi();
  setStatus(state.profile.viewCubeVisible ? "NAVVCUBE ON" : "NAVVCUBE OFF");
}

function toggleProfileViewCube() {
  setProfileViewCubeVisible(!state.profile.viewCubeVisible);
}

function setProfileNavBarVisible(visible) {
  state.profile.navBarVisible = !!visible;
  updateProfileNavigationUi();
  setStatus(state.profile.navBarVisible ? "NAVBAR ON" : "NAVBAR OFF");
}

function toggleProfileNavBar() {
  setProfileNavBarVisible(!state.profile.navBarVisible);
}

function updateProfileNavigationUi() {
  const cube = document.getElementById("viewCube");
  if (cube) cube.classList.toggle("hidden", !state.profile.viewCubeVisible);
  const nav = document.getElementById("profileNavBar");
  if (nav) nav.classList.toggle("hidden", !state.profile.navBarVisible);
  document.querySelectorAll("[data-profile-view]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.profileView === state.profile.orientation);
  });
}

function drawProfileBlock(points, ext, project3d, zBottom) {
  const minX = ext.minX;
  const minY = ext.minY;
  const maxX = ext.maxX;
  const maxY = ext.maxY;
  const bottom = [
    project3d({ x: minX, y: minY, z: zBottom }),
    project3d({ x: maxX, y: minY, z: zBottom }),
    project3d({ x: maxX, y: maxY, z: zBottom }),
    project3d({ x: minX, y: maxY, z: zBottom })
  ];
  drawProfilePolygon(bottom, "rgba(111, 115, 118, 0.18)", "rgba(78, 82, 84, 0.28)", 1);
}

function drawProfileLayerSides(points, ext, project3d, zBottom) {
  drawProfileLayerSideX(points, ext, project3d, ext.minY, 0.44, false);
  drawProfileLayerSideY(points, ext, project3d, ext.minX, 0.42, false);
  drawProfileLayerSideX(points, ext, project3d, ext.maxY, 0.9, true);
  drawProfileLayerSideY(points, ext, project3d, ext.maxX, 0.78, false);
  drawProfileVolumeEdges(ext, project3d, zBottom);
}

function drawProfileLayerSideX(points, ext, project3d, y, opacity = 0.84, label = true) {
  const cols = 30;
  const layerCount = profileLayerCount(points);
  const dx = Math.max(1, ext.maxX - ext.minX);
  for (let layerIndex = layerCount - 1; layerIndex >= 0; layerIndex -= 1) {
    const top = [];
    const bottom = [];
    for (let i = 0; i <= cols; i += 1) {
      const x = ext.minX + dx * i / cols;
      const layer = profileLayerAt(x, y, points, layerIndex);
      if (!layer) continue;
      const terrainZ = interpolateTerrainZ(x, y, points);
      top.push(project3d({ x, y, z: terrainZ - layer.top }));
      bottom.push(project3d({ x, y, z: terrainZ - layer.bottom }));
    }
    if (top.length < 2 || bottom.length < 2) continue;
    const poly = [...top, ...bottom.reverse()];
    const midX = ext.minX + dx / 2;
    const name = soilLayerNameAt(midX, y, points, layerIndex);
    const color = soilColor(name);
    drawProfilePolygon(poly, withAlpha(color, opacity), withAlpha(color, Math.min(0.98, opacity + 0.12)), label ? 1.25 : 0.85);
    drawProfileHatch(poly, name, color);
    drawProfileBoundaryLine(top, withAlpha("#1f2a20", label ? 0.34 : 0.18), label ? 1.1 : 0.8);
    if (label) drawProfileLayerText(poly, name);
  }
}

function drawProfileLayerSideY(points, ext, project3d, x, opacity = 0.76, label = false) {
  const rows = 24;
  const layerCount = profileLayerCount(points);
  const dy = Math.max(1, ext.maxY - ext.minY);
  for (let layerIndex = layerCount - 1; layerIndex >= 0; layerIndex -= 1) {
    const top = [];
    const bottom = [];
    for (let i = 0; i <= rows; i += 1) {
      const y = ext.minY + dy * i / rows;
      const layer = profileLayerAt(x, y, points, layerIndex);
      if (!layer) continue;
      const terrainZ = interpolateTerrainZ(x, y, points);
      top.push(project3d({ x, y, z: terrainZ - layer.top }));
      bottom.push(project3d({ x, y, z: terrainZ - layer.bottom }));
    }
    if (top.length < 2 || bottom.length < 2) continue;
    const poly = [...top, ...bottom.reverse()];
    const midY = ext.minY + dy / 2;
    const name = soilLayerNameAt(x, midY, points, layerIndex);
    const color = soilColor(name);
    drawProfilePolygon(poly, withAlpha(color, opacity), withAlpha(color, Math.min(0.96, opacity + 0.1)), 0.95);
    drawProfileHatch(poly, name, color);
    drawProfileBoundaryLine(top, withAlpha("#1f2a20", 0.2), 0.8);
    if (label) drawProfileLayerText(poly, name);
  }
}

function drawProfileBoundaryLine(points, strokeStyle, lineWidth = 1) {
  if (!points.length) return;
  profileCtx.save();
  profileCtx.strokeStyle = strokeStyle;
  profileCtx.lineWidth = lineWidth;
  profileCtx.beginPath();
  points.forEach((p, index) => {
    if (index === 0) profileCtx.moveTo(p.x, p.y);
    else profileCtx.lineTo(p.x, p.y);
  });
  profileCtx.stroke();
  profileCtx.restore();
}

function drawLayerInterfaceSurfaces(points, ext, project3d) {
  const rows = 7;
  const cols = 9;
  const layerCount = profileLayerCount(points);
  const dx = Math.max(1, ext.maxX - ext.minX);
  const dy = Math.max(1, ext.maxY - ext.minY);
  for (let boundary = 1; boundary < layerCount; boundary += 1) {
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const p1 = { x: ext.minX + dx * i / cols, y: ext.minY + dy * j / rows };
        const p2 = { x: ext.minX + dx * (i + 1) / cols, y: ext.minY + dy * j / rows };
        const p3 = { x: ext.minX + dx * (i + 1) / cols, y: ext.minY + dy * (j + 1) / rows };
        const p4 = { x: ext.minX + dx * i / cols, y: ext.minY + dy * (j + 1) / rows };
        [p1, p2, p3, p4].forEach((p) => {
          p.z = interpolateTerrainZ(p.x, p.y, points) - interpolateLayerBoundaryDepth(p.x, p.y, points, boundary);
        });
        const color = soilColor(soilLayerNameAt((p1.x + p3.x) / 2, (p1.y + p3.y) / 2, points, boundary - 1));
        drawProfilePolygon(
          [project3d(p1), project3d(p2), project3d(p3), project3d(p4)],
          withAlpha(color, 0.12),
          withAlpha(color, 0.26),
          0.7
        );
      }
    }
  }
}

function drawProfileVolumeEdges(ext, project3d, zBottom) {
  const topCorners = [
    { x: ext.minX, y: ext.minY },
    { x: ext.maxX, y: ext.minY },
    { x: ext.maxX, y: ext.maxY },
    { x: ext.minX, y: ext.maxY }
  ].map((p) => ({ ...p, z: interpolateTerrainZ(p.x, p.y, project.points) }));
  const bottomCorners = topCorners.map((p) => ({ x: p.x, y: p.y, z: zBottom }));
  profileCtx.save();
  profileCtx.strokeStyle = "rgba(63, 73, 66, 0.42)";
  profileCtx.lineWidth = 1.2;
  for (let i = 0; i < 4; i += 1) {
    const a = project3d(topCorners[i]);
    const b = project3d(topCorners[(i + 1) % 4]);
    const c = project3d(bottomCorners[i]);
    const d = project3d(bottomCorners[(i + 1) % 4]);
    profileLine(a.x, a.y, b.x, b.y);
    profileLine(c.x, c.y, d.x, d.y);
    profileLine(a.x, a.y, c.x, c.y);
  }
  profileCtx.restore();
}

function profileLine(x1, y1, x2, y2) {
  profileCtx.beginPath();
  profileCtx.moveTo(x1, y1);
  profileCtx.lineTo(x2, y2);
  profileCtx.stroke();
}

function drawProfilePolygon(points, fillStyle, strokeStyle, lineWidth = 1) {
  profileCtx.save();
  profilePath(points);
  profileCtx.fillStyle = fillStyle;
  profileCtx.fill();
  if (strokeStyle) {
    profileCtx.strokeStyle = strokeStyle;
    profileCtx.lineWidth = lineWidth;
    profileCtx.stroke();
  }
  profileCtx.restore();
}

function profilePath(points) {
  profileCtx.beginPath();
  points.forEach((p, index) => {
    if (index === 0) profileCtx.moveTo(p.x, p.y);
    else profileCtx.lineTo(p.x, p.y);
  });
  profileCtx.closePath();
}

function drawProfileHatch(points, name, color) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - 16;
  const maxX = Math.max(...xs) + 16;
  const minY = Math.min(...ys) - 16;
  const maxY = Math.max(...ys) + 16;
  const key = String(name).toLowerCase();
  profileCtx.save();
  profilePath(points);
  profileCtx.clip();
  profileCtx.strokeStyle = withAlpha(color, 0.34);
  profileCtx.lineWidth = 0.8;
  profileCtx.setLineDash(key.includes("silte") ? [4, 4] : []);
  const step = key.includes("areia") ? 9 : 12;
  for (let x = minX - 40; x <= maxX + 40; x += step) {
    profileCtx.beginPath();
    if (key.includes("argila")) {
      profileCtx.moveTo(x, maxY);
      profileCtx.lineTo(x + 50, minY);
    } else if (key.includes("areia")) {
      profileCtx.moveTo(minX, minY + (x - minX) * 0.18);
      profileCtx.lineTo(maxX, minY + (x - minX) * 0.18);
    } else {
      profileCtx.moveTo(x, minY);
      profileCtx.lineTo(x + 48, maxY);
    }
    profileCtx.stroke();
  }
  profileCtx.restore();
}

function drawProfileLayerText(points, text) {
  const height = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
  if (height < 14) return;
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  drawTextBadge(profileCtx, text, cx, cy, "#243021", "center");
}

function profileLayerCount(points) {
  return Math.max(1, ...points.map((p) => soilIntervals(p).length));
}

function profileLayerAt(x, y, points, index) {
  const top = index === 0 ? 0 : interpolateLayerBoundaryDepth(x, y, points, index);
  const bottom = interpolateLayerBoundaryDepth(x, y, points, index + 1);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top + 0.03) return null;
  return { top, bottom, name: soilLayerNameAt(x, y, points, index) };
}

function interpolateLayerBoundaryDepth(x, y, points, boundaryIndex) {
  if (boundaryIndex <= 0) return 0;
  let weightSum = 0;
  let valueSum = 0;
  points.forEach((p) => {
    const d = Math.max(0.35, distance({ x, y }, p));
    const w = 1 / (d * d);
    weightSum += w;
    valueSum += layerBoundaryDepth(p, boundaryIndex) * w;
  });
  return weightSum ? valueSum / weightSum : 0;
}

function layerBoundaryDepth(point, boundaryIndex) {
  const depth = Math.max(1, pointModelDepthValue(point));
  if (boundaryIndex <= 0) return 0;
  const intervals = soilIntervals(point);
  const interval = intervals[boundaryIndex - 1];
  if (interval) return clamp(interval.bottom, 0, depth);
  return depth;
}

function soilLayerNameAt(x, y, points, index) {
  const nearest = points
    .slice()
    .sort((a, b) => distance({ x, y }, a) - distance({ x, y }, b))[0];
  const intervals = nearest ? soilIntervals(nearest) : [];
  return intervals[index]?.name || intervals[intervals.length - 1]?.name || `Camada ${index + 1}`;
}

function drawProfileSurface(points, ext, project3d) {
  const rows = 10;
  const cols = 12;
  const dx = Math.max(1, ext.maxX - ext.minX);
  const dy = Math.max(1, ext.maxY - ext.minY);
  profileCtx.save();
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const p1 = { x: ext.minX + dx * i / cols, y: ext.minY + dy * j / rows };
      const p2 = { x: ext.minX + dx * (i + 1) / cols, y: ext.minY + dy * j / rows };
      const p3 = { x: ext.minX + dx * (i + 1) / cols, y: ext.minY + dy * (j + 1) / rows };
      const p4 = { x: ext.minX + dx * i / cols, y: ext.minY + dy * (j + 1) / rows };
      [p1, p2, p3, p4].forEach((p) => { p.z = interpolateTerrainZ(p.x, p.y, points); });
      const avg = (p1.z + p2.z + p3.z + p4.z) / 4;
      profileCtx.fillStyle = terrainColor(avg);
      profileCtx.strokeStyle = "rgba(47, 111, 69, 0.24)";
      profileCtx.lineWidth = 1;
      const a = project3d(p1);
      const b = project3d(p2);
      const c = project3d(p3);
      const d = project3d(p4);
      profileCtx.beginPath();
      profileCtx.moveTo(a.x, a.y);
      profileCtx.lineTo(b.x, b.y);
      profileCtx.lineTo(c.x, c.y);
      profileCtx.lineTo(d.x, d.y);
      profileCtx.closePath();
      profileCtx.fill();
      profileCtx.stroke();
    }
  }
  drawTerrainOutlineOnProfile(points, ext, project3d);
  profileCtx.restore();
}

function drawTerrainOutlineOnProfile(points, ext, project3d) {
  if (project.terrain.length < 3) return;
  profileCtx.save();
  profileCtx.strokeStyle = "rgba(23, 93, 50, 0.82)";
  profileCtx.lineWidth = 2;
  profileCtx.beginPath();
  project.terrain.forEach((p, index) => {
    const s = project3d({ ...p, z: interpolateTerrainZ(p.x, p.y, points) + 0.05 });
    if (index === 0) profileCtx.moveTo(s.x, s.y);
    else profileCtx.lineTo(s.x, s.y);
  });
  profileCtx.closePath();
  profileCtx.stroke();
  profileCtx.restore();
}

function drawProfileDimensions(project3d, points) {
  profileCtx.save();
  profileCtx.strokeStyle = "rgba(189, 125, 32, 0.82)";
  profileCtx.fillStyle = "#8b5d18";
  profileCtx.font = "11px Segoe UI, Arial";
  profileCtx.setLineDash([5, 4]);
  project.dimensions.slice(0, 40).forEach((d) => {
    const a = resolveRefPoint(d.a);
    const b = resolveRefPoint(d.b);
    if (!a || !b) return;
    const geom = dimensionWorldGeometry(a, b, dimensionOffset(d));
    const pa = project3d({ ...geom.da, z: interpolateTerrainZ(geom.da.x, geom.da.y, points) + 0.25 });
    const pb = project3d({ ...geom.db, z: interpolateTerrainZ(geom.db.x, geom.db.y, points) + 0.25 });
    profileCtx.beginPath();
    profileCtx.moveTo(pa.x, pa.y);
    profileCtx.lineTo(pb.x, pb.y);
    profileCtx.stroke();
    profileCtx.fillText(d.label || `${fmt(distance(a, b))} m`, (pa.x + pb.x) / 2 + 5, (pa.y + pb.y) / 2 - 5);
  });
  profileCtx.setLineDash([]);
  profileCtx.restore();
}

function drawProfileAxes(ext, project3d, zBottom) {
  const base = { x: ext.minX, y: ext.minY, z: zBottom };
  const xLen = Math.min(10, Math.max(4, (ext.maxX - ext.minX) * 0.24));
  const yLen = Math.min(10, Math.max(4, (ext.maxY - ext.minY) * 0.24));
  const zLen = Math.min(8, Math.max(3, Math.abs(zBottom) * 0.2));
  const o = project3d(base);
  const px = project3d({ x: base.x + xLen, y: base.y, z: base.z });
  const py = project3d({ x: base.x, y: base.y + yLen, z: base.z });
  const pz = project3d({ x: base.x, y: base.y, z: base.z + zLen });
  profileCtx.save();
  profileCtx.lineWidth = 2;
  profileCtx.strokeStyle = "rgba(43, 103, 177, 0.72)";
  profileLine(o.x, o.y, px.x, px.y);
  profileCtx.strokeStyle = "rgba(47, 111, 69, 0.72)";
  profileLine(o.x, o.y, py.x, py.y);
  profileCtx.strokeStyle = "rgba(163, 59, 52, 0.72)";
  profileLine(o.x, o.y, pz.x, pz.y);
  drawTextBadge(profileCtx, "X", px.x + 8, px.y, "#2b67b1", "left");
  drawTextBadge(profileCtx, "Y", py.x + 8, py.y, "#2f6f45", "left");
  drawTextBadge(profileCtx, "Prof.", pz.x + 8, pz.y, "#a33b34", "left");
  profileCtx.restore();
}

function drawBoreholes(points, project3d) {
  profileCtx.save();
  points.forEach((p) => {
    const topZ = pointElevationValue(p);
    const depth = Math.max(1, pointDepthValue(p));
    const top = project3d({ x: p.x, y: p.y, z: topZ });
    const bottom = project3d({ x: p.x, y: p.y, z: topZ - depth });
    profileCtx.strokeStyle = "rgba(30, 71, 123, 0.28)";
    profileCtx.lineWidth = 13;
    profileCtx.lineCap = "round";
    profileCtx.beginPath();
    profileCtx.moveTo(top.x, top.y);
    profileCtx.lineTo(bottom.x, bottom.y);
    profileCtx.stroke();
    profileCtx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    profileCtx.lineWidth = 9;
    profileCtx.beginPath();
    profileCtx.moveTo(top.x, top.y);
    profileCtx.lineTo(bottom.x, bottom.y);
    profileCtx.stroke();

    soilIntervals(p).forEach((layer) => {
      const a = project3d({ x: p.x, y: p.y, z: topZ - layer.top });
      const b = project3d({ x: p.x, y: p.y, z: topZ - layer.bottom });
      profileCtx.strokeStyle = soilColor(layer.name);
      profileCtx.lineWidth = 8;
      profileCtx.beginPath();
      profileCtx.moveTo(a.x, a.y);
      profileCtx.lineTo(b.x, b.y);
      profileCtx.stroke();
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      profileCtx.fillStyle = "rgba(32, 37, 31, 0.16)";
      profileCtx.beginPath();
      profileCtx.arc(mid.x, mid.y, 1.6, 0, Math.PI * 2);
      profileCtx.fill();
    });

    profileCtx.fillStyle = "#e9f3ff";
    profileCtx.strokeStyle = "#1e477b";
    profileCtx.lineWidth = 2;
    profileCtx.beginPath();
    profileCtx.arc(top.x, top.y, 4.6, 0, Math.PI * 2);
    profileCtx.fill();
    profileCtx.stroke();
    drawTextBadge(profileCtx, p.name, top.x + 10, top.y - 9, "#1e477b", "left");
    drawTextBadge(profileCtx, `${fmt(depth, 1)} m`, bottom.x + 10, bottom.y + 12, "#3f4f3e", "left");
    drawPileLengthMarker(p, project3d, topZ, depth);
    drawRefusalMarker(p, project3d, topZ);
  });
  profileCtx.restore();
}

function drawPileLengthMarker(point, project3d, topZ, fallbackDepth) {
  const length = pointPileLengthValue(point);
  if (!length) return;
  const markerDepth = Math.max(0.2, Math.min(length, pointModelDepthValue(point)));
  const offset = 0.5;
  const top = project3d({ x: point.x + offset, y: point.y + offset, z: topZ - 0.1 });
  const bottom = project3d({ x: point.x + offset, y: point.y + offset, z: topZ - markerDepth });
  profileCtx.save();
  profileCtx.strokeStyle = "rgba(55, 95, 48, 0.78)";
  profileCtx.lineWidth = 2;
  profileCtx.setLineDash([4, 4]);
  profileCtx.beginPath();
  profileCtx.moveTo(top.x, top.y);
  profileCtx.lineTo(bottom.x, bottom.y);
  profileCtx.stroke();
  profileCtx.setLineDash([]);
  drawTextBadge(profileCtx, `Estaca ${fmt(length, 1)} m`, bottom.x + 8, bottom.y - 4, "#375f30", "left");
  if (length > fallbackDepth + 0.05) drawTextBadge(profileCtx, `Furo ${fmt(fallbackDepth, 1)} m`, top.x + 8, top.y + 16, "#3f4f3e", "left");
  profileCtx.restore();
}

function drawRefusalMarker(point, project3d, topZ) {
  if (!pointHasRefusal(point)) return;
  const depth = clamp(pointRefusalDepthValue(point) || pointDepthValue(point), 0.2, pointModelDepthValue(point));
  const z = topZ - depth - 0.45;
  const kind = pointRefusalKind(point);
  const rock = kind === "matacao" ? [
    { x: point.x - 0.92, y: point.y - 0.25, z: z + 0.02 },
    { x: point.x - 0.46, y: point.y - 0.72, z: z - 0.16 },
    { x: point.x + 0.34, y: point.y - 0.68, z: z - 0.08 },
    { x: point.x + 0.94, y: point.y - 0.12, z: z - 0.18 },
    { x: point.x + 0.66, y: point.y + 0.55, z: z - 0.28 },
    { x: point.x - 0.18, y: point.y + 0.76, z: z - 0.24 },
    { x: point.x - 0.86, y: point.y + 0.34, z: z - 0.10 }
  ].map(project3d) : [
    { x: point.x - 0.82, y: point.y - 0.34, z },
    { x: point.x + 0.82, y: point.y - 0.34, z: z - 0.08 },
    { x: point.x + 0.82, y: point.y + 0.34, z: z - 0.24 },
    { x: point.x - 0.82, y: point.y + 0.34, z: z - 0.16 }
  ].map(project3d);
  profileCtx.save();
  const fill = kind === "matacao" ? "rgba(108, 72, 35, 0.92)" : "rgba(66, 69, 74, 0.86)";
  const stroke = kind === "matacao" ? "rgba(62, 42, 23, 0.96)" : "rgba(35, 38, 42, 0.92)";
  drawProfilePolygon(rock, fill, stroke, 1.4);
  drawProfileHatch(rock, kind === "matacao" ? "matacao" : "rocha", kind === "matacao" ? "#6c4823" : "#4c4f55");
  if (kind === "matacao") {
    const shine = rock.slice(1, 4);
    profileCtx.strokeStyle = "rgba(218, 177, 118, 0.38)";
    profileCtx.lineWidth = 1.2;
    profileCtx.beginPath();
    profileCtx.moveTo(shine[0].x, shine[0].y);
    shine.slice(1).forEach((p) => profileCtx.lineTo(p.x, p.y));
    profileCtx.stroke();
  }
  const labelAt = project3d({ x: point.x + 0.85, y: point.y + 0.42, z: z - 0.05 });
  drawTextBadge(profileCtx, pointRefusalName(point), labelAt.x + 6, labelAt.y, kind === "matacao" ? "#6c4823" : "#4c4f55", "left");
  profileCtx.restore();
}

function drawLayerRibbons(points, project3d) {
  const sorted = points.slice().sort(compareCartesianXY);
  if (sorted.length < 2) return;
  profileCtx.save();
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const la = soilIntervals(a);
    const lb = soilIntervals(b);
    const max = Math.min(la.length, lb.length);
    for (let j = 0; j < max; j += 1) {
      const za = pointElevationValue(a);
      const zb = pointElevationValue(b);
      const p1 = project3d({ x: a.x, y: a.y, z: za - la[j].top });
      const p2 = project3d({ x: b.x, y: b.y, z: zb - lb[j].top });
      const p3 = project3d({ x: b.x, y: b.y, z: zb - lb[j].bottom });
      const p4 = project3d({ x: a.x, y: a.y, z: za - la[j].bottom });
      profileCtx.fillStyle = withAlpha(soilColor(la[j].name), 0.58);
      profileCtx.strokeStyle = withAlpha(soilColor(la[j].name), 0.86);
      profileCtx.lineWidth = 1.4;
      profileCtx.beginPath();
      profileCtx.moveTo(p1.x, p1.y);
      profileCtx.lineTo(p2.x, p2.y);
      profileCtx.lineTo(p3.x, p3.y);
      profileCtx.lineTo(p4.x, p4.y);
      profileCtx.closePath();
      profileCtx.fill();
      profileCtx.stroke();
      drawProfileHatch([p1, p2, p3, p4], la[j].name, soilColor(la[j].name));
    }
  }
  profileCtx.restore();
}

function updateProfileStats(points) {
  const maxDepth = points.length ? Math.max(...points.map(pointModelDepthValue)) : 0;
  const layerNames = new Set(points.flatMap((p) => soilIntervals(p).map((layer) => layer.name)));
  document.getElementById("profilePointsStat").textContent = points.length;
  document.getElementById("profileDepthStat").textContent = `${fmt(maxDepth, 1)} m`;
  document.getElementById("profileLayersStat").textContent = layerNames.size;
}

function drawProfileLegend(points) {
  const box = document.getElementById("profileLegend");
  if (!box) return;
  const names = Array.from(new Set(points.flatMap((p) => soilIntervals(p).map((layer) => layer.name)))).slice(0, 8);
  box.innerHTML = names.map((name) => (
    `<div class="legend-row"><span class="legend-swatch" style="background:${soilColor(name)}"></span><span>${escapeHtml(name)}</span></div>`
  )).join("") || "Sem camadas.";
}

function syncStratigraphyControls() {
  const profileInput = document.getElementById("stratProfileInput");
  const variationInput = document.getElementById("stratVariationInput");
  if (profileInput) {
    const key = STRATIGRAPHIC_PROFILES[project.stratigraphicProfile] ? project.stratigraphicProfile : "manual";
    profileInput.value = key;
    state.profile.stratProfile = key;
  }
  if (variationInput) {
    const mode = ["regular", "ondulado", "inclinado"].includes(project.stratigraphicVariation) ? project.stratigraphicVariation : "ondulado";
    variationInput.value = mode;
    state.profile.stratVariation = mode;
  }
  updateStratigraphyPreview();
}

function updateStratigraphyPreview() {
  const box = document.getElementById("stratProfilePreview");
  if (!box) return;
  const key = document.getElementById("stratProfileInput")?.value || project.stratigraphicProfile || "manual";
  const profile = STRATIGRAPHIC_PROFILES[key] || STRATIGRAPHIC_PROFILES.manual;
  box.innerHTML = profile.layers.map((layer) => (
    `<div class="strat-row"><span class="legend-swatch" style="background:${soilColor(layer.name)}"></span><strong>${escapeHtml(layer.name)}</strong><span>${Math.round(layer.from * 100)}-${Math.round(layer.to * 100)}%</span></div>`
  )).join("");
}

function applyStratigraphicProfile() {
  const key = document.getElementById("stratProfileInput")?.value || "manual";
  const variation = document.getElementById("stratVariationInput")?.value || "ondulado";
  if (key === "manual") {
    project.stratigraphicProfile = key;
    project.stratigraphicVariation = variation;
    state.profile.stratProfile = key;
    state.profile.stratVariation = variation;
    updateStratigraphyPreview();
    drawProfile3D();
    setStatus("Perfil 3D usando camadas digitadas em cada SP");
    return;
  }
  if (!project.points.length) {
    setStatus("Insira pontos SP antes de aplicar o perfil estratigrafico");
    return;
  }
  saveHistory("Aplicar perfil estratigrafico");
  const ext = modelExtents();
  project.stratigraphicProfile = key;
  project.stratigraphicVariation = variation;
  state.profile.stratProfile = key;
  state.profile.stratVariation = variation;
  project.points.forEach((point, index) => {
    const depth = Math.max(4, pointDepthValue(point));
    if (!hasValue(point.depth)) point.depth = depth;
    point.layersText = stratigraphyTextForPoint(point, index, key, variation, ext);
  });
  state.profile.modelSignature = "";
  refreshSelectionForm();
  updateProfileStats(project.points);
  drawProfile3D();
  updateStratigraphyPreview();
  setStatus(`Perfil estratigrafico aplicado: ${STRATIGRAPHIC_PROFILES[key].name}`);
}

function stratigraphyTextForPoint(point, pointIndex, profileKey, variation, ext) {
  const profile = STRATIGRAPHIC_PROFILES[profileKey] || STRATIGRAPHIC_PROFILES.manual;
  const depth = Math.max(1, pointDepthValue(point));
  const ratios = stratigraphyBoundaryRatios(point, pointIndex, profile, variation, ext);
  return profile.layers.map((layer, index) => {
    const top = ratios[index] * depth;
    const bottom = ratios[index + 1] * depth;
    return `${fmt(top, 2)}-${fmt(bottom, 2)} ${layer.name}`;
  }).join("; ");
}

function stratigraphyBoundaryRatios(point, pointIndex, profile, variation, ext) {
  const ratios = [0];
  const spanX = Math.max(1, (ext.maxX || 0) - (ext.minX || 0));
  const spanY = Math.max(1, (ext.maxY || 0) - (ext.minY || 0));
  const nx = ((point.x || 0) - (ext.minX || 0)) / spanX - 0.5;
  const ny = ((point.y || 0) - (ext.minY || 0)) / spanY - 0.5;
  for (let i = 0; i < profile.layers.length - 1; i += 1) {
    const base = profile.layers[i].to;
    let offset = 0;
    if (variation === "ondulado") {
      offset = Math.sin((point.x || 0) * 0.19 + (point.y || 0) * 0.13 + (pointIndex + 1) * 0.7 + i * 1.9) * 0.035;
    } else if (variation === "inclinado") {
      offset = (nx * 0.075 + ny * 0.035) * (i % 2 === 0 ? 1 : 0.72);
    }
    ratios.push(base + offset);
  }
  ratios.push(1);
  for (let i = 1; i < ratios.length - 1; i += 1) {
    ratios[i] = clamp(ratios[i], ratios[i - 1] + 0.06, 0.94 - (ratios.length - i - 2) * 0.06);
  }
  return ratios;
}

function interpolateTerrainZ(x, y, points) {
  const valid = points.filter((p) => Number.isFinite(pointElevationValue(p)));
  if (!valid.length) return 0;
  let weightSum = 0;
  let valueSum = 0;
  for (const p of valid) {
    const d = Math.max(0.25, distance({ x, y }, p));
    if (d <= 0.3) return pointElevationValue(p);
    const w = 1 / (d * d);
    weightSum += w;
    valueSum += pointElevationValue(p) * w;
  }
  return valueSum / weightSum;
}

function soilIntervals(point) {
  const depth = Math.max(1, pointModelDepthValue(point));
  const drilledDepth = Math.max(1, pointDepthValue(point) || Math.min(depth, pointPileLengthValue(point) || depth));
  const text = String(point.layersText || "").trim();
  const rows = text.split(/[;\n]+/).map((row) => row.trim()).filter(Boolean);
  const intervals = rows.map((row) => {
    const match = row.match(/(\d+(?:[,.]\d+)?)\s*(?:-|a|ate|até)\s*(\d+(?:[,.]\d+)?)\s*(.*)/i);
    if (!match) return null;
    const top = parseNumber(match[1]);
    const bottom = parseNumber(match[2]);
    if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) return null;
    return { top: Math.max(0, top), bottom: Math.min(depth, bottom), name: (match[3] || "Camada").trim() || "Camada" };
  }).filter((layer) => layer && layer.bottom > layer.top);
  const withRefusal = addRefusalInterval(point, intervals, depth, drilledDepth);
  if (withRefusal.length) return withRefusal;
  const mid = Math.min(drilledDepth, Math.max(1.5, drilledDepth * 0.42));
  return addRefusalInterval(point, [
    { top: 0, bottom: Math.min(depth, 1.5), name: "Solo superficial" },
    { top: Math.min(depth, 1.5), bottom: mid, name: "Argila arenosa" },
    { top: mid, bottom: drilledDepth, name: "Solo residual" }
  ].filter((layer) => layer.bottom > layer.top), depth, drilledDepth);
}

function addRefusalInterval(point, intervals, depth, drilledDepth) {
  const result = intervals
    .map((layer) => ({ ...layer, top: clamp(layer.top, 0, depth), bottom: clamp(layer.bottom, 0, depth) }))
    .filter((layer) => layer.bottom > layer.top + 0.01)
    .sort((a, b) => a.top - b.top);
  if (!pointHasRefusal(point)) return result;
  const refusalDepth = clamp(pointRefusalDepthValue(point) || drilledDepth, 0, depth);
  const refusalName = pointRefusalName(point);
  const last = result[result.length - 1];
  const alreadyMarked = last && /impenetravel|rocha|matacao/i.test(removeAccents(last.name));
  if (alreadyMarked) {
    last.bottom = Math.max(last.bottom, depth);
    return result;
  }
  const top = Math.max(0, Math.min(refusalDepth, depth - 0.2));
  if (last && last.bottom > top) last.bottom = top;
  if (depth > top + 0.05) result.push({ top, bottom: depth, name: refusalName });
  return result.filter((layer) => layer.bottom > layer.top + 0.01);
}

function soilColor(name) {
  const key = removeAccents(name).toLowerCase();
  if (key.includes("matacao") || key.includes("bloco")) return "#6c4823";
  if (key.includes("impenetravel")) return "#4c4f55";
  if (key.includes("aterro")) return "#b28b5c";
  if (key.includes("argila mole")) return "#d7878f";
  if (key.includes("argila")) return "#b95f4d";
  if (key.includes("areia saturada")) return "#7cb9c8";
  if (key.includes("areia compacta")) return "#c89f36";
  if (key.includes("areia")) return "#d8b74d";
  if (key.includes("silte")) return "#9aa65a";
  if (key.includes("saprolito")) return "#9b8b72";
  if (key.includes("rocha")) return "#5f6871";
  if (key.includes("residual")) return "#75808a";
  return "#6da27c";
}

function terrainColor(z) {
  const hue = 108 + Math.max(-18, Math.min(18, z % 36 - 18));
  return `hsla(${hue}, 34%, 73%, 0.38)`;
}

function withAlpha(color, alpha) {
  const temp = document.createElement("canvas").getContext("2d");
  temp.fillStyle = color;
  const normalized = temp.fillStyle;
  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!match) return color;
  const n = parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function drawSelection() {
  if (!state.selected) return;
  ctx.save();
  ctx.strokeStyle = "#bd7d20";
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 3;
  if (state.selected.type === "edge") {
    const edge = getTerrainEdge(state.selected.id);
    if (edge) {
      const a = worldToScreen(edge.a);
      const b = worldToScreen(edge.b);
      line(a.x, a.y, b.x, b.y);
    }
  }
  if (state.selected.type === "entity-segment") {
    const segment = getEntitySegment(state.selected.id, state.selected.segment);
    if (segment) {
      const a = worldToScreen(segment.a);
      const b = worldToScreen(segment.b);
      line(a.x, a.y, b.x, b.y);
    }
  }
  if (state.selected.type === "point") {
    const p = getPoint(state.selected.id);
    if (p) {
      const s = worldToScreen(p);
      ctx.strokeRect(s.x - 18, s.y - 18, 36, 36);
    }
  }
  if (state.selected.type === "note") {
    const n = getNote(state.selected.id);
    if (n) {
      const s = worldToScreen(n);
      ctx.strokeRect(s.x - 38, s.y - 15, 76, 30);
    }
  }
  if (state.selected.type === "entity") {
    const bounds = entityBounds(getEntity(state.selected.id));
    if (bounds) {
      const a = worldToScreen({ x: bounds.minX, y: bounds.minY });
      const b = worldToScreen({ x: bounds.maxX, y: bounds.maxY });
      ctx.strokeRect(a.x, b.y, b.x - a.x, a.y - b.y);
    }
  }
  ctx.restore();
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawLabel(text, x, y, color, bg, align = "center") {
  ctx.save();
  ctx.font = "600 12px Segoe UI, Arial";
  const metrics = ctx.measureText(text);
  const padX = 5;
  const padY = 3;
  let left = x - metrics.width / 2 - padX;
  if (align === "left") left = x - padX;
  const top = y - 9 - padY;
  ctx.fillStyle = bg;
  roundRect(left, top, metrics.width + padX * 2, 18 + padY, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawTinyText(text, x, y, color, align = "center") {
  ctx.save();
  ctx.font = "11px Segoe UI, Arial";
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawTextBadge(targetCtx, text, x, y, color = "#20251f", align = "center") {
  targetCtx.save();
  targetCtx.font = "600 10px Segoe UI, Arial";
  const metrics = targetCtx.measureText(text);
  const padX = 5;
  const padY = 3;
  let left = x - metrics.width / 2 - padX;
  if (align === "left") left = x - padX;
  const top = y - 8 - padY;
  targetCtx.fillStyle = "rgba(255, 255, 255, 0.82)";
  roundRectForContext(targetCtx, left, top, metrics.width + padX * 2, 17 + padY, 4);
  targetCtx.fill();
  targetCtx.strokeStyle = "rgba(32, 37, 31, 0.16)";
  targetCtx.lineWidth = 1;
  targetCtx.stroke();
  targetCtx.fillStyle = color;
  targetCtx.textAlign = align;
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(text, x, y);
  targetCtx.restore();
}

function roundRectForContext(targetCtx, x, y, w, h, r) {
  targetCtx.beginPath();
  targetCtx.moveTo(x + r, y);
  targetCtx.arcTo(x + w, y, x + w, y + h, r);
  targetCtx.arcTo(x + w, y + h, x, y + h, r);
  targetCtx.arcTo(x, y + h, x, y, r);
  targetCtx.arcTo(x, y, x + w, y, r);
  targetCtx.closePath();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function isSelected(type, id) {
  return state.selected && state.selected.type === type && state.selected.id === id;
}

function resolveRefPoint(ref) {
  if (!ref) return null;
  if (ref.type === "literal") return ref.point;
  if (ref.type === "point") return getPoint(ref.id);
  if (ref.type === "terrain-foot") return ref.point;
  if (ref.type === "entity-segment-point") {
    const segment = getEntitySegment(ref.id, ref.segment);
    return ref.end === "b" ? segment?.b : segment?.a;
  }
  if (ref.type === "edge-point") {
    const edge = getTerrainEdge(ref.index);
    return ref.end === "b" ? edge?.b : edge?.a;
  }
  return null;
}

function getPoint(id) {
  return project.points.find((p) => p.id === id);
}

function getNote(id) {
  return project.notes.find((n) => n.id === id);
}

function getEntity(id) {
  return project.entities.find((entity) => entity.id === id);
}

function getDimension(id) {
  return project.dimensions.find((dimension) => dimension.id === id);
}

function literalDimensionRef(point) {
  return { type: "literal", point: { x: round(point.x, 4), y: round(point.y, 4) } };
}

function dimensionRefFromWorld(rawWorld, snappedWorld) {
  const radius = 13 / state.view.scale;
  const point = findPointNear(rawWorld, radius) || findPointNear(snappedWorld, radius);
  if (point) {
    return {
      ref: { type: "point", id: point.id },
      point: { x: point.x, y: point.y }
    };
  }
  if (state.osnap.marker?.point && distance(snappedWorld, state.osnap.marker.point) <= Math.max(radius, 0.2)) {
    return {
      ref: literalDimensionRef(state.osnap.marker.point),
      point: { x: state.osnap.marker.point.x, y: state.osnap.marker.point.y }
    };
  }
  return {
    ref: literalDimensionRef(snappedWorld),
    point: { x: snappedWorld.x, y: snappedWorld.y }
  };
}

function findPointNear(world, radius) {
  return project.points.find((p) => distance(world, p) <= radius) || null;
}

function createDimensionFromRefs(aRef, bRef, kind = "manual", options = {}) {
  const a = resolveRefPoint(aRef);
  const b = resolveRefPoint(bRef);
  if (!a || !b || distance(a, b) < 0.01) return null;
  const dimension = {
    id: uid("dim"),
    kind,
    a: aRef,
    b: bRef,
    ...options
  };
  project.dimensions.push(dimension);
  return dimension;
}

function getTerrainEdge(index) {
  if (!project.terrain.length || !project.terrain[index]) return null;
  return {
    a: project.terrain[index],
    b: project.terrain[(index + 1) % project.terrain.length],
    index
  };
}

function getEntitySegment(entityId, segmentIndex = 0) {
  const entity = getEntity(entityId);
  if (!entity) return null;
  if (entity.type === "road" || entity.type === "sidewalk") return { a: entity.a, b: entity.b, entity, segment: 0 };
  if (entity.type === "line") return { a: entity.a, b: entity.b, entity, segment: 0 };
  if (entity.type !== "polyline" || !entity.points?.length) return null;
  const a = entity.points[segmentIndex];
  const b = entity.points[(segmentIndex + 1) % entity.points.length];
  if (!a || !b || (!entity.closed && segmentIndex >= entity.points.length - 1)) return null;
  return { a, b, entity, segment: segmentIndex };
}

function dimensionRefsFromLineHit(hit) {
  if (!hit) return null;
  if (hit.type === "edge") {
    const edge = getTerrainEdge(hit.id);
    if (!edge) return null;
    return {
      a: { type: "edge-point", index: hit.id, end: "a" },
      b: { type: "edge-point", index: hit.id, end: "b" },
      segment: edge
    };
  }
  if (hit.type === "entity-segment") {
    const segment = getEntitySegment(hit.id, hit.segment);
    if (!segment) return null;
    return {
      a: { type: "entity-segment-point", id: hit.id, segment: hit.segment, end: "a" },
      b: { type: "entity-segment-point", id: hit.id, segment: hit.segment, end: "b" },
      segment
    };
  }
  return null;
}

function createSegmentDimension(hit) {
  const refs = dimensionRefsFromLineHit(hit);
  if (!refs) return false;
  const length = distance(refs.segment.a, refs.segment.b);
  saveHistory("Cotar segmento");
  const dimension = {
    id: uid("dim"),
    kind: "segment",
    a: refs.a,
    b: refs.b
  };
  project.dimensions.push(dimension);
  select({ type: "dimension", id: dimension.id });
  state.measureStart = null;
  state.measureStartRef = null;
  setTool("select", { silent: true });
  setStatus(`Cota do segmento criada: ${fmt(length)} m. Arraste para afastar; botao direito repete.`);
  draw();
  return true;
}

function findOsnapPoint(point) {
  const tolerance = 13 / state.view.scale;
  const candidates = [];
  const modes = state.osnap.modes;
  const base = osnapBasePoint();
  const addCandidate = (type, candidatePoint, priority = 1) => {
    if (!modes[type] || !candidatePoint) return;
    const d = distance(point, candidatePoint);
    if (d <= tolerance) candidates.push({ type, point: { x: candidatePoint.x, y: candidatePoint.y }, distance: d, priority });
  };

  const segments = collectOsnapSegments();
  segments.forEach((segment) => {
    addCandidate("endpoint", segment.a, 0.1);
    addCandidate("endpoint", segment.b, 0.1);
    addCandidate("midpoint", segmentCenter(segment), 0.2);
    if (modes.nearest) {
      const nearest = nearestPointOnSegment(point, segment.a, segment.b);
      addCandidate("nearest", nearest, 0.8);
    }
    if (modes.extension) {
      const extended = projectedPointOnLine(point, segment.a, segment.b);
      if (extended.t < -0.001 || extended.t > 1.001) addCandidate("extension", extended.point, 0.32);
    }
    if (base && modes.perpendicular) {
      const perpendicular = projectedPointOnLine(base, segment.a, segment.b, true).point;
      addCandidate("perpendicular", perpendicular, 0.12);
    }
    if (base && modes.parallel) {
      const dx = segment.b.x - segment.a.x;
      const dy = segment.b.y - segment.a.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.001) {
        const ux = dx / len;
        const uy = dy / len;
        const t = (point.x - base.x) * ux + (point.y - base.y) * uy;
        addCandidate("parallel", { x: base.x + ux * t, y: base.y + uy * t }, 0.34);
      }
    }
  });

  project.points.forEach((p) => {
    addCandidate("node", p, 0.05);
    addCandidate("center", p, 0.2);
  });

  collectOsnapCircles().forEach((circle) => {
    addCandidate("center", circle.center, 0.1);
    if (modes.quadrant) {
      addCandidate("quadrant", { x: circle.center.x + circle.r, y: circle.center.y }, 0.25);
      addCandidate("quadrant", { x: circle.center.x - circle.r, y: circle.center.y }, 0.25);
      addCandidate("quadrant", { x: circle.center.x, y: circle.center.y + circle.r }, 0.25);
      addCandidate("quadrant", { x: circle.center.x, y: circle.center.y - circle.r }, 0.25);
    }
    if (base && modes.tangent) {
      tangentPointsFromPointToCircle(base, circle).forEach((candidate) => addCandidate("tangent", candidate, 0.16));
    }
    if (modes.nearest) {
      const angle = angleBetween(circle.center, point);
      addCandidate("nearest", pointOnCircle(circle.center, circle.r, angle), 0.8);
    }
  });

  if (modes.intersection) {
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const hit = segmentIntersection(segments[i].a, segments[i].b, segments[j].a, segments[j].b);
        if (hit) addCandidate("intersection", hit.p, 0.05);
      }
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => (a.distance + a.priority * 0.001) - (b.distance + b.priority * 0.001));
  return candidates[0];
}

function collectOsnapSegments() {
  const segments = [];
  for (let i = 0; i < project.terrain.length; i += 1) {
    const edge = getTerrainEdge(i);
    if (edge) segments.push({ a: edge.a, b: edge.b, source: "terrain" });
  }
  project.entities.forEach((entity) => {
    if (entity.type === "road" || entity.type === "sidewalk") segments.push({ a: entity.a, b: entity.b, source: entity.id });
    if (entity.type === "line") segments.push({ a: entity.a, b: entity.b, source: entity.id });
    if (entity.type === "polyline") {
      const max = entity.closed ? entity.points.length : entity.points.length - 1;
      for (let i = 0; i < max; i += 1) {
        const segment = getEntitySegment(entity.id, i);
        if (segment) segments.push({ a: segment.a, b: segment.b, source: entity.id });
      }
    }
    if (entity.type === "arc") {
      const steps = 16;
      let previous = pointOnCircle(entity.center, entity.r, entity.start);
      const sweep = normalizeAngle(entity.end - entity.start) || Math.PI * 2;
      for (let i = 1; i <= steps; i += 1) {
        const next = pointOnCircle(entity.center, entity.r, entity.start + sweep * i / steps);
        segments.push({ a: previous, b: next, source: entity.id });
        previous = next;
      }
    }
  });
  project.imports.lines.forEach((lineItem) => segments.push({ a: lineItem.a, b: lineItem.b, source: "import" }));
  project.imports.polylines.forEach((poly) => {
    const max = poly.closed ? poly.points.length : poly.points.length - 1;
    for (let i = 0; i < max; i += 1) {
      const a = poly.points[i];
      const b = poly.points[(i + 1) % poly.points.length];
      if (a && b) segments.push({ a, b, source: "import" });
    }
  });
  return segments;
}

function collectOsnapCircles() {
  const circles = [];
  project.entities.forEach((entity) => {
    if (entity.type === "circle") circles.push({ center: entity.center, r: entity.r });
    if (entity.type === "arc") circles.push({ center: entity.center, r: entity.r });
  });
  project.imports.circles.forEach((circle) => circles.push({ center: { x: circle.x, y: circle.y }, r: circle.r }));
  return circles;
}

function osnapLabel(type) {
  return {
    endpoint: "END",
    midpoint: "MID",
    center: "CEN",
    node: "NODE",
    quadrant: "QUAD",
    intersection: "INT",
    extension: "EXT",
    perpendicular: "PER",
    tangent: "TAN",
    parallel: "PAR",
    nearest: "NEA"
  }[type] || type.toUpperCase();
}

function pointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function hitTest(world) {
  const radius = 12 / state.view.scale;
  if (state.tool === "selectObject") {
    return hitTestEntity(world, radius);
  }
  if (state.tool === "selectLine") {
    return hitTestLine(world, radius);
  }
  for (const p of project.points) {
    if (distance(world, p) <= radius) return { type: "point", id: p.id };
  }
  const dimensionHit = hitTestDimension(world, radius);
  if (dimensionHit) return dimensionHit;
  const entityHit = hitTestEntity(world, radius);
  if (entityHit) return entityHit;
  for (const n of project.notes) {
    if (distance(world, n) <= radius * 1.8) return { type: "note", id: n.id };
  }
  for (let i = 0; i < project.terrain.length; i += 1) {
    if (distance(world, project.terrain[i]) <= radius) return { type: "vertex", id: i };
  }
  return null;
}

function hitTestDimension(world, radius) {
  for (let i = project.dimensions.length - 1; i >= 0; i -= 1) {
    const dimension = project.dimensions[i];
    const a = resolveRefPoint(dimension.a);
    const b = resolveRefPoint(dimension.b);
    if (!a || !b) continue;
    const geom = dimensionWorldGeometry(a, b, dimensionOffset(dimension));
    const lineDistance = distanceToSegment(world, geom.da, geom.db);
    const labelDistance = distance(world, geom.label);
    if (lineDistance <= radius || labelDistance <= Math.max(radius * 3.2, 1.8)) {
      return { type: "dimension", id: dimension.id };
    }
  }
  return null;
}

function hitTestLine(world, radius) {
  let best = null;
  const consider = (candidate, a, b) => {
    if (!a || !b) return;
    const d = distanceToSegment(world, a, b);
    if (d > radius) return;
    const length = distance(a, b);
    if (
      !best ||
      d < best.distance - 0.0001 ||
      (Math.abs(d - best.distance) <= 0.0001 && length > best.length)
    ) {
      best = { ...candidate, distance: d, length };
    }
  };
  for (let i = 0; i < project.terrain.length; i += 1) {
    const edge = getTerrainEdge(i);
    consider({ type: "edge", id: i }, edge?.a, edge?.b);
  }

  for (let i = project.entities.length - 1; i >= 0; i -= 1) {
    const entity = project.entities[i];
    if (entity.type === "road" || entity.type === "sidewalk") {
      consider({ type: "entity-segment", id: entity.id, segment: 0 }, entity.a, entity.b);
    }
    if (entity.type === "line") {
      consider({ type: "entity-segment", id: entity.id, segment: 0 }, entity.a, entity.b);
    }
    if (entity.type === "polyline") {
      const max = entity.closed ? entity.points.length : entity.points.length - 1;
      for (let segment = 0; segment < max; segment += 1) {
        const item = getEntitySegment(entity.id, segment);
        consider({ type: "entity-segment", id: entity.id, segment }, item?.a, item?.b);
      }
    }
  }
  return best ? { type: best.type, id: best.id, segment: best.segment } : null;
}

function hitTestEntity(world, radius) {
  for (let i = project.entities.length - 1; i >= 0; i -= 1) {
    if (hitEntity(project.entities[i], world, radius)) return { type: "entity", id: project.entities[i].id };
  }
  return null;
}

function hitEntity(entity, point, tolerance) {
  if (!entity) return false;
  if (entity.type === "road") {
    const polygon = roadPolygon(entity);
    return pointInPolygon(point, polygon) || distanceToSegment(point, entity.a, entity.b) <= (Number(entity.width) || DEFAULT_ROAD_WIDTH) / 2 + tolerance;
  }
  if (entity.type === "sidewalk") {
    const polygon = roadPolygon(entity, DEFAULT_SIDEWALK_WIDTH);
    return pointInPolygon(point, polygon) || distanceToSegment(point, entity.a, entity.b) <= (Number(entity.width) || DEFAULT_SIDEWALK_WIDTH) / 2 + tolerance;
  }
  if (entity.type === "line") return distanceToSegment(point, entity.a, entity.b) <= tolerance;
  if (entity.type === "polyline") {
    for (let i = 0; i < entity.points.length - 1; i += 1) {
      if (distanceToSegment(point, entity.points[i], entity.points[i + 1]) <= tolerance) return true;
    }
    if (entity.closed && entity.points.length > 2) {
      if (distanceToSegment(point, entity.points[entity.points.length - 1], entity.points[0]) <= tolerance) return true;
      return pointInPolygon(point, entity.points);
    }
  }
  if (entity.type === "circle") {
    const d = distance(point, entity.center);
    return Math.abs(d - entity.r) <= tolerance || d <= entity.r;
  }
  if (entity.type === "arc") {
    const d = Math.abs(distance(point, entity.center) - entity.r);
    return d <= tolerance && angleOnArc(angleBetween(entity.center, point), entity.start, entity.end);
  }
  return false;
}

function handleCadTool(world) {
  if (state.tool === "line") {
    if (!state.drawStart) {
      clearDirectDistance();
      state.drawStart = world;
      setStatus("Linha: digite distancia ou clique o ponto final");
    } else {
      const end = directTarget(state.drawStart, world);
      saveHistory("Criar linha");
      const entity = { id: uid("ent"), type: "line", name: nextEntityName("Linha"), a: state.drawStart, b: end, layer: "CROQUI" };
      project.entities.push(entity);
      state.drawStart = null;
      clearDirectDistance();
      select({ type: "entity", id: entity.id });
      setTool("select", { silent: true });
      setStatus(`Linha criada: ${fmt(distance(entity.a, entity.b))} m`);
    }
    draw();
    return true;
  }

  if (state.tool === "rectangle") {
    if (!state.drawStart) {
      state.drawStart = world;
      setStatus("Retangulo: clique o canto oposto");
    } else {
      saveHistory("Criar retangulo");
      const entity = {
        id: uid("ent"),
        type: "polyline",
        name: nextEntityName("Retangulo"),
        points: rectanglePoints(state.drawStart, world),
        closed: true,
        layer: "CROQUI"
      };
      project.entities.push(entity);
      const snap = snapEntityToNearbyEdges(entity, { excludeEntityId: entity.id });
      state.drawStart = null;
      select({ type: "entity", id: entity.id });
      setTool("select", { silent: true });
      setStatus(snap.snapped ? "Retangulo criado com aresta encaixada" : "Retangulo criado");
    }
    draw();
    return true;
  }

  if (state.tool === "road" || state.tool === "sidewalk") {
    const isSidewalk = state.tool === "sidewalk";
    const label = isSidewalk ? "Passeio/guia" : "Rua/asfalto";
    const width = isSidewalk ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH;
    if (!state.drawStart) {
      clearDirectDistance();
      state.drawStart = world;
      setStatus(`${label}: digite comprimento ou clique o ponto final`);
    } else {
      const end = directTarget(state.drawStart, world);
      const length = distance(state.drawStart, end);
      if (length < 0.2) {
        setStatus(`${label} precisa de comprimento maior`);
        return true;
      }
      saveHistory(`Criar ${label.toLowerCase()}`);
      const entity = {
        id: uid("ent"),
        type: isSidewalk ? "sidewalk" : "road",
        name: nextEntityName(isSidewalk ? "Passeio guia" : "Rua asfalto"),
        a: state.drawStart,
        b: end,
        width,
        layer: isSidewalk ? "PASSEIO" : "RUA"
      };
      project.entities.push(entity);
      const snap = snapEntityToNearbyEdges(entity, { excludeEntityId: entity.id });
      state.drawStart = null;
      clearDirectDistance();
      select({ type: "entity", id: entity.id });
      setTool("select", { silent: true });
      setStatus(snap.snapped ? `${label} criado com aresta encaixada` : `${label} criado: ${fmt(length)} m x ${fmt(width)} m`);
    }
    draw();
    return true;
  }

  if (state.tool === "circle") {
    if (!state.drawStart) {
      clearDirectDistance();
      state.drawStart = world;
      setStatus("Circulo: digite raio ou clique o raio");
    } else {
      const end = directTarget(state.drawStart, world);
      saveHistory("Criar circulo");
      const entity = {
        id: uid("ent"),
        type: "circle",
        name: nextEntityName("Circulo"),
        center: state.drawStart,
        r: round(distance(state.drawStart, end), 3),
        layer: "CROQUI"
      };
      project.entities.push(entity);
      state.drawStart = null;
      clearDirectDistance();
      select({ type: "entity", id: entity.id });
      setTool("select", { silent: true });
      setStatus("Circulo criado");
    }
    draw();
    return true;
  }

  if (state.tool === "polyline") {
    state.polyPoints.push(world);
    setStatus(`Polilinha: ${state.polyPoints.length} vertices. Enter conclui, C fecha.`);
    draw();
    return true;
  }

  if (state.tool === "arc") {
    if (!state.arcStep) {
      state.arcStep = { phase: "radius", center: world };
      setStatus("Arco: clique o ponto inicial");
    } else if (state.arcStep.phase === "radius") {
      state.arcStep = {
        phase: "end",
        center: state.arcStep.center,
        startPoint: world,
        r: round(distance(state.arcStep.center, world), 3)
      };
      setStatus("Arco: clique o ponto final");
    } else {
      saveHistory("Criar arco");
      const entity = {
        id: uid("ent"),
        type: "arc",
        name: nextEntityName("Arco"),
        center: state.arcStep.center,
        r: state.arcStep.r,
        start: angleBetween(state.arcStep.center, state.arcStep.startPoint),
        end: angleBetween(state.arcStep.center, world),
        layer: "CROQUI"
      };
      project.entities.push(entity);
      state.arcStep = null;
      select({ type: "entity", id: entity.id });
      setTool("select", { silent: true });
      setStatus("Arco criado");
    }
    draw();
    return true;
  }

  return false;
}

function onPointerDown(event) {
  if (event.button === 2) {
    event.preventDefault();
    state.context.rightDownAt = performance.now();
    state.context.rightDownPos = { x: event.clientX, y: event.clientY };
    clearTimeout(state.context.longPressTimer);
    state.context.longPressTimer = setTimeout(() => {
      showContextMenu(event.clientX, event.clientY);
    }, 250);
    return;
  }
  hideContextMenu();
  canvas.setPointerCapture(event.pointerId);
  const screen = pointerPos(event);
  const rawWorld = screenToWorld(screen);
  const world = applyDraftConstraints(snapPoint(rawWorld));
  state.mouseRawWorld = rawWorld;
  state.mouseWorld = world;

  if (event.button === 1 || state.tool === "pan") {
    state.drag = { type: "pan", start: screen, view: { ...state.view } };
    setStatus("Movendo vista");
    return;
  }

  if (state.action && commitDistanceAction(world)) return;

  if (state.offset && commitOffsetSelection(rawWorld)) return;

  if (handleCadTool(world)) return;

  if (state.tool === "point") {
    saveHistory("Inserir SP");
    const p = {
      id: uid("sp"),
      name: nextPointName(),
      x: world.x,
      y: world.y,
      elev: "",
      depth: 12,
      layersText: "",
      note: ""
    };
    project.points.push(p);
    select({ type: "point", id: p.id });
    setTool("select", { silent: true });
    setStatus(`${p.name} inserido`);
    draw();
    return;
  }

  if (state.tool === "note" || state.tool === "noteRua" || state.tool === "notePasseio") {
    const preset = state.tool === "noteRua" ? "RUA" : state.tool === "notePasseio" ? "PASSEIO" : "";
    const text = preset || prompt("Texto da anotacao:", "Referencia");
    if (text) {
      saveHistory("Inserir texto");
      const note = { id: uid("txt"), text, x: world.x, y: world.y };
      project.notes.push(note);
      select({ type: "note", id: note.id });
      setTool("select", { silent: true });
      setStatus(`Texto ${text} inserido`);
      draw();
    }
    return;
  }

  if (state.tool === "terrain") {
    const hit = hitTest(rawWorld);
    if (hit && hit.type === "vertex") {
      saveHistory("Mover vertice do terreno");
      select(hit);
      state.drag = { type: "vertex", id: hit.id };
      setStatus(`Vertice ${hit.id + 1}`);
    } else {
      saveHistory("Adicionar vertice do terreno");
      project.terrain.push(world);
      select({ type: "vertex", id: project.terrain.length - 1 });
      state.drag = { type: "vertex", id: project.terrain.length - 1 };
      setStatus("Vertice do terreno adicionado");
    }
    draw();
    return;
  }

  if (state.tool === "dimension" || state.tool === "dimensionContinue") {
    const dimensionPoint = dimensionRefFromWorld(rawWorld, world);
    if (!state.measureStart) {
      const lineHit = hitTestLine(rawWorld, 12 / state.view.scale);
      if (state.tool === "dimension" && lineHit && createSegmentDimension(lineHit)) return;
    }
    if (!state.measureStart) {
      state.measureStart = dimensionPoint.point;
      state.measureStartRef = dimensionPoint.ref;
      setStatus(state.tool === "dimensionContinue" ? "Cota continua: clique os proximos pontos" : "Clique o segundo ponto da cota");
    } else {
      saveHistory(state.tool === "dimensionContinue" ? "Criar cota continua" : "Criar cota manual");
      const dimension = createDimensionFromRefs(
        state.measureStartRef || literalDimensionRef(state.measureStart),
        dimensionPoint.ref,
        state.tool === "dimensionContinue" ? "continuous" : "manual"
      );
      if (!dimension) {
        setStatus("Cota ignorada: pontos coincidentes");
        draw();
        return;
      }
      select({ type: "dimension", id: dimension.id });
      if (state.tool === "dimensionContinue") {
        state.measureStart = dimensionPoint.point;
        state.measureStartRef = dimensionPoint.ref;
        setStatus("Cota continua criada. Clique o proximo ponto ou Esc para finalizar.");
      } else {
        state.measureStart = null;
        state.measureStartRef = null;
        setTool("select", { silent: true });
        setStatus("Cota manual criada. Arraste para afastar; botao direito repete.");
      }
    }
    draw();
    return;
  }

  if (state.tool === "selectObject") {
    const entityHit = hitTestEntity(rawWorld, 12 / state.view.scale);
    select(entityHit);
    setStatus(entityHit ? "Objeto CAD selecionado" : "Nenhum objeto CAD encontrado");
    draw();
    return;
  }

  if (state.tool === "selectLine") {
    const lineHit = hitTestLine(rawWorld, 12 / state.view.scale);
    select(lineHit);
    setStatus(lineHit ? "Linha/segmento selecionado" : "Nenhuma linha encontrada");
    draw();
    return;
  }

  const hit = hitTest(rawWorld);
  select(hit);
  if (hit && hit.type === "point") {
    const p = getPoint(hit.id);
    saveHistory("Mover SP");
    state.drag = { type: "point", id: hit.id, dx: p.x - world.x, dy: p.y - world.y };
  } else if (hit && hit.type === "note") {
    const n = getNote(hit.id);
    saveHistory("Mover texto");
    state.drag = { type: "note", id: hit.id, dx: n.x - world.x, dy: n.y - world.y };
  } else if (hit && hit.type === "entity") {
    saveHistory("Mover entidade CAD");
    state.drag = { type: "entity", id: hit.id, last: world, edgeSnapped: false };
  } else if (hit && hit.type === "dimension") {
    saveHistory("Afastar cota");
    state.drag = { type: "dimension", id: hit.id, last: world };
  } else if (hit && hit.type === "vertex") {
    saveHistory("Mover vertice do terreno");
    state.drag = { type: "vertex", id: hit.id };
  } else {
    state.drag = null;
  }
  draw();
}

function onPointerMove(event) {
  const screen = pointerPos(event);
  const rawWorld = screenToWorld(screen);
  const world = applyDraftConstraints(snapPoint(rawWorld));
  state.mouseRawWorld = rawWorld;
  state.mouseWorld = world;
  const snapInfo = state.osnap.marker ? ` | OSNAP ${osnapLabel(state.osnap.marker.type)}` : "";
  const orthoInfo = isOrthoActive() ? " | ORTHO" : "";
  document.getElementById("statusText").textContent = `X ${fmt(world.x, 2)} m  Y ${fmt(world.y, 2)} m${snapInfo}${orthoInfo}${directDistanceSuffix()}${offsetPendingSuffix()}`;

  if (!state.drag) {
    if (state.action || state.offset || ((state.tool === "dimension" || state.tool === "dimensionContinue") && state.measureStart) || state.drawStart || state.polyPoints.length || state.arcStep) draw();
    return;
  }

  if (state.drag.type === "pan") {
    const dx = screen.x - state.drag.start.x;
    const dy = screen.y - state.drag.start.y;
    state.view.x = state.drag.view.x + dx;
    state.view.y = state.drag.view.y + dy;
    draw();
    return;
  }

  if (state.drag.type === "point") {
    const p = getPoint(state.drag.id);
    if (p) {
      p.x = world.x + state.drag.dx;
      p.y = world.y + state.drag.dy;
      refreshSelectionForm();
      draw();
    }
    return;
  }

  if (state.drag.type === "note") {
    const n = getNote(state.drag.id);
    if (n) {
      n.x = world.x + state.drag.dx;
      n.y = world.y + state.drag.dy;
      refreshSelectionForm();
      draw();
    }
    return;
  }

  if (state.drag.type === "entity") {
    const entity = getEntity(state.drag.id);
    if (entity) {
      const dx = world.x - state.drag.last.x;
      const dy = world.y - state.drag.last.y;
      moveEntity(entity, dx, dy);
      const snap = snapEntityToNearbyEdges(entity, { excludeEntityId: entity.id });
      state.drag.last = { x: world.x + snap.x, y: world.y + snap.y };
      state.drag.edgeSnapped = snap.snapped;
      if (snap.snapped) setStatus("Aresta encaixada sem vao/sobreposicao");
      refreshSelectionForm();
      draw();
    }
    return;
  }

  if (state.drag.type === "dimension") {
    const dimension = getDimension(state.drag.id);
    const a = resolveRefPoint(dimension?.a);
    const b = resolveRefPoint(dimension?.b);
    if (dimension && a && b) {
      const dx = world.x - state.drag.last.x;
      const dy = world.y - state.drag.last.y;
      const normal = dimensionNormal(a, b);
      const normalMove = dx * normal.x + dy * normal.y;
      const offset = dimensionOffset(dimension, a, b);
      dimension.offset = {
        x: round(offset.x + normal.x * normalMove, 4),
        y: round(offset.y + normal.y * normalMove, 4)
      };
      state.drag.last = world;
      refreshSelectionForm();
      draw();
    }
    return;
  }

  if (state.drag.type === "vertex") {
    const index = state.drag.id;
    if (project.terrain[index]) {
      project.terrain[index].x = world.x;
      project.terrain[index].y = world.y;
      refreshSelectionForm();
      draw();
    }
  }
}

function onPointerUp(event) {
  if (event.button === 2) {
    event.preventDefault();
    clearTimeout(state.context.longPressTimer);
    const elapsed = performance.now() - state.context.rightDownAt;
    if (elapsed < 250 && !state.context.menuOpen) repeatLastCommand();
    return;
  }
  canvas.releasePointerCapture(event.pointerId);
  state.drag = null;
}

function onWheel(event) {
  event.preventDefault();
  const screen = pointerPos(event);
  const before = screenToWorld(screen);
  const factor = event.deltaY < 0 ? 1.12 : 0.89;
  state.view.scale = clamp(state.view.scale * factor, 2, 80);
  const after = screenToWorld(screen);
  state.view.x += (after.x - before.x) * state.view.scale;
  state.view.y -= (after.y - before.y) * state.view.scale;
  draw();
}

function setTool(tool, options = {}) {
  if (!options.keepAction) state.action = null;
  if (!options.keepOffset) state.offset = null;
  clearDirectDistance();
  clearShortcutBuffer();
  state.tool = tool;
  if (!options.silent && tool !== "select" && tool !== "pan") state.lastCommand = tool;
  document.querySelectorAll(".tool").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tool === tool);
  });
  canvas.style.cursor = tool === "pan" ? "grab" : "crosshair";
  if (tool !== "dimension" && tool !== "dimensionContinue") {
    state.measureStart = null;
    state.measureStartRef = null;
  }
  state.drawStart = null;
  state.polyPoints = [];
  state.arcStep = null;
  setStatus(toolLabel(tool));
}

function toolLabel(tool) {
  return {
    select: "Selecionar",
    selectObject: "Selecionar objeto CAD",
    selectLine: "Selecionar linha/segmento",
    pan: "Pan",
    terrain: "Editar terreno",
    point: "Inserir SP",
    line: "Linha",
    polyline: "Polilinha",
    rectangle: "Retangulo",
    road: "Rua/asfalto",
    sidewalk: "Passeio/guia",
    circle: "Circulo",
    arc: "Arco",
    dimension: "Cota manual",
    dimensionContinue: "Cota continua",
    note: "Inserir texto",
    noteRua: "Texto RUA",
    notePasseio: "Texto PASSEIO"
  }[tool] || tool;
}

function repeatLastCommand() {
  const command = state.lastCommand || "select";
  hideContextMenu();
  if (["copy", "move", "rotate", "mirror", "scale", "array", "trim", "stretch", "offset", "fillet", "explode", "join", "curveTerrain", "curveSidewalk"].includes(command)) {
    runActionCommand(command);
    return;
  }
  setTool(command);
  setStatus(`Repetindo comando: ${toolLabel(command)}`);
}

function runActionCommand(command) {
  const actions = {
    move: moveSelected,
    copy: copySelected,
    rotate: rotateSelected,
    mirror: mirrorSelected,
    scale: scaleSelected,
    array: arraySelected,
    trim: trimSelected,
    stretch: stretchSelected,
    offset: offsetSelected,
    fillet: filletSelected,
    explode: explodeSelected,
    join: joinLines,
    curveTerrain,
    curveSidewalk: curveSelectedArea
  };
  if (actions[command]) {
    state.lastCommand = command;
    actions[command]();
  }
}

function showContextMenu(x, y) {
  const menu = document.getElementById("contextMenu");
  if (!menu) return;
  state.context.menuOpen = true;
  menu.classList.remove("hidden");
  const width = 190;
  const height = 168;
  menu.style.left = `${Math.min(x, window.innerWidth - width - 8)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - height - 8)}px`;
  const repeat = document.getElementById("repeatCommandBtn");
  if (repeat) repeat.textContent = `Repetir ${toolLabel(state.lastCommand || "select")}`;
}

function hideContextMenu() {
  const menu = document.getElementById("contextMenu");
  if (menu) menu.classList.add("hidden");
  state.context.menuOpen = false;
}

function select(sel) {
  state.selected = sel;
  state.formSnapshotArmed = false;
  refreshSelectionForm();
  updateDistanceList();
}

function refreshSelectionForm() {
  const empty = document.getElementById("selectionEmpty");
  const form = document.getElementById("selectionForm");
  const pointOnly = document.querySelectorAll(".point-only");
  const entityOnly = document.querySelector(".entity-only");
  const nameLabel = document.getElementById("selNameLabel");
  const xLabel = document.getElementById("selXLabel");
  const yLabel = document.getElementById("selYLabel");
  const widthLabel = document.getElementById("selWidthLabel");
  const heightLabel = document.getElementById("selHeightLabel");
  const elevLabel = document.getElementById("selElevLabel");
  if (!state.selected) {
    empty.classList.remove("hidden");
    form.classList.add("hidden");
    pointOnly.forEach((node) => node.classList.add("hidden"));
    entityOnly?.classList.add("hidden");
    if (nameLabel) nameLabel.textContent = "Identificacao";
    if (xLabel) xLabel.textContent = "X (m)";
    if (yLabel) yLabel.textContent = "Y (m)";
    if (widthLabel) widthLabel.textContent = "Largura (m)";
    if (heightLabel) heightLabel.textContent = "Altura (m)";
    if (elevLabel) elevLabel.textContent = "Cota topografica (m)";
    return;
  }

  let item = null;
  if (state.selected.type === "point") item = getPoint(state.selected.id);
  if (state.selected.type === "note") item = getNote(state.selected.id);
  if (state.selected.type === "entity") {
    const entity = getEntity(state.selected.id);
    const center = entityCenter(entity);
    const dimensions = entityDimensions(entity);
    item = entity && center ? entity.type === "road" || entity.type === "sidewalk" ? {
      name: entity.name || (entity.type === "sidewalk" ? "Passeio guia" : "Rua asfalto"),
      x: center.x,
      y: center.y,
      width: distance(entity.a, entity.b),
      height: Number(entity.width) || (entity.type === "sidewalk" ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH),
      note: `${entity.type === "sidewalk" ? "Passeio/guia" : "Rua/asfalto"}; comprimento ${fmt(distance(entity.a, entity.b))} m; largura ${fmt(Number(entity.width) || (entity.type === "sidewalk" ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH))} m`
    } : {
      name: entity.name || entity.type,
      x: center.x,
      y: center.y,
      width: dimensions.width,
      height: dimensions.height,
      note: `${entity.type}; L ${fmt(dimensions.width)} m x A ${fmt(dimensions.height)} m`
    } : null;
  }
  if (state.selected.type === "edge") {
    const edge = getTerrainEdge(state.selected.id);
    const center = segmentCenter(edge);
    item = edge && center ? {
      name: `Divisa ${state.selected.id + 1}`,
      x: center.x,
      y: center.y,
      note: `Comprimento ${fmt(distance(edge.a, edge.b))} m`
    } : null;
  }
  if (state.selected.type === "entity-segment") {
    const segment = getEntitySegment(state.selected.id, state.selected.segment);
    const center = segmentCenter(segment);
    item = segment && center ? {
      name: `${segment.entity.name || "Objeto CAD"} - segmento ${state.selected.segment + 1}`,
      x: center.x,
      y: center.y,
      note: `Comprimento ${fmt(distance(segment.a, segment.b))} m`
    } : null;
  }
  if (state.selected.type === "dimension") {
    const dimension = getDimension(state.selected.id);
    const a = resolveRefPoint(dimension?.a);
    const b = resolveRefPoint(dimension?.b);
    if (dimension && a && b) {
      const geom = dimensionWorldGeometry(a, b, dimensionOffset(dimension));
      const offset = dimensionOffset(dimension);
      item = {
        name: dimension.label || `${fmt(distance(a, b))} m`,
        x: geom.label.x,
        y: geom.label.y,
        note: `Afastamento X ${fmt(offset.x)} m, Y ${fmt(offset.y)} m`
      };
    }
  }
  if (state.selected.type === "vertex") {
    item = project.terrain[state.selected.id];
    item = item ? { ...item, name: `Vertice ${state.selected.id + 1}`, note: "" } : null;
  }
  if (!item) {
    select(null);
    return;
  }

  empty.classList.add("hidden");
  form.classList.remove("hidden");
  const isPoint = state.selected.type === "point";
  const isEntity = state.selected.type === "entity";
  const isDimension = state.selected.type === "dimension";
  const selectedEntityItem = isEntity ? getEntity(state.selected.id) : null;
  const isRoad = selectedEntityItem?.type === "road";
  const isSidewalk = selectedEntityItem?.type === "sidewalk";
  pointOnly.forEach((node) => node.classList.toggle("hidden", !isPoint));
  entityOnly?.classList.toggle("hidden", !isEntity);
  if (nameLabel) nameLabel.textContent = isPoint ? "Nome do SP" : isDimension ? "Texto da cota" : "Identificacao";
  if (xLabel) xLabel.textContent = isDimension ? "Texto X (m)" : isEntity || state.selected.type === "edge" || state.selected.type === "entity-segment" ? "Centro X (m)" : "X (m)";
  if (yLabel) yLabel.textContent = isDimension ? "Texto Y (m)" : isEntity || state.selected.type === "edge" || state.selected.type === "entity-segment" ? "Centro Y (m)" : "Y (m)";
  if (widthLabel) widthLabel.textContent = isRoad || isSidewalk ? "Comprimento (m)" : "Largura (m)";
  if (heightLabel) heightLabel.textContent = isSidewalk ? "Largura do passeio (m)" : isRoad ? "Largura da rua (m)" : "Altura (m)";
  if (elevLabel) elevLabel.textContent = "Cota topografica (m)";
  document.getElementById("selName").value = item.name || item.text || "";
  document.getElementById("selX").value = Number(item.x).toFixed(2);
  document.getElementById("selY").value = Number(item.y).toFixed(2);
  document.getElementById("selWidth").value = item.width !== undefined ? Number(item.width).toFixed(2) : "";
  document.getElementById("selHeight").value = item.height !== undefined ? Number(item.height).toFixed(2) : "";
  document.getElementById("selElev").value = item.elev ?? "";
  document.getElementById("selDepth").value = item.depth ?? "";
  document.getElementById("selPileLength").value = item.pileLength ?? "";
  document.getElementById("selRefusalType").value = pointHasRefusal(item) ? pointRefusalKind(item) : "none";
  document.getElementById("selLayers").value = item.layersText || "";
  document.getElementById("selNote").value = item.note || "";
}

function applySelectionForm() {
  if (!state.selected) return;
  const rawX = document.getElementById("selX").value;
  const rawY = document.getElementById("selY").value;
  const rawWidth = document.getElementById("selWidth").value;
  const rawHeight = document.getElementById("selHeight").value;
  const x = Number(rawX);
  const y = Number(rawY);
  const width = Number(rawWidth);
  const height = Number(rawHeight);
  const hasX = hasValue(rawX) && Number.isFinite(x);
  const hasY = hasValue(rawY) && Number.isFinite(y);
  const hasWidth = hasValue(rawWidth) && Number.isFinite(width) && width > 0;
  const hasHeight = hasValue(rawHeight) && Number.isFinite(height) && height > 0;
  if (state.selected.type === "point") {
    const p = getPoint(state.selected.id);
    if (!p) return;
    const name = document.getElementById("selName").value.trim();
    p.name = name || p.name;
    if (hasX) p.x = x;
    if (hasY) p.y = y;
    p.elev = document.getElementById("selElev").value.trim();
    p.depth = document.getElementById("selDepth").value;
    p.pileLength = document.getElementById("selPileLength").value;
    const refusalChoice = document.getElementById("selRefusalType").value;
    p.impenetrable = refusalChoice !== "none";
    p.refusalType = refusalTypeLabel(refusalChoice);
    if (p.impenetrable) p.refusalDepth = p.depth || pointDepthValue(p);
    else p.refusalDepth = "";
    p.layersText = document.getElementById("selLayers").value;
    p.note = document.getElementById("selNote").value;
  }
  if (state.selected.type === "note") {
    const n = getNote(state.selected.id);
    if (!n) return;
    n.text = document.getElementById("selName").value || n.text;
    if (hasX) n.x = x;
    if (hasY) n.y = y;
  }
  if (state.selected.type === "entity") {
    const entity = getEntity(state.selected.id);
    const center = entityCenter(entity);
    if (!entity || !center) return;
    entity.name = document.getElementById("selName").value || entity.name;
    if (hasX || hasY) {
      moveEntity(entity, (hasX ? x : center.x) - center.x, (hasY ? y : center.y) - center.y);
    }
    if (hasWidth || hasHeight) {
      resizeEntityToBounds(entity, hasWidth ? width : null, hasHeight ? height : null);
    }
  }
  if (state.selected.type === "edge") {
    const edge = getTerrainEdge(state.selected.id);
    const center = segmentCenter(edge);
    if (!edge || !center || !hasX || !hasY) return;
    const dx = x - center.x;
    const dy = y - center.y;
    movePoint(edge.a, dx, dy);
    movePoint(edge.b, dx, dy);
  }
  if (state.selected.type === "entity-segment") {
    const segment = getEntitySegment(state.selected.id, state.selected.segment);
    const center = segmentCenter(segment);
    if (!segment || !center || !hasX || !hasY) return;
    const dx = x - center.x;
    const dy = y - center.y;
    movePoint(segment.a, dx, dy);
    movePoint(segment.b, dx, dy);
  }
  if (state.selected.type === "dimension") {
    const dimension = getDimension(state.selected.id);
    const a = resolveRefPoint(dimension?.a);
    const b = resolveRefPoint(dimension?.b);
    if (!dimension || !a || !b) return;
    dimension.label = document.getElementById("selName").value || dimension.label;
    if (hasX || hasY) {
      const geom = dimensionWorldGeometry(a, b, dimensionOffset(dimension, a, b));
      const target = { x: hasX ? x : geom.label.x, y: hasY ? y : geom.label.y };
      dimension.offset = projectDimensionOffset(a, b, {
        x: geom.offset.x + target.x - geom.label.x,
        y: geom.offset.y + target.y - geom.label.y
      });
    }
  }
  if (state.selected.type === "vertex") {
    const v = project.terrain[state.selected.id];
    if (!v) return;
    if (hasX) v.x = x;
    if (hasY) v.y = y;
  }
  updateDistanceList();
  draw();
}

function deleteSelected() {
  if (!state.selected) return;
  if (state.selected.type === "edge") {
    setStatus("Divisa selecionada; use Terreno para editar vertices");
    return;
  }
  if (state.selected.type === "entity-segment") {
    setStatus("Segmento selecionado; use Objeto para apagar a entidade completa");
    return;
  }
  saveHistory("Apagar selecionado");
  if (state.selected.type === "point") {
    project.points = project.points.filter((p) => p.id !== state.selected.id);
    project.dimensions = project.dimensions.filter((d) => d.a.id !== state.selected.id && d.b.id !== state.selected.id);
  }
  if (state.selected.type === "note") {
    project.notes = project.notes.filter((n) => n.id !== state.selected.id);
  }
  if (state.selected.type === "entity") {
    project.entities = project.entities.filter((entity) => entity.id !== state.selected.id);
    project.dimensions = project.dimensions.filter((d) => d.a.id !== state.selected.id && d.b.id !== state.selected.id);
  }
  if (state.selected.type === "dimension") {
    project.dimensions = project.dimensions.filter((dimension) => dimension.id !== state.selected.id);
  }
  if (state.selected.type === "vertex" && project.terrain.length > 3) {
    project.terrain.splice(state.selected.id, 1);
  }
  select(null);
  draw();
}

function nextPointName() {
  const nums = project.points
    .map((p) => (p.name.match(/\d+/) || [0])[0])
    .map(Number)
    .filter(Boolean);
  const next = (Math.max(0, ...nums) + 1).toString().padStart(2, "0");
  return `SP-${next}`;
}

function compareCartesianXY(a, b) {
  const dx = a.x - b.x;
  if (Math.abs(dx) > 0.0001) return dx;
  const dy = a.y - b.y;
  if (Math.abs(dy) > 0.0001) return dy;
  return String(a.id).localeCompare(String(b.id));
}

function refreshAutoDimensionLabels() {
  project.dimensions.forEach((d) => {
    if (d.kind === "auto-xy" && d.sourcePointId) {
      const p = getPoint(d.sourcePointId);
      if (p && d.autoLabelType === "terrain-x") d.label = `${p.name} ate divisa X: ${fmt(distance(resolveRefPoint(d.a), resolveRefPoint(d.b)))} m`;
      if (p && d.autoLabelType === "terrain-y") d.label = `${p.name} ate divisa Y: ${fmt(distance(resolveRefPoint(d.a), resolveRefPoint(d.b)))} m`;
      return;
    }
    if (d.kind !== "auto" || d.a?.type !== "point") return;
    const p = getPoint(d.a.id);
    const target = resolveRefPoint(d.b);
    if (!p || !target) return;
    const labelEdge = d.edgeName || (String(d.label || "").match(/\sa\s([^:]+):/) || [])[1] || "divisa";
    d.label = `${p.name} a ${labelEdge}: ${fmt(distance(p, target))} m`;
  });
}

function renamePointsCartesian() {
  if (!project.points.length) {
    setStatus("Nao ha pontos SP para renomear");
    return;
  }
  saveHistory("Renomear SP por X/Y");
  project.points
    .slice()
    .sort(compareCartesianXY)
    .forEach((p, index) => {
      p.name = `SP-${String(index + 1).padStart(2, "0")}`;
    });
  refreshAutoDimensionLabels();
  refreshSelectionForm();
  updateDistanceList();
  draw();
  setStatus(`SPs renomeados por X/Y: ${project.points.length} ponto(s)`);
}

function updateDistanceList() {
  const box = document.getElementById("distanceList");
  if (!state.selected || state.selected.type !== "point") {
    box.textContent = "Selecione um SP.";
    return;
  }
  const p = getPoint(state.selected.id);
  if (!p || project.terrain.length < 2) {
    box.textContent = "Terreno insuficiente.";
    return;
  }
  const distances = nearestTerrainDistances(p, project.terrain, 4);
  const elev = pointElevationLabel(p) || "Sem cota topografica";
  const summary = `<div class="distance-item distance-summary"><span>${escapeHtml(p.name)}</span><strong>${escapeHtml(elev)}</strong></div>`;
  box.innerHTML = summary + distances.map((d) => {
    return `<div class="distance-item"><span>${escapeHtml(d.edgeName)}</span><strong>${fmt(d.distance)} m</strong></div>`;
  }).join("");
}

function autoDimension() {
  saveHistory("Auto cotar SP X/Y");
  project.dimensions = project.dimensions.filter((d) => d.kind !== "auto" && d.kind !== "auto-xy");
  if (project.terrain.length < 3 || !project.points.length) {
    setStatus("Auto X/Y precisa de terreno fechado e pontos SP");
    draw();
    return;
  }
  const selectedPoint = state.selected?.type === "point" ? getPoint(state.selected.id) : null;
  const targets = selectedPoint ? [selectedPoint] : project.points;
  const created = [];

  targets.forEach((p) => {
    const horizontal = terrainAxisHit(p, "x");
    if (horizontal) {
      created.push(createDimensionFromRefs(
        { type: "point", id: p.id },
        literalDimensionRef(horizontal.point),
        "auto-xy",
        {
          axis: "x",
          autoLabelType: "terrain-x",
          sourcePointId: p.id,
          label: `${p.name} ate divisa X: ${fmt(Math.abs(horizontal.point.x - p.x))} m`
        }
      ));
    }
    const vertical = terrainAxisHit(p, "y");
    if (vertical) {
      created.push(createDimensionFromRefs(
        { type: "point", id: p.id },
        literalDimensionRef(vertical.point),
        "auto-xy",
        {
          axis: "y",
          autoLabelType: "terrain-y",
          sourcePointId: p.id,
          label: `${p.name} ate divisa Y: ${fmt(Math.abs(vertical.point.y - p.y))} m`
        }
      ));
    }
  });

  if (!selectedPoint) {
    created.push(...createContinuousAxisDimensions("x", project.points));
    created.push(...createContinuousAxisDimensions("y", project.points));
  }
  const count = created.filter(Boolean).length;
  setStatus(selectedPoint ? `Auto X/Y para ${selectedPoint.name}: ${count} cota(s)` : `Auto X/Y SP: ${count} cota(s) horizontais/verticais`);
  draw();
}

function terrainBounds() {
  if (!project.terrain.length) return null;
  const xs = project.terrain.map((p) => p.x);
  const ys = project.terrain.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

function terrainAxisHit(point, axis) {
  const intersections = axis === "x" ? terrainIntersectionsAtY(point.y) : terrainIntersectionsAtX(point.x);
  if (!intersections.length) return null;
  if (axis === "x") {
    const right = intersections.filter((x) => x > point.x + 0.001).sort((a, b) => a - b)[0];
    const left = intersections.filter((x) => x < point.x - 0.001).sort((a, b) => b - a)[0];
    const x = Number.isFinite(right) ? right : left;
    return Number.isFinite(x) ? { point: { x, y: point.y } } : null;
  }
  const top = intersections.filter((y) => y > point.y + 0.001).sort((a, b) => a - b)[0];
  const bottom = intersections.filter((y) => y < point.y - 0.001).sort((a, b) => b - a)[0];
  const y = Number.isFinite(top) ? top : bottom;
  return Number.isFinite(y) ? { point: { x: point.x, y } } : null;
}

function terrainIntersectionsAtY(y) {
  const xs = [];
  project.terrain.forEach((a, index) => {
    const b = project.terrain[(index + 1) % project.terrain.length];
    if (Math.abs(a.y - b.y) < 0.0001) {
      if (Math.abs(y - a.y) < 0.0001) xs.push(a.x, b.x);
      return;
    }
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    if (y < minY - 0.0001 || y > maxY + 0.0001) return;
    const t = (y - a.y) / (b.y - a.y);
    if (t >= -0.0001 && t <= 1.0001) xs.push(a.x + (b.x - a.x) * clamp(t, 0, 1));
  });
  return uniqueSortedNumbers(xs);
}

function terrainIntersectionsAtX(x) {
  const ys = [];
  project.terrain.forEach((a, index) => {
    const b = project.terrain[(index + 1) % project.terrain.length];
    if (Math.abs(a.x - b.x) < 0.0001) {
      if (Math.abs(x - a.x) < 0.0001) ys.push(a.y, b.y);
      return;
    }
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    if (x < minX - 0.0001 || x > maxX + 0.0001) return;
    const t = (x - a.x) / (b.x - a.x);
    if (t >= -0.0001 && t <= 1.0001) ys.push(a.y + (b.y - a.y) * clamp(t, 0, 1));
  });
  return uniqueSortedNumbers(ys);
}

function uniqueSortedNumbers(values) {
  return values
    .filter((value) => Number.isFinite(value))
    .map((value) => round(value, 4))
    .sort((a, b) => a - b)
    .filter((value, index, list) => index === 0 || Math.abs(value - list[index - 1]) > 0.02);
}

function createContinuousAxisDimensions(axis, points) {
  const bounds = terrainBounds();
  if (!bounds || !points.length) return [];
  const pad = Math.max(2, Math.min(5, Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.05));
  const values = axis === "x"
    ? uniqueSortedNumbers([bounds.minX, ...points.map((p) => p.x), bounds.maxX])
    : uniqueSortedNumbers([bounds.minY, ...points.map((p) => p.y), bounds.maxY]);
  const rail = axis === "x" ? bounds.minY - pad : bounds.maxX + pad;
  const created = [];
  for (let i = 0; i < values.length - 1; i += 1) {
    const start = values[i];
    const end = values[i + 1];
    if (Math.abs(end - start) < 0.01) continue;
    const a = axis === "x" ? { x: start, y: rail } : { x: rail, y: start };
    const b = axis === "x" ? { x: end, y: rail } : { x: rail, y: end };
    const label = `${axis.toUpperCase()} ${fmt(Math.abs(end - start))} m`;
    created.push(createDimensionFromRefs(
      literalDimensionRef(a),
      literalDimensionRef(b),
      "auto-xy",
      { axis, autoLabelType: axis === "x" ? "chain-x" : "chain-y", label }
    ));
  }
  return created;
}

function nearestTerrainDistances(point, polygon, count) {
  const hits = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const foot = nearestPointOnSegment(point, a, b);
    hits.push({
      edge: i,
      edgeName: `Divisa ${i + 1}`,
      foot,
      distance: distance(point, foot)
    });
  }
  hits.sort((a, b) => a.distance - b.distance);
  const filtered = [];
  hits.forEach((hit) => {
    const duplicate = filtered.some((item) => distance(item.foot, hit.foot) < 0.25);
    if (!duplicate) filtered.push(hit);
  });
  return filtered.slice(0, count);
}

function nearestPointOnSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { ...a };
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function projectedPointOnLine(p, a, b, clampToSegment = false) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { point: { ...a }, t: 0 };
  const rawT = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const t = clampToSegment ? clamp(rawT, 0, 1) : rawT;
  return { point: { x: a.x + dx * t, y: a.y + dy * t }, t: rawT };
}

function osnapBasePoint() {
  if (state.action?.base) return state.action.base;
  if (state.drawStart) return state.drawStart;
  if (state.measureStart) return state.measureStart;
  if (state.polyPoints.length) return state.polyPoints[state.polyPoints.length - 1];
  if (state.arcStep?.center) return state.arcStep.center;
  return null;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function polygonArea(points) {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

function polygonPerimeter(points) {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    sum += distance(points[i], points[(i + 1) % points.length]);
  }
  return sum;
}

function updateStats() {
  document.getElementById("areaStat").textContent = `${fmt(polygonArea(project.terrain), 1)} m2`;
  document.getElementById("perimeterStat").textContent = `${fmt(polygonPerimeter(project.terrain), 1)} m`;
  document.getElementById("entitiesStat").textContent = project.entities.length;
  document.getElementById("pointsStat").textContent = project.points.length;
  document.getElementById("dimsStat").textContent = project.dimensions.length;
  document.getElementById("projectSubtitle").textContent = `Sondamais | ${project.client || "Sem cliente"} - ${project.plotScale}`;
  updateEdgeList();
}

function setStatus(text) {
  document.getElementById("statusText").textContent = text;
}

function setView(view) {
  state.activeView = view === "profile" ? "profile" : "cad";
  document.getElementById("cadView").classList.toggle("hidden", state.activeView !== "cad");
  document.getElementById("profileView").classList.toggle("hidden", state.activeView !== "profile");
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === state.activeView);
  });
  if (state.activeView === "profile") {
    resizeProfileCanvas();
    drawProfile3D();
    updateProfileStatus();
  } else {
    resizeCanvas();
  }
}

function profileCanvasPoint(event) {
  const rect = profileCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function zoomProfileAt(point, factor) {
  const oldZoom = state.profile.zoom;
  const nextZoom = clamp(oldZoom * factor, 0.45, 5);
  if (Math.abs(nextZoom - oldZoom) < 0.001) return;
  const { w, h } = profileScreenSize();
  const center = { x: w / 2, y: h / 2 };
  const modelVector = {
    x: (point.x - center.x - state.profile.x) / oldZoom,
    y: (point.y - center.y - state.profile.y) / oldZoom
  };
  state.profile.zoom = nextZoom;
  state.profile.x = point.x - center.x - modelVector.x * nextZoom;
  state.profile.y = point.y - center.y - modelVector.y * nextZoom;
  state.profile.userAdjusted = true;
  drawProfile3D();
}

function onProfileWheel(event) {
  if (state.activeView !== "profile") return;
  event.preventDefault();
  if (event.shiftKey) {
    const wheelDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    rotateProfileOrbit(clamp(wheelDelta, -240, 240) * 0.12);
    return;
  }
  const factor = event.deltaY < 0 ? 1.13 : 0.885;
  zoomProfileAt(profileCanvasPoint(event), factor);
}

function onProfilePointerDown(event) {
  if (event.button !== 1) return;
  event.preventDefault();
  state.profile.drag = {
    mode: event.shiftKey ? "orbit" : "pan",
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startX: state.profile.x,
    startY: state.profile.y,
    startYaw: state.profile.yaw,
    startPitch: state.profile.pitch
  };
  state.profile.userAdjusted = true;
  profileCanvas.setPointerCapture?.(event.pointerId);
  profileCanvas.classList.toggle("is-panning", state.profile.drag.mode === "pan");
  profileCanvas.classList.toggle("is-orbiting", state.profile.drag.mode === "orbit");
  updateProfileStatus();
}

function onProfilePointerMove(event) {
  const drag = state.profile.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  if (drag.mode === "orbit") {
    setProfileOrbit(drag.startYaw + (event.clientX - drag.x) * 0.32, drag.startPitch - (event.clientY - drag.y) * 0.22, true);
  } else {
    state.profile.x = drag.startX + event.clientX - drag.x;
    state.profile.y = drag.startY + event.clientY - drag.y;
    drawProfile3D();
  }
}

function finishProfilePan(event) {
  const drag = state.profile.drag;
  if (!drag || (event?.pointerId && drag.pointerId !== event.pointerId)) return;
  state.profile.drag = null;
  profileCanvas.releasePointerCapture?.(drag.pointerId);
  profileCanvas.classList.remove("is-panning", "is-orbiting");
  updateProfileStatus();
}

function updateEdgeList() {
  const box = document.getElementById("edgeList");
  if (!box) return;
  const selectedKey = state.selected?.type === "edge" ? state.selected.id : "";
  const signature = project.terrain
    .map((p) => `${round(p.x, 2)},${round(p.y, 2)}`)
    .join("|") + `|${selectedKey}`;
  if (signature === state.edgeListSignature) return;
  state.edgeListSignature = signature;
  box.innerHTML = "";
  if (project.terrain.length < 2) {
    box.textContent = "Sem divisas.";
    return;
  }
  project.terrain.forEach((_, index) => {
    const edge = getTerrainEdge(index);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.key = `D${index + 1}`;
    button.className = state.selected?.type === "edge" && state.selected.id === index ? "is-selected" : "";
    button.innerHTML = `<span>Divisa ${index + 1}</span><strong>${fmt(distance(edge.a, edge.b))} m</strong>`;
    button.addEventListener("click", () => {
      setTool("selectLine");
      select({ type: "edge", id: index });
      setStatus(`Divisa ${index + 1} selecionada`);
      draw();
    });
    box.appendChild(button);
  });
}

function fitToModel() {
  const points = [
    ...project.terrain,
    ...project.entities.flatMap((entity) => entityControlPoints(entity)),
    ...project.points,
    ...project.notes,
    ...project.imports.lines.flatMap((l) => [l.a, l.b]),
    ...project.imports.polylines.flatMap((p) => p.points),
    ...project.imports.circles
  ];
  if (!points.length) return;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const { w, h } = screenSize();
  const pad = 70;
  const scaleX = (w - pad * 2) / Math.max(1, maxX - minX);
  const scaleY = (h - pad * 2) / Math.max(1, maxY - minY);
  state.view.scale = clamp(Math.min(scaleX, scaleY), 3, 46);
  state.view.x = pad - minX * state.view.scale;
  state.view.y = h - pad + minY * state.view.scale;
  draw();
}

function clearDimensions() {
  saveHistory("Limpar cotas");
  project.dimensions = [];
  draw();
}

function addDefaultLot() {
  saveHistory("Inserir lote padrao");
  project.terrain = DEFAULT_TERRAIN.map((point) => ({ ...point }));
  setStatus("Lote padrao inserido");
  fitToModel();
}

function clearLot() {
  if (!project.terrain.length) {
    setStatus("Nao ha lote para apagar");
    return;
  }
  saveHistory("Apagar lote");
  project.terrain = [];
  project.dimensions = project.dimensions.filter((dimension) => dimension.kind !== "auto");
  state.edgeListSignature = "";
  select(null);
  setStatus("Lote/terreno apagado");
  draw();
}

function addPointsGrid() {
  if (project.terrain.length < 3) return;
  saveHistory("Criar malha de SP");
  const xs = project.terrain.map((p) => p.x);
  const ys = project.terrain.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const candidates = [
    { x: minX + (maxX - minX) * 0.25, y: minY + (maxY - minY) * 0.28 },
    { x: minX + (maxX - minX) * 0.72, y: minY + (maxY - minY) * 0.28 },
    { x: minX + (maxX - minX) * 0.50, y: minY + (maxY - minY) * 0.55 },
    { x: minX + (maxX - minX) * 0.28, y: minY + (maxY - minY) * 0.78 },
    { x: minX + (maxX - minX) * 0.75, y: minY + (maxY - minY) * 0.78 }
  ];
  project.points = candidates
    .filter((p) => pointInPolygon(p, project.terrain))
    .map((p, i) => ({
      id: uid("sp"),
      name: `SP-${String(i + 1).padStart(2, "0")}`,
      x: round(p.x, 2),
      y: round(p.y, 2),
      elev: "",
      depth: 12,
      layersText: "",
      note: "Gerado pela malha automatica."
    }));
  autoDimension();
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 0.000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function distanceToSegment(p, a, b) {
  return distance(p, nearestPointOnSegment(p, a, b));
}

function segmentCenter(segment) {
  if (!segment?.a || !segment?.b) return null;
  return { x: (segment.a.x + segment.b.x) / 2, y: (segment.a.y + segment.b.y) / 2 };
}

function angleBetween(center, point) {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function angleOnArc(angle, start, end) {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(start);
  const e = normalizeAngle(end);
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

function radToDeg(angle) {
  return normalizeAngle(angle) * 180 / Math.PI;
}

function rectanglePoints(a, b) {
  return [
    { x: a.x, y: a.y },
    { x: b.x, y: a.y },
    { x: b.x, y: b.y },
    { x: a.x, y: b.y }
  ];
}

function roadPolygon(entity, fallbackWidth = DEFAULT_ROAD_WIDTH) {
  if (!entity?.a || !entity?.b) return [];
  const width = Number(entity.width) > 0 ? Number(entity.width) : fallbackWidth;
  const dx = entity.b.x - entity.a.x;
  const dy = entity.b.y - entity.a.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return [];
  const nx = -dy / length;
  const ny = dx / length;
  const h = width / 2;
  return [
    { x: round(entity.a.x + nx * h, 4), y: round(entity.a.y + ny * h, 4) },
    { x: round(entity.b.x + nx * h, 4), y: round(entity.b.y + ny * h, 4) },
    { x: round(entity.b.x - nx * h, 4), y: round(entity.b.y - ny * h, 4) },
    { x: round(entity.a.x - nx * h, 4), y: round(entity.a.y - ny * h, 4) }
  ];
}

function nextEntityName(base) {
  const count = project.entities.filter((entity) => (entity.name || "").startsWith(base)).length + 1;
  return `${base} ${count}`;
}

function entityControlPoints(entity) {
  if (!entity) return [];
  if (entity.type === "road") return [...roadPolygon(entity), entity.a, entity.b];
  if (entity.type === "sidewalk") return [...roadPolygon(entity, DEFAULT_SIDEWALK_WIDTH), entity.a, entity.b];
  if (entity.type === "line") return [entity.a, entity.b];
  if (entity.type === "polyline") return entity.points;
  if (entity.type === "circle" || entity.type === "arc") {
    return [
      { x: entity.center.x - entity.r, y: entity.center.y - entity.r },
      { x: entity.center.x + entity.r, y: entity.center.y + entity.r },
      entity.center
    ];
  }
  return [];
}

function entityBounds(entity) {
  const points = entityControlPoints(entity);
  if (!points.length) return null;
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y))
  };
}

function boundsFromPoints(points) {
  const valid = (points || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!valid.length) return null;
  return {
    minX: Math.min(...valid.map((p) => p.x)),
    minY: Math.min(...valid.map((p) => p.y)),
    maxX: Math.max(...valid.map((p) => p.x)),
    maxY: Math.max(...valid.map((p) => p.y))
  };
}

function selectionBounds(selection = state.selected) {
  if (!selection) return null;
  if (selection.type === "point") {
    const p = getPoint(selection.id);
    return p ? boundsFromPoints([{ x: p.x - 0.8, y: p.y - 0.8 }, { x: p.x + 0.8, y: p.y + 0.8 }]) : null;
  }
  if (selection.type === "note") {
    const n = getNote(selection.id);
    return n ? boundsFromPoints([{ x: n.x - 2, y: n.y - 1 }, { x: n.x + 2, y: n.y + 1 }]) : null;
  }
  if (selection.type === "entity") return entityBounds(getEntity(selection.id));
  if (selection.type === "entity-segment") {
    const segment = getEntitySegment(selection.id, selection.segment);
    return segment ? boundsFromPoints([segment.a, segment.b]) : null;
  }
  if (selection.type === "edge") {
    const edge = getTerrainEdge(selection.id);
    return edge ? boundsFromPoints([edge.a, edge.b]) : null;
  }
  if (selection.type === "vertex") {
    const p = project.terrain[selection.id];
    return p ? boundsFromPoints([{ x: p.x - 0.8, y: p.y - 0.8 }, { x: p.x + 0.8, y: p.y + 0.8 }]) : null;
  }
  return null;
}

function entityDimensions(entity) {
  const bounds = entityBounds(entity);
  if (!bounds) return { width: 0, height: 0 };
  return {
    width: round(Math.abs(bounds.maxX - bounds.minX), 4),
    height: round(Math.abs(bounds.maxY - bounds.minY), 4)
  };
}

function entityCenter(entity) {
  const bounds = entityBounds(entity);
  if (!bounds) return null;
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

function edgeSnapTolerance(entity = null) {
  const visualTolerance = EDGE_SNAP_SCREEN_TOLERANCE / Math.max(1, state.view.scale);
  if (entity?.type === "road" || entity?.type === "sidewalk") {
    const fallback = entity.type === "sidewalk" ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH;
    return Math.max(visualTolerance, (Number(entity.width) || fallback) / 2 + 0.75);
  }
  return visualTolerance;
}

function intervalsNearOrOverlap(aMin, aMax, bMin, bMax, margin) {
  return Math.max(aMin, bMin) <= Math.min(aMax, bMax) + margin;
}

function collectEdgeSnapBounds(excludeEntityId = null) {
  const targets = [];
  if (project.terrain.length >= 2) {
    const terrainBounds = boundsFromPoints(project.terrain);
    if (terrainBounds) targets.push({ id: "terrain", bounds: terrainBounds });
  }
  project.entities.forEach((entity) => {
    if (entity.id === excludeEntityId) return;
    const bounds = entityBounds(entity);
    if (bounds) targets.push({ id: entity.id, bounds });
  });
  const imports = project.imports || { lines: [], polylines: [] };
  const importLinePoints = [
    ...(imports.lines || []).flatMap((item) => [item.a, item.b]),
    ...(imports.polylines || []).flatMap((item) => item.points || [])
  ];
  const importBounds = boundsFromPoints(importLinePoints);
  if (importBounds) targets.push({ id: "imports", bounds: importBounds });
  return targets;
}

function edgeSnapDeltaForBounds(bounds, options = {}) {
  if (!bounds) return { x: 0, y: 0, snapped: false };
  const tolerance = options.tolerance ?? edgeSnapTolerance();
  const margin = Math.max(tolerance, 0.25);
  const best = {
    x: { delta: 0, score: Infinity },
    y: { delta: 0, score: Infinity }
  };
  const consider = (axis, delta, priority = 1) => {
    const distanceToEdge = Math.abs(delta);
    if (distanceToEdge > tolerance || distanceToEdge < 0.00001) return;
    const score = distanceToEdge + priority * 0.001;
    if (score < best[axis].score) best[axis] = { delta, score };
  };

  collectEdgeSnapBounds(options.excludeEntityId).forEach((target) => {
    const t = target.bounds;
    if (intervalsNearOrOverlap(bounds.minY, bounds.maxY, t.minY, t.maxY, margin)) {
      consider("x", t.maxX - bounds.minX, 0.1);
      consider("x", t.minX - bounds.maxX, 0.1);
      consider("x", t.minX - bounds.minX, 0.35);
      consider("x", t.maxX - bounds.maxX, 0.35);
    }
    if (intervalsNearOrOverlap(bounds.minX, bounds.maxX, t.minX, t.maxX, margin)) {
      consider("y", t.maxY - bounds.minY, 0.1);
      consider("y", t.minY - bounds.maxY, 0.1);
      consider("y", t.minY - bounds.minY, 0.35);
      consider("y", t.maxY - bounds.maxY, 0.35);
    }
  });

  const x = Number.isFinite(best.x.score) ? round(best.x.delta, 4) : 0;
  const y = Number.isFinite(best.y.score) ? round(best.y.delta, 4) : 0;
  return { x, y, snapped: Math.abs(x) > 0 || Math.abs(y) > 0 };
}

function snapEntityToNearbyEdges(entity, options = {}) {
  const bounds = entityBounds(entity);
  const delta = edgeSnapDeltaForBounds(bounds, {
    excludeEntityId: options.excludeEntityId ?? entity?.id,
    tolerance: options.tolerance ?? edgeSnapTolerance(entity)
  });
  if (delta.snapped) moveEntity(entity, delta.x, delta.y);
  return delta;
}

function movePoint(p, dx, dy) {
  p.x = round(p.x + dx, 4);
  p.y = round(p.y + dy, 4);
}

function moveEntity(entity, dx, dy) {
  if (entity.type === "road" || entity.type === "sidewalk") {
    movePoint(entity.a, dx, dy);
    movePoint(entity.b, dx, dy);
  }
  if (entity.type === "line") {
    movePoint(entity.a, dx, dy);
    movePoint(entity.b, dx, dy);
  }
  if (entity.type === "polyline") entity.points.forEach((p) => movePoint(p, dx, dy));
  if (entity.type === "circle" || entity.type === "arc") movePoint(entity.center, dx, dy);
}

function transformPoint(p, origin, options) {
  let x = p.x - origin.x;
  let y = p.y - origin.y;
  if (options.mirrorX) y *= -1;
  if (options.mirrorY) x *= -1;
  const scaleX = options.scaleX ?? options.scale ?? 1;
  const scaleY = options.scaleY ?? options.scale ?? 1;
  x *= scaleX;
  y *= scaleY;
  const angle = options.angle ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: round(origin.x + x * cos - y * sin, 4),
    y: round(origin.y + x * sin + y * cos, 4)
  };
}

function transformEntity(entity, origin, options) {
  if (entity.type === "road" || entity.type === "sidewalk") {
    entity.a = transformPoint(entity.a, origin, options);
    entity.b = transformPoint(entity.b, origin, options);
    const factor = options.scale ?? Math.max(Math.abs(options.scaleX ?? 1), Math.abs(options.scaleY ?? 1));
    const fallback = entity.type === "sidewalk" ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH;
    if (factor !== 1) entity.width = round(Math.max(0.2, (Number(entity.width) || fallback) * Math.abs(factor)), 4);
  }
  if (entity.type === "line") {
    entity.a = transformPoint(entity.a, origin, options);
    entity.b = transformPoint(entity.b, origin, options);
  }
  if (entity.type === "polyline") entity.points = entity.points.map((p) => transformPoint(p, origin, options));
  if (entity.type === "circle") {
    entity.center = transformPoint(entity.center, origin, options);
    if (options.scale) entity.r = round(Math.abs(entity.r * options.scale), 4);
  }
  if (entity.type === "arc") {
    const oldCenter = { ...entity.center };
    const oldStart = pointOnCircle(oldCenter, entity.r, entity.start);
    const oldEnd = pointOnCircle(oldCenter, entity.r, entity.end);
    entity.center = transformPoint(oldCenter, origin, options);
    if (options.scale) entity.r = round(Math.abs(entity.r * options.scale), 4);
    const newStart = transformPoint(oldStart, origin, options);
    const newEnd = transformPoint(oldEnd, origin, options);
    entity.start = angleBetween(entity.center, newStart);
    entity.end = angleBetween(entity.center, newEnd);
  }
}

function resizeEntityToBounds(entity, targetWidth, targetHeight) {
  const center = entityCenter(entity);
  const dimensions = entityDimensions(entity);
  if (!entity || !center) return;
  if (entity.type === "road" || entity.type === "sidewalk") {
    const currentLength = distance(entity.a, entity.b);
    const currentWidth = Number(entity.width) || (entity.type === "sidewalk" ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH);
    const targetLength = targetWidth || currentLength;
    const targetRoadWidth = targetHeight || currentWidth;
    if (targetLength > 0 && currentLength > 0.0001) {
      const ux = (entity.b.x - entity.a.x) / currentLength;
      const uy = (entity.b.y - entity.a.y) / currentLength;
      entity.a = { x: round(center.x - ux * targetLength / 2, 4), y: round(center.y - uy * targetLength / 2, 4) };
      entity.b = { x: round(center.x + ux * targetLength / 2, 4), y: round(center.y + uy * targetLength / 2, 4) };
    }
    if (targetRoadWidth > 0) entity.width = round(targetRoadWidth, 4);
    return;
  }
  if (entity.type === "circle" || entity.type === "arc") {
    const diameter = targetWidth || targetHeight;
    if (diameter && diameter > 0) entity.r = round(diameter / 2, 4);
    return;
  }
  const scaleX = targetWidth && dimensions.width > 0.0001 ? targetWidth / dimensions.width : 1;
  const scaleY = targetHeight && dimensions.height > 0.0001 ? targetHeight / dimensions.height : 1;
  if (scaleX === 1 && scaleY === 1) return;
  transformEntity(entity, center, { scaleX, scaleY });
}

function pointOnCircle(center, r, angle) {
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r };
}

function tangentPointsFromPointToCircle(point, circle) {
  const r = circle.r;
  const dx = point.x - circle.center.x;
  const dy = point.y - circle.center.y;
  const d = Math.hypot(dx, dy);
  if (!Number.isFinite(d) || d <= r + 0.0001) return [];
  const baseAngle = Math.atan2(dy, dx);
  const offset = Math.acos(r / d);
  return [
    pointOnCircle(circle.center, r, baseAngle + offset),
    pointOnCircle(circle.center, r, baseAngle - offset)
  ];
}

function cloneEntity(entity) {
  return JSON.parse(JSON.stringify(entity));
}

function selectedEntity() {
  return state.selected?.type === "entity" || state.selected?.type === "entity-segment" ? getEntity(state.selected.id) : null;
}

function selectionAnchor(selection = state.selected) {
  if (!selection) return null;
  if (selection.type === "point") {
    const p = getPoint(selection.id);
    return p ? { x: p.x, y: p.y } : null;
  }
  if (selection.type === "note") {
    const n = getNote(selection.id);
    return n ? { x: n.x, y: n.y } : null;
  }
  if (selection.type === "entity") return entityCenter(getEntity(selection.id));
  if (selection.type === "entity-segment") {
    const segment = getEntitySegment(selection.id, selection.segment);
    return segmentCenter(segment);
  }
  if (selection.type === "edge") {
    const edge = getTerrainEdge(selection.id);
    return segmentCenter(edge);
  }
  if (selection.type === "vertex") {
    const p = project.terrain[selection.id];
    return p ? { x: p.x, y: p.y } : null;
  }
  return null;
}

function canCopySelection(selection = state.selected) {
  return ["entity", "entity-segment", "point", "note"].includes(selection?.type);
}

function startDistanceAction(type) {
  if (!state.selected) {
    setTool("select", { silent: true });
    setStatus(`Selecione um elemento e use ${type === "copy" ? "Copiar" : "Move"} novamente`);
    return;
  }
  if (type === "copy" && !canCopySelection()) {
    setStatus("Copiar aceita objeto CAD, SP ou texto selecionado");
    return;
  }
  const base = selectionAnchor();
  if (!base) {
    setStatus("Nao foi possivel definir ponto base do selecionado");
    return;
  }
  state.action = { type, base, selection: { ...state.selected } };
  state.drag = null;
  state.drawStart = null;
  state.measureStart = null;
  state.measureStartRef = null;
  state.polyPoints = [];
  state.arcStep = null;
  clearDirectDistance();
  setTool("select", { silent: true, keepAction: true });
  setStatus(`${type === "copy" ? "Copiar" : "Move"}: digite distancia e aponte a direcao, ou clique o destino`);
  draw();
}

function actionVector(target = state.mouseWorld) {
  if (!state.action?.base) return null;
  const end = directTarget(state.action.base, target);
  return {
    end,
    dx: round(end.x - state.action.base.x, 4),
    dy: round(end.y - state.action.base.y, 4),
    length: distance(state.action.base, end)
  };
}

function copySelection(dx, dy) {
  const selection = state.selected;
  if (!canCopySelection(selection)) return null;
  if (selection.type === "point") {
    const p = getPoint(selection.id);
    if (!p) return null;
    const copy = { ...JSON.parse(JSON.stringify(p)), id: uid("sp"), name: nextPointName() };
    movePoint(copy, dx, dy);
    project.points.push(copy);
    return { type: "point", id: copy.id };
  }
  if (selection.type === "note") {
    const n = getNote(selection.id);
    if (!n) return null;
    const copy = { ...JSON.parse(JSON.stringify(n)), id: uid("txt") };
    movePoint(copy, dx, dy);
    project.notes.push(copy);
    return { type: "note", id: copy.id };
  }
  const entity = selectedEntity();
  if (!entity) return null;
  const copy = cloneEntity(entity);
  copy.id = uid("ent");
  copy.name = `${entity.name || entity.type} copia`;
  moveEntity(copy, dx, dy);
  project.entities.push(copy);
  const snap = snapEntityToNearbyEdges(copy, { excludeEntityId: copy.id });
  return { type: "entity", id: copy.id, edgeSnapped: snap.snapped };
}

function commitDistanceAction(target = state.mouseWorld) {
  if (!state.action) return false;
  const vector = actionVector(target);
  if (!vector || vector.length < 0.0001) {
    setStatus("Informe uma direcao/deslocamento maior");
    return true;
  }
  const type = state.action.type;
  saveHistory(type === "copy" ? "Copiar por distancia" : "Move por distancia");
  let edgeSnapped = false;
  if (type === "copy") {
    const copied = copySelection(vector.dx, vector.dy);
    edgeSnapped = !!copied?.edgeSnapped;
    if (copied) select(copied);
  } else {
    const moved = moveSelection(vector.dx, vector.dy, { snapEdges: true });
    edgeSnapped = !!moved?.edgeSnapped;
    refreshSelectionForm();
  }
  state.action = null;
  clearDirectDistance();
  setStatus(edgeSnapped ? `${type === "copy" ? "Copiado" : "Move aplicado"} com aresta encaixada` : `${type === "copy" ? "Copiado" : "Move aplicado"}: ${fmt(vector.length)} m`);
  draw();
  return true;
}

function moveSelected() {
  state.lastCommand = "move";
  startDistanceAction("move");
}

function moveSelection(dx, dy, options = {}) {
  if (!state.selected) return { edgeSnapped: false };
  let edgeSnapped = false;
  if (state.selected.type === "point") {
    const p = getPoint(state.selected.id);
    if (p) movePoint(p, dx, dy);
  }
  if (state.selected.type === "note") {
    const n = getNote(state.selected.id);
    if (n) movePoint(n, dx, dy);
  }
  if (state.selected.type === "vertex") {
    const v = project.terrain[state.selected.id];
    if (v) movePoint(v, dx, dy);
  }
  if (state.selected.type === "edge") {
    const edge = getTerrainEdge(state.selected.id);
    if (edge) {
      movePoint(edge.a, dx, dy);
      movePoint(edge.b, dx, dy);
    }
  }
  if (state.selected.type === "entity") {
    const entity = getEntity(state.selected.id);
    if (entity) {
      moveEntity(entity, dx, dy);
      if (options.snapEdges) {
        const snap = snapEntityToNearbyEdges(entity, { excludeEntityId: entity.id });
        edgeSnapped = snap.snapped;
      }
    }
  }
  if (state.selected.type === "entity-segment") {
    const segment = getEntitySegment(state.selected.id, state.selected.segment);
    if (segment) {
      movePoint(segment.a, dx, dy);
      movePoint(segment.b, dx, dy);
    }
  }
  return { edgeSnapped };
}

function stretchSelected() {
  state.lastCommand = "stretch";
  if (!state.selected) {
    setStatus("Selecione uma divisa, segmento ou vertice para Stretch");
    return;
  }
  const dx = Number(prompt("Stretch X em metros:", "1"));
  const dy = Number(prompt("Stretch Y em metros:", "0"));
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
  if (!["edge", "entity-segment", "vertex"].includes(state.selected.type)) {
    setStatus("Stretch atua em divisas, segmentos CAD ou vertices");
    return;
  }
  saveHistory("Stretch selecionado");
  moveSelection(dx, dy);
  refreshSelectionForm();
  setStatus(`Stretch aplicado: X ${fmt(dx)} m, Y ${fmt(dy)} m`);
  draw();
}

function filletSelected() {
  state.lastCommand = "fillet";
  const radius = Number(prompt("Raio do Fillet em metros:", "1"));
  if (!Number.isFinite(radius) || radius <= 0) return;
  const entity = selectedEntity();
  if (entity?.type === "polyline" && entity.points.length >= 3) {
    saveHistory("Fillet entidade CAD");
    entity.points = filletPolylinePoints(entity.points, entity.closed, radius);
    entity.closed = true;
    select({ type: "entity", id: entity.id });
    setStatus(`Fillet aplicado na polilinha com raio ${fmt(radius)} m`);
    draw();
    return;
  }
  if (entity?.type === "road" || entity?.type === "sidewalk") {
    const oldType = entity.type;
    const polygon = roadPolygon(entity, entity.type === "sidewalk" ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH);
    saveHistory("Fillet calcada/rua");
    entity.type = "polyline";
    entity.points = filletPolylinePoints(polygon, true, radius);
    entity.closed = true;
    entity.layer = entity.layer || (oldType === "road" ? "RUA" : "PASSEIO");
    delete entity.a;
    delete entity.b;
    delete entity.width;
    setStatus(`Fillet aplicado com raio ${fmt(radius)} m`);
    draw();
    return;
  }
  if (state.selected?.type === "edge" || state.selected?.type === "vertex" || (!state.selected && project.terrain.length >= 3)) {
    saveHistory("Fillet terreno");
    project.terrain = filletPolylinePoints(project.terrain, true, radius);
    select(null);
    setStatus(`Fillet aplicado ao terreno com raio ${fmt(radius)} m`);
    draw();
    return;
  }
  setStatus("Fillet exige polilinha CAD ou terreno selecionado");
}

function filletPolylinePoints(points, closed, radius) {
  if (!closed || points.length < 3) return points;
  const result = [];
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[(i - 1 + points.length) % points.length];
    const cur = points[i];
    const next = points[(i + 1) % points.length];
    const v1 = unitVector(cur, prev);
    const v2 = unitVector(cur, next);
    const len1 = distance(cur, prev);
    const len2 = distance(cur, next);
    const dot = clamp(v1.x * v2.x + v1.y * v2.y, -0.98, 0.98);
    const angle = Math.acos(dot);
    const tangent = Math.min(radius / Math.tan(angle / 2), len1 * 0.42, len2 * 0.42);
    if (!Number.isFinite(tangent) || tangent <= 0.01) {
      result.push({ ...cur });
      continue;
    }
    const p1 = { x: round(cur.x + v1.x * tangent, 4), y: round(cur.y + v1.y * tangent, 4) };
    const p2 = { x: round(cur.x + v2.x * tangent, 4), y: round(cur.y + v2.y * tangent, 4) };
    const arcPoints = interpolateArc(p1, p2, cur, 6);
    result.push(p1, ...arcPoints, p2);
  }
  return result;
}

function unitVector(from, to) {
  const len = distance(from, to) || 1;
  return { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
}

function interpolateArc(a, b, toward, steps) {
  const pts = [];
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const mid = {
      x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * toward.x + t * t * b.x,
      y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * toward.y + t * t * b.y
    };
    pts.push({ x: round(mid.x, 4), y: round(mid.y, 4) });
  }
  return pts;
}

function promptFilletRadius(defaultValue = "1") {
  const radius = Number(prompt("Raio da curva em metros:", defaultValue));
  return Number.isFinite(radius) && radius > 0 ? radius : null;
}

function curveTerrain() {
  state.lastCommand = "curveTerrain";
  const radius = promptFilletRadius("2");
  if (!radius) return;
  if (project.terrain.length < 3) {
    setStatus("Crie ou selecione o terreno antes da curva");
    return;
  }
  saveHistory("Curva de terreno");
  project.terrain = filletPolylinePoints(project.terrain, true, radius);
  select(null);
  setStatus(`Curva de terreno aplicada: raio ${fmt(radius)} m`);
  draw();
}

function curveSelectedArea() {
  state.lastCommand = "curveSidewalk";
  const radius = promptFilletRadius("1");
  if (!radius) return;
  const entity = selectedEntity();
  if (!entity) {
    setStatus("Selecione uma calcada, rua ou polilinha para aplicar curva");
    return;
  }
  if (entity.type === "polyline" && entity.points.length >= 3) {
    saveHistory("Curva de polilinha");
    entity.points = filletPolylinePoints(entity.points, true, radius);
    entity.closed = true;
    setStatus(`Curva aplicada na polilinha: raio ${fmt(radius)} m`);
    draw();
    return;
  }
  if (entity.type === "road" || entity.type === "sidewalk") {
    const polygon = roadPolygon(entity, entity.type === "sidewalk" ? DEFAULT_SIDEWALK_WIDTH : DEFAULT_ROAD_WIDTH);
    if (polygon.length < 3) return;
    saveHistory(entity.type === "sidewalk" ? "Curva de calcada" : "Curva de rua");
    entity.type = "polyline";
    entity.points = filletPolylinePoints(polygon, true, radius);
    entity.closed = true;
    entity.layer = entity.layer || (entity.name?.toLowerCase().includes("rua") ? "RUA" : "PASSEIO");
    delete entity.a;
    delete entity.b;
    delete entity.width;
    setStatus(`${entity.layer === "RUA" ? "Rua" : "Calcada"} convertida em curva: raio ${fmt(radius)} m`);
    draw();
    return;
  }
  setStatus("Curva de calcada atua em rua, passeio ou polilinha fechada");
}

function promptOffsetDistance() {
  const raw = prompt("Distancia do Offset em metros:", "1");
  if (raw === null) return null;
  const value = parseNumber(raw);
  if (!Number.isFinite(value) || Math.abs(value) <= 0.0001) return null;
  return value;
}

function promptOffsetSideAmount(distanceValue) {
  const side = (prompt("Lado do Offset: E = esquerda / externo, D = direita / inverso", "E") || "E").trim().toUpperCase();
  const sideSign = ["D", "DIR", "DIREITA", "R", "RIGHT", "-"].includes(side) ? -1 : 1;
  const distanceSign = distanceValue < 0 ? -1 : 1;
  return Math.abs(distanceValue) * sideSign * distanceSign;
}

function segmentOffsetVector(a, b, amount) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return { x: 0, y: 0 };
  return { x: -dy / len * amount, y: dx / len * amount };
}

function addVector(point, vector) {
  return { x: round(point.x + vector.x, 4), y: round(point.y + vector.y, 4) };
}

function lineIntersectionInfinite(a1, a2, b1, b2) {
  const x1 = a1.x;
  const y1 = a1.y;
  const x2 = a2.x;
  const y2 = a2.y;
  const x3 = b1.x;
  const y3 = b1.y;
  const x4 = b2.x;
  const y4 = b2.y;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) <= 0.000001) return null;
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  return { x: round(px, 4), y: round(py, 4) };
}

function offsetVertexFallback(point, n1, n2) {
  const vx = n1.x + n2.x;
  const vy = n1.y + n2.y;
  const len = Math.hypot(vx, vy);
  if (len <= 0.0001) return addVector(point, n2);
  const amount = Math.max(Math.hypot(n1.x, n1.y), Math.hypot(n2.x, n2.y));
  return { x: round(point.x + vx / len * amount, 4), y: round(point.y + vy / len * amount, 4) };
}

function normalizedOffsetPoints(points, closed) {
  const list = (points || []).map((p) => ({ x: Number(p.x), y: Number(p.y) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (closed && list.length > 2 && distance(list[0], list[list.length - 1]) < 0.001) list.pop();
  return list;
}

function offsetPolylinePoints(points, closed, amount) {
  const base = normalizedOffsetPoints(points, closed);
  if (base.length < 2) return [];
  if (base.length === 2) {
    const n = segmentOffsetVector(base[0], base[1], amount);
    return [addVector(base[0], n), addVector(base[1], n)];
  }
  const result = [];
  for (let i = 0; i < base.length; i += 1) {
    if (!closed && i === 0) {
      result.push(addVector(base[i], segmentOffsetVector(base[0], base[1], amount)));
      continue;
    }
    if (!closed && i === base.length - 1) {
      result.push(addVector(base[i], segmentOffsetVector(base[i - 1], base[i], amount)));
      continue;
    }
    const prev = base[(i - 1 + base.length) % base.length];
    const current = base[i];
    const next = base[(i + 1) % base.length];
    const nPrev = segmentOffsetVector(prev, current, amount);
    const nNext = segmentOffsetVector(current, next, amount);
    const a1 = addVector(prev, nPrev);
    const a2 = addVector(current, nPrev);
    const b1 = addVector(current, nNext);
    const b2 = addVector(next, nNext);
    result.push(lineIntersectionInfinite(a1, a2, b1, b2) || offsetVertexFallback(current, nPrev, nNext));
  }
  return result;
}

function offsetLineEntity(a, b, amount, layer, name = "Offset") {
  const n = segmentOffsetVector(a, b, amount);
  return lineEntity(addVector(a, n), addVector(b, n), layer, name);
}

function createOffsetFromSelection(selection, amount) {
  let created = null;
  if (selection?.type === "edge") {
    const edge = getTerrainEdge(selection.id);
    if (edge) created = offsetLineEntity(edge.a, edge.b, amount, "TERRENO", "Offset divisa");
  }
  if (selection?.type === "entity-segment") {
    const segment = getEntitySegment(selection.id, selection.segment);
    if (segment) created = offsetLineEntity(segment.a, segment.b, amount, segment.entity?.layer || "CROQUI", "Offset segmento");
  }
  if (selection?.type === "entity") {
    const entity = getEntity(selection.id);
    if (entity?.type === "line") {
      created = offsetLineEntity(entity.a, entity.b, amount, entity.layer || "CROQUI", `${entity.name || "Linha"} offset`);
    } else if (entity?.type === "polyline") {
      const offsetPoints = offsetPolylinePoints(entity.points, !!entity.closed, amount);
      if (offsetPoints.length >= 2) {
        created = {
          id: uid("ent"),
          type: "polyline",
          name: nextEntityName(`${entity.name || "Polilinha"} offset`),
          points: offsetPoints,
          closed: !!entity.closed,
          layer: entity.layer || "CROQUI"
        };
      }
    } else if (entity?.type === "road" || entity?.type === "sidewalk") {
      created = cloneEntity(entity);
      created.id = uid("ent");
      created.name = nextEntityName(`${entity.name || (entity.type === "road" ? "Rua" : "Passeio")} offset`);
      const n = segmentOffsetVector(entity.a, entity.b, amount);
      created.a = addVector(entity.a, n);
      created.b = addVector(entity.b, n);
    } else if (entity?.type === "circle") {
      const radius = Math.max(0.05, (Number(entity.r) || 0) + amount);
      created = { ...cloneEntity(entity), id: uid("ent"), name: nextEntityName(`${entity.name || "Circulo"} offset`), r: round(radius, 4) };
    } else if (entity?.type === "arc") {
      const radius = Math.max(0.05, (Number(entity.r) || 0) + amount);
      created = { ...cloneEntity(entity), id: uid("ent"), name: nextEntityName(`${entity.name || "Arco"} offset`), r: round(radius, 4) };
    }
  }
  return created;
}

function applyOffsetToSelection(selection, distanceValue) {
  const amount = promptOffsetSideAmount(distanceValue);
  if (!Number.isFinite(amount) || Math.abs(amount) <= 0.0001) {
    setStatus("OFFSET cancelado");
    return false;
  }
  const created = createOffsetFromSelection(selection, amount);
  if (!created) {
    setStatus("OFFSET aceita linha, segmento, divisa, polilinha, rua, passeio, circulo ou arco");
    return false;
  }
  saveHistory("Offset CAD");
  project.entities.push(created);
  select({ type: "entity", id: created.id });
  state.offset = null;
  setTool("select", { silent: true });
  setStatus(`OFFSET criado: ${fmt(Math.abs(amount))} m`);
  draw();
  return true;
}

function offsetSelectionAtPoint(rawWorld, radius) {
  const lineHit = hitTestLine(rawWorld, radius);
  const entityHit = hitTestEntity(rawWorld, radius);
  if (entityHit?.type === "entity") {
    const entity = getEntity(entityHit.id);
    if (entity && ["road", "sidewalk", "circle", "arc"].includes(entity.type)) return entityHit;
  }
  return lineHit || entityHit;
}

function commitOffsetSelection(rawWorld) {
  if (!state.offset) return false;
  const radius = 12 / state.view.scale;
  const selection = offsetSelectionAtPoint(rawWorld, radius);
  if (!selection) {
    setStatus(`OFFSET ${fmt(Math.abs(state.offset.distance))} m: clique em uma linha, segmento, divisa, rua, passeio, circulo ou arco`);
    return true;
  }
  const applied = applyOffsetToSelection(selection, state.offset.distance);
  state.offset = null;
  if (!applied) {
    setTool("select", { silent: true });
    draw();
  }
  return true;
}

function offsetSelected() {
  state.lastCommand = "offset";
  const distanceValue = promptOffsetDistance();
  if (distanceValue === null) {
    setStatus("OFFSET cancelado");
    return;
  }
  state.offset = { distance: distanceValue };
  state.drag = null;
  state.action = null;
  state.drawStart = null;
  state.measureStart = null;
  state.measureStartRef = null;
  state.polyPoints = [];
  state.arcStep = null;
  select(null);
  setTool("selectLine", { silent: true, keepOffset: true });
  setStatus(`OFFSET ${fmt(Math.abs(distanceValue))} m: selecione a linha ou objeto para deslocar`);
  draw();
}

function lineEntity(a, b, layer = "CROQUI", name = "Linha") {
  return {
    id: uid("ent"),
    type: "line",
    name: nextEntityName(name),
    a: { x: round(a.x, 4), y: round(a.y, 4) },
    b: { x: round(b.x, 4), y: round(b.y, 4) },
    layer
  };
}

function explodeSelected() {
  state.lastCommand = "explode";
  const entity = selectedEntity();
  if (!entity) {
    setStatus("Selecione retangulo, polilinha, rua ou calcada para Explode");
    return;
  }
  let points = [];
  let closed = false;
  if (entity.type === "polyline") {
    points = entity.points || [];
    closed = !!entity.closed;
  } else if (entity.type === "road") {
    points = roadPolygon(entity);
    closed = true;
  } else if (entity.type === "sidewalk") {
    points = roadPolygon(entity, DEFAULT_SIDEWALK_WIDTH);
    closed = true;
  }
  if (points.length < 2) {
    setStatus("Explode disponivel para polilinha, retangulo, rua e calcada");
    return;
  }
  saveHistory("Explode entidade CAD");
  const max = closed ? points.length : points.length - 1;
  const layer = entity.layer || "CROQUI";
  for (let i = 0; i < max; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (a && b && distance(a, b) > 0.001) project.entities.push(lineEntity(a, b, layer, `${entity.name || "Explode"} linha`));
  }
  project.entities = project.entities.filter((item) => item.id !== entity.id);
  select(null);
  setStatus(`Explode concluido: ${max} linhas criadas`);
  draw();
}

function joinTolerance() {
  const snapStep = parseNumber(document.getElementById("snapInput")?.value);
  return Math.max(0.12, Number.isFinite(snapStep) ? snapStep * 0.35 : 0.18);
}

function endpointsClose(a, b, tolerance = joinTolerance()) {
  return distance(a, b) <= tolerance;
}

function connectedLineComponent(seedLine, lines, tolerance) {
  const result = [];
  const pending = [seedLine];
  const seen = new Set();
  while (pending.length) {
    const lineItem = pending.pop();
    if (!lineItem || seen.has(lineItem.id)) continue;
    seen.add(lineItem.id);
    result.push(lineItem);
    lines.forEach((candidate) => {
      if (seen.has(candidate.id)) return;
      const close = endpointsClose(lineItem.a, candidate.a, tolerance) ||
        endpointsClose(lineItem.a, candidate.b, tolerance) ||
        endpointsClose(lineItem.b, candidate.a, tolerance) ||
        endpointsClose(lineItem.b, candidate.b, tolerance);
      if (close) pending.push(candidate);
    });
  }
  return result;
}

function orderedPathFromLines(lines, tolerance) {
  if (!lines.length) return [];
  const unused = lines.map((lineItem) => ({ a: lineItem.a, b: lineItem.b }));
  const first = unused.shift();
  const path = [{ ...first.a }, { ...first.b }];
  let changed = true;
  while (unused.length && changed) {
    changed = false;
    for (let i = 0; i < unused.length; i += 1) {
      const segment = unused[i];
      const start = path[0];
      const end = path[path.length - 1];
      if (endpointsClose(end, segment.a, tolerance)) {
        path.push({ ...segment.b });
      } else if (endpointsClose(end, segment.b, tolerance)) {
        path.push({ ...segment.a });
      } else if (endpointsClose(start, segment.b, tolerance)) {
        path.unshift({ ...segment.a });
      } else if (endpointsClose(start, segment.a, tolerance)) {
        path.unshift({ ...segment.b });
      } else {
        continue;
      }
      unused.splice(i, 1);
      changed = true;
      break;
    }
  }
  return path;
}

function joinLines() {
  state.lastCommand = "join";
  const lines = project.entities.filter((entity) => entity.type === "line");
  if (lines.length < 2) {
    setStatus("Join precisa de pelo menos duas linhas CAD");
    return;
  }
  const tolerance = joinTolerance();
  const selected = selectedEntity();
  const seed = selected?.type === "line" ? selected : lines[0];
  const component = connectedLineComponent(seed, lines, tolerance);
  if (component.length < 2) {
    setStatus("Nenhuma linha conectada encontrada para juntar");
    return;
  }
  const path = orderedPathFromLines(component, tolerance);
  if (path.length < 3) {
    setStatus("As linhas selecionadas nao formam uma polilinha util");
    return;
  }
  const closed = endpointsClose(path[0], path[path.length - 1], tolerance);
  if (closed) path.pop();
  saveHistory("Join linhas CAD");
  const ids = new Set(component.map((lineItem) => lineItem.id));
  project.entities = project.entities.filter((entity) => !ids.has(entity.id));
  const entity = {
    id: uid("ent"),
    type: "polyline",
    name: nextEntityName(closed ? "Poligono juntado" : "Polilinha juntada"),
    points: path.map((p) => ({ x: round(p.x, 4), y: round(p.y, 4) })),
    closed,
    layer: component[0].layer || "CROQUI"
  };
  project.entities.push(entity);
  select({ type: "entity", id: entity.id });
  setStatus(closed ? "Join concluido: poligono fechado criado" : "Join concluido: polilinha criada");
  draw();
}

function copySelected() {
  state.lastCommand = "copy";
  startDistanceAction("copy");
}

function rotateSelected() {
  state.lastCommand = "rotate";
  const entity = selectedEntity();
  const center = entityCenter(entity);
  if (!entity || !center) {
    setStatus("Selecione uma entidade CAD para rotacionar");
    return;
  }
  const degrees = Number(prompt("Angulo de rotacao em graus:", "15"));
  if (!Number.isFinite(degrees)) return;
  saveHistory("Rotacionar entidade CAD");
  transformEntity(entity, center, { angle: degrees * Math.PI / 180 });
  setStatus(`Rotacionado ${fmt(degrees, 1)} graus`);
  draw();
}

function mirrorSelected() {
  state.lastCommand = "mirror";
  const entity = selectedEntity();
  const center = entityCenter(entity);
  if (!entity || !center) {
    setStatus("Selecione uma entidade CAD para espelhar");
    return;
  }
  const axis = (prompt("Eixo do espelho: V para vertical, H para horizontal", "V") || "V").trim().toUpperCase();
  saveHistory("Espelhar entidade CAD");
  transformEntity(entity, center, axis === "H" ? { mirrorX: true } : { mirrorY: true });
  setStatus(axis === "H" ? "Espelhado no eixo horizontal" : "Espelhado no eixo vertical");
  draw();
}

function scaleSelected() {
  state.lastCommand = "scale";
  const entity = selectedEntity();
  const center = entityCenter(entity);
  if (!entity || !center) {
    setStatus("Selecione uma entidade CAD para escalar");
    return;
  }
  const factor = Number(prompt("Fator de escala:", "1.2"));
  if (!Number.isFinite(factor) || factor <= 0) return;
  saveHistory("Escalar entidade CAD");
  transformEntity(entity, center, { scale: factor });
  setStatus(`Escala aplicada: ${fmt(factor, 2)}x`);
  draw();
}

function arraySelected() {
  state.lastCommand = "array";
  const entity = selectedEntity();
  if (!entity) {
    setStatus("Selecione uma entidade CAD para matriz");
    return;
  }
  const rows = clamp(Math.floor(Number(prompt("Linhas da matriz:", "2")) || 1), 1, 20);
  const cols = clamp(Math.floor(Number(prompt("Colunas da matriz:", "3")) || 1), 1, 20);
  const dx = Number(prompt("Espacamento X em metros:", "5"));
  const dy = Number(prompt("Espacamento Y em metros:", "5"));
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
  saveHistory("Criar matriz CAD");
  const baseName = entity.name || entity.type;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (r === 0 && c === 0) continue;
      const copy = cloneEntity(entity);
      copy.id = uid("ent");
      copy.name = `${baseName} matriz ${r + 1}-${c + 1}`;
      moveEntity(copy, c * dx, r * dy);
      project.entities.push(copy);
    }
  }
  setStatus(`Matriz criada: ${rows} x ${cols}`);
  draw();
}

function trimSelected() {
  state.lastCommand = "trim";
  const entity = selectedEntity();
  if (!entity || entity.type !== "line") {
    setStatus("Trim atual recorta linhas selecionadas pelo terreno");
    return;
  }
  if (project.terrain.length < 3) {
    setStatus("Crie o terreno antes do Trim");
    return;
  }
  const trimmed = trimLineToPolygon(entity, project.terrain);
  if (!trimmed) {
    setStatus("Linha nao cruza area do terreno");
    return;
  }
  saveHistory("Trim entidade CAD");
  entity.a = trimmed.a;
  entity.b = trimmed.b;
  setStatus("Linha recortada pelo terreno");
  draw();
}

function trimLineToPolygon(lineEntity, polygon) {
  const candidates = [
    { t: 0, p: lineEntity.a, inside: pointInPolygon(lineEntity.a, polygon) },
    { t: 1, p: lineEntity.b, inside: pointInPolygon(lineEntity.b, polygon) }
  ];
  for (let i = 0; i < polygon.length; i += 1) {
    const hit = segmentIntersection(lineEntity.a, lineEntity.b, polygon[i], polygon[(i + 1) % polygon.length]);
    if (hit) candidates.push({ ...hit, inside: true });
  }
  candidates.sort((a, b) => a.t - b.t);
  const insideSegments = [];
  for (let i = 0; i < candidates.length - 1; i += 1) {
    const mid = {
      x: (candidates[i].p.x + candidates[i + 1].p.x) / 2,
      y: (candidates[i].p.y + candidates[i + 1].p.y) / 2
    };
    if (pointInPolygon(mid, polygon)) insideSegments.push({ a: candidates[i].p, b: candidates[i + 1].p });
  }
  if (!insideSegments.length) return null;
  insideSegments.sort((a, b) => distance(b.a, b.b) - distance(a.a, a.b));
  return insideSegments[0];
}

function segmentIntersection(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 0.000001) return null;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, p: { x: round(a.x + t * r.x, 4), y: round(a.y + t * r.y, 4) } };
}

function finishPolyline(close = false) {
  if (state.polyPoints.length < 2) {
    state.polyPoints = [];
    setTool("select");
    draw();
    return;
  }
  saveHistory(close ? "Fechar polilinha" : "Criar polilinha");
  const entity = {
    id: uid("ent"),
    type: "polyline",
    name: nextEntityName(close ? "Poligono" : "Polilinha"),
    points: state.polyPoints.map((p) => ({ ...p })),
    closed: close,
    layer: "CROQUI"
  };
  project.entities.push(entity);
  state.polyPoints = [];
  select({ type: "entity", id: entity.id });
  setTool("select", { silent: true });
  setStatus(close ? "Polilinha fechada" : "Polilinha criada");
  draw();
}

function svgArcPath(entity, ySvg) {
  const start = pointOnCircle(entity.center, entity.r, entity.start);
  const end = pointOnCircle(entity.center, entity.r, entity.end);
  const sweep = normalizeAngle(entity.end - entity.start);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${start.x} ${ySvg(start.y)} A ${entity.r} ${entity.r} 0 ${largeArc} 0 ${end.x} ${ySvg(end.y)}`;
}

function pdfClean(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[()\\]/g, "\\$&");
}

function pdfText(add, text, x, y, size) {
  add(`BT /F1 ${size} Tf ${round(x, 3)} ${round(y, 3)} Td (${pdfClean(text)}) Tj ET`);
}

function pdfLine(add, a, b) {
  add(`${round(a.x, 3)} ${round(a.y, 3)} m`);
  add(`${round(b.x, 3)} ${round(b.y, 3)} l`);
  add("S");
}

function pdfPolygon(add, points, fill = false) {
  if (!points?.length) return;
  add(`${round(points[0].x, 3)} ${round(points[0].y, 3)} m`);
  points.slice(1).forEach((p) => add(`${round(p.x, 3)} ${round(p.y, 3)} l`));
  add("h");
  add(fill ? "B" : "S");
}

function drawPdfSegments(add, points, closed, map) {
  if (!points?.length) return;
  for (let i = 0; i < points.length - 1; i += 1) pdfLine(add, map(points[i]), map(points[i + 1]));
  if (closed && points.length > 2) pdfLine(add, map(points[points.length - 1]), map(points[0]));
}

function drawPdfCircle(add, center, r, segments = 36) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (Math.PI * 2 * i) / segments;
    points.push({ x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r });
  }
  drawPdfSegments(add, points, true, (p) => p);
}

function drawPdfArc(add, center, r, start, end, segments = 24) {
  const sweep = normalizeAngle(end - start) || Math.PI * 2;
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = start + (sweep * i) / segments;
    points.push({ x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r });
  }
  drawPdfSegments(add, points, false, (p) => p);
}

function drawPdfEntity(add, entity, map) {
  if (entity.type === "road") {
    add("q 0.27 0.29 0.30 rg 0.14 0.16 0.17 RG 0.8 w");
    pdfPolygon(add, roadPolygon(entity).map(map), true);
    add("Q");
    add("q 0.85 0.77 0.36 RG 0.45 w [7 6] 0 d");
    pdfLine(add, map(entity.a), map(entity.b));
    add("Q");
    return;
  }
  if (entity.type === "sidewalk") {
    add("q 0.84 0.81 0.74 rg 0.53 0.50 0.43 RG 0.55 w");
    pdfPolygon(add, roadPolygon(entity, DEFAULT_SIDEWALK_WIDTH).map(map), true);
    add("Q");
    add("q 0.96 0.93 0.83 RG 0.35 w [5 4] 0 d");
    pdfLine(add, map(entity.a), map(entity.b));
    add("Q");
    return;
  }
  if (entity.type === "line") pdfLine(add, map(entity.a), map(entity.b));
  if (entity.type === "polyline") drawPdfSegments(add, entity.points, entity.closed, map);
  if (entity.type === "circle") {
    const c = map(entity.center);
    drawPdfCircle(add, c, entity.r * pdfScaleFromMap(map), 40);
  }
  if (entity.type === "arc") {
    const c = map(entity.center);
    drawPdfArc(add, c, entity.r * pdfScaleFromMap(map), entity.start, entity.end, 28);
  }
}

function pdfScaleFromMap(map) {
  const a = map({ x: 0, y: 0 });
  const b = map({ x: 1, y: 0 });
  return Math.abs(b.x - a.x);
}

function makePdf(content) {
  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>");
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function encodePdfPart(part, encoder) {
  if (part instanceof Uint8Array) return part;
  if (Array.isArray(part)) return concatBytes(part.map((item) => encodePdfPart(item, encoder)));
  return encoder.encode(String(part));
}

function makeBinaryPdf(objects) {
  const encoder = new TextEncoder();
  const chunks = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let byteLength = chunks[0].byteLength;
  objects.forEach((obj, index) => {
    offsets.push(byteLength);
    const prefix = encoder.encode(`${index + 1} 0 obj\n`);
    const body = encodePdfPart(obj, encoder);
    const suffix = encoder.encode("\nendobj\n");
    chunks.push(prefix, body, suffix);
    byteLength += prefix.byteLength + body.byteLength + suffix.byteLength;
  });
  const xrefOffset = byteLength;
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  ].join("");
  chunks.push(encoder.encode(xref));
  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function dataUrlToBytes(dataUrl) {
  return base64ToBytes(String(dataUrl).split(",")[1] || "");
}

function makeProfileImagePdf(jpegBytes, imageWidth, imageHeight) {
  const pageW = 842;
  const pageH = 595;
  const margin = 42;
  const titleY = 562;
  const imageMaxW = pageW - margin * 2;
  const imageMaxH = pageH - 128;
  const imageScale = Math.min(imageMaxW / imageWidth, imageMaxH / imageHeight);
  const drawW = round(imageWidth * imageScale, 3);
  const drawH = round(imageHeight * imageScale, 3);
  const x = round((pageW - drawW) / 2, 3);
  const y = round(52 + (imageMaxH - drawH) / 2, 3);
  const ops = [];
  const add = (lineText) => ops.push(lineText);
  add("q 1 1 1 rg 0 0 842 595 re f Q");
  pdfText(add, project.name || "SONDACAD", 42, titleY, 16);
  pdfText(add, `${project.client || "Sem cliente"} | Perfil 3D | SPs ${project.points.length}`, 42, 542, 9);
  add("0.80 0.84 0.80 RG 0.4 w");
  add("42 525 m 808 525 l S");
  add(`q ${drawW} 0 0 ${drawH} ${x} ${y} cm /Im1 Do Q`);
  pdfText(add, "Gerado pelo SONDACAD - Sondamais", 42, 24, 7);
  const content = ops.join("\n");
  const imageStreamHeader = `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`;
  return makeBinaryPdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    [imageStreamHeader, jpegBytes, "\nendstream"]
  ]);
}

function classifyImport() {
  const imp = project.imports;
  let terrainDetected = false;
  saveHistory("Classificar importado");
  const closed = imp.polylines.filter((poly) => poly.closed && poly.points.length >= 3);
  if (closed.length) {
    closed.sort((a, b) => polygonArea(b.points) - polygonArea(a.points));
    project.terrain = closed[0].points.map((p) => ({ x: p.x, y: p.y }));
    terrainDetected = true;
  }

  const spTexts = imp.texts.filter((t) => /S\s*P[-\s]*\d+/i.test(t.text));
  const newPoints = [];
  spTexts.forEach((txt) => {
    const nearestCircle = imp.circles
      .map((c) => ({ c, d: distance(c, txt) }))
      .sort((a, b) => a.d - b.d)[0];
    const source = nearestCircle && nearestCircle.d < 6 ? nearestCircle.c : txt;
    newPoints.push({
      id: uid("sp"),
      name: normalizeSpName(txt.text),
      x: round(source.x, 2),
      y: round(source.y, 2),
      elev: "",
      depth: 12,
      layersText: "",
      note: "Detectado a partir do DXF importado."
    });
  });

  if (newPoints.length) project.points = newPoints;
  if (terrainDetected || newPoints.length) {
    autoDimension();
    fitToModel();
  }
  setStatus(`Classificacao: ${terrainDetected ? "terreno detectado" : "sem terreno"}, ${newPoints.length} SPs`);
}

function pullImportedCadTo3D() {
  const imp = project.imports || { lines: [], polylines: [], circles: [], texts: [] };
  const hasImportedCad = (imp.lines?.length || 0) + (imp.polylines?.length || 0) + (imp.circles?.length || 0) + (imp.texts?.length || 0) > 0;
  if (hasImportedCad) {
    classifyImport();
    applyImportedBoreholeData();
  }
  if (!project.points.length) {
    setStatus(imp.dwg ? "DWG registrado; converta para DXF/PDF CAD vetorial para gerar perfil 3D" : "Sem SPs para gerar perfil 3D");
    return;
  }
  setView("profile");
  drawProfile3D();
  setStatus(`Dados puxados para Perfil 3D: ${project.points.length} SP(s)`);
}

function applyImportedBoreholeData() {
  if (!project.imports?.texts?.length || !project.points.length) return;
  project.points.forEach((p) => {
    const nearby = project.imports.texts
      .map((t) => ({ ...t, d: distance(p, t) }))
      .filter((t) => t.d <= 12)
      .sort((a, b) => a.d - b.d)
      .map((t) => t.text)
      .join("; ");
    const elev = nearby.match(/(?:cota|nivel|n[ií]vel)\s*[:=]?\s*(-?\d+(?:[,.]\d+)?)/i);
    const depth = nearby.match(/(?:prof|profundidade|furo)\s*[:=]?\s*(\d+(?:[,.]\d+)?)/i);
    const layers = nearby.match(/camadas?\s*[:=]\s*([^|]+)/i);
    if (elev && !hasValue(p.elev)) p.elev = elev[1].replace(",", ".");
    if (depth) p.depth = depth[1].replace(",", ".");
    if (layers && !hasValue(p.layersText)) p.layersText = layers[1].trim();
  });
}

async function importSptReportFile(file) {
  const lower = file.name.toLowerCase();
  const report = lower.endsWith(".json")
    ? normalizeSptReportJson(JSON.parse(await file.text()), file.name)
    : parseSondamaisSptReport(await readSptReportText(file), file.name);
  if (!report.points.length) {
    updateSptImportSummary("Nenhum SP reconhecido no relatorio.");
    alert("Nao encontrei blocos SP-01/SP01 no relatorio. Se o PDF for escaneado ou protegido, exporte o texto/CSV do relatorio e importe novamente.");
    return;
  }
  saveHistory("Importar relatorio SPT");
  const result = applySptReport(report);
  project.sptReportSource = report.sourceName;
  project.stratigraphicProfile = "manual";
  state.profile.stratProfile = "manual";
  state.profile.modelSignature = "";
  bindProjectFields();
  refreshSelectionForm();
  updateDistanceList();
  updateSptImportSummary(`${result.updated} SP(s) atualizados, ${result.created} criado(s), ${result.unmatched} sem dados aplicados.`);
  setView("profile");
  draw();
  setStatus(`Relatorio SPT importado: ${result.updated + result.created} SP(s) com camadas`);
}

async function readSptReportText(file) {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    const sourceBytes = new Uint8Array(await file.arrayBuffer());
    const pdfText = await extractPdfTextWithPdfJs(sourceBytes.slice()).catch((error) => {
      console.warn("Falha ao ler PDF com PDF.js", error);
      return "";
    });
    const rawText = extractPdfReadableText(sourceBytes.slice());
    return [pdfText, rawText].filter(Boolean).join("\n\n");
  }
  return file.text();
}

let pdfJsModulePromise = null;

async function loadPdfJsModule() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import(PDFJS_PATH).then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(PDFJS_WORKER_PATH, window.location.href).href;
      return pdfjsLib;
    });
  }
  return pdfJsModulePromise;
}

async function extractPdfTextWithPdfJs(arrayBuffer) {
  const pdfjsLib = await loadPdfJsModule();
  const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer.slice() : new Uint8Array(arrayBuffer).slice();
  const loadingTask = pdfjsLib.getDocument({ data: bytes, disableWorker: true });
  const pdf = await loadingTask.promise;
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(pdfTextContentToText(content));
    }
  } finally {
    await pdf.destroy?.();
  }
  return pages.join("\n\n");
}

function pdfTextContentToText(content) {
  const items = (content.items || [])
    .map((item, index) => ({
      text: String(item.str || "").trim(),
      x: Number(item.transform?.[4]) || 0,
      y: Number(item.transform?.[5]) || 0,
      index
    }))
    .filter((item) => item.text);
  const raw = items.map((item) => item.text).join("\n");
  const rows = [];
  items.slice().sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x).forEach((item) => {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.2);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  });
  const visual = rows
    .sort((a, b) => b.y - a.y)
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "))
    .join("\n");
  return `${raw}\n\n${visual}`;
}

function extractPdfReadableText(arrayBuffer) {
  const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  let raw = "";
  try {
    raw = new TextDecoder("latin1").decode(bytes);
  } catch (error) {
    raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  const literals = [];
  const literalPattern = /\((?:\\.|[^\\()])*\)/g;
  let match;
  while ((match = literalPattern.exec(raw)) && literals.length < 9000) {
    const decoded = decodePdfLiteral(match[0]);
    if (decoded && /[a-z0-9]/i.test(decoded)) literals.push(decoded);
  }
  const hexPattern = /<([0-9a-fA-F\s]{8,})>/g;
  while ((match = hexPattern.exec(raw)) && literals.length < 11000) {
    const decoded = decodePdfHexString(match[1]);
    if (decoded && /[a-z0-9]/i.test(decoded)) literals.push(decoded);
  }
  return `${literals.join("\n")}\n${raw.slice(0, 400000)}`;
}

function decodePdfLiteral(token) {
  return token
    .slice(1, -1)
    .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" })[c] || c)
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\s+/g, " ")
    .trim();
}

function decodePdfHexString(value) {
  const hex = value.replace(/\s+/g, "");
  if (hex.length < 4) return "";
  const bytes = [];
  for (let i = 0; i < hex.length - 1; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let i = 2; i < bytes.length - 1; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return out.trim();
  }
  return String.fromCharCode(...bytes).replace(/\s+/g, " ").trim();
}

function normalizeSptReportJson(data, sourceName) {
  const entries = Array.isArray(data) ? data : data.points || data.sondagens || data.spts || [];
  return {
    sourceName,
    points: entries.map((entry, index) => normalizeReportPoint(entry, index)).filter((point) => point.name)
  };
}

function normalizeReportPoint(entry, index) {
  const name = normalizeSpName(entry.name || entry.nome || entry.sp || entry.furo || `SP-${index + 1}`);
  const layers = normalizeReportLayers(entry.layers || entry.camadas || entry.layersText || entry.perfil || "");
  const depth = parseNumber(entry.depth ?? entry.profundidade ?? entry.profundidadePerfurada ?? entry.furo ?? maxLayerBottom(layers));
  const pileLength = parseNumber(entry.pileLength ?? entry.comprimentoEstaca ?? entry.estaca ?? entry.comprimento);
  const refusalText = `${entry.impenetrable || ""} ${entry.impenetravel || ""} ${entry.refusalType || ""} ${entry.observacao || ""}`;
  const impenetrable = !!entry.impenetrable || !!entry.impenetravel || /impenetravel|nega|recusa|matacao|rocha/i.test(removeAccents(refusalText));
  const refusalDepth = parseNumber(entry.refusalDepth ?? entry.profundidadeRecusa ?? entry.nega ?? entry.impenetravelEm ?? depth);
  return {
    name,
    elev: entry.elev ?? entry.cota ?? entry.nivel ?? "",
    depth,
    pileLength,
    layers,
    impenetrable,
    refusalDepth,
    refusalType: entry.refusalType || entry.tipoRecusa || (impenetrable ? pointRefusalName({ refusalType: refusalText }) : ""),
    note: entry.note || entry.observacao || ""
  };
}

function normalizeReportLayers(value) {
  if (Array.isArray(value)) {
    let cursor = 0;
    return value.map((layer) => {
      const explicitTop = parseNumber(layer.top ?? layer.from ?? layer.inicio ?? layer.de);
      const thickness = parseNumber(layer.espessura ?? layer.thickness);
      const top = Number.isFinite(explicitTop) ? explicitTop : cursor;
      const explicitBottom = parseNumber(layer.bottom ?? layer.to ?? layer.fim ?? layer.ate);
      const bottom = Number.isFinite(explicitBottom) ? explicitBottom : top + (Number.isFinite(thickness) ? thickness : 0);
      cursor = Number.isFinite(bottom) ? bottom : cursor;
      return {
        top,
        bottom,
        name: cleanReportLayerName(layer.name || layer.nome || layer.solo || layer.descricao || "Camada")
      };
    }).filter((layer) => Number.isFinite(layer.top) && Number.isFinite(layer.bottom) && layer.bottom > layer.top);
  }
  return parseSptLayerRows(String(value || ""));
}

function parseSondamaisSptReport(text, sourceName) {
  const normalized = normalizeReportText(text);
  const buckets = splitReportBySp(normalized);
  const points = Array.from(buckets.entries())
    .map(([name, block], index) => parseSptBlock(name, block, index))
    .filter((point) => point.layers.length || point.depth || point.impenetrable || point.elev);
  return { sourceName, points };
}

function normalizeReportText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function splitReportBySp(text) {
  const fichaMatches = Array.from(text.matchAll(/SONDAGEM[\s\S]{0,140}?PERCUSS\S*\s*:\s*S\s*P[\s.\-]*(\d{1,3})\b/gi));
  const matches = fichaMatches.length ? fichaMatches : Array.from(text.matchAll(/\bS\s*P[\s.\-]*(\d{1,3})\b/gi));
  const buckets = new Map();
  matches.forEach((match, index) => {
    const name = `SP-${match[1].padStart(2, "0")}`;
    const next = matches[index + 1]?.index ?? text.length;
    const block = text.slice(match.index, next);
    buckets.set(name, `${buckets.get(name) || ""}\n${block}`);
  });
  return buckets;
}

function parseSptBlock(name, block) {
  const clean = normalizeReportText(block);
  const sondamaisLayers = parseSondamaisFichaLayers(clean);
  const layers = sondamaisLayers.length ? sondamaisLayers : parseSptLayerRows(clean);
  const depth = detectSptDepth(clean, layers);
  const pileLength = detectSptPileLength(clean);
  const elev = detectSptElevation(clean);
  const refusal = detectSptRefusal(clean, depth, layers);
  return {
    name,
    elev,
    depth,
    pileLength,
    layers,
    impenetrable: refusal.impenetrable,
    refusalDepth: refusal.depth,
    refusalType: refusal.type,
    note: refusal.impenetrable ? `Relatorio: ${refusal.type} em ${fmt(refusal.depth || depth || 0, 2)} m` : ""
  };
}

function parseSondamaisFichaLayers(text) {
  const hasFichaSignal = /DESCRI[CÇ][AÃ]O\s+DO\s+MATERIAL|PROFUNDIDADE\s+DA\s+CAMADA|SONDAGEM[\s\S]{0,140}?PERCUSS\S*\s*:\s*SP/i.test(text);
  const hasMaterialMarkers = /\n\s*\d{1,2}[,.]\d{2}\s*(?:[-\u2013\u2014]\s*)?\n?[\s\S]{0,180}(?:ATERRO|ARGILA|SILTE|AREIA|SOLO|RESIDUAL)/i.test(text);
  if (!hasFichaSignal && !hasMaterialMarkers) return [];
  const materialText = isolateSondamaisMaterialText(text);
  const entries = [];
  const markerPattern = /(?:^|\n)\s*(\d{1,2}[,.]\d{2})\s*(?:[-\u2013\u2014]\s*)?\n?([\s\S]*?)(?=(?:\n\s*\d{1,2}[,.]\d{2}\s*(?:[-\u2013\u2014]\s*)?)|\n\s*(?:TC|TH|CA|ATERRO\s*-|TRADO\s+CAVADEIRA|30\s*cm\s+INICIAIS|LIMITE\s+DE\s+SONDAGEM|N\.?A\.?\s+LEITURAS)\b|$)/gi;
  let match;
  while ((match = markerPattern.exec(materialText))) {
    const bottom = parseNumber(match[1]);
    const name = cleanSondamaisMaterialName(match[2]);
    if (!Number.isFinite(bottom) || bottom <= 0 || !isSoilDescription(name)) continue;
    entries.push({ bottom, name });
  }
  const unique = [];
  const seen = new Set();
  entries.forEach((entry) => {
    const key = `${round(entry.bottom, 2)}:${removeAccents(entry.name).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(entry);
  });
  if (unique.length < 2) return [];
  unique.sort((a, b) => a.bottom - b.bottom);
  let top = 0;
  return unique.map((entry) => {
    const layer = { top: round(top, 2), bottom: round(entry.bottom, 2), name: entry.name };
    top = entry.bottom;
    return layer;
  }).filter((layer) => layer.bottom > layer.top + 0.01);
}

function isolateSondamaisMaterialText(text) {
  const startCandidates = [
    text.search(/SONDAGEM[\s\S]{0,140}?PERCUSS\S*\s*:\s*SP\s*\d+/i),
    text.search(/\n\s*\d{1,2}[,.]\d{2}\s*(?:[-\u2013\u2014]\s*)?\n?[\s\S]{0,180}(?:ATERRO|ARGILA|SILTE|AREIA|SOLO|RESIDUAL)/i),
    text.search(/DESCRI[CÇ][AÃ]O\s+DO\s+MATERIAL/i)
  ].filter((index) => index >= 0);
  const start = startCandidates.length ? Math.min(...startCandidates) : 0;
  const slice = text.slice(start);
  const endMatch = slice.search(/\n\s*(?:ATERRO\s*-\s*AT|TRADO\s+CAVADEIRA|30\s*cm\s+INICIAIS)\b/i);
  return endMatch > 0 ? slice.slice(0, endMatch) : slice;
}

function cleanSondamaisMaterialName(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((lineText) => lineText.trim())
    .filter(Boolean)
    .filter((lineText) => !/^(?:TC|TH|CA|INI\.?|FIN\.?|N\.?A\.?|E:|OBS\.?|LEGENDAS?:)$/i.test(lineText))
    .filter((lineText) => !/^(?:GR[ÁA]FICO|SPT|PROFUNDIDADE|ENSAIO|PENETRA[CÇ][AÃ]O|RESIST[ÊE]NCIA|INTERPRETA[CÇ][AÃ]O|PERFIL|GEOL[ÓO]GICO|AMOSTRADOR|COTA|LOCAL|OBRA|CLIENTE|DATA|TRABALHO|FOLHA|RESP|ESCALA|DESENHISTA|SONDADOR)/i.test(lineText))
    .join(" ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\-: ]+|[\-: ]+$/g, "")
    .slice(0, 140)
    .trim();
}

function isSoilDescription(name) {
  const key = removeAccents(name).toLowerCase();
  if (key.length < 8) return false;
  return /(aterro|argila|areia|silte|solo|residual|arenoso|argiloso|siltoso|pedregulho|cascalho|rocha|matacao)/i.test(key);
}

function parseSptLayerRows(text) {
  const layers = [];
  const chunks = text.split(/[;\n]+/).map((lineText) => lineText.trim()).filter(Boolean);
  chunks.forEach((lineText) => {
    const normalized = lineText.replace(/\s+/g, " ");
    const forward = normalized.match(/(?:^|\b)(\d+(?:[,.]\d+)?)\s*m?\s*(?:-|a|ate|até)\s*(\d+(?:[,.]\d+)?)\s*m?\s*[-:]?\s*(.+)$/i);
    if (forward) {
      pushLayer(layers, forward[1], forward[2], forward[3]);
      return;
    }
    const reverse = normalized.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 /\-]{3,80})\s+(\d+(?:[,.]\d+)?)\s*m?\s*(?:-|a|ate|até)\s*(\d+(?:[,.]\d+)?)\s*m?$/i);
    if (reverse) pushLayer(layers, reverse[2], reverse[3], reverse[1]);
  });
  const globalPattern = /(\d+(?:[,.]\d+)?)\s*m?\s*(?:-|a|ate|até)\s*(\d+(?:[,.]\d+)?)\s*m?\s*[-:]?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 /\-]{3,70})/gi;
  let match;
  while ((match = globalPattern.exec(text))) pushLayer(layers, match[1], match[2], match[3]);
  return uniqueLayers(layers).sort((a, b) => a.top - b.top);
}

function pushLayer(layers, topText, bottomText, nameText) {
  const top = parseNumber(topText);
  const bottom = parseNumber(bottomText);
  const name = cleanReportLayerName(nameText);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top || !name) return;
  if (/nspt|golpe|amostra|profundidade|cota|nivel|coordenada|cliente|obra|sondagem/i.test(removeAccents(name))) return;
  if (!isSoilDescription(name)) return;
  layers.push({ top, bottom, name });
}

function cleanReportLayerName(text) {
  return String(text || "Camada")
    .replace(/\bSP\s*[\-.\s]*\d+\b/gi, "")
    .replace(/\bN\s*SPT\b.*$/i, "")
    .replace(/\b\d+(?:[,.]\d+)?\s*m\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\-: ]+|[\-: ]+$/g, "")
    .slice(0, 72)
    .trim() || "Camada";
}

function uniqueLayers(layers) {
  const seen = new Set();
  return layers.filter((layer) => {
    const key = `${round(layer.top, 2)}:${round(layer.bottom, 2)}:${removeAccents(layer.name).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectSptDepth(text, layers) {
  const candidates = [];
  const clean = removeAccents(text);
  const patterns = [
    /(?:profundidade|prof\.?\s*final|comprimento\s*(?:perfurado|do\s*furo)|furo|perfurado)\D{0,28}(\d+(?:[,.]\d+)?)/gi,
    /(\d+(?:[,.]\d+)?)\s*m[^\n;]{0,32}(?:final|impenetravel|recusa|nega)/gi
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(clean))) {
      const value = parseNumber(match[1]);
      if (Number.isFinite(value) && value > 0) candidates.push(value);
    }
  });
  const layerBottom = maxLayerBottom(layers);
  if (layerBottom) candidates.push(layerBottom);
  return candidates.length ? Math.max(...candidates) : "";
}

function detectSptPileLength(text) {
  const clean = removeAccents(text);
  const patterns = [
    /(?:comprimento\s*da\s*estaca|comp\.?\s*estaca|estaca)\D{0,28}(\d+(?:[,.]\d+)?)/i,
    /(\d+(?:[,.]\d+)?)\s*m[^\n;]{0,22}(?:de\s*)?estaca/i
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) {
      const value = parseNumber(match[1]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return "";
}

function detectSptElevation(text) {
  const match = removeAccents(text).match(/(?:cota|nivel|rn)\s*(?:topografica)?\s*[:=]?\s*(-?\d+(?:[,.]\d+)?)/i);
  return match ? match[1].replace(",", ".") : "";
}

function detectSptRefusal(text, depth, layers) {
  const clean = removeAccents(text);
  const impenetrable = /impenetravel|nega|recusa|matacao|rocha/i.test(clean);
  if (!impenetrable) return { impenetrable: false, depth: "", type: "" };
  const after = clean.match(/(?:impenetravel|nega|recusa|matacao|rocha)\D{0,36}(\d+(?:[,.]\d+)?)/i);
  const before = clean.match(/(\d+(?:[,.]\d+)?)\s*m?[^\n;]{0,36}(?:impenetravel|nega|recusa|matacao|rocha)/i);
  const refusalDepth = parseNumber(after?.[1] || before?.[1] || depth || maxLayerBottom(layers));
  let type = "Rocha / matacao impenetravel";
  if (/matacao/i.test(clean)) type = "Matacao impenetravel";
  if (/rocha/i.test(clean)) type = "Rocha impenetravel";
  return { impenetrable: true, depth: Number.isFinite(refusalDepth) ? refusalDepth : "", type };
}

function maxLayerBottom(layers) {
  return layers?.length ? Math.max(...layers.map((layer) => layer.bottom).filter(Number.isFinite)) : 0;
}

function applySptReport(report) {
  const existing = new Map(project.points.map((point) => [normalizeSpKey(point.name), point]));
  let updated = 0;
  let created = 0;
  let unmatched = 0;
  report.points.forEach((data, index) => {
    const key = normalizeSpKey(data.name);
    if (!key) {
      unmatched += 1;
      return;
    }
    let point = existing.get(key);
    if (!point) {
      point = createPointFromReport(data, index);
      project.points.push(point);
      existing.set(key, point);
      created += 1;
    } else {
      updated += 1;
    }
    applyReportDataToPoint(point, data, report.sourceName);
  });
  return { updated, created, unmatched };
}

function createPointFromReport(data, index) {
  const ext = modelExtents();
  const x = Number.isFinite(ext.minX) ? ext.minX + 4 + (index % 6) * 4 : index * 4;
  const y = Number.isFinite(ext.minY) ? ext.minY + 4 + Math.floor(index / 6) * 4 : 0;
  return { id: uid("sp"), name: data.name, x, y, elev: "", depth: "", layersText: "", note: "Criado a partir do relatorio SPT." };
}

function applyReportDataToPoint(point, data, sourceName) {
  point.name = normalizeSpName(data.name || point.name);
  point.sptReportImported = true;
  if (hasValue(data.elev)) point.elev = String(data.elev).replace(",", ".");
  if (Number.isFinite(data.depth) && data.depth > 0) point.depth = round(data.depth, 2);
  if (Number.isFinite(data.pileLength) && data.pileLength > 0) point.pileLength = round(data.pileLength, 2);
  if (data.layers?.length) point.layersText = formatSptLayers(data);
  point.impenetrable = !!data.impenetrable;
  if (point.impenetrable) {
    point.refusalDepth = Number.isFinite(data.refusalDepth) && data.refusalDepth > 0 ? round(data.refusalDepth, 2) : point.depth;
    point.refusalType = data.refusalType || "Rocha / matacao impenetravel";
  }
  const sourceNote = `Fonte: ${sourceName}`;
  const notes = [data.note, sourceNote].filter(Boolean).join(" | ");
  if (notes) point.note = notes;
}

function formatSptLayers(data) {
  const rows = uniqueLayers(data.layers).map((layer) => `${fmt(layer.top, 2)}-${fmt(layer.bottom, 2)} ${layer.name}`);
  if (data.impenetrable) {
    const from = Number.isFinite(data.refusalDepth) && data.refusalDepth > 0 ? data.refusalDepth : data.depth || maxLayerBottom(data.layers);
    const to = Math.max(from + 1.2, (data.depth || from) + 1.2);
    if (!rows.some((row) => /impenetravel|rocha|matacao/i.test(removeAccents(row)))) {
      rows.push(`${fmt(from, 2)}-${fmt(to, 2)} ${data.refusalType || "Rocha / matacao impenetravel"}`);
    }
  }
  return rows.join("; ");
}

function updateSptImportSummary(message) {
  const box = document.getElementById("sptImportSummary");
  if (box) box.innerHTML = `<strong>SPT</strong> ${escapeHtml(message)}`;
}

function removeSptReport() {
  const hasReportData = project.sptReportSource || project.points.some((point) => point.sptReportImported || hasValue(point.layersText) || point.impenetrable || hasValue(point.refusalDepth));
  if (!hasReportData) {
    updateSptImportSummary("Nenhum relatorio Sondamais carregado.");
    setStatus("Nao ha relatorio Sondamais para remover");
    return;
  }
  saveHistory("Remover relatorio Sondamais");
  project.points.forEach((point) => {
    point.layersText = "";
    point.depth = "";
    delete point.pileLength;
    delete point.impenetrable;
    delete point.refusalDepth;
    delete point.refusalType;
    delete point.sptReportImported;
    point.note = String(point.note || "")
      .split("|")
      .map((part) => part.trim())
      .filter((part) => part && !/^Fonte:/i.test(part) && !/^Relatorio:/i.test(part))
      .join(" | ");
  });
  project.sptReportSource = "";
  project.stratigraphicProfile = "manual";
  state.profile.stratProfile = "manual";
  state.profile.modelSignature = "";
  syncStratigraphyControls();
  refreshSelectionForm();
  updateSptImportSummary("Relatorio Sondamais removido. Pontos SP mantidos no croqui.");
  draw();
  drawProfile3D();
  setStatus("Perfil estratigrafico Sondamais removido");
}

function normalizeSpName(text) {
  const value = String(text || "").trim();
  const match = value.match(/S\s*P[\-.\s]*(\d+)/i);
  if (!match) return value;
  return `SP-${match[1].padStart(2, "0")}`;
}

function normalizeSpKey(text) {
  const match = normalizeSpName(text).match(/SP-(\d+)/i);
  return match ? `SP${match[1]}` : "";
}

async function importFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".dwg")) {
    importDwgReference(file);
    return;
  }
  const text = await file.text();
  if (lower.endsWith(".pdf")) {
    importPdfCadText(text, file.name);
    return;
  }
  if (lower.endsWith(".json")) {
    saveHistory("Importar JSON");
    const parsed = JSON.parse(text);
    const importedProject = normalizeProject(parsed);
    const tab = activeModelTab();
    if (tab) tab.project = cloneProjectData(importedProject);
    loadProjectIntoWorkspace(importedProject, "Projeto JSON importado");
    return;
  }
  if (lower.endsWith(".dxf") || lower.endsWith(".txt")) {
    saveHistory("Importar DXF");
    project.imports = parseDxf(text);
    fitToModel();
    setStatus("DXF importado para camada de referencia");
    draw();
    return;
  }
  if (lower.endsWith(".svg")) {
    saveHistory("Importar SVG");
    project.imports = parseSvg(text);
    fitToModel();
    setStatus("SVG importado para camada de referencia");
    draw();
  }
}

function importDwgReference(file) {
  saveHistory("Importar DWG");
  project.imports = project.imports || { lines: [], polylines: [], circles: [], texts: [] };
  project.imports.dwg = { name: file.name, size: file.size, importedAt: new Date().toISOString() };
  setStatus("DWG recebido; para extrair geometria/cotas, salve como DXF ou PDF CAD vetorial e use Puxar CAD p/3D");
}

function importPdfCadText(text, filename = "arquivo.pdf") {
  const cad = parsePdfCad(text);
  if (!cad.lines.length) {
    setStatus("PDF sem vetores CAD reconheciveis; use PDF vetorial ou conversor PDF-DXF");
    alert("Nao encontrei linhas vetoriais CAD nesse PDF. Se for PDF escaneado ou comprimido, sera necessario converter para DXF antes de importar.");
    return;
  }
  saveHistory("Importar PDF CAD");
  const created = cad.lines.slice(0, 8000).map((lineItem, index) => ({
    id: uid("ent"),
    type: "line",
    name: `PDF ${index + 1}`,
    a: lineItem.a,
    b: lineItem.b,
    layer: "PDF-CAD"
  }));
  project.entities.push(...created);
  select({ type: "entity", id: created[created.length - 1].id });
  fitToModel();
  setStatus(`PDF CAD importado: ${created.length} linhas de ${filename}`);
}

function normalizeProject(data) {
  return {
    ...createDefaultProject(),
    ...data,
    terrain: Array.isArray(data.terrain) ? data.terrain : [],
    entities: Array.isArray(data.entities) ? data.entities : [],
    points: Array.isArray(data.points) ? data.points : [],
    dimensions: Array.isArray(data.dimensions) ? data.dimensions : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    imports: data.imports || { lines: [], polylines: [], circles: [], texts: [] }
  };
}

function parseDxf(text) {
  const raw = text.replace(/\r/g, "").split("\n").map((line) => line.trim());
  const pairs = [];
  for (let i = 0; i < raw.length - 1; i += 2) {
    pairs.push({ code: raw[i], value: raw[i + 1] });
  }

  const imports = { lines: [], polylines: [], circles: [], texts: [] };
  let entity = null;
  let polylineMode = false;
  let currentPolyline = null;

  function finishEntity() {
    if (!entity) return;
    if (entity.type === "LINE" && hasNums(entity, ["x1", "y1", "x2", "y2"])) {
      imports.lines.push({ a: { x: entity.x1, y: entity.y1 }, b: { x: entity.x2, y: entity.y2 } });
    }
    if (entity.type === "CIRCLE" && hasNums(entity, ["x", "y", "r"])) {
      imports.circles.push({ x: entity.x, y: entity.y, r: Math.abs(entity.r) });
    }
    if ((entity.type === "TEXT" || entity.type === "MTEXT") && hasNums(entity, ["x", "y"])) {
      imports.texts.push({ x: entity.x, y: entity.y, text: entity.text || "" });
    }
    if (entity.type === "LWPOLYLINE" && entity.points?.length) {
      imports.polylines.push({ points: entity.points, closed: entity.closed });
    }
  }

  for (const pair of pairs) {
    if (pair.code === "0") {
      if (pair.value === "VERTEX" && currentPolyline) {
        entity = { type: "VERTEX" };
        continue;
      }
      if (pair.value === "SEQEND") {
        if (currentPolyline?.points.length) imports.polylines.push(currentPolyline);
        currentPolyline = null;
        polylineMode = false;
        entity = null;
        continue;
      }
      finishEntity();
      entity = { type: pair.value, points: [] };
      if (pair.value === "POLYLINE") {
        polylineMode = true;
        currentPolyline = { points: [], closed: false };
      }
      continue;
    }

    if (!entity) continue;

    const num = Number(pair.value);
    if (entity.type === "LINE") {
      if (pair.code === "10") entity.x1 = num;
      if (pair.code === "20") entity.y1 = num;
      if (pair.code === "11") entity.x2 = num;
      if (pair.code === "21") entity.y2 = num;
    } else if (entity.type === "CIRCLE") {
      if (pair.code === "10") entity.x = num;
      if (pair.code === "20") entity.y = num;
      if (pair.code === "40") entity.r = num;
    } else if (entity.type === "TEXT" || entity.type === "MTEXT") {
      if (pair.code === "10") entity.x = num;
      if (pair.code === "20") entity.y = num;
      if (pair.code === "1") entity.text = pair.value;
    } else if (entity.type === "LWPOLYLINE") {
      if (pair.code === "70") entity.closed = (Number(pair.value) & 1) === 1;
      if (pair.code === "10") entity.points.push({ x: num, y: 0 });
      if (pair.code === "20" && entity.points.length) entity.points[entity.points.length - 1].y = num;
    } else if (entity.type === "POLYLINE") {
      if (pair.code === "70" && currentPolyline) currentPolyline.closed = (Number(pair.value) & 1) === 1;
    } else if (entity.type === "VERTEX" && polylineMode && currentPolyline) {
      if (pair.code === "10") entity.x = num;
      if (pair.code === "20") {
        entity.y = num;
        if (Number.isFinite(entity.x)) currentPolyline.points.push({ x: entity.x, y: entity.y });
      }
    }
  }
  finishEntity();
  return imports;
}

function hasNums(obj, keys) {
  return keys.every((key) => Number.isFinite(obj[key]));
}

function parseSvg(text) {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const imports = { lines: [], polylines: [], circles: [], texts: [] };
  doc.querySelectorAll("line").forEach((lineEl) => {
    imports.lines.push({
      a: { x: numAttr(lineEl, "x1"), y: -numAttr(lineEl, "y1") },
      b: { x: numAttr(lineEl, "x2"), y: -numAttr(lineEl, "y2") }
    });
  });
  doc.querySelectorAll("polyline, polygon").forEach((polyEl) => {
    const points = (polyEl.getAttribute("points") || "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number))
      .filter((pair) => pair.length === 2 && pair.every(Number.isFinite))
      .map(([x, y]) => ({ x, y: -y }));
    if (points.length) imports.polylines.push({ points, closed: polyEl.tagName.toLowerCase() === "polygon" });
  });
  doc.querySelectorAll("circle").forEach((circleEl) => {
    imports.circles.push({ x: numAttr(circleEl, "cx"), y: -numAttr(circleEl, "cy"), r: numAttr(circleEl, "r") });
  });
  doc.querySelectorAll("text").forEach((textEl) => {
    imports.texts.push({ x: numAttr(textEl, "x"), y: -numAttr(textEl, "y"), text: textEl.textContent.trim() });
  });
  return imports;
}

function parsePdfCad(text) {
  const marker = text.match(/%CROQUICAD_EXTENTS\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
  const hasMap = !!marker;
  const minX = hasMap ? Number(marker[1]) : 0;
  const minY = hasMap ? Number(marker[2]) : 0;
  const scale = hasMap ? Number(marker[3]) : 10;
  const left = hasMap ? Number(marker[4]) : 0;
  const bottom = hasMap ? Number(marker[5]) : 0;
  const toWorld = (x, y) => ({
    x: round((x - left) / scale + minX, 4),
    y: round((y - bottom) / scale + minY, 4)
  });
  const linePattern = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+m\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+l\s+S/g;
  const lines = [];
  let match;
  while ((match = linePattern.exec(text))) {
    const a = toWorld(Number(match[1]), Number(match[2]));
    const b = toWorld(Number(match[3]), Number(match[4]));
    if (distance(a, b) > 0.01) lines.push({ a, b });
  }
  return { lines, mapped: hasMap };
}

function numAttr(el, attr) {
  const value = Number(el.getAttribute(attr));
  return Number.isFinite(value) ? value : 0;
}

function exportJson() {
  download(`${slug(project.name)}.json`, JSON.stringify(project, null, 2), "application/json");
}

function exportSvg() {
  const svg = buildSvg();
  download(`${slug(project.name)}.svg`, svg, "image/svg+xml");
}

function exportDxf() {
  download(`${slug(project.name)}.dxf`, buildDxf(), "application/dxf");
}

function exportPdf() {
  downloadBlob(`${slug(project.name)}-desenho-2d.pdf`, buildPdf(), "application/pdf");
  setStatus("PDF 2D vetorial exportado");
}

function exportPdf3D() {
  if (!profileCanvas || !profileCtx) {
    setStatus("Perfil 3D indisponivel para exportacao");
    return;
  }
  setView("profile");
  resizeProfileCanvas();
  drawProfile3D();
  const jpegBytes = dataUrlToBytes(profileCanvas.toDataURL("image/jpeg", 0.92));
  const pdf = makeProfileImagePdf(jpegBytes, profileCanvas.width, profileCanvas.height);
  downloadBlob(`${slug(project.name)}-perfil-3d.pdf`, pdf);
  setStatus("PDF 3D exportado");
}

function exportDwg() {
  download(`${slug(project.name)}-dwg-ready.dxf`, buildDxf(), "application/dxf");
  setStatus("DWG: arquivo CAD compativel exportado em DXF; abra no AutoCAD/ODA e salve como DWG");
}

function exportModel2D() {
  download(`${slug(project.name)}-modelo-2d.dxf`, buildDxf(), "application/dxf");
  setStatus("Modelo 2D exportado em DXF");
}

function exportModel3D() {
  download(`${slug(project.name)}-modelo-3d.gltf`, buildGltfModel3D(), "model/gltf+json");
  setStatus("Modelo 3D exportado em glTF");
}

function exportModelsBundle() {
  const base = slug(project.name);
  const zip = buildZip([
    { name: `${base}-modelo-2d.dxf`, content: buildDxf() },
    { name: `${base}-modelo-3d.gltf`, content: buildGltfModel3D() }
  ]);
  downloadBlob(`${base}-modelos-2d-3d.zip`, zip);
  setStatus("Modelos 2D e 3D exportados em um ZIP");
}

function toggleExportMenu() {
  const menu = document.getElementById("exportMenu");
  const button = document.getElementById("exportMenuBtn");
  if (!menu || !button) return;
  const willOpen = menu.classList.contains("hidden");
  menu.classList.toggle("hidden", !willOpen);
  button.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function hideExportMenu() {
  const menu = document.getElementById("exportMenu");
  const button = document.getElementById("exportMenuBtn");
  if (menu) menu.classList.add("hidden");
  if (button) button.setAttribute("aria-expanded", "false");
}

function runExportOption(fn) {
  hideExportMenu();
  fn();
}

function buildGltfModel3D() {
  const points = project.points.filter((p) => Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)));
  const ext = model3DExtents(points);
  const depthMax = Math.max(4, ...points.map(pointModelDepthValue));
  const zTop = points.length ? Math.max(...points.map(pointElevationValue), 0) : 0;
  const zBottom = points.length ? Math.min(...points.map((p) => pointElevationValue(p) - pointModelDepthValue(p)), zTop - depthMax) : -depthMax;
  const builder = createGltfMeshBuilder();
  addGltfBottom(builder, ext, zBottom);
  addGltfTerrainSurface(builder, points, ext);
  addGltfStratigraphySides(builder, points, ext);
  addGltfBoreholes(builder, points);
  return buildGltfDocument(builder, {
    name: project.name || "SONDACAD",
    client: project.client || "",
    scale: project.plotScale || "1:200",
    profile: STRATIGRAPHIC_PROFILES[project.stratigraphicProfile]?.name || "Camadas dos SPs",
    sptReport: project.sptReportSource || ""
  });
}

function model3DExtents(points) {
  const source = project.terrain.length >= 3 ? project.terrain : points.length ? points : [{ x: 0, y: 0 }, { x: 40, y: 30 }];
  let minX = Math.min(...source.map((p) => p.x));
  let minY = Math.min(...source.map((p) => p.y));
  let maxX = Math.max(...source.map((p) => p.x));
  let maxY = Math.max(...source.map((p) => p.y));
  if (maxX - minX < 1) maxX = minX + 1;
  if (maxY - minY < 1) maxY = minY + 1;
  return { minX, minY, maxX, maxY };
}

function createGltfMeshBuilder() {
  return {
    primitives: new Map(),
    primitive(name) {
      if (!this.primitives.has(name)) this.primitives.set(name, { material: name, positions: [], indices: [] });
      return this.primitives.get(name);
    },
    addQuad(material, a, b, c, d) {
      const primitive = this.primitive(material);
      const base = primitive.positions.length / 3;
      [a, b, c, d].forEach((p) => primitive.positions.push(...gltfPoint(p)));
      primitive.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    },
    addTriangle(material, a, b, c) {
      const primitive = this.primitive(material);
      const base = primitive.positions.length / 3;
      [a, b, c].forEach((p) => primitive.positions.push(...gltfPoint(p)));
      primitive.indices.push(base, base + 1, base + 2);
    }
  };
}

function gltfPoint(p) {
  return [round(p.x, 4), round(p.z, 4), round(-p.y, 4)];
}

function addGltfBottom(builder, ext, zBottom) {
  builder.addQuad(
    "Base do modelo",
    { x: ext.minX, y: ext.minY, z: zBottom },
    { x: ext.maxX, y: ext.minY, z: zBottom },
    { x: ext.maxX, y: ext.maxY, z: zBottom },
    { x: ext.minX, y: ext.maxY, z: zBottom }
  );
}

function addGltfTerrainSurface(builder, points, ext) {
  const rows = 8;
  const cols = 10;
  const dx = Math.max(1, ext.maxX - ext.minX);
  const dy = Math.max(1, ext.maxY - ext.minY);
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const p1 = { x: ext.minX + dx * i / cols, y: ext.minY + dy * j / rows };
      const p2 = { x: ext.minX + dx * (i + 1) / cols, y: ext.minY + dy * j / rows };
      const p3 = { x: ext.minX + dx * (i + 1) / cols, y: ext.minY + dy * (j + 1) / rows };
      const p4 = { x: ext.minX + dx * i / cols, y: ext.minY + dy * (j + 1) / rows };
      [p1, p2, p3, p4].forEach((p) => { p.z = interpolateTerrainZ(p.x, p.y, points); });
      builder.addQuad("Terreno", p1, p2, p3, p4);
    }
  }
}

function addGltfStratigraphySides(builder, points, ext) {
  addGltfLayerSideX(builder, points, ext, ext.minY);
  addGltfLayerSideX(builder, points, ext, ext.maxY);
  addGltfLayerSideY(builder, points, ext, ext.minX);
  addGltfLayerSideY(builder, points, ext, ext.maxX);
}

function addGltfLayerSideX(builder, points, ext, y) {
  const segments = 12;
  const layerCount = profileLayerCount(points);
  const dx = Math.max(1, ext.maxX - ext.minX);
  for (let i = 0; i < segments; i += 1) {
    const x1 = ext.minX + dx * i / segments;
    const x2 = ext.minX + dx * (i + 1) / segments;
    const midX = (x1 + x2) / 2;
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
      const l1 = profileLayerAt(x1, y, points, layerIndex);
      const l2 = profileLayerAt(x2, y, points, layerIndex);
      if (!l1 || !l2) continue;
      const name = soilLayerNameAt(midX, y, points, layerIndex);
      builder.addQuad(
        name,
        { x: x1, y, z: interpolateTerrainZ(x1, y, points) - l1.top },
        { x: x2, y, z: interpolateTerrainZ(x2, y, points) - l2.top },
        { x: x2, y, z: interpolateTerrainZ(x2, y, points) - l2.bottom },
        { x: x1, y, z: interpolateTerrainZ(x1, y, points) - l1.bottom }
      );
    }
  }
}

function addGltfLayerSideY(builder, points, ext, x) {
  const segments = 10;
  const layerCount = profileLayerCount(points);
  const dy = Math.max(1, ext.maxY - ext.minY);
  for (let i = 0; i < segments; i += 1) {
    const y1 = ext.minY + dy * i / segments;
    const y2 = ext.minY + dy * (i + 1) / segments;
    const midY = (y1 + y2) / 2;
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
      const l1 = profileLayerAt(x, y1, points, layerIndex);
      const l2 = profileLayerAt(x, y2, points, layerIndex);
      if (!l1 || !l2) continue;
      const name = soilLayerNameAt(x, midY, points, layerIndex);
      builder.addQuad(
        name,
        { x, y: y1, z: interpolateTerrainZ(x, y1, points) - l1.top },
        { x, y: y2, z: interpolateTerrainZ(x, y2, points) - l2.top },
        { x, y: y2, z: interpolateTerrainZ(x, y2, points) - l2.bottom },
        { x, y: y1, z: interpolateTerrainZ(x, y1, points) - l1.bottom }
      );
    }
  }
}

function addGltfBoreholes(builder, points) {
  if (!points.length) return;
  const ext = model3DExtents(points);
  const radius = Math.max(0.18, Math.min(ext.maxX - ext.minX, ext.maxY - ext.minY) * 0.012);
  points.forEach((point) => {
    const topZ = pointElevationValue(point);
    soilIntervals(point).forEach((layer) => {
      addGltfCylinderSegment(builder, point.x, point.y, topZ - layer.top, topZ - layer.bottom, radius, layer.name);
    });
    const pileLength = pointPileLengthValue(point);
    if (pileLength) {
      addGltfCylinderSegment(builder, point.x + radius * 2.8, point.y + radius * 2.8, topZ - 0.1, topZ - Math.min(pileLength, pointModelDepthValue(point)), radius * 0.38, "Comprimento da estaca");
    }
    if (pointHasRefusal(point)) {
      addGltfRefusalRock(builder, point, topZ, Math.max(radius * 2.4, 0.55));
    }
  });
}

function addGltfRefusalRock(builder, point, topZ, size) {
  const depth = clamp(pointRefusalDepthValue(point) || pointDepthValue(point), 0.2, pointModelDepthValue(point));
  const center = { x: point.x, y: point.y, z: topZ - depth - Math.max(0.45, size * 0.4) };
  const low = center.z - Math.max(0.35, size * 0.52);
  const high = center.z + Math.max(0.18, size * 0.22);
  const material = pointRefusalName(point);
  const cap = { ...center, z: high };
  const foot = { ...center, z: low };
  const pts = [
    { x: center.x - size, y: center.y - size * 0.55, z: center.z },
    { x: center.x - size * 0.25, y: center.y - size, z: high },
    { x: center.x + size * 0.8, y: center.y - size * 0.45, z: center.z - size * 0.08 },
    { x: center.x + size * 0.7, y: center.y + size * 0.65, z: high - size * 0.18 },
    { x: center.x - size * 0.35, y: center.y + size * 0.85, z: center.z - size * 0.1 },
    { x: center.x - size * 0.9, y: center.y + size * 0.22, z: low + size * 0.18 }
  ];
  for (let i = 0; i < pts.length; i += 1) {
    builder.addTriangle(material, pts[i], pts[(i + 1) % pts.length], foot);
    builder.addTriangle(material, pts[(i + 1) % pts.length], pts[i], cap);
  }
}

function addGltfCylinderSegment(builder, x, y, topZ, bottomZ, radius, material) {
  const sides = 10;
  for (let i = 0; i < sides; i += 1) {
    const a1 = Math.PI * 2 * i / sides;
    const a2 = Math.PI * 2 * (i + 1) / sides;
    builder.addQuad(
      material,
      { x: x + Math.cos(a1) * radius, y: y + Math.sin(a1) * radius, z: topZ },
      { x: x + Math.cos(a2) * radius, y: y + Math.sin(a2) * radius, z: topZ },
      { x: x + Math.cos(a2) * radius, y: y + Math.sin(a2) * radius, z: bottomZ },
      { x: x + Math.cos(a1) * radius, y: y + Math.sin(a1) * radius, z: bottomZ }
    );
  }
}

function buildGltfDocument(builder, extras = {}) {
  const materials = [];
  const materialIndex = new Map();
  const bufferViews = [];
  const accessors = [];
  const meshPrimitives = [];
  const chunks = [];
  let byteOffset = 0;

  function materialFor(name) {
    if (materialIndex.has(name)) return materialIndex.get(name);
    const color = gltfMaterialColor(name);
    const index = materials.length;
    materialIndex.set(name, index);
    materials.push({
      name,
      pbrMetallicRoughness: {
        baseColorFactor: color,
        metallicFactor: 0,
        roughnessFactor: 0.92
      },
      alphaMode: color[3] < 1 ? "BLEND" : "OPAQUE",
      doubleSided: true
    });
    return index;
  }

  function pushBytes(bytes, target) {
    const pad = (4 - (byteOffset % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      byteOffset += pad;
    }
    const viewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.byteLength, target });
    chunks.push(bytes);
    byteOffset += bytes.byteLength;
    return viewIndex;
  }

  builder.primitives.forEach((primitive) => {
    if (!primitive.positions.length || !primitive.indices.length) return;
    const positions = new Float32Array(primitive.positions);
    const indices = positions.length / 3 > 65535 ? new Uint32Array(primitive.indices) : new Uint16Array(primitive.indices);
    const posView = pushBytes(new Uint8Array(positions.buffer), 34962);
    const idxView = pushBytes(new Uint8Array(indices.buffer), 34963);
    const bounds = gltfBounds(primitive.positions);
    const positionAccessor = accessors.length;
    accessors.push({
      bufferView: posView,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: bounds.min,
      max: bounds.max
    });
    const indexAccessor = accessors.length;
    accessors.push({
      bufferView: idxView,
      componentType: indices instanceof Uint32Array ? 5125 : 5123,
      count: indices.length,
      type: "SCALAR"
    });
    meshPrimitives.push({
      attributes: { POSITION: positionAccessor },
      indices: indexAccessor,
      material: materialFor(primitive.material),
      mode: 4
    });
  });

  const bytes = concatBytes(chunks);
  return JSON.stringify({
    asset: { version: "2.0", generator: "SONDACAD" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "SONDACAD modelo 3D", mesh: 0 }],
    meshes: [{ name: extras.name || "Modelo 3D", primitives: meshPrimitives }],
    materials,
    buffers: [{ uri: `data:application/octet-stream;base64,${bytesToBase64(bytes)}`, byteLength: bytes.byteLength }],
    bufferViews,
    accessors,
    extras
  }, null, 2);
}

function gltfBounds(values) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[i + axis]);
      max[axis] = Math.max(max[axis], values[i + axis]);
    }
  }
  return { min, max };
}

function gltfMaterialColor(name) {
  if (name === "Terreno") return [0.45, 0.67, 0.38, 0.86];
  if (name === "Base do modelo") return [0.70, 0.72, 0.70, 0.42];
  if (name === "Comprimento da estaca") return [0.24, 0.40, 0.22, 0.96];
  return hexToRgbaFactor(soilColor(name), 0.92);
}

function hexToRgbaFactor(color, alpha = 1) {
  const match = String(color).match(/^#([0-9a-f]{6})$/i);
  if (!match) return [0.5, 0.5, 0.5, alpha];
  const n = parseInt(match[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

function buildPdf() {
  const pageW = 842;
  const pageH = 595;
  const left = 42;
  const bottom = 42;
  const right = 34;
  const topReserved = 76;
  const ext = modelExtents();
  const modelW = Math.max(1, ext.maxX - ext.minX);
  const modelH = Math.max(1, ext.maxY - ext.minY);
  const scale = Math.min((pageW - left - right) / modelW, (pageH - bottom - topReserved) / modelH);
  const map = (p) => ({
    x: round(left + (p.x - ext.minX) * scale, 3),
    y: round(bottom + (p.y - ext.minY) * scale, 3)
  });
  const ops = [];
  const add = (lineText) => ops.push(lineText);
  add("q 1 1 1 rg 0 0 842 595 re f Q");
  add(`%CROQUICAD_EXTENTS ${round(ext.minX, 6)} ${round(ext.minY, 6)} ${round(scale, 6)} ${left} ${bottom}`);
  pdfText(add, project.name || "SONDACAD", 42, 562, 16);
  pdfText(add, `${project.client || "Sem cliente"} | ${project.plotScale || "1:200"} | Area ${fmt(polygonArea(project.terrain), 1)} m2`, 42, 542, 9);
  add("0.80 0.84 0.80 RG 0.4 w");
  add("42 525 m 808 525 l S");

  add("0.18 0.44 0.27 RG 1.1 w");
  drawPdfSegments(add, project.terrain, true, map);

  add("0.20 0.37 0.54 RG 0.9 w");
  project.entities.forEach((entity) => drawPdfEntity(add, entity, map));

  add("0.74 0.49 0.13 RG 0.7 w [4 3] 0 d");
  project.dimensions.forEach((d) => {
    const a = resolveRefPoint(d.a);
    const b = resolveRefPoint(d.b);
    if (!a || !b) return;
    const geom = dimensionWorldGeometry(a, b, dimensionOffset(d));
    const pa = map(geom.a);
    const pb = map(geom.b);
    const pda = map(geom.da);
    const pdb = map(geom.db);
    if (Math.hypot(geom.da.x - geom.a.x, geom.da.y - geom.a.y) > 0.001) {
      pdfLine(add, pa, pda);
      pdfLine(add, pb, pdb);
    }
    pdfLine(add, pda, pdb);
    pdfText(add, pdfClean(d.label || `${fmt(distance(a, b))} m`), (pda.x + pdb.x) / 2, (pda.y + pdb.y) / 2 + 5, 7);
  });
  add("[] 0 d");

  add("0.17 0.40 0.69 RG 0.9 w");
  project.points.forEach((p) => {
    const s = map(p);
    drawPdfCircle(add, s, 4.5, 18);
    pdfLine(add, { x: s.x - 7, y: s.y }, { x: s.x + 7, y: s.y });
    pdfLine(add, { x: s.x, y: s.y - 7 }, { x: s.x, y: s.y + 7 });
    pdfText(add, p.name, s.x + 7, s.y + 7, 8);
    const elev = pointElevationLabel(p);
    if (elev) pdfText(add, elev, s.x + 7, s.y - 4, 7);
  });

  add("0.13 0.15 0.12 RG 0.6 w");
  project.notes.forEach((n) => {
    const s = map(n);
    pdfText(add, n.text, s.x, s.y, 8);
  });

  pdfText(add, "Gerado pelo SONDACAD - Sondamais", 42, 24, 7);
  return makePdf(ops.join("\n"));
}

function buildSvg() {
  const ext = modelExtents();
  const pad = 8;
  const minX = ext.minX - pad;
  const minY = ext.minY - pad;
  const maxX = ext.maxX + pad;
  const maxY = ext.maxY + pad;
  const width = maxX - minX;
  const height = maxY - minY;
  const ySvg = (y) => maxY - y;
  const poly = project.terrain.map((p) => `${p.x},${ySvg(p.y)}`).join(" ");
  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${ySvg(minY) - height} ${width} ${height}" width="${Math.round(width * 20)}" height="${Math.round(height * 20)}">`,
    `<rect x="${minX}" y="${ySvg(minY) - height}" width="${width}" height="${height}" fill="#fbfcfa"/>`,
    `<polygon points="${poly}" fill="rgba(47,111,69,0.08)" stroke="#2f6f45" stroke-width="0.18"/>`
  ];
  project.entities.forEach((entity) => {
    if (entity.type === "road") {
      const points = roadPolygon(entity).map((p) => `${p.x},${ySvg(p.y)}`).join(" ");
      parts.push(`<polygon points="${points}" fill="#464a4d" stroke="#24282a" stroke-width="0.16"/>`);
      parts.push(`<line x1="${entity.a.x}" y1="${ySvg(entity.a.y)}" x2="${entity.b.x}" y2="${ySvg(entity.b.y)}" stroke="#d9c55e" stroke-width="0.08" stroke-dasharray="0.8 0.65"/>`);
    }
    if (entity.type === "sidewalk") {
      const points = roadPolygon(entity, DEFAULT_SIDEWALK_WIDTH).map((p) => `${p.x},${ySvg(p.y)}`).join(" ");
      parts.push(`<polygon points="${points}" fill="#ddd5c3" stroke="#8f897b" stroke-width="0.14"/>`);
      parts.push(`<line x1="${entity.a.x}" y1="${ySvg(entity.a.y)}" x2="${entity.b.x}" y2="${ySvg(entity.b.y)}" stroke="#f5f1df" stroke-width="0.07" stroke-dasharray="0.6 0.5"/>`);
    }
    if (entity.type === "line") {
      parts.push(`<line x1="${entity.a.x}" y1="${ySvg(entity.a.y)}" x2="${entity.b.x}" y2="${ySvg(entity.b.y)}" stroke="#345f89" stroke-width="0.14"/>`);
    }
    if (entity.type === "polyline") {
      const tag = entity.closed ? "polygon" : "polyline";
      const points = entity.points.map((p) => `${p.x},${ySvg(p.y)}`).join(" ");
      parts.push(`<${tag} points="${points}" fill="${entity.closed ? "rgba(52,95,137,0.08)" : "none"}" stroke="#345f89" stroke-width="0.14"/>`);
    }
    if (entity.type === "circle") {
      parts.push(`<circle cx="${entity.center.x}" cy="${ySvg(entity.center.y)}" r="${entity.r}" fill="none" stroke="#345f89" stroke-width="0.14"/>`);
    }
    if (entity.type === "arc") {
      const arc = svgArcPath(entity, ySvg);
      parts.push(`<path d="${arc}" fill="none" stroke="#345f89" stroke-width="0.14"/>`);
    }
  });
  project.dimensions.forEach((d) => {
    const a = resolveRefPoint(d.a);
    const b = resolveRefPoint(d.b);
    if (!a || !b) return;
    const geom = dimensionWorldGeometry(a, b, dimensionOffset(d));
    if (Math.hypot(geom.da.x - geom.a.x, geom.da.y - geom.a.y) > 0.001) {
      parts.push(`<line x1="${geom.a.x}" y1="${ySvg(geom.a.y)}" x2="${geom.da.x}" y2="${ySvg(geom.da.y)}" stroke="#8b5d18" stroke-width="0.07" stroke-dasharray="0.45 0.35"/>`);
      parts.push(`<line x1="${geom.b.x}" y1="${ySvg(geom.b.y)}" x2="${geom.db.x}" y2="${ySvg(geom.db.y)}" stroke="#8b5d18" stroke-width="0.07" stroke-dasharray="0.45 0.35"/>`);
    }
    parts.push(`<line x1="${geom.da.x}" y1="${ySvg(geom.da.y)}" x2="${geom.db.x}" y2="${ySvg(geom.db.y)}" stroke="#bd7d20" stroke-width="0.1" stroke-dasharray="0.7 0.45"/>`);
    parts.push(`<text x="${geom.label.x}" y="${ySvg(geom.label.y) - 0.7}" font-size="1.2" fill="#8b5d18" text-anchor="middle">${escapeXml(d.label || `${fmt(distance(a, b))} m`)}</text>`);
  });
  project.points.forEach((p) => {
    parts.push(`<circle cx="${p.x}" cy="${ySvg(p.y)}" r="0.65" fill="#fff" stroke="#2b67b1" stroke-width="0.18"/>`);
    parts.push(`<line x1="${p.x - 1}" y1="${ySvg(p.y)}" x2="${p.x + 1}" y2="${ySvg(p.y)}" stroke="#2b67b1" stroke-width="0.12"/>`);
    parts.push(`<line x1="${p.x}" y1="${ySvg(p.y - 1)}" x2="${p.x}" y2="${ySvg(p.y + 1)}" stroke="#2b67b1" stroke-width="0.12"/>`);
    parts.push(`<text x="${p.x + 1.1}" y="${ySvg(p.y) - 1.1}" font-size="1.35" fill="#1e477b">${escapeXml(p.name)}</text>`);
    const elev = pointElevationLabel(p);
    if (elev) parts.push(`<text x="${p.x + 1.1}" y="${ySvg(p.y) + 1.45}" font-size="1.05" fill="#3d674b">${escapeXml(elev)}</text>`);
  });
  project.notes.forEach((n) => {
    parts.push(`<text x="${n.x}" y="${ySvg(n.y)}" font-size="1.2" fill="#20251f" text-anchor="middle">${escapeXml(n.text)}</text>`);
  });
  parts.push("</svg>");
  return parts.join("\n");
}

function buildDxf() {
  const out = [];
  const add = (...values) => out.push(...values.map(String));
  add("0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "6", "0", "ENDSEC");
  add("0", "SECTION", "2", "TABLES");
  add("0", "TABLE", "2", "LAYER", "70", "7");
  ["TERRENO", "CROQUI", "RUA", "SONDAGEM", "COTAS", "TEXTOS", "IMPORTADO"].forEach((layer, i) => {
    add("0", "LAYER", "2", layer, "70", "0", "62", String(i + 2), "6", "CONTINUOUS");
  });
  add("0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES");

  for (let i = 0; i < project.terrain.length; i += 1) {
    const a = project.terrain[i];
    const b = project.terrain[(i + 1) % project.terrain.length];
    addLineDxf(add, "TERRENO", a, b);
  }

  project.entities.forEach((entity) => {
    addEntityDxf(add, entity);
  });

  project.points.forEach((p) => {
    add("0", "CIRCLE", "8", "SONDAGEM", "10", p.x, "20", p.y, "30", "0", "40", "0.45");
    addLineDxf(add, "SONDAGEM", { x: p.x - 0.8, y: p.y }, { x: p.x + 0.8, y: p.y });
    addLineDxf(add, "SONDAGEM", { x: p.x, y: p.y - 0.8 }, { x: p.x, y: p.y + 0.8 });
    addTextDxf(add, "SONDAGEM", p.name, { x: p.x + 0.9, y: p.y + 0.8 }, 0.9);
    const elev = pointElevationLabel(p);
    if (elev) addTextDxf(add, "SONDAGEM", elev, { x: p.x + 0.9, y: p.y - 0.4 }, 0.65);
  });

  project.dimensions.forEach((d) => {
    const a = resolveRefPoint(d.a);
    const b = resolveRefPoint(d.b);
    if (!a || !b) return;
    const geom = dimensionWorldGeometry(a, b, dimensionOffset(d));
    if (Math.hypot(geom.da.x - geom.a.x, geom.da.y - geom.a.y) > 0.001) {
      addLineDxf(add, "COTAS", geom.a, geom.da);
      addLineDxf(add, "COTAS", geom.b, geom.db);
    }
    addLineDxf(add, "COTAS", geom.da, geom.db);
    addTextDxf(add, "COTAS", d.label || `${fmt(distance(a, b))} m`, geom.label, 0.7);
  });

  project.notes.forEach((n) => addTextDxf(add, "TEXTOS", n.text, n, 0.9));
  add("0", "ENDSEC", "0", "EOF");
  return out.join("\n");
}

function addLineDxf(add, layer, a, b) {
  add("0", "LINE", "8", layer, "10", a.x, "20", a.y, "30", "0", "11", b.x, "21", b.y, "31", "0");
}

function addEntityDxf(add, entity) {
  if (entity.type === "road") {
    const points = roadPolygon(entity);
    for (let i = 0; i < points.length; i += 1) addLineDxf(add, "RUA", points[i], points[(i + 1) % points.length]);
    addLineDxf(add, "RUA", entity.a, entity.b);
  }
  if (entity.type === "sidewalk") {
    const points = roadPolygon(entity, DEFAULT_SIDEWALK_WIDTH);
    for (let i = 0; i < points.length; i += 1) addLineDxf(add, "PASSEIO", points[i], points[(i + 1) % points.length]);
    addLineDxf(add, "PASSEIO", entity.a, entity.b);
  }
  if (entity.type === "line") {
    addLineDxf(add, "CROQUI", entity.a, entity.b);
  }
  if (entity.type === "polyline") {
    for (let i = 0; i < entity.points.length - 1; i += 1) addLineDxf(add, "CROQUI", entity.points[i], entity.points[i + 1]);
    if (entity.closed && entity.points.length > 2) addLineDxf(add, "CROQUI", entity.points[entity.points.length - 1], entity.points[0]);
  }
  if (entity.type === "circle") {
    add("0", "CIRCLE", "8", "CROQUI", "10", entity.center.x, "20", entity.center.y, "30", "0", "40", entity.r);
  }
  if (entity.type === "arc") {
    add("0", "ARC", "8", "CROQUI", "10", entity.center.x, "20", entity.center.y, "30", "0", "40", entity.r, "50", radToDeg(entity.start), "51", radToDeg(entity.end));
  }
}

function addTextDxf(add, layer, text, p, height) {
  add("0", "TEXT", "8", layer, "10", p.x, "20", p.y, "30", "0", "40", height, "1", text);
}

function modelExtents() {
  const pts = [
    ...project.terrain,
    ...project.entities.flatMap((entity) => entityControlPoints(entity)),
    ...project.points,
    ...project.notes,
    ...project.imports.lines.flatMap((l) => [l.a, l.b]),
    ...project.imports.polylines.flatMap((p) => p.points),
    ...project.imports.circles
  ];
  if (!pts.length) return { minX: -10, minY: -10, maxX: 50, maxY: 40 };
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y))
  };
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  const stamp = dosDateTime(new Date());
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const bytes = file.content instanceof Uint8Array ? file.content : encoder.encode(String(file.content));
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, stamp.time, true);
    localView.setUint16(12, stamp.date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, bytes.byteLength, true);
    localView.setUint32(22, bytes.byteLength, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    locals.push(local, bytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, stamp.time, true);
    centralView.setUint16(14, stamp.date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, bytes.byteLength, true);
    centralView.setUint32(24, bytes.byteLength, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.byteLength + bytes.byteLength;
  });
  const centralOffset = offset;
  const centralSize = centrals.reduce((sum, item) => sum + item.byteLength, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  return new Blob([concatBytes([...locals, ...centrals, end])], { type: "application/zip" });
}

function dosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

let crcTable = null;

function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return out;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function slug(text) {
  return (text || "sondacad")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "sondacad";
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function escapeXml(text) {
  return escapeHtml(text);
}

function bindProjectFields() {
  document.getElementById("projectNameInput").value = project.name;
  document.getElementById("clientInput").value = project.client;
  document.getElementById("plotScaleInput").value = project.plotScale;
  syncStratigraphyControls();
}

function newProject() {
  const blank = createDefaultProject();
  const tab = activeModelTab();
  if (tab) tab.project = cloneProjectData(blank);
  loadProjectIntoWorkspace(blank, "Projeto vazio criado");
}

function processCommand(raw) {
  const command = raw.trim().toUpperCase();
  if (!command) return;
  const commandParts = command.split(/[\s=]+/).filter(Boolean);
  const commandName = commandParts[0];
  const commandArg = commandParts[1];
  const isOnArg = commandArg === "ON" || commandArg === "1" || commandArg === "ATIVADO";
  const isOffArg = commandArg === "OFF" || commandArg === "0" || commandArg === "DESATIVADO";
  if (commandName === "PE3D" || commandName === "ESTRAT" || commandName === "ESTRATIGRAFIA") {
    const aliases = {
      MANUAL: "manual",
      SP: "manual",
      TROPICAL: "tropical",
      RESIDUAL: "tropical",
      SEDIMENTAR: "sedimentar",
      ARENOSO: "sedimentar",
      ALUVIAL: "aluvial",
      SATURADO: "aluvial",
      ROCHA: "rocha",
      SAPROLITO: "rocha"
    };
    if (commandArg && aliases[commandArg]) {
      project.stratigraphicProfile = aliases[commandArg];
      const input = document.getElementById("stratProfileInput");
      if (input) input.value = project.stratigraphicProfile;
    }
    applyStratigraphicProfile();
    return;
  }
  if (commandName === "M2D" || commandName === "MODELO2D" || commandName === "EXPORT2D") {
    exportModel2D();
    return;
  }
  if (commandName === "PDF2D" || commandName === "PDFDESENHO" || commandName === "EXPORTARPDF2D") {
    exportPdf();
    return;
  }
  if (commandName === "PDF3D" || commandName === "PDFPERFIL" || commandName === "EXPORTARPDF3D") {
    exportPdf3D();
    return;
  }
  if (commandName === "O" || commandName === "OFFSET" || commandName === "OF" || commandName === "OFF") {
    offsetSelected();
    return;
  }
  if (commandName === "X" || commandName === "EXPLODE" || commandName === "EX") {
    explodeSelected();
    return;
  }
  if (commandName === "J" || commandName === "JOIN" || commandName === "JUNTAR") {
    joinLines();
    return;
  }
  if (commandName === "CT" || commandName === "CURVATERR" || commandName === "CURVATERRENO" || commandName === "CURVATERRAIN") {
    curveTerrain();
    return;
  }
  if (commandName === "CC" || commandName === "CURVACALCADA" || commandName === "CURVAPASSEIO") {
    curveSelectedArea();
    return;
  }
  if (commandName === "NOVAABA" || commandName === "MODELOTAB" || commandName === "MODELO+" || commandName === "TAB+") {
    addModelTab();
    return;
  }
  if (commandName === "PDFSPT" || commandName === "SPT" || commandName === "RELSPT" || commandName === "RELATORIOSPT" || commandName === "SONDAMAI" || commandName === "SONDAMAIS") {
    document.getElementById("sptReportInput")?.click();
    return;
  }
  if (commandName === "RSPT" || commandName === "REMOVERSPT" || commandName === "REMOVERRELATORIO") {
    removeSptReport();
    return;
  }
  if (commandName === "M3D" || commandName === "MODELO3D" || commandName === "EXPORT3D") {
    exportModel3D();
    return;
  }
  if (commandName === "2D3D" || commandName === "M23D" || commandName === "MODELOS" || commandName === "EXPORTALL") {
    exportModelsBundle();
    return;
  }
  const toolbarNames = ["TB", "BARRA", "TOOLBAR"];
  if (commandName === "TB+" || commandName === "BARRA+" || commandName === "TOOLBAR+" || (toolbarNames.includes(commandName) && commandArg === "+")) {
    changeToolbarScale(TOOLBAR_SCALE_STEP);
    return;
  }
  if (commandName === "TB-" || commandName === "BARRA-" || commandName === "TOOLBAR-" || (toolbarNames.includes(commandName) && commandArg === "-")) {
    changeToolbarScale(-TOOLBAR_SCALE_STEP);
    return;
  }
  if (toolbarNames.includes(commandName)) {
    if (commandArg === "RESET" || commandArg === "PADRAO") {
      setToolbarScale(TOOLBAR_SCALE_DEFAULT);
      return;
    }
    const requestedScale = parseNumber(commandArg);
    if (Number.isFinite(requestedScale)) {
      setToolbarScale(requestedScale > 2 ? requestedScale / 100 : requestedScale);
      return;
    }
    setStatus(`Barra de ferramentas ${Math.round(state.toolbarScale * 100)}%`);
    return;
  }
  if (commandName === "PE" || commandName === "PAINELE" || commandName === "LEFTPANEL") {
    toggleWorkspacePart("leftPanel");
    return;
  }
  if (commandName === "PD" || commandName === "PAINELD" || commandName === "RIGHTPANEL") {
    toggleWorkspacePart("rightPanel");
    return;
  }
  if (commandName === "FX" || commandName === "FAIXA" || commandName === "RIBBON") {
    toggleWorkspacePart("ribbon");
    return;
  }
  if (commandName === "LIVRE" || commandName === "FOCO" || commandName === "DRAWING") {
    focusDrawingArea();
    return;
  }
  if (commandName === "LAY" || commandName === "LAYOUT") {
    resetWorkspaceLayout();
    return;
  }
  if (commandName === "NAVVCUBE" || commandName === "VIEWCUBE" || commandName === "CUBE") {
    if (isOnArg) setProfileViewCubeVisible(true);
    else if (isOffArg) setProfileViewCubeVisible(false);
    else toggleProfileViewCube();
    return;
  }
  if (commandName === "NAVBAR") {
    if (isOnArg) setProfileNavBarVisible(true);
    else if (isOffArg) setProfileNavBarVisible(false);
    else toggleProfileNavBar();
    return;
  }
  if (commandName === "TOP" || commandName === "PLANTA") {
    setView("profile");
    setProfileOrientation("top");
    return;
  }
  if (commandName === "ISO" || commandName === "ISOMETRICO") {
    setView("profile");
    setProfileOrientation("iso");
    return;
  }
  if (commandName === "N" || commandName === "NORTE" || commandName === "FRONT") {
    setView("profile");
    setProfileOrientation("front");
    return;
  }
  if (commandName === "SUL" || commandName === "BACK") {
    setView("profile");
    setProfileOrientation("back");
    return;
  }
  if (commandName === "LESTE" || commandName === "RIGHT") {
    setView("profile");
    setProfileOrientation("right");
    return;
  }
  if (commandName === "W" || commandName === "OESTE" || commandName === "LEFT") {
    setView("profile");
    setProfileOrientation("left");
    return;
  }
  const tools = {
    S: "select",
    V: "select",
    SEL: "select",
    OB: "selectObject",
    OBJ: "selectObject",
    OBJECT: "selectObject",
    SO: "selectObject",
    SEG: "selectLine",
    LINESEG: "selectLine",
    DIVISA: "selectLine",
    LINHA: "selectLine",
    PAN: "pan",
    P: "pan",
    L: "line",
    LINE: "line",
    PL: "polyline",
    REC: "rectangle",
    RECT: "rectangle",
    ROAD: "road",
    ASFALTO: "road",
    RUAASFALTO: "road",
    PAS: "sidewalk",
    GUIA: "sidewalk",
    SIDEWALK: "sidewalk",
    C: "circle",
    CIRCLE: "circle",
    A: "arc",
    ARC: "arc",
    SP: "point",
    T: "note",
    TXT: "note",
    TEXT: "note",
    RUA: "noteRua",
    PASSEIO: "notePasseio",
    D: "dimension",
    DIM: "dimension",
    COTA: "dimension",
    DC: "dimensionContinue",
    DIMCONT: "dimensionContinue",
    CONTINUE: "dimensionContinue",
    COTACONTINUA: "dimensionContinue",
    TER: "terrain"
  };
  if (tools[command]) {
    setTool(tools[command]);
    return;
  }
  const edgeCommand = command.match(/^D(\d+)$/);
  if (edgeCommand) {
    const edgeIndex = Number(edgeCommand[1]) - 1;
    if (edgeIndex >= 0 && edgeIndex < project.terrain.length) {
      setTool("selectLine");
      select({ type: "edge", id: edgeIndex });
      setStatus(`Divisa ${edgeIndex + 1} selecionada`);
      draw();
      return;
    }
  }
  if (command === "NOVO" || command === "NEW") newProject();
  else if (command === "NOVAABA" || command === "MODELOTAB" || command === "MODELO+" || command === "TAB+") addModelTab();
  else if (command === "AL" || command === "APAGARLOTE" || command === "CLEARLOT") clearLot();
  else if (command === "IMP" || command === "IMPORT" || command === "IMPORTAR") document.getElementById("fileInput").click();
  else if (command === "PDFSPT" || command === "SPT" || command === "RELSPT" || command === "RELATORIOSPT") document.getElementById("sptReportInput")?.click();
  else if (command === "RSPT" || command === "REMOVERSPT" || command === "REMOVERRELATORIO") removeSptReport();
  else if (command === "LOTE" || command === "LOTEPADRAO") addDefaultLot();
  else if (command === "MSP" || command === "MALHA" || command === "MALHASP") addPointsGrid();
  else if (command === "CLS" || command === "CLASSIFICAR") classifyImport();
  else if (command === "LC" || command === "LIMPACOTAS" || command === "LIMPARCOTAS") clearDimensions();
  else if (command === "REPEAT" || command === "ENTER") repeatLastCommand();
  else if (command === "M" || command === "MOVE") moveSelected();
  else if (command === "RENSP" || command === "SPXY" || command === "RENSPXY") renamePointsCartesian();
  else if (command === "OS" || command === "OSNAP" || command === "F3") toggleOsnap();
  else if (command === "ORTHO" || command === "OR" || command === "F5") toggleOrtho();
  else if (command === "ORTHOON") setOrthoEnabled(true, "toggle");
  else if (command === "ORTHOOFF") setOrthoEnabled(false, "toggle");
  else if (command === "PERFIL3D" || command === "3D") setView("profile");
  else if (command === "CROQUI2D" || command === "2D") setView("cad");
  else if (command === "AP3D" || command === "ATUALIZAR3D") drawProfile3D();
  else if (command === "Z3D" || command === "ENQUADRAR3D") resetProfileCamera(true);
  else if (command === "PULL3D" || command === "CAD3D") pullImportedCadTo3D();
  else if (command === "OSNAPON") setOsnapEnabled(true);
  else if (command === "OSNAPOFF") setOsnapEnabled(false);
  else if (command === "OSA" || command === "OSNAPALL") setAllOsnapModes(true);
  else if (command === "OSC" || command === "OSNAPCLEAR") setAllOsnapModes(false);
  else if (command === "U" || command === "UNDO" || command === "DESFAZER") undoLastCommand();
  else if (command === "CO" || command === "COPY") copySelected();
  else if (command === "RO" || command === "ROTATE") rotateSelected();
  else if (command === "MI" || command === "MIRROR") mirrorSelected();
  else if (command === "ST" || command === "STRETCH") stretchSelected();
  else if (command === "SC" || command === "SCALE") scaleSelected();
  else if (command === "AR" || command === "ARRAY") arraySelected();
  else if (command === "TR" || command === "TRIM") trimSelected();
  else if (command === "O" || command === "OFFSET" || command === "OF" || command === "OFF") offsetSelected();
  else if (command === "F" || command === "FILLET") filletSelected();
  else if (command === "X" || command === "EXPLODE" || command === "EX") explodeSelected();
  else if (command === "J" || command === "JOIN" || command === "JUNTAR") joinLines();
  else if (command === "CT" || command === "CURVATERRENO" || command === "CURVATERR") curveTerrain();
  else if (command === "CC" || command === "CURVACALCADA" || command === "CURVAPASSEIO") curveSelectedArea();
  else if (command === "E" || command === "DEL" || command === "ERASE") deleteSelected();
  else if (command === "Z" || command === "ZOOM" || command === "FIT") fitToModel();
  else if (command === "AUTO" || command === "AXY" || command === "AUTOSPXY" || command === "COTAXY") autoDimension();
  else if (command === "JSON") exportJson();
  else if (command === "SVG") exportSvg();
  else if (command === "DXF") exportDxf();
  else if (command === "PDF") exportPdf();
  else if (command === "PDF2D") exportPdf();
  else if (command === "PDF3D") exportPdf3D();
  else if (command === "DWG") exportDwg();
  else if (command === "PDFCAD") document.getElementById("pdfCadInput").click();
  else setStatus(`Comando nao reconhecido: ${command}`);
}

function setOsnapEnabled(enabled) {
  state.osnap.enabled = enabled;
  state.osnap.marker = null;
  const input = document.getElementById("osnapToggle");
  if (input) input.checked = enabled;
  setStatus(enabled ? "OSNAP ligado (F3)" : "OSNAP desligado (F3)");
  draw();
}

function toggleOsnap() {
  setOsnapEnabled(!state.osnap.enabled);
}

function setOsnapMode(mode, enabled) {
  if (!(mode in state.osnap.modes)) return;
  state.osnap.modes[mode] = enabled;
  document.querySelectorAll(`[data-osnap="${mode}"]`).forEach((input) => {
    input.checked = enabled;
  });
  state.osnap.marker = null;
  draw();
}

function setAllOsnapModes(enabled) {
  Object.keys(state.osnap.modes).forEach((mode) => setOsnapMode(mode, enabled));
  setStatus(enabled ? "Todos os modos OSNAP ligados" : "Modos OSNAP limpos");
}

function commandIsAwaitingPoint() {
  return Boolean(
    state.action ||
    state.offset ||
    state.drawStart ||
    state.measureStart ||
    state.polyPoints.length ||
    state.arcStep ||
    ["line", "polyline", "rectangle", "circle", "arc", "road", "sidewalk", "dimension", "dimensionContinue"].includes(state.tool)
  );
}

function showPrecisionDialog(reason = "Precisao") {
  const dialog = document.getElementById("precisionDialog");
  if (!dialog) return;
  Object.entries(state.osnap.modes).forEach(([mode, enabled]) => {
    document.querySelectorAll(`[data-osnap="${mode}"]`).forEach((input) => {
      input.checked = enabled;
    });
  });
  dialog.classList.remove("hidden");
  setStatus(`${reason}: escolha Endpoint, Perpendicular, Extension, Tangent ou Parallel`);
}

function hidePrecisionDialog() {
  document.getElementById("precisionDialog")?.classList.add("hidden");
}

function cancelActiveCommand() {
  state.action = null;
  state.offset = null;
  state.measureStart = null;
  state.measureStartRef = null;
  state.drawStart = null;
  state.polyPoints = [];
  state.arcStep = null;
  clearDirectDistance();
  hidePrecisionDialog();
  setTool("select");
  draw();
}

function updateDirectDistanceStatus() {
  const value = directDistanceValue();
  const typed = state.directDistance.text;
  if (value) {
    setStatus(`Distancia ${fmt(value)} m: aponte a direcao e clique ou Enter`);
  } else if (typed) {
    setStatus(`Distancia: ${typed}`);
  }
  draw();
}

function commitDirectDistanceFromKeyboard() {
  if (state.action) return commitDistanceAction(state.mouseWorld);
  if (state.drawStart && ["line", "road", "sidewalk", "circle"].includes(state.tool)) {
    return handleCadTool(state.mouseWorld);
  }
  return false;
}

function shortcutCommands() {
  return {
    V: () => setTool("select"),
    L: () => setTool("line"),
    C: () => setTool("circle"),
    CO: () => copySelected(),
    CP: () => copySelected(),
    P: () => setTool("pan"),
    M: () => moveSelected(),
    MI: () => mirrorSelected(),
    RO: () => rotateSelected(),
    R: () => setTool("rectangle"),
    REC: () => setTool("rectangle"),
    RD: () => setTool("road"),
    RU: () => setTool("road"),
    PAS: () => setTool("sidewalk"),
    GUIA: () => setTool("sidewalk"),
    RUA: () => setTool("noteRua"),
    A: () => setTool("arc"),
    AR: () => arraySelected(),
    S: () => setTool("point"),
    SP: () => setTool("point"),
    SC: () => scaleSelected(),
    ST: () => stretchSelected(),
    OB: () => setTool("selectObject"),
    D: () => setTool("dimension"),
    DC: () => setTool("dimensionContinue"),
    T: () => setTool("note"),
    TR: () => trimSelected(),
    O: () => offsetSelected(),
    OF: () => offsetSelected(),
    OFF: () => offsetSelected(),
    F: () => filletSelected(),
    X: () => explodeSelected(),
    J: () => joinLines(),
    CT: () => curveTerrain(),
    CC: () => curveSelectedArea(),
    E: () => deleteSelected(),
    DEL: () => deleteSelected(),
    G: () => setTool("terrain"),
    OS: () => toggleOsnap(),
    OR: () => toggleOrtho(),
    Z: () => fitToModel(),
    U: () => undoLastCommand(),
    PE: () => toggleWorkspacePart("leftPanel"),
    PD: () => toggleWorkspacePart("rightPanel"),
    FX: () => toggleWorkspacePart("ribbon"),
    LIVRE: () => focusDrawingArea(),
    LAY: () => resetWorkspaceLayout()
  };
}

function canHandleShortcutKey() {
  return !state.action && !state.drawStart && !state.measureStart && !state.polyPoints.length && !state.arcStep;
}

function shortcutPrefixes(commands) {
  const prefixes = new Set();
  Object.keys(commands).forEach((command) => {
    for (let i = 1; i < command.length; i += 1) prefixes.add(command.slice(0, i));
  });
  return prefixes;
}

function runShortcutText(text, options = {}) {
  const command = text.toUpperCase();
  const commands = shortcutCommands();
  const prefixes = shortcutPrefixes(commands);
  const action = commands[command];
  if (action && (!prefixes.has(command) || options.flush)) {
    clearShortcutBuffer();
    action();
    return true;
  }
  if (prefixes.has(command)) {
    if (state.shortcut.timer) clearTimeout(state.shortcut.timer);
    state.shortcut.text = command;
    state.shortcut.timer = setTimeout(() => runShortcutText(command, { flush: true }), 620);
    setStatus(`Atalho ${command}: continue digitando ou aguarde`);
    return true;
  }
  clearShortcutBuffer();
  return false;
}

function handleKeyboardShortcut(event) {
  if (!canHandleShortcutKey()) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (!/^[a-zA-Z]$/.test(event.key)) return false;
  event.preventDefault();
  const next = `${state.shortcut.text}${event.key.toUpperCase()}`.slice(0, 4);
  if (runShortcutText(next)) return true;
  return runShortcutText(event.key.toUpperCase());
}

function handleDirectDistanceKey(event) {
  if (!canUseDirectDistance()) return false;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    setDirectDistanceText(`${state.directDistance.text}${event.key}`);
    updateDirectDistanceStatus();
    return true;
  }
  if ((event.key === "," || event.key === ".") && !/[,.]/.test(state.directDistance.text)) {
    event.preventDefault();
    setDirectDistanceText(`${state.directDistance.text || "0"}${event.key}`);
    updateDirectDistanceStatus();
    return true;
  }
  if (event.key === "Backspace" && state.directDistance.text) {
    event.preventDefault();
    setDirectDistanceText(state.directDistance.text.slice(0, -1));
    updateDirectDistanceStatus();
    return true;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    return commitDirectDistanceFromKeyboard();
  }
  return false;
}

function updateOrthoUi() {
  const toggle = document.getElementById("orthoToggle");
  const mode = document.getElementById("orthoModeInput");
  if (mode) mode.value = state.ortho.mode;
  if (toggle) {
    toggle.checked = isOrthoActive();
    toggle.indeterminate = state.ortho.mode === "shift" && !state.ortho.shiftDown;
  }
}

function setOrthoEnabled(enabled, mode = state.ortho.mode) {
  state.ortho.mode = mode;
  state.ortho.enabled = !!enabled;
  updateOrthoUi();
  setStatus(isOrthoActive() ? "ORTHO ligado" : `ORTHO aguardando ${state.ortho.mode === "shift" ? "SHIFT" : "acionamento"}`);
  draw();
}

function toggleOrtho() {
  const mode = state.ortho.mode === "shift" ? "toggle" : state.ortho.mode;
  setOrthoEnabled(!state.ortho.enabled, mode);
}

function setOrthoMode(mode) {
  state.ortho.mode = mode;
  if (mode === "off" || mode === "shift") state.ortho.enabled = false;
  updateOrthoUi();
  setStatus(mode === "shift" ? "ORTHO por SHIFT" : mode === "f5" ? "ORTHO por F5" : mode === "toggle" ? "ORTHO por botao/comando" : "ORTHO desligado");
  draw();
}

document.querySelectorAll(".tool").forEach((btn) => {
  btn.addEventListener("click", () => setTool(btn.dataset.tool));
});

document.querySelectorAll("[data-layer]").forEach((input) => {
  input.addEventListener("change", () => {
    state.layers[input.dataset.layer] = input.checked;
    draw();
  });
});

document.getElementById("projectNameInput").addEventListener("input", (event) => {
  project.name = event.target.value;
  draw();
});
document.getElementById("clientInput").addEventListener("input", (event) => {
  project.client = event.target.value;
  draw();
});
document.getElementById("plotScaleInput").addEventListener("change", (event) => {
  project.plotScale = event.target.value;
  draw();
});
["selName", "selX", "selY", "selWidth", "selHeight", "selElev", "selDepth", "selPileLength", "selRefusalType", "selLayers", "selNote"].forEach((id) => {
  document.getElementById(id).addEventListener("input", applySelectionForm);
});
document.getElementById("selectionForm").addEventListener("focusin", () => {
  if (state.selected && !state.formSnapshotArmed) {
    saveHistory("Editar propriedades");
    state.formSnapshotArmed = true;
  }
});

document.getElementById("newProjectBtn").addEventListener("click", newProject);
document.getElementById("addModelTabBtn").addEventListener("click", addModelTab);
document.querySelector(".model-tabs-menu")?.addEventListener("click", () => setStatus("Abas de modelo: use + para criar outra area de trabalho"));
document.getElementById("toolbarSmallerBtn").addEventListener("click", () => changeToolbarScale(-TOOLBAR_SCALE_STEP));
document.getElementById("toolbarLargerBtn").addEventListener("click", () => changeToolbarScale(TOOLBAR_SCALE_STEP));
document.getElementById("toggleLeftPanelBtn").addEventListener("click", () => toggleWorkspacePart("leftPanel"));
document.getElementById("toggleRightPanelBtn").addEventListener("click", () => toggleWorkspacePart("rightPanel"));
document.getElementById("toggleRibbonBtn").addEventListener("click", () => toggleWorkspacePart("ribbon"));
document.getElementById("focusDrawingBtn").addEventListener("click", focusDrawingArea);
document.getElementById("resetWorkspaceBtn").addEventListener("click", resetWorkspaceLayout);
document.getElementById("clearLotTopBtn").addEventListener("click", clearLot);
document.getElementById("undoBtn").addEventListener("click", undoLastCommand);
document.getElementById("fitBtn").addEventListener("click", fitToModel);
document.getElementById("autoDimBtn").addEventListener("click", autoDimension);
document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
document.getElementById("exportSvgBtn").addEventListener("click", exportSvg);
document.getElementById("exportDxfBtn").addEventListener("click", exportDxf);
document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);
document.getElementById("exportDwgBtn").addEventListener("click", exportDwg);
document.getElementById("exportModel2dBtn").addEventListener("click", exportModel2D);
document.getElementById("exportModel3dBtn").addEventListener("click", exportModel3D);
document.getElementById("exportModelsBundleBtn").addEventListener("click", exportModelsBundle);
document.getElementById("exportMenuBtn").addEventListener("click", (event) => {
  event.stopPropagation();
  toggleExportMenu();
});
document.getElementById("exportPdf2dMenuBtn").addEventListener("click", () => runExportOption(exportPdf));
document.getElementById("exportPdf3dMenuBtn").addEventListener("click", () => runExportOption(exportPdf3D));
document.addEventListener("click", (event) => {
  if (!document.getElementById("exportDropdown")?.contains(event.target)) hideExportMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideExportMenu();
});
document.getElementById("deleteSelectedBtn").addEventListener("click", deleteSelected);
document.getElementById("moveBtn").addEventListener("click", () => runActionCommand("move"));
document.getElementById("copyBtn").addEventListener("click", () => runActionCommand("copy"));
document.getElementById("rotateBtn").addEventListener("click", () => runActionCommand("rotate"));
document.getElementById("mirrorBtn").addEventListener("click", () => runActionCommand("mirror"));
document.getElementById("stretchBtn").addEventListener("click", () => runActionCommand("stretch"));
document.getElementById("scaleBtn").addEventListener("click", () => runActionCommand("scale"));
document.getElementById("arrayBtn").addEventListener("click", () => runActionCommand("array"));
document.getElementById("trimBtn").addEventListener("click", () => runActionCommand("trim"));
document.getElementById("offsetBtn").addEventListener("click", () => runActionCommand("offset"));
document.getElementById("filletBtn").addEventListener("click", () => runActionCommand("fillet"));
document.getElementById("curveTerrainBtn").addEventListener("click", () => runActionCommand("curveTerrain"));
document.getElementById("curveSidewalkBtn").addEventListener("click", () => runActionCommand("curveSidewalk"));
document.getElementById("joinBtn").addEventListener("click", () => runActionCommand("join"));
document.getElementById("explodeBtn").addEventListener("click", () => runActionCommand("explode"));
document.getElementById("addDefaultLotBtn").addEventListener("click", addDefaultLot);
document.getElementById("clearLotBtn").addEventListener("click", clearLot);
document.getElementById("addRoadBtn").addEventListener("click", () => setTool("road"));
document.getElementById("addSidewalkBtn").addEventListener("click", () => setTool("sidewalk"));
document.getElementById("addRuaTextBtn").addEventListener("click", () => setTool("noteRua"));
document.getElementById("addPasseioTextBtn").addEventListener("click", () => setTool("notePasseio"));
document.getElementById("addPointsGridBtn").addEventListener("click", addPointsGrid);
document.getElementById("renamePointsCartesianBtn").addEventListener("click", renamePointsCartesian);
document.getElementById("pullCad3dBtn").addEventListener("click", pullImportedCadTo3D);
document.getElementById("classifyImportBtn").addEventListener("click", classifyImport);
document.getElementById("clearDimsBtn").addEventListener("click", clearDimensions);
document.getElementById("gridStepInput").addEventListener("input", draw);
document.getElementById("snapInput").addEventListener("input", draw);
document.getElementById("snapToggle").addEventListener("change", draw);
document.getElementById("orthoToggle").addEventListener("change", (event) => setOrthoEnabled(event.target.checked, "toggle"));
document.getElementById("orthoModeInput").addEventListener("change", (event) => setOrthoMode(event.target.value));
document.getElementById("osnapToggle").addEventListener("change", (event) => setOsnapEnabled(event.target.checked));
document.querySelectorAll("[data-osnap]").forEach((input) => {
  input.addEventListener("change", () => setOsnapMode(input.dataset.osnap, input.checked));
});
document.getElementById("osnapAllBtn").addEventListener("click", () => setAllOsnapModes(true));
document.getElementById("osnapClearBtn").addEventListener("click", () => setAllOsnapModes(false));
document.getElementById("precisionCloseBtn").addEventListener("click", hidePrecisionDialog);
document.getElementById("precisionAllBtn").addEventListener("click", () => setAllOsnapModes(true));
document.getElementById("precisionClearBtn").addEventListener("click", () => setAllOsnapModes(false));
document.querySelectorAll("[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});
document.getElementById("backToCadBtn").addEventListener("click", () => setView("cad"));
document.getElementById("profileFitBtn").addEventListener("click", () => resetProfileCamera(true));
document.getElementById("refreshProfileBtn").addEventListener("click", drawProfile3D);
document.getElementById("removeSptReportBtn").addEventListener("click", removeSptReport);
document.getElementById("profileExaggerationInput").addEventListener("input", drawProfile3D);
document.getElementById("profileMethodInput").addEventListener("change", drawProfile3D);
document.getElementById("stratProfileInput").addEventListener("change", (event) => {
  project.stratigraphicProfile = event.target.value;
  state.profile.stratProfile = event.target.value;
  updateStratigraphyPreview();
});
document.getElementById("stratVariationInput").addEventListener("change", (event) => {
  project.stratigraphicVariation = event.target.value;
  state.profile.stratVariation = event.target.value;
});
document.getElementById("applyStratProfileBtn").addEventListener("click", applyStratigraphicProfile);
document.querySelectorAll("[data-profile-view]").forEach((btn) => {
  btn.addEventListener("click", () => setProfileOrientation(btn.dataset.profileView));
});
document.getElementById("profileZoomInBtn").addEventListener("click", () => {
  const { w, h } = profileScreenSize();
  zoomProfileAt({ x: w / 2, y: h / 2 }, 1.18);
});
document.getElementById("profileZoomOutBtn").addEventListener("click", () => {
  const { w, h } = profileScreenSize();
  zoomProfileAt({ x: w / 2, y: h / 2 }, 0.85);
});
document.getElementById("profileFitNavBtn").addEventListener("click", () => resetProfileCamera(true));
document.getElementById("profilePanHintBtn").addEventListener("click", () => {
  updateProfileStatus();
  setStatus("Pan 3D: pressione o scroll do mouse e arraste");
});
document.getElementById("commandInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.stopPropagation();
    processCommand(event.target.value);
    event.target.value = "";
  }
});
document.getElementById("profileCommandInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.stopPropagation();
    processCommand(event.target.value);
    event.target.value = "";
  }
});
document.getElementById("fileInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importFile(file).catch((error) => setStatus(`Erro ao importar: ${error.message}`));
  event.target.value = "";
});
document.getElementById("sptReportInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importSptReportFile(file).catch((error) => {
    updateSptImportSummary(`Erro ao importar ${file.name}: ${error.message}`);
    setStatus(`Erro ao importar relatorio SPT: ${error.message}`);
  });
  event.target.value = "";
});
document.getElementById("pdfCadInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) {
    try {
      importPdfCadText(await file.text(), file.name);
    } catch (error) {
      setStatus(`Erro ao importar PDF CAD: ${error.message}`);
    }
  }
  event.target.value = "";
});

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("wheel", onWheel, { passive: false });
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
if (profileCanvas) {
  profileCanvas.addEventListener("wheel", onProfileWheel, { passive: false });
  profileCanvas.addEventListener("pointerdown", onProfilePointerDown);
  profileCanvas.addEventListener("pointermove", onProfilePointerMove);
  profileCanvas.addEventListener("pointerup", finishProfilePan);
  profileCanvas.addEventListener("pointercancel", finishProfilePan);
  profileCanvas.addEventListener("auxclick", (event) => event.preventDefault());
  profileCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
}
document.addEventListener("click", (event) => {
  if (!event.target.closest("#contextMenu")) hideContextMenu();
});
document.getElementById("repeatCommandBtn").addEventListener("click", repeatLastCommand);
document.getElementById("contextUndoBtn").addEventListener("click", undoLastCommand);
document.getElementById("contextSelectBtn").addEventListener("click", () => setTool("select"));
document.getElementById("contextObjectBtn").addEventListener("click", () => setTool("selectObject"));
document.getElementById("contextSegmentBtn").addEventListener("click", () => setTool("selectLine"));

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  if (event.key === "Shift") {
    if (!typing && commandIsAwaitingPoint() && !event.repeat) showPrecisionDialog("Shift");
    if (state.ortho.mode === "shift") {
      state.ortho.shiftDown = true;
      updateOrthoUi();
      if (state.action || state.offset || state.drawStart || state.measureStart || state.polyPoints.length) draw();
    }
  }
  if (event.key === "F3") {
    event.preventDefault();
    toggleOsnap();
    return;
  }
  if (event.key === "F5") {
    event.preventDefault();
    if (state.ortho.mode !== "f5") setOrthoMode("f5");
    setOrthoEnabled(!state.ortho.enabled, "f5");
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undoLastCommand();
    return;
  }
  if (typing) return;
  if (handleDirectDistanceKey(event)) return;
  if (state.tool === "polyline" && event.key === "Enter") {
    event.preventDefault();
    finishPolyline(false);
    return;
  }
  if (state.tool === "polyline" && event.key.toLowerCase() === "c") {
    event.preventDefault();
    finishPolyline(true);
    return;
  }
  if (handleKeyboardShortcut(event)) return;
  if (event.key === "Delete") deleteSelected();
  if (event.key === "Escape") {
    cancelActiveCommand();
  }
  if (event.key === "+" || event.key === "=") {
    state.view.scale = clamp(state.view.scale * 1.12, 2, 80);
    draw();
  }
  if (event.key === "-") {
    state.view.scale = clamp(state.view.scale * 0.89, 2, 80);
    draw();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "Shift" && state.ortho.mode === "shift") {
    state.ortho.shiftDown = false;
    updateOrthoUi();
    if (state.action || state.offset || state.drawStart || state.measureStart || state.polyPoints.length) draw();
  }
});

window.addEventListener("resize", resizeCanvas);

window.sondacadExportApi = {
  buildDxf,
  buildGltfModel3D,
  buildZip,
  exportPdf,
  exportPdf3D,
  exportModel2D,
  exportModel3D,
  exportModelsBundle
};

applyToolbarScale();
initializeTopCommandDrag();
initializeRibbonDrag();
initializeRibbonButtonDrag();
applyWorkspaceLayout(false);
initializeModelTabs();
bindProjectFields();
updateUndoState();
updateOrthoUi();
updateProfileNavigationUi();
resizeCanvas();
setTimeout(fitToModel, 50);
