import * as THREE from 'three';
import './style.css';
import './phone.css';
import './sandbox.css';
import { createWorld, bounds, districts, distanceToSegment, findRoute } from './world.js';
import { createVehicles } from './vehicles.js';

const $ = id => document.getElementById(id), canvas = $('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c3ccbf');
scene.fog = new THREE.FogExp2('#c3ccbf', .00075);
scene.add(new THREE.HemisphereLight('#d5e5e7', '#8e9172', 2.6));
const sun = new THREE.DirectionalLight('#ffe0ad', 2.8);
sun.position.set(-400, 800, 300);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(58, 1, .1, 4300);
const world = createWorld(scene), transport = createVehicles(world, scene);
const player = { position: new THREE.Vector3(26, 0, 40), yaw: 0, vy: 0, grounded: true, health: 100, wallet: 500, goods: 0, tools: 3, ammo: 72, weapon: 0, wanted: 0, escape: 0, arrest: 0 };
const avatar = transport.person('#e5d9b9');
avatar.position.copy(player.position);
const keys = new Set();
let driven = null, ridden = null, phoneOpen = false, phonePage = 'home', yaw = .35, pitch = .3, distance = 12, drag = null, aim = false, elapsed = 0, lastShot = -10, lastCrime = -10, nearest = null, hiddenHUD = false, destination = null, mapZoom = 1, mapCenter = { x: 0, z: 0 }, taxi = null, busJob = null, travel = 0, stationIndex = -1, touchPrying = false, busDwell = 0, lastBusStop = -1, lastHUD = 0;
const shots = [], police = [], trains = [];
const clock = new THREE.Clock();
const gameEl = $('game');
const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const mobileFire = $('mobile-fire');
let started = false;
if (isTouch) gameEl.classList.add('touch');

function toast(text) {
  $('toast').textContent = text; $('toast').classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('visible'), 3300);
}
function focus() { started = true; canvas.focus({ preventScroll: true }); $('play-prompt').hidden = true; }
async function enterImmersive() {
  try {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    }
  } catch (error) {}
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (error) {}
  updateOrientation();
}
function updateOrientation() {
  const overlay = $('rotate-overlay'); if (!overlay) return;
  const portrait = isTouch && innerHeight > innerWidth * 1.02;
  overlay.hidden = !portrait;
  if (portrait) $('play-prompt').hidden = true;
  else if (!started) $('play-prompt').hidden = false;
}
addEventListener('resize', updateOrientation);
addEventListener('orientationchange', () => setTimeout(updateOrientation, 150));
if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(updateOrientation, 150));

function addPage(id, name, icon, html) {
  const app = document.createElement('button'); app.dataset.app = id;
  app.innerHTML = `<span class="app-icon app-map">${icon}</span>${name}`;
  document.querySelector('.phone-apps').append(app);
  const section = document.createElement('section');
  section.dataset.page = id; section.hidden = true; section.innerHTML = html;
  document.querySelector('.phone-content').append(section);
}
document.querySelector('#phone-mission-slot').append(document.querySelector('.activity'));
document.querySelector('.activity').hidden = true;
addPage('places', '地点', '◇', '<div class="phone-section-label">城市地点</div><div id="places-list" class="destination-list"></div>');
addPage('transit', '公交', '▤', '<div class="phone-section-label">01 · 金陵公交</div><div id="bus-list" class="destination-list"></div><button id="bus-apply" class="primary-button">应聘临时驾驶员</button><p id="bus-state" class="phone-hint"></p>');
addPage('taxi', '打车', '↗', '<div class="phone-section-label">COAST CAB</div><p class="phone-hint">在地图上选择目的地，出租车会沿道路来接你。到车旁按 E 上车乘坐，车费预付。</p><button id="taxi-pick" class="phone-secondary">打开地图选目的地</button><div id="taxi-info" class="order-card"></div><button id="taxi-call" class="primary-button">呼叫出租车</button><button id="taxi-cancel" class="phone-secondary">取消叫车</button>');
addPage('cheats', '沙盒工具', '✦', '<div class="phone-section-label">沙盒工具</div><div id="cheat-summary" class="wallet-card"></div><button data-cheat="cash" class="phone-secondary">获取 $10,000</button><button data-cheat="resources" class="phone-secondary">获取物资与撬锁工具</button><button data-cheat="weapons" class="phone-secondary">全部武器与 999 发弹药</button><button data-cheat="heal" class="phone-secondary">恢复生命</button><button data-cheat="wanted" class="phone-secondary">清除通缉</button><button data-cheat="car" class="phone-secondary">附近生成共享跑车</button>');
document.querySelector('[data-page="help"]').innerHTML = '<div class="phone-section-label">自由行动</div><div class="help-grid"><kbd>WASD / 方向键</kbd><span>步行 / 驾驶</span><kbd>E</kbd><span>交互 / 驾驶 / 乘坐 / 下车</span><kbd>F 按住</kbd><span>撬锁（手机点交互按钮）</span><kbd>Shift / Space</kbd><span>奔跑加速 / 跳跃手刹</span><kbd>1 / 2 / 3</kbd><span>徒手 / 手枪 / 冲锋枪</span><kbd>右键移动 / 左键</kbd><span>瞄准 / 射击</span><kbd>P / M / Esc</kbd><span>手机 / 地图 / 返回游戏</span></div><p class="phone-hint">建筑、地铁入口都可直接走入，没有过场。公交停车开门时靠近按 E 乘坐；停放车辆按 E 驾驶。手机竖屏会提示旋转，横屏时自动请求全屏。</p>';
document.querySelector('[data-page="missions"]').innerHTML = '<div class="phone-section-label">街头生活</div><p class="phone-hint">这一版以连续城市和交通为主：可以乘公交、坐地铁、叫出租车，探索便利店仓库和银行金库，或在校园里等待后续任务。旧版配送任务未接入新地图。</p>';
document.querySelector('#phone-reset').textContent = '↺ 回到新街口';
const titles = { home: 'JINLING OS', map: '城市地图', places: '城市地点', transit: '公交 01', taxi: 'COAST CAB', cheats: '沙盒工具', help: '操作指南', missions: '街头生活', settings: '设置' };

const actionHUD = document.createElement('button'); actionHUD.className = 'world-prompt'; actionHUD.id = 'world-prompt'; actionHUD.hidden = true; gameEl.append(actionHUD);
const statusHUD = document.createElement('div'); statusHUD.className = 'combat-hud'; statusHUD.innerHTML = '<span id="health-label"></span><button id="weapon-cycle"></button><span id="ammo-label"></span>'; gameEl.append(statusHUD);
const crosshair = document.createElement('div'); crosshair.className = 'crosshair'; crosshair.textContent = '+'; crosshair.hidden = true; gameEl.append(crosshair);
const locationHUD = document.createElement('div'); locationHUD.className = 'interior-location'; locationHUD.hidden = true; gameEl.append(locationHUD);
const liftPanel = document.createElement('div'); liftPanel.className = 'elevator-panel'; liftPanel.hidden = true;
liftPanel.innerHTML = '<strong>RIVIERA · 电梯</strong><p>平台会实际升降，请站在平台内</p>';
for (let f = 0; f < 4; f++) { const b = document.createElement('button'); b.textContent = `${f + 1}F · ${f ? '客房' : '大堂'}`; b.onclick = () => { world.lift.target = f * 4; world.lift.moving = true; liftPanel.hidden = true; focus(); }; liftPanel.append(b); }
const closeLift = document.createElement('button'); closeLift.textContent = '关闭'; closeLift.onclick = () => { liftPanel.hidden = true; focus(); }; liftPanel.append(closeLift); gameEl.append(liftPanel);

function showPage(page) {
  phonePage = page;
  document.querySelectorAll('[data-page]').forEach(el => { el.hidden = el.dataset.page !== page; });
  $('phone-page-title').textContent = titles[page];
  $('phone-back').style.visibility = page === 'home' ? 'hidden' : 'visible';
  refreshPhone(); drawMaps();
}
function openPhone(page = 'home') { phoneOpen = true; keys.clear(); $('phone').hidden = false; gameEl.classList.add('phone-open'); $('play-prompt').hidden = true; showPage(page); $('phone-close').focus(); }
function closePhone() { phoneOpen = false; keys.clear(); $('phone').hidden = true; gameEl.classList.remove('phone-open'); focus(); }
function list(id, items, callback) {
  $(id).replaceChildren(...items.map(item => {
    const b = document.createElement('button'); b.className = 'destination';
    b.innerHTML = '<span class="destination-icon">◇</span><span>' + item.name + '</span><b>↗</b>';
    b.onclick = () => callback(item); return b;
  }));
}
function estimateFare() { return destination ? Math.round(20 + routeLength(findRoute(world, player.position, destination)) * .055) : 0; }
function routeLength(route) { let total = 0; for (let i = 1; i < route.length; i++) total += Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z); return total; }
function refreshPhone() {
  $('phone-time').textContent = $('clock').textContent;
  $('phone-distance').innerHTML = `${(travel / 1000).toFixed(1)} <small>KM</small>`;
  $('phone-location').textContent = `余额 $${player.wallet} · 物资 ${player.goods}`;
  $('phone-badge').hidden = true;
  list('places-list', world.places, p => { destination = { ...p }; mapCenter = { x: p.x, z: p.z }; showPage('map'); });
  list('map-destinations', world.places.slice(0, 9), p => { destination = { ...p }; refreshPhone(); drawMaps(); });
  list('bus-list', transport.busStops, p => { destination = { ...p }; showPage('map'); });
  $('navigation-label').textContent = destination ? `${destination.name} · ${Math.round(destination.x)}, ${Math.round(destination.z)}` : '点击地图选择任意目的地';
  $('clear-navigation').hidden = !destination;
  $('bus-state').textContent = busJob ? `当前下一站：${transport.busStops[busJob.next].name} · 停稳开门 8 秒，每站 $60，完成 +$300` : '到鼓楼公交场领取共享公交，也可以乘坐运行中的公交。';
  $('bus-apply').textContent = busJob ? '取消当前班次' : '应聘临时驾驶员';
  const fare = estimateFare();
  $('taxi-info').innerHTML = `<p>${taxi ? taxi.state === 'pickup' ? '车辆正在接你' : taxi.state === 'waiting' ? '出租车已到，靠近按 E 上车' : taxi.state === 'trip' ? '乘坐中 · 按 E 可提前结束' : '已抵达' : destination ? destination.name : '请先在地图选目的地'}</p><strong>${taxi ? '已预付 $' + taxi.fare : '预估 $' + fare}</strong>`;
  $('taxi-call').disabled = !destination || !!taxi || player.wallet < fare;
  $('cheat-summary').innerHTML = `余额 $${player.wallet}<br>物资 ${player.goods} · 工具 ${player.tools}<br>生命 ${player.health} · 弹药 ${player.ammo}`;
}
function crime(text, level = 1) {
  if (elapsed - lastCrime < 4) return;
  lastCrime = elapsed;
  player.wanted = Math.min(3, player.wanted + level); player.escape = 0;
  toast(`${text} · ${player.wanted} 星通缉`);
  for (let i = 0; i < player.wanted; i++) {
    const node = world.nodes.reduce((best, n) => Math.abs(Math.hypot(n.x - player.position.x, n.z - player.position.z) - 190) < Math.abs(Math.hypot(best.x - player.position.x, best.z - player.position.z) - 190) ? n : best, world.nodes[0]);
    let v = police[i];
    if (!v) { v = transport.create('police', node.x + i * 6, node.z, '#dce1d6', { ai: true }); police.push(v); }
    v.group.visible = true; v.group.position.set(node.x + i * 6, .15, node.z); v.lastSeen = player.position.clone(); v.repath = 0;
  }
}
function collision(x, z, y, radius = .4) {
  if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || z > bounds.maxZ - radius) return true;
  return world.solids.some(s => !s.disabled && y + 1.65 > s.low + .05 && y + .15 < s.high && Math.abs(x - s.x) < s.hw + radius && Math.abs(z - s.z) < s.hd + radius);
}
function move(position, dx, dz, r = .4) {
  let hit = false; const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .6));
  for (let i = 0; i < steps; i++) {
    if (!collision(position.x + dx / steps, position.z, position.y, r)) position.x += dx / steps; else hit = true;
    if (!collision(position.x, position.z + dz / steps, position.y, r)) position.z += dz / steps; else hit = true;
  }
  return hit;
}
function groundAt(pos) {
  let height = 0;
  const metro = world.stations.find(s => {
    const relative = pos.clone().sub(s.center), lx = relative.dot(s.normal), lz = relative.x * Math.sin(s.angle) + relative.z * Math.cos(s.angle);
    return Math.abs(lx) < 4.5 && Math.abs(lz) < 26;
  });
  if (metro) { stationIndex = world.stations.indexOf(metro); if (pos.y < -.4) height = -7; }
  else stationIndex = -1;
  for (const f of world.floors) {
    if (f.type === 'metroRamp') {
      const p = distanceToSegment(pos.x, pos.z, f.start, f.end);
      if (p.distance < f.width / 2 && pos.y < 2) height = f.base + p.t * f.rise;
    } else if (f.type === 'ramp') {
      if (Math.abs(pos.x - f.x) < f.hw && Math.abs(pos.z - f.z) < f.hd) {
        const h = f.base + (f.direction * (pos.z - f.z) + f.hd) / (2 * f.hd) * f.rise;
        if (Math.abs(h - pos.y) < .65) height = h;
      }
    } else if (Math.abs(pos.x - f.x) < f.hw && Math.abs(pos.z - f.z) < f.hd && f.y <= pos.y + .32) height = Math.max(height, f.y);
  }
  const lift = world.lift;
  if (Math.abs(pos.x - lift.x) < 2.5 && Math.abs(pos.z - lift.z) < 2.5 && Math.abs(pos.y - lift.y) < .65) height = lift.y;
  return height;
}
function nearby() {
  if (driven || ridden) return null;
  let best = null, d = 4;
  for (const a of world.interactables) {
    if (a.taken || Math.abs(player.position.y - (a.y || 0)) > 2) continue;
    const dist = Math.hypot(a.x - player.position.x, a.z - player.position.z);
    if (dist < d) { d = dist; best = { kind: 'action', item: a }; }
  }
  for (const v of transport.vehicles) {
    if (v.type === 'police' || v.type === 'metro') continue;
    const dist = Math.hypot(v.group.position.x - player.position.x, v.group.position.z - player.position.z);
    if (dist < Math.max(d, v.type === 'bus' ? 6 : 3.7) && Math.abs(player.position.y - v.group.position.y) < 2) {
      if (v.ai && v.type !== 'bus' && v !== (taxi && taxi.vehicle)) continue;
      if (v.type === 'bus' && v.ai && !v.doors) continue;
      d = dist; best = { kind: 'vehicle', item: v };
    }
  }
  if (stationIndex >= 0) for (const train of trains) if (train.station === stationIndex && train.dwell > 0) best = { kind: 'train', item: train };
  return best;
}
function interact() {
  if (phoneOpen) return;
  if (driven || ridden) {
    const v = driven || ridden;
    if (Math.abs(v.speed) > 1.5) { toast('车辆行驶中，请等待停稳'); return; }
    if (v.type === 'metro' && !v.doors) { toast('请等待列车到站开门'); return; }
    let pos;
    if (v.type === 'metro') { const s = world.stations[v.station]; pos = s.center.clone(); pos.y = -7; }
    else {
      pos = v.group.position.clone(); pos.x += Math.cos(v.yaw) * (v.w / 2 + 1.2); pos.z -= Math.sin(v.yaw) * (v.w / 2 + 1.2); pos.y = 0;
      if (collision(pos.x, pos.z, 0)) { toast('这一侧空间不足'); return; }
    }
    player.position.copy(pos);
    if (taxi && taxi.vehicle === v) { taxi.state = 'done'; taxi = null; }
    driven = null; ridden = null; avatar.visible = true; distance = 12; return;
  }
  const near = nearby(); if (!near) return;
  if (near.kind === 'train') { ridden = near.item; avatar.visible = false; toast('已登车 · 到站开门后按 E 下车'); return; }
  if (near.kind === 'vehicle') {
    const v = near.item;
    if (taxi && taxi.vehicle === v) {
      if (taxi.state !== 'waiting') return;
      ridden = v; taxi.state = 'trip'; v.route = findRoute(world, v.group.position, taxi.destination); v.routeIndex = 0;
      avatar.visible = false; toast('出租车出发 · 已预付车费'); return;
    }
    if (v.type === 'bus' && v.ai) { ridden = v; avatar.visible = false; toast('已乘公交 · 到站停车后按 E 下车'); return; }
    driven = v; v.ai = false; avatar.visible = false; distance = v.type === 'bus' ? 22 : 15;
    if (!v.shared && !v.stolen) { v.stolen = true; crime('车辆失窃'); }
    return;
  }
  const a = near.item;
  if (a.type === 'door') {
    if (a.locked) toast('按住 F 撬锁 · 手机可点交互按钮');
    else { a.opened = !a.opened; a.collision.disabled = a.opened; a.group.rotation.y = a.opened ? Math.PI / 2 : 0; }
  } else if (a.type === 'goods') { a.taken = true; a.mesh.visible = false; player.goods++; crime('商店失窃'); }
  else if (a.type === 'shop') { if (player.wallet < 30) toast('余额不足'); else { player.wallet -= 30; player.health = 100; player.ammo += 24; toast('补给完成'); } }
  else if (a.type === 'loot' || a.type === 'vault') {
    if (a.door.locked) toast('先撬开门锁');
    else if (!a.taken) {
      a.taken = true;
      if (a.type === 'vault') { player.wallet += 2500; crime('银行金库报警', 2); toast('获得 $2,500 · 银行报警'); }
      else { player.goods += 10; crime('仓库失窃'); toast('物资 +10'); }
    }
  } else if (a.type === 'lift') { liftPanel.hidden = false; keys.clear(); }
  else if (a.type === 'info') toast(a.message);
}
function fire() {
  if (!player.weapon || driven || ridden || phoneOpen || elapsed - lastShot < (player.weapon === 1 ? .3 : .1) || !player.ammo) return;
  lastShot = elapsed; player.ammo--; crime('目击武器开火');
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(), camera);
  const origin = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  const hits = ray.intersectObjects(world.solids.filter(s => s.mesh && !s.disabled).map(s => s.mesh), false);
  let end = ray.ray.at(130, new THREE.Vector3());
  if (hits[0] && hits[0].distance < 130) end = hits[0].point;
  for (const v of police) {
    if (!v.group.visible) continue;
    const p = v.group.position.clone().add(new THREE.Vector3(0, 1, 0));
    if (ray.ray.distanceToPoint(p) < 2.3 && ray.ray.origin.distanceTo(p) < end.distanceTo(ray.ray.origin)) { v.damage++; if (v.damage >= 6) v.group.visible = false; }
  }
  const mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, end]), new THREE.LineBasicMaterial({ color: '#ffe2a3' }));
  scene.add(mesh); shots.push({ mesh, life: .08 });
}

// Physical metro lines with real station order; trains reverse at termini.
for (const line of world.metroLines) {
  const first = line.stations[0];
  const v = transport.create('metro', first.center.x, first.center.z, '#a7c0ba', { ai: true, line, t: first.t, next: 1, dir: 1, pendingNext: 1, dwell: 6, station: world.stations.indexOf(first), speed: 0, doors: 1 });
  v.door.visible = false; trains.push(v);
}
function updateTrains(dt) {
  for (const v of trains) {
    const line = v.line;
    if (v.dwell > 0) {
      v.dwell -= dt; v.speed = 0; v.doors = 1; v.door.visible = false;
      if (v.dwell <= 0) {
        v.doors = 0; v.door.visible = true; v.station = null; v.next = v.pendingNext;
        if (v.next < 0 || v.next >= line.stations.length) { v.dir *= -1; v.next = THREE.MathUtils.clamp(v.next + v.dir * 2, 0, line.stations.length - 1); }
      }
    } else {
      const st = line.stations[v.next];
      if (!st) { v.dir *= -1; v.next = THREE.MathUtils.clamp(v.next + v.dir * 2, 0, line.stations.length - 1); }
      else {
        const remaining = (st.t - v.t) * v.dir * line.length;
        if (remaining <= 1.2) {
          v.t = st.t; v.speed = 0; v.dwell = 12; v.doors = 1; v.door.visible = false; v.station = world.stations.indexOf(st);
          let n = v.next + v.dir;
          if (n < 0 || n >= line.stations.length) { v.dir *= -1; n = v.next + v.dir; }
          v.pendingNext = n;
        } else {
          const speed = Math.min(20, Math.max(3, Math.sqrt(Math.max(0, remaining) * 1.7)));
          v.speed = speed;
          v.t = THREE.MathUtils.clamp(v.t + v.dir * speed * dt / line.length, 0, 1);
        }
      }
    }
    const p = line.curve.getPointAt(v.t), t = line.curve.getTangentAt(v.t);
    v.group.position.copy(p); v.yaw = Math.atan2(-t.x, -t.z); v.group.rotation.y = v.yaw;
  }
}
function nearestRoad(pos) { return world.roads.map(r => ({ ...distanceToSegment(pos.x, pos.z, r.a, r.b), road: r })).sort((a, b) => a.distance - b.distance)[0]; }
function updateTaxi(dt) {
  if (!taxi) return;
  const v = taxi.vehicle;
  if (taxi.state === 'pickup') {
    if (transport.moveRoute(v, dt, 20)) { v.speed = 0; v.doors = 1; taxi.state = 'waiting'; toast('出租车已到 · 到车旁按 E 上车'); }
  } else if (taxi.state === 'trip') {
    if (transport.moveRoute(v, dt, 22)) { v.speed = 0; v.doors = 1; taxi.state = 'arrived'; toast('已抵达目的地 · 按 E 下车'); }
  }
}
function updatePlayer(dt) {
  if (driven) {
    const v = driven;
    const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const steer = Number(keys.has('KeyA') || keys.has('ArrowLeft')) - Number(keys.has('KeyD') || keys.has('ArrowRight'));
    v.speed += forward * (forward * v.speed < 0 ? 25 : 12) * dt;
    if (!forward) v.speed *= Math.exp(-dt * .5);
    if (keys.has('Space')) v.speed *= Math.exp(-dt * 3);
    v.speed = THREE.MathUtils.clamp(v.speed, -9, v.type === 'bus' ? 23 : keys.has('ShiftLeft') ? 65 : 43);
    v.yaw += steer * Math.min(Math.abs(v.speed) / 6, 1) * Math.sign(v.speed) * (v.type === 'bus' ? .6 : 1.05) * dt;
    v.group.rotation.y = v.yaw;
    const before = v.group.position.clone();
    if (move(v.group.position, -Math.sin(v.yaw) * v.speed * dt, -Math.cos(v.yaw) * v.speed * dt, v.w * .55)) v.speed *= -.15;
    travel += before.distanceTo(v.group.position);
    player.position.copy(v.group.position);
    v.wheels.forEach(w => { w.rotation.x -= v.speed * dt; });
  } else if (ridden) {
    player.position.copy(ridden.group.position);
    yaw += Math.atan2(Math.sin(ridden.yaw - yaw), Math.cos(ridden.yaw - yaw)) * dt * .6;
  } else {
    const dir = new THREE.Vector3(
      Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), 0,
      Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'))
    );
    if (dir.lengthSq()) {
      dir.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
      const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 10 : 4.5;
      move(player.position, dir.x * speed * dt, dir.z * speed * dt);
      travel += speed * dt; player.yaw = Math.atan2(-dir.x, -dir.z);
    }
    if (keys.has('Space') && player.grounded) { player.vy = 7; player.grounded = false; }
    const ground = groundAt(player.position);
    player.vy -= 20 * dt; player.position.y += player.vy * dt;
    if (player.position.y <= ground + .15 && player.vy <= 0) { player.position.y = ground; player.vy = 0; player.grounded = true; }
    avatar.position.copy(player.position); avatar.rotation.y = player.yaw;
  }
  const lift = world.lift;
  if (lift.moving) {
    const delta = THREE.MathUtils.clamp(lift.target - lift.y, -dt * 1.7, dt * 1.7);
    if (!driven && !ridden && Math.abs(player.position.x - lift.x) < 2.5 && Math.abs(player.position.z - lift.z) < 2.5 && Math.abs(player.position.y - lift.y) < .5) player.position.y += delta;
    lift.y += delta; lift.mesh.position.y = lift.y - .1;
    if (Math.abs(lift.target - lift.y) < .01) lift.moving = false;
  }
  const a = nearby();
  const door = a && a.kind === 'action' && a.item.type === 'door' && a.item.locked ? a.item : null;
  if (!door) touchPrying = false;
  if (door) {
    const prying = keys.has('KeyF') || touchPrying;
    if (prying) {
      if (!player.tools) { toast('没有撬锁工具 · 手机沙盒工具可获取'); touchPrying = false; keys.delete('KeyF'); }
      else {
        door.progress += dt;
        actionHUD.textContent = `撬锁 ${Math.round(door.progress / (door.vault ? 8 : 4) * 100)}%`;
        if (door.progress >= (door.vault ? 8 : 4)) {
          player.tools--; door.locked = false; door.opened = true; door.collision.disabled = true; door.group.rotation.y = Math.PI / 2;
          crime(door.vault ? '银行安全门被撬开' : '仓库门被撬开', door.vault ? 2 : 1);
          touchPrying = false; toast('门锁已打开，可直接走入');
        }
      }
    } else door.progress = Math.max(0, door.progress - dt * .4);
  }
}
function lineVisible(a, b) {
  const dist = a.distanceTo(b), steps = Math.ceil(dist / 4);
  for (let i = 1; i < steps; i++) { const p = a.clone().lerp(b, i / steps); if (collision(p.x, p.z, p.y, .1)) return false; }
  return true;
}
function updatePolice(dt) {
  let seen = false, close = Infinity;
  for (const v of police) {
    if (!v.group.visible || !player.wanted) continue;
    const p = v.group.position, d = p.distanceTo(player.position);
    close = Math.min(close, d);
    const sees = d < 110 && player.position.y > -3 && lineVisible(p, player.position);
    if (sees) { seen = true; v.lastSeen.copy(player.position); }
    v.repath -= dt;
    if (v.repath <= 0) {
      let end = v.lastSeen.clone();
      if (!sees) { end.x += Math.sin(elapsed * .2) * 90; end.z += Math.cos(elapsed * .2) * 90; }
      v.route = findRoute(world, p, end); v.routeIndex = 0; v.repath = 2;
    }
    if (d < 45 && sees) {
      const dx = player.position.x - p.x, dz = player.position.z - p.z, len = Math.hypot(dx, dz);
      if (len > 3) { move(p, dx / len * dt * 17, dz / len * dt * 17, 1.2); v.yaw = Math.atan2(-dx, -dz); v.group.rotation.y = v.yaw; }
    } else transport.moveRoute(v, dt, 23 + player.wanted * 3);
  }
  if (!player.wanted) return;
  player.escape = seen ? 0 : player.escape + dt;
  player.arrest = close < 6 && Math.abs(driven ? driven.speed : 0) < 2 ? player.arrest + dt : Math.max(0, player.arrest - dt * 2);
  if (player.escape >= 20) { player.wanted = 0; player.escape = 0; police.forEach(v => { v.group.visible = false; }); toast('已摆脱警方搜索'); }
  if (player.arrest >= 5) {
    player.wallet = Math.max(0, player.wallet - player.wanted * 150); player.wanted = 0; player.arrest = 0;
    driven = null; ridden = null; avatar.visible = true; police.forEach(v => { v.group.visible = false; });
    toast('被截停，已扣除罚款');
  }
  $('wanted-label').textContent = seen ? '追踪中 · 躲开视线' : `搜索中 · ${Math.ceil(20 - player.escape)}s`;
}
function updateBusJob(dt) {
  if (!driven || driven.type !== 'bus') return;
  const i = transport.busStops.findIndex(s => Math.hypot(s.x - player.position.x, s.z - player.position.z) < 24);
  if (i >= 0 && Math.abs(driven.speed) < 1) {
    if (lastBusStop !== i) { lastBusStop = i; transport.openDoors(driven, i); busDwell = 0; }
    if (busJob && busJob.next === i) {
      busDwell += dt;
      if (busDwell >= 8) {
        player.wallet += 60; busJob.next++; busDwell = 0;
        if (busJob.next >= 6) { player.wallet += 300; busJob = null; destination = null; toast('公交班次完成 · 总收入 $660'); }
        else { destination = transport.busStops[busJob.next]; toast('停靠完成 +$60'); }
      }
    }
  } else { lastBusStop = -1; busDwell = 0; driven.doors = 0; driven.door.visible = true; }
}
function updateCamera(dt) {
  const target = player.position.clone().add(new THREE.Vector3(0, ridden && ridden.type === 'metro' ? 2 : 1.4, 0));
  const indoors = world.places.some(p => p.interior && Math.hypot(p.x - player.position.x, p.z - player.position.z) < 70) && !driven && !ridden;
  const camDistance = ridden && ridden.type === 'metro' ? 6 : indoors ? 5.5 : distance;
  const desired = target.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * camDistance, Math.sin(pitch) * camDistance + 1.2, Math.cos(yaw) * Math.cos(pitch) * camDistance));
  const ray = new THREE.Raycaster(target, desired.clone().sub(target).normalize(), .2, target.distanceTo(desired));
  const obstacles = world.solids.filter(s => s.mesh && !s.disabled && s.high > target.y - .2 && s.low < desired.y + 2).map(s => s.mesh);
  const hit = ray.intersectObjects(obstacles, false)[0];
  if (hit) desired.copy(target).addScaledVector(ray.ray.direction, Math.max(1, hit.distance - .5));
  camera.position.lerp(desired, 1 - Math.exp(-dt * 8)); camera.lookAt(target);
}
function updateHUD() {
  nearest = nearby();
  let text = '';
  if (driven || ridden) text = 'E · 下车';
  else if (nearest && nearest.kind === 'train') text = `E · 登上 ${nearest.item.line.name} 地铁`;
  else if (nearest && nearest.kind === 'vehicle') {
    const v = nearest.item;
    text = 'E · ' + (taxi && v === taxi.vehicle ? '乘坐出租车' : v.type === 'bus' && v.ai ? '乘坐公交' : v.shared ? '驾驶共享车辆' : '偷开车辆');
  } else if (nearest) text = `${nearest.item.locked ? 'F 按住' : 'E'} · ${nearest.item.name}`;
  const door = nearest && nearest.kind === 'action' && nearest.item.locked;
  if (!(door && (keys.has('KeyF') || touchPrying))) actionHUD.textContent = text;
  actionHUD.hidden = !text || phoneOpen;
  document.querySelector('.interaction').classList.add('hidden');

  const vehicle = driven || ridden;
  document.querySelector('.vehicle-hud').classList.toggle('is-driving', !!vehicle);
  $('speed').textContent = String(Math.round(Math.abs(vehicle ? vehicle.speed : 0) * 3.6)).padStart(2, '0');
  $('mode-name').textContent = vehicle ? vehicle.type === 'metro' ? vehicle.line.name : vehicle.type === 'bus' ? '01 · 金陵公交' : vehicle.type === 'taxi' ? 'COAST CAB' : '自由驾驶' : '步行';
  $('gear').textContent = driven ? (driven.speed < 0 ? 'R' : 'D') : ridden ? '乘' : '—';
  $('speed-bar').style.width = Math.min(100, Math.abs(vehicle ? vehicle.speed : 0) / 60 * 100) + '%';

  $('health-label').textContent = `♥ ${player.health}`;
  $('weapon-cycle').textContent = ['徒手', '手枪', '冲锋枪'][player.weapon];
  $('ammo-label').textContent = player.weapon ? player.ammo : '';
  crosshair.hidden = !player.weapon || !!vehicle || phoneOpen;
  if (mobileFire) mobileFire.hidden = !player.weapon || !!vehicle || phoneOpen;

  $('wanted-hud').hidden = !player.wanted;
  $('wanted-stars').textContent = '★'.repeat(player.wanted) + '☆'.repeat(3 - player.wanted);
  $('wanted-progress').style.width = player.escape / 20 * 100 + '%';

  const district = districts.reduce((best, d) => Math.hypot(d.x - player.position.x, d.z - player.position.z) < Math.hypot(best.x - player.position.x, best.z - player.position.z) ? d : best, districts[0]);
  $('district').textContent = district.name;
  $('position-label').textContent = district.name;
  $('coordinates').textContent = `${Math.round(player.position.x)} / ${Math.round(player.position.z)}`;
  $('clock').textContent = `18:${String(42 + Math.floor(elapsed / 60) % 18).padStart(2, '0')}`;

  const nearStation = world.stations[stationIndex];
  locationHUD.hidden = player.position.y > -3 && !ridden;
  locationHUD.textContent = ridden && ridden.type === 'metro'
    ? `${ridden.line.name} · ${ridden.dwell > 0 ? (world.stations[ridden.station] ? world.stations[ridden.station].name : '到站') + ' · 开门中' : '运行中 · 下一站 ' + (ridden.line.stations[ridden.next] ? ridden.line.stations[ridden.next].name : '')}`
    : ridden && ridden.type === 'bus' ? '公交乘坐中 · 到站按 E 下车'
    : ridden && ridden.type === 'taxi' ? '出租车乘坐中'
    : nearStation ? '地铁 · ' + nearStation.name : '地下通道';
  $('navigation-hud').hidden = !destination;
  if (destination) {
    $('navigation-name').textContent = destination.name;
    $('navigation-distance').textContent = `${Math.round(Math.hypot(player.position.x - destination.x, player.position.z - destination.z))} m`;
  }
}
function drawMap(canvasEl, full) {
  const ctx = canvasEl.getContext('2d'), w = full ? 310 : 264, h = full ? 390 : 180;
  canvasEl.width = w; canvasEl.height = h;
  const scale = full ? .06 * mapZoom : .55, center = full ? mapCenter : player.position;
  const mx = x => w / 2 + (x - center.x) * scale, mz = z => h / 2 + (z - center.z) * scale;
  ctx.fillStyle = '#304c45'; ctx.fillRect(0, 0, w, h);
  for (const water of world.water) {
    ctx.fillStyle = water.d > 300 ? '#477479' : '#4d7d80';
    ctx.fillRect(mx(water.x - water.w / 2), mz(water.z - water.d / 2), water.w * scale, water.d * scale);
  }
  for (const d of districts) {
    ctx.fillStyle = '#405b53'; ctx.fillRect(mx(d.x - d.w / 2), mz(d.z - d.d / 2), d.w * scale, d.d * scale);
    if (full) { ctx.fillStyle = '#bfd0ad'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.name, mx(d.x), mz(d.z)); }
  }
  for (const r of world.roads) {
    ctx.strokeStyle = '#a3aaa0'; ctx.lineWidth = Math.max(full ? 1 : 2, r.width * scale);
    ctx.beginPath(); ctx.moveTo(mx(r.a.x), mz(r.a.z)); ctx.lineTo(mx(r.b.x), mz(r.b.z)); ctx.stroke();
  }
  for (const line of world.metroLines) {
    ctx.strokeStyle = line.color; ctx.lineWidth = full ? 1.6 : 2;
    ctx.beginPath(); line.curve.getSpacedPoints(20).forEach((p, i) => i ? ctx.lineTo(mx(p.x), mz(p.z)) : ctx.moveTo(mx(p.x), mz(p.z))); ctx.stroke();
  }
  for (const s of world.stations) { ctx.fillStyle = '#a7e5ec'; ctx.fillRect(mx(s.entry.x) - 2, mz(s.entry.z) - 2, 4, 4); }
  if (!full) for (const b of world.buildings) { ctx.fillStyle = '#5d7164'; ctx.fillRect(mx(b.x - b.w / 2), mz(b.z - b.d / 2), b.w * scale, b.d * scale); }
  for (const v of transport.vehicles) {
    if (!v.group.visible) continue;
    ctx.fillStyle = v.type === 'police' ? '#ef9698' : v.type === 'bus' ? '#dfd38f' : v.type === 'metro' ? '#9ae3e9' : '#b7c7ad';
    if (full && !['bus', 'metro', 'police', 'taxi'].includes(v.type)) continue;
    ctx.fillRect(mx(v.group.position.x) - 1.5, mz(v.group.position.z) - 2, 3, 4);
  }
  if (destination) {
    ctx.strokeStyle = '#dff18e'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(mx(player.position.x), mz(player.position.z)); ctx.lineTo(mx(destination.x), mz(destination.z)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#efffad'; ctx.beginPath(); ctx.arc(mx(destination.x), mz(destination.z), 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.translate(mx(player.position.x), mz(player.position.z)); ctx.rotate(-player.yaw);
  ctx.fillStyle = '#e7f69e'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  if (full) { ctx.fillStyle = '#d0dbb9'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${Math.round(w / scale)}m · ${mapZoom.toFixed(1)}×`, 10, h - 10); }
}
function drawMaps() { drawMap($('minimap'), false); if (phoneOpen && phonePage === 'map') drawMap($('phone-map'), true); }

document.querySelectorAll('[data-app]').forEach(b => { b.onclick = () => showPage(b.dataset.app); });
$('phone-button').onclick = () => phoneOpen ? closePhone() : openPhone();
$('phone-close').onclick = closePhone;
$('phone-back').onclick = $('phone-home').onclick = () => showPage('home');
$('play-button').onclick = () => { focus(); if (isTouch) enterImmersive(); };
const rotateButton = $('rotate-button'); if (rotateButton) rotateButton.onclick = () => { enterImmersive(); focus(); };
const rotateOverlay = $('rotate-overlay');
if (rotateOverlay) rotateOverlay.addEventListener('click', e => { if (e.target.closest('button')) return; enterImmersive(); focus(); });
if (isTouch) addEventListener('pointerdown', () => { if (!document.fullscreenElement) enterImmersive(); }, { once: true, passive: true });
if (mobileFire) mobileFire.onclick = () => fire();
$('map-button').onclick = () => openPhone('map');
$('hud-button').onclick = () => { gameEl.classList.toggle('hud-hidden'); hiddenHUD = !hiddenHUD; };
$('phone-hud-button').onclick = () => $('hud-button').click();
$('clear-navigation').onclick = $('cancel-navigation').onclick = () => { destination = null; refreshPhone(); };
actionHUD.onclick = () => {
  const near = nearby();
  if (near && near.kind === 'action' && near.item.type === 'door' && near.item.locked) { touchPrying = true; return; }
  interact();
};
$('mobile-enter').onclick = interact;
$('phone-reset').onclick = () => { driven = null; ridden = null; avatar.visible = true; player.position.set(26, 0, 40); closePhone(); };
$('weapon-cycle').onclick = () => { player.weapon = (player.weapon + 1) % 3; };
$('sound-button').onclick = () => { toast('声音系统将在后续音效更新接入'); $('sound-state').textContent = 'OFF'; };
$('bus-apply').onclick = () => {
  if (busJob) { busJob = null; destination = null; }
  else { busJob = { next: 0 }; destination = transport.busStops[0]; toast('已应聘 · 前往鼓楼公交场领取共享公交'); }
  refreshPhone();
};
$('taxi-pick').onclick = () => showPage('map');
$('taxi-call').onclick = () => {
  if (!destination || taxi) return;
  const pickup = nearestRoad(player.position);
  const node = world.nodes.reduce((a, n) => Math.abs(Math.hypot(n.x - pickup.x, n.z - pickup.z) - 100) < Math.abs(Math.hypot(a.x - pickup.x, a.z - pickup.z) - 100) ? n : a, world.nodes[0]);
  const fare = estimateFare();
  if (player.wallet < fare) return;
  player.wallet -= fare;
  const v = transport.create('taxi', node.x, node.z, '#e2c66e', { ai: true });
  v.route = findRoute(world, v.group.position, pickup); v.route.push(pickup); v.routeIndex = 0;
  taxi = { vehicle: v, state: 'pickup', fare, destination: nearestRoad(destination), requested: { ...destination } };
  refreshPhone(); toast('叫车成功 · 车费已预付，车辆沿路前来');
};
$('taxi-cancel').onclick = () => {
  if (taxi && taxi.state !== 'trip') {
    if (taxi.state === 'pickup' || taxi.state === 'waiting') player.wallet += taxi.fare;
    taxi.vehicle.group.visible = false; taxi = null; refreshPhone();
  }
};
document.querySelectorAll('[data-cheat]').forEach(b => {
  b.onclick = () => {
    switch (b.dataset.cheat) {
      case 'cash': player.wallet += 10000; break;
      case 'resources': player.goods += 100; player.tools += 20; break;
      case 'weapons': player.weapon = 2; player.ammo = 999; break;
      case 'heal': player.health = 100; break;
      case 'wanted': player.wanted = 0; police.forEach(v => { v.group.visible = false; }); break;
      case 'car': transport.create('sport', player.position.x + 4, player.position.z, '#cbe2a3', { shared: true }); break;
    }
    refreshPhone(); toast('沙盒资源已更新');
  };
});

let mapDrag = null, mapMoved = false;
$('phone-map').addEventListener('pointerdown', e => { mapDrag = { x: e.clientX, y: e.clientY }; mapMoved = false; $('phone-map').setPointerCapture(e.pointerId); });
$('phone-map').addEventListener('pointermove', e => {
  if (!mapDrag) return;
  const rect = $('phone-map').getBoundingClientRect(), scale = .06 * mapZoom * rect.width / 310;
  const dx = e.clientX - mapDrag.x, dy = e.clientY - mapDrag.y;
  if (Math.hypot(dx, dy) > 2) mapMoved = true;
  mapCenter.x -= dx / scale; mapCenter.z -= dy / scale; mapDrag = { x: e.clientX, y: e.clientY }; drawMaps();
});
$('phone-map').addEventListener('pointerup', e => {
  if (!mapMoved) {
    const r = $('phone-map').getBoundingClientRect(), scale = .06 * mapZoom;
    destination = {
      name: '自由目的地',
      x: THREE.MathUtils.clamp(mapCenter.x + ((e.clientX - r.left) / r.width * 310 - 155) / scale, bounds.minX, bounds.maxX),
      z: THREE.MathUtils.clamp(mapCenter.z + ((e.clientY - r.top) / r.height * 390 - 195) / scale, bounds.minZ, bounds.maxZ)
    };
    refreshPhone(); drawMaps();
  }
  mapDrag = null;
});
$('phone-map').addEventListener('wheel', e => { e.preventDefault(); mapZoom = THREE.MathUtils.clamp(mapZoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), .8, 8); drawMaps(); }, { passive: false });
const mapTools = document.createElement('div'); mapTools.className = 'map-tools';
for (const [name, fn] of [['−', () => { mapZoom = Math.max(.8, mapZoom / 1.4); }], ['定位', () => { mapCenter = { x: player.position.x, z: player.position.z }; }], ['全图', () => { mapZoom = 1; mapCenter = { x: 0, z: 0 }; }], ['+', () => { mapZoom = Math.min(8, mapZoom * 1.4); }]]) {
  const b = document.createElement('button'); b.textContent = name; b.onclick = () => { fn(); drawMaps(); }; mapTools.append(b);
}
document.querySelector('.phone-map-wrap').after(mapTools);

addEventListener('keydown', e => {
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') {
    if (!liftPanel.hidden) { liftPanel.hidden = true; focus(); }
    else if (phoneOpen) closePhone();
    return;
  }
  if (e.code === 'KeyP' && !e.repeat) { phoneOpen ? closePhone() : openPhone(); return; }
  if (e.code === 'KeyM' && !e.repeat) { phoneOpen && phonePage === 'map' ? closePhone() : openPhone('map'); return; }
  if (phoneOpen || !liftPanel.hidden) return;
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'Tab') $('hud-button').click();
  if (/^Digit[123]$/.test(e.code)) player.weapon = Number(e.code.at(-1)) - 1;
  if (e.code === 'KeyJ') fire();
  if (e.code === 'KeyR') $('phone-reset').click();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); drag = null; aim = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (phoneOpen) { closePhone(); return; }
  focus();
  if (e.button === 2) { aim = true; return; }
  if (e.button === 0 && e.pointerType !== 'touch' && player.weapon && !driven && !ridden) { fire(); return; }
  drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (aim) { yaw -= e.movementX * .004; pitch = THREE.MathUtils.clamp(pitch + e.movementY * .003, -.2, 1); }
  else if (drag) {
    yaw -= (e.clientX - drag.x) * .005;
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * .004, .05, 1);
    drag = { x: e.clientX, y: e.clientY };
  }
});
canvas.addEventListener('pointerup', () => { drag = null; aim = false; });
canvas.addEventListener('pointercancel', () => { drag = null; aim = false; });
canvas.addEventListener('wheel', e => { e.preventDefault(); distance = THREE.MathUtils.clamp(distance + e.deltaY * .015, 5, 35); }, { passive: false });
document.querySelectorAll('[data-key]').forEach(b => {
  b.onpointerdown = e => { e.preventDefault(); b.setPointerCapture(e.pointerId); keys.add(b.dataset.key); };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(type, () => keys.delete(b.dataset.key));
});

function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); camera.position.set(34, 7, 54);
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05);
  if (!phoneOpen && liftPanel.hidden) {
    elapsed += dt;
    transport.update(dt, player.position, driven, ridden);
    updateTrains(dt); updateTaxi(dt); updatePlayer(dt); updatePolice(dt); updateBusJob(dt);
    for (let i = shots.length - 1; i >= 0; i--) {
      shots[i].life -= dt;
      if (shots[i].life <= 0) { scene.remove(shots[i].mesh); shots[i].mesh.geometry.dispose(); shots[i].mesh.material.dispose(); shots.splice(i, 1); }
    }
  }
  // Hide the ground sheet while inside a B1 station so the room stays visible.
  if (world.terrainMesh) world.terrainMesh.visible = player.position.y > -0.3;
  updateCamera(dt);
  if (elapsed - lastHUD > .1 || lastHUD === 0) { updateHUD(); drawMaps(); lastHUD = elapsed; }
  renderer.render(scene, camera);
}
$('loading').classList.add('done');
refreshPhone(); updateOrientation(); frame();
