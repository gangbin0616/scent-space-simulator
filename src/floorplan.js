export const PLAN_WIDTH = 744;
export const PLAN_HEIGHT = 960;

export const outerPolygon = [
  { x: 210, y: 7 },
  { x: 480, y: 7 },
  { x: 480, y: 725 },
  { x: 680, y: 725 },
  { x: 680, y: 949 },
  { x: 50, y: 949 },
  { x: 50, y: 307 },
  { x: 210, y: 307 },
];

export const wallSegmentDefs = [
  { id: "outer-northwest-vertical", line: [210, 307, 210, 7] },
  { id: "outer-top", line: [210, 7, 480, 7] },
  { id: "outer-right-long-vertical", line: [480, 7, 480, 826] },
  { id: "toggle-upper-l-vertical", line: [318, 188, 318, 36], toggleable: true, label: "상단 ㄱ자 세로 가벽" },
  { id: "toggle-upper-l-horizontal", line: [318, 36, 470, 36], toggleable: true, label: "상단 ㄱ자 가로 가벽" },
  { id: "toggle-upper-short-horizontal", line: [319, 191, 395, 191], toggleable: true, label: "상단 내부 가로 가벽" },
  { id: "outer-left", line: [50, 949, 50, 307] },
  { id: "outer-left-top", line: [50, 307, 356, 307] },
  { id: "outer-bottom", line: [50, 949, 680, 949] },
  { id: "outer-right-lower", line: [680, 949, 680, 725] },
  { id: "outer-lower-room-top", line: [480, 725, 680, 725] },
  { id: "toggle-main-l-horizontal", line: [276, 413, 364, 413], toggleable: true, label: "메인 ㄱ자 가로 가벽" },
  { id: "toggle-main-long-vertical", line: [360, 413, 360, 902], toggleable: true, label: "메인 긴 세로 가벽" },
  { id: "toggle-right-gap-upper", line: [480, 186, 480, 222], toggleable: true, label: "우측 세로벽 상단 조각" },
  { id: "toggle-right-gap-lower", line: [480, 286, 480, 318], toggleable: true, label: "우측 세로벽 하단 조각" },
];

export const wallSegments = wallSegmentDefs.map((item) => item.line);

export const curvedWalls = [
  { id: "toggle-main-curved-wall", cx: 263, cy: 716, r: 191, start: 2.99, end: 4.63, thickness: 17, role: "main-curved-wall", toggleable: true, label: "좌측 곡선 가벽" },
  { id: "toggle-short-lower-arc", cx: 252, cy: 716, r: 158, start: 3.18, end: 3.38, thickness: 8, role: "short-lower-arc", toggleable: true, label: "하단 곡선 조각" },
  { id: "toggle-short-middle-arc", cx: 252, cy: 716, r: 158, start: 3.62, end: 3.82, thickness: 9, role: "short-middle-arc", toggleable: true, label: "중단 곡선 조각" },
  { id: "toggle-short-upper-arc", cx: 252, cy: 716, r: 158, start: 4.08, end: 4.28, thickness: 9, role: "short-upper-arc", toggleable: true, label: "상단 곡선 조각" },
  { id: "toggle-top-cap-arc", cx: 263, cy: 716, r: 191, start: 4.55, end: 4.65, thickness: 18, role: "top-cap", toggleable: true, label: "곡선 상단 캡" },
];

export const toggleableFloorplanWalls = [
  ...wallSegmentDefs.filter((item) => item.toggleable).map((item) => ({ id: item.id, label: item.label, kind: "segment" })),
  ...curvedWalls.filter((item) => item.toggleable).map((item) => ({ id: item.id, label: item.label, kind: "arc" })),
];

export const wallBlocks = [
  { x: 58, y: 916, w: 24, h: 33, role: "bottom-left-thick-block" },
  { x: 472, y: 914, w: 58, h: 35, role: "lower-room-left-threshold-block" },
  { x: 620, y: 914, w: 60, h: 35, role: "lower-room-right-threshold-block" },
];

export const wallThickness = 8.8;

export function disabledFloorplanWallIds(devices = []) {
  const disabled = new Set();
  for (const device of devices) {
    if (device.type === "floorplan-wall-toggle" && device.active === false) disabled.add(device.wallId);
  }
  return disabled;
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const lenSq = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
  const x = x1 + t * vx;
  const y = y1 + t * vy;
  return Math.hypot(px - x, py - y);
}

function angleBetween(angle, start, end) {
  const full = Math.PI * 2;
  let a = ((angle % full) + full) % full;
  let s = ((start % full) + full) % full;
  let e = ((end % full) + full) % full;
  if (s > e) e += full;
  if (a < s) a += full;
  return a >= s && a <= e;
}

export function distanceToArc(px, py, arc) {
  const angle = Math.atan2(py - arc.cy, px - arc.cx);
  const radial = Math.abs(Math.hypot(px - arc.cx, py - arc.cy) - arc.r);
  if (angleBetween(angle, arc.start, arc.end)) return radial;
  const sx = arc.cx + Math.cos(arc.start) * arc.r;
  const sy = arc.cy + Math.sin(arc.start) * arc.r;
  const ex = arc.cx + Math.cos(arc.end) * arc.r;
  const ey = arc.cy + Math.sin(arc.end) * arc.r;
  return Math.min(Math.hypot(px - sx, py - sy), Math.hypot(px - ex, py - ey));
}

export function isFixedWall(x, y, devices = []) {
  const disabled = disabledFloorplanWallIds(devices);
  if (!pointInPolygon({ x, y }, outerPolygon)) return true;
  for (const item of wallSegmentDefs) {
    if (disabled.has(item.id)) continue;
    const [x1, y1, x2, y2] = item.line;
    if (distanceToSegment(x, y, x1, y1, x2, y2) <= wallThickness) return true;
  }
  for (const arc of curvedWalls) {
    if (disabled.has(arc.id)) continue;
    if (distanceToArc(x, y, arc) <= arc.thickness) return true;
  }
  for (const block of wallBlocks) {
    if (x >= block.x && x <= block.x + block.w && y >= block.y && y <= block.y + block.h) return true;
  }
  return false;
}

export function partitionEndpoints(device) {
  const length = device.length ?? 122;
  const angle = device.angle ?? 0;
  const dx = Math.cos(angle) * length * 0.5;
  const dy = Math.sin(angle) * length * 0.5;
  return [device.x - dx, device.y - dy, device.x + dx, device.y + dy];
}

export function isDynamicWall(x, y, devices) {
  for (const device of devices) {
    if (device.type !== "partition") continue;
    const [x1, y1, x2, y2] = partitionEndpoints(device);
    if (distanceToSegment(x, y, x1, y1, x2, y2) <= (device.thickness ?? 9)) return true;
  }
  return false;
}

export function isWall(x, y, devices = []) {
  return isFixedWall(x, y, devices) || isDynamicWall(x, y, devices);
}

export function isWalkable(x, y, devices = []) {
  return !isWall(x, y, devices);
}

export function arcToSegments(arc, count = 18) {
  const segments = [];
  let previous = null;
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const angle = arc.start + (arc.end - arc.start) * t;
    const point = {
      x: arc.cx + Math.cos(angle) * arc.r,
      y: arc.cy + Math.sin(angle) * arc.r,
    };
    if (previous) segments.push([previous.x, previous.y, point.x, point.y]);
    previous = point;
  }
  return segments;
}

export function getWallLines(devices = []) {
  const disabled = disabledFloorplanWallIds(devices);
  const lines = wallSegmentDefs.filter((item) => !disabled.has(item.id)).map((item) => item.line);
  for (const arc of curvedWalls) {
    if (disabled.has(arc.id)) continue;
    lines.push(...arcToSegments(arc, arc.role === "main-curved-wall" ? 30 : 5));
  }
  for (const block of wallBlocks) {
    const x1 = block.x;
    const y1 = block.y;
    const x2 = block.x + block.w;
    const y2 = block.y + block.h;
    lines.push([x1, y1, x2, y1], [x2, y1, x2, y2], [x2, y2, x1, y2], [x1, y2, x1, y1]);
  }
  for (const device of devices) {
    if (device.type === "partition") lines.push(partitionEndpoints(device));
  }
  return lines;
}

export function snapToWalkable(point, devices = []) {
  if (isWalkable(point.x, point.y, devices)) return point;
  for (let radius = 8; radius < 180; radius += 8) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const candidate = {
        x: point.x + Math.cos(angle) * radius,
        y: point.y + Math.sin(angle) * radius,
      };
      if (isWalkable(candidate.x, candidate.y, devices)) return candidate;
    }
  }
  return { x: 120, y: 880 };
}

export function drawFloorPlan(ctx, devices = []) {
  const disabled = disabledFloorplanWallIds(devices);
  ctx.save();
  ctx.fillStyle = "#fbfaf7";
  ctx.fillRect(0, 0, PLAN_WIDTH, PLAN_HEIGHT);

  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  for (const item of wallSegmentDefs) {
    const [x1, y1, x2, y2] = item.line;
    const inactive = disabled.has(item.id);
    ctx.strokeStyle = inactive ? "rgba(70,70,70,0.28)" : "rgba(0,0,0,0.95)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.lineCap = "round";
  for (const arc of curvedWalls) {
    const inactive = disabled.has(arc.id);
    ctx.strokeStyle = inactive ? "rgba(70,70,70,0.28)" : "rgba(0,0,0,0.95)";
    ctx.lineWidth = arc.thickness;
    ctx.beginPath();
    ctx.arc(arc.cx, arc.cy, arc.r, arc.start, arc.end);
    ctx.stroke();
  }

  ctx.fillStyle = "#050505";
  for (const block of wallBlocks) ctx.fillRect(block.x, block.y, block.w, block.h);
  ctx.restore();
}
