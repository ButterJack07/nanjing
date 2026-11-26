import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildRoads } from './road-network.js';
import { ROADS, BOUNDARY } from './xianlin-roads.js';
import { FOOTPRINTS, GREENS, WATERS } from './xianlin-footprints.js';

// Nanjing University Xianlin Campus (南京大学仙林校区), rebuilt from real
// OpenStreetMap data: road centrelines, building footprint polygons, green
// areas, water and the campus outline are projected from lat/lon to game
// metres (x = east, z = south). Scale 1 unit = 1 metre. Simplified geometry,
// not survey data.

export const xianlinBounds = { minX: -800, maxX: 1140, minZ: -1220, maxZ: 1160 };

export const xianlinDistricts = [
  { name: '南京大学 · 仙林校区', x: 200, z: 0, w: 1900, d: 2100 },
  { name: '杜厦图书馆', x: 386, z: 376, w: 180, d: 140 },
  { name: '学生宿舍区', x: 20, z: 300, w: 560, d: 620 },
  { name: '西区 · 理科楼群', x: -200, z: -160, w: 560, d: 560 },
  { name: '北区 · 学生公寓', x: -340, z: -700, w: 460, d: 340 },
  { name: '东区 · 行政文体区', x: 660, z: 470, w: 440, d: 440 },
  { name: '南区 · 基础实验楼', x: 120, z: 790, w: 620, d: 200 },
  { name: '南门外 · 出生点', x: 455, z: 1030, w: 520, d: 320 },
];

export const xianlinBusStops = [
  { name: '南大南门', x: 476, z: 806, vertical: true },
  { name: '杜厦图书馆', x: 582, z: 468, vertical: false },
  { name: '学生宿舍区', x: 241, z: 509, vertical: false },
  { name: '西区教学楼', x: 49, z: 416, vertical: false },
  { name: '行政文体区', x: 778, z: 396, vertical: false },
];
export const xianlinBusDepot = { x: 560, z: 1000 };
export const xianlinSpawn = { x: 455, z: 1000, yaw: Math.PI };

// Enterable buildings drawn as walk-in shells (real centre coords); their OSM
// footprints are skipped so they don't clash.
const ENTERABLE = [
  { name: '杜厦图书馆 · 借阅大厅', x: 386, z: 376, w: 76, d: 54, kind: 'library' },
  { name: '敬文学生活动中心', x: 150, z: 420, w: 60, d: 46, kind: 'activity' },
  { name: '校史馆（沈小平楼）', x: 214, z: 333, w: 42, d: 32, kind: 'museum' },
  { name: '游泳馆', x: 222, z: 148, w: 52, d: 40, kind: 'pool' },
  { name: '方肇周体育馆', x: -421, z: -405, w: 76, d: 54, kind: 'gym' },
  { name: '校园便利店', x: 150, z: 300, w: 30, d: 26, kind: 'store' },
];
const FOOD_TOWERS = [
  { name: '学生第四、五、六餐厅', x: -80, z: 695, w: 46, d: 32 },
  { name: '学生第八、九餐厅', x: -48, z: 90, w: 42, d: 40 },
];
const DORM_TOWERS = [
  { name: '学生宿舍8幢', x: 104, z: 195 }, { name: '学生宿舍11幢', x: 5, z: 67 },
  { name: '学生公寓16幢', x: -441, z: -561 }, { name: '学生公寓18幢', x: -428, z: -744 },
  { name: '学生宿舍25幢', x: 300, z: -826 },
];
const LABELED = /图书馆|活动中心|校史馆|游泳馆|体育馆|餐厅|食堂|天文台|会议中心|美术馆|行政|学院|教学楼|实验楼|宿舍|公寓|档案馆|礼堂|博物馆/;

export function createXianlinWorld(scene) {
  const materials = new Map();
  const solids = [], floors = [], interactables = [], buildings = [], roads = [], nodes = [], water = [], towers = [];
  const material = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra }));
    return materials.get(key);
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, color, x, y, z, parent = scene, extra = {}) {
    const mesh = new THREE.Mesh(cube, material(color, extra));
    mesh.scale.set(w, h, d); mesh.position.set(x, y, z); mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function solid(w, h, d, color, x, y, z, parent = scene) {
    const mesh = box(w, h, d, color, x, y, z, parent);
    solids.push({ x, z, hw: w / 2, hd: d / 2, low: y - h / 2, high: y + h / 2, mesh }); return mesh;
  }
  function label(text, x, y, z, w = 10, parent = scene, rotation = 0) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#233e40'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#e4edc6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 40px sans-serif';
    ctx.fillText(text, 256, 50, 490);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 5.33), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotation; parent.add(mesh); return mesh;
  }
  function board(lines, w, h, x, y, z, rotation = 0) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const draw = list => {
      ctx.fillStyle = '#1b2a2f'; ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = '#dff18e'; ctx.font = '700 52px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(list[0] || '', 46, 46);
      ctx.fillStyle = '#e9efe2'; ctx.font = '500 40px sans-serif';
      for (let i = 1; i < list.length; i++) ctx.fillText(list[i], 46, 40 + i * 68);
      texture.needsUpdate = true;
    };
    draw(lines);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotation; scene.add(mesh);
    return { mesh, set: draw };
  }
  function point(x, z) { const n = { x, z, links: [], id: nodes.length }; nodes.push(n); return n; }
  function road(a, b, width = 14, sidewalk = true, name = '校园道路', kind = 'road') {
    a.links.push(b.id); b.links.push(a.id);
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), angle = Math.atan2(dx, dz), x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    const isLocal = width < 12;
    if (sidewalk) {
      const extra = isLocal ? 1 : width >= 30 ? 12 : 6;
      const walk = box(width + extra, .18, length + width, isLocal ? '#aeac9c' : '#c3c1b0', x, -.05, z); walk.rotation.y = angle;
    }
    const mesh = box(width, .13, length + width, isLocal ? '#5b5f59' : '#48565b', x, .08, z); mesh.rotation.y = angle;
    for (let t = 12; width >= 14 && t < length - 10; t += 18) {
      const line = box(.16, .025, 6, '#eadab0', a.x + dx * t / length, .16, a.z + dz * t / length); line.rotation.y = angle;
    }
    if (width >= 30) for (const side of [-1, 1]) {
      const lane = box(.11, .025, length, '#bcc4bc', x + Math.cos(angle) * width / 4 * side, .16, z - Math.sin(angle) * width / 4 * side); lane.rotation.y = angle;
    }
    roads.push({ a, b, width, angle, length, name, kind });
  }
  function floor(x, z, w, d, y = 0) { box(w, .22, d, '#b9b9a7', x, y - .13, z); floors.push({ x, z, hw: w / 2, hd: d / 2, y }); }
  function door(x, z, name, options = {}) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    box(2.7, 2.9, .2, '#567276', 1.35, 1.45, 0, group);
    const collision = { x: x + 1.35, z, hw: 1.35, hd: .14, low: 0, high: 2.9 }; solids.push(collision);
    const action = { x: x + 1.35, z: z + .8, y: 0, name, type: 'door', group, collision, locked: !!options.locked, opened: false, progress: 0, ...options };
    interactables.push(action); return action;
  }
  function shell(name, x, z, w, d, options = {}) {
    floor(x, z, w, d);
    solid(w, 4, .3, '#d0c9b8', x, 2, z - d / 2);
    solid(.3, 4, d, '#d0c9b8', x - w / 2, 2, z);
    solid(.3, 4, d, '#d0c9b8', x + w / 2, 2, z);
    if (options.backGap !== undefined) {
      const gap = x + options.backGap, leftEdge = x - w / 2, rightEdge = x + w / 2;
      if (gap - 3 > leftEdge) solid(gap - 3 - leftEdge, 4, .3, '#c1b9a8', (leftEdge + gap - 3) / 2, 2, z + d / 2);
      if (rightEdge > gap + 3) solid(rightEdge - gap - 3, 4, .3, '#c1b9a8', (gap + 3 + rightEdge) / 2, 2, z + d / 2);
    } else solid(w, 4, .3, '#c1b9a8', x, 2, z + d / 2);
    label(name, x, 3.5, z + d / 2 + .2, Math.min(w * 1.1, 40));
    return { x, z, w, d, name };
  }
  function tower(opts) {
    const { name, x, z, w, d, levels, h, food = false } = opts;
    const trim = '#b3a58e';
    for (let f = 0; f < levels; f++) {
      const y = f * h;
      if (f === 0) {
        solid(w, 3, .4, trim, x, 1.5, z - d / 2);
        solid(.4, 3, d, trim, x - w / 2, 1.5, z);
        solid(.4, 3, d, trim, x + w / 2, 1.5, z);
        const side = (w - 4) / 2, sx = side / 2 + 2;
        solid(side, 3, .4, trim, x - sx, 1.5, z + d / 2);
        solid(side, 3, .4, trim, x + sx, 1.5, z + d / 2);
        box(4.6, .12, 2.4, '#b9b6a3', x, .07, z + d / 2 + .6);
      } else {
        solid(w, h, .4, trim, x, y + h / 2, z - d / 2);
        solid(.4, h, d, trim, x - w / 2, y + h / 2, z);
        solid(.4, h, d, trim, x + w / 2, y + h / 2, z);
        solid(w, h, .4, trim, x, y + h / 2, z + d / 2);
      }
      floor(x, z, w - .7, d - .7, y);
      if (f > 0) for (const side of [-1, 1]) box(w - 3, 1.1, .16, '#6f8f96', x, y + h * .55, z + side * (d / 2 - .3), scene, { transparent: true, opacity: .55 });
    }
    label(name, x, levels * h + 2.4, z + d / 2 + .3, Math.min(w * .8, 30));
    const lane = z - d / 2 + 3.4, margin = 2.4, run = w - margin * 2;
    for (let f = 0; f < levels - 1; f++) {
      const dir = f % 2 ? 1 : -1, y = f * h;
      const a = new THREE.Vector3(x - dir * run / 2, y, lane), b = new THREE.Vector3(x + dir * run / 2, y + h, lane);
      floors.push({ type: 'stair', start: a, end: b, width: 2.8, base: y, rise: h });
      const steps = Math.round(run / .85);
      for (let i = 0; i < steps; i++) { const t = (i + .5) / steps; box(run / steps + .05, .22, 2.8, '#b2aa97', THREE.MathUtils.lerp(a.x, b.x, t), y + t * h - .11, lane); }
      box(.18, .95, 2.9, '#7c8a80', a.x, y + .47, lane);
      box(.18, .95, 2.9, '#7c8a80', b.x, y + h - .47, lane);
    }
    if (food) {
      const fy = (levels - 1) * h, counterZ = z - d / 2 + 5.2;
      solid(9, 1.1, 2, '#8a6c4f', x, fy + .55, counterZ);
      solid(2.4, 1.5, 1.2, '#a8896a', x - 5.6, fy + .75, counterZ - .6);
      interactables.push({ type: 'food', name: '取餐 · 学生食堂', x, z: counterZ + 2.2, y: fy });
      label(`美食档 · ${levels}F`, x, fy + 2.8, counterZ - 1.1, 12);
    }
    for (let f = 0; f < levels; f++) for (let i = 0; i < 3; i++) {
      box(3.2, .85, 2, '#9a8a72', x - 9 + i * 9, f * h + .43, z + d / 2 - 5);
      box(3, .1, 1.8, '#c8bfa8', x - 9 + i * 9, f * h + .9, z + d / 2 - 5);
    }
    const building = { name, x, z, w, d, levels, h, food, doorX: x + w / 2 - 1.2, doorZ: z + 2 };
    towers.push(building); return building;
  }
  function shapeOf(ring) { const s = new THREE.Shape(); ring.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath(); return s; }

  // Real roads.
  buildRoads(ROADS.map(([pts, width, name, kind]) => [name, width, pts, kind]), point, road);

  // Ground, campus lawn (real outline), Jiuxiang River.
  box(3400, .12, 3600, '#8d9d79', 170, -.18, -30);
  const lawn = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(BOUNDARY)), material('#6f8a5d', { side: THREE.DoubleSide }));
  lawn.rotation.x = Math.PI / 2; lawn.position.y = .02; scene.add(lawn);
  box(70, .12, 2200, '#5b8e92', -560, .03, -60, scene, { roughness: .3, metalness: .2 });
  water.push({ x: -560, z: -60, w: 70, d: 2200 });

  // Green areas and water (real polygons, flat).
  const drawFlat = (ring, color, y) => {
    const g = new THREE.ShapeGeometry(shapeOf(ring)); g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, material(color, { side: THREE.DoubleSide }));
    m.position.y = y; scene.add(m);
  };
  const GREEN = { sport: '#5f8f52', park: '#5a7d4b', green: '#628a4f' };
  for (const [kind, ring] of GREENS) drawFlat(ring, GREEN[kind] || '#628a4f', .04);
  for (const ring of WATERS) drawFlat(ring, '#6ea6a4', .05);

  // Real building footprints, extruded and merged per colour.
  const skipCenters = [];
  for (const e of ENTERABLE) skipCenters.push([e.x, e.z]);
  for (const t of FOOD_TOWERS) skipCenters.push([t.x, t.z]);
  for (const t of DORM_TOWERS) skipCenters.push([t.x, t.z]);
  const nearEnterable = (cx, cz) => skipCenters.some(([x, z]) => Math.abs(cx - x) < 30 && Math.abs(cz - z) < 30);
  const PALETTE = ['#c7b8a5', '#cdb9ab', '#aebdb5', '#b7bdba', '#c1aa99', '#d3c8b0'];
  const colorFor = tag => (/dorm/.test(tag) ? '#cdc3ab' : /apartment/.test(tag) ? '#c8bfa8' : /university|college|school|institute/.test(tag) ? '#c2bfae' : null);
  // Window facades + roof material per building colour.
  const facadeCache = new Map();
  function facadeMat(color) {
    if (facadeCache.has(color)) return facadeCache.get(color);
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(38,58,70,.55)';
    for (let gy = 7; gy < 64; gy += 20) for (let gx = 7; gx < 64; gx += 16) g.fillRect(gx, gy, 9, 12);
    g.fillStyle = 'rgba(210,220,200,.18)'; for (let gy = 7; gy < 64; gy += 20) g.fillRect(0, gy + 12, 64, 2);
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.strokeRect(.5, .5, 63, 63);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 3.6, 1 / 3.6);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .9 }); facadeCache.set(color, m); return m;
  }
  const roofMat = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    g.fillStyle = '#9aa0a0'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = 'rgba(0,0,0,.09)'; for (let i = 0; i < 46; i++) g.fillRect((i * 7) % 32, (i * 13) % 32, 3, 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 6, 1 / 6);
    return new THREE.MeshStandardMaterial({ map: t, roughness: .95 });
  })();
  const groups = new Map();
  let labeled = 0;
  for (const [name, tag, h, ring] of FOOTPRINTS) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of ring) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z; }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    if (nearEnterable(cx, cz)) continue;
    const geo = new THREE.ExtrudeGeometry(shapeOf(ring), { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const color = colorFor(tag) || PALETTE[(Math.abs((cx * 7 + cz * 13) | 0)) % PALETTE.length];
    if (!groups.has(color)) groups.set(color, []);
    groups.get(color).push(geo);
    solids.push({ x: cx, z: cz, hw: (maxX - minX) / 2, hd: (maxZ - minZ) / 2, low: 0, high: h });
    buildings.push({ x: cx, z: cz, w: maxX - minX, d: maxZ - minZ, h });
    if (name && LABELED.test(name) && labeled < 46) { label(name, cx, h + 4, cz, Math.min((maxX - minX) * 1.1, 34)); labeled++; }
  }
  for (const [color, geos] of groups) {
    const merged = mergeGeometries(geos, true);
    geos.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(merged, [roofMat, facadeMat(color)]); mesh.receiveShadow = true; scene.add(mesh);
  }
  // Landmark: Left Dijiang Observatory dome (左涤江天文台).
  const dome = new THREE.Mesh(new THREE.SphereGeometry(11, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), material('#cfd6d4', { metalness: .2 }));
  dome.position.set(443, 22, -489); dome.receiveShadow = true; scene.add(dome);
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(11.4, 11.4, 1.2, 22), material('#b9bdb8'));
  domeBase.position.set(443, 21.4, -489); scene.add(domeBase);

  // Food towers and dorm towers (real coords, walk-in).
  for (const t of FOOD_TOWERS) tower({ ...t, levels: 2, h: 5, food: true });
  for (const t of DORM_TOWERS) tower({ name: t.name, x: t.x, z: t.z, w: 22, d: 20, levels: 6, h: 3 });

  // Enterable shells with interiors.
  for (const e of ENTERABLE) {
    const s = shell(e.name, e.x, e.z, e.w, e.d);
    if (e.kind === 'library') {
      solid(e.w + 6, 1.2, e.d + 6, '#c7bfab', e.x, .5, e.z);
      for (const z of [e.z - 16, e.z, e.z + 16]) for (const x of [-18, -6, 6, 18]) { solid(3, .9, 6, '#8d775c', e.x + x, .75, z); box(2.8, .1, 5.6, '#d8d1b6', e.x + x, 1.23, z); }
      interactables.push({ type: 'info', name: '校史导览 · 后续任务', x: e.x, z: e.z + 24, y: 0, message: '校史导览、校园跑腿与图书馆任务将在这里接入。' });
      interactables.push({ type: 'info', name: '借阅馆藏', x: e.x + 24, z: e.z - 20, y: 0, message: '翻阅馆藏：南京大学史与仙林校区建筑档案。' });
    } else if (e.kind === 'activity') {
      solid(38, 1.2, 10, '#7c5f6b', e.x, .6, e.z + 14);
      solid(28, 3, 1.2, '#6f5560', e.x, 2.9, e.z + 19);
      label('STAGE', e.x, 3.4, e.z + 16, 12);
      interactables.push({ type: 'showcase', name: '社团展台 · 预留', x: e.x - 18, z: e.z - 12, y: 0, message: '社团活动、演出席位与更多互动道具将在这里开放。' });
    } else if (e.kind === 'museum') {
      for (const x of [-14, 0, 14]) { solid(5, 1.1, 1.6, '#8d7964', e.x + x, .55, e.z); box(5, 1.6, .2, '#cbc4ad', e.x + x, 1.8, e.z - 8); }
      interactables.push({ type: 'info', name: '校史陈列 · 后续任务', x: e.x, z: e.z - 11, y: 0, message: '校史展览与寻访任务将在这里接入。' });
    } else if (e.kind === 'pool') {
      box(e.w - 14, .05, e.d - 18, '#4f8ea0', e.x, .08, e.z); box(e.w - 16, .04, e.d - 20, '#66b0c4', e.x, .12, e.z);
    } else if (e.kind === 'gym') {
      box(e.w - 30, .06, e.d - 26, '#b98e5c', e.x, .06, e.z); box(e.w - 34, .05, e.d - 30, '#c9a26b', e.x, .09, e.z);
      interactables.push({ type: 'showcase', name: '器材架 · 预留', x: e.x - 24, z: e.z + 16, y: 0, message: '球类、器械等交互道具后续会在此陈列。' });
    } else if (e.kind === 'store') {
      for (const x of [-10, 0, 10]) for (const z of [-4, 4]) {
        solid(3.4, 1.4, 2, '#9a805f', e.x + x, .7, e.z + z);
        for (let i = 0; i < 4; i++) {
          const mesh = box(.4, .5, .5, ['#d2ac6c', '#98b685', '#ca8b79'][i % 3], e.x + x - 1 + i * .6, 1.7, e.z + z);
          interactables.push({ type: 'goods', name: '拿取商品 · 偷窃', x: e.x + x - 1 + i * .6, z: e.z + z + 1.4, y: 0, mesh, taken: false });
        }
      }
      solid(5.4, .6, 2, '#8f8a78', e.x, 1.7, e.z - 12.6);
      const stockDoor = door(e.x - 1.35, e.z - 13, '仓库门 · 按住 F 撬锁', { locked: true });
      floor(e.x, e.z - 20, 26, 14);
      solid(26, 3.6, .3, '#a9a28e', e.x, 1.8, e.z - 27);
      solid(.3, 3.6, 14, '#a9a28e', e.x - 13, 1.8, e.z - 20); solid(.3, 3.6, 14, '#a9a28e', e.x + 13, 1.8, e.z - 20);
      interactables.push({ type: 'loot', x: e.x, z: e.z - 21, y: 0, name: '取走仓库物资', door: stockDoor, taken: false });
      interactables.push({ type: 'shop', x: e.x + 10, z: e.z + 8, y: 0, name: '购买补给 $30' });
    }
  }

  // Stadium track next to the gym.
  const track = new THREE.Mesh(new THREE.RingGeometry(52, 66, 40), material('#b06a58', { side: THREE.DoubleSide }));
  track.rotation.x = -Math.PI / 2; track.position.set(-421, .13, -300); track.scale.set(1.35, 1, 1); scene.add(track);
  box(120, .05, 100, '#5c7f49', -421, .12, -300);

  // ---- Spawn house outside the south gate ----
  const hx = xianlinSpawn.x, hz = 1050, hw = 17, hd = 12;
  const walls = '#d3cbb6';
  box(60, .1, 44, '#6d6f66', hx, .02, hz + 2);
  floor(hx, hz, hw * 2, hd * 2);
  solid(hw * 2, 4, .35, walls, hx, 2, hz + hd);
  solid(.35, 4, hd * 2, walls, hx - hw, 2, hz);
  solid(.35, 4, hd * 2, walls, hx + hw, 2, hz);
  solid(13, 4, .35, walls, hx - 10.5, 2, hz - hd);
  solid(13, 4, .35, walls, hx + 10.5, 2, hz - hd);
  solid(10, .3, 3, '#b9b6a3', hx, .02, hz - hd - 1.6);
  label('出生点 · 南门外', hx, 3.6, hz - hd - .35, 22, scene, Math.PI);
  const infoBoard = board(['JINLING CITY · 仙林校区', '版本 v0.4.0 · 2026-11-25', 'GitHub 最新推送 · 同步中…', '武器墙 / 补给箱 / 展示台已就绪'], 20, 10, hx, 2.8, hz + hd - .3, Math.PI);
  box(.2, 3.4, 16, '#3a4a48', hx - hw + .35, 1.9, hz);
  for (let i = 0; i < 5; i++) { const zz = hz - 6 + i * 3; box(.16, 1.6, .5, '#2a3535', hx - hw + .55, 1.9, zz); box(.16, .7, .3, '#39494b', hx - hw + .6, 1.9, zz + .9); }
  interactables.push({ type: 'weaponwall', name: '武器墙 · 领取武器', x: hx - hw + 1.6, z: hz, y: 0 });
  label('WEAPON WALL', hx - hw + 1, 3.9, hz, 12, scene, Math.PI / 2);
  for (const sx of [hx - 7, hx + 7]) {
    solid(3, 1, 3, '#8d7964', sx, .5, hz + 3);
    box(3.2, .12, 3.2, '#d9dac2', sx, 1.06, hz + 3);
    box(1.2, 1.2, 1.2, '#9fb7b0', sx, 1.7, hz + 3, scene, { emissive: '#6fae9e', emissiveIntensity: .3 });
    interactables.push({ type: 'showcase', name: '展台 · 交互道具预留', x: sx, z: hz + 4.6, y: 0, message: '这里会陈列可交互道具（钥匙、信件、任务物品等），后续版本接入。' });
  }
  box(3, 1.6, 2, '#7d8a6a', hx + 10, .8, hz + 6);
  interactables.push({ type: 'supply', name: '补给箱 · 弹药 / 开锁器 / 生命', x: hx + 10, z: hz + 7.4, y: 0 });
  box(150, .1, 26, '#6d6f66', hx + 70, .03, hz - 18);
  for (let i = 0; i < 6; i++) box(.24, .03, 22, '#d5d2bc', hx + 12 + i * 22, .1, hz - 18);
  const helipad = { x: hx + 160, z: hz + 40 };
  box(24, .12, 24, '#55605c', helipad.x, .04, helipad.z);
  box(3.6, .12, 3.6, '#dfe7c8', helipad.x - 5.5, .08, helipad.z); box(3.6, .12, 3.6, '#dfe7c8', helipad.x + 5.5, .08, helipad.z);
  box(.9, .12, 12, '#dfe7c8', helipad.x, .08, helipad.z); box(10, .12, .9, '#dfe7c8', helipad.x, .08, helipad.z);
  label('HELIPAD', helipad.x, 3.4, helipad.z + 12.4, 16);
  const airstrip = { x: hx - 190, z: hz + 10 };
  box(170, .1, 20, '#4f5855', airstrip.x, .03, airstrip.z);
  for (let i = -4; i <= 4; i++) box(6, .04, 1.1, '#d9dcc4', airstrip.x + i * 17, .1, airstrip.z);
  label('金陵飞行场', airstrip.x, 2.6, airstrip.z + 13, 16);
  box(90, .15, 70, '#566468', xianlinBusDepot.x, .04, xianlinBusDepot.z);
  for (let i = -2; i <= 2; i++) box(.2, .03, 34, '#c9c5a8', xianlinBusDepot.x + i * 12, .14, xianlinBusDepot.z);
  box(34, 4, 10, '#a2b3ab', xianlinBusDepot.x, 2, xianlinBusDepot.z + 40, scene, true);
  label('仙林公交场', xianlinBusDepot.x, 8, xianlinBusDepot.z + 40, 36);

  const vehicles = [
    { type: 'sport', x: hx + 18, z: hz - 18, color: '#d7e69c', options: { shared: true } },
    { type: 'jeep', x: hx + 40, z: hz - 18, color: '#9fae86', options: { shared: true } },
    { type: 'ev', x: hx + 62, z: hz - 18, color: '#bcd9d0', options: { shared: true } },
    { type: 'police', x: hx + 84, z: hz - 18, color: '#dce1d6', options: { shared: true } },
    { type: 'bus', x: hx + 128, z: hz - 20, color: '#b8d2b1', options: { shared: true } },
    { type: 'heli', x: helipad.x, z: helipad.z, color: '#d7e2b6', options: { flying: true } },
    { type: 'plane', x: airstrip.x, z: airstrip.z, yaw: Math.PI / 2, color: '#dfe3cf', options: { flying: true } },
  ];

  // Trees across the campus.
  let seed = 77; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const nearRoad = (x, z) => roads.some(r => {
    const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z, len = dx * dx + dz * dz;
    const t = len ? THREE.MathUtils.clamp(((x - r.a.x) * dx + (z - r.a.z) * dz) / len, 0, 1) : 0;
    return Math.hypot(x - (r.a.x + t * dx), z - (r.a.z + t * dz)) < r.width / 2 + 7;
  });
  const treeCount = 300, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.5, .8, 7, 6), material('#897459'), treeCount), crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), material('#4f795c'), treeCount);
  const matrix = new THREE.Matrix4(); let placed = 0;
  while (placed < treeCount) {
    const x = -560 + rand() * 1520, z = -1090 + rand() * 2120;
    if (nearRoad(x, z) || solids.some(s => Math.abs(x - s.x) < s.hw + 4 && Math.abs(z - s.z) < s.hd + 4)) continue;
    matrix.compose(new THREE.Vector3(x, 3.5, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); trunks.setMatrixAt(placed, matrix);
    matrix.setPosition(x, 8, z); crowns.setMatrixAt(placed, matrix); placed++;
  }
  trunks.count = crowns.count = placed; trunks.instanceMatrix.needsUpdate = true; crowns.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere(); crowns.computeBoundingSphere(); scene.add(trunks, crowns);

  const places = [
    { name: '杜厦图书馆', x: 386, z: 405, interior: true },
    { name: '学生第四、五、六餐厅 · 美食档 2F', x: -80, z: 725, interior: true },
    { name: '敬文学生活动中心', x: 150, z: 447, interior: true },
    { name: '校史馆（沈小平楼）', x: 214, z: 350, interior: true },
    { name: '游泳馆', x: 222, z: 170, interior: true },
    { name: '方肇周体育馆', x: -421, z: -378, interior: true },
    { name: '校园便利店', x: 150, z: 315, interior: true },
    { name: '出生房 · 南门外', x: hx, z: hz - hd - 4, interior: true },
    ...towers.map(t => t.food
      ? { name: `${t.name} · 美食档 ${t.levels}F`, x: t.x, z: t.z - t.d / 2 + 7.4, interior: true }
      : { name: t.name, x: t.x, z: t.z + t.d / 2 + 3, interior: true }),
    ...xianlinDistricts.map(d => ({ name: d.name, x: d.x, z: d.z })),
  ];

  return {
    box, solid, label, material, solids, floors, interactables, buildings, roads, nodes,
    stations: [], metroLines: [], water, districts: xianlinDistricts, bounds: xianlinBounds,
    places, towers, helipad, airstrip, spawn: xianlinSpawn, infoBoard,
    lift: { x: 1e9, z: 1e9, y: 0, target: 0, moving: false, mesh: { position: { y: 0 } } },
    busStops: xianlinBusStops.map(s => ({ ...s })), busDepot: xianlinBusDepot, busLabel: '校车',
    vehicles, parkedCount: 16, trafficCount: 8, pedCount: 30,
  };
}
