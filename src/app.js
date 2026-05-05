import {
  PLAN_HEIGHT,
  PLAN_WIDTH,
  drawFloorPlan,
  getWallLines,
  partitionEndpoints,
  snapToWalkable,
} from "./floorplan.js";
import { createSimulation } from "./simulation.js";

const MAX_POINTS = 10;

const scentPresets = [
  { name: "Citrus Opening", color: "#d85f37", emission: 1.7, spread: 1.12, decay: 0.007 },
  { name: "Floral Heart", color: "#c45d8f", emission: 1.35, spread: 0.96, decay: 0.005 },
  { name: "Woody Base", color: "#7b4f35", emission: 1.05, spread: 0.78, decay: 0.003 },
  { name: "Musk Trail", color: "#6f7890", emission: 0.9, spread: 0.68, decay: 0.0025 },
  { name: "Green Mist", color: "#4f8f6a", emission: 1.2, spread: 1.05, decay: 0.0055 },
];

const pages = [...document.querySelectorAll("[data-page]")];
const navButtons = [...document.querySelectorAll(".nav-button")];

function showPage(route) {
  const safeRoute = ["home", "viewer", "simulator"].includes(route) ? route : "home";
  for (const page of pages) page.hidden = page.dataset.page !== safeRoute;
  for (const button of navButtons) button.classList.toggle("is-current", button.dataset.route === safeRoute);
  if (window.location.hash !== `#${safeRoute}`) window.location.hash = safeRoute;
}

navButtons.forEach((button) => button.addEventListener("click", () => showPage(button.dataset.route)));
window.addEventListener("hashchange", () => showPage(window.location.hash.replace("#", "")));

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function pct(value, scale = 42) {
  return `${Math.min(100, Math.round(value * scale))}%`;
}

function initHomePlan() {
  const canvas = document.querySelector("#homePlanCanvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  drawFloorPlan(ctx);
  ctx.save();
  ctx.fillStyle = "rgba(216,95,55,0.14)";
  ctx.beginPath();
  ctx.arc(180, 720, 96, 0, Math.PI * 2);
  ctx.fill();
  drawPoint(ctx, { x: 180, y: 720, id: "home-source" }, "#d85f37", "S1", false);
  drawPoint(ctx, { x: 225, y: 575, id: "home-target" }, "#2f6f69", "T1", false);
  ctx.restore();
}

const elementInfo = {
  partition: ["가벽", "동선과 향의 흐름을 막는 임시 벽입니다. 시뮬레이션에서도 실제 차단물로 계산됩니다.", "배치형 파티션"],
  fan: ["서큘레이터", "뒤쪽 공기를 흡입하고 앞쪽으로 내보내 향의 이동 방향을 만듭니다.", "흡입/토출 흐름"],
  heater: ["온열 장치", "주변 확산을 빠르게 만들고 감쇠도 높여 향이 빠르게 퍼졌다 옅어지게 합니다.", "상승 열기"],
  cooler: ["냉각 장치", "주변 확산을 늦추고 감쇠를 낮춰 향이 천천히 머무는 구역을 만듭니다.", "잔향 유지"],
  route: ["체험 동선", "입구에서 체험존까지의 이동 경로를 기준으로 향의 도착 농도를 확인합니다.", "방문자 흐름"],
};

function writeInfo(panel, key) {
  const [title, body, note] = elementInfo[key] ?? ["도면 요소", "클릭한 요소의 설명입니다.", ""];
  panel.innerHTML = `<strong>${title}</strong><span>${body}</span><em>${note}</em>`;
}

const viewer = {
  canvas: document.querySelector("#viewerCanvas"),
  map: document.querySelector("#viewerMapCanvas"),
  info: document.querySelector("#viewerInfo"),
  yaw: -Math.PI / 2,
  camera: { x: 190, y: 700 },
  dragging: null,
  marker: null,
};

const cameras = {
  entry: { x: 120, y: 880, yaw: -Math.PI / 2 },
  curve: { x: 175, y: 700, yaw: -0.92 },
  center: { x: 235, y: 590, yaw: -0.55 },
  north: { x: 392, y: 235, yaw: 1.95 },
  east: { x: 560, y: 820, yaw: -2.3 },
};

const viewerElements = [
  { key: "partition", x: 230, y: 530, label: "가벽" },
  { key: "fan", x: 250, y: 650, label: "순환" },
  { key: "heater", x: 166, y: 665, label: "온열" },
  { key: "cooler", x: 400, y: 210, label: "냉각" },
  { key: "route", x: 300, y: 760, label: "동선" },
];

function normalizeAngle(angle) {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function raySegmentDistance(origin, angle, segment) {
  const [x1, y1, x2, y2] = segment;
  const rx = Math.cos(angle);
  const ry = Math.sin(angle);
  const sx = x2 - x1;
  const sy = y2 - y1;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 0.00001) return Infinity;
  const qpx = x1 - origin.x;
  const qpy = y1 - origin.y;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  return t >= 0 && u >= 0 && u <= 1 ? t : Infinity;
}

function castRay(origin, angle) {
  let best = Infinity;
  for (const segment of getWallLines()) best = Math.min(best, raySegmentDistance(origin, angle, segment));
  return best;
}

function drawPerfumeSilhouette(ctx, x, baseY, size, color) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(size, size);
  ctx.fillStyle = "rgba(15,12,10,0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,250,242,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-18, -58, 36, 58, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(32,25,20,0.88)";
  ctx.fillRect(-9, -76, 18, 18);
  ctx.fillRect(-15, -84, 30, 8);
  ctx.restore();
}

function drawViewer() {
  const canvas = viewer.canvas;
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const fov = Math.PI * 0.62;
  const origin = viewer.camera;

  const sky = ctx.createLinearGradient(0, 0, 0, h / 2);
  sky.addColorStop(0, "#f4eadc");
  sky.addColorStop(1, "#bca98f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h / 2);
  const floor = ctx.createLinearGradient(0, h / 2, 0, h);
  floor.addColorStop(0, "#7a6a56");
  floor.addColorStop(1, "#251e19");
  ctx.fillStyle = floor;
  ctx.fillRect(0, h / 2, w, h / 2);

  ctx.fillStyle = "rgba(25,18,14,0.18)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.86, w * 0.34, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let x = 0; x < w; x += 2) {
    const delta = (x / w - 0.5) * fov;
    const rayAngle = viewer.yaw + delta;
    const rawDistance = castRay(origin, rayAngle);
    const corrected = Math.max(8, rawDistance * Math.cos(delta));
    const wallHeight = Math.min(h * 1.35, (h * 235) / corrected);
    const y = h / 2 - wallHeight / 2;
    const shade = Math.max(74, Math.min(222, 224 - corrected * 0.28));
    const wallShade = ctx.createLinearGradient(x, y, x, y + wallHeight);
    wallShade.addColorStop(0, `rgb(${Math.min(255, shade + 16)}, ${shade}, ${Math.max(0, shade - 10)})`);
    wallShade.addColorStop(0.55, `rgb(${shade}, ${Math.max(0, shade - 20)}, ${Math.max(0, shade - 34)})`);
    wallShade.addColorStop(1, `rgb(${Math.max(0, shade - 42)}, ${Math.max(0, shade - 48)}, ${Math.max(0, shade - 54)})`);
    ctx.fillStyle = wallShade;
    ctx.fillRect(x, y, 2, wallHeight);
    if (x % 74 === 0) {
      ctx.fillStyle = "rgba(255,250,242,0.16)";
      ctx.fillRect(x, y + wallHeight * 0.32, 2, 3);
      ctx.fillRect(x, y + wallHeight * 0.58, 2, 3);
    }
  }

  ctx.strokeStyle = "rgba(255,250,242,0.2)";
  ctx.lineWidth = 3;
  for (const shelfY of [h * 0.42, h * 0.52]) {
    ctx.beginPath();
    ctx.moveTo(w * 0.18, shelfY);
    ctx.lineTo(w * 0.82, shelfY);
    ctx.stroke();
  }
  drawPerfumeSilhouette(ctx, w * 0.42, h * 0.68, 1.2, "rgba(216,95,55,0.74)");
  drawPerfumeSilhouette(ctx, w * 0.58, h * 0.63, 0.92, "rgba(79,143,106,0.68)");

  const visibleElements = [];
  for (const item of viewerElements) {
    const dx = item.x - origin.x;
    const dy = item.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const delta = normalizeAngle(Math.atan2(dy, dx) - viewer.yaw);
    if (Math.abs(delta) > fov / 2) continue;
    if (distance > castRay(origin, Math.atan2(dy, dx)) + 20) continue;
    const screenX = (0.5 + delta / fov) * w;
    const size = Math.max(42, 98 - distance * 0.09);
    visibleElements.push({ ...item, screenX, size, distance });
  }

  for (const item of visibleElements.sort((a, b) => b.distance - a.distance)) {
    ctx.save();
    ctx.translate(item.screenX, h / 2 + 24);
    ctx.fillStyle = viewer.marker === item.key ? "rgba(225,163,95,0.95)" : "rgba(32,25,20,0.86)";
    ctx.strokeStyle = "rgba(255,250,242,0.56)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fffaf2";
    ctx.font = "900 15px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.label, 0, 0);
    ctx.restore();
  }

  drawViewerMap();
}

function drawViewerMap() {
  const canvas = viewer.map;
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / PLAN_WIDTH, canvas.height / PLAN_HEIGHT);
  const ox = (canvas.width - PLAN_WIDTH * scale) / 2;
  const oy = (canvas.height - PLAN_HEIGHT * scale) / 2;
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  drawFloorPlan(ctx);
  ctx.fillStyle = "#9f3a2e";
  ctx.beginPath();
  ctx.arc(viewer.camera.x, viewer.camera.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e1a35f";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(viewer.camera.x, viewer.camera.y);
  ctx.lineTo(viewer.camera.x + Math.cos(viewer.yaw) * 110, viewer.camera.y + Math.sin(viewer.yaw) * 110);
  ctx.stroke();
  for (const item of viewerElements) {
    ctx.fillStyle = viewer.marker === item.key ? "#e1a35f" : "#2f6f69";
    ctx.beginPath();
    ctx.arc(item.x, item.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function initViewer() {
  document.querySelectorAll("[data-camera]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = cameras[button.dataset.camera];
      viewer.camera = { x: preset.x, y: preset.y };
      viewer.yaw = preset.yaw;
      drawViewer();
    });
  });
  viewer.canvas?.addEventListener("pointerdown", (event) => {
    viewer.canvas.setPointerCapture(event.pointerId);
    viewer.dragging = { x: event.clientX, yaw: viewer.yaw };
  });
  viewer.canvas?.addEventListener("pointermove", (event) => {
    if (!viewer.dragging) return;
    viewer.yaw = viewer.dragging.yaw - (event.clientX - viewer.dragging.x) * 0.008;
    drawViewer();
  });
  viewer.canvas?.addEventListener("pointerup", () => {
    viewer.dragging = null;
  });
  viewer.canvas?.addEventListener("click", (event) => {
    const rect = viewer.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * viewer.canvas.width;
    const fov = Math.PI * 0.62;
    for (const item of viewerElements) {
      const delta = normalizeAngle(Math.atan2(item.y - viewer.camera.y, item.x - viewer.camera.x) - viewer.yaw);
      if (Math.abs(delta) > fov / 2) continue;
      const screenX = (0.5 + delta / fov) * viewer.canvas.width;
      if (Math.abs(screenX - x) < 58) {
        viewer.marker = item.key;
        writeInfo(viewer.info, item.key);
        drawViewer();
        break;
      }
    }
  });
  drawViewer();
}

const simCanvas = document.querySelector("#simCanvas");
const simCtx = simCanvas?.getContext("2d");
const stageButtons = document.querySelector("#stageButtons");
const toolButtons = document.querySelector("#toolButtons");
const selectedDeviceEl = document.querySelector("#selectedDevice");
const goalScoreEl = document.querySelector("#goalScore");
const rotateButton = document.querySelector("#rotateButton");
const deleteButton = document.querySelector("#deleteButton");
const toggleRunButton = document.querySelector("#toggleRun");
const resetScentButton = document.querySelector("#resetScent");
const clearDevicesButton = document.querySelector("#clearDevices");
const sourceListEl = document.querySelector("#sourceList");
const targetListEl = document.querySelector("#targetList");
const addSourceButton = document.querySelector("#addSource");
const addTargetButton = document.querySelector("#addTarget");

const stages = [
  { id: 1, label: "1단계", detail: "가벽", allowed: ["partition"] },
  { id: 2, label: "2단계", detail: "서큘레이터", allowed: ["fan"] },
  { id: 3, label: "3단계", detail: "온도 장치", allowed: ["heater", "cooler"] },
  { id: 4, label: "4단계", detail: "전체", allowed: ["partition", "fan", "heater", "cooler"] },
];

const tools = [
  { type: "source", label: "출발점" },
  { type: "target", label: "도착점" },
  { type: "partition", label: "가벽" },
  { type: "fan", label: "서큘레이터" },
  { type: "heater", label: "온열" },
  { type: "cooler", label: "냉각" },
];

let stage = 4;
let activeTool = "source";
let running = true;
let sources = [
  {
    id: "source-1",
    type: "source",
    x: 180,
    y: 720,
    ...scentPresets[0],
  },
];
let targets = [
  {
    id: "target-1",
    type: "target",
    x: 225,
    y: 575,
    name: "메인 체험존",
  },
];
let devices = [
  { id: uid("partition"), type: "partition", x: 205, y: 650, angle: -0.35, length: 116, thickness: 9 },
  { id: uid("fan"), type: "fan", x: 245, y: 690, angle: -1.05 },
  { id: uid("heater"), type: "heater", x: 170, y: 665 },
  { id: uid("cooler"), type: "cooler", x: 405, y: 230 },
];
let selectedId = sources[0].id;
let dragging = null;
let lastMaskKey = "";
const sim = createSimulation();
sim.reset(devices, sources);

function allowedTools() {
  return stages.find((item) => item.id === stage).allowed;
}

function isToolAllowed(type) {
  return type === "source" || type === "target" || allowedTools().includes(type);
}

function allElements() {
  return [...sources, ...targets, ...devices];
}

function selectedElement() {
  return allElements().find((item) => item.id === selectedId) ?? null;
}

function labelFor(type) {
  return tools.find((tool) => tool.type === type)?.label ?? type;
}

function setStage(nextStage) {
  stage = nextStage;
  const allowed = allowedTools();
  devices = devices.filter((device) => allowed.includes(device.type));
  if (!isToolAllowed(activeTool)) activeTool = allowed[0] ?? "source";
  selectedId = null;
  sim.refreshMask(devices);
  renderControls();
}

function createSourceAt(point) {
  if (sources.length >= MAX_POINTS) return null;
  const preset = scentPresets[sources.length % scentPresets.length];
  const source = {
    id: uid("source"),
    type: "source",
    x: point.x,
    y: point.y,
    name: `${preset.name} ${sources.length + 1}`,
    color: preset.color,
    emission: preset.emission,
    spread: preset.spread,
    decay: preset.decay,
  };
  sources = [...sources, source];
  sim.ensureFields(sources);
  return source;
}

function createTargetAt(point) {
  if (targets.length >= MAX_POINTS) return null;
  const target = {
    id: uid("target"),
    type: "target",
    x: point.x,
    y: point.y,
    name: `체험존 ${targets.length + 1}`,
  };
  targets = [...targets, target];
  return target;
}

function renderControls() {
  if (!stageButtons || !toolButtons) return;
  stageButtons.innerHTML = "";
  for (const item of stages) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = item.id === stage ? "is-active" : "";
    button.innerHTML = `<strong>${item.label}</strong><span>${item.detail}</span>`;
    button.addEventListener("click", () => setStage(item.id));
    stageButtons.append(button);
  }

  toolButtons.innerHTML = "";
  for (const tool of tools) {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = !isToolAllowed(tool.type);
    button.className = activeTool === tool.type ? "is-active" : "";
    button.textContent = tool.label;
    button.addEventListener("click", () => {
      activeTool = tool.type;
      renderControls();
    });
    toolButtons.append(button);
  }

  const selected = selectedElement();
  selectedDeviceEl.textContent = selected ? `${labelFor(selected.type)} · ${selected.name ?? selected.id} (${Math.round(selected.x)}, ${Math.round(selected.y)})` : "선택 없음";
  rotateButton.disabled = !selected || !["partition", "fan"].includes(selected.type);
  deleteButton.disabled = !selected || (sources.length <= 1 && selected.type === "source") || (targets.length <= 1 && selected.type === "target");
  if (addSourceButton) addSourceButton.disabled = sources.length >= MAX_POINTS;
  if (addTargetButton) addTargetButton.disabled = targets.length >= MAX_POINTS;
  renderSourceList();
  renderTargetList();
}

function renderSourceList() {
  if (!sourceListEl) return;
  sourceListEl.innerHTML = "";
  sources.forEach((source, index) => {
    const card = document.createElement("article");
    card.className = `point-card ${selectedId === source.id ? "is-selected" : ""}`;
    card.innerHTML = `
      <button class="point-title" type="button">
        <span class="swatch" style="background:${source.color}"></span>
        <strong>${source.name}</strong>
      </button>
      <label>색상 <input data-field="color" type="color" value="${source.color}" /></label>
      <label>발향량 <input data-field="emission" type="range" min="0.2" max="3" step="0.05" value="${source.emission}" /><span>${source.emission.toFixed(2)}</span></label>
      <label>퍼짐 <input data-field="spread" type="range" min="0.25" max="1.8" step="0.05" value="${source.spread}" /><span>${source.spread.toFixed(2)}</span></label>
      <label>감쇠 <input data-field="decay" type="range" min="0.001" max="0.018" step="0.0005" value="${source.decay}" /><span>${source.decay.toFixed(4)}</span></label>
      <button class="remove-point" type="button" ${sources.length <= 1 ? "disabled" : ""}>삭제</button>
    `;
    card.querySelector(".point-title").addEventListener("click", () => {
      selectedId = source.id;
      activeTool = "source";
      renderControls();
    });
    card.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        const field = input.dataset.field;
        source[field] = field === "color" ? input.value : Number(input.value);
        renderControls();
      });
    });
    card.querySelector(".remove-point").addEventListener("click", () => {
      sources = sources.filter((item) => item.id !== source.id);
      if (selectedId === source.id) selectedId = sources[0]?.id ?? null;
      sim.reset(devices, sources);
      renderControls();
    });
    sourceListEl.append(card);
  });
}

function renderTargetList() {
  if (!targetListEl) return;
  targetListEl.innerHTML = "";
  targets.forEach((target) => {
    const result = sim.sampleTarget(target, sources);
    const card = document.createElement("article");
    card.className = `point-card ${selectedId === target.id ? "is-selected" : ""}`;
    card.innerHTML = `
      <button class="point-title" type="button">
        <span class="target-dot">T</span>
        <strong>${target.name}</strong>
        <em>${pct(result.total)}</em>
      </button>
      <input class="name-input" type="text" value="${target.name}" aria-label="도착점 이름" />
      <div class="scent-bars"></div>
      <button class="remove-point" type="button" ${targets.length <= 1 ? "disabled" : ""}>삭제</button>
    `;
    const bars = card.querySelector(".scent-bars");
    for (const item of result.bySource) {
      const row = document.createElement("div");
      row.className = "scent-bar-row";
      row.innerHTML = `<span>${item.name}</span><strong>${pct(item.value)}</strong><i style="--bar:${Math.min(100, Math.round(item.value * 42))}%;--color:${item.color}"></i>`;
      bars.append(row);
    }
    card.querySelector(".point-title").addEventListener("click", () => {
      selectedId = target.id;
      activeTool = "target";
      renderControls();
    });
    card.querySelector(".name-input").addEventListener("input", (event) => {
      target.name = event.currentTarget.value;
      renderControls();
    });
    card.querySelector(".remove-point").addEventListener("click", () => {
      targets = targets.filter((item) => item.id !== target.id);
      if (selectedId === target.id) selectedId = targets[0]?.id ?? null;
      renderControls();
    });
    targetListEl.append(card);
  });
}

function canvasPoint(event) {
  const rect = simCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * PLAN_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * PLAN_HEIGHT,
  };
}

function findDeviceAt(point) {
  const all = allElements().slice().reverse();
  return all.find((device) => {
    if (device.type === "partition") {
      const [x1, y1, x2, y2] = partitionEndpoints(device);
      const length = Math.hypot(x2 - x1, y2 - y1);
      const dot = ((point.x - x1) * (x2 - x1) + (point.y - y1) * (y2 - y1)) / (length * length);
      const t = Math.max(0, Math.min(1, dot));
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      return Math.hypot(point.x - x, point.y - y) < 18;
    }
    return Math.hypot(point.x - device.x, point.y - device.y) < 24;
  });
}

function placeTool(point) {
  const p = snapToWalkable(point, devices);
  if (activeTool === "source") {
    const selected = selectedElement();
    if (selected?.type === "source") {
      selected.x = p.x;
      selected.y = p.y;
      sim.reset(devices, sources);
      return;
    }
    const source = createSourceAt(p);
    if (source) selectedId = source.id;
    sim.reset(devices, sources);
    return;
  }
  if (activeTool === "target") {
    const selected = selectedElement();
    if (selected?.type === "target") {
      selected.x = p.x;
      selected.y = p.y;
      return;
    }
    const target = createTargetAt(p);
    if (target) selectedId = target.id;
    return;
  }
  if (!isToolAllowed(activeTool)) return;
  const base = { id: uid(activeTool), type: activeTool, x: p.x, y: p.y, angle: -Math.PI / 4 };
  if (activeTool === "partition") Object.assign(base, { length: 124, thickness: 9, angle: 0 });
  devices.push(base);
  selectedId = base.id;
  sim.refreshMask(devices);
}

function updateDragged(point) {
  if (!dragging) return;
  const selected = allElements().find((device) => device.id === dragging.id);
  if (!selected) return;
  const blockerDevices = devices.filter((d) => d.id !== selected.id);
  const next = snapToWalkable({ x: point.x - dragging.dx, y: point.y - dragging.dy }, blockerDevices);
  selected.x = next.x;
  selected.y = next.y;
  if (selected.type === "source") sim.reset(devices, sources);
  if (selected.type === "partition") sim.refreshMask(devices);
}

function drawGrid() {
  simCtx.save();
  simCtx.strokeStyle = "rgba(86, 62, 43, 0.07)";
  simCtx.lineWidth = 1;
  for (let x = 0; x <= PLAN_WIDTH; x += 24) {
    simCtx.beginPath();
    simCtx.moveTo(x, 0);
    simCtx.lineTo(x, PLAN_HEIGHT);
    simCtx.stroke();
  }
  for (let y = 0; y <= PLAN_HEIGHT; y += 24) {
    simCtx.beginPath();
    simCtx.moveTo(0, y);
    simCtx.lineTo(PLAN_WIDTH, y);
    simCtx.stroke();
  }
  simCtx.restore();
}

function drawFanFlow(device, t) {
  simCtx.save();
  simCtx.translate(device.x, device.y);
  simCtx.rotate(device.angle ?? 0);
  simCtx.fillStyle = "rgba(47,111,105,0.16)";
  simCtx.beginPath();
  simCtx.moveTo(8, 0);
  simCtx.arc(0, 0, 170, -0.36, 0.36);
  simCtx.closePath();
  simCtx.fill();
  simCtx.strokeStyle = "rgba(47,111,105,0.34)";
  simCtx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const y = -42 + i * 28;
    const offset = (t * 34 + i * 17) % 70;
    simCtx.beginPath();
    simCtx.moveTo(28 + offset, y);
    simCtx.bezierCurveTo(72 + offset, y - 10, 116 + offset, y + 10, 158 + offset, y);
    simCtx.stroke();
  }
  simCtx.setLineDash([9, 8]);
  simCtx.strokeStyle = "rgba(80,120,130,0.28)";
  for (let i = 0; i < 4; i += 1) {
    const y = -36 + i * 24;
    const offset = (t * 24 + i * 13) % 54;
    simCtx.beginPath();
    simCtx.moveTo(-150 + offset, y);
    simCtx.bezierCurveTo(-110 + offset, y - 12, -72, y + 8, -22, 0);
    simCtx.stroke();
  }
  simCtx.restore();
}

function drawThermal(device, t) {
  simCtx.save();
  simCtx.translate(device.x, device.y);
  if (device.type === "heater") {
    simCtx.strokeStyle = "rgba(182,84,50,0.45)";
    simCtx.lineWidth = 4;
    for (let i = 0; i < 5; i += 1) {
      const x = -28 + i * 14;
      const lift = (t * 36 + i * 11) % 30;
      simCtx.beginPath();
      simCtx.moveTo(x, 34 - lift);
      simCtx.bezierCurveTo(x - 14, 8 - lift, x + 14, -10 - lift, x, -48 - lift);
      simCtx.stroke();
    }
  } else {
    for (let i = 0; i < 3; i += 1) {
      const r = 58 + ((t * 22 + i * 38) % 84);
      simCtx.strokeStyle = `rgba(70,126,120,${0.24 - i * 0.04})`;
      simCtx.lineWidth = 4;
      simCtx.beginPath();
      simCtx.arc(0, 0, r, 0, Math.PI * 2);
      simCtx.stroke();
    }
  }
  simCtx.restore();
}

function drawDevices(t) {
  for (const device of devices) {
    if (device.type === "fan") drawFanFlow(device, t);
    if (device.type === "heater" || device.type === "cooler") drawThermal(device, t);
  }
  for (const device of devices) {
    const selected = selectedId === device.id;
    simCtx.save();
    simCtx.translate(device.x, device.y);
    simCtx.rotate(device.angle ?? 0);
    if (device.type === "partition") {
      simCtx.strokeStyle = selected ? "#e1a35f" : "#8b5543";
      simCtx.lineWidth = 13;
      simCtx.lineCap = "round";
      simCtx.beginPath();
      simCtx.moveTo(-(device.length ?? 124) / 2, 0);
      simCtx.lineTo((device.length ?? 124) / 2, 0);
      simCtx.stroke();
    }
    if (device.type === "fan") {
      simCtx.fillStyle = selected ? "#e1a35f" : "#2f6f69";
      simCtx.beginPath();
      simCtx.arc(0, 0, 18, 0, Math.PI * 2);
      simCtx.fill();
      simCtx.fillStyle = "#fffaf2";
      simCtx.beginPath();
      simCtx.moveTo(22, 0);
      simCtx.lineTo(4, -8);
      simCtx.lineTo(4, 8);
      simCtx.closePath();
      simCtx.fill();
    }
    if (device.type === "heater" || device.type === "cooler") {
      simCtx.fillStyle = device.type === "heater" ? "#b65432" : "#467e78";
      simCtx.globalAlpha = selected ? 1 : 0.88;
      simCtx.beginPath();
      simCtx.arc(0, 0, 22, 0, Math.PI * 2);
      simCtx.fill();
      simCtx.globalAlpha = 0.16;
      simCtx.beginPath();
      simCtx.arc(0, 0, 122, 0, Math.PI * 2);
      simCtx.fill();
    }
    simCtx.restore();
  }
  sources.forEach((source, index) => drawPoint(simCtx, source, source.color, `S${index + 1}`, selectedId === source.id));
  targets.forEach((target, index) => drawPoint(simCtx, target, "#2f6f69", `T${index + 1}`, selectedId === target.id));
}

function drawPoint(ctx, point, color, text, selected = false) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? "#e1a35f" : "#201914";
  ctx.lineWidth = selected ? 6 : 4;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fffaf2";
  ctx.font = "900 15px Pretendard, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, point.x, point.y + 1);
  ctx.restore();
}

function initSimulator() {
  simCanvas?.addEventListener("pointerdown", (event) => {
    simCanvas.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    const hit = findDeviceAt(point);
    if (hit) {
      selectedId = hit.id;
      dragging = { id: hit.id, dx: point.x - hit.x, dy: point.y - hit.y };
    } else {
      placeTool(point);
    }
    renderControls();
  });
  simCanvas?.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    updateDragged(canvasPoint(event));
    renderControls();
  });
  simCanvas?.addEventListener("pointerup", () => {
    dragging = null;
    sim.refreshMask(devices);
  });
  rotateButton?.addEventListener("click", () => {
    const selected = devices.find((device) => device.id === selectedId);
    if (!selected) return;
    selected.angle = (selected.angle ?? 0) + Math.PI / 8;
    sim.refreshMask(devices);
  });
  deleteButton?.addEventListener("click", () => {
    const selected = selectedElement();
    if (!selected) return;
    if (selected.type === "source" && sources.length > 1) {
      sources = sources.filter((source) => source.id !== selected.id);
      sim.reset(devices, sources);
    } else if (selected.type === "target" && targets.length > 1) {
      targets = targets.filter((target) => target.id !== selected.id);
    } else {
      devices = devices.filter((device) => device.id !== selected.id);
      sim.refreshMask(devices);
    }
    selectedId = sources[0]?.id ?? targets[0]?.id ?? null;
    renderControls();
  });
  toggleRunButton?.addEventListener("click", () => {
    running = !running;
    toggleRunButton.textContent = running ? "일시 정지" : "시뮬레이션 시작";
  });
  resetScentButton?.addEventListener("click", () => sim.reset(devices, sources));
  clearDevicesButton?.addEventListener("click", () => {
    devices = [];
    selectedId = null;
    sim.reset(devices, sources);
    renderControls();
  });
  addSourceButton?.addEventListener("click", () => {
    const base = snapToWalkable({ x: 180 + sources.length * 24, y: 720 }, devices);
    const source = createSourceAt(base);
    if (source) {
      selectedId = source.id;
      activeTool = "source";
      sim.reset(devices, sources);
      renderControls();
    }
  });
  addTargetButton?.addEventListener("click", () => {
    const base = snapToWalkable({ x: 225 + targets.length * 28, y: 575 }, devices);
    const target = createTargetAt(base);
    if (target) {
      selectedId = target.id;
      activeTool = "target";
      renderControls();
    }
  });
  renderControls();
}

function tick(now = 0) {
  const t = now / 1000;
  if (running) {
    const key = JSON.stringify(devices.map((d) => [d.type, Math.round(d.x), Math.round(d.y), Math.round((d.angle ?? 0) * 100)]));
    if (key !== lastMaskKey) {
      sim.refreshMask(devices);
      lastMaskKey = key;
    }
    for (let i = 0; i < 2; i += 1) sim.step({ sources, devices });
  }
  if (simCtx) {
    drawFloorPlan(simCtx);
    drawGrid();
    sim.draw(simCtx, sources);
    drawDevices(t);
    const totals = targets.map((target) => sim.sampleTarget(target, sources).total);
    const average = totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0;
    goalScoreEl.textContent = pct(average);
    if (Math.floor(now / 500) !== Math.floor((now - 16) / 500)) renderTargetList();
  }
  requestAnimationFrame(tick);
}

initHomePlan();
initViewer();
initSimulator();
showPage(window.location.hash.replace("#", "") || "home");
tick();
