import * as THREE from 'three';

// Offline procedural animal assets. Geometry and materials are shared between
// instances; every animated joint is cloned independently by makeAnimal().
const TAU = Math.PI * 2;
const templates = new Map();
const sphere = new THREE.SphereGeometry(1, 20, 14);
const unit = new THREE.Vector3(0, 1, 0);
const scratch = new THREE.Vector3();
let seed = 7319;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function color(value) { return value instanceof THREE.Color ? value.clone() : new THREE.Color(value); }
function mix(a, b, t) { return color(a).lerp(color(b), THREE.MathUtils.clamp(t, 0, 1)); }
function noise(x, y, z) { return Math.sin(x * 23.2 + y * 19.1 + z * 7.3) * Math.sin(x * 11.8 - y * 29.7 + z * 31.1); }
function texture(size, fn) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = fn(x / size, y / size, x, y), i = (y * size + x) * 4;
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
const coatTexture = texture(128, (u, v) => {
  const fibre = Math.sin(u * TAU * 57 + Math.sin(v * TAU * 3) * 1.5);
  const n = 224 + fibre * 10 + random() * 21;
  return [n, n, n];
});
coatTexture.repeat.set(5, 3);
const skinTexture = texture(64, () => { const n = 175 + random() * 80; return [n, n, n]; });
skinTexture.repeat.set(3, 3);
const furMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, vertexColors: true, map: coatTexture, bumpMap: coatTexture,
  bumpScale: .007, roughness: .88, metalness: 0, sheen: .4,
  sheenColor: new THREE.Color(0xbab1a0), sheenRoughness: .85,
});
const strandMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, vertexColors: true, roughness: .83, metalness: 0,
  sheen: .65, sheenColor: new THREE.Color(0xc9c0af), sheenRoughness: .7,
  side: THREE.DoubleSide,
});
const skinMat = new THREE.MeshStandardMaterial({ color: 0xba8e83, roughness: .7, bumpMap: skinTexture, bumpScale: .004 });
const noseMat = new THREE.MeshPhysicalMaterial({ color: 0x24211f, roughness: .28, clearcoat: .35, clearcoatRoughness: .2, bumpMap: skinTexture, bumpScale: .003 });
const pinkNoseMat = noseMat.clone(); pinkNoseMat.color.set(0xb47b72);
const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x120e09, roughness: .09, clearcoat: 1, clearcoatRoughness: .015 });
const pupilMat = new THREE.MeshPhysicalMaterial({ color: 0x030302, roughness: .035, clearcoat: 1 });
const glintMat = new THREE.MeshBasicMaterial({ color: 0xfff5df, transparent: true, opacity: .83 });
const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3e2c26, roughness: .8 });
const clawMat = new THREE.MeshStandardMaterial({ color: 0x6e6258, roughness: .48 });
const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xe2b04b, roughness: .32, metalness: .5, clearcoat: .28 });
const darkGoldMat = new THREE.MeshStandardMaterial({ color: 0x725320, roughness: .48, metalness: .7 });
const irisTextures = new Map();
function irisMaterial(tint) {
  if (irisTextures.has(tint)) return irisTextures.get(tint);
  const base = new THREE.Color(tint).convertLinearToSRGB();
  const map = texture(128, (u, v) => {
    const x = u * 2 - 1, y = v * 2 - 1, r = Math.hypot(x, y), a = Math.atan2(y, x);
    const fibres = .69 + Math.sin(a * 91 + r * 29) * .12 + Math.sin(a * 137 - r * 46) * .1 + random() * .1;
    const ring = r > .84 ? .45 : r < .39 ? .55 : 1;
    return [base.r * 255 * fibres * ring, base.g * 255 * fibres * ring, base.b * 255 * fibres * ring];
  });
  map.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshPhysicalMaterial({ map, roughness: .19, clearcoat: 1, clearcoatRoughness: .02 });
  irisTextures.set(tint, mat); return mat;
}

// A batch combines all coat surfaces and every curved tapered hair of a joint.
class Batch {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.i = []; }
  vertex(p, n, c, u = 0, v = 0) {
    const i = this.p.length / 3; this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z);
    this.c.push(c.r, c.g, c.b); this.uv.push(u, v); return i;
  }
  triangle(a, b, c) { this.i.push(a, b, c); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.i); g.computeBoundingSphere(); return g;
  }
}
function bone(parent, name, position = [0, 0, 0]) {
  const g = new THREE.Group(); g.name = name; g.position.set(...position); parent.add(g);
  g._surface = new Batch(); g._hair = new Batch(); return g;
}
function finish(root) {
  root.updateMatrixWorld(true);
  root.traverse(g => {
    if (!g._surface) return;
    for (const [batch, material, shadow] of [[g._surface, furMat, true], [g._hair, strandMat, false]]) {
      if (!batch.i.length) continue;
      const inverse = g.matrixWorld.clone().invert(), contact = new THREE.Vector3();
      for (let i = 0; i < batch.p.length; i += 3) {
        contact.fromArray(batch.p, i).applyMatrix4(g.matrixWorld);
        if (contact.y < .001) { contact.y = .001; contact.applyMatrix4(inverse); batch.p[i] = contact.x; batch.p[i + 1] = contact.y; batch.p[i + 2] = contact.z; }
      }
      const geometry = batch.geometry(); if (shadow) geometry.computeVertexNormals();
      const m = new THREE.Mesh(geometry, material); m.castShadow = shadow; m.receiveShadow = true;
      m.name = shadow ? 'undercoat' : 'individual-fibres'; g.add(m);
    }
    delete g._surface; delete g._hair;
  });
  return root;
}
function smooth(parent, material, p, scale, rotation) {
  const m = new THREE.Mesh(sphere, material); m.position.set(...p); m.scale.set(...scale);
  if (rotation) m.rotation.set(...rotation);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function ribbon(batch, points, normal, width, tint, crossing = false) {
  const n = normal.clone().normalize(), start = batch.p.length / 3;
  for (let j = 0; j < points.length; j++) {
    const t = j / (points.length - 1);
    const tangent = points[Math.min(j + 1, points.length - 1)].clone().sub(points[Math.max(0, j - 1)]).normalize();
    let side = new THREE.Vector3().crossVectors(tangent, n);
    if (side.lengthSq() < .001) side.crossVectors(tangent, new THREE.Vector3(1, .25, .12));
    side.normalize(); if (crossing) side.cross(tangent).normalize();
    const w = width * (1 - t * .92), shade = tint.clone().multiplyScalar(.84 + t * .23);
    const nn = new THREE.Vector3().crossVectors(side, tangent).normalize();
    batch.vertex(points[j].clone().addScaledVector(side, -w), nn, shade, 0, t);
    batch.vertex(points[j].clone().addScaledVector(side, w), nn, shade, 1, t);
    if (j) { const k = start + j * 2; batch.triangle(k - 2, k - 1, k); batch.triangle(k, k - 1, k + 1); }
  }
}
function fibre(g, p, normal, length, tint, comb, curl = 0, width = .0023) {
  const n = normal.clone().normalize();
  let tangent = (typeof comb === 'function' ? comb(p, n) : new THREE.Vector3(...(comb || [0, -1, -.12]))).clone();
  tangent.addScaledVector(n, -tangent.dot(n));
  if (tangent.lengthSq() < .001) tangent.set(n.z + .3, .01, -n.x).addScaledVector(n, -.01);
  tangent.normalize();
  const side = new THREE.Vector3().crossVectors(n, tangent).normalize();
  const angle = (random() - .5) * .7;
  tangent.multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle));
  const points = [];
  if (curl) {
    const phase = random() * TAU, radius = curl * (.7 + random() * .6);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, a = phase + t * TAU * 1.1, taper = Math.sin(t * Math.PI * .8);
      points.push(p.clone().addScaledVector(n, length * t * .83 + .002)
        .addScaledVector(tangent, (Math.cos(a) - Math.cos(phase)) * radius * taper + length * .25 * t)
        .addScaledVector(side, (Math.sin(a) - Math.sin(phase)) * radius * taper));
    }
  } else {
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      points.push(p.clone().addScaledVector(n, .002 + length * (.54 * t - .16 * t * t))
        .addScaledVector(tangent, length * t * .84).addScaledVector(side, Math.sin(t * 3.1) * length * .08));
    }
  }
  ribbon(g._hair, points, n, width, tint);
  if (curl || random() < .16) ribbon(g._hair, points, n, width * .72, tint, true);
}
function fur(g, center, radii, coat, opts = {}) {
  const c = new THREE.Vector3(...center), r = new THREE.Vector3(...radii);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(opts.rotation || [0, 0, 0])));
  const tint = (p, n) => typeof coat === 'function' ? coat(p, n) : color(coat);
  const seg = opts.segments || 26, rings = opts.rings || 18, start = g._surface.p.length / 3;
  for (let iy = 0; iy <= rings; iy++) for (let ix = 0; ix <= seg; ix++) {
    const phi = iy / rings * Math.PI, theta = ix / seg * TAU;
    const s = new THREE.Vector3(-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi));
    const wobble = opts.curl ? 1 + noise(s.x * 2, s.y * 2, s.z * 2) * .022 : 1;
    const p = s.clone().multiply(r).multiplyScalar(wobble).applyQuaternion(q).add(c);
    const n = s.clone().divide(r).normalize().applyQuaternion(q);
    const shade = tint(p, n).multiplyScalar(.94 + noise(p.x, p.y, p.z) * .06);
    g._surface.vertex(p, n, shade, ix / seg, iy / rings);
    if (ix && iy) { const a = start + iy * (seg + 1) + ix; g._surface.triangle(a - seg - 2, a - 1, a); g._surface.triangle(a - seg - 2, a, a - seg - 1); }
  }
  const count = Math.round((opts.count || 800) * (opts.curl ? .64 : .76));
  for (let i = 0; i < count; i++) {
    const yy = 1 - 2 * (i + .5) / count, a = i * 2.3999632297 + random() * .35, rr = Math.sqrt(1 - yy * yy);
    const s = new THREE.Vector3(Math.cos(a) * rr, yy, Math.sin(a) * rr);
    const wobble = opts.curl ? 1 + noise(s.x * 2, s.y * 2, s.z * 2) * .022 : 1;
    const p = s.clone().multiply(r).multiplyScalar(wobble).applyQuaternion(q).add(c);
    const n = s.clone().divide(r).normalize().applyQuaternion(q);
    if (opts.filter && !opts.filter(p, n)) continue;
    const col = tint(p, n).multiplyScalar(.77 + random() * .42);
    fibre(g, p, n, (opts.length || .047) * (.64 + random() * .7), col, opts.comb, opts.curl || 0, opts.width || .0022);
  }
}
function pathTube(g, points, radius, tint, options = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const segments = options.segments || 40, sides = options.sides || 10;
  const frames = curve.computeFrenetFrames(segments, false), start = g._surface.p.length / 3;
  const rad = t => typeof radius === 'function' ? radius(t) : radius;
  const col = (p, n, t) => typeof tint === 'function' ? tint(p, n, t) : color(tint);
  for (let i = 0; i <= segments; i++) for (let j = 0; j <= sides; j++) {
    const t = i / segments, a = j / sides * TAU;
    const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
    const p = curve.getPointAt(t).addScaledVector(n, rad(t));
    g._surface.vertex(p, n, col(p, n, t), j / sides, t);
    if (i && j) { const k = start + i * (sides + 1) + j; g._surface.triangle(k - sides - 2, k, k - 1); g._surface.triangle(k - sides - 2, k - sides - 1, k); }
  }
  const count = Math.round((options.count || 0) * (options.curl ? .64 : .76));
  for (let i = 0; i < count; i++) {
    const t = (i + random()) / count, f = Math.min(segments, Math.round(t * segments)), a = random() * TAU;
    const n = frames.normals[f].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[f], Math.sin(a));
    const p = curve.getPointAt(t).addScaledVector(n, rad(t));
    fibre(g, p, n, (options.length || .045) * (.6 + random() * .8), col(p, n, t).multiplyScalar(.77 + random() * .4), () => frames.tangents[f].clone(), options.curl || 0, options.width || .0022);
  }
}
function detailTube(parent, points, radius, material, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, radial, false), material);
  m.castShadow = true; parent.add(m); return m;
}
function eye(head, x, y, z, size, iris = 0x8c6630, feline = false) {
  const g = new THREE.Group(); g.name = 'eye-unit'; g.position.set(x, y, z); g.rotation.y = Math.sign(x) * .12; head.add(g);
  smooth(g, mouthMat, [0, 0, -.006], [size * 1.14, size * (feline ? .91 : 1.12), size * .7]);
  const eye = smooth(g, eyeMat, [0, 0, .008], [size, size * (feline ? .77 : .98), size * .74]);
  eye.name = 'eye';
  const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(size * .73, 32), irisMaterial(iris));
  irisMesh.position.set(0, 0, .008 + size * .746); irisMesh.scale.y = feline ? .92 : 1; g.add(irisMesh);
  smooth(g, pupilMat, [0, 0, .008 + size * .762], [size * (feline ? .17 : .37), size * (feline ? .61 : .4), size * .08]);
  smooth(g, glintMat, [-size * .25, size * .31, .008 + size * .785], [size * .105, size * .12, size * .035]);
  smooth(g, glintMat, [size * .21, -size * .18, .008 + size * .77], [size * .035, size * .045, size * .018]);
  // Dark tear ducts and a thin upper lid make a small globe read as a real eye.
  const lid = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; lid.push([Math.cos(a) * size * 1.03, Math.sin(a) * size * (feline ? .81 : 1.02), size * .36]); }
  detailTube(g, lid, size * .055, mouthMat, 5);
}
function whiskers(g, origin, span = .29, shade = 0xd4c5ad, amount = 5) {
  for (const s of [-1, 1]) for (let i = 0; i < amount; i++) {
    const y = origin[1] + (i - (amount - 1) / 2) * .018;
    const p = new THREE.Vector3(s * origin[0], y, origin[2] - Math.abs(i - 2) * .005);
    const points = [p, p.clone().add(new THREE.Vector3(s * span * .47, (i - 2) * .013, .035)),
      p.clone().add(new THREE.Vector3(s * span, (i - 2) * .039 - .008, -.025))];
    ribbon(g._hair, points, new THREE.Vector3(0, 0, 1), .0016, color(shade));
  }
}
function nose(head, position, size, pink = false, dog = false) {
  const [x, y, z] = position, [w, h, d] = size;
  smooth(head, pink ? pinkNoseMat : noseMat, position, size);
  for (const side of [-1, 1]) {
    smooth(head, pupilMat, [x + side * w * .57, y + h * .01, z + d * .79], [w * .19, h * .17, d * .08], [0, side * .4, side * -.25]);
    if (dog) smooth(head, noseMat, [x + side * w * .79, y - .005, z + d * .2], [w * .28, h * .52, d * .49]);
  }
  detailTube(head, [[x, y - h * .65, z + d * .36], [x, y - h * 1.56, z + d * .1]], .004, mouthMat, 5);
}
function mouth(head, x, y, z, width = .09) {
  for (const side of [-1, 1]) detailTube(head, [[x, y, z], [x + side * width * .45, y - .02, z - .006], [x + side * width, y - .004, z - .045]], .0032, mouthMat, 5);
}
function paw(parent, name, position, tint, options = {}) {
  const g = bone(parent, name, position), width = options.width || .105, depth = options.depth || .15;
  fur(g, [0, .075, 0], [width, .078, depth], tint, { count: options.curl ? 120 : 190, length: options.length || .022, curl: options.curl || 0, width: .0018 });
  for (const b of [g._surface, g._hair]) for (let i = 1; i < b.p.length; i += 3) b.p[i] = Math.max(.001, b.p[i]);
  const toes = options.toes || 4;
  for (let i = 0; i < toes; i++) {
    const xx = (i - (toes - 1) / 2) * width * .48;
    if (options.fingers) {
      smooth(g, skinMat, [xx, .055, depth * .75], [width * .17, .031, .074]);
      detailTube(g, [[xx, .057, depth * .97], [xx + .006, .052, depth * 1.25], [xx + .009, .039, depth * 1.36]], .007, clawMat, 5);
    } else {
      detailTube(g, [[xx, .063, depth * .77], [xx, .052, depth * 1.04], [xx, .033, depth * 1.13]], .0075, clawMat, 5);
    }
  }
  return g;
}
function roundedEar(head, name, position, tint, inner, size, turn) {
  const g = bone(head, name, position); g.rotation.z = turn;
  const [w, h] = size;
  fur(g, [0, h * .45, -.008], [w, h * .56, .066], tint, { count: 520, length: .024, width: .0017, comb: [0, 1, -.2] });
  const skin = skinMat.clone(); skin.color.set(inner);
  smooth(g, skin, [0, h * .47, .048], [w * .73, h * .435, .021]);
  // Folded base, a dark concha and light down along the rim.
  smooth(g, skin, [-w * .2, h * .16, .07], [w * .52, h * .16, .025], [0, 0, -.22]);
  smooth(g, mouthMat, [0, h * .17, .062], [w * .31, h * .09, .012]);
  for (let i = 0; i < 65; i++) {
    const a = random() * TAU;
    const p = new THREE.Vector3(Math.cos(a) * w * .78, h * .47 + Math.sin(a) * h * .43, .067);
    fibre(g, p, new THREE.Vector3(0, 0, 1), .018, color(tint).multiplyScalar(1.15), [0, 1, 0], 0, .0013);
  }
  return g;
}
function catEar(head, name, position, tint, side) {
  const g = bone(head, name, position); g.rotation.z = -side * .2; g.rotation.y = side * .12;
  const outer = new THREE.Shape();
  outer.moveTo(-.155, 0); outer.bezierCurveTo(-.148, .13, -.049, .285, -.007, .34);
  outer.quadraticCurveTo(.014, .355, .039, .304); outer.bezierCurveTo(.089, .202, .145, .035, .155, 0); outer.closePath();
  const geom = new THREE.ExtrudeGeometry(outer, { depth: .032, bevelEnabled: true, bevelSegments: 3, bevelSize: .013, bevelThickness: .012, curveSegments: 12 });
  const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: .9, bumpMap: coatTexture, bumpScale: .01 });
  const m = new THREE.Mesh(geom, mat); m.castShadow = true; g.add(m);
  const inner = new THREE.Shape(); inner.moveTo(-.103, .035); inner.quadraticCurveTo(-.039, .194, .009, .278); inner.quadraticCurveTo(.066, .17, .101, .036); inner.quadraticCurveTo(0, .065, -.103, .035);
  const skin = new THREE.Mesh(new THREE.ShapeGeometry(inner, 16), skinMat); skin.position.z = .048; g.add(skin);
  for (let i = 0; i < 200; i++) {
    const y = random() * .3, w = .15 * Math.pow(1 - y / .35, .74), x = (random() * 2 - 1) * w;
    const p = new THREE.Vector3(x, y, random() < .5 ? -.013 : .049);
    fibre(g, p, new THREE.Vector3(x * 2, .2, p.z > 0 ? 1 : -1).normalize(), .022, color(tint).multiplyScalar(.85 + random() * .4), [x > 0 ? 1 : -1, 1, 0], 0, .0017);
  }
  for (let i = 0; i < 20; i++) {
    const p = new THREE.Vector3((random() - .5) * .11, .053 + random() * .08, .055);
    fibre(g, p, new THREE.Vector3(0, 0, 1), .045, color(0xe8ccb0), [0, 1, 0], 0, .0013);
  }
  return g;
}

function possum(root, body, head) {
  const coat = (p, n) => {
    const belly = THREE.MathUtils.smoothstep(n.z, .35, .86) * (1 - THREE.MathUtils.smoothstep(Math.abs(p.x), .18, .4));
    return mix(0x79766d, 0xcfc5ae, belly * .9).multiplyScalar(.98 + noise(p.x * .6, p.y * .6, p.z * .6) * .09);
  };
  fur(body, [0, .6, -.055], [.405, .535, .315], coat, { count: 3300, length: .064, width: .0025 });
  fur(body, [0, .81, .075], [.29, .32, .245], coat, { count: 1100, length: .061 });
  for (const s of [-1, 1]) {
    const leg = bone(body, `leg-${s}`, [s * .26, .32, -.035]);
    fur(leg, [0, -.033, 0], [.18, .245, .205], coat, { count: 740, length: .057 });
    paw(leg, 'hind-paw', [s * .025, -.32, .135], 0xaaa18f, { width: .115, depth: .125, fingers: true, toes: 5 });
    const arm = bone(body, `arm-${s}`, [s * .303, .82, .085]); arm.rotation.z = s * .15;
    fur(arm, [s * .027, -.16, .025], [.11, .244, .118], coat, { count: 730, length: .055, comb: [0, -1, .1] });
    const hand = paw(arm, 'hand', [s * .025, -.387, .035], 0x9a968a, { width: .077, depth: .098, fingers: true, toes: 5, length: .018 });
    hand.rotation.x = -.37;
  }
  const headCoat = (p, n) => {
    const central = 1 - THREE.MathUtils.smoothstep(Math.abs(p.x), .10, .28);
    return mix(0x8c8778, 0xc4bba5, central * Math.max(0, n.z) * .75);
  };
  fur(head, [0, .015, -.015], [.371, .305, .284], headCoat, { count: 2450, length: .043, comb: p => new THREE.Vector3(p.x * 2, -.65, -.35) });
  for (const s of [-1, 1]) fur(head, [s * .2, -.115, .136], [.174, .166, .173], 0xbab09a, { count: 570, length: .05, comb: [s, -.4, -.3] });
  fur(head, [0, -.12, .271], [.211, .136, .211], 0xc6baa1, { count: 920, length: .027, comb: p => new THREE.Vector3(p.x * 2, -.3, -1), width: .0017 });
  fur(head, [0, -.219, .268], [.143, .065, .143], 0xd4c9b2, { count: 230, length: .025 });
  for (const s of [-1, 1]) {
    roundedEar(head, `ear-${s}`, [s * .267, .209, -.092], 0x7b766a, 0xb99089, [.137, .372], -s * .19);
    eye(head, s * .208, .037, .23, .073, 0x866235);
    // A dark eye margin is common to the brushtail's cream facial mask.
    fur(head, [s * .21, .122, .211], [.104, .039, .074], 0x716f64, { count: 165, length: .022, comb: [s, 0, -.4] });
  }
  nose(head, [0, -.115, .464], [.092, .058, .046], true);
  mouth(head, 0, -.2, .438, .072);
  whiskers(head, [.129, -.17, .413], .285, 0xcec5b1, 6);
  const tail = bone(body, 'tail', [0, .062, 0]);
  pathTube(tail, [[-.035, .32, -.24], [-.36, .30, -.53], [-.77, .185, -.5], [-1.015, .16, -.17], [-.97, .17, .16], [-.73, .185, .31]],
    t => .018 + .178 * Math.pow(Math.sin((t * .88 + .09) * Math.PI), .8) * Math.pow(1 - t, .18),
    (p, n, t) => mix(0x57544d, 0x302f2c, t * .75).multiplyScalar(.95 + noise(p.x, p.y, p.z) * .14),
    { count: 3400, length: .09, width: .0029, segments: 56, sides: 14 });
}

function poodle(root, body, head) {
  head.position.y = 1.015;
  const coat = (p, n) => mix(0xbb8954, 0xe1bb87, (n.y + n.z + 1.9) / 3.7);
  const curly = { curl: .012, length: .057, width: .0035 };
  fur(body, [0, .52, -.05], [.315, .388, .269], coat, { ...curly, count: 1500 });
  fur(body, [0, .758, .025], [.233, .235, .211], 0xd9ae79, { ...curly, count: 530 });
  for (const s of [-1, 1]) {
    const rear = bone(body, `leg-rear-${s}`, [s * .237, .225, -.098]);
    fur(rear, [0, .008, 0], [.143, .211, .183], coat, { ...curly, count: 390 });
    paw(rear, 'rear-paw', [s * .013, -.225, .038], 0xd9b17e, { width: .108, depth: .138, ...curly });
    const leg = bone(body, `leg-front-${s}`, [s * .16, .602, .18]);
    fur(leg, [0, -.236, -.012], [.079, .267, .09], 0xd3a36c, { ...curly, count: 460, length: .044 });
    paw(leg, 'front-paw', [0, -.602, .035], 0xe5bd87, { width: .097, depth: .145, ...curly });
  }
  fur(head, [0, -.01, -.017], [.305, .256, .251], coat, { ...curly, count: 1180, curl: .011, length: .048 });
  fur(head, [0, .168, -.017], [.279, .139, .228], 0xe2bd8c, { ...curly, count: 660, length: .066 });
  for (const s of [-1, 1]) {
    const ear = bone(head, `ear-${s}`, [s * .272, .087, -.037]); ear.rotation.z = s * .09;
    fur(ear, [s * .035, -.217, -.013], [.109, .27, .126], 0xb98046, { ...curly, count: 740, curl: .014, length: .054, comb: [0, -1, .1] });
    fur(head, [s * .161, -.19, .175], [.149, .13, .163], 0xe5bf8b, { ...curly, count: 330, curl: .007, length: .027 });
    eye(head, s * .149, -.036, .221, .06, 0x7a5025);
    fur(head, [s * .151, .047, .204], [.107, .041, .07], 0xe5c08b, { ...curly, count: 155, curl: .008, length: .027 });
  }
  fur(head, [0, -.154, .295], [.147, .095, .16], 0xe7c391, { count: 460, length: .026, curl: .006, width: .002, comb: [0, -1, -.4] });
  fur(head, [0, -.255, .241], [.136, .057, .127], 0xe4c39a, { count: 180, length: .03, curl: .006 });
  nose(head, [0, -.124, .447], [.076, .053, .046], false, true);
  mouth(head, 0, -.208, .406, .073);
  whiskers(head, [.09, -.2, .377], .14, 0xc8b397, 3);
  const tail = bone(body, 'tail');
  pathTube(tail, [[.02, .55, -.25], [.08, .7, -.35], [.1, .87, -.36], [.17, .92, -.31]], t => .071 - t * .039, 0xd5a771,
    { count: 420, curl: .013, length: .054, width: .0032, segments: 28 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x7b6051, roughness: .78, bumpMap: skinTexture, bumpScale: .004 });
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.209, .019, 8, 48), collarMat);
  collar.position.set(0, .815, .024); collar.rotation.x = Math.PI / 2; collar.scale.y = .9; body.add(collar);
  smooth(body, goldMat, [.026, .78, .229], [.035, .044, .008]);
}

function cat(root, body, head) {
  head.position.y = 1.015;
  const orange = 0xc17e40, pale = 0xdbc099, rust = 0x895329;
  const coat = (p, n) => {
    let c = mix(orange, 0xd29b5b, Math.max(0, n.z) * .36);
    const stripes = Math.sin(p.y * 35 + Math.sin(p.z * 9) * 1.22 + p.x * 1.8);
    const mask = THREE.MathUtils.smoothstep(stripes, .55, .88) * THREE.MathUtils.smoothstep(Math.abs(p.x) + Math.max(0, -p.z), .12, .3);
    c.lerp(color(rust), mask * .87);
    const chest = THREE.MathUtils.smoothstep(n.z, .67, .95) * (1 - THREE.MathUtils.smoothstep(Math.abs(p.x), .07, .20));
    return c.lerp(color(pale), chest * .87);
  };
  fur(body, [0, .462, -.067], [.282, .405, .248], coat, { count: 1900, length: .033, width: .002 });
  fur(body, [0, .738, .027], [.214, .231, .203], coat, { count: 700, length: .031 });
  for (const s of [-1, 1]) {
    const leg = bone(body, `leg-rear-${s}`, [s * .223, .218, -.064]);
    fur(leg, [0, .013, 0], [.129, .216, .164], (p, n) => coat(p.clone().add(new THREE.Vector3(s * .223, .218, -.064)), n), { count: 570, length: .03 });
    paw(leg, 'rear-paw', [s * .01, -.218, .04], 0xd3a86e, { width: .093, depth: .126, length: .02 });
    const fore = bone(body, `leg-front-${s}`, [s * .127, .614, .169]);
    fur(fore, [0, -.243, 0], [.065, .276, .076], (p, n) => coat(p.clone().add(new THREE.Vector3(s * .127, .614, .169)), n), { count: 460, length: .023, width: .0018 });
    paw(fore, 'front-paw', [0, -.614, .041], 0xdabc8d, { width: .083, depth: .12, length: .019 });
  }
  const faceCoat = (p, n) => {
    let c = mix(orange, 0xe0b57f, (1 - THREE.MathUtils.smoothstep(Math.abs(p.x), .06, .22)) * Math.max(0, n.z) * .3);
    const forehead = THREE.MathUtils.smoothstep(p.y, -.025, .072) * THREE.MathUtils.smoothstep(p.z, .09, .19);
    const m = Math.sin(p.x * 59 + Math.abs(p.y - .095) * 15);
    c.lerp(color(rust), THREE.MathUtils.smoothstep(m, .6, .9) * forehead * .84);
    const cheeks = THREE.MathUtils.smoothstep(Math.abs(p.x), .13, .23) * (1 - THREE.MathUtils.smoothstep(p.y, -.03, .11));
    c.lerp(color(rust), THREE.MathUtils.smoothstep(Math.sin(p.y * 52 + Math.abs(p.x) * 9), .63, .94) * cheeks * .7);
    return c;
  };
  fur(head, [0, -.015, -.005], [.295, .259, .237], faceCoat, { count: 1800, length: .025, width: .0018, comb: p => new THREE.Vector3(p.x * 2, -.5, -.5) });
  for (const s of [-1, 1]) {
    fur(head, [s * .174, -.102, .091], [.119, .127, .15], faceCoat, { count: 360, length: .032, comb: [s, -.25, -.4] });
    catEar(head, `ear-${s}`, [s * .201, .158, -.051], 0xb17a45, s);
    eye(head, s * .146, -.006, .202, .063, 0xada052, true);
    fur(head, [s * .103, -.148, .241], [.119, .083, .105], 0xe2c8a3, { count: 320, length: .02, width: .0016, comb: [s, -.3, -.4] });
    for (let j = 0; j < 4; j++) smooth(head, mouthMat, [s * (.096 + (j % 2) * .027), -.125 - Math.floor(j / 2) * .025, .336 - (j % 2) * .005], [.003, .003, .0015]);
  }
  fur(head, [0, -.218, .196], [.11, .049, .105], 0xe0c6a0, { count: 140, length: .017 });
  nose(head, [0, -.117, .336], [.049, .034, .026], true);
  mouth(head, 0, -.173, .318, .07);
  whiskers(head, [.119, -.154, .315], .25, 0xe6d7bb, 6);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const p = new THREE.Vector3(s * .14, .075, .202);
    ribbon(head._hair, [p, p.clone().add(new THREE.Vector3(s * .045, .08 + i * .012, .015)), p.clone().add(new THREE.Vector3(s * (.08 + i * .018), .12 + i * .012, -.01))], new THREE.Vector3(0, 0, 1), .0012, color(0xd9bd95));
  }
  const tail = bone(body, 'tail');
  pathTube(tail, [[0, .255, -.233], [.36, .185, -.36], [.571, .27, -.3], [.632, .62, -.255], [.597, .925, -.24], [.493, 1.028, -.186]],
    t => .025 + .043 * Math.pow(1 - t, .6), (p, n, t) => mix(orange, rust, THREE.MathUtils.smoothstep(Math.sin(t * 53), .25, .65) * .93),
    { count: 1550, length: .027, width: .0018, segments: 56, sides: 12 });
}

function badge(body) {
  const g = new THREE.Group(); g.position.set(.169, .546, .285); g.rotation.y = .15; body.add(g);
  const star = new THREE.Shape();
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + Math.PI / 2, r = i % 2 ? .054 : .102;
    if (i) star.lineTo(Math.cos(a) * r, Math.sin(a) * r); else star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  star.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: .012, bevelEnabled: true, bevelSegments: 2, bevelSize: .004, bevelThickness: .003 }), goldMat);
  mesh.castShadow = true; g.add(mesh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.036, .003, 6, 32), darkGoldMat); ring.position.z = .019; g.add(ring);
  smooth(g, goldMat, [0, 0, .019], [.03, .03, .009]);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 2; smooth(g, goldMat, [Math.cos(a) * .097, Math.sin(a) * .097, .015], [.01, .01, .006]); }
}
function devil(root, body, head) {
  // Soft juvenile proportions, relaxed ears and a closed smile keep these
  // little guards friendly even while their story sound is a playful growl.
  head.position.y = 1.015;
  const black = 0x2c302d;
  const coat = (p, n) => {
    const v = Math.abs(p.y - (.648 + Math.abs(p.x) * .58));
    const stripe = (1 - THREE.MathUtils.smoothstep(v, .037, .065)) * THREE.MathUtils.smoothstep(p.z, .14, .236);
    return mix(black, 0xe0ded1, stripe).multiplyScalar(.96 + noise(p.x * .7, p.y * .8, p.z * .8) * .08);
  };
  fur(body, [0, .508, -.032], [.368, .435, .301], coat, { count: 2300, length: .048, width: .0021 });
  fur(body, [0, .758, -.016], [.282, .253, .23], coat, { count: 750, length: .053 });
  for (const side of [-1, 1]) fur(body, [side * .145, .74, .245], [.175, .036, .051], 0xeeeadd, { rotation: [0, 0, side * .53], count: 300, length: .019, width: .0018, comb: [side, -.3, 0] });
  for (const s of [-1, 1]) {
    const rear = bone(body, `leg-${s}`, [s * .238, .22, -.08]);
    fur(rear, [0, 0, 0], [.157, .191, .196], black, { count: 430, length: .038 });
    paw(rear, 'rear-paw', [s * .02, -.22, .094], black, { width: .122, depth: .15, length: .026 });
    const arm = bone(body, `arm-${s}`, [s * .281, .704, .069]); arm.rotation.z = s * -.025;
    fur(arm, [s * .035, -.19, .025], [.112, .243, .115], black, { count: 580, length: .038 });
    paw(arm, 'fore-paw', [s * .038, -.548, .059], black, { width: .11, depth: .135, length: .026 });
    fur(arm, [s * .037, -.413, .03], [.086, .115, .091], black, { count: 230, length: .028 });
  }
  fur(head, [0, -.005, -.027], [.377, .303, .277], 0x363b35, { count: 2000, length: .041, comb: p => new THREE.Vector3(p.x * 2, -.35, -.65) });
  for (const s of [-1, 1]) {
    fur(head, [s * .208, -.111, .116], [.155, .143, .157], 0x44483f, { count: 450, length: .037, comb: [s, -.25, -.5] });
    roundedEar(head, `ear-${s}`, [s * .287, .2, -.095], 0x383c34, 0xc87570, [.148, .235], -s * .32);
    // Open, warm eyes sit below soft lifted brows, with no inward scowl.
    eye(head, s * .191, .026, .237, .078, 0x987340);
    fur(head, [s * .191, .139, .22], [.103, .035, .063], 0x55584b, { count: 160, length: .024, comb: [s, .4, -.3] });
  }
  fur(head, [0, -.12, .26], [.192, .12, .15], 0x626454, { count: 740, length: .024, width: .0017, comb: [0, -.3, -1] });
  for (const s of [-1, 1]) fur(head, [s * .09, -.147, .298], [.112, .077, .098], 0x6a6b59, { count: 260, length: .018, width: .0016, comb: [s, -.1, -.5] });
  fur(head, [0, -.223, .223], [.144, .058, .12], 0x73715e, { count: 180, length: .024 });
  nose(head, [0, -.103, .396], [.093, .057, .047], false, true);
  for (const s of [-1, 1]) {
    const smile = detailTube(head, [[0, -.182, .397], [s * .064, -.194, .383], [s * .13, -.158, .347]], .0041, mouthMat, 6);
    smile.name = 'friendly-smile';
  }
  whiskers(head, [.135, -.154, .36], .145, 0xa7aa96, 4);
  const tail = bone(body, 'tail');
  pathTube(tail, [[0, .292, -.242], [.26, .218, -.455], [.52, .155, -.45], [.7, .16, -.34]], t => .015 + .078 * Math.pow(1 - t, .73), black,
    { count: 670, length: .037, width: .0021, segments: 34 });
  badge(body);
}

export function makeAnimal(type = 'possum') {
  if (!['possum', 'poodle', 'cat', 'devil'].includes(type)) type = 'possum';
  if (!templates.has(type)) {
    seed = { possum: 73912, poodle: 95672, cat: 33893, devil: 86149 }[type];
    const root = new THREE.Group(); root.name = type;
    const body = bone(root, 'body'); const head = bone(body, 'head', [0, 1.1, 0]);
    ({ possum, poodle, cat, devil })[type](root, body, head);
    templates.set(type, finish(root));
  }
  const root = templates.get(type).clone(true), body = root.getObjectByName('body'), head = root.getObjectByName('head');
  const legs = [], arms = [], ears = [], eyes = [];
  root.traverse(o => {
    if (o.name === 'eye-unit') eyes.push(o);
    if (o.name.startsWith('leg-')) legs.push(o);
    if (o.name.startsWith('arm-')) arms.push(o);
    if (o.name.startsWith('ear-')) ears.push(o);
  });
  root.userData = { type, body, head, legs, arms, ears, eyes, tail: root.getObjectByName('tail'), base: new THREE.Vector3(), phase: Math.random() * TAU, react: 0 };
  return root;
}
