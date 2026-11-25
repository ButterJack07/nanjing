import * as THREE from 'three';
import { buildRoads } from './road-network.js';

// Nanjing University Xianlin Campus (南京大学仙林校区). A stylised game map
// that keeps the real relative layout — South Gate on Xianlin Avenue, the
// central axis running north to Du Xia Library, teaching blocks west, dorms
// and stadium east — but the scale and footprints are game metres, not survey
// data. No metro line here; campus shuttle buses instead.

export const xianlinBounds = { minX: -1400, maxX: 1400, minZ: -1500, maxZ: 1500 };

export const xianlinDistricts = [
  { name: '南京大学 · 仙林校区', x: 0, z: -80, w: 1500, d: 1750 },
  { name: '杜厦图书馆', x: 0, z: -220, w: 150, d: 110 },
  { name: '学生生活区', x: 280, z: -620, w: 380, d: 340 },
  { name: '体育区', x: 250, z: 480, w: 380, d: 360 },
  { name: '教学区', x: -280, z: -40, w: 360, d: 760 },
  { name: '南门外 · 出生点', x: 0, z: 1060, w: 620, d: 320 },
  { name: '仙林大道', x: 0, z: 900, w: 1800, d: 60 },
];

export const xianlinBusStops = [
  { name: '南大南门', x: 0, z: 780, vertical: true },
  { name: '杜厦图书馆', x: 0, z: -40, vertical: false },
  { name: '学生宿舍', x: 440, z: -430, vertical: true },
  { name: '方肇周体育馆', x: 440, z: 130, vertical: true },
  { name: '大学生活动中心', x: -440, z: -40, vertical: true },
  { name: '西门便利店', x: -440, z: 380, vertical: true },
];
export const xianlinBusDepot = { x: 260, z: 1150 };
export const xianlinSpawn = { x: 0, z: 1049, yaw: Math.PI };

export const xianlinCorridors = [
  ['仙林大道', 40, [[-900, 900], [0, 900], [900, 900]], 'main'],
  ['南大路', 26, [[0, 900], [0, 780], [0, -40]], 'main'],
  ['学府路', 22, [[-440, 860], [-440, 380], [-440, -40], [-440, -430], [-440, -800]], 'second'],
  ['学则路', 22, [[440, 860], [440, 380], [440, -40], [440, -430], [440, -800]], 'second'],
  ['涌泉路', 18, [[-440, 380], [0, 380], [440, 380]], 'second'],
  ['明湖路', 18, [[-440, -40], [0, -40], [440, -40]], 'second'],
  ['逸夫路', 18, [[-440, -430], [0, -430], [440, -430]], 'second'],
  ['北环路', 20, [[-440, -800], [0, -800], [440, -800]], 'second'],
  ['南门支路', 16, [[0, 900], [0, 1060], [0, 1180]], 'local'],
  ['体育场路', 14, [[440, 380], [700, 420], [820, 470]], 'local'],
];

export function createXianlinWorld(scene) {
  const materials = new Map();
  const solids = [], floors = [], interactables = [], buildings = [], roads = [], nodes = [], water = [];
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
  function road(a, b, width = 22, sidewalk = true, name = '校园道路', kind = 'second') {
    a.links.push(b.id); b.links.push(a.id);
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), angle = Math.atan2(dx, dz), x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    const isLocal = width < 12;
    if (sidewalk) {
      const extra = isLocal ? 1 : width >= 30 ? 12 : 8;
      const walk = box(width + extra, .18, length + width, isLocal ? '#aeac9c' : '#c3c1b0', x, -.05, z); walk.rotation.y = angle;
    }
    const mesh = box(width, .13, length + width, isLocal ? '#5b5f59' : '#48565b', x, .08, z); mesh.rotation.y = angle;
    for (let t = 12; width >= 12 && t < length - 10; t += 16) {
      const line = box(.19, .025, 6, '#eadab0', a.x + dx * t / length, .16, a.z + dz * t / length); line.rotation.y = angle;
    }
    for (const side of [-1, 1]) {
      const edge = box(.15, .025, length, '#d7d6c3', x + Math.cos(angle) * (width / 2 - 1) * side, .16, z - Math.sin(angle) * (width / 2 - 1) * side); edge.rotation.y = angle;
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

  buildRoads(xianlinCorridors, point, road);

  // Ground plate, lawns and the South Gate on Xianlin Avenue.
  box(2960, .12, 3160, '#8d9d79', 0, -.18, 0);
  const campusGround = box(1560, .08, 1780, '#6f8a5d', 0, .02, -60);
  for (const [x, z, w, d, c] of [[-260, 120, 160, 130, '#7b9464'], [250, 130, 180, 140, '#7b9464'], [0, -230, 240, 150, '#879b6c'], [220, 720, 220, 150, '#7b9464']]) box(w, .05, d, c, x, .06, z);
  const gateZ = 780;
  for (const sx of [-13, 13]) { solid(6, 12, 6, '#b9b09a', sx, 6, gateZ); box(7, 1.4, 7, '#8f8672', sx, 12.4, gateZ); }
  box(32, 1.6, 3, '#c2b9a3', 0, 12.6, gateZ); box(30, 1, 2.4, '#8f8672', 0, 13.6, gateZ);
  label('南京大学 · 仙林校区 · 南门', 0, 16, gateZ, 30);
  box(40, .12, 40, '#b9b4a2', 0, .04, 792);

  // Du Xia Library (enterable, on the central axis).
  const library = shell('杜厦图书馆 · 借阅大厅', 0, -220, 76, 54);
  solid(84, 1.2, 62, '#c7bfab', 0, .5, -220);
  for (let i = 0; i < 5; i++) box(18 - i * 1.8, .18, 5, '#d8d3c0', 0, .72 + i * .22, -192 - i * 3.2);
  for (const z of [-238, -220, -202]) for (const x of [-30, -18, -6, 6, 18, 30]) { solid(3, .9, 6, '#8d775c', x, .75, z); box(2.8, .1, 5.6, '#d8d1b6', x, 1.23, z); }
  interactables.push({ type: 'info', name: '校史导览 · 后续任务', x: 0, z: -196, y: 0, message: '校史导览、校园跑腿与图书馆任务将在这里接入。' });
  interactables.push({ type: 'info', name: '借阅馆藏', x: -18, z: -238, y: 0, message: '翻阅馆藏：南京大学史与仙林校区建筑档案。' });
  label('DU XIA LIBRARY', 0, 8, -193, 30);

  // Student No.1 Canteen (food, enterable) and dorm towers (delivery).
  const towers = [];
  tower({ name: '学生第一食堂', x: 215, z: -220, w: 44, d: 34, levels: 2, h: 5, food: true });
  for (const [name, x, z] of [['学生宿舍 3 栋', 170, -620], ['学生宿舍 4 栋', 270, -620], ['学生宿舍 5 栋', 370, -620]]) {
    const t = tower({ name, x, z, w: 22, d: 20, levels: 6, h: 3 });
    for (let f = 1; f < t.levels; f++) {
      const y = f * t.h;
      box(.16, 2.15, 1.25, '#7a5f45', x + t.w / 2 - .28, y + 1.07, z + 3.2);
      box(2.6, .28, 1.5, '#8f9c8b', x + t.w / 2 - .6, y + 2.35, z + 3.2);
      interactables.push({ type: 'delivery', name: `${name} · ${f + 1}0${f}室`, x: t.doorX, z: z + 3.2, y, building: name, floor: f, room: `${f + 1}0${f}` });
      label(`${f + 1}0${f}`, x + t.w / 2 - .1, y + 1.6, z + 3.2, 2.2, scene, Math.PI / 2);
    }
  }

  // Student Activity Centre (enterable, with a stage).
  const activity = shell('大学生活动中心', -260, 120, 62, 42);
  solid(40, 1.2, 10, '#7c5f6b', -260, .6, 132);
  solid(30, 3, 1.2, '#6f5560', -260, 2.9, 137);
  label('STAGE', -260, 3.4, 134, 12);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) box(5, .6, 3, '#7c8478', -292 + i * 13, .3, 110 + j * 8);
  interactables.push({ type: 'showcase', name: '社团展台 · 预留', x: -280, z: 108, y: 0, message: '社团活动、演出席位与更多互动道具将在这里开放。' });

  // Fang Zhaozhou Gymnasium (enterable).
  const gym = shell('方肇周体育馆', 250, 130, 72, 52);
  box(38, .06, 24, '#b98e5c', 250, .06, 130); box(34, .05, 20, '#c9a26b', 250, .09, 130);
  for (const x of [230, 250, 270]) solid(3, 3, 1, '#8a8f86', x, 1.5, 130);
  for (let i = 0; i < 5; i++) box(10, 1, 3, '#7b8c93', 220 + i * 15, .5, 148);
  interactables.push({ type: 'showcase', name: '器材架 · 预留', x: 226, z: 148, y: 0, message: '球类、器械等交互道具后续会在此陈列。' });

  // Campus convenience store (theft + shop).
  const store = shell('校园便利店', -270, 560, 30, 26, { backGap: 0 });
  for (const x of [-280, -270, -260]) for (const z of [556, 564]) {
    solid(3.4, 1.4, 2, '#9a805f', x, .7, z);
    for (let i = 0; i < 4; i++) {
      const mesh = box(.4, .5, .5, ['#d2ac6c', '#98b685', '#ca8b79'][i % 3], x - 1 + i * .6, 1.7, z);
      interactables.push({ type: 'goods', name: '拿取商品 · 偷窃', x: x - 1 + i * .6, z: z + 1.4, y: 0, mesh, taken: false });
    }
  }
  solid(5.4, .6, 2, '#8f8a78', -270, 1.7, 547.4);
  const stockDoor = door(-271.35, 547, '仓库门 · 按住 F 撬锁', { locked: true });
  floor(-270, 539, 26, 14);
  solid(26, 3.6, .3, '#a9a28e', -270, 1.8, 532);
  solid(.3, 3.6, 14, '#a9a28e', -283, 1.8, 539); solid(.3, 3.6, 14, '#a9a28e', -257, 1.8, 539);
  interactables.push({ type: 'loot', x: -270, z: 538, y: 0, name: '取走仓库物资', door: stockDoor, taken: false });
  box(6, 1.1, 2, '#4e6560', -260, .55, 570);
  interactables.push({ type: 'shop', x: -260, z: 568, y: 0, name: '购买补给 $30' });

  // School history museum (enterable).
  const museum = shell('校史馆 · 展览馆', 230, 700, 38, 26);
  for (const x of [216, 230, 244]) { solid(5, 1.1, 1.6, '#8d7964', x, .55, 700); box(5, 1.6, .2, '#cbc4ad', x, 1.8, 692); }
  interactables.push({ type: 'info', name: '校史陈列 · 后续任务', x: 230, z: 690, y: 0, message: '校史展览与寻访任务将在这里接入。' });

  // Stadium / running track (decorative).
  const track = new THREE.Mesh(new THREE.RingGeometry(46, 60, 40), material('#b06a58', { side: THREE.DoubleSide }));
  track.rotation.x = -Math.PI / 2; track.position.set(250, .13, 480); track.scale.set(1.35, 1, 1); scene.add(track);
  box(96, .05, 74, '#5c7f49', 250, .12, 480);
  for (const wx of [-2, 0, 2]) box(6, 2, .4, '#d8d3c0', 250 + wx * 8, 1, 480 - 37);

  // Lake.
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 48), material('#6ea6a4', { roughness: .25, metalness: .3 }));
  lake.rotation.x = -Math.PI / 2; lake.scale.set(120, 78, 1); lake.position.set(-250, .01, -650); scene.add(lake);
  water.push({ x: -250, z: -650, w: 240, d: 156 });
  for (const a of [0, 1.2, 2.4, 3.6, 4.8]) box(3, .8, 3, '#5f7f4d', -250 + Math.cos(a) * 118, .5, -650 + Math.sin(a) * 76);

  // Teaching buildings (west).
  for (const [name, x, z, w, d, h] of [
    ['逸夫楼', -260, -300, 54, 30, 18], ['费彝民楼', -260, -430, 48, 26, 16],
    ['教学楼 A', -260, 40, 50, 28, 20], ['教学楼 B', -260, 240, 50, 28, 20], ['理工楼', -260, -600, 56, 30, 22],
  ]) { solid(w, h, d, '#b7bdba', x, h / 2, z); box(w + 1, .7, d + 1, '#d8d1bb', x, h, z); label(name, x, h + 3, z + d / 2 + .3, Math.min(w, 24)); }

  // Helipad + airstrip.
  const helipad = { x: 200, z: 1090 };
  box(24, .12, 24, '#55605c', helipad.x, .04, helipad.z);
  box(3.6, .12, 3.6, '#dfe7c8', helipad.x - 5.5, .08, helipad.z); box(3.6, .12, 3.6, '#dfe7c8', helipad.x + 5.5, .08, helipad.z);
  box(.9, .12, 12, '#dfe7c8', helipad.x, .08, helipad.z); box(10, .12, .9, '#dfe7c8', helipad.x, .08, helipad.z);
  label('HELIPAD', helipad.x, 3.4, helipad.z + 12.4, 16);
  const airstrip = { x: -150, z: 1055 };
  box(170, .1, 20, '#4f5855', airstrip.x, .03, airstrip.z);
  for (let i = -4; i <= 4; i++) box(6, .04, 1.1, '#d9dcc4', airstrip.x + i * 17, .1, airstrip.z);
  label('金陵飞行场', airstrip.x, 2.6, airstrip.z + 13, 16);

  // Bus depot south of campus.
  box(90, .15, 70, '#566468', xianlinBusDepot.x, .04, xianlinBusDepot.z);
  for (let i = -2; i <= 2; i++) box(.2, .03, 34, '#c9c5a8', xianlinBusDepot.x + i * 12, .14, xianlinBusDepot.z);
  box(34, 4, 10, '#a2b3ab', xianlinBusDepot.x, 2, xianlinBusDepot.z + 40, scene, true);
  label('仙林公交场', xianlinBusDepot.x, 8, xianlinBusDepot.z + 40, 36);

  // Spawn house outside the south gate: info board, weapon wall, displays.
  const hx = xianlinSpawn.x, hz = 1055, hw = 17, hd = 12;
  const walls = '#d3cbb6';
  floor(hx, hz, hw * 2, hd * 2);
  solid(hw * 2, 4, .35, walls, hx, 2, hz + hd);
  solid(.35, 4, hd * 2, walls, hx - hw, 2, hz);
  solid(.35, 4, hd * 2, walls, hx + hw, 2, hz);
  solid(13, 4, .35, walls, -10.5, 2, hz - hd);
  solid(13, 4, .35, walls, 10.5, 2, hz - hd);
  solid(10, .3, 3, '#b9b6a3', 0, .02, hz - hd - 1.6);
  label('出生点 · SOUTH GATE', hx, 3.6, hz - hd - .35, 22, scene, Math.PI);
  const infoBoard = board(['JINLING CITY · 仙林校区', '版本 4.0.0 · 2026-11-25', '最新推送 · 同步中…', '武器墙 / 补给箱 / 展台已就绪'], 20, 10, hx, 2.8, hz + hd - .3, Math.PI);
  box(.2, 3.4, 16, '#3a4a48', -hw + .35, 1.9, hz);
  for (let i = 0; i < 5; i++) { const zz = hz - 6 + i * 3; box(.16, 1.6, .5, '#2a3535', -hw + .55, 1.9, zz); box(.16, .7, .3, '#39494b', -hw + .6, 1.9, zz + .9); }
  interactables.push({ type: 'weaponwall', name: '武器墙 · 领取武器', x: -hw + 1.6, z: hz, y: 0 });
  label('WEAPON WALL', -hw + 1, 3.9, hz, 12, scene, Math.PI / 2);
  for (const sx of [-7, 7]) {
    solid(3, 1, 3, '#8d7964', sx, .5, hz + 3);
    box(3.2, .12, 3.2, '#d9dac2', sx, 1.06, hz + 3);
    box(1.2, 1.2, 1.2, '#9fb7b0', sx, 1.7, hz + 3, scene, { emissive: '#6fae9e', emissiveIntensity: .3 });
    interactables.push({ type: 'showcase', name: '展台 · 交互道具预留', x: sx, z: hz + 4.6, y: 0, message: '这里会陈列可交互道具（钥匙、信件、任务物品等），后续版本接入。' });
  }
  box(3, 1.6, 2, '#7d8a6a', 10, .8, hz + 6);
  interactables.push({ type: 'supply', name: '补给箱 · 弹药 / 开锁器 / 生命', x: 10, z: hz + 7.4, y: 0 });
  // Parking lot beside the house.
  box(150, .1, 26, '#6d6f66', 70, .03, hz - 18);
  for (let i = 0; i < 6; i++) box(.24, .03, 22, '#d5d2bc', 12 + i * 22, .1, hz - 18);

  const vehicles = [
    { type: 'sport', x: 18, z: hz - 18, color: '#d7e69c', options: { shared: true } },
    { type: 'jeep', x: 40, z: hz - 18, color: '#9fae86', options: { shared: true } },
    { type: 'ev', x: 62, z: hz - 18, color: '#bcd9d0', options: { shared: true } },
    { type: 'police', x: 84, z: hz - 18, color: '#dce1d6', options: { shared: true } },
    { type: 'bus', x: 128, z: hz - 20, color: '#b8d2b1', options: { shared: true } },
    { type: 'heli', x: helipad.x, z: helipad.z, color: '#d7e2b6', options: { flying: true } },
    { type: 'plane', x: airstrip.x, z: airstrip.z, yaw: Math.PI / 2, color: '#dfe3cf', options: { flying: true } },
  ];

  // Filler city blocks outside the campus core + instanced trees.
  let seed = 91; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const nearRoad = (x, z) => roads.some(r => {
    const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z, len = dx * dx + dz * dz;
    const t = len ? THREE.MathUtils.clamp(((x - r.a.x) * dx + (z - r.a.z) * dz) / len, 0, 1) : 0;
    return Math.hypot(x - (r.a.x + t * dx), z - (r.a.z + t * dz)) < r.width / 2 + 10;
  });
  const inCampus = (x, z) => x > -640 && x < 660 && z > -880 && z < 840;
  const inSpawn = (x, z) => z > 905 && z < 1275 && x > -700 && x < 520;
  const blocked = (x, z, w, d) => solids.some(s => Math.abs(x - s.x) < s.hw + w / 2 + 4 && Math.abs(z - s.z) < s.hd + d / 2 + 4);
  const filler = [];
  for (let i = 0; i < 240 && filler.length < 120; i++) {
    const x = -1350 + rand() * 2700, z = -1450 + rand() * 2900;
    const w = 24 + rand() * 40, d = 24 + rand() * 40, h = 12 + rand() * 60;
    if (inCampus(x, z) || inSpawn(x, z) || nearRoad(x, z) || blocked(x, z, w, d)) continue;
    if (filler.some(b => Math.abs(b.x - x) < (b.w + w) / 2 + 8 && Math.abs(b.z - z) < (b.d + d) / 2 + 8)) continue;
    filler.push({ x, z, w, d, h });
    solid(w, h, d, ['#c7b8a5', '#cdb9ab', '#aebdb5', '#c1aa99'][i % 4], x, h / 2, z);
    if (i % 4 === 0) box(w + 1, .7, d + 1, '#d8d1bb', x, h, z);
  }
  const treeCount = 260, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.5, .8, 7, 6), material('#897459'), treeCount), crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), material('#4f795c'), treeCount);
  const matrix = new THREE.Matrix4(); let placed = 0;
  while (placed < treeCount) {
    const x = -1350 + rand() * 2700, z = -1450 + rand() * 2900;
    if (nearRoad(x, z) || inSpawn(x, z) || solids.some(s => Math.abs(x - s.x) < s.hw + 4 && Math.abs(z - s.z) < s.hd + 4)) continue;
    matrix.compose(new THREE.Vector3(x, 3.5, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); trunks.setMatrixAt(placed, matrix);
    matrix.setPosition(x, 8, z); crowns.setMatrixAt(placed, matrix); placed++;
  }
  trunks.count = crowns.count = placed; trunks.instanceMatrix.needsUpdate = true; crowns.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere(); crowns.computeBoundingSphere(); scene.add(trunks, crowns);

  const places = [
    { name: library.name, x: 0, z: -196, interior: true },
    { name: '学生第一食堂 · 美食档 2F', x: 215, z: -196, interior: true },
    { name: activity.name, x: -260, z: 138, interior: true },
    { name: gym.name, x: 250, z: 152, interior: true },
    { name: store.name, x: -270, z: 570, interior: true },
    { name: museum.name, x: 230, z: 710, interior: true },
    { name: '出生房 · 南门外', x: 0, z: hz - hd - 4, interior: true },
    ...towers.map(t => t.food
      ? { name: `${t.name} · 美食档 ${t.levels}F`, x: t.x, z: t.z - t.d / 2 + 7.4, interior: true }
      : { name: t.name, x: t.x, z: t.z + t.d / 2 + 3, interior: true }),
    ...xianlinDistricts.map(d => ({ name: d.name, x: d.x, z: d.z })),
  ];

  return {
    box, solid, label, material, solids, floors, interactables, buildings, roads, nodes,
    stations: [], metroLines: [], water, districts: xianlinDistricts, bounds: xianlinBounds,
    places, towers, helipad, airstrip, campusGround, spawn: xianlinSpawn, infoBoard,
    lift: { x: 1e9, z: 1e9, y: 0, target: 0, moving: false, mesh: { position: { y: 0 } } },
    busStops: xianlinBusStops.map(s => ({ ...s })), busDepot: xianlinBusDepot, busLabel: '校车',
    vehicles, parkedCount: 10, trafficCount: 6, pedCount: 26,
  };
}
