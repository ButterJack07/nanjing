import * as THREE from 'three';
import { buildRoads } from './road-network.js';

export const bounds = { minX: -1150, maxX: 1150, minZ: -1250, maxZ: 1250 };

// Compact, Shanghai/Nanjing-style central district. The layout follows the
// relative positions of real landmarks; it is a stylized game map, not survey data.
export const districts = [
  { name: '新街口', x: 0, z: 0, w: 300, d: 300 },
  { name: '鼓楼', x: 0, z: -760, w: 330, d: 250 },
  { name: '珠江路', x: -55, z: -420, w: 300, d: 210 },
  { name: '大行宫', x: 440, z: 0, w: 330, d: 250 },
  { name: '夫子庙', x: 330, z: 855, w: 350, d: 240 },
  { name: '南京大学鼓楼校区', x: -315, z: -580, w: 340, d: 250 },
  { name: '玄武湖', x: 650, z: -1000, w: 820, d: 470 },
  { name: '上海路', x: -520, z: 0, w: 210, d: 500 },
  { name: '张府园', x: 0, z: 430, w: 250, d: 250 },
  { name: '三山街', x: 0, z: 760, w: 250, d: 220 },
  { name: '总统府', x: 590, z: -115, w: 250, d: 200 },
];

export const corridors = [
  ['中山北路', 30, [[-520, -1150], [-400, -990], [-310, -880], [-180, -815], [0, -760]], 'main'],
  ['中山路', 34, [[0, -760], [0, -420], [0, 0]], 'main'],
  ['中山南路', 34, [[0, 0], [0, 430], [0, 760], [0, 1150]], 'main'],
  ['汉中路', 30, [[-1000, 0], [-620, 0], [-520, 0], [0, 0]], 'main'],
  ['中山东路', 32, [[0, 0], [430, 0], [760, 0], [1120, 0]], 'main'],
  ['北京西路', 24, [[-1000, -770], [-520, -765], [0, -760]], 'main'],
  ['北京东路', 24, [[0, -760], [360, -748], [760, -738], [1120, -728]], 'main'],
  ['上海路', 22, [[-520, -960], [-520, 0], [-520, 520], [-505, 1000]], 'second'],
  ['珠江路', 22, [[-520, -420], [0, -420], [360, -432], [760, -420]], 'second'],
  ['长江路', 18, [[-160, -180], [0, -180], [300, -180], [430, -140]], 'second'],
  ['太平北路', 20, [[430, 0], [430, -320], [428, -620], [420, -720]], 'second'],
  ['太平南路', 20, [[430, 0], [440, 320], [480, 640], [520, 900]], 'second'],
  ['洪武北路', 16, [[170, -420], [180, -180], [180, 0]], 'second'],
  ['洪武路', 16, [[180, 0], [190, 260], [200, 520]], 'second'],
  ['广州路', 18, [[-900, -470], [-520, -470], [-160, -468], [0, -460]], 'second'],
  ['汉口路', 14, [[-900, -690], [-520, -690], [-160, -690]], 'local'],
  ['青岛路', 12, [[-160, -690], [-160, -468]], 'local'],
  ['华侨路', 14, [[-620, -180], [-300, -180], [0, -180]], 'local'],
  ['管家桥', 12, [[-420, -260], [-420, 0]], 'local'],
  ['丹凤街', 12, [[-160, -420], [-40, -420], [-40, -180]], 'local'],
  ['丰富路', 14, [[150, 0], [150, 320], [170, 560]], 'local'],
  ['建邺路', 20, [[-600, 560], [0, 570], [430, 600]], 'second'],
  ['升州路', 22, [[-900, 700], [-400, 720], [0, 760]], 'second'],
  ['建康路', 22, [[0, 760], [500, 780], [900, 760]], 'second'],
  ['中华路', 24, [[0, 760], [0, 950], [0, 1150]], 'main'],
  ['石鼓路', 14, [[-600, 200], [-300, 240], [0, 260]], 'local'],
  ['秣陵路', 14, [[-620, 420], [-200, 440], [0, 430]], 'local'],
  ['网巾市', 10, [[-40, -300], [120, -300]], 'local'],
  ['估衣廊', 10, [[40, -180], [40, -40]], 'local'],
  ['大纱帽巷', 10, [[250, -120], [250, 80]], 'local'],
  ['石婆婆巷', 10, [[300, -320], [300, -100]], 'local'],
  ['三元巷', 10, [[-110, 470], [120, 470]], 'local'],
  ['程阁老巷', 10, [[-60, 520], [120, 520]], 'local'],
  ['糖坊桥', 10, [[-40, 180], [140, 180]], 'local'],
  ['明瓦廊', 10, [[-80, 60], [-80, 260]], 'local'],
  ['鼓楼公交场路', 14, [[0, -660], [150, -660]], 'local'],
  ['大行宫东街', 18, [[430, 0], [620, 60], [790, 120], [870, 160]], 'second'],
];

export const busDepots = [
  { name: '鼓楼公交场', x: 140, z: -660, r: 62 },
  { name: '大行宫公交场', x: 820, z: 150, r: 62 },
];

export function createWorld(scene) {
  const materials = new Map(), solids = [], floors = [], interactables = [], buildings = [], roads = [], nodes = [], stationList = [], metroLines = [];
  const water = [];
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
  function point(x, z) { const n = { x, z, links: [], id: nodes.length }; nodes.push(n); return n; }
  function road(a, b, width = 22, sidewalk = true, name = '城市道路', kind = 'second') {
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

  buildRoads(corridors, point, road);

  // Xuanwu Lake (north-east), Qinhuai River (south) and the Ming city wall edge.
  box(900, .12, 560, '#456b52', 650, -.06, -1000);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 72), material('#6ea6a4', { roughness: .25, metalness: .3 }));
  lake.rotation.x = -Math.PI / 2; lake.scale.set(420, 240, 1); lake.position.set(650, .01, -1000); scene.add(lake);
  water.push({ x: 650, z: -1000, w: 840, d: 480 });
  const riverPoints = [[-1000, 890], [-700, 905], [-350, 875], [0, 915], [350, 890], [700, 920], [1080, 885]];
  for (let i = 1; i < riverPoints.length; i++) {
    const [ax, az] = riverPoints[i - 1], [bx, bz] = riverPoints[i];
    const seg = box(Math.hypot(bx - ax, bz - az) + 16, .12, 24, '#5b8e92', (ax + bx) / 2, .02, (az + bz) / 2, scene, { roughness: .3, metalness: .2 });
    seg.rotation.y = Math.atan2(bx - ax, bz - az);
  }
  water.push({ x: 300, z: 900, w: 1500, d: 60 });
  box(40, .2, 46, '#8a8e8a', 0, .2, 915);
  box(30, .08, 44, '#484f50', 0, .3, 915);
  label('中华门方向', 0, 5, 1120, 46);
  for (const [x, w] of [[420, 300], [880, 330]]) {
    solid(w, 8, 14, '#8e8d7c', x, 4, -735);
    solid(16, 12, 30, '#8e8d7c', x - w / 2, 6, -735);
  }
  label('明城墙 · 解放门', 620, 10, -728, 34);
  const pagoda = new THREE.Group(); pagoda.position.set(190, 0, -880); scene.add(pagoda);
  for (let f = 0; f < 5; f++) { box(16 - f * 2, 4, 16 - f * 2, '#b3a486', 0, 2 + f * 4, 0, pagoda, true); box(22 - f * 3, .8, 22 - f * 3, '#6d7869', 0, 4.5 + f * 4, 0, pagoda); }
  label('鸡鸣寺', 190, 24, -880, 16);

  // New Jiekou plaza, Drum Tower, Presidential Palace and Confucius Temple.
  box(46, .1, 46, '#b9b4a2', 44, .02, 44);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1, 24), material('#9fb2a9')); fountain.position.set(44, .5, 44); scene.add(fountain);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(.6, 1.2, 4, 12), material('#8fb6b2', { metalness: .4 })); spout.position.set(44, 2.5, 44); scene.add(spout);
  label('新街口', 0, 12, -34, 30);
  const drum = new THREE.Group(); drum.position.set(-60, 0, -800); scene.add(drum);
  solid(26, 10, 18, '#a78e75', -60, 5, -800);
  solid(32, 1.6, 24, '#7c6a58', -60, 10.8, -800);
  solid(18, 5, 12, '#9c866d', -60, 14, -800);
  const drumRoof = new THREE.Mesh(new THREE.ConeGeometry(18, 6, 4), material('#786b5c')); drumRoof.rotation.y = Math.PI / 4; drumRoof.position.set(-60, 19, -800); scene.add(drumRoof);
  label('鼓楼', -60, 24, -790, 20);
  // Presidential Palace: walled compound, south gate, inner garden.
  for (const [w, d, x, z] of [[230, 12, 600, -212], [230, 12, 600, -42], [12, 170, 488, -127], [12, 170, 712, -127]]) solid(w, 7, d, '#a49b84', x, 3.5, z);
  box(34, .1, 40, '#b8b09a', 600, .04, -30);
  label('总统府', 600, 12, -45, 34);
  for (const x of [528, 600]) solid(56, 13, 32, '#b1a48d', x, 6.5, -150);
  box(90, .06, 40, '#6d8a62', 600, .02, -95);
  box(90, .1, 60, '#b0ab98', 330, .02, 850);
  solid(52, 13, 30, '#a88970', 330, 6.5, 835);
  solid(34, .8, 24, '#75695c', 330, 13.2, 835);
  for (const x of [-55, 55]) solid(6, 9, 6, '#a48b71', 330 + x, 4.5, 790);
  solid(70, 1, 6, '#8f7b64', 330, 9, 790);
  label('夫子庙', 330, 16, 838, 26);
  label('大成殿', 330, 15, 835, 18);

  // Nanjing University, Gulou campus. Stylized recreation; interior footprints
  // are game scale and do not claim to match official campus plans.
  const campusGround = box(330, .08, 240, '#6e8a5e', -315, .02, -580);
  const wall = (w, d, x, z) => solid(w, 1.7, d, '#8d8c7b', x, .85, z);
  wall(141, 1.2, -409.5, -700); wall(129, 1.2, -214.5, -700);
  wall(141, 1.2, -409.5, -461); wall(129, 1.2, -214.5, -461);
  wall(1.2, 90, -480, -655); wall(1.2, 95, -480, -507.5);
  wall(1.2, 100, -150, -650); wall(1.2, 86, -150, -505);
  box(18, .1, 8, '#b9b6a3', -330, .06, -700); box(18, .1, 8, '#b9b6a3', -330, .06, -461);
  box(8, .1, 14, '#b9b6a3', -150, .06, -570); box(8, .1, 14, '#b9b6a3', -480, .06, -570);
  box(12, .08, 28, '#b9b6a3', -330, .05, -686);
  box(310, .08, 8, '#b9b6a3', -315, .05, -605);
  box(12, .08, 144, '#b9b6a3', -330, .05, -533);
  box(310, .08, 7, '#b9b6a3', -315, .05, -540);
  box(7, .08, 15, '#b9b6a3', -250, .05, -532);
  // North Building with its square tower and green roof.
  solid(46, 20, 26, '#b9a48f', -330, 10, -658);
  solid(18, 28, 18, '#a9927d', -330, 14, -650);
  const northRoof = new THREE.Mesh(new THREE.ConeGeometry(15, 5, 4), material('#5d7d63')); northRoof.rotation.y = Math.PI / 4; northRoof.position.set(-330, 30.5, -650); scene.add(northRoof);
  label('北大楼', -330, 33, -658, 22);
  solid(32, 12, 20, '#b1a08b', -408, 6, -652);
  label('大礼堂', -408, 13, -652, 20);
  for (const x of [-430, -372, -286]) { solid(40, 15, 18, '#b2ab96', x, 7.5, -575); label('教学楼', x, 16, -575, 16); }
  for (const x of [-380, -310]) { solid(44, 16, 18, '#aab19a', x, 8, -420); label('南园宿舍', x, 17, -420, 22); }
  solid(34, 10, 24, '#b6a28a', -250, 5, -420); label('南园食堂', -250, 11, -420, 20);
  box(84, .06, 44, '#9a7b65', -250, .03, -505);
  box(72, .06, 32, '#73915f', -250, .06, -505);
  label('南京大学 · 鼓楼校区', -330, 11, -704, 76);

  // Enterable interiors.
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
  const store = shell('24/7 · 新街口便利店', 100, 80, 30, 26, { backGap: 0 });
  for (const x of [90, 100, 110]) for (const z of [76, 84]) {
    solid(3.4, 1.4, 2, '#9a805f', x, .7, z);
    for (let i = 0; i < 4; i++) {
      const mesh = box(.4, .5, .5, ['#d2ac6c', '#98b685', '#ca8b79'][i % 3], x - 1 + i * .6, 1.7, z);
      interactables.push({ type: 'goods', name: '拿取商品 · 偷窃', x: x - 1 + i * .6, z: z + 1.4, y: 0, mesh, taken: false });
    }
  }
  solid(5.4, .6, 2, '#8f8a78', 100, 1.7, 67.4);
  const stockDoor = door(98.65, 67, '仓库门 · 按住 F 撬锁', { locked: true });
  floor(100, 59, 26, 14);
  solid(26, 3.6, .3, '#a9a28e', 100, 1.8, 52);
  solid(.3, 3.6, 14, '#a9a28e', 87, 1.8, 59); solid(.3, 3.6, 14, '#a9a28e', 113, 1.8, 59);
  for (const x of [93, 100, 107]) box(4, 2, 3, '#9f8058', x, 1, 56);
  interactables.push({ type: 'loot', x: 100, z: 58, y: 0, name: '取走仓库物资', door: stockDoor, taken: false });
  box(6, 1.1, 2, '#4e6560', 110, .55, 90);
  interactables.push({ type: 'shop', x: 110, z: 88, y: 0, name: '购买补给 $30' });

  const bank = shell('金陵银行 · 新街口', -110, -90, 48, 36, { backGap: 12 });
  for (const x of [-126, -110, -94]) solid(7, 1.2, 2, '#957c5e', x, .6, -94);
  const vaultDoor = door(-99.35, -108, '金库门 · 按住 F 撬锁', { locked: true, vault: true });
  floor(-110, -119, 30, 22);
  solid(30, 3.8, .3, '#9d9c8f', -110, 1.9, -130);
  solid(.3, 3.8, 18, '#9d9c8f', -125, 1.9, -121); solid(.3, 3.8, 18, '#9d9c8f', -95, 1.9, -121);
  box(5, 1, 2, '#d1b358', -110, .5, -124);
  interactables.push({ type: 'vault', x: -110, z: -122, y: 0, name: '拿取金库现金', door: vaultDoor, taken: false });

  const hotel = shell('RIVIERA · 鼓楼酒店', -120, -650, 60, 44);
  hotel.floors = 4;
  box(14, 1.1, 2.5, '#9a7b62', -120, .55, -638); label('RECEPTION', -120, 2.4, -627.7, 16);
  for (let f = 1; f <= 3; f++) {
    const y = f * 4;
    floor(-120, -650, 52, 40, y);
    solid(.3, 3.8, 40, '#c5b8a6', -146, y + 1.9, -650);
    solid(52, 3.8, .3, '#c5b8a6', -120, y + 1.9, -670);
    solid(52, 3.8, .3, '#c5b8a6', -120, y + 1.9, -630);
    for (const side of [-1, 1]) for (const x of [-138, -102]) {
      box(4, .6, 5, '#8d7964', x, y + .3, -650 + side * 14);
      box(3.9, .25, 4.8, '#d9dac2', x, y + .73, -650 + side * 14);
      solid(10, 3.7, .2, '#c9c0ad', x, y + 1.85, -650 + side * 7);
      label(`${f + 1}${String((x + 138) / 36 + (side > 0 ? 4 : 1)).padStart(2, '0')}`, x, y + 2.7, -650 + side * 6.7, 2.4);
    }
  }
  for (let f = 0; f < 3; f++) {
    const direction = f % 2 ? -1 : 1;
    floors.push({ type: 'ramp', x: -143.5, z: -650, hw: 2.6, hd: 16, base: f * 4, rise: 4, direction });
    for (let i = 0; i < 32; i++) box(5.2, .16, 1, '#b8b4a1', -143.5, f * 4 + (i + 1) / 8 - .08, -650 + direction * (-16 + i + .5));
  }
  const lift = box(5, .25, 5, '#8eaaa4', -98, -.1, -648);
  const liftState = { mesh: lift, x: -98, z: -648, y: 0, target: 0, moving: false };
  for (let f = 0; f < 4; f++) interactables.push({ type: 'lift', name: '电梯 · 选择楼层', x: -98, z: -648, y: f * 4, lift: liftState });

  const library = shell('南京大学 · 图书馆', -250, -648, 40, 26);
  for (const x of [-262, -250, -238]) for (const z of [-656, -650]) solid(2.8, 1.8, 1.4, '#8d775c', x, .9, z);
  for (const x of [-260, -240]) { solid(8, .8, 3, '#9d8767', x, .4, -640); box(7.5, .12, 2.6, '#d4cdb3', x, .9, -640); }
  interactables.push({ type: 'info', name: '校史导览 · 后续任务', x: -250, z: -636, y: 0, message: '校史导览、校园跑腿与图书馆任务将在这里接入。' });
  interactables.push({ type: 'info', name: '借阅馆藏', x: -262, z: -650, y: 0, message: '翻阅馆藏：南京城市史与校园建筑档案。' });

  // Multi-storey, walk-in buildings used by the delivery jobs.
  const towers = [];
  function tower(opts) {
    const { name, x, z, w, d, levels, h, color = '#c9c1ae', food = false } = opts;
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
    // Straight internal stairs, alternating direction each level.
    const lane = z - d / 2 + 3.4, margin = 2.4, run = w - margin * 2;
    for (let f = 0; f < levels - 1; f++) {
      const dir = f % 2 ? 1 : -1, y = f * h;
      const a = new THREE.Vector3(x - dir * run / 2, y, lane), b = new THREE.Vector3(x + dir * run / 2, y + h, lane);
      floors.push({ type: 'stair', start: a, end: b, width: 2.8, base: y, rise: h });
      const steps = Math.round(run / .85);
      for (let i = 0; i < steps; i++) {
        const t = (i + .5) / steps;
        box(run / steps + .05, .22, 2.8, '#b2aa97', THREE.MathUtils.lerp(a.x, b.x, t), y + t * h - .11, lane);
      }
      box(.18, .95, 2.9, '#7c8a80', a.x, y + .47, lane);
      box(.18, .95, 2.9, '#7c8a80', b.x, y + h - .47, lane);
    }
    if (food) {
      const fy = (levels - 1) * h, counterZ = z - d / 2 + 5.2;
      solid(9, 1.1, 2, '#8a6c4f', x, fy + .55, counterZ);
      solid(2.4, 1.5, 1.2, '#a8896a', x - 5.6, fy + .75, counterZ - .6);
      interactables.push({ type: 'food', name: '取餐 · 德基美食档', x, z: counterZ + 2.2, y: fy });
      label(`美食档 · ${levels}F`, x, fy + 2.8, counterZ - 1.1, 12);
    }
    for (let f = 0; f < levels; f++) for (let i = 0; i < 3; i++) {
      box(3.2, .85, 2, '#9a8a72', x - 9 + i * 9, f * h + .43, z + d / 2 - 5);
      box(3, .1, 1.8, '#c8bfa8', x - 9 + i * 9, f * h + .9, z + d / 2 - 5);
    }
    const building = { name, x, z, w, d, levels, h, food, doorX: x + w / 2 - 1.2, doorZ: z + 2 };
    towers.push(building);
    return building;
  }
  tower({ name: '德基广场', x: -150, z: 150, w: 46, d: 36, levels: 3, h: 4.5, food: true });
  for (const [name, x, z] of [['石鼓路小区', -60, 320], ['张府园公寓', 120, 480], ['珠江路小区', -100, -300]]) {
    const t = tower({ name, x, z, w: 22, d: 20, levels: 6, h: 3 });
    for (let f = 1; f < t.levels; f++) {
      const y = f * t.h;
      box(.16, 2.15, 1.25, '#7a5f45', x + t.w / 2 - .28, y + 1.07, z + 3.2);
      box(2.6, .28, 1.5, '#8f9c8b', x + t.w / 2 - .6, y + 2.35, z + 3.2);
      interactables.push({ type: 'delivery', name: `${name} · ${f + 1}0${f}室`, x: t.doorX, z: z + 3.2, y, building: name, floor: f, room: `${f + 1}0${f}` });
      label(`${f + 1}0${f}`, x + t.w / 2 - .1, y + 1.6, z + 3.2, 2.2, scene, Math.PI / 2);
    }
  }
  // Helipad and a short airstrip on open ground.
  const helipad = { x: 60, z: 150 };
  box(22, .12, 22, '#55605c', helipad.x, .04, helipad.z);
  box(3.4, .12, 3.4, '#dfe7c8', helipad.x - 5, .08, helipad.z); box(3.4, .12, 3.4, '#dfe7c8', helipad.x + 5, .08, helipad.z);
  box(.9, .12, 11, '#dfe7c8', helipad.x, .08, helipad.z); box(9, .12, .9, '#dfe7c8', helipad.x, .08, helipad.z);
  label('HELIPAD · 新街口', helipad.x, 3.2, helipad.z + 11.4, 18);
  const airstrip = { x: -80, z: 400 };
  box(16, .1, 78, '#4f5855', airstrip.x, .03, airstrip.z);
  for (let i = -3; i <= 3; i++) box(1.1, .04, 7, '#d9dcc4', airstrip.x, .1, airstrip.z + i * 11);
  label('金陵飞行场', airstrip.x, 2.6, airstrip.z + 40, 16);

  // Metro: Line 1 (north-south) and Line 2 (east-west), with real station order.
  // All station rooms share one cross-section: track at local x -5, platform from
  // -3.3 to 3.3, room from -9 to 5.5. Trains sit 1.1 m lower so their floor meets
  // the platform at -7 m. Tunnels join the rooms between stations.
  const B1 = -7, TRAIN_DROP = 1.1;
  function metroLine(name, color, start, end, defs) {
    const tangent = new THREE.Vector3(end[0] - start[0], 0, end[1] - start[1]).normalize();
    const angle = Math.atan2(tangent.x, tangent.z);
    const normal = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const curve = new THREE.LineCurve3(new THREE.Vector3(start[0], B1 - TRAIN_DROP, start[1]), new THREE.Vector3(end[0], B1 - TRAIN_DROP, end[1]));
    const length = curve.getLength(), line = { name, color, curve, length, start, end, tangent, normal, angle, stations: [] };
    metroLines.push(line);
    const mid = new THREE.Vector3((start[0] + end[0]) / 2, B1, (start[1] + end[1]) / 2);
    const track = box(8, .3, length, '#3e4c4e', mid.x, B1 - .32, mid.z); track.rotation.y = angle;
    for (const side of [-1, 1]) {
      const rail = box(.13, .15, length, '#a9b7b7', mid.x + Math.cos(angle) * side * 1.7, B1 - .05, mid.z - Math.sin(angle) * side * 1.7);
      rail.rotation.y = angle;
    }
    for (const def of defs) {
      const [x, z, shift, stationName] = def;
      const p = new THREE.Vector3(x, B1, z);
      const center = p.clone().addScaledVector(tangent, shift).addScaledVector(normal, 5);
      center.y = B1;
      origin.copy(center);
      const group = new THREE.Group(); group.position.copy(center); group.rotation.y = angle; scene.add(group);
      const part = (w, h, d, color, lx, y, lz, extra) => box(w, h, d, color, lx, y, lz, group, extra);
      const swap = Math.abs(Math.sin(angle)) > .5;
      const toWorld = (lx, lz) => ({ x: center.x + lx * Math.cos(angle) + lz * Math.sin(angle), z: center.z - lx * Math.sin(angle) + lz * Math.cos(angle) });
      const wall = (lx, lz, w, d, h = 4, y = 2, color = '#8e9a90') => {
        const mesh = part(w, h, d, color, lx, y, lz, true), world = toWorld(lx, lz);
        solids.push({ x: world.x, z: world.z, hw: swap ? d / 2 : w / 2, hd: swap ? w / 2 : d / 2, low: center.y + y - h / 2, high: center.y + y + h / 2, mesh });
        return mesh;
      };
      const invisible = (lx, lz, w, d, low, high) => {
        const world = toWorld(lx, lz);
        solids.push({ x: world.x, z: world.z, hw: swap ? d / 2 : w / 2, hd: swap ? w / 2 : d / 2, low, high });
      };
      // Platform slab, yellow edge, retaining walls and a real ceiling.
      part(6.6, .28, 50, '#aeb5a7', 0, -.14, 0);
      part(6.2, .07, 48, '#9fa99d', 0, .035, 0);
      part(.34, .1, 46, '#e0c37c', -3.06, .09, 0);
      wall(-9.15, 0, .3, 54.3);
      wall(5.65, -15.2, .3, 23.6);
      wall(5.65, 15.2, .3, 23.6);
      wall(-1.75, -27.15, 14.9, .3);
      wall(-1.75, 27.15, 14.9, .3);
      wall(-1.75, 0, 14.9, 54.6, .4, 4.1, '#a9b2a4');
      // Platform screen doors (visual) plus a solid barrier at the platform edge.
      for (const lz of [-14.5, 14.5]) part(.1, 2.6, 21, '#7fa3a3', -3.3, 1.3, lz, { transparent: true, opacity: .42 });
      for (const lz of [-24, -6, 6, 24]) part(.08, 1.5, 2.4, '#8fb3b0', -3.3, 1.9, lz, { transparent: true, opacity: .5 });
      invisible(-3.45, 0, .3, 50, B1, B1 + 2.9);
      // Ticket gates, benches, route map and ceiling lights.
      for (const lz of [-3.4, 3.4]) { part(1.2, .9, .3, '#b9c3b4', 2.6, .45, lz); part(.18, .95, .4, '#d6a06e', 2.2, .48, lz); }
      for (const lz of [-17, -10, 10, 17]) { part(3.4, .5, 1, '#7c8c80', 2.2, .25, lz); part(3.4, .1, .9, '#d4d8c4', 2.2, .55, lz); }
      for (const lz of [-22, -11, 11, 22]) { part(.24, 3.1, .24, '#a8b2a5', 2.9, 1.55, lz); part(1.2, .12, 1.2, '#fff1c2', 2.9, 3.1, lz, true); }
      part(.16, 1.8, 3.4, '#2e4a4c', 5.4, 2.15, -8);
      label(`M · ${stationName}`, 5.3, 2.15, -8, 2.9, group, -Math.PI / 2);
      part(.16, 1.8, 3.4, '#2e4a4c', 5.4, 2.15, 8);
      label(`M · ${line.name}`, 5.3, 2.15, 8, 2.9, group, -Math.PI / 2);
      label(`地铁 · ${stationName}`, 0, 3.5, 26.9, 12, group, Math.PI);
      // Street stairs: platform edge (local 3.3) up to the pavement (local 20).
      const stairStart = center.clone().addScaledVector(normal, 3.3);
      const stairEnd = center.clone().addScaledVector(normal, 20);
      const run = stairStart.distanceTo(stairEnd), steps = Math.max(14, Math.round(run / .95));
      for (let i = 0; i < steps; i++) {
        const q = stairStart.clone().lerp(stairEnd, (i + .5) / steps);
        const step = box(run / steps + .05, .26, 5.2, '#b9c2b2', q.x, B1 + (i + .5) * 7 / steps - .13, q.z);
        step.rotation.y = angle;
      }
      const wellCenter = center.clone().addScaledVector(normal, 11.75);
      for (const side of [-1, 1]) {
        const q = wellCenter.clone().addScaledVector(tangent, side * 3.55);
        const mesh = box(14.6, 7, .3, '#8e9a90', q.x, B1 + 3.5, q.z); mesh.rotation.y = angle;
        solids.push({ x: q.x, z: q.z, hw: swap ? .15 : 7.3, hd: swap ? 7.3 : .15, low: B1, high: 0, mesh });
      }
      const rail = box(.14, 1.05, 15.4, '#6d8177', stairEnd.x, .35, stairEnd.z); rail.rotation.y = angle;
      const landing = box(8, .3, 6.8, '#aeb5a7', stairEnd.x, .02, stairEnd.z); landing.rotation.y = angle;
      label(`地铁 ${stationName}`, stairEnd.x, 3.1, stairEnd.z, 13, scene, angle);
      const ramp = { type: 'metroRamp', start: stairStart, end: stairEnd, width: 5, base: B1, rise: 7 };
      floors.push(ramp);
      const distanceAlong = (x - start[0]) * tangent.x + (z - start[1]) * tangent.z;
      const station = {
        name: stationName, line: line.name,
        t: THREE.MathUtils.clamp((distanceAlong + shift) / length, 0, 1),
        center, normal, angle, entry: stairEnd.clone().setY(0), ramp, point: p,
        stair: { start: stairStart, end: stairEnd, width: 5.2, holeStart: center.clone().addScaledVector(normal, 5.5), holeEnd: stairEnd.clone() },
        stop: p.clone().addScaledVector(tangent, shift),
      };
      line.stations.push(station); stationList.push(station);
    }
    line.stations.sort((a, b) => a.t - b.t);
    return line;
  }
  const origin = new THREE.Vector3();
  metroLine('1号线', '#e28689', [0, -820], [0, 980], [
    [0, -760, 34, '鼓楼'], [0, -420, -24, '珠江路'], [0, 0, -30, '新街口'], [0, 430, 0, '张府园'], [0, 760, 0, '三山街'],
  ]);
  metroLine('2号线', '#b1aaed', [-620, 0], [720, 0], [
    [-500, 0, 20, '上海路'], [0, 0, -36, '新街口'], [430, 0, -24, '大行宫'],
  ]);

  // Tunnels between stations: walls and ceilings with openings where lines cross.
  function tunnel(line, ceilingLift) {
    const zones = line.stations.map(s => s.t).sort((a, b) => a - b), half = 27.2 / line.length;
    const segments = []; let cursor = 0;
    for (const t of zones) { const a = t - half, b = t + half; if (a - cursor > .0005) segments.push([cursor, Math.min(1, a)]); cursor = Math.max(cursor, b); }
    if (cursor < .9995) segments.push([Math.max(0, cursor), 1]);
    const others = metroLines.filter(other => other !== line);
    const tan = new THREE.Vector2(line.tangent.x, line.tangent.z);
    for (const [t0, t1] of segments) {
      const a = line.curve.getPointAt(t0), b = line.curve.getPointAt(t1), m = a.clone().lerp(b, .5); m.y = B1;
      const len = a.distanceTo(b);
      const gaps = [];
      for (const other of others) {
        const oc = new THREE.Vector2((other.start[0] + other.end[0]) / 2, (other.start[1] + other.end[1]) / 2);
        const on = new THREE.Vector2(other.normal.x, other.normal.z), ot = new THREE.Vector2(other.tangent.x, other.tangent.z);
        const denom = tan.x * on.x + tan.y * on.y;
        if (Math.abs(denom) < .01) continue;
        for (const offset of [-4, 10.5]) {
          const base = (m.x - oc.x) * on.x + (m.z - oc.y) * on.y;
          const u = (offset - base) / denom;
          // other line's tunnel extent along our wall
          const along = (m.x + tan.x * u - oc.x) * ot.x + (m.z + tan.z * u - oc.y) * ot.y;
          if (Math.abs(along) > other.length / 2 + 30) continue;
          gaps.push([u - 2.5, u + 2.5]);
        }
      }
      const pieces = (from, to) => {
        let list = [[from, to]];
        for (const [g0, g1] of gaps) {
          list = list.flatMap(([p0, p1]) => {
            if (g1 <= p0 || g0 >= p1) return [[p0, p1]];
            const out = [];
            if (g0 > p0) out.push([p0, Math.min(g0, p1)]);
            if (g1 < p1) out.push([Math.max(g1, p0), p1]);
            return out;
          });
        }
        return list.filter(([p0, p1]) => p1 - p0 > .4);
      };
      const build = (offset, width, height, y, color, useGaps = true) => {
        const list = useGaps ? pieces(-len / 2, len / 2) : [[-len / 2, len / 2]];
        for (const [p0, p1] of list) {
          const u = (p0 + p1) / 2, q = m.clone().addScaledVector(line.normal, offset).addScaledVector(line.tangent, u);
          const mesh = box(width, height, p1 - p0, color, q.x, y, q.z); mesh.rotation.y = line.angle;
          const hw = Math.abs(Math.sin(line.angle)) > .5 ? (p1 - p0) / 2 : width / 2;
          const hd = Math.abs(Math.sin(line.angle)) > .5 ? width / 2 : (p1 - p0) / 2;
          solids.push({ x: q.x, z: q.z, hw, hd, low: y - height / 2, high: y + height / 2, mesh });
        }
      };
      build(-4.15, .3, 5.6, -5.8, '#5c6b68');
      build(10.65, .3, 5.6, -5.8, '#5c6b68');
      build(7.25, 6.6, .3, -7.15, '#8e9a90');
      build(3.25, 14.9, .4, -2.9 + ceilingLift, '#a9b2a4', false);
    }
  }
  tunnel(metroLines[0], 0);
  tunnel(metroLines[1], .06);

  // Only the street stairwells cut the surface; the B1 rooms sit under the road.
  const terrainShape = new THREE.Shape();
  terrainShape.moveTo(bounds.minX, bounds.minZ); terrainShape.lineTo(bounds.maxX, bounds.minZ);
  terrainShape.lineTo(bounds.maxX, bounds.maxZ); terrainShape.lineTo(bounds.minX, bounds.maxZ); terrainShape.closePath();
  for (const station of stationList) {
    const n = station.normal, t = new THREE.Vector3(Math.sin(station.angle), 0, Math.cos(station.angle));
    const corners = [];
    for (const point of [station.stair.holeStart, station.stair.holeEnd]) for (const b of [-3.45, 3.45]) corners.push(point.clone().addScaledVector(t, b));
    const minX = Math.min(...corners.map(p => p.x)) - .5, maxX = Math.max(...corners.map(p => p.x)) + .5;
    const minZ = Math.min(...corners.map(p => p.z)) - .5, maxZ = Math.max(...corners.map(p => p.z)) + .5;
    const hole = new THREE.Path(); hole.moveTo(minX, minZ); hole.lineTo(minX, maxZ); hole.lineTo(maxX, maxZ); hole.lineTo(maxX, minZ); hole.closePath();
    terrainShape.holes.push(hole);
  }
  const terrainGeometry = new THREE.ShapeGeometry(terrainShape); terrainGeometry.rotateX(Math.PI / 2);
  const terrainMesh = new THREE.Mesh(terrainGeometry, material('#8d9d79', { side: THREE.DoubleSide })); terrainMesh.position.y = -.16; scene.add(terrainMesh);
  box(400, .18, 2500, '#d7c29c', 1324, -.15, 0);

  // Building lots follow the road hierarchy, leaving campus, plazas and stations clear.
  const reserved = (x, z, w = 0, d = 0) => {
    const inRect = (x1, z1, x2, z2) => x > x1 - w / 2 && x < x2 + w / 2 && z > z1 - d / 2 && z < z2 + d / 2;
    if (inRect(-486, -716, -144, -444)) return true;
    if (inRect(-158, -678, -82, -622)) return true;
    if (inRect(66, 48, 134, 126)) return true;
    if (inRect(-142, -136, -78, -48)) return true;
    if (inRect(470, -224, 724, -28)) return true;
    if (inRect(238, 786, 424, 890)) return true;
    if (inRect(12, -798, 168, -682)) return true;
    if (inRect(748, 62, 904, 226)) return true;
    if (inRect(-46, -46, 134, 134)) return true;
    if (inRect(-178, 122, -122, 178)) return true;
    if (inRect(-80, 300, -40, 340)) return true;
    if (inRect(100, 460, 140, 500)) return true;
    if (inRect(-120, -320, -80, -280)) return true;
    if (inRect(46, 136, 74, 164)) return true;
    if (inRect(-110, 350, -50, 450)) return true;
    const lakeD = ((x - 650) / 430) ** 2 + ((z + 1000) / 250) ** 2; if (lakeD < 1.15) return true;
    if (z > 860 && z < 950 && x > -1020 && x < 1100) return true;
    if (stationList.some(s => Math.hypot(x - s.entry.x, z - s.entry.z) < 62)) return true;
    if (busDepots.some(d => Math.hypot(x - d.x, z - d.z) < d.r)) return true;
    if ([[140, -660], [-46, -760], [-46, -420], [-46, 70], [500, 36], [790, 140]].some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 46)) return true;
    return false;
  };
  let seed = 49; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const palettes = ['#c7b8a5', '#cdb9ab', '#aebdb5', '#b7bdba', '#c1aa99', '#d9c9ac'];
  const facades = palettes.map(color => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
    for (let x = 5; x < 128; x += 24) for (let y = 7; y < 128; y += 27) { ctx.fillStyle = rand() > .12 ? '#50747e' : '#dcd095'; ctx.fillRect(x, y, 13, 18); }
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map, roughness: .9 });
  });
  const instances = facades.map(m => new THREE.InstancedMesh(cube, m, 520)), counts = facades.map(() => 0);
  const matrix = new THREE.Matrix4();
  function building(x, z, w, d, h, kind = 0) {
    const p = Math.floor(rand() * 6);
    matrix.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
    instances[p].setMatrixAt(counts[p]++, matrix);
    solids.push({ x, z, hw: w / 2, hd: d / 2, low: 0, high: h });
    buildings.push({ x, z, w, d, h });
    if (kind === 1) box(w + 1, .7, d + 1, '#d8d1bb', x, h, z);
    if (kind === 2) { const roof = new THREE.Mesh(new THREE.ConeGeometry(w * .72, 6, 4), material('#8c7768')); roof.position.set(x, h + 2, z); roof.rotation.y = Math.PI / 4; scene.add(roof); }
  }
  for (let attempt = 0; attempt < 8000 && buildings.length < 440; attempt++) {
    const x = -1120 + rand() * 2240, z = -1220 + rand() * 2440;
    const w = 22 + rand() * 30, d = 22 + rand() * 28;
    if (reserved(x, z, w, d)) continue;
    let near = null, nd = Infinity;
    for (const r of roads) { const dist = distanceToSegment(x, z, r.a, r.b); if (dist.distance < nd) { nd = dist.distance; near = r; } }
    if (!near) continue;
    if (nd < near.width / 2 + 6 + Math.hypot(w, d) / 2) continue;
    if (nd > 130) continue;
    if (buildings.some(b => Math.abs(b.x - x) < (b.w + w) / 2 + 6 && Math.abs(b.z - z) < (b.d + d) / 2 + 6)) continue;
    const center = Math.hypot(x, z), oldTown = z > 500 && Math.hypot(x, z - 700) < 500;
    const downtown = center < 260;
    const h = downtown ? 38 + rand() * 108 : center < 480 ? 16 + rand() * 46 : oldTown ? 7 + rand() * 14 : 10 + rand() * 28;
    building(x, z, w, d, h, oldTown ? 2 : downtown ? 1 : (attempt % 3));
  }
  for (let i = 0; i < instances.length; i++) { instances[i].count = counts[i]; instances[i].instanceMatrix.needsUpdate = true; instances[i].computeBoundingSphere(); scene.add(instances[i]); }

  const treeCount = 420, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.5, .8, 7, 6), material('#897459'), treeCount), crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4, 0), material('#4f795c'), treeCount);
  let placed = 0;
  while (placed < treeCount) {
    const x = -1120 + rand() * 2240, z = -1220 + rand() * 2440;
    if (reserved(x, z) || buildings.some(b => Math.abs(x - b.x) < b.w / 2 + 5 && Math.abs(z - b.z) < b.d / 2 + 5)) continue;
    if (roads.some(r => distanceToSegment(x, z, r.a, r.b).distance < r.width / 2 + 5)) continue;
    matrix.compose(new THREE.Vector3(x, 3.5, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); trunks.setMatrixAt(placed, matrix);
    matrix.setPosition(x, 8, z); crowns.setMatrixAt(placed, matrix); placed++;
  }
  scene.add(trunks, crowns);

  // Bus depots (visual yards; stop positions are matched in vehicles.js).
  for (const depot of busDepots) {
    box(depot.r * 1.5, .15, depot.r * 1.2, '#566468', depot.x, .04, depot.z);
    for (let i = -2; i <= 2; i++) box(.2, .03, 28, '#c9c5a8', depot.x + i * 12, .14, depot.z);
    box(30, 4, 10, '#a2b3ab', depot.x, 2, depot.z + 34, scene, true);
    label(depot.name, depot.x, 8, depot.z + 34, 36);
  }

  const places = [
    { name: store.name, x: 100, z: 96, interior: true },
    { name: bank.name, x: -110, z: -70, interior: true },
    { name: hotel.name, x: -120, z: -626, interior: true },
    { name: library.name, x: -250, z: -633, interior: true },
    ...towers.map(t => t.food
      ? { name: `${t.name} · 美食档 ${t.levels}F`, x: t.x, z: t.z - t.d / 2 + 7.4, interior: true }
      : { name: t.name, x: t.x, z: t.z + t.d / 2 + 3, interior: true }),
    ...stationList.map(s => ({ name: `地铁 ${s.line} · ${s.name}`, x: s.entry.x, z: s.entry.z })),
    ...districts.map(d => ({ name: d.name, x: d.x, z: d.z })),
  ];

  return { box, solid, label, material, solids, floors, interactables, buildings, roads, nodes, stations: stationList, metroLines, hotel, lift: liftState, places, water, campusGround, terrainMesh, towers, helipad, airstrip };
}

export function distanceToSegment(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, len = dx * dx + dz * dz;
  const t = len ? THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / len, 0, 1) : 0;
  const px = a.x + t * dx, pz = a.z + t * dz;
  return { distance: Math.hypot(x - px, z - pz), t, x: px, z: pz };
}

export function findRoute(world, start, end) {
  const nearest = p => world.nodes.reduce((best, n) => Math.hypot(n.x - p.x, n.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? n : best, world.nodes[0]);
  const a = nearest(start), b = nearest(end);
  const cost = new Map([[a.id, 0]]), previous = new Map(), open = new Set([a.id]);
  while (open.size) {
    const id = [...open].reduce((best, n) => (cost.get(n) ?? Infinity) < (cost.get(best) ?? Infinity) ? n : best);
    open.delete(id);
    if (id === b.id) break;
    for (const next of world.nodes[id].links) {
      const n = world.nodes[next], c = cost.get(id) + Math.hypot(n.x - world.nodes[id].x, n.z - world.nodes[id].z);
      if (c < (cost.get(next) ?? Infinity)) { cost.set(next, c); previous.set(next, id); open.add(next); }
    }
  }
  const path = [b]; let id = b.id;
  while (previous.has(id)) { id = previous.get(id); path.unshift(world.nodes[id]); }
  return path;
}
