// Split authored corridors at every physical crossing so rendering, routing
// and collision all use the same clean street graph. This is not an official map.
export function buildRoads(corridors, point, road) {
  const segments = [];
  for (const [name, width, points, kind] of corridors) {
    for (let i = 1; i < points.length; i++) {
      segments.push({ name, width, kind, a: { x: points[i - 1][0], z: points[i - 1][1] }, b: { x: points[i][0], z: points[i][1] }, cuts: [0, 1] });
    }
  }
  const cross = (ax, az, bx, bz) => ax * bz - az * bx;
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i], b = segments[j];
    const rx = a.b.x - a.a.x, rz = a.b.z - a.a.z, sx = b.b.x - b.a.x, sz = b.b.z - b.a.z;
    const den = cross(rx, rz, sx, sz);
    if (Math.abs(den) < .001) continue;
    const dx = b.a.x - a.a.x, dz = b.a.z - a.a.z;
    const t = cross(dx, dz, sx, sz) / den, u = cross(dx, dz, rx, rz) / den;
    if (t > 0 && t < 1 && u > 0 && u < 1) { a.cuts.push(t); b.cuts.push(u); }
  }
  const cache = new Map(), edges = new Set();
  const node = (x, z) => {
    const key = `${x.toFixed(2)}:${z.toFixed(2)}`;
    if (!cache.has(key)) cache.set(key, point(x, z));
    return cache.get(key);
  };
  for (const segment of segments) {
    const cuts = [...new Set(segment.cuts.map(t => Math.round(t * 1e7) / 1e7))].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const at = t => node(segment.a.x + (segment.b.x - segment.a.x) * t, segment.a.z + (segment.b.z - segment.a.z) * t);
      const a = at(cuts[i - 1]), b = at(cuts[i]);
      if (Math.hypot(a.x - b.x, a.z - b.z) < .15) continue;
      const key = [a.id, b.id].sort((x, y) => x - y).join(':');
      if (edges.has(key)) continue;
      edges.add(key);
      road(a, b, segment.width, true, segment.name, segment.kind);
    }
  }
  return corridors;
}
