// Xianlin campus terrain: one subdivided ground mesh with subtle relief, graded riverbanks and water surfaces.
import * as THREE from 'three';

const GROUND = '#8d9d79', LAWN = '#6f8a5d', WATER = '#5b8e92';
const RIVER_WIDTH = 26, RIVER_Y = -0.32, WATER_Y = -0.3, BANKS = 40, DIP = 1.2;

function hash2(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = ((n ^ (n >> 13)) * 1274126177) | 0;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function riverDistance(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az;
    const l2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
    if (d < best) best = d;
  }
  return best;
}

function inRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], zi = ring[i][1], xj = ring[j][0], zj = ring[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function boxes(rings) {
  return rings.map(ring => {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (const [x, z] of ring) { if (x < a) a = x; if (x > b) b = x; if (z < c) c = z; if (z > d) d = z; }
    return { ring, a, b, c, d };
  });
}

function inside(bs, x, z) {
  for (const q of bs) if (x >= q.a && x <= q.b && z >= q.c && z <= q.d && inRing(x, z, q.ring)) return true;
  return false;
}

function bbox(pts, pad = 0) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, z] of pts) { if (x < a) a = x; if (x > b) b = x; if (z < c) c = z; if (z > d) d = z; }
  return { x: (a + b) / 2, z: (c + d) / 2, w: (b - a) + pad, d: (d - c) + pad };
}

function shapeOf(ring) {
  const s = new THREE.Shape();
  ring.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}

export function buildTerrain(scene, ctx) {
  const { material, bounds, GREENS = [], WATERS = [], RIVERS = [] } = ctx;
  const { minX, maxX, minZ, maxZ } = bounds;
  const width = maxX - minX, depth = maxZ - minZ;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const greenRings = boxes(GREENS.map(g => g[1]));
  const waterRings = boxes(WATERS);

  const geo = new THREE.PlaneGeometry(width, depth, Math.round(width / 20), Math.round(depth / 20));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGround = new THREE.Color(GROUND), cLawn = new THREE.Color(LAWN);

  for (let i = 0; i < pos.count; i++) {
    const wx = cx + pos.getX(i), wz = cz + pos.getZ(i);
    let m = (Math.hypot((wx - cx) / (width * 0.34), (wz - cz) / (depth * 0.32)) - 0.55) / 0.45;
    m = m < 0 ? 0 : m > 1 ? 1 : m;
    m = m * m * (3 - 2 * m);
    const relief = ((valueNoise(wx / 90, wz / 90) - 0.5) * 0.06 + (valueNoise(wx / 37 + 11, wz / 37 + 7) - 0.5) * 0.05) * m;
    let dip = 0;
    for (const river of RIVERS) {
      const d = riverDistance(wx, wz, river);
      if (d < BANKS) {
        let t = 1 - d / BANKS;
        t = t * t * (3 - 2 * t);
        if (t * DIP > dip) dip = t * DIP;
      }
    }
    if (inside(waterRings, wx, wz)) dip = DIP;
    pos.setY(i, relief - dip);
    const c = inside(greenRings, wx, wz) ? cLawn : cGround;
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const gtex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 196 + Math.floor(valueNoise((i % 128) / 6, ((i / 128) | 0) / 6) * 59);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(width / 12, depth / 12); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const groundMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, map: gtex, roughness: .96 }));
  groundMesh.position.set(cx, 0, cz);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const water = [];
  const waterMat = material(WATER, { side: THREE.DoubleSide, roughness: .3, metalness: .15 });
  for (const river of RIVERS) {
    const verts = [], idx = [];
    for (let i = 0; i < river.length; i++) {
      const p = river[i], p0 = river[Math.max(0, i - 1)], p1 = river[Math.min(river.length - 1, i + 1)];
      let dx = p1[0] - p0[0], dz = p1[1] - p0[1];
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const nx = -dz, nz = dx, half = RIVER_WIDTH / 2;
      verts.push(p[0] + nx * half, RIVER_Y, p[1] + nz * half);
      verts.push(p[0] - nx * half, RIVER_Y, p[1] - nz * half);
    }
    for (let i = 0; i < river.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, waterMat));
    water.push(bbox(river, RIVER_WIDTH));
  }
  for (const ring of WATERS) {
    const g = new THREE.ShapeGeometry(shapeOf(ring));
    g.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(g, waterMat);
    mesh.position.y = WATER_Y;
    scene.add(mesh);
    water.push(bbox(ring));
  }

  return { groundMesh, water };
}
