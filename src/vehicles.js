import * as THREE from 'three';
import { findRoute } from './world.js';

export function createVehicles(world, scene) {
  const vehicles = [], passengers = [], peds = [];
  const busStops = (world.busStops || []).map(s => ({ ...s }));
  const { box, label, material } = world;
  function person(color = '#b4c39c') {
    const group = new THREE.Group(); box(.5, .8, .35, color, 0, 1.1, 0, group); box(.35, .4, .35, '#c69475', 0, 1.72, 0, group);
    for (const side of [-1, 1]) box(.19, .7, .24, '#3f5661', side * .14, .4, 0, group); scene.add(group); return group;
  }
  function create(type, x, z, color = '#c3d5a7', options = {}) {
    const bike = type === 'bike', heli = type === 'heli', plane = type === 'plane', bus = type === 'bus', train = type === 'metro';
    const w = bike ? .8 : heli ? 3.4 : plane ? 2.6 : bus ? 2.9 : train ? 3 : 2.1;
    const d = bike ? 1.9 : heli ? 6.4 : plane ? 9.6 : bus ? 11 : train ? 24 : 4.6;
    const h = bike ? 1.1 : heli ? 2.1 : plane ? 1.9 : bus ? 3.2 : train ? 3.4 : type === 'jeep' ? 2.05 : type === 'ev' ? 1.5 : 1.6;
    const group = new THREE.Group(); group.position.set(x, .15, z); scene.add(group);
    const wheels = []; let door = null, rotor = null, prop = null;
    if (bike) {
      box(.16, .16, 1.5, '#2f3a3a', 0, .58, 0, group);
      box(.52, .16, 1.15, color, 0, .98, 0, group);
      box(.15, .42, .15, '#3c4a4a', 0, .78, .6, group);
      box(.15, .42, .15, '#3c4a4a', 0, .78, -.6, group);
      box(.1, .5, .1, '#6b8f92', 0, 1.32, 0, group);
      box(.7, .06, .12, '#5c6b68', 0, 1.55, 0, group);
      for (const zz of [-.7, .7]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .1, 14), material('#263235')); wheel.rotation.z = Math.PI / 2; wheel.position.set(0, .4, zz); group.add(wheel); wheels.push(wheel); }
    } else if (heli) {
      box(w, .9, d * .7, color, 0, 1.1, 0, group);
      box(w * .82, .8, 1.7, '#6f9aa0', 0, 1.5, d * .28, group, { transparent: true, opacity: .45 });
      box(.5, .5, 3.2, color, 0, 1.2, -d * .62, group);
      box(.22, 1.2, .9, color, 0, 1.9, -d * .85, group);
      rotor = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, .06, 20), material('#c8d6d2', { transparent: true, opacity: .35 }));
      rotor.position.set(0, 2.5, 0); group.add(rotor);
      box(.08, 1.7, .4, '#c8d6d2', .38, 1.95, -d * .88, group);
      for (const s of [-1, 1]) { box(.16, .16, 3.2, '#39494b', s * 1.1, .25, 0, group); box(.16, .6, .16, '#39494b', s * 1.1, .52, .9, group); box(.16, .6, .16, '#39494b', s * 1.1, .52, -.9, group); }
      door = box(w * .5, 1.2, .9, '#678b91', 0, 1.15, d * .28, group, { transparent: true, opacity: .4 });
    } else if (plane) {
      box(w, 1.2, d * .7, color, 0, 1.1, 0, group);
      box(w * .8, .8, 1.9, '#6f9aa0', 0, 1.42, d * .26, group, { transparent: true, opacity: .45 });
      box(11, .16, 2.2, color, 0, 1.15, -.4, group);
      box(4.6, .14, 1.1, color, 0, 1.1, d * .38, group);
      box(.2, 1.8, 1.5, color, 0, 1.9, -d * .34, group);
      box(w * .9, .45, .7, '#39494b', 0, .45, 0, group);
      for (const s of [-1, 1]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .16, 12), material('#263235')); wheel.rotation.z = Math.PI / 2; wheel.position.set(s * .72, .4, -.4); group.add(wheel); wheels.push(wheel); }
      prop = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.6, .3), material('#c8d6d2')); prop.position.set(0, 1.25, d * .53); group.add(prop);
      door = box(1.1, 1.1, .1, '#678b91', w * .28, 1.35, d * .16, group, { transparent: true, opacity: .4 });
    } else {
      // Open body and transparent windows let passengers remain visibly inside.
      box(w, .6, d, color, 0, .8, 0, group); box(w, .18, d, color, 0, h + .1, 0, group);
      for (const side of [-1, 1]) {
        box(.12, .65, d, color, side * w / 2, 1.3, 0, group);
        for (let zz = -d / 2 + .5; zz < d / 2; zz += bus || train ? 2 : 1.4) box(.12, h - 1.5, .12, color, side * w / 2, h / 2 + .7, zz, group);
        box(.06, h - 1.6, d - .4, '#6b9ca2', side * w / 2, h / 2 + .75, 0, group, { transparent: true, opacity: .25, depthWrite: false });
      }
      box(w - .2, h - 1.4, .1, '#45717a', 0, h / 2 + .65, -d / 2, group, { transparent: true, opacity: .5 });
      if (!train) for (const side of [-1, 1]) for (const zz of [-d * .32, d * .32]) {
        const r = bus ? .6 : type === 'jeep' ? .56 : .43;
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .24, 12), material('#263235'));
        wheel.rotation.z = Math.PI / 2; wheel.position.set(side * w / 2, bus ? .5 : type === 'jeep' ? .58 : .5, zz); group.add(wheel); wheels.push(wheel);
      }
      if (type === 'van') box(w, .9, 2.7, color, 0, 1.6, .8, group);
      if (type === 'pickup') box(w, .4, 1.7, color, 0, 1.4, 1.3, group);
      if (type === 'jeep') {
        box(w + .1, .5, d, color, 0, h + .35, 0, group);
        box(w + .34, .16, d - .5, '#4a5b58', 0, h + .78, 0, group);
        for (const side of [-1, 1]) for (const zz of [d / 2 - .6, -d / 2 + .6]) box(.16, h + .5, .16, '#39494b', side * (w / 2 - .05), h / 2 + .5, zz, group);
        box(.3, .16, .16, '#e2d48f', w / 2 + .1, 1.5, .6, group, { emissive: '#e2d48f', emissiveIntensity: .4 });
      }
      if (type === 'ev') {
        box(w + .06, .12, d - .8, '#9fd8c4', 0, h + .16, .3, group, { emissive: '#63c6a4', emissiveIntensity: .4 });
        box(w - .5, .1, .9, '#bfe8da', 0, .95, d / 2 - .1, group, { emissive: '#63c6a4', emissiveIntensity: .35 });
      }
      if (type === 'police') { box(1.5, .2, .4, '#344b51', 0, 1.9, 0, group); box(.6, .2, .35, '#db787a', -.4, 2.1, 0, group, { emissive: '#ff3333', emissiveIntensity: 1 }); box(.6, .2, .35, '#758edb', .4, 2.1, 0, group, { emissive: '#334dff', emissiveIntensity: 1 }); }
      if (bus || train) { label(train ? '南京地铁 · COAST METRO' : '01 · 南京公交', 0, h - .2, -d / 2 - .08, w - .2, group); for (let zz = -d / 2 + 2; zz < d / 2 - 1; zz += 1.5) for (const side of [-1, 1]) box(.65, .4, .7, '#719088', side * (w / 2 - .55), .9, zz, group); }
      door = box(.14, bus || train ? 2.5 : 1, 1.5, '#678b91', w / 2 + .05, bus || train ? 1.7 : 1.2, bus ? -3.5 : 0, group, { transparent: true, opacity: .55 });
    }
    // Aircraft models are built nose-first along +z; vehicles travel along -z,
    // so bake a 180° flip so they face their direction of travel.
    if (heli || plane) group.rotation.y = Math.PI;
    const value = { type, group, w, d, h, wheels, door, rotor, prop, speed: 0, yaw: 0, alt: group.position.y, shared: false, stolen: false, ai: false, route: [], routeIndex: 0, passengers: [], doors: 0, damage: 0, ...options };
    vehicles.push(value); return value;
  }
  const parkedCount = world.parkedCount ?? 34, trafficCount = world.trafficCount ?? 12, pedCount = world.pedCount ?? 52;
  const showcase = world.vehicles || null;
  const starter = showcase ? null : create('sport', 13, 22, '#d7e69c', { shared: true });
  for (let i = 0; i < parkedCount; i++) {
    const road = world.roads[(i * 7 + 11) % world.roads.length], t = .2 + (i % 5) * .13, side = i % 2 ? 1 : -1;
    const x = road.a.x + (road.b.x - road.a.x) * t + Math.cos(road.angle) * (road.width / 2 - 2) * side, z = road.a.z + (road.b.z - road.a.z) * t - Math.sin(road.angle) * (road.width / 2 - 2) * side;
    const car = create(['sedan', 'sport', 'van', 'pickup'][i % 4], x, z, ['#bec8b9', '#bd9488', '#9fb8be', '#d5c8a3'][i % 4]); car.yaw = road.angle + (side > 0 ? Math.PI : 0); car.group.rotation.y = car.yaw;
  }
  for (let i = 0; i < trafficCount; i++) {
    const start = world.nodes[(i * 3) % world.nodes.length], end = world.nodes[(i * 7 + 12) % world.nodes.length];
    create(['sedan', 'van', 'pickup'][i % 3], start.x, start.z, ['#acbeb7', '#d1bfa0', '#a98a83'][i % 3], { ai: true, route: findRoute(world, start, end), routeIndex: 1 });
  }
  for (const [index, stop] of busStops.entries()) {
    const vertical = stop.vertical ?? (index < 3 || index === 5); stop.vertical = vertical;
    const sx = stop.x + (vertical ? 25 : 0), sz = stop.z + (vertical ? 0 : 25); stop.waiting = [];
    box(vertical ? 14 : 32, .18, vertical ? 32 : 14, '#c1beab', sx, .1, sz); box(vertical ? 8 : 34, .1, vertical ? 34 : 8, '#536165', stop.x + (vertical ? 15 : 0), .12, stop.z + (vertical ? 0 : 15));
    box(9, .2, 3, '#3e5659', sx, 3.1, sz); for (const dx of [-4, 4]) box(.16, 3, .16, '#8b9d99', sx + dx, 1.5, sz);
    box(8, 2.5, .1, '#729b9d', sx, 1.5, sz + 1, scene, { transparent: true, opacity: .4 }); box(6, .2, 1, '#927d60', sx, .8, sz); label(`${world.busLabel || '01'} · ${stop.name}`, sx, 3.6, sz, 12);
    stop.curb = { x: sx, z: sz };
    for (let i = 0; i < 6; i++) { const group = person(['#b5c49d', '#d0b99b', '#b89994'][i % 3]); group.position.set(sx - 3 + i, 0, sz + 3); const p = { group, state: 'waiting', stop: index, target: null, bus: null }; passengers.push(p); stop.waiting.push(p); }
  }
  // Wandering pedestrians along the sidewalks.
  for (let i = 0; i < pedCount; i++) {
    const road = world.roads[(i * 13 + 5) % world.roads.length];
    const u = .12 + (i % 7) * .12, side = i % 2 ? 1 : -1;
    const offset = road.width / 2 + 3.2 + (i % 3) * .7;
    const group = person(['#b5c49d', '#d0b99b', '#b89994', '#93a9b5'][i % 4]);
    group.position.set(road.a.x + (road.b.x - road.a.x) * u + Math.cos(road.angle) * offset * side, 0, road.a.z + (road.b.z - road.a.z) * u - Math.sin(road.angle) * offset * side);
    peds.push({ group, road, side, offset, dir: i % 2 ? -1 : 1, speed: 1.15 + (i % 4) * .24, state: 'walk', timer: 0, u });
  }
  // Depot buses: a shared service bus for the driver job, an idle one, and two
  // route buses that loop the stop list in opposite directions.
  const depot = world.busDepot || (busStops[0] ? { x: busStops[0].x, z: busStops[0].z } : { x: 0, z: 0 });
  const serviceBus = create('bus', depot.x - 8, depot.z + 12, '#c4d8a4', { shared: true });
  create('bus', depot.x + 12, depot.z + 4, '#d4c19d');
  const lastStop = Math.max(0, busStops.length - 1);
  if (busStops.length) {
    create('bus', busStops[0].x, busStops[0].z, '#b8d2b1', { ai: true, busRoute: true, nextStop: 0, direction: 1, dwell: 0 });
    if (busStops.length > 1) create('bus', busStops[lastStop].x, busStops[lastStop].z, '#a7c7c2', { ai: true, busRoute: true, nextStop: lastStop, direction: -1, dwell: 0 });
  }
  // Showcase vehicles parked by the spawn house, or the free-roam starter set.
  let bike = null, heli = null, plane = null;
  if (showcase) {
    for (const spec of showcase) {
      const v = create(spec.type, spec.x, spec.z, spec.color, { ...(spec.options || {}) });
      if (spec.yaw != null) { v.yaw = spec.yaw; v.group.rotation.y = v.yaw + ((v.type === 'heli' || v.type === 'plane') ? Math.PI : 0); }
      if (spec.alt != null) { v.alt = spec.alt; v.group.position.y = spec.alt; }
    }
  } else {
    bike = create('bike', 31, 33, '#cfe29b', { shared: true }); bike.yaw = Math.PI / 2; bike.group.rotation.y = bike.yaw;
    heli = create('heli', world.helipad.x, world.helipad.z, '#d7e2b6', { flying: true });
    plane = create('plane', world.airstrip.x, world.airstrip.z, '#dfe3cf', { flying: true });
  }

  function openDoors(bus, index) {
    bus.doors = 1; bus.door.visible = false;
    for (const p of bus.passengers.splice(0, Math.min(3, bus.passengers.length))) { scene.attach(p.group); p.state = 'alighting'; p.group.position.copy(bus.group.position); p.target = new THREE.Vector3(busStops[index].curb.x + 7, 0, busStops[index].curb.z + 4); }
    for (const p of busStops[index].waiting.splice(0, 4)) { p.state = 'boarding'; p.bus = bus; p.target = new THREE.Vector3(bus.group.position.x + Math.cos(bus.yaw) * 2.2, 0, bus.group.position.z - Math.sin(bus.yaw) * 2.2); }
  }
  function moveRoute(v, dt, speed = 13) {
    const target = v.route[v.routeIndex]; if (!target) return true; const p = v.group.position, dx = target.x - p.x, dz = target.z - p.z, distance = Math.hypot(dx, dz);
    if (distance < 1.2) { v.routeIndex++; return v.routeIndex >= v.route.length; }
    const desired = Math.atan2(-dx, -dz); v.yaw += Math.atan2(Math.sin(desired - v.yaw), Math.cos(desired - v.yaw)) * Math.min(1, dt * 3); v.group.rotation.y = v.yaw;
    const step = Math.min(distance, speed * dt); p.x += dx / distance * step; p.z += dz / distance * step; v.speed = speed; return false;
  }
  function knock(p, vx, vz, force = 6.5) {
    if (p.state === 'hit' || p.state === 'down') return false;
    p.state = 'hit'; p.timer = 0; p.vel = new THREE.Vector3(vx, force * .6, vz); p.group.rotation.z = 0;
    return true;
  }
  function hitPeds(position, radius, vx, vz) {
    let count = 0;
    for (const p of peds) {
      if (p.state !== 'walk') continue;
      const dx = p.group.position.x - position.x, dz = p.group.position.z - position.z;
      if (dx * dx + dz * dz < radius * radius && knock(p, vx, vz)) count++;
    }
    return count;
  }
  function vehicleAt(position, radius) {
    for (const v of vehicles) {
      if (!v.group.visible || v.type === 'metro') continue;
      const dx = v.group.position.x - position.x, dz = v.group.position.z - position.z;
      if (dx * dx + dz * dz < (radius + Math.max(v.w, v.d) * .42) ** 2) return v;
    }
    return null;
  }
  function collideVehicles(v, position, radius) {
    for (const other of vehicles) {
      if (other === v || other.type === 'metro' || !other.group.visible) continue;
      const dx = other.group.position.x - position.x, dz = other.group.position.z - position.z;
      const min = radius + Math.max(other.w, other.d) * .38;
      if (dx * dx + dz * dz < min * min) return other;
    }
    return null;
  }
  function updatePeds(dt, player, driven) {
    for (const p of peds) {
      if (p.state === 'hit') {
        p.group.position.addScaledVector(p.vel, dt); p.vel.y -= 22 * dt;
        if (p.group.position.y <= 0) { p.group.position.y = 0; p.vel.set(0, 0, 0); p.state = 'down'; p.timer = 4.5; p.group.rotation.z = Math.PI / 2; }
        continue;
      }
      if (p.state === 'down') { p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; p.group.rotation.z = 0; p.u = .1 + Math.random() * .8; } continue; }
      const dx = p.group.position.x - player.x, dz = p.group.position.z - player.z, dist = Math.hypot(dx, dz);
      if (driven && dist < 7.5) {
        const len = dist || 1;
        p.group.position.x += dx / len * 4.2 * dt; p.group.position.z += dz / len * 4.2 * dt;
        p.group.rotation.y = Math.atan2(-dx, -dz);
        continue;
      }
      const road = p.road, dxr = road.b.x - road.a.x, dzr = road.b.z - road.a.z, len = Math.hypot(dxr, dzr) || 1;
      p.u += p.dir * p.speed * dt / len;
      if (p.u > 1) { p.u = 1; p.dir = -1; } else if (p.u < 0) { p.u = 0; p.dir = 1; }
      p.group.position.set(road.a.x + dxr * p.u + Math.cos(road.angle) * p.offset * p.side, 0, road.a.z + dzr * p.u - Math.sin(road.angle) * p.offset * p.side);
      p.group.rotation.y = Math.atan2(-dxr * p.dir, -dzr * p.dir);
    }
  }
  let spawnTimer = 0;
  function update(dt, player, driven, ridden) {
    for (const v of vehicles) {
      if (!v.ai || v === driven || v.type === 'metro' || v.type === 'police' || v.type === 'taxi') continue;
      if (v.busRoute) {
        if (v.dwell > 0) {
          v.speed = 0; v.dwell -= dt;
          if (v.dwell <= 0) {
            v.doors = 0; v.door.visible = true;
            v.nextStop += v.direction;
            if (v.nextStop >= busStops.length || v.nextStop < 0) { v.direction *= -1; v.nextStop += v.direction * 2; }
            v.route = []; v.stuck = 0;
          }
          continue;
        }
        if (!v.route.length) { v.route = findRoute(world, v.group.position, busStops[v.nextStop]); v.route.push(busStops[v.nextStop]); v.routeIndex = 0; v.stuck = 0; }
        const bx = v.group.position.x, bz = v.group.position.z;
        const arrived = moveRoute(v, dt, 15);
        if (Math.hypot(v.group.position.x - bx, v.group.position.z - bz) < .02) v.stuck = (v.stuck || 0) + dt; else v.stuck = 0;
        if (!arrived && v.stuck > 3.5) { v.route = []; v.stuck = 0; }
        if (arrived) { v.route = []; v.dwell = 12; openDoors(v, v.nextStop); }
      } else {
        if (v !== ridden && Math.hypot(v.group.position.x - player.x, v.group.position.z - player.z) < 7) continue;
        if (moveRoute(v, dt, 12)) { v.route = findRoute(world, v.group.position, world.nodes[Math.floor(Math.random() * world.nodes.length)]); v.routeIndex = 1; }
      }
      v.wheels.forEach(w => w.rotation.x -= v.speed * dt);
    }
    for (const p of passengers) { if (!p.target) continue; const delta = p.target.clone().sub(p.group.position); delta.y = 0; if (delta.length() < .4) { p.target = null; if (p.state === 'boarding') { p.state = 'riding'; p.bus.group.attach(p.group); const seat = p.bus.passengers.length; p.group.position.set(seat % 2 ? .9 : -.9, .45, 2.5 - Math.floor(seat / 2) * 1.4); p.group.rotation.y = 0; p.bus.passengers.push(p); } else { p.state = 'done'; p.group.visible = false; } } else { delta.normalize(); p.group.position.addScaledVector(delta, dt * 2); p.group.rotation.y = Math.atan2(-delta.x, -delta.z); } }
    updatePeds(dt, player, driven);
    spawnTimer += dt; if (spawnTimer > 25) { spawnTimer = 0; for (const stop of busStops) if (stop.waiting.length < 4) { const group = person('#c9b997'); group.position.set(stop.curb.x, 0, stop.curb.z + 3); const p = { group, state: 'waiting', target: null, bus: null }; passengers.push(p); stop.waiting.push(p); } }
  }
  return { vehicles, passengers, peds, busStops, serviceBus, create, person, update, moveRoute, openDoors, starter, bike, heli, plane, hitPeds, vehicleAt, collideVehicles };
}
