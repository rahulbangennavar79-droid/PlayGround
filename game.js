import * as THREE from 'three';

const container = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9c5c6');
scene.fog = new THREE.FogExp2('#a9c5c6', 0.00165);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 900);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#d5f3ed', '#293940', 2.15));
const sun = new THREE.DirectionalLight('#fff1ce', 3.2);
sun.position.set(-90, 150, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -175; sun.shadow.camera.right = 175;
sun.shadow.camera.top = 175; sun.shadow.camera.bottom = -175;
sun.shadow.bias = -.00025;
sun.shadow.autoUpdate = false;
sun.shadow.needsUpdate = true;
scene.add(sun);
const fill = new THREE.DirectionalLight('#9abaff', .55); fill.position.set(80, 30, -100); scene.add(fill);

const mat = (color, roughness=.8, metalness=0, extra={}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const groundMat = mat('#596c69'), roadMat = mat('#263438'), sidewalkMat = mat('#8e9990'), curbMat = mat('#c5b999');
const asphaltLineMat = mat('#c8b680', .8, 0, { emissive: '#54432a', emissiveIntensity:.13 });
const playerMats = { jacket: mat('#d5f34b',.65), pants:mat('#24323b'), skin:mat('#c88d68'), shoe:mat('#e9e3ce') };
const ground = new THREE.Mesh(new THREE.PlaneGeometry(520,520),groundMat); ground.rotation.x=-Math.PI/2; ground.position.y=-.12; ground.receiveShadow=true; scene.add(ground);

const city = new THREE.Group(); scene.add(city);
const roadCoords = [-144,-72,0,72,144];
const blockWidth = 72, roadWidth = 16, sidewalkWidth = 3;
const boxGeo = new THREE.BoxGeometry(1,1,1);
function box(parent, name, size, position, material, cast=false, receive=true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.name=name; mesh.position.set(...position); mesh.castShadow=cast; mesh.receiveShadow=receive; parent.add(mesh); return mesh;
}
// Roads, sidewalks, lane dashes and crosswalks. Repeated road markings are
// instanced to keep the busy city responsive on integrated graphics.
const laneMarks=[],crosswalkMarks=[];
for (const x of roadCoords) {
  box(city,'avenue',[roadWidth,.08,430],[x,-.035,0],roadMat);
  for (const sign of [-1,1]) {
    box(city,'walk',[sidewalkWidth,.18,430],[x+sign*(roadWidth/2+sidewalkWidth/2),.02,0],sidewalkMat);
    box(city,'curb',[.32,.24,430],[x+sign*(roadWidth/2),.1,0],curbMat);
  }
  for(let z=-210;z<220;z+=13) laneMarks.push({p:[x,.016,z],s:[.13,.018,5]});
}
for (const z of roadCoords) {
  box(city,'avenue',[430,.08,roadWidth],[0,-.035,z],roadMat);
  for (const sign of [-1,1]) {
    box(city,'walk',[430,.18,sidewalkWidth],[0,.02,z+sign*(roadWidth/2+sidewalkWidth/2)],sidewalkMat);
    box(city,'curb',[430,.24,.32],[0,.1,z+sign*(roadWidth/2)],curbMat);
  }
  for(let x=-210;x<220;x+=13) laneMarks.push({p:[x,.016,z],s:[5,.018,.13]});
}
const laneInstances=new THREE.InstancedMesh(boxGeo,asphaltLineMat,laneMarks.length),markDummy=new THREE.Object3D();
laneMarks.forEach((m,i)=>{markDummy.position.set(...m.p);markDummy.scale.set(...m.s);markDummy.updateMatrix();laneInstances.setMatrixAt(i,markDummy.matrix)});
laneInstances.instanceMatrix.needsUpdate=true;laneInstances.receiveShadow=false;city.add(laneInstances);
// Crosswalk bars at each intersection.
const crossMat=mat('#d7d2bd',.72,0,{emissive:'#29281f',emissiveIntensity:.12});
for(const x of roadCoords) for(const z of roadCoords) for(let n=-4;n<=4;n++) {
  crosswalkMarks.push({p:[x+n*1.6,.035,z+11],s:[1.1,.025,4]});
  crosswalkMarks.push({p:[x+11,.035,z+n*1.6],s:[4,.025,1.1]});
}
const crossInstances=new THREE.InstancedMesh(boxGeo,crossMat,crosswalkMarks.length);
crosswalkMarks.forEach((m,i)=>{markDummy.position.set(...m.p);markDummy.scale.set(...m.s);markDummy.updateMatrix();crossInstances.setMatrixAt(i,markDummy.matrix)});
crossInstances.instanceMatrix.needsUpdate=true;crossInstances.receiveShadow=false;city.add(crossInstances);

// A warm coastal skyline, individually dressed mid-rise buildings.
const facadeColors=['#71847c','#b2a28a','#788891','#c2ad8d','#667a7c','#9c9886','#737b83','#b69d81','#617572'];
const windowMats=[0,1,2].map((_,i)=>new THREE.MeshStandardMaterial({color:['#91aeb1','#e9c57e','#9bd7d1'][i],emissive:['#668d91','#ca8a3c','#5dc9bc'][i],emissiveIntensity:[.25,.78,.55][i],roughness:.36,metalness:.18}));
const windows=[[],[],[]];
const windowGeo=new THREE.BoxGeometry(1,1,1);
const streetProps = new THREE.Group(); scene.add(streetProps);
const treeTrunk=mat('#55463a'), treeLeaves=mat('#fff',.92), lampMetal=mat('#263b3e',.38,.68), lampGlow=new THREE.MeshStandardMaterial({color:'#fff0b0',emissive:'#ffd77d',emissiveIntensity:2.4});
const treeSites=[];
function makeTree(x,z,scale=1){treeSites.push({x,z,scale})}
function addTreeInstances(){
 const dummy=new THREE.Object3D(),trunkGeo=new THREE.CylinderGeometry(.17,.24,2.4,7),trunks=new THREE.InstancedMesh(trunkGeo,treeTrunk,treeSites.length);
 const crownGeo=new THREE.IcosahedronGeometry(1,1),crowns=new THREE.InstancedMesh(crownGeo,treeLeaves,treeSites.length*5);
 const foliage=['#447965','#527f66','#396a5d'].map(c=>new THREE.Color(c));let leafIndex=0;
 treeSites.forEach((site,i)=>{
  dummy.position.set(site.x,1.2*site.scale,site.z);dummy.scale.setScalar(site.scale);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<5;j++){
   const factor=1.05-j*.055;dummy.position.set(site.x+(j%2-.5)*.6*site.scale,(2.25+Math.floor(j/2)*.48)*site.scale,site.z+(j%3-1)*.34*site.scale);dummy.scale.setScalar(factor*site.scale);dummy.updateMatrix();crowns.setMatrixAt(leafIndex,dummy.matrix);crowns.setColorAt(leafIndex,foliage[(i+j)%foliage.length]);leafIndex++;
  }
 });
 trunks.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;trunks.castShadow=true;crowns.castShadow=true;streetProps.add(trunks,crowns);
}
function makeLamp(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.085,.12,6,8),lampMetal);pole.position.y=3;g.add(pole);
 const arm=box(g,'lamp-arm',[.11,.11,1.7],[.66,5.75,0],lampMetal,true);
 const shade=new THREE.Mesh(new THREE.CylinderGeometry(.2,.48,.25,12),lampMetal);shade.position.set(1.3,5.65,0);g.add(shade);
 const light=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),lampGlow);light.position.set(1.3,5.48,0);g.add(light);
 streetProps.add(g);
}
// Building windows are instanced for a richly detailed but light city render.
let seed=8912;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
let buildingCount=0;
for(let ix=0;ix<roadCoords.length-1;ix++)for(let iz=0;iz<roadCoords.length-1;iz++){
 const bx=(roadCoords[ix]+roadCoords[ix+1])/2,bz=(roadCoords[iz]+roadCoords[iz+1])/2;
 for(let sub=0;sub<4;sub++){
  const row=sub>>1,col=sub&1;
  const width=18+rand()*5,depth=18+rand()*5,height=15+rand()*47;
  const x=bx+(col?17:-17),z=bz+(row?17:-17);
  const g=new THREE.Group();g.position.set(x,0,z);city.add(g);buildingCount++;
  const color=facadeColors[Math.floor(rand()*facadeColors.length)];
  const body=box(g,'building',[width,height,depth],[0,height/2,0],mat(color,.86),true);body.castShadow=true;
  box(g,'podium',[width+1,.75,depth+1],[0,.38,0],mat('#454e4b',.76),true);
  box(g,'roofline',[width+.45,.5,depth+.45],[0,height+.18,0],mat('#d1bd95',.65),true);
  const roofColor=mat('#465250',.88);
  for(let r=0;r<2;r++)box(g,'roof-unit',[width*(.28+rand()*.16),1+rand()*1.7,depth*(.22+rand()*.16)],[(rand()-.5)*width*.36,height+.75,(rand()-.5)*depth*.36],roofColor,true);
  const floors=Math.floor(height/3.5),colsX=Math.max(2,Math.floor(width/3.3)),colsZ=Math.max(2,Math.floor(depth/3.3));
  for(let f=1;f<floors;f++){
   const yy=f*3.35;
   for(let c=0;c<colsX;c++){
    const xx=-width/2+(c+.5)*width/colsX;const w=width/colsX*.57,h=1.32;
    const mi=rand()<.19?1:rand()<.14?2:0;
    windows[mi].push({p:[x+xx,yy,z+depth/2+.035],s:[w,h,.075]});
    windows[mi].push({p:[x+xx,yy,z-depth/2-.035],s:[w,h,.075]});
   }
   for(let c=0;c<colsZ;c++){
    const zz=-depth/2+(c+.5)*depth/colsZ;const w=depth/colsZ*.57,h=1.32;const mi=rand()<.2?1:0;
    windows[mi].push({p:[x+width/2+.035,yy,z+zz],s:[.075,h,w]});
    windows[mi].push({p:[x-width/2-.035,yy,z+zz],s:[.075,h,w]});
   }
  }
  // Rooftop aerials and occasional vertical facade accents.
  if(rand()<.43){const mast=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,4,6),lampMetal);mast.position.set((rand()-.5)*width*.3,height+2,0);g.add(mast)}
  if(rand()<.65){const accent=box(g,'neon-trim',[.3,.24,depth*.72],[width/2+.2,height*.58,0],windowMats[1]);accent.material=windowMats[1]}
 }
}
for(let i=0;i<3;i++)if(windows[i].length){const mesh=new THREE.InstancedMesh(windowGeo,windowMats[i],windows[i].length);const dummy=new THREE.Object3D();windows[i].forEach((w,n)=>{dummy.position.set(...w.p);dummy.scale.set(...w.s);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;city.add(mesh)}
// Boulevard trees and lamps, spaced like a walkable coastal city.
for(const axis of ['x','z'])for(const r of roadCoords)for(let p=-204;p<=204;p+=27){
 if(roadCoords.some(v=>Math.abs(p-v)<17))continue;
 const side=(Math.floor(p/27)%2?1:-1);
 if(axis==='x'){makeTree(r+side*13,p,.85+rand()*.32);if(p%54===0)makeLamp(r-side*12,p+5)}
 else {makeTree(p,r+side*13,.85+rand()*.32);if(p%54===0)makeLamp(p+5,r-side*12)}
}
// Small planted courtyards in the four city quadrants.
for(let x=-108;x<=108;x+=72)for(let z=-108;z<=108;z+=72){
 if(Math.abs(x)<40&&Math.abs(z)<40)continue;
 box(streetProps,'planter',[8,.65,2],[x, .3,z],mat('#4b635b'),false);
 for(let n=-2;n<=2;n++)makeTree(x+n*1.45,z,.36+rand()*.08);
}
addTreeInstances();

// Parked cars make the streets feel alive.
const carColors=['#bb6048','#347e81','#d1b75c','#586a98','#d6d3c6'];
function makeCar(color='#c85e47'){
 const root=new THREE.Group();
 const paint=mat(color,.29,.43),glass=mat('#263a41',.18,.4,{transparent:true,opacity:.88}),rubber=mat('#182124',.9),chrome=mat('#bac9bf',.22,.78);
 box(root,'chassis',[2.15,.62,4.35],[0,.76,0],paint,true);
 box(root,'hood',[1.98,.32,1.14],[0,1.13,-1.34],paint,true);
 box(root,'trunk',[1.94,.34,.83],[0,1.12,1.64],paint,true);
 const cabin=box(root,'cabin',[1.62,.92,2.0],[0,1.55,.18],glass,true);cabin.material=glass;
 // Roof and bright beltline.
 box(root,'roof',[1.5,.12,1.32],[0,2.04,.2],paint,true);
 box(root,'front-bumper',[2.2,.18,.16],[0,.56,-2.16],chrome,true);
 box(root,'rear-bumper',[2.2,.18,.16],[0,.56,2.16],chrome,true);
 const headlamp=new THREE.MeshStandardMaterial({color:'#f9edb5',emissive:'#ffe4a0',emissiveIntensity:2});
 for(const x of [-.76,.76]){box(root,'headlight',[.38,.2,.08],[x,1.02,-2.19],headlamp);box(root,'taillight',[.32,.19,.08],[x,1.04,2.19],mat('#c5473e',.4,0,{emissive:'#841d20',emissiveIntensity:.8}));}
 const wheels=[];
 for(const x of [-1.03,1.03])for(const z of [-1.38,1.38]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.28,20),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.48,z);wheel.castShadow=true;root.add(wheel);wheels.push(wheel);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.3,12),chrome);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);root.add(hub);
 }
 root.userData.wheels=wheels;root.userData.speed=0;return root;
}
const parked=[];
for(let r=-144;r<=144;r+=72)for(let n=-2;n<=2;n++){
 const z=n*25+8;if(Math.abs(z-r)<20)continue;
 const c=makeCar(carColors[Math.floor(rand()*carColors.length)]);c.position.set(r+9,.03,z);c.rotation.y=Math.PI/2;city.add(c);parked.push(c);
}
// A welcoming starter car is parked beside the opening street.
const starterCar=makeCar('#d1b75c');starterCar.position.set(.5,.03,12);starterCar.rotation.y=Math.PI/2;city.add(starterCar);parked.push(starterCar);

// Player character with articulated arms and legs, plus autonomous strolling citizens.
function makePerson(shirt,pants,skin='#bd8261'){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.29,.64,4,8),mat(shirt,.83));body.position.y=1.12;body.castShadow=true;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),mat(skin,.88));head.position.y=1.77;head.castShadow=true;g.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.225,10,7,0,Math.PI*2,0,Math.PI*.48),mat('#302d2b'));hair.position.y=1.83;g.add(hair);
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.48,3,7),mat(shirt));arm.position.set(side*.37,1.18,0);arm.rotation.z=side*-.22;arm.castShadow=true;g.add(arm);limbs.push(arm);
  const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.48,3,7),mat(pants));leg.position.set(side*.15,.46,0);leg.castShadow=true;g.add(leg);limbs.push(leg);
  const shoe=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.34),mat('#e2d9c4'));shoe.position.set(side*.15,.14,-.06);g.add(shoe);
 }
 g.userData.limbs=limbs;return g;
}
const player=makePerson('#d2ef59','#34434a','#c98e6b');scene.add(player);player.position.set(-3,.05,12);
let playerAngle=Math.PI, inCar=false, activeCar=null, walkClock=0;
const npcs=[];const shirtColors=['#efaa75','#78bad0','#d3c082','#c78db2','#8ec6a4','#d96f60','#91a3de','#f0d477'];
for(let i=0;i<19;i++){
 const npc=makePerson(shirtColors[i%shirtColors.length],['#34404a','#494547','#384d45','#4b5357'][i%4],['#bb815f','#d4a47b','#885d4d'][i%3]);
 const axis=i%2?0:1,road=roadCoords[1+Math.floor(rand()*3)],along=(rand()-.5)*300;
 npc.position.set(axis?road+11:along,.05,axis?along:road-11);
 npc.rotation.y=rand()*Math.PI*2;
 npc.userData={...npc.userData,axis,dir:rand()<.5?-1:1,phase:rand()*8,speed:.45+rand()*.45,home:along};scene.add(npc);npcs.push(npc);
}

// Signal drops: small animated, collectible beacons visible from the street.
const drops=[];
const dropPositions=[[-49,0,-42],[46,0,-84],[-108,0,57],[111,0,115],[21,0,150]];
for(const [x,_,z] of dropPositions){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.055,8,36),new THREE.MeshStandardMaterial({color:'#8affdf',emissive:'#39ffd0',emissiveIntensity:2.2}));ring.rotation.x=Math.PI/2;ring.position.y=.2;g.add(ring);
 const core=new THREE.Mesh(new THREE.OctahedronGeometry(.55,1),new THREE.MeshStandardMaterial({color:'#d9fff4',emissive:'#4bffd5',emissiveIntensity:2.2,metalness:.35,roughness:.2}));core.position.y=1.25;g.add(core);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.03,.85,6,16,1,true),new THREE.MeshBasicMaterial({color:'#45f2d0',transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=3;g.add(beam);
 drops.push({group:g,core,active:true,position:new THREE.Vector3(x,0,z)});
}

// Camera and controls.
const keys=new Set();let orbit=0,dragging=false,lastX=0;
addEventListener('keydown',e=>{const key=e.key.toLowerCase();keys.add(key);if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(key==='e'&&!e.repeat)interact()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(dragging){orbit-=(e.clientX-lastX)*.004;lastX=e.clientX}});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
for(const button of document.querySelectorAll('[data-key]')){
 const key=button.dataset.key;const on=e=>{e.preventDefault();keys.add(key)};const off=e=>{e.preventDefault();keys.delete(key)};
 button.addEventListener('pointerdown',on);button.addEventListener('pointerup',off);button.addEventListener('pointerleave',off);button.addEventListener('pointercancel',off);
}
document.querySelector('#mobile-action').addEventListener('click',interact);
function interact(){
 if(inCar){player.visible=true;player.position.copy(activeCar.position).add(new THREE.Vector3(2.5,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),activeCar.rotation.y));playerAngle=activeCar.rotation.y;activeCar.userData.speed=0;inCar=false;activeCar=null;toast('BACK ON THE STREET');return}
 const nearby=parked.reduce((best,c)=>{const d=c.position.distanceTo(player.position);return d<best.d?{car:c,d}:best},{car:null,d:5.2});
 if(nearby.car){activeCar=nearby.car;inCar=true;player.visible=false;toast('NICE RIDE · TAKE THE LONG WAY HOME')}
}
let dropsFound=0,cash=2450,earned=0,stamina=100;let toastTimer;
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2100)}

const mini=document.querySelector('#minimap'),ctx=mini.getContext('2d');
function drawMap(){
 const w=mini.width,h=mini.height,scale=w/400;ctx.clearRect(0,0,w,h);ctx.fillStyle='#13262a';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#34494a';for(const r of roadCoords){const px=w/2+r*scale;ctx.fillRect(px-7*scale,0,14*scale,h);const py=h/2+r*scale;ctx.fillRect(0,py-7*scale,w,14*scale)}
 ctx.fillStyle='#847e69';for(let i=0;i<36;i++){const x=((i*71+29)%380+10),y=((i*113+53)%380+10);ctx.fillRect(x*scale,y*scale,8*scale,8*scale)}
 for(const d of drops)if(d.active){ctx.fillStyle='#6cf0dc';ctx.beginPath();ctx.arc(w/2+d.position.x*scale,h/2+d.position.z*scale,2.6,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#efaa75';for(const n of npcs){ctx.beginPath();ctx.arc(w/2+n.position.x*scale,h/2+n.position.z*scale,1.7,0,7);ctx.fill()}
 const pos=inCar?activeCar.position:player.position;ctx.save();ctx.translate(w/2+pos.x*scale,h/2+pos.z*scale);ctx.rotate(playerAngle);ctx.fillStyle='#d8ff68';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(3.5,4);ctx.lineTo(-3.5,4);ctx.closePath();ctx.fill();ctx.restore();
 const nearest=drops.filter(d=>d.active).reduce((a,d)=>Math.min(a,d.position.distanceTo(pos)),Infinity);document.querySelector('#nearest').textContent=Number.isFinite(nearest)?`${Math.round(nearest)} M`:'DONE';
}

const clock=new THREE.Clock();let lastMap=0;
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.1),now=clock.elapsedTime;
 // Walk, run, and car handling.
 const forward=keys.has('w')||keys.has('arrowup'),back=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),run=keys.has('shift');
 if(inCar){
  const c=activeCar;let speed=c.userData.speed;
  if(forward)speed+=15*dt;else if(back)speed-=11*dt;else speed*=Math.pow(.985,dt*60);
  speed=THREE.MathUtils.clamp(speed,-8,26);if(Math.abs(speed)>.25)c.rotation.y+=(left?1:right?-1:0)*dt*Math.sign(speed)*Math.min(1,Math.abs(speed)/4)*1.45;
  c.userData.speed=speed;c.position.x+=Math.sin(c.rotation.y)*speed*dt;c.position.z+=Math.cos(c.rotation.y)*speed*dt;
  c.position.x=THREE.MathUtils.clamp(c.position.x,-208,208);c.position.z=THREE.MathUtils.clamp(c.position.z,-208,208);
  c.userData.wheels.forEach(w=>w.rotation.x+=speed*dt*1.6);
  player.position.copy(c.position);playerAngle=c.rotation.y;
  document.querySelector('#speed').textContent=String(Math.round(Math.abs(speed)*3.6)).padStart(2,'0');document.querySelector('#gear').textContent=speed>.3?(Math.abs(speed)>15?'3':'2'):speed<-.3?'R':'1';
 }else{
  const moving=forward||back||left||right;let vx=(right?1:0)-(left?1:0),vz=(back?1:0)-(forward?1:0);
  if(moving){const ang=Math.atan2(vx,vz)+orbit;vx=Math.sin(ang);vz=Math.cos(ang);playerAngle=ang;const speed=run&&stamina>0?8.3:4.7;player.position.x+=vx*speed*dt;player.position.z+=vz*speed*dt;stamina=THREE.MathUtils.clamp(stamina-(run?22:-13)*dt,0,100)}else stamina=Math.min(100,stamina+14*dt);
  player.position.x=THREE.MathUtils.clamp(player.position.x,-210,210);player.position.z=THREE.MathUtils.clamp(player.position.z,-210,210);player.rotation.y=playerAngle;
  player.userData.limbs.forEach((limb,i)=>{limb.rotation.x=moving?Math.sin(now*9+(i%2)*Math.PI)*.38:Math.sin(now*1.8+i)*.025});
  document.querySelector('#speed').textContent='00';document.querySelector('#gear').textContent='P';
 }
 document.querySelector('#stamina-fill').style.width=`${stamina}%`;
 if(now-lastMap>.13) document.querySelector('#mode-label').textContent=inCar?'IN VEHICLE':run&&forward?'RUNNING':'ON FOOT';
 // Pedestrians stroll along sidewalks, turn around and animate their stride.
 for(const n of npcs){const data=n.userData;data.phase+=dt*data.speed*3.3;const v=data.dir*data.speed*dt;if(data.axis){n.position.z+=v;if(Math.abs(n.position.z-data.home)>155)data.dir*=-1;n.rotation.y=data.dir>0?Math.PI:0}else{n.position.x+=v;if(Math.abs(n.position.x-data.home)>155)data.dir*=-1;n.rotation.y=data.dir>0?Math.PI/2:-Math.PI/2}n.userData.limbs.forEach((l,i)=>l.rotation.x=Math.sin(data.phase+(i%2)*Math.PI)*.33)}
 // Signal drops bob and get collected on approach.
 const pos=inCar?activeCar.position:player.position;
 for(const d of drops)if(d.active){d.group.position.y=.12+Math.sin(now*1.8+d.position.x)*.11;d.core.rotation.y=now*.8;if(pos.distanceTo(d.position)<3.1){d.active=false;d.group.visible=false;dropsFound++;earned+=250;cash+=250;document.querySelector('#drop-count').innerHTML=`${dropsFound} <small>/ 5</small>`;document.querySelector('#progress-fill').style.width=`${dropsFound*20}%`;document.querySelector('#cash').textContent=cash.toLocaleString();document.querySelector('#earned').textContent=earned.toLocaleString();document.querySelector('#objective').textContent=dropsFound===5?'All signals recovered · city is yours':'Signal found · keep exploring';toast(dropsFound===5?'ALL SIGNAL DROPS FOUND · +$1,250':'SIGNAL DROP FOUND · +$250')}}
 // Vehicle interaction prompt.
 const closest=parked.reduce((best,c)=>{const d=c.position.distanceTo(player.position);return d<best.d?{car:c,d}:best},{car:null,d:4.4});
 const prompt=document.querySelector('#interaction');prompt.classList.toggle('visible',inCar||closest.d<4.4);document.querySelector('#interaction-text').textContent=inCar?'EXIT VEHICLE':'ENTER VEHICLE';document.querySelector('#mobile-action').textContent=inCar?'EXIT':'ENTER';
 // Smooth, close third-person camera; dragging orbits around the avatar.
 const heading=inCar?activeCar.rotation.y:playerAngle;
 const cameraYaw=heading+orbit;const dist=inCar?11.2:8.4;const target=new THREE.Vector3(pos.x-Math.sin(cameraYaw)*dist,pos.y+(inCar?5.4:4.4),pos.z-Math.cos(cameraYaw)*dist);
 camera.position.lerp(target,1-Math.exp(-dt*5.2));const look=new THREE.Vector3(pos.x,pos.y+(inCar?1.15:1.55),pos.z);camera.lookAt(look);
 if(now-lastMap>.13){drawMap();lastMap=now;document.querySelector('#clock').textContent=`${String(18+Math.floor(now/180)%4).padStart(2,'0')}:${String(Math.floor(now*1.25)%60).padStart(2,'0')}`}
 renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.35))});
setTimeout(()=>document.querySelector('#loading').classList.add('done'),1200);
animate();
