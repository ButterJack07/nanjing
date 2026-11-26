// Low-poly humanoid builders: feet at origin, faces -z at rotation.y = 0, ~1.75 m tall.
import * as THREE from 'three';

const geometries = new Map();
const materials = new Map();

function geometry(w, h, d) {
  const key = w + ',' + h + ',' + d;
  let g = geometries.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geometries.set(key, g); }
  return g;
}

function material(color, extra) {
  const key = color + JSON.stringify(extra || {});
  let m = materials.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: .88, metalness: 0, flatShading: true, ...(extra || {}) }); materials.set(key, m); }
  return m;
}

function part(parent, w, h, d, color, x, y, z, extra) {
  const mesh = new THREE.Mesh(geometry(w, h, d), material(color, extra));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const HAIR = ['#241d19', '#3a2c22', '#4d3a29', '#1c1a1a', '#5a4630', '#2f2723'];

function build(spec) {
  const g = new THREE.Group();
  const parts = {};
  const jacket = spec.jacket, pants = spec.pants, skin = spec.skin, shoes = spec.shoes;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .11, .9, 0); g.add(leg);
    part(leg, .17, .42, .19, pants, 0, -.21, 0);
    const lower = new THREE.Group(); lower.position.set(0, -.42, 0); leg.add(lower);
    part(lower, .145, .38, .16, pants, 0, -.19, 0);
    part(lower, .16, .1, .3, shoes, 0, -.43, -.04);
    if (side < 0) { parts.leftLeg = leg; parts.lowerLeftLeg = lower; } else { parts.rightLeg = leg; parts.lowerRightLeg = lower; }
  }
  part(g, .42, .18, .25, pants, 0, .91, 0);
  part(g, .48, .5, .28, jacket, 0, 1.22, 0);
  part(g, .54, .1, .3, spec.jacketDark || jacket, 0, 1.43, 0);
  part(g, .46, .05, .28, '#2f2a26', 0, 1.0, 0);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .31, 1.42, 0); g.add(arm);
    part(arm, .12, .34, .15, jacket, 0, -.17, 0);
    const fore = new THREE.Group(); fore.position.set(0, -.34, 0); arm.add(fore);
    part(fore, .11, .3, .14, spec.cuff || jacket, 0, -.15, 0);
    if (spec.hands) part(fore, .1, .1, .11, skin, 0, -.32, 0);
    if (side < 0) { parts.leftArm = arm; parts.lowerLeftArm = fore; } else { parts.rightArm = arm; parts.lowerRightArm = fore; }
  }
  if (spec.collar) part(g, .22, .07, .24, spec.collar, 0, 1.47, 0);
  const head = new THREE.Group(); head.position.set(0, 1.47, 0); g.add(head);
  part(head, .12, .09, .12, skin, 0, .04, 0);
  part(head, .26, .24, .25, skin, 0, .17, 0);
  part(head, .275, .06, .265, spec.hair, 0, .28, 0);
  part(head, .275, .18, .055, spec.hair, 0, .19, .125);
  if (spec.eyes) { part(head, .04, .04, .02, '#241f1c', -.06, .18, -.13); part(head, .04, .04, .02, '#241f1c', .06, .18, -.13); }
  if (spec.hat) { part(head, .3, .1, .3, spec.hatColor, 0, .28, 0); part(head, .32, .05, .2, spec.hatColor, 0, .26, -.16); }
  parts.head = head;
  if (spec.backpack) { part(g, .3, .38, .16, spec.backpackColor, 0, 1.22, .23); part(g, .3, .06, .03, '#3b4542', 0, 1.16, .16); }
  g.scale.setScalar(spec.height);
  g.userData.parts = parts;
  g.userData.height = spec.height;
  return g;
}

function personSpec(color, options) {
  const seed = hash(color + (options.seed || ''));
  return {
    jacket: color, jacketDark: options.jacketDark || null, cuff: options.cuff || null,
    pants: options.pants || '#3f5661', skin: options.skin || '#c69475',
    hair: options.hair || HAIR[seed % HAIR.length], shoes: options.shoes || '#2b3238',
    collar: options.collar || null, eyes: !!options.eyes, hands: !!options.hands,
    hat: !!options.hat, hatColor: options.hatColor || '#354047',
    backpack: !!options.backpack, backpackColor: options.backpackColor || '#5b6f6b',
    height: (options.height ?? 1) * (.97 + ((seed >>> 8) % 7) / 100)
  };
}

export function createPerson(scene, color = '#b4c39c', options = {}) {
  const group = build(personSpec(color, options));
  if (scene && scene.add) scene.add(group);
  return group;
}

export function createAvatar(scene, options = {}) {
  const spec = {
    jacket: options.color || '#2f7d86', jacketDark: '#255f66', cuff: '#3b8f97',
    pants: '#2b333c', skin: options.skin || '#d8a883', hair: options.hair || '#241d19',
    shoes: '#1f262b', collar: options.collar || '#d8d3c0', eyes: true, hands: true,
    hat: options.hat !== false, hatColor: options.hatColor || '#20343a',
    backpack: options.backpack !== false, backpackColor: options.backpackColor || '#b6553f',
    height: options.height ?? 1
  };
  const group = build(spec);
  if (scene && scene.add) scene.add(group);
  return group;
}

export function animatePerson(group, time, speed = 0) {
  const parts = group && group.userData && group.userData.parts;
  if (!parts) return;
  const k = .25;
  if (speed > .05) {
    const phase = time * (4.2 + speed * 1.1);
    const swing = Math.sin(phase);
    const legAmp = Math.min(.85, .38 + speed * .07), armAmp = legAmp * .62;
    if (parts.leftLeg) parts.leftLeg.rotation.x = swing * legAmp;
    if (parts.rightLeg) parts.rightLeg.rotation.x = -swing * legAmp;
    if (parts.leftArm) parts.leftArm.rotation.x = -swing * armAmp;
    if (parts.rightArm) parts.rightArm.rotation.x = swing * armAmp;
    if (parts.lowerLeftLeg) parts.lowerLeftLeg.rotation.x = -Math.max(0, -swing) * legAmp * .9;
    if (parts.lowerRightLeg) parts.lowerRightLeg.rotation.x = -Math.max(0, swing) * legAmp * .9;
  } else {
    const t = time * 1.3, breathe = Math.sin(t) * .05;
    if (parts.leftArm) parts.leftArm.rotation.x += (breathe - parts.leftArm.rotation.x) * k;
    if (parts.rightArm) parts.rightArm.rotation.x += (Math.sin(t + .7) * .05 - parts.rightArm.rotation.x) * k;
    if (parts.leftLeg) parts.leftLeg.rotation.x += (0 - parts.leftLeg.rotation.x) * k;
    if (parts.rightLeg) parts.rightLeg.rotation.x += (0 - parts.rightLeg.rotation.x) * k;
    if (parts.lowerLeftLeg) parts.lowerLeftLeg.rotation.x += (0 - parts.lowerLeftLeg.rotation.x) * k;
    if (parts.lowerRightLeg) parts.lowerRightLeg.rotation.x += (0 - parts.lowerRightLeg.rotation.x) * k;
  }
  if (parts.head) parts.head.rotation.y = Math.sin(time * .6) * (speed > .05 ? .05 : .12);
}
