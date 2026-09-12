import * as THREE from 'three';
import { makeAnimal } from './animals.js';
import { makeChild } from './child.js';
import { foil, lightFoil, dressAsFoilEgg } from './foil.js';
const C={pine:0x365b41,leaf:0x719275,pale:0xa8b994,paper:0xfff5db,fur:0x978575,cream:0xf5dfbd,pink:0xdc9c91,dark:0x302f30,gold:0xe5b552};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const sphereGeo=new THREE.SphereGeometry(1,24,16);
const mats=new Map();
function mat(color,roughness=.9,metalness=0){const key=`${color}/${roughness}/${metalness}`;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return mats.get(key)}
function mesh(geo,color,parent,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,typeof color==='object'?color:mat(color));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function ball(parent,color,pos,scale){return mesh(sphereGeo,color,parent,pos,scale)}
function box(parent,color,pos,size){return mesh(new THREE.BoxGeometry(...size),color,parent,pos)}
function tube(parent,points,radius,color){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,radius,8,false),color,parent)}
function star(parent,color,size=.18,pos=[0,0,0]){const s=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?size*.46:size;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y)}s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.015}),color,parent,pos)}
function eyes(head,y,z,x=.23,size=.17){const all=[];for(const side of [-1,1]){ball(head,C.cream,[side*x,y,z],[size*1.23,size*1.3,size*.48]);const eye=ball(head,mat(0x241e19,.15),[side*x,y,z+.06],[size,size*1.06,size*.55]);ball(eye,0xffffff,[-.28,.37,.75],[.26,.26,.15]);ball(eye,0xfff2cd,[.3,-.18,.85],[.1,.1,.08]);all.push(eye)}return all}
function plant(parent,x,y,z,scale=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);tube(g,[[0,0,0],[.08,.7,0],[-.06,1.6,0],[.05,2.25,0]],.04,0x77694e);for(let i=0;i<10;i++){const side=i%2?1:-1;const yy=.4+i*.17;const leaf=ball(g,i%3?C.leaf:C.pale,[side*(.25+(i%3)*.1),yy,.03],[.31,.105,.14]);leaf.rotation.z=side*.4;tube(g,[[0,yy-.15,0],[side*.3,yy,0]],.017,0x77694e)}return g}
function paperTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#fff4dc';ctx.fillRect(0,0,256,256);for(let i=0;i<14000;i++){const v=Math.random()*60;ctx.fillStyle=`rgba(129,106,66,${v/1800})`;ctx.fillRect(Math.random()*256,Math.random()*256,1,1)}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(3,3);return tex}
export class BookWorld{
 constructor(container,onAction){this.container=container;this.onAction=onAction;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xe7e1d0);this.scene.fog=new THREE.Fog(0xe7e1d0,27,60);this.camera=new THREE.PerspectiveCamera(34,1,.1,90);this.camera.position.set(6.4,5.6,12);this.target=new THREE.Vector3(.1,1.8,0);this.camera.lookAt(this.target);this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;container.append(this.renderer.domElement);lightFoil(this.renderer);this.animals=[];this.props=[];this.tweens=[];this.mode='library';this.page=-1;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.clickable=[];this.clock=new THREE.Clock();this.pointer=new THREE.Vector2();this.raycaster=new THREE.Raycaster();this.scene.add(new THREE.HemisphereLight(0xfff8e6,0xa4bba1,2));const light=new THREE.DirectionalLight(0xffe7c5,2.7);light.position.set(-3,11,7);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:30});light.shadow.normalBias=.03;light.shadow.bias=-.0001;this.scene.add(light);const fill=new THREE.DirectionalLight(0xf2f9ff,1.4);fill.position.set(7,5,-5);this.scene.add(fill);this.environment();this.createBook();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);container.addEventListener('pointermove',e=>this.pointerMove(e));container.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY}});container.addEventListener('pointerup',e=>{if(!this.down||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>12)return;this.pointerMove(e);this.raycaster.setFromCamera(this.pointer,this.camera);if(this.raycaster.intersectObjects(this.clickable,true).length)this.onAction()});this.renderer.setAnimationLoop(()=>this.frame());}
 environment(){this.shelf=new THREE.Group();this.scene.add(this.shelf);box(this.shelf,0xb5966b,[0,-.13,0],[10,.22,3.8]);box(this.shelf,0xc3a87f,[0,.015,0],[10.05,.05,3.86]);box(this.shelf,0xb29265,[0,-.3,1.86],[10,.3,.12]);box(this.shelf,0xb29265,[-3.7,-.8,.15],[.15,1.1,1.5]);box(this.shelf,0xb29265,[3.7,-.8,.15],[.15,1.1,1.5]);this.pot=new THREE.Group();this.pot.position.set(3.25,.1,-.2);this.shelf.add(this.pot);mesh(new THREE.CylinderGeometry(.48,.35,.65,32),0xce9479,this.pot,[0,.31,0]);mesh(new THREE.CylinderGeometry(.45,.45,.07,32),0x6b6150,this.pot,[0,.66,0]);plant(this.pot,0,.64,0,.83);const pebble=ball(this.shelf,0xdfcba5,[-3.4,.2,.35],[.6,.2,.38]);ball(this.shelf,0xd6c2a0,[-3.4,.44,.33],[.43,.13,.28]);this.floor=box(this.scene,0xd9d4bc,[0,-2,0],[200,.3,200]);}
 createBook(){this.book=new THREE.Group();this.scene.add(this.book);this.book.position.set(-1.55,2.13,.35);this.book.rotation.set(1.04,-.05,-.075);const paper=new THREE.MeshStandardMaterial({map:paperTexture(),roughness:1});this.paper=paper;box(this.book,0xb96f53,[1.75,-.06,0],[3.62,.13,4.84]);this.rightPages=box(this.book,paper,[1.75,.055,0],[3.47,.16,4.62]);for(let i=0;i<5;i++)box(this.book,0xddceb2,[3.49,.002+i*.03,0],[.016,.009,4.6]);this.leftPages=box(this.book,paper,[-1.75,.04,0],[3.47,.18,4.62]);this.leftPages.visible=false;this.coverPivot=new THREE.Group();this.coverPivot.position.set(0,.17,0);this.book.add(this.coverPivot);box(this.coverPivot,0xb96f53,[1.75,0,0],[3.62,.13,4.84]);const top=new THREE.MeshBasicMaterial({color:0xeaae87});this.coverArt=mesh(new THREE.PlaneGeometry(3.5,4.72),top,this.coverPivot,[1.75,.071,0]);this.coverArt.rotation.x=-Math.PI/2;box(this.coverPivot,paper,[1.75,-.069,0],[3.48,.008,4.68]);this.ribbon=box(this.book,0xa9654c,[2,.2,2.4],[.21,.02,.5]);this.clickable=[this.coverPivot];this.content=new THREE.Group();this.content.position.y=.19;this.book.add(this.content);this.turnPivot=new THREE.Group();this.turnPivot.position.set(0,.17,0);this.book.add(this.turnPivot);this.turnSheet=box(this.turnPivot,paper,[1.75,0,0],[3.46,.035,4.6]);this.turnPivot.visible=false;}
 async load(){const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('The book cover could not load.'));im.src='./assets/cover.png'});await document.fonts.ready;const c=document.createElement('canvas');c.width=1086;c.height=1448;const ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);ctx.textAlign='center';ctx.fillStyle='#fff6da';ctx.font='500 38px Georgia';ctx.letterSpacing='8px';ctx.fillText('A LITTLE AUSTRALIAN STORY',543,100);ctx.letterSpacing='0px';ctx.font='600 117px Georgia';ctx.fillText('Possum Tale',543,233);ctx.font='500 38px Georgia, serif';ctx.fillText('Possum’s Shiny Secret',543,306);ctx.font='400 26px Georgia';ctx.fillText('a pop-up adventure',543,1395);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.coverArt.material.map=texture;this.coverArt.material.color.set(0xffffff);this.coverArt.material.needsUpdate=true;await this.renderer.compileAsync(this.scene,this.camera);this.resize();}
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=this.mode==='library'?34:2*Math.atan(Math.tan(28*Math.PI/360)*Math.max(1,1.6/(w/h)))*180/Math.PI;this.camera.updateProjectionMatrix();if(this.mode==='reading'&&this.desiredBookPose&&!this.tweens.length){this.camera.position.set(...this.fitBookCamera(this.desiredBookPose.position,this.desiredBookPose.target));}}
 pointerMove(e){const rect=this.container.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);this.container.style.cursor=this.raycaster.intersectObjects(this.clickable,true).length?'pointer':'default';}
 animate(duration,update){return new Promise(resolve=>this.tweens.push({start:performance.now(),duration:this.reduced?Math.min(duration,180):duration,update,resolve}));}
 cameraTo(pos,target,duration=1600){const from=this.camera.position.clone(),look=this.target.clone();const to=new THREE.Vector3(...pos),at=new THREE.Vector3(...target);return this.animate(duration,t=>{this.camera.position.lerpVectors(from,to,t);this.target.lerpVectors(look,at,t)});}
 async open(){this.mode='opening';this.clickable=[];const p=this.book.position.clone(),r=this.book.rotation.clone();await Promise.all([this.animate(1600,t=>{this.book.position.lerpVectors(p,new THREE.Vector3(0,0,0),t);this.book.rotation.set(r.x*(1-t),r.y*(1-t),r.z*(1-t));this.shelf.position.y=-5*t;this.floor.position.y=-2+1.7*t}),this.cameraTo([6.5,7.9,12],[0,.75,0],1600)]);await this.animate(1200,t=>{this.coverPivot.rotation.z=Math.PI*t;this.coverPivot.position.y=.17-.27*t;this.leftPages.visible=t>.8});this.mode='reading';}
 frame(){const time=this.clock.getElapsedTime(),now=performance.now();this.tweens=this.tweens.filter(t=>{const raw=Math.min(1,(now-t.start)/t.duration);t.update(ease(raw));if(raw===1){t.resolve();return false}return true});this.camera.lookAt(this.target);this.animateContent?.(time);this.renderer.render(this.scene,this.camera);this.onFrame?.();}
}

function addFlower(parent,x,z,color=0xefbb93){const g=new THREE.Group();g.position.set(x,.025,z);parent.add(g);tube(g,[[0,0,0],[.01,.22,0]],.012,C.leaf);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,color,[Math.cos(a)*.063,.23+Math.sin(a)*.063,0],[.05,.05,.025])}ball(g,C.gold,[0,.23,.025],[.034,.034,.025]);return g}
function makeTree(parent,x,z,scale=1){const g=new THREE.Group();parent.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);tube(g,[[0,0,0],[.12,.7,0],[.02,1.7,0],[.12,2.6,0]],.09,0xb59e78);for(let i=0;i<9;i++){const a=i*2.4;const yy=1.2+(i%4)*.34,xx=Math.cos(a)*.6;tube(g,[[.04,yy-.3,0],[xx,yy,.08]],.035,0xb59e78);const leaf=ball(g,[0x819e75,0xa4b28c,0x658b6b][i%3],[xx,yy,.05],[.56,.23,.16]);leaf.rotation.z=xx*.5}return g}
BookWorld.prototype.prepareScenes=function(){this.scenes=Array.from({length:6},(_,page)=>this.buildScene(page));for(const s of this.scenes){s.group.visible=false;this.content.add(s.group)}};
BookWorld.prototype.buildScene=function(page){
 const group=new THREE.Group(),animals=[],props=[],children=[],foils=[];const register=(type,pos,scale=1,rotation=0)=>{const a=makeAnimal(type);a.position.set(...pos);a.scale.setScalar(scale);a.rotation.y=rotation;a.userData.base=a.position.clone();a.userData.rotation=rotation;group.add(a);animals.push(a);return a};
 // Every landscape is mounted inside the page boundaries, like a paper diorama.
 box(group,0xb5c692,[-1.76,.027,0],[3.3,.04,4.38]);box(group,0xb9ca96,[1.76,.027,0],[3.3,.04,4.38]);
 for(const [x,z,s] of [[-2.75,-1.4,.83],[2.85,-1.5,.85],[-1.65,-1.7,.65]])makeTree(group,x,z,s);
 for(let i=0;i<17;i++){const x=-3.1+(i*1.53)%6.15,z=-1.5+(i*.87)%3.4;if(Math.abs(x)>.1)addFlower(group,x,z,i%3===0?0xefe1b4:0xe5b899)}
 for(let i=0;i<8;i++){const x=-3+(i*.82);box(group,0xd3c49e,[x,.49,-1.96],[.12,.98,.09]);if(i<7)box(group,0xe1d2ad,[x+.4,.65,-1.96],[.85,.07,.07])}
 let possum,poodle,cat,stash,bin,idea,playBall,huntEgg,devils=[];
 if(page===0){
  possum=register('possum',[-1.75,.76,-.75],.91,.18);
  poodle=register('poodle',[.25,.08,.86],.73,.45);
  cat=register('cat',[2.13,.08,.82],.72,-.38);
  const kid=makeChild(group,[1.12,.06,.15],0xefb467,0xe6b58c,0x69432c);children.push(kid);
  kid.userData.arms[0].rotation.z=-.7;kid.userData.arms[1].rotation.z=.65;
  playBall=ball(group,mat(0xc57f68,.62),[1.1,.18,1.23],[.15,.15,.15]);
  const stripe=mesh(new THREE.TorusGeometry(1,.12,7,32),0xffe2a5,playBall);stripe.rotation.x=.4;
  for(const side of [-1,1])tube(possum.userData.head,[[side*.11,.16,.254],[side*.18,.145,.262],[side*.276,.098,.23]],.014,0x69675d);
  ball(group,0xffe6a2,[1.8,2.8,-1.8],[.3,.3,.055]);
  for(let i=0;i<4;i++)star(group,0xffe6ab,.09,[-.6+i*.6,2.4+(i%2)*.45,-1.8]);
 }
 if(page>=0&&page<=4){const wall=new THREE.Group();group.add(wall);box(wall,0xbca284,[-.6,.34,-.75],[4.55,.66,.51]);box(wall,0xd6bda0,[-.6,.7,-.75],[4.68,.1,.61]);for(let row=0;row<3;row++)for(let col=0;col<8;col++){box(wall,0xceba9a,[-2.78+col*.58+(row%2)*.21,.11+row*.2,-.486],[.013,.18,.009]);}for(let row=0;row<2;row++)box(wall,0xd1bc9e,[-.6,.215+row*.22,-.485],[4.54,.012,.009]);}
 if(page===1){possum=register('possum',[-1,.76,-.63],.86,.3);bin=new THREE.Group();bin.position.set(1.95,.06,.45);group.add(bin);mesh(new THREE.CylinderGeometry(.43,.32,.78,24),0x728475,bin,[0,.4,0]);mesh(new THREE.CylinderGeometry(.46,.46,.07,24),0x9ba898,bin,[0,.82,0]);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(bin,0x889786,[Math.sin(a)*.38,.4,Math.cos(a)*.38],[.035,.61,.035]);}foils.push(foil(bin,[.1,.9,.06],.28));foils.push(foil(group,[1.5,.15,1],.2));props.push(bin);idea=new THREE.Group();idea.position.set(-1,2.7,-.6);group.add(idea);star(idea,C.gold,.25);idea.scale.setScalar(.001);}
 if(page>=2&&page<=4){stash=new THREE.Group();stash.position.set(.85,.04,.75);group.add(stash);box(stash,0xbc976d,[0,.04,0],[1.1,.08,.78]);for(const side of [-1,1]){box(stash,0xcba881,[side*.57,.18,0],[.055,.35,.85]);box(stash,0xcba881,[0,.18,side*.42],[1.17,.35,.06]);}if(page!==4)for(let i=0;i<12;i++){foils.push(foil(stash,[-.43+(i*.37)%.85,.3+Math.floor(i/6)*.18,-.27+(i*.29)%.55],.15+i%3*.025))}possum=register('possum',[-1.1,.76,-.63],page===4?.96:.84,.2);}
 if(page===2){poodle=register('poodle',[.15,.08,1.12],.73,-.3);cat=register('cat',[1.8,.08,.91],.76,.2);foils.push(foil(group,[.07,.16,1.6],.18));foils.push(foil(group,[2.15,.13,1.45],.2));const brows=possum.userData.head;for(const side of [-1,1]){tube(brows,[[side*.115,.104,.291],[side*.21,.132,.289],[side*.287,.158,.247]],.013,0x625e53)}}
 if(page===3||page===4){devils=[register('devil',[-.12,.08,.88],.75,-.1),register('devil',[1.95,.08,.58],.75,.12)];poodle=register('poodle',[-2.3,.08,1.03],.66,.4);cat=register('cat',[2.83,.08,1.32],.63,-.45);}
 if(page===4){
  const kid=makeChild(group,[-2.66,.06,.45],0xefb467,0xe6b58c,0x69432c,{basket:true});
  kid.rotation.y=.35;children.push(kid);
  // Leave an open patch beside the child so its basket and nearby egg are clear.
  poodle.position.set(-1.44,.08,1.49);poodle.userData.base.copy(poodle.position);
  for(let i=0;i<6;i++){
   const coords=[[-2.81,1.08],[-.72,1.76],[.36,1.61],[1.68,1.54],[2.79,-.05],[2.57,1.86]][i];
   const egg=ball(group,mat([0xb2c7dc,0xe7a6b2,0xe8bc6b,0xbfb0cf][i%4],.31,.12),[coords[0],.23,coords[1]],[.16,.23,.16]);
   props.push(egg);if(i===0)huntEgg=egg;
   for(const side of [-1,1])ball(egg,0xfff1d0,[side*.42,.1,.86],[.13,.10,.03]);
  }
  dressAsFoilEgg(possum);
 }
 if(page===5){possum=register('possum',[-1.95,.08,.12],1.15,.28);poodle=register('poodle',[-.55,.08,.85],.73,-.1);cat=register('cat',[-2.8,.08,1.25],.66,.15);const gift=star(group,C.gold,.32,[-.4,2.15,-.5]);props.push(gift);}
 for(const f of foils){f.userData.initialPosition=f.position.clone();f.userData.initialRotation=f.rotation.clone()}
 return{group,animals,props,children,foils,possum,poodle,cat,stash,bin,idea,devils,playBall,huntEgg};
};
BookWorld.prototype.showPage=async function(page){if(!this.scenes)this.prepareScenes();this.page=page;this.active=this.scenes[page];for(const a of this.active.animals){a.position.copy(a.userData.base);a.rotation.set(0,a.userData.rotation,0);a.userData.body.rotation.set(0,0,0);a.userData.react=0}for(const f of this.active.foils){f.position.copy(f.userData.initialPosition);f.rotation.copy(f.userData.initialRotation)}if(this.active.idea)this.active.idea.scale.setScalar(.001);this.active.group.visible=true;this.active.group.scale.set(.001,.001,.001);this.animals=this.active.animals;this.reaction=false;this.clickable=[];const camera=page===5?[4,6.4,10.8]:[4.9,6.9,11.8];await Promise.all([this.animate(1050,t=>this.active.group.scale.setScalar(Math.max(.001,t))),this.bookCameraTo(camera,[0,.85,0],1050)]);this.clickable=page===1?[this.active.bin,this.active.possum,...this.active.foils]:this.animals;this.mode='reading';this.resize();};
BookWorld.prototype.turnPage=async function(page,onPaper){this.mode='turning';this.clickable=[];const current=this.active;await this.animate(500,t=>{current.group.scale.setScalar(Math.max(.001,1-t))});current.group.visible=false;this.turnPivot.visible=true;this.turnPivot.rotation.z=page>this.page?0:Math.PI;onPaper?.();await this.animate(950,t=>{this.turnPivot.rotation.z=page>this.page?Math.PI*t:Math.PI*(1-t)});this.turnPivot.visible=false;await this.showPage(page);};
BookWorld.prototype.react=async function(){this.reaction=true;this.clickable=[];const scene=this.active;for(const a of this.animals)a.userData.react=1;const motions=[this.animate(1400,t=>{for(const a of this.animals)a.userData.react=Math.sin(t*Math.PI);if(scene.idea)scene.idea.scale.setScalar(Math.max(.001,Math.sin(t*Math.PI/2)));})];if(this.page===1){const f=scene.foils[0],from=f.position.clone();motions.push(this.animate(1400,t=>{f.position.set(from.x-1.4*t,from.y+Math.sin(t*Math.PI)*1.1,from.z);f.rotation.y=t*6}));}if(this.page===3){motions.push(this.animate(1400,t=>{scene.poodle.position.x=scene.poodle.userData.base.x+Math.sin(t*Math.PI)*.55;scene.cat.position.x=scene.cat.userData.base.x-Math.sin(t*Math.PI)*.35;}));}if(this.page===4){motions.push(this.animate(1800,t=>{scene.poodle.rotation.z=Math.sin(t*Math.PI*4)*1.2;scene.cat.rotation.z=-Math.sin(t*Math.PI*4)*1.25;scene.poodle.position.y=.3;scene.cat.position.y=.3}));}motions.push(this.bookCameraTo(this.page===5?[4,6.4,10.8]:[3.7,5.9,10.1],[0,1,0],1400));await Promise.all(motions);this.clickable=[];};
BookWorld.prototype.animateContent=function(t){
 if(!this.active||!this.active.group.visible)return;
 const motion=this.reduced?.15:1;
 for(const a of this.animals){
  const d=a.userData,v=t*2.3+d.phase,blink=(t+d.phase)%5.8;
  for(const eye of d.eyes||[])eye.scale.y=1-(blink<.17?Math.sin(blink/.17*Math.PI)*.93:0);
  d.body.position.y=Math.sin(v)*.025*motion;
  d.head.rotation.z=Math.sin(v*.65)*.045*motion;
  d.head.rotation.x=Math.sin(v*.8)*.025*motion;
  for(let i=0;i<d.arms.length;i++)d.arms[i].rotation.x=Math.sin(v+i)*(.055+d.react*.5)*motion;
  if(d.tail)d.tail.rotation.y=Math.sin(v)*.09*motion;
  for(const e of d.ears)e.rotation.x=Math.sin(v*.7)*.035*motion;
  if(d.react){
   d.body.position.y+=Math.abs(Math.sin(t*9))*.13*d.react*motion;
   d.head.rotation.y=Math.sin(t*6)*.15*d.react*motion;
  }
  if(this.page===0&&d.type==='possum'){
   // Alone on the wall: shoulders slumped, gaze lowered, ears softly drooping.
   d.body.rotation.x=.11;d.head.rotation.x=.19+Math.sin(v*.5)*.025*motion;
   d.head.rotation.z=-.08+Math.sin(v*.4)*.02*motion;
   d.head.rotation.y=.1;
   d.arms.forEach((arm,i)=>{arm.rotation.x=-.17;arm.rotation.z=(i?1:-1)*.06;});
   d.ears.forEach((ear,i)=>ear.rotation.z=(i?1:-1)*-.4);
  }
  if(this.page===0&&(d.type==='poodle'||d.type==='cat')){
   d.head.rotation.y=d.type==='poodle'?.2:-.28;
   d.head.rotation.x=.14+Math.sin(t*2)*.06*motion;
   d.body.position.y+=Math.max(0,Math.sin(t*2.4+d.phase))*.055*motion;
   d.arms.forEach((arm,i)=>arm.rotation.x=-.12+Math.sin(t*2.1+i)*.17*motion);
  }
  if((this.page===1||this.page===2)&&d.type==='possum'){
   a.position.x=d.base.x+Math.sin(t*.62)*.75*motion;a.rotation.y=Math.cos(t*.62)*.55;
   d.body.rotation.z=Math.sin(t*8)*.04*motion;
   d.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*7+i*Math.PI)*.14*motion);
   d.head.rotation.y=-a.rotation.y*.6;
  }
  if(this.page===2&&(d.type==='cat'||d.type==='poodle')){
   d.head.rotation.x=.1+Math.sin(t*4)*.16*motion;d.body.position.y+=Math.abs(Math.sin(t*3))*.07*motion;
  }
  if(d.type==='devil'){
   // A gentle head tilt and wag keep the growling guards approachable.
   d.head.rotation.z=(a===this.active.devils[0]?-.065:.065)+Math.sin(v*.6)*.025*motion;
   if(d.tail)d.tail.rotation.y=Math.sin(t*3+d.phase)*.19*motion;
   if(this.page===3&&d.react)d.head.rotation.x-=Math.sin(t*19)*.055*d.react*motion;
  }
  if(this.page===4&&this.reaction&&(d.type==='cat'||d.type==='poodle')){
   a.rotation.z=Math.sin(t*2.5+d.phase)*1.1*motion;d.body.rotation.x=Math.sin(t*3)*.25*motion;a.position.y=.3;
  }
  if(this.page===4&&d.type==='possum')a.position.x=d.base.x+Math.sin(t*.65)*.35*motion;
 }
 for(let i=0;i<this.active.foils.length;i++){
  const f=this.active.foils[i];if(this.page===2)f.rotation.z=t*.3+i;
  if(f.userData.glint)f.userData.glint.material.opacity=.25+Math.pow(Math.max(0,Math.sin(t*2.2+i*1.7)),6)*.75;
 }
 for(const kid of this.active.children){
  const d=kid.userData;
  if(this.page===0){
   kid.rotation.x=.12+Math.sin(t*1.5)*.035*motion;
   d.head.rotation.x=.17;d.head.rotation.y=Math.sin(t*.9)*.24*motion;
   d.arms[0].rotation.z=-.76+Math.sin(t*1.9)*.2*motion;
   d.arms[1].rotation.z=.69+Math.sin(t*1.9+1)*.2*motion;
   for(const arm of d.arms)arm.rotation.x=-.45;
  }else{
   kid.rotation.x=.03;d.head.rotation.x=.22;d.head.rotation.y=-.19;
   d.arms[0].rotation.x=-.42+Math.sin(t*1.3)*.06*motion;d.arms[0].rotation.z=-.15;
   d.arms[1].rotation.x=-.08;d.arms[1].rotation.z=.16;
   if(d.basket)d.basket.rotation.z=Math.sin(t*1.6)*.05*motion;
  }
 }
 if(this.active.playBall){
  this.active.playBall.position.x=1.12+Math.sin(t*1.5)*.59*motion;
  this.active.playBall.rotation.z=-t*1.4*motion;
 }
 if(this.active.idea&&this.reaction){this.active.idea.rotation.y=Math.sin(t*2)*.25;this.active.idea.position.y=2.5+Math.sin(t*2)*.06;}
};
BookWorld.prototype.close=async function(){this.mode='closing';this.clickable=[];if(this.active){const g=this.active.group;await this.animate(500,t=>g.scale.setScalar(Math.max(.001,1-t)));g.visible=false;}await this.animate(1000,t=>{this.coverPivot.rotation.z=Math.PI*(1-t);this.coverPivot.position.y=-.1+.27*t;this.leftPages.visible=t<.15});const start=this.book.position.clone();await Promise.all([this.animate(1500,t=>{this.book.position.lerpVectors(start,new THREE.Vector3(-1.55,2.13,.35),t);this.book.rotation.set(1.04*t,-.05*t,-.075*t);this.shelf.position.y=-5*(1-t);this.floor.position.y=-.3-1.7*t}),this.cameraTo([6.4,5.6,12],[.1,1.8,0],1500)]);this.mode='library';this.page=-1;this.active=null;this.clickable=[this.coverPivot];this.resize();};

BookWorld.prototype.speakerAnchor=function(){
 if(!this.active)return null;
 const animal=(this.page===3||this.page===4)?this.active.devils[1]:this.active.possum;
 if(!animal)return null;
 const point=animal.userData.head.localToWorld(new THREE.Vector3(0,.5,.08)).project(this.camera);
 return{x:(point.x+1)*this.container.clientWidth*.5,y:(1-point.y)*this.container.clientHeight*.5};
};
// Keep page corners and the highest pop-ups inside the camera when it moves closer.
BookWorld.prototype.fitBookCamera=function(position,target){
 const at=new THREE.Vector3(...target),offset=new THREE.Vector3(...position).sub(at);
 const direction=offset.clone().normalize(),right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize();
 const tan=Math.tan(this.camera.fov*Math.PI/360);
 let distance=offset.length();const points=[];
 for(const x of [-3.64,3.64])for(const z of [-2.44,2.44])points.push([x,0,z]);
 points.push([-2.75,2.4,-1.4],[2.85,2.4,-1.5],[1.8,3.1,-1.8],[-1,2.8,-.6]);
 for(const coords of points){const point=new THREE.Vector3(...coords).sub(at);distance=Math.max(distance,point.dot(direction)+Math.abs(point.dot(up))/(tan*.94),point.dot(direction)+Math.abs(point.dot(right))/(tan*this.camera.aspect*.94));}
 return at.addScaledVector(direction,distance).toArray();
};
BookWorld.prototype.bookCameraTo=function(position,target,duration){
 this.desiredBookPose={position,target};
 return this.cameraTo(this.fitBookCamera(position,target),target,duration);
};
