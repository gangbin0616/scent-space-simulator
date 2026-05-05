import { PLAN_HEIGHT, PLAN_WIDTH, isWalkable } from "./floorplan.js";

export const CELL = 6;
export const GRID_W = Math.floor(PLAN_WIDTH / CELL);
export const GRID_H = Math.floor(PLAN_HEIGHT / CELL);
export const GRID_SIZE = GRID_W * GRID_H;

const dirs = [
  { dx: 1, dy: 0, mx: 1, my: 0 },
  { dx: -1, dy: 0, mx: -1, my: 0 },
  { dx: 0, dy: 1, mx: 0, my: 1 },
  { dx: 0, dy: -1, mx: 0, my: -1 },
  { dx: 2, dy: 0, mx: 1, my: 0 },
  { dx: -2, dy: 0, mx: -1, my: 0 },
  { dx: 0, dy: 2, mx: 0, my: 1 },
  { dx: 0, dy: -2, mx: 0, my: -1 },
];

export function gridIndex(x, y) {
  return y * GRID_W + x;
}

export function cellCenter(x, y) {
  return { x: x * CELL + CELL * 0.5, y: y * CELL + CELL * 0.5 };
}

export function toCell(point) {
  return {
    x: Math.max(0, Math.min(GRID_W - 1, Math.floor(point.x / CELL))),
    y: Math.max(0, Math.min(GRID_H - 1, Math.floor(point.y / CELL))),
  };
}

export function buildMask(devices = []) {
  const mask = new Uint8Array(GRID_SIZE);
  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      const p = cellCenter(x, y);
      mask[gridIndex(x, y)] = isWalkable(p.x, p.y, devices) ? 1 : 0;
    }
  }
  return mask;
}

function gridLineClear(mask, from, toX, toY) {
  const dx = toX - from.x;
  const dy = toY - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (!steps) return true;
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(from.x + (dx * i) / steps);
    const y = Math.round(from.y + (dy * i) / steps);
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false;
    if (!mask[gridIndex(x, y)]) return false;
  }
  return true;
}

function thermalModifiers(px, py, gx, gy, devices = [], mask = null) {
  let diffusion = 1;
  for (const device of devices) {
    if (device.type !== "heater" && device.type !== "cooler") continue;
    const distance = Math.hypot(px - device.x, py - device.y);
    const radius = Math.max(40, Math.min(240, device.radius ?? 125));
    if (distance > radius) continue;
    if (mask && !gridLineClear(mask, toCell(device), gx, gy)) continue;
    const influence = 1 - distance / radius;
    if (device.type === "heater") {
      const temperature = Math.max(20, Math.min(45, device.temperature ?? 32));
      const strength = (temperature - 20) / 25;
      diffusion += influence * (0.28 + strength * 1.22);
    } else {
      const temperature = Math.max(-15, Math.min(18, device.temperature ?? 8));
      const strength = (18 - temperature) / 33;
      diffusion -= influence * (0.18 + strength * 0.72);
    }
  }
  return {
    diffusion: Math.max(0.08, diffusion),
    decay: 1,
  };
}

function transfer(field, next, mask, fromX, fromY, toX, toY, amount) {
  if (amount <= 0) return;
  if (toX < 0 || toY < 0 || toX >= GRID_W || toY >= GRID_H) return;
  const from = gridIndex(fromX, fromY);
  const to = gridIndex(toX, toY);
  if (!mask[from] || !mask[to]) return;
  const moved = Math.min(next[from], amount);
  next[from] -= moved;
  next[to] += moved;
}

function applyFans(field, next, mask, devices = []) {
  for (const device of devices) {
    if (device.type !== "fan") continue;
    const angle = device.angle ?? 0;
    const forward = { x: Math.cos(angle), y: Math.sin(angle) };
    const backward = { x: -forward.x, y: -forward.y };
    const fanCell = toCell(device);
    const radius = Math.ceil(174 / CELL);

    for (let gy = fanCell.y - radius; gy <= fanCell.y + radius; gy += 1) {
      if (gy < 1 || gy >= GRID_H - 1) continue;
      for (let gx = fanCell.x - radius; gx <= fanCell.x + radius; gx += 1) {
        if (gx < 1 || gx >= GRID_W - 1) continue;
        const px = gx * CELL + CELL * 0.5 - device.x;
        const py = gy * CELL + CELL * 0.5 - device.y;
        const distance = Math.hypot(px, py);
        if (distance > 174 || distance < 8) continue;
        const nx = px / distance;
        const ny = py / distance;
        const idx = gridIndex(gx, gy);
        if (!mask[idx] || field[idx] <= 0) continue;

        const rearAlignment = nx * backward.x + ny * backward.y;
        if (rearAlignment > 0.45) {
          const towardFanX = gx + Math.sign(fanCell.x - gx);
          const towardFanY = gy + Math.sign(fanCell.y - gy);
          const amount = field[idx] * 0.065 * rearAlignment * (1 - distance / 190);
          transfer(field, next, mask, gx, gy, towardFanX, towardFanY, amount);
        }

        const frontAlignment = nx * forward.x + ny * forward.y;
        if (frontAlignment > 0.35) {
          const tx = gx + Math.round(forward.x);
          const ty = gy + Math.round(forward.y);
          const amount = field[idx] * 0.15 * frontAlignment * (1 - distance / 200);
          transfer(field, next, mask, gx, gy, tx, ty, amount);
        }
      }
    }

    const center = gridIndex(fanCell.x, fanCell.y);
    if (!mask[center]) continue;
    const jetX = fanCell.x + Math.round(forward.x * 2);
    const jetY = fanCell.y + Math.round(forward.y * 2);
    transfer(field, next, mask, fanCell.x, fanCell.y, jetX, jetY, field[center] * 0.28);
  }
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function createSimulation() {
  const fields = new Map();
  const buffers = new Map();
  let mask = new Uint8Array(GRID_SIZE);

  function ensureFields(sources = []) {
    const ids = new Set(sources.map((source) => source.id));
    for (const source of sources) {
      if (!fields.has(source.id)) fields.set(source.id, new Float32Array(GRID_SIZE));
      if (!buffers.has(source.id)) buffers.set(source.id, new Float32Array(GRID_SIZE));
    }
    for (const id of [...fields.keys()]) {
      if (!ids.has(id)) {
        fields.delete(id);
        buffers.delete(id);
      }
    }
  }

  function ensureField(source) {
    if (!fields.has(source.id)) fields.set(source.id, new Float32Array(GRID_SIZE));
    if (!buffers.has(source.id)) buffers.set(source.id, new Float32Array(GRID_SIZE));
  }

  function reset(devices = [], sources = []) {
    ensureFields(sources);
    for (const field of fields.values()) field.fill(0);
    for (const buffer of buffers.values()) buffer.fill(0);
    mask = buildMask(devices);
  }

  function refreshMask(devices = []) {
    mask = buildMask(devices);
    for (const field of fields.values()) {
      for (let i = 0; i < GRID_SIZE; i += 1) {
        if (!mask[i]) field[i] = 0;
      }
    }
  }

  function inject(source) {
    ensureField(source);
    const field = fields.get(source.id);
    const cell = toCell(source);
    const emission = 68;
    for (let y = cell.y - 5; y <= cell.y + 5; y += 1) {
      for (let x = cell.x - 5; x <= cell.x + 5; x += 1) {
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
        const idx = gridIndex(x, y);
        if (!mask[idx]) continue;
        const distance = Math.hypot(x - cell.x, y - cell.y);
        field[idx] = Math.min(220, field[idx] + emission / (1 + distance * 0.42));
      }
    }
  }

  function step({ sources = [], source = null, devices = [] } = {}) {
    const activeSources = sources.length ? sources : source ? [source] : [];
    ensureFields(activeSources);

    for (const scent of activeSources) inject(scent);

    for (const scent of activeSources) {
      const field = fields.get(scent.id);
      const buffer = buffers.get(scent.id);
      buffer.fill(0);
      const speed = Math.max(0.1, scent.diffusionSpeed ?? scent.spread ?? 6);
      const baseSpread = Math.max(0.12, 0.08 + speed / 5.2);
      const baseDecay = 0.00002;

      for (let y = 2; y < GRID_H - 2; y += 1) {
        for (let x = 2; x < GRID_W - 2; x += 1) {
          const idx = gridIndex(x, y);
          if (!mask[idx]) continue;
          const value = field[idx];
          if (value <= 0.000001) continue;
          const p = cellCenter(x, y);
          const temp = thermalModifiers(p.x, p.y, x, y, devices, mask);
          const diffusion = Math.min(0.88, 0.34 * baseSpread * temp.diffusion);
          const decay = Math.min(0.012, baseDecay * temp.decay);
          const retained = value * Math.max(0.1, 1 - diffusion - decay);
          buffer[idx] += retained;

          const share = value * diffusion;
          let exits = 0;
          for (const dir of dirs) {
            if (mask[gridIndex(x + dir.mx, y + dir.my)] && mask[gridIndex(x + dir.dx, y + dir.dy)]) exits += 1;
          }
          if (exits === 0) {
            buffer[idx] += share;
            continue;
          }
          const perNeighbor = share / exits;
          for (const dir of dirs) {
            const mid = gridIndex(x + dir.mx, y + dir.my);
            const to = gridIndex(x + dir.dx, y + dir.dy);
            if (mask[mid] && mask[to]) buffer[to] += perNeighbor;
          }
        }
      }

      applyFans(field, buffer, mask, devices);
    }

    for (const scent of activeSources) {
      const id = scent.id;
      const field = fields.get(id);
      fields.set(id, buffers.get(id));
      buffers.set(id, field);
    }
  }

  function sampleField(field, point, radius = 42) {
    const cell = toCell(point);
    let total = 0;
    let count = 0;
    const r = Math.ceil(radius / CELL);
    for (let y = cell.y - r; y <= cell.y + r; y += 1) {
      for (let x = cell.x - r; x <= cell.x + r; x += 1) {
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
        if (Math.hypot(x - cell.x, y - cell.y) > r) continue;
        const idx = gridIndex(x, y);
        if (!mask[idx]) continue;
        total += field[idx];
        count += 1;
      }
    }
    return count ? total / count : 0;
  }

  function sampleTarget(target, sources = []) {
    ensureFields(sources);
    const bySource = sources.map((source) => {
      const field = fields.get(source.id);
      return {
        sourceId: source.id,
        name: source.name,
        color: source.color,
        value: field ? sampleField(field, target) : 0,
      };
    });
    return {
      total: bySource.reduce((sum, item) => sum + item.value, 0),
      bySource,
    };
  }

  function sample(point, radius = 42) {
    let total = 0;
    for (const field of fields.values()) total += sampleField(field, point, radius);
    return total;
  }

  function draw(ctx, sources = []) {
    ensureFields(sources);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (const source of sources) {
      const field = fields.get(source.id);
      if (!field) continue;
      const rgb = hexToRgb(source.color ?? "#d85f37");
      for (let y = 0; y < GRID_H; y += 1) {
        for (let x = 0; x < GRID_W; x += 1) {
          const idx = gridIndex(x, y);
          const value = field[idx];
          if (value < 0.002 || !mask[idx]) continue;
          const alpha = Math.min(0.74, 0.08 + value * 0.22);
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          ctx.fillRect(x * CELL, y * CELL, CELL + 1, CELL + 1);
        }
      }
    }
    ctx.restore();
  }

  reset([], []);
  return { ensureFields, reset, refreshMask, inject, step, sample, sampleTarget, draw };
}
