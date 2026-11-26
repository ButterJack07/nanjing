import * as THREE from 'three';
import { buildRoads } from './road-network.js';
import { ROADS, BOUNDARY } from './xianlin-roads.js';

// Nanjing University Xianlin Campus (南京大学仙林校区), rebuilt from real
// OpenStreetMap data: road centrelines, building positions and the campus
// outline are projected from lat/lon to game metres (x = east, z = south).
// Scale is 1 unit = 1 metre; buildings are simplified boxes. Not survey data.

export const xianlinBounds = { minX: -800, maxX: 1120, minZ: -1220, maxZ: 1160 };

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

// [name, x, z, w, d, h, type] — real OSM building centres (metres).
const BUILDINGS = [
['杜厦图书馆',386,376,72,52,26,'lib'],
['学生宿舍1幢',-121,573,20,44,20,'dorm'],
['学生宿舍2幢',-65,391,20,44,20,'dorm'],
['学生宿舍3幢',-177,438,20,44,20,'dorm'],
['学生宿舍4幢',-121,264,20,44,20,'dorm'],
['学生宿舍5幢',-232,308,20,44,20,'dorm'],
['学生宿舍6幢',151,254,20,44,20,'dorm'],
['学生宿舍7幢',47,314,20,44,20,'dorm'],
['学生宿舍8幢',104,195,20,44,20,'dorm'],
['学生宿舍9幢',1,207,20,44,20,'dorm'],
['学生宿舍10幢',54,149,20,44,20,'dorm'],
['学生宿舍11幢',5,67,20,44,20,'dorm'],
['学生第八、九餐厅',-48,90,44,52,9,'food'],
['学生第四、五、六餐厅',-80,695,64,52,9,'food'],
['学生第十食堂',675,282,44,44,9,'food'],
['学生第十一餐厅',-362,-579,32,30,8,'food'],
['敬文学生活动中心',150,420,62,50,16,'activity'],
['校史馆（沈小平楼）',214,333,40,30,14,'museum'],
['南京大学档案馆',331,269,40,34,18,'hall'],
['游泳馆',222,148,50,40,14,'gym'],
['体育馆（第二体育场）',-421,-405,72,52,18,'gym'],
['公共教学楼一区',350,602,66,42,18,'hall'],
['公共教学楼二区',289,583,66,42,18,'hall'],
['基础实验楼',100,805,72,26,20,'dept'],
['国际学院',314,779,40,34,18,'dept'],
['逸夫楼',365,763,44,36,18,'dept'],
['左涤江楼',336,758,40,30,16,'dept'],
['匡亚明学院',406,96,40,34,18,'dept'],
['社会学院',383,-77,64,42,18,'dept'],
['历史学院',313,-156,36,30,16,'dept'],
['大气科学学院',-70,-34,64,48,20,'dept'],
['环境学院',-252,41,50,40,18,'dept'],
['化学化工学院',-310,-120,150,120,22,'dept'],
['生命科学学院',-90,-197,70,50,18,'dept'],
['信息管理学院',428,57,36,30,16,'dept'],
['信息化建设管理服务中心',414,254,36,30,16,'hall'],
['侨裕楼（外国语学院）',473,131,44,36,18,'dept'],
['扬州楼（行政北楼）',654,523,80,50,22,'hall'],
['行政南楼',669,607,70,44,20,'hall'],
['南大国际会议中心',663,354,70,44,20,'hall'],
['南京大学美术馆',643,395,40,30,14,'museum'],
['左涤江天文台',443,-489,26,26,22,'land'],
['天文与空间科学学院',373,-870,54,44,20,'dept'],
['协同创新大厦',731,-894,52,44,26,'hall'],
['学生宿舍15幢',691,217,20,40,18,'dorm'],
['学生公寓16幢',-441,-561,20,40,18,'dorm'],
['学生公寓17幢',-432,-654,20,40,18,'dorm'],
['学生公寓18幢',-428,-744,20,40,18,'dorm'],
['学生公寓19幢',-354,-751,20,40,18,'dorm'],
['学生公寓20幢',-280,-761,20,40,18,'dorm'],
['学生公寓21幢',-206,-767,20,40,18,'dorm'],
['学生宿舍25幢',300,-826,20,40,18,'dorm'],
['量子材料微结构研究中心',300,-893,40,34,20,'dept'],
['淳朴亭',-12,-116,10,10,8,'land'],
['花房',-208,100,30,20,7,'dc'],
['气象观测站',179,-95,16,16,6,'land'],
['垃圾场',633,150,20,20,5,'dc'],
];

const DORM_TOWERS = new Set(['学生宿舍8幢', '学生宿舍11幢', '学生公寓16幢', '学生公寓18幢', '学生宿舍25幢']);
const FOOD_TOWERS = new Set(['学生第四、五、六餐厅', '学生第八、九餐厅']);
const ENTERABLE = new Set(['杜厦图书馆', '敬文学生活动中心', '校史馆（沈小平楼）', '游泳馆', '体育馆（第二体育场）']);
const FILLER = { dept: '#b7bdba', hall: '#c2bfae', land: '#b0a488', dc: '#9f9a86' };

export function createXianlinWorld(scene) {
  const materials = new Map();
  const solids = [], floors = [], interactables = [], buildings = [], roads = [], nodes = [], water = [], towers = [];
  const material = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra }));
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
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#233e40'; ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = '#e4edc6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 48px sans-serif';
    ctx.fillText(text, 384, 67, 736);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 6), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
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
    label(name, x, 3.5, z + d / 2 + .2, Math.min(w * .9, 40));
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

  // Roads straight from OSM centrelines.
  buildRoads(ROADS.map(([pts, width, name, kind]) => [name, width, pts, kind]), point, road);

  // Ground plate, campus lawn (real outline) and the Jiuxiang River on the west.
  box(3200, .12, 3400, '#8d9d79', 150, -.18, -20);
  const lawn = new THREE.Mesh(new THREE.ShapeGeometry((() => {
    const shape = new THREE.Shape(); shape.moveTo(BOUNDARY[0][0], BOUNDARY[0][1]);
    for (let i = 1; i < BOUNDARY.length; i++) shape.lineTo(BOUNDARY[i][0], BOUNDARY[i][1]);
    shape.closePath(); return shape;
  })()), material('#6f8a5d', { side: THREE.DoubleSide }));
  lawn.rotation.x = Math.PI / 2; lawn.position.y = .02; scene.add(lawn);
  const river = box(70, .12, 2200, '#5b8e92', -560, .03, -60, scene, { roughness: .3, metalness: .2 });
  water.push({ x: -560, z: -60, w: 70, d: 2200 });

  // Buildings: enterable shells, food/dorm towers, and plain solids for the rest.
  for (const [name, x, z, w, d, h, type] of BUILDINGS) {
    if (DORM_TOWERS.has(name)) { tower({ name, x, z, w: 22, d: 20, levels: 6, h: 3 }); continue; }
    if (type === 'food' && FOOD_TOWERS.has(name)) continue; // built as food towers below
    if (ENTERABLE.has(name)) continue; // built as shells below
    if (type === 'food') { tower({ name, x, z, w, d, levels: 2, h: 5, food: true }); continue; }
    const color = FILLER[type] || '#b7bdba';
    solid(w, h, d, color, x, h / 2, z);
    box(w + 1, .7, d + 1, '#d8d1bb', x, h, z);
    label(name, x, h + 3, z + d / 2 + .3, Math.min(w, 26));
  }

  // Food towers (real canteens).
  tower({ name: '学生第四、五、六餐厅', x: -80, z: 695, w: 44, d: 30, levels: 2, h: 5, food: true });
  tower({ name: '学生第八、九餐厅', x: -48, z: 90, w: 40, d: 34, levels: 2, h: 5, food: true });

  // Enterable shells at their real positions.
  const library = shell('杜厦图书馆 · 借阅大厅', 386, 376, 72, 50);
  solid(80, 1.2, 58, '#c7bfab', 386, .5, 376);
  for (let i = 0; i < 5; i++) box(20 - i * 2, .18, 5, '#d8d3c0', 386, .72 + i * .22, 404 - i * 3.2);
  for (const z of [356, 376, 396]) for (const x of [360, 372, 384, 396, 408]) { solid(3, .9, 6, '#8d775c', x, .75, z); box(2.8, .1, 5.6, '#d8d1b6', x, 1.23, z); }
  interactables.push({ type: 'info', name: '校史导览 · 后续任务', x: 386, z: 400, y: 0, message: '校史导览、校园跑腿与图书馆任务将在这里接入。' });
  interactables.push({ type: 'info', name: '借阅馆藏', x: 410, z: 356, y: 0, message: '翻阅馆藏：南京大学史与仙林校区建筑档案。' });

  const activity = shell('敬文学生活动中心', 150, 420, 62, 50);
  solid(40, 1.2, 10, '#7c5f6b', 150, .6, 434);
  solid(30, 3, 1.2, '#6f5560', 150, 2.9, 439);
  label('STAGE', 150, 3.4, 436, 12);
  interactables.push({ type: 'showcase', name: '社团展台 · 预留', x: 132, z: 408, y: 0, message: '社团活动、演出席位与更多互动道具将在这里开放。' });

  const museum = shell('校史馆 · 展览馆', 214, 333, 40, 30);
  for (const x of [200, 214, 228]) { solid(5, 1.1, 1.6, '#8d7964', x, .55, 333); box(5, 1.6, .2, '#cbc4ad', x, 1.8, 325); }
  interactables.push({ type: 'info', name: '校史陈列 · 后续任务', x: 214, z: 322, y: 0, message: '校史展览与寻访任务将在这里接入。' });

  const pool = shell('游泳馆', 222, 148, 50, 40);
  box(36, .05, 22, '#4f8ea0', 222, .08, 148);
  box(34, .04, 20, '#66b0c4', 222, .12, 148);

  const gym = shell('方肇周体育馆 · 第二体育场', -421, -405, 72, 52);
  box(40, .06, 26, '#b98e5c', -421, .06, -405); box(36, .05, 22, '#c9a26b', -421, .09, -405);
  interactables.push({ type: 'showcase', name: '器材架 · 预留', x: -445, z: -390, y: 0, message: '球类、器械等交互道具后续会在此陈列。' });
  const track = new THREE.Mesh(new THREE.RingGeometry(52, 66, 40), material('#b06a58', { side: THREE.DoubleSide }));
  track.rotation.x = -Math.PI / 2; track.position.set(-421, .13, -300); track.scale.set(1.35, 1, 1); scene.add(track);
  box(120, .05, 100, '#5c7f49', -421, .12, -300);

  // Campus convenience store near the dorm cluster.
  const store = shell('校园便利店', 150, 300, 30, 26, { backGap: 0 });
  for (const x of [140, 150, 160]) for (const z of [296, 304]) {
    solid(3.4, 1.4, 2, '#9a805f', x, .7, z);
    for (let i = 0; i < 4; i++) {
      const mesh = box(.4, .5, .5, ['#d2ac6c', '#98b685', '#ca8b79'][i % 3], x - 1 + i * .6, 1.7, z);
      interactables.push({ type: 'goods', name: '拿取商品 · 偷窃', x: x - 1 + i * .6, z: z + 1.4, y: 0, mesh, taken: false });
    }
  }
  solid(5.4, .6, 2, '#8f8a78', 150, 1.7, 287.4);
  const stockDoor = door(148.65, 287, '仓库门 · 按住 F 撬锁', { locked: true });
  floor(150, 279, 26, 14);
  solid(26, 3.6, .3, '#a9a28e', 150, 1.8, 272);
  solid(.3, 3.6, 14, '#a9a28e', 137, 1.8, 279); solid(.3, 3.6, 14, '#a9a28e', 163, 1.8, 279);
  interactables.push({ type: 'loot', x: 150, z: 278, y: 0, name: '取走仓库物资', door: stockDoor, taken: false });
  box(6, 1.1, 2, '#4e6560', 160, .55, 310);
  interactables.push({ type: 'shop', x: 160, z: 308, y: 0, name: '购买补给 $30' });

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
  // Parking lot + pads beside the house.
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
  // Bus depot.
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

  // Trees across the lawn.
  let seed = 77; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const nearRoad = (x, z) => roads.some(r => {
    const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z, len = dx * dx + dz * dz;
    const t = len ? THREE.MathUtils.clamp(((x - r.a.x) * dx + (z - r.a.z) * dz) / len, 0, 1) : 0;
    return Math.hypot(x - (r.a.x + t * dx), z - (r.a.z + t * dz)) < r.width / 2 + 8;
  });
  const treeCount = 340, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.5, .8, 7, 6), material('#897459'), treeCount), crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), material('#4f795c'), treeCount);
  const matrix = new THREE.Matrix4(); let placed = 0;
  while (placed < treeCount) {
    const x = -560 + rand() * 1500, z = -1080 + rand() * 2100;
    if (nearRoad(x, z) || solids.some(s => Math.abs(x - s.x) < s.hw + 4 && Math.abs(z - s.z) < s.hd + 4)) continue;
    matrix.compose(new THREE.Vector3(x, 3.5, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); trunks.setMatrixAt(placed, matrix);
    matrix.setPosition(x, 8, z); crowns.setMatrixAt(placed, matrix); placed++;
  }
  trunks.count = crowns.count = placed; trunks.instanceMatrix.needsUpdate = true; crowns.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere(); crowns.computeBoundingSphere(); scene.add(trunks, crowns);

  const places = [
    { name: library.name, x: 386, z: 405, interior: true },
    { name: '学生第四、五、六餐厅 · 美食档 2F', x: -80, z: 725, interior: true },
    { name: activity.name, x: 150, z: 447, interior: true },
    { name: museum.name, x: 214, z: 350, interior: true },
    { name: pool.name, x: 222, z: 170, interior: true },
    { name: gym.name, x: -421, z: -378, interior: true },
    { name: store.name, x: 150, z: 315, interior: true },
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
    vehicles, parkedCount: 14, trafficCount: 8, pedCount: 30,
  };
}
