import * as THREE from 'three';

// A small preschooler. The rounded face and short limbs keep the silhouette
// unmistakably young even when viewed at picture-book scale.
const sphere = new THREE.SphereGeometry(1, 24, 18);
const materials = new Map();
function material(color, roughness = .84) {
  const key = `${color}:${roughness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
  return materials.get(key);
}
function add(parent, geometry, mat, pos = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, typeof mat === 'number' ? material(mat) : mat);
  mesh.position.set(...pos); mesh.scale.set(...scale);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}
const ball = (parent, mat, pos, scale) => add(parent, sphere, mat, pos, scale);
function curve(parent, points, width, mat, segments = 22) {
  return add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, width, 7, false), mat);
}
function ring(parent, y, rx, rz, width, mat) {
  const points = Array.from({ length: 49 }, (_, i) => {
    const t = i / 48 * Math.PI * 2;
    return [Math.cos(t) * rx, y, Math.sin(t) * rz];
  });
  return curve(parent, points, width, mat, 48);
}

export function makeEasterBasket(parent) {
  const basket = new THREE.Group(); parent.add(basket);
  const wicker = material(0xbc8250), light = material(0xe6bb78), shade = material(0x946238);
  const sides = new THREE.CylinderGeometry(.189, .139, .205, 32, 1, true);
  add(basket, sides, wicker, [0, .108, 0], [1, 1, .82]);
  add(basket, new THREE.CylinderGeometry(.14, .135, .026, 24), shade, [0, .016, 0], [1, 1, .82]);
  for (let i = 0; i < 8; i++) {
    const y = .022 + i * .027, r = .14 + y * .238;
    ring(basket, y, r, r * .82, .009, i % 2 ? light : wicker);
  }
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2;
    const points = Array.from({ length: 9 }, (_, j) => {
      const y = .02 + j * .024, r = .14 + y * .238 + (j % 2 ? .004 : -.002);
      return [Math.cos(a) * r, y, Math.sin(a) * r * .82];
    });
    curve(basket, points, .007, light, 16);
  }
  ring(basket, .217, .194, .158, .016, light);
  curve(basket, [[-.18,.21,0],[-.17,.335,0],[-.095,.43,0],[0,.455,0],[.095,.43,0],[.17,.335,0],[.18,.21,0]], .016, shade, 30);
  curve(basket, [[-.18,.21,.007],[-.17,.335,.007],[-.095,.43,.007],[0,.455,.007],[.095,.43,.007],[.17,.335,.007],[.18,.21,.007]], .008, light, 30);
  for (const [x, z, color, lean] of [[-.073,.017,0xeeb065,-.22],[.06,.029,0xbcb1e4,.3],[.005,-.067,0x97c6cc,.1]]) {
    const egg = ball(basket, material(color,.46), [x,.226,z], [.054,.08,.055]);
    egg.rotation.z = lean;
    // Tiny cream spots are readable without looking like metallic decoration.
    for (const [sx, sy] of [[-.4,.35],[.42,-.23],[.02,-.58]]) ball(egg,0xfff0cf,[sx,sy,.85],[.12,.10,.035]);
  }
  return basket;
}

export function makeChild(parent, pos, color = 0xf0b267, skin = 0xe6b58c, hair = 0x69432c, options = {}) {
  const g = new THREE.Group(); parent.add(g); g.position.set(...pos);
  const skinMat = material(skin,.72), shirt = material(color), denim = material(0x557c94), seam = material(0x84a9b8);
  const hairMat = material(hair,.9);
  // Short overalls and a softly rounded t-shirt, with no adult shoulder line.
  ball(g,shirt,[0,.81,0],[.209,.229,.142]);
  ball(g,denim,[0,.60,.003],[.199,.148,.148]);
  ball(g,denim,[0,.76,.126],[.141,.178,.028]);
  for (const side of [-1,1]) {
    const strap = ball(g,denim,[side*.111,.902,.10],[.026,.10,.029]);
    strap.rotation.z = side * -.16;
    ball(g,material(0xf0cf82,.45),[side*.103,.889,.132],[.018,.018,.008]);
  }
  // Bib pocket and its U-shaped topstitching reinforce the little-kid outfit.
  ball(g,denim,[0,.735,.154],[.070,.058,.01]);
  curve(g,[[-.067,.75,.166],[-.061,.707,.168],[0,.694,.171],[.061,.707,.168],[.067,.75,.166]],.0035,seam);
  ball(g,skinMat,[0,.998,0],[.072,.067,.075]);
  const legs = [];
  for (const side of [-1,1]) {
    const leg = new THREE.Group(); g.add(leg); leg.position.set(side*.105,.489,0); legs.push(leg);
    ball(leg,denim,[0,-.043,0],[.099,.112,.129]);
    ball(leg,seam,[0,-.112,.005],[.100,.026,.127]);
    ball(leg,skinMat,[0,-.252,.008],[.065,.144,.073]);
    ball(leg,0xf4edde,[0,-.346,.015],[.064,.057,.074]);
    ball(leg,0xf6efe0,[0,-.440,.058],[.091,.048,.143]);
    ball(leg,material(color),[0,-.405,.051],[.088,.070,.132]);
    ball(leg,0xf9f2e4,[0,-.413,.144],[.080,.050,.05]);
    for (let j = 0; j < 3; j++) curve(leg,[[-.049,-.351-j*.012,.082+j*.016],[0,-.344-j*.012,.085+j*.016],[.049,-.351-j*.012,.082+j*.016]],.006,0xfff8e9,10);
  }
  const arms = [];
  for (const side of [-1,1]) {
    const arm = new THREE.Group(); g.add(arm); arm.position.set(side*.214,.907,.002); arms.push(arm);
    ball(arm,shirt,[side*.013,-.071,0],[.082,.114,.092]);
    ball(arm,skinMat,[side*.019,-.204,.008],[.056,.104,.06]);
    ball(arm,skinMat,[side*.017,-.297,.035],[.063,.062,.044]);
    ball(arm,skinMat,[-side*.03,-.29,.059],[.031,.038,.030]);
    arm.rotation.z = side*.09;
  }
  const head = new THREE.Group(); g.add(head); head.position.set(0,1.181,.011);
  ball(head,skinMat,[0,0,0],[.245,.252,.210]);
  ball(head,skinMat,[0,-.12,.051],[.187,.132,.169]);
  const blush = new THREE.Color(skin).lerp(new THREE.Color(0xf0a495),.26);
  for (const side of [-1,1]) {
    ball(head,skinMat,[side*.236,-.017,-.009],[.045,.063,.036]);
    ball(head,material(blush.getHex()),[side*.160,-.061,.159],[.065,.049,.033]);
    // Wide-set eyes, no heavy brow or deep orbital socket.
    ball(head,material(0xfffbef,.4),[side*.088,.015,.190],[.046,.042,.025]);
    ball(head,material(0x5b6754,.24),[side*.088,.014,.212],[.027,.030,.009]);
    ball(head,material(0x272a25,.13),[side*.088,.015,.220],[.017,.022,.004]);
    ball(head,0xffffff,[side*.088-.007,.026,.224],[.0075,.0085,.003]);
    curve(head,[[side*.055,.078,.181],[side*.09,.087,.181],[side*.125,.077,.171]],.0055,hairMat,12);
  }
  ball(head,skinMat,[0,-.044,.211],[.031,.030,.036]);
  curve(head,[[-.055,-.109,.196],[0,-.128,.211],[.055,-.109,.196]],.006,0xae6b60,18);
  // A complete rounded hairstyle and curved side fringe, rather than an exposed
  // forehead, scalp wisps, or hairline that could read as an older man's head.
  const cap = add(head,new THREE.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI*.59),hairMat,[0,.025,-.037],[.254,.258,.217]);
  for (const side of [-1,1]) ball(head,hairMat,[side*.210,.036,-.056],[.061,.128,.126]);
  for (let i = 0; i < 6; i++) {
    const x = -.183 + i*.068, y = .133 + Math.sin((i+.3)/5*Math.PI)*.055;
    const lock = ball(head,hairMat,[x,y,.148],[.079,.100,.074]);
    lock.rotation.z = -.42;
  }
  const strandColor = new THREE.Color(hair).lerp(new THREE.Color(0xd5ab75),.16);
  for (let i = 0; i < 14; i++) {
    const x = -.19 + i*.028;
    curve(head,[[x-.035,.225-Math.abs(x)*.25,.079],[x-.017,.192,.176],[x+.021,.122+Math.abs(x)*.10,.201]],.0025,material(strandColor.getHex()),10);
  }
  let basket = null;
  if (options.basket) {
    basket = makeEasterBasket(arms[1]); basket.position.set(.018,-.725,.031);
    // Its handle meets the little hand; the basket stays above the grass.
  }
  g.userData = {base:g.position.clone(),head,arms,legs,basket};
  return g;
}
