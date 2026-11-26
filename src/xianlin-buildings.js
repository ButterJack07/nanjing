// Xianlin campus buildings: real OSM footprints extruded with window facades, roof lips, hip roofs and the Dijiang observatory dome.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function buildBuildings(scene, ctx) {
  const { material, solids, buildings, label, FOOTPRINTS, skip } = ctx;
  const PALETTE = ['#c7b8a5', '#cdb9ab', '#aebdb5', '#b7bdba', '#c1aa99', '#d3c8b0'];
  const LABELED = /图书馆|活动中心|校史馆|游泳馆|体育馆|餐厅|食堂|天文台|会议中心|美术馆|行政|学院|教学楼|实验楼|宿舍|公寓|档案馆|礼堂|博物馆/;
  const colorFor = tag => (/dorm/.test(tag) ? '#cdc3ab' : /apartment/.test(tag) ? '#c8bfa8' : /university|college|school|institute/.test(tag) ? '#c2bfae' : null);

  const wallCache = new Map();
  function wallMaterial(color) {
    if (wallCache.has(color)) return wallCache.get(color);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 32, 64, 2);
    for (const oy of [4, 36]) for (let cx = 4; cx < 64; cx += 15) {
      g.fillStyle = 'rgba(28,46,58,.85)'; g.fillRect(cx, oy, 11, 21);
      g.fillStyle = 'rgba(150,190,200,.22)'; g.fillRect(cx + 1, oy + 1, 9, 7);
      g.strokeStyle = 'rgba(238,240,230,.5)'; g.strokeRect(cx + .5, oy + .5, 10, 20);
    }
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.strokeRect(.5, .5, 63, 63);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 3.6, 1 / 3.6);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .9 });
    wallCache.set(color, m); return m;
  }

  const roofMaterial = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#9aa0a0'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = 'rgba(0,0,0,.09)';
    for (let i = 0; i < 46; i++) g.fillRect((i * 7) % 32, (i * 13) % 32, 3, 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 6, 1 / 6);
    return new THREE.MeshStandardMaterial({ map: t, roughness: .95, side: THREE.DoubleSide });
  })();

  const shapeOf = ring => { const s = new THREE.Shape(); ring.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath(); return s; };
  const areaOf = ring => { let a = 0; for (let i = 0, n = ring.length; i < n; i++) { const [x1, z1] = ring[i], [x2, z2] = ring[(i + 1) % n]; a += x1 * z2 - x2 * z1; } return Math.abs(a) / 2; };
  const inside = (ring, px, pz) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) c = !c; } return c; };
  const isConvex = ring => {
    let sign = 0;
    for (let i = 0, n = ring.length; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n], c = ring[(i + 2) % n];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) < 1e-6) continue;
      const s = cr > 0 ? 1 : -1;
      if (sign === 0) sign = s; else if (s !== sign) return false;
    }
    return true;
  };
  function slice(geo, start, count) {
    const o = new THREE.BufferGeometry();
    for (const n of ['position', 'normal', 'uv']) {
      const a = geo.attributes[n]; if (!a) continue;
      o.setAttribute(n, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
    }
    return o;
  }
  function split(geo, roofs, walls) {
    for (const gr of geo.groups) (gr.materialIndex === 0 ? roofs : walls).push(slice(geo, gr.start, gr.count));
  }
  function hipGeometry(minX, maxX, minZ, maxZ, y0, height, inset) {
    const x0 = minX + inset, x1 = maxX - inset, z0 = minZ + inset, z1 = maxZ - inset;
    const apex = [(minX + maxX) / 2, y0 + height, (minZ + maxZ) / 2];
    const v = [
      [x0, y0, z1], [x1, y0, z1], apex,
      [x1, y0, z0], [x0, y0, z0], apex,
      [x1, y0, z1], [x1, y0, z0], apex,
      [x0, y0, z0], [x0, y0, z1], apex,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(v.length * 2).fill(0), 2));
    g.computeVertexNormals();
    return g;
  }

  const buckets = new Map();
  let labeled = 0, domeAdded = false;
  for (const [name, tag, h, ring] of FOOTPRINTS) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of ring) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z; }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    if (skip(cx, cz)) continue;
    const w = maxX - minX, d = maxZ - minZ, area = areaOf(ring);
    const isObs = /天文台/.test(name);
    const color = colorFor(tag) || PALETTE[(Math.abs((cx * 7 + cz * 13) | 0)) % PALETTE.length];
    if (!buckets.has(color)) buckets.set(color, { roofs: [], walls: [] });
    const bucket = buckets.get(color);

    const body = new THREE.ExtrudeGeometry(shapeOf(ring), { depth: h, bevelEnabled: false });
    body.rotateX(-Math.PI / 2);
    split(body, bucket.roofs, bucket.walls);
    body.dispose();

    if (w > 6 && d > 6) {
      const lipH = Math.min(1.4, Math.max(.6, Math.min(w, d) * .05));
      let rx = 0, rz = 0;
      for (const [x, z] of ring) { rx += x; rz += z; }
      rx /= ring.length; rz /= ring.length;
      if (!isObs && inside(ring, rx, rz)) {
        let avg = 0;
        for (const [x, z] of ring) avg += Math.hypot(x - rx, z - rz);
        avg /= ring.length;
        const k = Math.min(.97, Math.max(.7, 1 - .5 / Math.max(avg, 1)));
        const holePts = ring.map(([x, z]) => [rx + (x - rx) * k, -(rz + (z - rz) * k)]);
        let sa = 0;
        for (let i = 0, n = holePts.length; i < n; i++) { const a = holePts[i], b = holePts[(i + 1) % n]; sa += a[0] * b[1] - b[0] * a[1]; }
        if (sa < 0) holePts.reverse();
        const outer = shapeOf(ring);
        const hole = new THREE.Path();
        holePts.forEach(([x, y], i) => i ? hole.lineTo(x, y) : hole.moveTo(x, y));
        hole.closePath();
        outer.holes.push(hole);
        const lip = new THREE.ExtrudeGeometry(outer, { depth: lipH, bevelEnabled: false });
        lip.rotateX(-Math.PI / 2); lip.translate(0, h, 0);
        split(lip, bucket.roofs, bucket.walls);
        lip.dispose();
      }
      if (!isObs && area < 400 && ring.length <= 8 && isConvex(ring)) {
        const hipH = Math.min(3.5, Math.max(.8, Math.min(w, d) * .16));
        const inset = Math.min(.7, Math.min(w, d) * .08);
        bucket.roofs.push(hipGeometry(minX, maxX, minZ, maxZ, h, hipH, inset));
      }
    }

    solids.push({ x: cx, z: cz, hw: w / 2, hd: d / 2, low: 0, high: h });
    buildings.push({ x: cx, z: cz, w, d, h });
    if (name && LABELED.test(name) && labeled < 46) { label(name, cx, h + 4, cz, Math.min(w * 1.1, 34)); labeled++; }

    if (isObs) {
      const r = 10, drumH = 6;
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, drumH, 20), material('#c3cac6'));
      drum.position.set(cx, h + drumH / 2, cz); drum.receiveShadow = true; scene.add(drum);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 1.2, 20), material('#b9bdb8'));
      rim.position.set(cx, h + drumH, cz); scene.add(rim);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), material('#cfd6d4', { metalness: .2 }));
      dome.position.set(cx, h + drumH + .6, cz); dome.receiveShadow = true; scene.add(dome);
      domeAdded = true;
    }
  }

  for (const [color, { roofs, walls }] of buckets) {
    const R = roofs.length ? mergeGeometries(roofs, false) : null;
    const W = walls.length ? mergeGeometries(walls, false) : null;
    roofs.forEach(g => g.dispose()); walls.forEach(g => g.dispose());
    let mesh;
    if (R && W) { mesh = new THREE.Mesh(mergeGeometries([R, W], true), [roofMaterial, wallMaterial(color)]); R.dispose(); W.dispose(); }
    else if (R) mesh = new THREE.Mesh(R, roofMaterial);
    else if (W) mesh = new THREE.Mesh(W, wallMaterial(color));
    else continue;
    mesh.receiveShadow = true; mesh.castShadow = true; scene.add(mesh);
  }

  return { solids, buildings, domeAdded };
}
