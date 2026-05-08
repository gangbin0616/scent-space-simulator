import {
  PLAN_HEIGHT,
  PLAN_WIDTH,
  drawFloorPlan,
  getWallLines,
  isWalkable,
  outerPolygon,
  partitionEndpoints,
  snapToWalkable,
  toggleableFloorplanWalls,
} from "./floorplan.js";
import { createSimulation } from "./simulation.js";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const MAX_POINTS = 10;
const TARGET_TIME_LIMIT = 15;

const scentPresets = [
  { name: "Citrus Opening", color: "#d85f37", diffusionSpeed: 0.01 },
  { name: "Floral Heart", color: "#c45d8f", diffusionSpeed: 0.01 },
  { name: "Woody Base", color: "#7b4f35", diffusionSpeed: 0.01 },
  { name: "Musk Trail", color: "#6f7890", diffusionSpeed: 0.01 },
  { name: "Green Mist", color: "#4f8f6a", diffusionSpeed: 0.01 },
];

const pages = [...document.querySelectorAll("[data-page]")];
const navButtons = [...document.querySelectorAll(".nav-button")];

function showPage(route) {
  const safeRoute = ["home", "viewer", "simulator"].includes(route) ? route : "home";
  for (const page of pages) page.hidden = page.dataset.page !== safeRoute;
  for (const button of navButtons) button.classList.toggle("is-current", button.dataset.route === safeRoute);
  if (window.location.hash !== `#${safeRoute}`) window.location.hash = safeRoute;
  if (safeRoute === "viewer") requestAnimationFrame(drawViewer);
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
  heater: ["온열 장치", "설정 온도와 범위 안에서 향의 확산 속도를 높입니다.", "상승 열기"],
  cooler: ["냉방 장치", "설정 온도와 범위 안에서 향의 확산 속도를 낮춥니다.", "잔향 유지"],
  route: ["체험 동선", "입구에서 체험존까지의 이동 경로를 기준으로 향의 도착 농도를 확인합니다.", "방문자 흐름"],
  entrance: ["유리문 입구", "성수 쇼룸처럼 외부 빛이 들어오는 투명한 입구 장면입니다.", "워크스루 시작점"],
  mural: ["브랜드 월 이미지", "벽면에 직접 붙은 향수 매장 이미지 패널입니다. 도면 좌표에 맞춰 보이고 가려집니다.", "성수 매장 무드"],
  shelf: ["향수 진열 선반", "벽면 이미지와 함께 자연스럽게 놓이는 진열 오브젝트입니다.", "제품 디스플레이"],
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
  pitch: 0,
  camera: { x: 190, y: 700 },
  dragging: null,
  marker: null,
  keys: new Set(),
  lastMoveAt: 0,
};

const VIEWER_FOV = Math.PI * 0.72;
const VIEWER_COLLISION_RADIUS = 15;
const VIEWER_MOVE_SPEED = 138;
const VIEWER_TURN_SPEED = 2.15;
const VIEWER_MAX_PITCH = 0.62;

const cameras = {
  entry: { x: 575, y: 882, yaw: -Math.PI / 2 },
  curve: { x: 175, y: 700, yaw: -0.92 },
  center: { x: 235, y: 590, yaw: -0.55 },
  north: { x: 392, y: 235, yaw: 1.95 },
  east: { x: 560, y: 820, yaw: -2.3 },
};

const viewerElements = [
  { key: "entrance", x: 575, y: 932, label: "입구", kind: "glass-door", anchor: 0.62 },
  { key: "partition", x: 230, y: 530, label: "가벽", kind: "partition", anchor: 0.72 },
  { key: "fan", x: 250, y: 650, label: "순환", kind: "fan", anchor: 0.74 },
  { key: "heater", x: 166, y: 665, label: "온열", kind: "heater", anchor: 0.74 },
  { key: "cooler", x: 400, y: 210, label: "냉방", kind: "cooler", anchor: 0.72 },
  { key: "mural", x: 315, y: 760, label: "월이미지", kind: "mural", anchor: 0.42 },
  { key: "shelf", x: 300, y: 590, label: "선반", kind: "shelf", anchor: 0.52 },
  { key: "route", x: 300, y: 760, label: "동선", kind: "route", anchor: 0.78 },
];

const VIEWER_WORLD_SCALE = 0.045;
const VIEWER_EYE_HEIGHT = 2.45;
const VIEWER_WALL_HEIGHT = 3.25;
const VIEWER_WALL_THICKNESS = 0.18;
const VIEWER_OBJECT_PICK_RADIUS = 0.42;

const viewer3d = {
  renderer: null,
  scene: null,
  camera: null,
  world: null,
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  interactive: [],
  sceneKey: "",
};

function normalizeAngle(angle) {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function raySegmentHit(origin, angle, segment) {
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
  if (t < 0 || u < 0 || u > 1) return null;
  return { distance: t, segment, wallAngle: Math.atan2(sy, sx) };
}

function castRayHit(origin, angle) {
  let best = { distance: Infinity, segment: null, wallAngle: 0 };
  for (const segment of getWallLines(devices ?? [])) {
    const hit = raySegmentHit(origin, angle, segment);
    if (hit && hit.distance < best.distance) best = hit;
  }
  return best;
}

function castRay(origin, angle) {
  return castRayHit(origin, angle).distance;
}

function canViewerStandAt(x, y) {
  const r = VIEWER_COLLISION_RADIUS;
  return (
    isWalkable(x, y, devices ?? []) &&
    isWalkable(x + r, y, devices ?? []) &&
    isWalkable(x - r, y, devices ?? []) &&
    isWalkable(x, y + r, devices ?? []) &&
    isWalkable(x, y - r, devices ?? []) &&
    isWalkable(x + r * 0.7, y + r * 0.7, devices ?? []) &&
    isWalkable(x - r * 0.7, y - r * 0.7, devices ?? []) &&
    isWalkable(x + r * 0.7, y - r * 0.7, devices ?? []) &&
    isWalkable(x - r * 0.7, y + r * 0.7, devices ?? [])
  );
}

function moveViewerCamera(dx, dy) {
  const nextX = viewer.camera.x + dx;
  const nextY = viewer.camera.y + dy;
  if (canViewerStandAt(nextX, viewer.camera.y)) viewer.camera.x = nextX;
  if (canViewerStandAt(viewer.camera.x, nextY)) viewer.camera.y = nextY;
}

function updateViewerMovement(now) {
  const viewerPage = document.querySelector('[data-page="viewer"]');
  if (!viewerPage || viewerPage.hidden) {
    viewer.lastMoveAt = now;
    return;
  }
  const last = viewer.lastMoveAt || now;
  const dt = Math.min(0.045, Math.max(0, (now - last) / 1000));
  viewer.lastMoveAt = now;

  let turn = 0;
  if (viewer.keys.has("arrowleft")) turn -= 1;
  if (viewer.keys.has("arrowright")) turn += 1;
  if (turn) viewer.yaw += turn * VIEWER_TURN_SPEED * dt;

  let forward = 0;
  let strafe = 0;
  if (viewer.keys.has("w") || viewer.keys.has("arrowup")) forward += 1;
  if (viewer.keys.has("s") || viewer.keys.has("arrowdown")) forward -= 1;
  if (viewer.keys.has("a")) strafe -= 1;
  if (viewer.keys.has("d")) strafe += 1;
  const length = Math.hypot(forward, strafe);
  if (!length && !turn) return;

  if (length) {
    forward /= length;
    strafe /= length;
    const cos = Math.cos(viewer.yaw);
    const sin = Math.sin(viewer.yaw);
    const speed = VIEWER_MOVE_SPEED * dt;
    const dx = (cos * forward + Math.cos(viewer.yaw + Math.PI / 2) * strafe) * speed;
    const dy = (sin * forward + Math.sin(viewer.yaw + Math.PI / 2) * strafe) * speed;
    moveViewerCamera(dx, dy);
  }
  drawViewer();
}

function drawViewerWallStripe(ctx, x, y, wallHeight, distance, shade, columnIndex) {
  const top = Math.max(0, y);
  const bottom = Math.min(ctx.canvas.height, y + wallHeight);
  const wallShade = ctx.createLinearGradient(x, top, x, bottom);
  wallShade.addColorStop(0, `rgb(${Math.min(238, shade + 22)}, ${Math.min(229, shade + 12)}, ${Math.min(216, shade + 4)})`);
  wallShade.addColorStop(0.42, `rgb(${Math.min(224, shade + 4)}, ${Math.max(70, shade - 6)}, ${Math.max(64, shade - 16)})`);
  wallShade.addColorStop(1, `rgb(${Math.max(42, shade - 50)}, ${Math.max(38, shade - 54)}, ${Math.max(34, shade - 58)})`);
  ctx.fillStyle = wallShade;
  ctx.fillRect(x, y, 2, wallHeight);

  const seamStrength = Math.max(0.02, Math.min(0.11, 1 - distance / 520));
  if (columnIndex % 48 === 0) {
    ctx.fillStyle = `rgba(255,250,242,${seamStrength})`;
    ctx.fillRect(x, y + wallHeight * 0.08, 1, wallHeight * 0.84);
  }

  const railAlpha = Math.max(0.03, Math.min(0.16, 1 - distance / 440));
  ctx.fillStyle = `rgba(255,250,242,${railAlpha})`;
  ctx.fillRect(x, y + wallHeight * 0.34, 2, Math.max(1, wallHeight * 0.006));
  ctx.fillStyle = `rgba(35,26,20,${railAlpha * 0.8})`;
  ctx.fillRect(x, y + wallHeight * 0.79, 2, Math.max(2, wallHeight * 0.01));

  const imageAlpha = Math.max(0.025, Math.min(0.18, 1 - distance / 560));
  const band = Math.floor(columnIndex / 36) % 5;
  if (band === 1 || band === 2) {
    const panelTop = y + wallHeight * 0.2;
    const panelHeight = wallHeight * 0.34;
    const tone = band === 1 ? "216, 95, 55" : "79, 143, 106";
    ctx.fillStyle = `rgba(${tone},${imageAlpha})`;
    ctx.fillRect(x, panelTop, 2, panelHeight);
    ctx.fillStyle = `rgba(255,250,242,${imageAlpha * 0.62})`;
    ctx.fillRect(x, panelTop + panelHeight * 0.18, 2, Math.max(1, panelHeight * 0.025));
    ctx.fillRect(x, panelTop + panelHeight * 0.58, 2, Math.max(1, panelHeight * 0.018));
  }
}

function drawCeilingLights(ctx, horizon) {
  const { width: w, height: h } = ctx.canvas;
  ctx.save();
  for (let i = -2; i <= 2; i += 1) {
    const x = w / 2 + i * 155 - normalizeAngle(viewer.yaw) * 18;
    const y = horizon * 0.22 + Math.abs(i) * 10 + viewer.pitch * 34;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 92);
    glow.addColorStop(0, "rgba(255,244,216,0.62)");
    glow.addColorStop(0.18, "rgba(255,231,178,0.24)");
    glow.addColorStop(1, "rgba(255,231,178,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,252,236,0.94)";
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMuralPanel(ctx, item) {
  ctx.save();
  ctx.translate(item.screenX, item.screenY);
  const scale = item.size / 96;
  ctx.scale(scale, scale);
  ctx.globalAlpha = item.alpha;
  const panel = ctx.createLinearGradient(-72, -70, 72, 64);
  panel.addColorStop(0, "#f5eadb");
  panel.addColorStop(0.36, "#cf7f62");
  panel.addColorStop(0.64, "#4f8f6a");
  panel.addColorStop(1, "#201914");
  ctx.fillStyle = "rgba(22,17,14,0.28)";
  ctx.fillRect(-80, -66, 160, 112);
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.roundRect(-74, -72, 148, 108, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,242,0.62)";
  ctx.fillRect(-52, -46, 104, 6);
  ctx.fillRect(-52, -30, 72, 4);
  ctx.fillStyle = "rgba(255,250,242,0.18)";
  ctx.beginPath();
  ctx.arc(32, -10, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShelfDisplay(ctx, item) {
  ctx.save();
  ctx.translate(item.screenX, item.screenY);
  const scale = item.size / 92;
  ctx.scale(scale, scale);
  ctx.globalAlpha = item.alpha;
  ctx.fillStyle = "rgba(22,17,14,0.26)";
  ctx.fillRect(-82, 26, 164, 10);
  ctx.fillStyle = "rgba(255,250,242,0.54)";
  ctx.fillRect(-76, 18, 152, 8);
  for (let i = 0; i < 5; i += 1) {
    const x = -52 + i * 26;
    const colors = ["#d85f37", "#c45d8f", "#7b4f35", "#6f7890", "#4f8f6a"];
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(x - 8, -22 - (i % 2) * 6, 16, 40 + (i % 2) * 6, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,250,242,0.44)";
    ctx.fillRect(x - 4, -30 - (i % 2) * 6, 8, 8);
  }
  ctx.restore();
}

function drawWallObject(ctx, item) {
  if (item.kind === "mural") {
    drawMuralPanel(ctx, item);
    return;
  }
  if (item.kind === "shelf") {
    drawShelfDisplay(ctx, item);
    return;
  }
  ctx.save();
  ctx.translate(item.screenX, item.screenY);
  const scale = item.size / 82;
  ctx.scale(scale, scale);
  ctx.globalAlpha = item.alpha;

  ctx.fillStyle = "rgba(22,17,14,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 48, 44, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (item.kind === "glass-door") {
    const glass = ctx.createLinearGradient(-52, -72, 52, 48);
    glass.addColorStop(0, "rgba(226,246,255,0.72)");
    glass.addColorStop(0.48, "rgba(255,250,242,0.18)");
    glass.addColorStop(1, "rgba(69,92,96,0.46)");
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.roundRect(-54, -78, 108, 126, 9);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,250,242,0.62)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillRect(-34, -60, 8, 86);
    ctx.fillRect(18, -60, 8, 86);
    ctx.fillStyle = "rgba(32,25,20,0.55)";
    ctx.fillRect(-4, -78, 8, 126);
  } else if (item.kind === "partition") {
    const partition = ctx.createLinearGradient(-44, -34, 44, 42);
    partition.addColorStop(0, "rgba(118,92,74,0.86)");
    partition.addColorStop(1, "rgba(73,52,43,0.92)");
    ctx.fillStyle = partition;
    ctx.beginPath();
    ctx.roundRect(-48, -42, 96, 88, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,250,242,0.14)";
    ctx.fillRect(-36, -24, 72, 8);
    ctx.fillRect(-36, -8, 72, 4);
  } else if (item.kind === "fan") {
    ctx.fillStyle = "rgba(47,111,105,0.78)";
    ctx.beginPath();
    ctx.arc(0, -3, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,250,242,0.42)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -3, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(32,25,20,0.55)";
    ctx.fillRect(-6, 28, 12, 28);
    ctx.strokeStyle = "rgba(47,111,105,0.34)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-52, -4);
    ctx.bezierCurveTo(-30, -22, -16, -16, -4, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, -8);
    ctx.bezierCurveTo(44, -24, 62, -16, 78, -4);
    ctx.stroke();
  } else if (item.kind === "heater" || item.kind === "cooler") {
    const color = item.kind === "heater" ? "rgba(182,84,50,0.82)" : "rgba(70,126,120,0.82)";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-30, -38, 60, 82, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(255,250,242,0.2)";
    for (let i = 0; i < 4; i += 1) ctx.fillRect(-20, -22 + i * 14, 40, 3);
    ctx.strokeStyle = item.kind === "heater" ? "rgba(255,190,124,0.52)" : "rgba(158,224,220,0.52)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      if (item.kind === "heater") {
        const x = -18 + i * 18;
        ctx.moveTo(x, -48);
        ctx.bezierCurveTo(x - 10, -66, x + 12, -72, x, -92);
      } else {
        ctx.arc(0, 0, 44 + i * 12, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "rgba(255,250,242,0.36)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-42, 22);
    ctx.bezierCurveTo(-12, -30, 20, -16, 46, -42);
    ctx.stroke();
    ctx.fillStyle = "rgba(225,163,95,0.74)";
    ctx.beginPath();
    ctx.arc(46, -42, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = viewer.marker === item.key ? "rgba(225,163,95,0.96)" : "rgba(32,25,20,0.76)";
  ctx.strokeStyle = "rgba(255,250,242,0.56)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -58, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fffaf2";
  ctx.font = "900 10px Pretendard, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.label, 0, -58);
  ctx.restore();
}

function planToWorld(x, y, height = 0) {
  return new THREE.Vector3((x - PLAN_WIDTH * 0.5) * VIEWER_WORLD_SCALE, height, (y - PLAN_HEIGHT * 0.5) * VIEWER_WORLD_SCALE);
}

function viewerSceneKey() {
  const walls = getWallLines(devices ?? []).map((line) => line.map((value) => Math.round(value)));
  const placed = devices
    .filter((device) => ["partition", "fan", "heater", "cooler", "floorplan-wall-toggle"].includes(device.type))
    .map((device) => [device.type, device.id, Math.round(device.x ?? 0), Math.round(device.y ?? 0), Math.round((device.angle ?? 0) * 100), device.active]);
  return JSON.stringify({ walls, placed });
}

function makeViewerMaterial(color, roughness = 0.72, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addPickable(mesh, item) {
  mesh.userData.viewerItem = item;
  viewer3d.interactive.push(mesh);
  return mesh;
}

function addWallMesh(group, line, index) {
  const [x1, y1, x2, y2] = line;
  const a = planToWorld(x1, y1);
  const b = planToWorld(x2, y2);
  const length = Math.max(0.05, a.distanceTo(b));
  const geometry = new THREE.BoxGeometry(length, VIEWER_WALL_HEIGHT, VIEWER_WALL_THICKNESS);
  const material = makeViewerMaterial(index % 5 === 0 ? 0xb86f54 : 0x8f6e5a, 0.82);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((a.x + b.x) * 0.5, VIEWER_WALL_HEIGHT * 0.5, (a.z + b.z) * 0.5);
  mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (index % 4 === 0) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length * 0.82, 0.035, 0.02), makeViewerMaterial(0xf7ead6, 0.58));
    rail.position.set(0, 0.72, VIEWER_WALL_THICKNESS * 0.54);
    mesh.add(rail);
  }
}

function buildViewerFloor(group) {
  const shape = new THREE.Shape();
  outerPolygon.forEach((point, index) => {
    const world = planToWorld(point.x, point.y);
    if (index === 0) shape.moveTo(world.x, world.z);
    else shape.lineTo(world.x, world.z);
  });
  shape.closePath();
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), makeViewerMaterial(0x8d7a62, 0.9));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = floor.clone();
  ceiling.material = new THREE.MeshBasicMaterial({ color: 0xf4eadc, side: THREE.BackSide });
  ceiling.position.y = VIEWER_WALL_HEIGHT;
  ceiling.rotation.x = Math.PI / 2;
  group.add(ceiling);
}

function createViewerObjectMesh(item) {
  const group = new THREE.Group();
  const palette = {
    heater: 0xb65432,
    cooler: 0x467e78,
    fan: 0x2f6f69,
    mural: 0xd85f37,
    shelf: 0x7b4f35,
    partition: 0x8b5543,
    route: 0xe1a35f,
    entrance: 0xaed8e4,
  };
  const color = palette[item.kind] ?? palette[item.type] ?? 0x2f6f69;

  if (item.kind === "mural") {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.08), makeViewerMaterial(color, 0.55));
    mesh.position.y = 1.65;
    group.add(mesh);
  } else if (item.kind === "shelf") {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.38), makeViewerMaterial(0x6d4a38, 0.7));
    shelf.position.y = 0.92;
    group.add(shelf);
    for (let i = 0; i < 5; i += 1) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.42, 12), makeViewerMaterial([0xd85f37, 0xc45d8f, 0x7b4f35, 0x6f7890, 0x4f8f6a][i], 0.38, 0.12));
      bottle.position.set(-0.48 + i * 0.24, 1.22, 0);
      group.add(bottle);
    }
  } else if (item.kind === "fan") {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 32), makeViewerMaterial(color, 0.54, 0.08));
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.62;
    group.add(body);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.55, 10), makeViewerMaterial(0x233330, 0.66));
    stand.position.y = 0.28;
    group.add(stand);
  } else if (item.kind === "heater" || item.kind === "cooler") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.9, 0.32), makeViewerMaterial(color, 0.46, 0.08));
    body.position.y = 0.7;
    group.add(body);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16 }));
    glow.position.y = 0.72;
    group.add(glow);
  } else if (item.kind === "glass-door") {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.15, 0.08), new THREE.MeshPhysicalMaterial({ color: 0xbce8f0, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.44 }));
    door.position.y = 1.2;
    group.add(door);
  } else {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.78, 18), makeViewerMaterial(color, 0.64));
    marker.position.y = 0.44;
    group.add(marker);
  }

  const pin = new THREE.Mesh(new THREE.SphereGeometry(VIEWER_OBJECT_PICK_RADIUS, 16, 8), new THREE.MeshBasicMaterial({ color: viewer.marker === item.key ? 0xe1a35f : 0xffffff, transparent: true, opacity: 0.01 }));
  pin.position.y = 1.0;
  addPickable(pin, item);
  group.add(pin);
  return group;
}

function dynamicViewerObjects() {
  return devices
    .filter((device) => ["fan", "heater", "cooler"].includes(device.type))
    .map((device) => ({ key: device.id, x: device.x, y: device.y, kind: device.type, label: labelFor(device.type), dynamic: true }));
}

function rebuildViewerScene() {
  if (!viewer3d.scene) return;
  if (viewer3d.world) viewer3d.scene.remove(viewer3d.world);
  viewer3d.interactive = [];
  const group = new THREE.Group();
  buildViewerFloor(group);
  getWallLines(devices ?? []).forEach((line, index) => addWallMesh(group, line, index));

  [...viewerElements, ...dynamicViewerObjects()].forEach((item) => {
    const mesh = createViewerObjectMesh(item);
    const position = planToWorld(item.x, item.y);
    mesh.position.set(position.x, 0, position.z);
    mesh.rotation.y = -(item.angle ?? 0);
    group.add(mesh);
  });

  viewer3d.world = group;
  viewer3d.scene.add(group);
}

function initViewer3D() {
  if (viewer3d.renderer || !viewer.canvas) return;
  viewer3d.renderer = new THREE.WebGLRenderer({ canvas: viewer.canvas, antialias: true, alpha: false });
  viewer3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  viewer3d.renderer.setSize(viewer.canvas.width, viewer.canvas.height, false);
  viewer3d.renderer.shadowMap.enabled = true;
  viewer3d.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  viewer3d.scene = new THREE.Scene();
  viewer3d.scene.background = new THREE.Color(0xf2e8d8);
  viewer3d.scene.fog = new THREE.Fog(0xf2e8d8, 11, 42);

  viewer3d.camera = new THREE.PerspectiveCamera(68, viewer.canvas.width / viewer.canvas.height, 0.05, 90);
  viewer3d.scene.add(new THREE.HemisphereLight(0xfff5df, 0x5a4637, 1.45));
  const key = new THREE.DirectionalLight(0xffddb0, 2.4);
  key.position.set(-6, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  viewer3d.scene.add(key);

  for (let i = 0; i < 4; i += 1) {
    const light = new THREE.PointLight(0xffe0aa, 1.2, 16);
    const x = PLAN_WIDTH * (0.28 + i * 0.14);
    const y = PLAN_HEIGHT * (0.18 + (i % 2) * 0.48);
    light.position.copy(planToWorld(x, y, VIEWER_WALL_HEIGHT - 0.35));
    viewer3d.scene.add(light);
  }
}

function renderViewer3D() {
  initViewer3D();
  if (!viewer3d.renderer || !viewer3d.camera || !viewer3d.scene) return;
  const key = viewerSceneKey();
  if (key !== viewer3d.sceneKey) {
    viewer3d.sceneKey = key;
    rebuildViewerScene();
  }
  const position = planToWorld(viewer.camera.x, viewer.camera.y, VIEWER_EYE_HEIGHT);
  viewer3d.camera.position.copy(position);
  const lookAt = planToWorld(
    viewer.camera.x + Math.cos(viewer.yaw) * 120,
    viewer.camera.y + Math.sin(viewer.yaw) * 120,
    VIEWER_EYE_HEIGHT - viewer.pitch * 3.2
  );
  viewer3d.camera.lookAt(lookAt);
  viewer3d.renderer.render(viewer3d.scene, viewer3d.camera);
}

function drawViewer() {
  renderViewer3D();
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
  drawFloorPlan(ctx, devices);
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
  window.__viewerDebug = {
    get camera() {
      return { ...viewer.camera };
    },
    get yaw() {
      return viewer.yaw;
    },
    get pitch() {
      return viewer.pitch;
    },
    canStand: canViewerStandAt,
  };
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
    viewer.dragging = { x: event.clientX, y: event.clientY, yaw: viewer.yaw, pitch: viewer.pitch };
  });
  viewer.canvas?.addEventListener("pointermove", (event) => {
    if (!viewer.dragging) return;
    viewer.yaw = viewer.dragging.yaw - (event.clientX - viewer.dragging.x) * 0.008;
    viewer.pitch = clamp(viewer.dragging.pitch + (event.clientY - viewer.dragging.y) * 0.0046, -VIEWER_MAX_PITCH, VIEWER_MAX_PITCH);
    drawViewer();
  });
  viewer.canvas?.addEventListener("pointerup", () => {
    viewer.dragging = null;
  });
  viewer.canvas?.addEventListener("pointerleave", () => {
    viewer.dragging = null;
  });
  viewer.canvas?.addEventListener("click", (event) => {
    const rect = viewer.canvas.getBoundingClientRect();
    if (!viewer3d.camera || !viewer3d.interactive.length) return;
    viewer3d.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    viewer3d.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    viewer3d.raycaster.setFromCamera(viewer3d.pointer, viewer3d.camera);
    const hit = viewer3d.raycaster.intersectObjects(viewer3d.interactive, true)[0];
    const item = hit?.object?.userData?.viewerItem;
    if (!item) return;
    viewer.marker = item.key;
    writeInfo(viewer.info, item.kind ?? item.type ?? item.key);
    viewer3d.sceneKey = "";
    drawViewer();
  });
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (!["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) return;
    if (document.querySelector('[data-page="viewer"]')?.hidden) return;
    event.preventDefault();
    viewer.keys.add(key);
  });
  window.addEventListener("keyup", (event) => {
    viewer.keys.delete(event.key.toLowerCase());
  });
  drawViewer();
}

const simCanvas = document.querySelector("#simCanvas");
const simCtx = simCanvas?.getContext("2d");
const stageButtons = document.querySelector("#stageButtons");
const toolButtons = document.querySelector("#toolButtons");
const selectedDeviceEl = document.querySelector("#selectedDevice");
const deviceSettingsEl = document.querySelector("#deviceSettings");
const goalScoreEl = document.querySelector("#goalScore");
const budgetTotalEl = document.querySelector("#budgetTotal");
const budgetBreakdownEl = document.querySelector("#budgetBreakdown");
const simTimerEl = document.querySelector("#simTimer");
const successThresholdInput = document.querySelector("#successThreshold");
const successThresholdValueEl = document.querySelector("#successThresholdValue");
const mapGoalScoreEl = document.querySelector("#mapGoalScore");
const mapTimerEl = document.querySelector("#mapTimer");
const mapBudgetTotalEl = document.querySelector("#mapBudgetTotal");
const mapSuccessStateEl = document.querySelector("#mapSuccessState");
const rotateButton = document.querySelector("#rotateButton");
const deleteButton = document.querySelector("#deleteButton");
const toggleRunButton = document.querySelector("#toggleRun");
const resetScentButton = document.querySelector("#resetScent");
const clearDevicesButton = document.querySelector("#clearDevices");
const sourceListEl = document.querySelector("#sourceList");
const targetListEl = document.querySelector("#targetList");
const addSourceButton = document.querySelector("#addSource");
const addTargetButton = document.querySelector("#addTarget");
const floorplanWallListEl = document.querySelector("#floorplanWallList");
const feedbackPanelEl = document.querySelector("#feedbackPanel");

const stages = [
  { id: 1, label: "1단계", detail: "가벽", allowed: ["partition", "floorplan-wall-toggle"] },
  { id: 2, label: "2단계", detail: "서큘레이터", allowed: ["fan"] },
  { id: 3, label: "3단계", detail: "온도 장치", allowed: ["heater", "cooler"] },
  { id: 4, label: "4단계", detail: "전체", allowed: ["partition", "floorplan-wall-toggle", "fan", "heater", "cooler"] },
];

const tools = [
  { type: "source", label: "출발점" },
  { type: "target", label: "도착점" },
  { type: "partition", label: "가벽" },
  { type: "fan", label: "서큘레이터" },
  { type: "heater", label: "온열" },
  { type: "cooler", label: "냉각" },
];

let stage = 1;
let activeTool = "source";
let running = false;
let simElapsed = 0;
let lastTickAt = 0;
let latestAverage = 0;
let successThresholdPercent = 35;
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
    reachedAt: null,
  },
];
let devices = [
  ...toggleableFloorplanWalls.map((wall) => ({
    id: `fixed-${wall.id}`,
    type: "floorplan-wall-toggle",
    wallId: wall.id,
    name: wall.label,
    active: true,
  })),
];
let selectedId = sources[0].id;
let dragging = null;
let lastMaskKey = "";
let lastFeedbackState = "pending";
const sim = createSimulation();
sim.reset(devices, sources);

function allowedTools() {
  return stages.find((item) => item.id === stage).allowed;
}

function isToolAllowed(type) {
  return type === "source" || type === "target" || allowedTools().includes(type);
}

function allElements() {
  return [...sources, ...targets, ...devices.filter((device) => device.type !== "floorplan-wall-toggle")];
}

function selectedElement() {
  return allElements().find((item) => item.id === selectedId) ?? null;
}

function labelFor(type) {
  return tools.find((tool) => tool.type === type)?.label ?? type;
}

function resetScentState() {
  simElapsed = 0;
  lastTickAt = 0;
  lastFeedbackState = "pending";
  if (feedbackPanelEl) feedbackPanelEl.hidden = true;
  targets.forEach((target) => {
    target.reachedAt = null;
  });
  sim.reset(devices, sources);
}

function setStage(nextStage) {
  stage = nextStage;
  const allowed = allowedTools();
  devices = devices.filter((device) => device.type === "floorplan-wall-toggle" || allowed.includes(device.type));
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
    diffusionSpeed: preset.diffusionSpeed,
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
    reachedAt: null,
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
  renderDeviceSettings(selected);
  rotateButton.disabled = !selected || !["partition", "fan"].includes(selected.type);
  deleteButton.disabled = !selected || (sources.length <= 1 && selected.type === "source") || (targets.length <= 1 && selected.type === "target");
  if (addSourceButton) addSourceButton.disabled = sources.length >= MAX_POINTS;
  if (addTargetButton) addTargetButton.disabled = targets.length >= MAX_POINTS;
  renderSourceList();
  renderTargetList();
  renderFloorplanWallList();
  renderBudget();
  renderSimulationStatus(latestAverage);
}

function renderBudget() {
  if (!budgetTotalEl) return;
  const userPartitions = devices.filter((device) => device.type === "partition").length;
  const removedFloorplanWalls = devices.filter((device) => device.type === "floorplan-wall-toggle" && device.active === false).length;
  const fans = devices.filter((device) => device.type === "fan").length;
  const thermal = devices.filter((device) => device.type === "heater" || device.type === "cooler").length;
  const total = userPartitions * 100 + removedFloorplanWalls * 10 + fans * 10 + thermal * 20;
  budgetTotalEl.textContent = `${total.toLocaleString("ko-KR")}만원`;
  if (mapBudgetTotalEl) mapBudgetTotalEl.textContent = `${total.toLocaleString("ko-KR")}만원`;
  if (budgetBreakdownEl) budgetBreakdownEl.textContent = `가벽 설치 ${userPartitions}개 · 가벽 제거 ${removedFloorplanWalls}개 · 서큘레이터 ${fans}개 · 공조기 ${thermal}개`;
}

function successThresholdValue() {
  return successThresholdPercent / 42;
}

function renderSimulationStatus(average = latestAverage) {
  latestAverage = average;
  const averagePct = pct(average);
  const failed = average < successThresholdValue() && simElapsed > TARGET_TIME_LIMIT;
  const success = average >= successThresholdValue();
  const stateText = success ? "성공" : failed ? "실패" : "진행";
  const stateClass = success ? "is-success" : failed ? "is-fail" : "";
  if (goalScoreEl) goalScoreEl.textContent = averagePct;
  if (mapGoalScoreEl) mapGoalScoreEl.textContent = averagePct;
  if (simTimerEl) simTimerEl.textContent = `${simElapsed.toFixed(1)}초`;
  if (mapTimerEl) mapTimerEl.textContent = `${simElapsed.toFixed(1)}초`;
  if (successThresholdValueEl) successThresholdValueEl.textContent = `${successThresholdPercent}%`;
  if (successThresholdInput) successThresholdInput.value = String(successThresholdPercent);
  if (mapSuccessStateEl) {
    mapSuccessStateEl.textContent = running ? stateText : "멈춤";
    mapSuccessStateEl.className = running ? stateClass : "is-paused";
  }
}

function renderFeedbackPanel(average = latestAverage) {
  if (!feedbackPanelEl || !running) return;
  const threshold = successThresholdValue();
  const success = average >= threshold;
  const failed = !success && simElapsed > TARGET_TIME_LIMIT;
  const nextState = success ? "success" : failed ? "fail" : "pending";
  if (nextState === "pending" || nextState === lastFeedbackState) return;
  lastFeedbackState = nextState;
  feedbackPanelEl.hidden = false;
  feedbackPanelEl.className = `feedback-panel is-${nextState}`;
  if (success) {
    feedbackPanelEl.innerHTML = `
      <strong>단계 성공</strong>
      <span>목표 농도 ${successThresholdPercent}%에 도달했습니다. 다음 단계로 넘어가거나 장치를 추가해 경로를 더 안정화해보세요.</span>
      <button type="button" data-feedback-action="next">다음 단계</button>
    `;
  } else {
    feedbackPanelEl.innerHTML = `
      <strong>도달 실패</strong>
      <span>${TARGET_TIME_LIMIT}초 안에 목표 농도에 도달하지 못했습니다. 향 속도를 올리거나 가벽을 비활성화하고, 서큘레이터 방향을 조정해보세요.</span>
      <button type="button" data-feedback-action="reset">다시 실행</button>
    `;
  }
  feedbackPanelEl.querySelector("button")?.addEventListener("click", (event) => {
    const action = event.currentTarget.dataset.feedbackAction;
    if (action === "next") setStage(Math.min(4, stage + 1));
    resetScentState();
    renderControls();
  });
}

function renderFloorplanWallList() {
  if (!floorplanWallListEl) return;
  floorplanWallListEl.innerHTML = "";
  const walls = devices.filter((device) => device.type === "floorplan-wall-toggle");
  for (const wall of walls) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = wall.active ? "wall-toggle is-active" : "wall-toggle";
    button.innerHTML = `<strong>${wall.name}</strong><span>${wall.active ? "활성 · 향 차단" : "비활성 · 향 통과"}</span>`;
    button.addEventListener("click", () => {
      wall.active = !wall.active;
      sim.refreshMask(devices);
      renderControls();
    });
    floorplanWallListEl.append(button);
  }
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
      <label>확산속도 <input data-field="diffusionSpeed" type="range" min="0.01" max="12" step="0.01" value="${source.diffusionSpeed ?? 6}" /><span>${(source.diffusionSpeed ?? 6).toFixed(2)}</span></label>
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
        if (field === "diffusionSpeed") {
          input.nextElementSibling.textContent = Number(input.value).toFixed(2);
          resetScentState();
          return;
        }
        renderControls();
      });
    });
    card.querySelector(".remove-point").addEventListener("click", () => {
      sources = sources.filter((item) => item.id !== source.id);
      if (selectedId === source.id) selectedId = sources[0]?.id ?? null;
      resetScentState();
      renderControls();
    });
    sourceListEl.append(card);
  });
}

function thermalDefaults(type) {
  return type === "heater"
    ? { temperature: 32, minTemperature: 20, maxTemperature: 45, radius: 125 }
    : { temperature: 8, minTemperature: -15, maxTemperature: 18, radius: 125 };
}

function normalizeThermalDevice(device) {
  if (!device || (device.type !== "heater" && device.type !== "cooler")) return;
  const defaults = thermalDefaults(device.type);
  device.minTemperature = defaults.minTemperature;
  device.maxTemperature = defaults.maxTemperature;
  device.temperature = clamp(device.temperature ?? defaults.temperature, defaults.minTemperature, defaults.maxTemperature);
  device.radius = clamp(device.radius ?? defaults.radius, 40, 240);
}

function renderDeviceSettings(selected) {
  if (!deviceSettingsEl) return;
  deviceSettingsEl.innerHTML = "";
  if (!selected || (selected.type !== "heater" && selected.type !== "cooler")) {
    deviceSettingsEl.hidden = true;
    return;
  }
  normalizeThermalDevice(selected);
  deviceSettingsEl.hidden = false;
  const verb = selected.type === "heater" ? "빠르게" : "느리게";
  const unit = selected.type === "heater" ? "가열" : "냉각";
  deviceSettingsEl.innerHTML = `
    <strong>${labelFor(selected.type)} 설정</strong>
    <label>
      <span>온도</span>
      <input data-device-field="temperature" type="range" min="${selected.minTemperature}" max="${selected.maxTemperature}" step="1" value="${selected.temperature}" />
      <em>${Math.round(selected.temperature)}℃</em>
    </label>
    <label>
      <span>범위</span>
      <input data-device-field="radius" type="range" min="40" max="240" step="5" value="${selected.radius}" />
      <em>${Math.round(selected.radius)}px</em>
    </label>
    <p>${unit} 영역 안에서 향이 더 ${verb} 퍼집니다.</p>
  `;
  deviceSettingsEl.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      const field = input.dataset.deviceField;
      selected[field] = Number(input.value);
      normalizeThermalDevice(selected);
      input.nextElementSibling.textContent = field === "temperature" ? `${Math.round(selected.temperature)}℃` : `${Math.round(selected.radius)}px`;
      sim.refreshMask(devices);
      drawViewer();
    });
  });
}

function renderTargetList() {
  if (!targetListEl) return;
  targetListEl.innerHTML = "";
  targets.forEach((target) => {
    const result = sim.sampleTarget(target, sources);
    const reached = target.reachedAt !== null && target.reachedAt !== undefined;
    const failed = !reached && simElapsed > TARGET_TIME_LIMIT;
    const statusText = reached ? (target.reachedAt <= TARGET_TIME_LIMIT ? `성공 ${target.reachedAt.toFixed(1)}초` : `지연 ${target.reachedAt.toFixed(1)}초`) : failed ? "실패" : "대기";
    const statusClass = reached ? (target.reachedAt <= TARGET_TIME_LIMIT ? "is-success" : "is-late") : failed ? "is-fail" : "";
    const card = document.createElement("article");
    card.className = `point-card ${selectedId === target.id ? "is-selected" : ""}`;
    card.innerHTML = `
      <button class="point-title" type="button">
        <span class="target-dot">T</span>
        <strong>${target.name}</strong>
        <em>${pct(result.total)}</em>
      </button>
      <div class="target-status ${statusClass}">${statusText}</div>
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
      resetScentState();
      return;
    }
    const source = createSourceAt(p);
    if (source) selectedId = source.id;
    resetScentState();
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
  if (activeTool === "heater" || activeTool === "cooler") Object.assign(base, thermalDefaults(activeTool));
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
  if (selected.type === "source") resetScentState();
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
  simCtx.fillStyle = "rgba(47,111,105,0.22)";
  simCtx.beginPath();
  simCtx.moveTo(8, 0);
  simCtx.arc(0, 0, 190, -0.46, 0.46);
  simCtx.closePath();
  simCtx.fill();
  simCtx.strokeStyle = "rgba(34,130,116,0.62)";
  simCtx.lineWidth = 5;
  simCtx.setLineDash([]);
  for (let i = 0; i < 5; i += 1) {
    const y = -54 + i * 27;
    const offset = (t * 58 + i * 19) % 84;
    simCtx.beginPath();
    simCtx.moveTo(24 + offset, y);
    simCtx.bezierCurveTo(78 + offset, y - 15, 126 + offset, y + 15, 188 + offset, y);
    simCtx.stroke();
    simCtx.fillStyle = "rgba(34,130,116,0.58)";
    simCtx.beginPath();
    simCtx.arc(186 + offset, y, 5, 0, Math.PI * 2);
    simCtx.fill();
  }
  simCtx.setLineDash([9, 8]);
  simCtx.strokeStyle = "rgba(80,120,130,0.32)";
  simCtx.lineWidth = 3;
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

function thermalLineClear(device, x, y) {
  const distance = Math.hypot(x - device.x, y - device.y);
  const steps = Math.max(1, Math.ceil(distance / 10));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = device.x + (x - device.x) * t;
    const py = device.y + (y - device.y) * t;
    if (!isWalkable(px, py, devices)) return false;
  }
  return true;
}

let thermalInfluenceCache = null;

function thermalPointInfluence(device, x, y, radius = device.radius ?? 125) {
  const cacheKey = thermalInfluenceCache ? `${Math.round(x)},${Math.round(y)},${Math.round(radius)}` : null;
  if (cacheKey && thermalInfluenceCache.has(cacheKey)) return thermalInfluenceCache.get(cacheKey);
  const distance = Math.hypot(x - device.x, y - device.y);
  let influence = 0;
  if (distance <= radius && isWalkable(x, y, devices) && thermalLineClear(device, x, y)) influence = 1 - distance / radius;
  if (cacheKey) thermalInfluenceCache.set(cacheKey, influence);
  return influence;
}

function thermalPalette(device) {
  return device.type === "heater"
    ? {
        core: "216,95,55",
        edge: "255,164,78",
        line: "190,64,35",
        label: "#b65432",
        halo: "255,197,111",
      }
    : {
        core: "42,153,176",
        edge: "134,226,232",
        line: "31,108,136",
        label: "#2f7f8f",
        halo: "169,236,240",
      };
}

function drawThermalArea(device, radius, strength) {
  const step = 12;
  const palette = thermalPalette(device);
  const left = Math.max(0, device.x - radius);
  const right = Math.min(PLAN_WIDTH, device.x + radius);
  const top = Math.max(0, device.y - radius);
  const bottom = Math.min(PLAN_HEIGHT, device.y + radius);
  simCtx.save();
  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      const influence = thermalPointInfluence(device, x, y, radius);
      if (!influence) continue;
      const alpha = (0.06 + strength * 0.16) * Math.pow(influence, 0.72);
      const size = step * (0.76 + influence * 0.32);
      simCtx.fillStyle = `rgba(${palette.core},${alpha})`;
      simCtx.fillRect(x - size * 0.5, y - size * 0.5, size, size);

      const edgeAhead =
        !thermalPointInfluence(device, x + step, y, radius) ||
        !thermalPointInfluence(device, x - step, y, radius) ||
        !thermalPointInfluence(device, x, y + step, radius) ||
        !thermalPointInfluence(device, x, y - step, radius);
      if (edgeAhead) {
        simCtx.strokeStyle = `rgba(${palette.edge},${0.22 + strength * 0.32})`;
        simCtx.lineWidth = 2;
        simCtx.beginPath();
        simCtx.arc(x, y, step * 0.42, 0, Math.PI * 2);
        simCtx.stroke();
      }
    }
  }

  simCtx.strokeStyle = `rgba(${palette.line},${0.26 + strength * 0.28})`;
  simCtx.lineWidth = 1.5;
  simCtx.setLineDash([5, 7]);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 30) {
    let previous = null;
    for (let dist = 18; dist <= radius; dist += 7) {
      const x = device.x + Math.cos(angle) * dist;
      const y = device.y + Math.sin(angle) * dist;
      if (!thermalPointInfluence(device, x, y, radius)) {
        previous = null;
        continue;
      }
      if (previous) {
        simCtx.beginPath();
        simCtx.moveTo(previous.x, previous.y);
        simCtx.lineTo(x, y);
        simCtx.stroke();
      }
      previous = { x, y };
    }
  }
  simCtx.restore();
}

function drawThermal(device, t) {
  normalizeThermalDevice(device);
  thermalInfluenceCache = new Map();
  const radius = device.radius ?? 125;
  const heatStrength = device.type === "heater" ? (device.temperature - device.minTemperature) / (device.maxTemperature - device.minTemperature) : 0;
  const coolStrength = device.type === "cooler" ? (device.maxTemperature - device.temperature) / (device.maxTemperature - device.minTemperature) : 0;
  const strength = clamp(device.type === "heater" ? heatStrength : coolStrength, 0, 1);
  const palette = thermalPalette(device);
  drawThermalArea(device, radius, strength);
  simCtx.save();
  simCtx.translate(device.x, device.y);
  if (device.type === "heater") {
    simCtx.strokeStyle = `rgba(206,78,42,${0.38 + strength * 0.34})`;
    simCtx.lineWidth = 3 + strength * 3;
    for (let i = 0; i < 7; i += 1) {
      const x = -42 + i * 14;
      const lift = (t * (38 + strength * 70) + i * 11) % 44;
      simCtx.beginPath();
      simCtx.moveTo(x, 42 - lift);
      simCtx.bezierCurveTo(x - 16, 10 - lift, x + 16, -14 - lift, x, -64 - lift);
      simCtx.stroke();
    }
    simCtx.fillStyle = `rgba(255,179,88,${0.28 + strength * 0.42})`;
    for (let i = 0; i < 22; i += 1) {
      const angle = i * 1.7 + t * (0.8 + strength);
      const dist = 34 + ((t * (50 + strength * 80) + i * 17) % Math.max(36, radius - 26));
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      if (!thermalPointInfluence(device, device.x + x, device.y + y, radius)) continue;
      simCtx.beginPath();
      simCtx.arc(x, y, 3.5, 0, Math.PI * 2);
      simCtx.fill();
    }
  } else {
    simCtx.strokeStyle = `rgba(155,228,234,${0.28 + strength * 0.36})`;
    simCtx.lineWidth = 2;
    for (let i = 0; i < 13; i += 1) {
      const angle = (Math.PI * 2 * i) / 13 + t * 0.16;
      let previous = null;
      for (let dist = radius * 0.16; dist < radius * (0.5 + strength * 0.34); dist += 9) {
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        if (!thermalPointInfluence(device, device.x + x, device.y + y, radius)) {
          previous = null;
          continue;
        }
        if (previous) {
          simCtx.beginPath();
          simCtx.moveTo(previous.x, previous.y);
          simCtx.lineTo(x, y);
          simCtx.stroke();
        }
        previous = { x, y };
      }
    }
  }
  simCtx.strokeStyle = `rgba(${palette.halo},${0.45 + strength * 0.28})`;
  simCtx.lineWidth = 4;
  simCtx.setLineDash([10, 8]);
  simCtx.beginPath();
  simCtx.arc(0, 0, 31, 0, Math.PI * 2);
  simCtx.stroke();
  simCtx.restore();
  thermalInfluenceCache = null;
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
      normalizeThermalDevice(device);
      const palette = thermalPalette(device);
      simCtx.fillStyle = selected ? "#e1a35f" : palette.label;
      simCtx.globalAlpha = selected ? 1 : 0.88;
      simCtx.beginPath();
      simCtx.roundRect(-28, -22, 56, 44, 10);
      simCtx.fill();
      simCtx.globalAlpha = 1;
      simCtx.strokeStyle = `rgba(${palette.halo},0.72)`;
      simCtx.lineWidth = selected ? 5 : 3;
      simCtx.stroke();
      simCtx.fillStyle = "#fffaf2";
      simCtx.font = "900 11px Pretendard, sans-serif";
      simCtx.textAlign = "center";
      simCtx.textBaseline = "middle";
      simCtx.fillText(`${Math.round(device.temperature)}C`, 0, 1);
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
      resetScentState();
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
    lastTickAt = 0;
    if (running) {
      lastFeedbackState = "pending";
      if (feedbackPanelEl) feedbackPanelEl.hidden = true;
    }
    toggleRunButton.textContent = running ? "일시 정지" : "시뮬레이션 시작";
  });
  resetScentButton?.addEventListener("click", () => {
    resetScentState();
    renderControls();
  });
  successThresholdInput?.addEventListener("input", (event) => {
    successThresholdPercent = Number(event.currentTarget.value);
    targets.forEach((target) => {
      target.reachedAt = null;
    });
    renderSimulationStatus(latestAverage);
    renderTargetList();
  });
  clearDevicesButton?.addEventListener("click", () => {
    devices = devices.filter((device) => device.type === "floorplan-wall-toggle");
    devices.forEach((device) => {
      if (device.type === "floorplan-wall-toggle") device.active = true;
    });
    selectedId = null;
    resetScentState();
    renderControls();
  });
  addSourceButton?.addEventListener("click", () => {
    const base = snapToWalkable({ x: 180 + sources.length * 24, y: 720 }, devices);
    const source = createSourceAt(base);
    if (source) {
      selectedId = source.id;
      activeTool = "source";
      resetScentState();
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
  if (toggleRunButton) toggleRunButton.textContent = "시뮬레이션 시작";
}

function tick(now = 0) {
  updateViewerMovement(now);
  const t = now / 1000;
  if (running) {
    const dt = lastTickAt ? Math.min(0.08, (now - lastTickAt) / 1000) : 0;
    simElapsed += dt;
    lastTickAt = now;
    const key = JSON.stringify(devices.map((d) => [d.type, Math.round(d.x), Math.round(d.y), Math.round((d.angle ?? 0) * 100)]));
    if (key !== lastMaskKey) {
      sim.refreshMask(devices);
      lastMaskKey = key;
    }
    for (let i = 0; i < 8; i += 1) sim.step({ sources, devices });
  }
  if (simCtx) {
    drawFloorPlan(simCtx, devices);
    drawGrid();
    sim.draw(simCtx, sources, devices);
    drawDevices(t);
    const totals = targets.map((target) => {
      const result = sim.sampleTarget(target, sources);
      if ((target.reachedAt === null || target.reachedAt === undefined) && result.total >= successThresholdValue()) target.reachedAt = simElapsed;
      return result.total;
    });
    const average = totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0;
    renderSimulationStatus(average);
    renderFeedbackPanel(average);
    renderBudget();
    if (Math.floor(now / 500) !== Math.floor((now - 16) / 500)) renderTargetList();
  }
  requestAnimationFrame(tick);
}

initHomePlan();
initViewer();
initSimulator();
showPage(window.location.hash.replace("#", "") || "home");
tick();
