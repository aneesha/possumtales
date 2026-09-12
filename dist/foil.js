import * as THREE from 'three';

// Neutral studio reflections are generated locally, so silver stays bright
// even when the story is opened as a single offline file.
const silver = new THREE.MeshPhysicalMaterial({
  color: 0xeff3f8, metalness: 1, roughness: .16, envMapIntensity: 1.25,
  clearcoat: .4, clearcoatRoughness: .12, flatShading: true, side: THREE.DoubleSide,
});
export function lightFoil(renderer) {
  const width = 256, height = 128, data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height;
    const panel = (cx, cy, wx, wy) => Math.exp(-Math.pow((u - cx) / wx, 8) - Math.pow((v - cy) / wy, 8));
    const light = .32 + 3.4 * panel(.19, .4, .095, .27) + 4.4 * panel(.68, .48, .04, .36) + 1.7 * panel(.89, .3, .11, .17);
    const i = (y * width + x) * 4;
    data[i] = light * .94; data[i + 1] = light * .98; data[i + 2] = light * 1.04; data[i + 3] = 1;
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping; texture.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  silver.envMap = generator.fromEquirectangular(texture).texture;
  silver.needsUpdate = true; texture.dispose(); generator.dispose();
}

function crinkle(x, y, z) {
  return Math.sin(x * 83 + y * 47 + z * 61) * Math.sin(x * 37 - y * 71 + z * 43);
}
function attach(parent, geometry, position, material = silver) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
let sparkleTexture;
function glint(parent, position, size) {
  if (!sparkleTexture) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'), glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, 'white'); glow.addColorStop(.13, 'rgba(242,249,255,.95)'); glow.addColorStop(1, 'rgba(235,246,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.moveTo(32, 1); ctx.lineTo(36, 28); ctx.lineTo(63, 32); ctx.lineTo(36, 36);
    ctx.lineTo(32, 63); ctx.lineTo(28, 36); ctx.lineTo(1, 32); ctx.lineTo(28, 28); ctx.closePath(); ctx.fill();
    sparkleTexture = new THREE.CanvasTexture(canvas);
  }
  const material = new THREE.SpriteMaterial({map: sparkleTexture, transparent: true, depthWrite: false, toneMapped: false});
  const sprite = new THREE.Sprite(material); sprite.position.set(...position); sprite.scale.setScalar(size); parent.add(sprite);
  return sprite;
}
export function foil(parent, position, size = .18) {
  const geometry = new THREE.IcosahedronGeometry(size, 2), p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), scale = 1 + crinkle(x, y, z) * .14;
    p.setXYZ(i, x * scale, y * scale * .84, z * scale);
  }
  geometry.computeVertexNormals();
  const mesh = attach(parent, geometry, position); mesh.rotation.set(.2, 1, .7);
  mesh.userData.glint = glint(mesh, [size * .35, size * .8, size * .4], size * .72);
  return mesh;
}

export function dressAsFoilEgg(possum) {
  const body = possum.userData.body, head = possum.userData.head;
  head.position.z = .16;
  const suit = new THREE.Group(); suit.name = 'silver-easter-egg'; body.add(suit);
  // A single tapered ovoid wraps the entire animal, with an opening for its face.
  const source = new THREE.SphereGeometry(1, 44, 34).toNonIndexed();
  const p = source.attributes.position, points = [];
  for (let i = 0; i < p.count; i += 3) {
    const triangle = [];
    for (let j = 0; j < 3; j++) {
      const x = p.getX(i + j), y = p.getY(i + j), z = p.getZ(i + j), wrinkle = 1 + crinkle(x, y, z) * .025;
      const taper = 1 - y * .19;
      triangle.push([x * .65 * taper * wrinkle, .84 + y * .83 * wrinkle, -.035 + z * .55 * taper * wrinkle]);
    }
    const center = triangle.reduce((a, v) => a.map((n, k) => n + v[k] / 3), [0, 0, 0]);
    const aperture = (center[0] / .37) ** 2 + ((center[1] - 1.12) / .31) ** 2;
    if (center[2] > .06 && aperture < 1) continue;
    for (const v of triangle) points.push(...v);
  }
  source.dispose();
  const egg = new THREE.BufferGeometry(); egg.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); egg.computeVertexNormals();
  attach(suit, egg, [0, 0, 0]);
  // A narrow printed zigzag band gives the silver wrapper an Easter-egg motif.
  const ribbon = silver.clone(); ribbon.color.set(0xc0a9e0); ribbon.roughness = .24;
  const line = [];
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI * 2, y = .57 + (i % 4 < 2 ? .055 : -.055);
    const ny = (y - .84) / .83, r = Math.sqrt(1 - ny * ny) * (1 - ny * .19);
    line.push(new THREE.Vector3(Math.cos(a) * .66 * r, y, -.035 + Math.sin(a) * .56 * r));
  }
  const curve = new THREE.CatmullRomCurve3(line);
  attach(suit, new THREE.TubeGeometry(curve, 128, .024, 6, false), [0, 0, 0], ribbon);
  glint(suit, [-.46, 1.35, .31], .2); glint(suit, [.51, .72, .31], .17);
  return suit;
}
