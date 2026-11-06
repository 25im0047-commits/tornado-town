const { GameState, LEVELS, seededRandom, cameraRig } = CORE;
const $ = id => document.getElementById(id);
const rng = seededRandom(701);
const rand = (a, b) => a + rng() * (b - a);
const pick = a => a[Math.floor(rng() * a.length)];
const TAU = Math.PI * 2;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  $('error').hidden = false; $('errorDetail').textContent = error.message; throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.4 : 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = .9;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#64ccff');
scene.fog = new THREE.Fog('#a4dff5', 225, 550);
const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 800);
camera.position.set(-12, 62, 127);
const hemi = new THREE.HemisphereLight('#bcecff', '#629b5c', 1.45);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d0', 2.5);
sun.position.set(50, 100, 40); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -76, right: 76, top: 76, bottom: -76, near: 2, far: 260 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.16;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);
const matte = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const dummy = new THREE.Object3D();
const v3 = new THREE.Vector3();
const templates = new Map();
const entities = [];
const batches = [];
const world = new THREE.Group(); scene.add(world);

class Model {
  constructor() { this.p = []; this.n = []; this.c = []; }
  face(vertices, color) {
    const a = new THREE.Vector3(...vertices[0]), b = new THREE.Vector3(...vertices[1]), c = new THREE.Vector3(...vertices[2]);
    const n = b.sub(a).cross(c.sub(a)).normalize();
    const col = new THREE.Color(color);
    const indices = vertices.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
    for (const i of indices) { this.p.push(...vertices[i]); this.n.push(n.x, n.y, n.z); this.c.push(col.r, col.g, col.b); }
    return this;
  }
  box(x, y, z, w, h, d, color) {
    const a = x - w/2, b = x + w/2, c = y - h/2, e = y + h/2, f = z - d/2, g = z + d/2;
    this.face([[a,c,g],[b,c,g],[b,e,g],[a,e,g]],color);
    this.face([[b,c,f],[a,c,f],[a,e,f],[b,e,f]],color);
    this.face([[b,c,g],[b,c,f],[b,e,f],[b,e,g]],color);
    this.face([[a,c,f],[a,c,g],[a,e,g],[a,e,f]],color);
    this.face([[a,e,g],[b,e,g],[b,e,f],[a,e,f]],color);
    this.face([[a,c,f],[b,c,f],[b,c,g],[a,c,g]],color);
    return this;
  }
  roof(w, d, y, h, color) {
    const a=[-w/2,y,d/2], b=[w/2,y,d/2], c=[w/2,y,-d/2], e=[-w/2,y,-d/2], f=[0,y+h,d/2], g=[0,y+h,-d/2];
    this.face([a,b,f],color); this.face([c,e,g],color);
    this.face([b,c,g,f],color); this.face([e,a,f,g],color);
    this.face([e,c,b,a],color); return this;
  }
  pyramid(x,z,y,r,h,color,sides=6) {
    for(let i=0;i<sides;i++) {
      const a=i/sides*TAU,b=(i+1)/sides*TAU;
      this.face([[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x,y+h,z],[x+Math.cos(b)*r,y,z+Math.sin(b)*r]],color);
    }
    return this;
  }
  clock(x, y, z, r, color) {
    for(let i=0;i<24;i++) {
      const a=i/24*TAU,b=(i+1)/24*TAU;
      this.face([[x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z]],color);
    }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    g.computeBoundingSphere(); return g;
  }
}
function register(name, model, tier, value, size) {
  templates.set(name,{ name, geometry:model.geometry(), tier, value, size }); return name;
}
const palette = ['#ffba22','#ff6445','#f85f9d','#17cbbb','#508bff','#ffc82c','#a1d83c','#ff9550'];
for(let k=0;k<8;k++) {
  const body=palette[k], roof=pick(['#e73746','#f46b26','#087daf','#3959a4']);
  const w=rand(5.8,7.6),d=rand(6.5,8),h=rand(4.4,6.3);
  const m=new Model().box(0,.22,0,w+.5,.44,d+.5,'#e4d8be').box(0,h/2+.4,0,w,h,d,body);
  m.roof(w+.7,d+.7,h+.4,2.3,roof).box(0,h+.3,0,w+.25,.22,d+.25,'#fff0cf');
  m.box(0,1.7,d/2+.04,1.2,2.5,.13,'#355b68').box(0,.55,d/2+.35,1.9,.3,.8,'#eadfc7');
  for(const x of [-w*.29,w*.29]) {
    m.box(x,3,d/2+.05,1.3,1.7,.13,'#fff1d2').box(x,3,d/2+.14,.96,1.3,.08,'#4e889b');
    m.box(x,3,d/2+.2,.08,1.3,.05,'#fff1d2');
  }
  for(const x of [-1,1]) for(const z of [-d*.25,d*.25]) m.box(x*(w/2+.05),3,z,.12,1.4,1.3,'#e9f1df').box(x*(w/2+.12),3,z,.06,1.1,1,'#4e889b');
  m.box(w*.3,h+1.3,-d*.2,.8,2.2,.8,'#dbb895');
  register('house'+k,m,3,18,5);
}
for(let k=0;k<6;k++) {
  const h=k<3?rand(7,9):rand(11,15), w=7.8,d=7.5;
  const m=new Model().box(0,h/2+.3,0,w,h,d,palette[k]).box(0,.25,0,w+.4,.5,d+.4,'#dcd6c3');
  m.box(0,h+.4,0,w+.5,.55,d+.5,'#f0e6d1').box(0,h+.9,0,w-.6,.5,d-.6,'#8eacaf');
  for(let y=2;y<h-.3;y+=2.9) for(let x=-2.6;x<3;x+=2.6) {
    m.box(x,y,d/2+.04,1.55,1.75,.12,'#e2eddd').box(x,y,d/2+.12,1.28,1.48,.08,'#427d90');
    m.box(w/2+.04,y,x,.12,1.7,1.5,'#d7e4d8').box(w/2+.12,y,x,.08,1.42,1.25,'#427d90');
  }
  m.box(0,1.5,d/2+.18,w-.7,2.6,.2,'#3a6b78').box(0,3.15,d/2+.6,w+.3,.3,1.6,'#fff4d4');
  for(let x=-3.5;x<4;x++) m.box(x,3.22,d/2+.65,.5,.22,1.7,k%2?'#df7962':'#77a7a0');
  m.box(0,4.15,d/2+.05,3.5,.8,.15,'#f6d66b');
  register('shop'+k,m,4,k<3?28:38,6);
}
for(let k=0;k<7;k++) {
  const h=19+k*3.1,w=7.4+(k%2)*1.2,d=8;
  const m=new Model().box(0,h/2,0,w,h,d,pick(['#2bc5d3','#ffc858','#63d4b4','#5599ed','#ff9c35']));
  m.box(0,h+.3,0,w+.6,.6,d+.6,'#f0e7d4');
  for(let y=2;y<h-1;y+=2.6) {
    for(let x=-2.5;x<3;x+=2.5) {
      m.box(x,y,d/2+.03,1.4,1.65,.08,(Math.floor(y)+k)%3===0?'#d1e6d8':'#365f78');
      m.box(-w/2-.03,y,x,.08,1.65,1.4,'#467b8c');
      m.box(w/2+.03,y,x,.08,1.65,1.4,'#467b8c');
    }
    if(k%2===0) m.box(0,y-1.1,0,w+.3,.18,d+.3,'#d9e1d3');
  }
  m.box(w*.2,h+.9,0,2,1.2,2.6,'#8e9e9b').box(-w*.2,h+2,1,.14,3,.14,'#66868c');
  register('high'+k,m,5,60+k*3,7);
}
for(let k=0;k<5;k++) {
  const m=new Model(); const h=rand(3.8,6.8),col=pick(['#138d52','#31af46','#6dcc38','#0b9c67']);
  m.box(0,h*.22,0,.48,h*.45,.48,'#9b7b53');
  m.pyramid(0,0,h*.3,1.65,h*.7,col,7).pyramid(0,0,h*.6,1.3,h*.6,'#69d545',7);
  register('tree'+k,m,1,2,2.1);
}
for(let k=0;k<6;k++) {
  const m=new Model().box(0,.75,0,1.7,.8,3.5,pick(['#f4ce6a','#eb8b73','#5d9eaf','#b5d0c7','#e8d7bc','#ac99b9']));
  m.box(0,1.35,-.2,1.48,.7,1.9,'#c2e0df').box(0,1.73,-.2,1.6,.15,2,'#f0ddbe');
  m.box(0,1.36,.78,1.3,.48,.08,'#4c7a8a').box(0,1.36,-1.2,1.3,.48,.08,'#4c7a8a');
  for(const x of [-.88,.88]) for(const z of [-1.05,1.05]) m.box(x,.48,z,.28,.65,.65,'#35474c');
  m.box(-.55,.87,1.78,.4,.23,.08,'#ffefbb').box(.55,.87,1.78,.4,.23,.08,'#ffefbb');
  register('car'+k,m,2,6,2.2);
}
register('lamp',new Model().box(0,2.7,0,.2,5.4,.2,'#567476').box(0,5.25,.5,.22,.2,1.15,'#567476').box(0,5.1,1,.6,.16,.7,'#fff4c6'),1,2,1);
register('bench',new Model().box(0,.9,0,2.6,.22,.75,'#b78756').box(0,1.38,-.3,2.6,.8,.18,'#c99b60').box(-.9,.4,0,.16,.8,.65,'#47686b').box(.9,.4,0,.16,.8,.65,'#47686b'),1,2,1.6);
register('bin',new Model().box(0,.7,0,.8,1.4,.8,'#4c908b').box(0,1.45,0,.9,.2,.9,'#366c70'),1,1,.7);
const tower=new Model().box(0,1,0,12,2,12,'#e1d4b3').box(0,18,0,7.7,34,7.7,'#d99366');
tower.box(0,32.5,0,8.6,.8,8.6,'#fff0cc').box(0,37,0,9,7,9,'#f4d29a').box(0,40.5,0,10,.9,10,'#f9e7c2');
tower.pyramid(0,0,41,7.1,7.5,'#4e8d8c',4).box(0,49.5,0,.16,3,.16,'#d4ac4e');
tower.clock(0,37,4.53,2.25,'#556e70').clock(0,37,4.55,1.95,'#fff4d4');
tower.box(0,37.7,4.6,.16,1.7,.13,'#385967').box(.55,37.1,4.6,1.2,.17,.13,'#385967');
for(let y=6;y<30;y+=6) for(const x of [-1.9,1.9]) tower.box(x,y,3.89,1.2,2.6,.1,'#fff0d1').box(x,y,3.97,.8,2.2,.08,'#4c818c');
tower.box(0,3.7,3.93,2,4,.15,'#50727b');
register('tower',tower,6,350,10);

function addEntity(name,x,z,yaw=0,scale=1,landmark=false) {
  const t=templates.get(name);
  entities.push({ id:entities.length, template:t, tier:t.tier,value:t.value,x,z,yaw,scale,size:t.size*scale,landmark,state:'idle',batch:null,index:0 });
}
const ground=new Model().box(0,-.4,0,197,.8,197,'#698d76');
ground.box(0,.015,0,177,.07,177,'#667c7d');
for(let i=0;i<8;i++) {
  const a=-84+i*24;
  for(let z=-86;z<88;z+=5.3) ground.box(a,.067,z,.13,.025,2.2,'#d9d3ad');
  for(let x=-86;x<88;x+=5.3) ground.box(x,.068,a,2.2,.025,.13,'#d9d3ad');
  for(let j=0;j<8;j++) {
    const b=-84+j*24;
    for(let q=-1.5;q<=1.6;q+=.9) {
      ground.box(a+q,.08,b+3.2,.5,.025,1.5,'#e7e5cf');
      ground.box(a+3.2,.08,b+q,1.5,.025,.5,'#e7e5cf');
    }
  }
}
for(let iz=0;iz<7;iz++) for(let ix=0;ix<7;ix++) {
  const x=-72+ix*24,z=-72+iz*24;
  ground.box(x,.16,z,20.2,.25,20.2,'#d9d6bd');
  const park=(ix===1&&iz===5)||(ix===0&&iz===6)||(ix===5&&iz===5)||(ix===0&&iz===2);
  if(ix===3&&iz===3) {
    ground.box(x,.31,z,18,.07,18,'#e7debe');
    for(const a of [-7.8,7.8]) for(const b of [-7.8,7.8]) addEntity('tree2',x+a,z+b);
    continue;
  }
  if(park) {
    ground.box(x,.32,z,18.4,.09,18.4,'#61cf42').box(x,.38,z,2.1,.03,18,'#e0d4ac').box(x,.38,z,18,.03,2.1,'#e0d4ac');
    for(let q=0;q<14;q++) {
      const a=rand(-8,8),b=rand(-8,8);
      if(Math.abs(a)>2.2&&Math.abs(b)>2.2) addEntity('tree'+q%5,x+a,z+b,rand(0,TAU),rand(.8,1.2));
    }
    for(const a of [-4,4]) addEntity('bench',x+a,z+2.2);
  } else {
    ground.box(x,.31,z,18,.08,18,pick(['#75d653','#83d948','#63ce59']));
    for(const a of [-5.1,5.1]) for(const b of [-5.1,5.1]) {
      const cityDist=Math.hypot(x-22,z+26);
      const name=cityDist<38?'high'+Math.floor(rand(0,7)):cityDist<66&&z<30?'shop'+Math.floor(rand(0,6)):'house'+Math.floor(rand(0,8));
      addEntity(name,x+a,z+b,b<0?Math.PI:0,rand(.87,1.02));
    }
    for(const a of [-8.9,8.9]) addEntity('tree'+Math.floor(rand(0,5)),x+a,z+rand(-7,7),rand(0,TAU),.73);
  }
  addEntity('car'+Math.floor(rand(0,6)),x-11.8,z+4.5,0);
  if((ix+iz)%2===0) addEntity('car'+Math.floor(rand(0,6)),x+4,z+11.9,Math.PI/2);
  addEntity('lamp',x+9.6,z+9.6,Math.PI);
  addEntity('bin',x-9.2,z-9.2);
}
addEntity('tower',0,0,0,1,true);
// Small objects around the spawn let the first upgrade happen through normal movement.
for(let i=0;i<22;i++) {
  const a=i/22*TAU,r=rand(4,17);
  addEntity(i%5===0?'bench':'tree'+i%5,-61+Math.cos(a)*r,61+Math.sin(a)*r,rand(0,TAU),.75);
}
const cityMesh=new THREE.Mesh(ground.geometry(),matte);cityMesh.receiveShadow=true;world.add(cityMesh);
const entityMatrix=new THREE.Matrix4();
function setEntityMatrix(e,visible=true) {
  dummy.position.set(e.x,.37,e.z);dummy.rotation.set(0,e.yaw,0);dummy.scale.setScalar(visible?e.scale:0);dummy.updateMatrix();
  e.batch.setMatrixAt(e.index,dummy.matrix);e.batch.instanceMatrix.needsUpdate=true;
}
for(const t of templates.values()) {
  const list=entities.filter(e=>e.template===t);if(!list.length) continue;
  const mesh=new THREE.InstancedMesh(t.geometry,matte,list.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  list.forEach((e,index)=>{e.batch=mesh;e.index=index;setEntityMatrix(e);});
  world.add(mesh);batches.push(mesh);
}

// A coastline and a distant ring of mountains give the playable streets a setting.
const island=new THREE.Mesh(new THREE.CylinderGeometry(154,160,3,96),new THREE.MeshLambertMaterial({color:'#65cf4b'}));
island.position.y=-1.75;island.receiveShadow=true;scene.add(island);
const sand=new THREE.Mesh(new THREE.CylinderGeometry(160,164,1.8,96),new THREE.MeshLambertMaterial({color:'#e4d5a4'}));sand.position.y=-3;scene.add(sand);
const waterMat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uColor:{value:new THREE.Color('#13bbdc')}},
  vertexShader:`varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uColor;varying vec3 vWorld;void main(){float w=sin(vWorld.x*.18+uTime*.45)*sin(vWorld.z*.23-uTime*.55);float sparkle=pow(max(0.,sin(vWorld.x*.7+vWorld.z*.35+uTime)*sin(vWorld.z*.65-uTime)),12.);vec3 c=uColor+vec3(w*.022)+vec3(sparkle*.13);gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')
});
const water=new THREE.Mesh(new THREE.PlaneGeometry(1900,1900),waterMat);water.rotation.x=-Math.PI/2;water.position.y=-4;scene.add(water);
const forestModel=new Model();
for(let i=0;i<360;i++) {
  const a=rand(0,TAU),r=rand(107,147),x=Math.cos(a)*r,z=Math.sin(a)*r,h=rand(4,11);
  forestModel.box(x,h*.18-.2,z,.6,h*.36,.6,'#7f8160').pyramid(x,z,h*.15,rand(1.5,2.9),h,pick(['#13874c','#1ea551','#50be43']),6);
}
const forest=new THREE.Mesh(forestModel.geometry(),matte);forest.castShadow=true;forest.receiveShadow=true;scene.add(forest);
const hills=new Model();
for(let i=0;i<24;i++) {
  const a=i/24*TAU,r=rand(265,340),h=rand(36,105),x=Math.cos(a)*r,z=Math.sin(a)*r;
  hills.pyramid(x,z,-5,rand(40,83),h,pick(['#9bb7b2','#86aaa9','#a5bdb5','#8caaa7']),5);
}
scene.add(new THREE.Mesh(hills.geometry(),matte));
const cloudGeo=new THREE.IcosahedronGeometry(1,1), cloudMat=new THREE.MeshLambertMaterial({color:'#f9f2db',flatShading:true});
const clouds=new THREE.Group();scene.add(clouds);
for(let i=0;i<19;i++) {
  const group=new THREE.Group(),a=rand(0,TAU),r=rand(165,330);
  group.position.set(Math.cos(a)*r,rand(65,98),Math.sin(a)*r);
  for(let j=0;j<4;j++) {const m=new THREE.Mesh(cloudGeo,cloudMat);m.position.set(j*5,Math.sin(j)*1.4,0);m.scale.set(6+Math.sin(j)*2,2.4+Math.cos(j),3);group.add(m);}
  clouds.add(group);
}

const game=new GameState(entities);
const tornado=new THREE.Group();scene.add(tornado);
const tornadoMat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uBoost:{value:0},uFever:{value:0}}, side:THREE.DoubleSide,
  vertexShader:`uniform float uTime;varying float vH;varying float vA;varying vec3 vN;void main(){vec3 p=position;vH=p.y/10.;float a=atan(p.z,p.x);vA=a;float twist=uTime*2.2+vH*4.;float r=length(p.xz)*(1.+.055*sin(a*4.+vH*14.-uTime*5.));a+=twist;p.x=cos(a)*r+sin(vH*4.-uTime*1.7)*vH*.45;p.z=sin(a)*r+cos(vH*3.-uTime*1.4)*vH*.38;vN=normalize(vec3(cos(a),-.27,sin(a)));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
  fragmentShader:`uniform float uTime;uniform float uBoost;uniform float uFever;varying float vH;varying float vA;varying vec3 vN;void main(){float light=dot(vN,normalize(vec3(.6,.8,.4)))*.5+.5;float bands=smoothstep(.2,.5,sin(vH*95.+vA*1.4-uTime*7.));vec3 c=mix(vec3(.17,.28,.34),vec3(.87,.91,.85),light);c*=mix(.73,1.05,bands);c=mix(vec3(.76,.65,.44),c,smoothstep(.0,.4,vH));c+=uBoost*vec3(.10,.05,0.);c=mix(c,c*vec3(1.12,.94,.55)+vec3(.08,.03,.01),uFever*.55);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`
});
const funnelGeo=new THREE.CylinderGeometry(3.4,.42,10,28,30,true);funnelGeo.translate(0,5,0);
const funnel=new THREE.Mesh(funnelGeo,tornadoMat);tornado.add(funnel);
const windRibbons=[];
for(let j=0;j<5;j++) {
  const vertices=[],indices=[],segments=92;
  for(let i=0;i<=segments;i++) {
    const t=i/segments,y=.25+t*9.8,r=.5+t*2.96,a=t*TAU*1.65+j*TAU/5;
    for(const side of [-1,1]) vertices.push(Math.cos(a)*r,y+side*(.10+t*.12),Math.sin(a)*r);
    if(i<segments) {const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#fff7db',transparent:true,opacity:.49,side:THREE.DoubleSide,depthWrite:false}));tornado.add(mesh);windRibbons.push(mesh);
}
function radialTexture() {
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  const grad=ctx.createRadialGradient(64,64,12,64,64,64);grad.addColorStop(0,'rgba(255,255,255,.8)');grad.addColorStop(.5,'rgba(255,255,255,.45)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
const shadowMap=radialTexture();
const groundShadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowMap,color:'#4b5b50',transparent:true,opacity:.5,depthWrite:false}));groundShadow.rotation.x=-Math.PI/2;groundShadow.position.y=.46;scene.add(groundShadow);
const radiusRing=new THREE.Mesh(new THREE.RingGeometry(.96,1,96),new THREE.MeshBasicMaterial({color:'#fff0b0',transparent:true,opacity:.36,depthWrite:false,side:THREE.DoubleSide}));radiusRing.rotation.x=-Math.PI/2;radiusRing.position.y=.44;scene.add(radiusRing);
const trail=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowMap,color:'#74523a',transparent:true,opacity:.68,depthWrite:false}),360);
trail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);trail.frustumCulled=false;scene.add(trail);
let trailCursor=0;for(let i=0;i<360;i++){dummy.scale.setScalar(0);dummy.updateMatrix();trail.setMatrixAt(i,dummy.matrix);}
const dustCount=110;
const dustGeo=new THREE.PlaneGeometry(1,1);
const dustAlpha=new Float32Array(dustCount);dustGeo.setAttribute('aAlpha',new THREE.InstancedBufferAttribute(dustAlpha,1));
const dustMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  vertexShader:`attribute float aAlpha;varying vec2 vUv;varying float vAlpha;void main(){vUv=uv;vAlpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 vUv;varying float vAlpha;void main(){vec2 p=vUv-.5;float a=1.-smoothstep(.12,.5,length(p)*(1.+.10*sin(atan(p.y,p.x)*7.)));vec3 c=mix(vec3(.55,.41,.24),vec3(1.,.90,.65),vUv.y);gl_FragColor=vec4(c,a*a*vAlpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`
});
const dustMesh=new THREE.InstancedMesh(dustGeo,dustMat,dustCount);dustMesh.frustumCulled=false;dustMesh.renderOrder=2;scene.add(dustMesh);
const dustSeeds=Array.from({length:dustCount},()=>({phase:rand(0,TAU),age:rand(0,1),speed:rand(.8,1.6),size:rand(1.6,4.4),height:rand(.3,2.4)}));
const chipCount=420,chipGeometry=new THREE.BoxGeometry(1,1,1);
const chipMesh=new THREE.InstancedMesh(chipGeometry,new THREE.MeshLambertMaterial({color:'#fff8de'}),chipCount);chipMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);chipMesh.frustumCulled=false;scene.add(chipMesh);
const chips=Array.from({length:chipCount},()=>({life:0,max:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:1,phase:0}));
for(let i=0;i<chipCount;i++){dummy.scale.setScalar(0);dummy.updateMatrix();chipMesh.setMatrixAt(i,dummy.matrix);chipMesh.setColorAt(i,new THREE.Color(pick(['#ffdd24','#fff9dc','#38e3ff','#ff6540','#ff6cd1'])));}
let chipCursor=0;
const flying=[];
const towerBeacon=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,95,12,1,true),new THREE.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:.23,depthWrite:false}));towerBeacon.position.set(0,47,0);scene.add(towerBeacon);
const targetHalo=new THREE.Mesh(new THREE.RingGeometry(8.6,9,64),new THREE.MeshBasicMaterial({color:'#ffe49b',transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));targetHalo.rotation.x=-Math.PI/2;targetHalo.position.set(0,.47,0);scene.add(targetHalo);

const juice=new ArcadeFX($('arcadeFX'),reducedMotion);
const sound=new ArcadeAudio();
const impactRings=Array.from({length:10},()=>{
  const mesh=new THREE.Mesh(new THREE.RingGeometry(1,1.12,64),new THREE.MeshBasicMaterial({color:'#ffe132',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return {mesh,life:0,max:.6,size:1};
});
let impactCursor=0,lastRingTime=-1;
function shockwave(x,z,size=12,force=false){
  if(!force&&elapsed-lastRingTime<.13)return;lastRingTime=elapsed;
  const ring=impactRings[impactCursor++%impactRings.length];ring.life=ring.max=.65;ring.size=size;ring.mesh.position.set(x,.52+impactCursor*.00003,z);ring.mesh.visible=true;
}

let elapsed=0,lastTime=performance.now(),visualScale=2.3,toastLeft=0,pickupLeft=0,hudClock=0,mapClock=0;
let endingDelay=0,previousPhase='ready',renderDirty=true,lastDrawTime=-Infinity;
const center=new THREE.Vector3(-22,0,40);
const cameraTarget=new THREE.Vector3(-45,2,21),desiredCamera=new THREE.Vector3();
const keys=new Set();
const pointer={id:null,x:0,y:0,dx:0,dy:0};
const input={x:0,y:0};
const frameTimes=[];
const ui={level:$('level'),levelName:$('levelName'),xp:$('xpFill'),target:$('nextTarget'),destroyed:$('destroyed'),timer:$('timer'),boost:$('boost'),boostText:$('boostText'),boostKey:$('boostKey')};
const mini=$('minimap').getContext('2d');
const baseMap=document.createElement('canvas');baseMap.width=baseMap.height=300;
const baseCtx=baseMap.getContext('2d');
const mapPoint=n=>(n+102)/204*300;
baseCtx.fillStyle='#799c7b';baseCtx.fillRect(0,0,300,300);
baseCtx.fillStyle='#647e78';
for(let i=0;i<8;i++){const n=mapPoint(-84+i*24);baseCtx.fillRect(n-3,17,6,266);baseCtx.fillRect(17,n-3,266,6);}
function showToast(title,detail='',seconds=2.3) {
  const t=$('toast');t.textContent=title;
  if(detail){const s=document.createElement('small');s.textContent=detail;t.append(s);}
  toastLeft=seconds;t.classList.add('visible');
}
function addTrail(e) {
  dummy.position.set(e.x,.425+trailCursor*.000015,e.z);dummy.rotation.set(-Math.PI/2,0,rand(0,TAU));
  const size=Math.max(3,e.size*2.3);dummy.scale.set(size,size,1);dummy.updateMatrix();
  trail.setMatrixAt(trailCursor++%360,dummy.matrix);trail.instanceMatrix.needsUpdate=true;
}
function emitChips(x,z,n=10,power=1) {
  for(let j=0;j<n;j++) {
    const c=chips[chipCursor++%chipCount],a=rand(0,TAU);
    c.life=c.max=rand(1.0,2.2);c.x=x+rand(-1,1);c.z=z+rand(-1,1);c.y=rand(.6,2);
    c.vx=Math.cos(a)*rand(3,9)*power;c.vz=Math.sin(a)*rand(3,9)*power;c.vy=rand(5,11)*power;
    c.size=rand(.12,.48)*Math.sqrt(power);c.phase=rand(0,TAU);
  }
}
function retireFlight(f) { scene.remove(f.mesh); }
function absorb(e) {
  e.state='flying';setEntityMatrix(e,false);addTrail(e);
  const mesh=new THREE.Mesh(e.template.geometry,matte);mesh.castShadow=false;scene.add(mesh);
  flying.push({mesh,e,age:0,duration:rand(1.8,2.65),angle:Math.atan2(e.z-center.z,e.x-center.x),phase:rand(0,TAU),distance:Math.hypot(e.x-center.x,e.z-center.z)});
  if(flying.length>42) retireFlight(flying.shift());
  emitChips(e.x,e.z,e.tier>2?26:8,e.tier>3?2:1);
  const point=v3.set(e.x,Math.min(9,e.tier*1.8),e.z).project(camera);
  juice.hit(e.tier,e.value,game.combo,(point.x*.5+.5)*innerWidth,(-point.y*.5+.5)*innerHeight,toastLeft>0);
  if(e.tier>=3)shockwave(e.x,e.z,9+e.tier*2);
  pickupLeft=.7;$('pickup').textContent=`+${e.value}`;$('pickup').classList.add('visible');
  if(sound.enabled) sound.pickup(e.tier,game.combo);
}
function requestBoost() {
  if(game.boost()) {emitChips(center.x,center.z,52,2);juice.celebrate('boost');shockwave(center.x,center.z,game.absorbRadius*2,true);if(sound.enabled)sound.gust();}
}
function scanAbsorption() {
  if(!['playing','free'].includes(game.phase))return;
  let taken=0;
  for(const e of entities) {
    if(e.state!=='idle')continue;
    const dist=Math.hypot(e.x-game.x,e.z-game.z);
    const before=game.level,feverBefore=game.feverCount;
    if(game.consume(e,dist)) {
      absorb(e);taken++;
      if(game.level>before) {
        showToast(`サイズ ${game.level+1}！`,`${game.stats.target}を巻き込めるようになった`,2.6);
        emitChips(center.x,center.z,65,2.2);juice.celebrate('level');shockwave(center.x,center.z,game.absorbRadius*2,true);
        if(sound.enabled)sound.levelUp();
      }
      if(game.feverCount>feverBefore){showToast('フィーバー!!','7秒間、吸引範囲・速度UP！',1.8);juice.celebrate('fever');shockwave(center.x,center.z,game.absorbRadius*2.5,true);if(sound.enabled)sound.fever();}
      if(e.landmark && game.won && game.phase==='ended'){showToast('街をのみこんだ!!','時計塔クリア！',2.4);juice.celebrate('win');if(sound.enabled)sound.win();endingDelay=2.4;}
      if(taken>=5||game.phase==='ended')break;
    }
  }
}
function updateFlying(dt) {
  for(let i=flying.length-1;i>=0;i--) {
    const f=flying[i];f.age+=dt;const t=Math.min(1,f.age/f.duration);
    if(t===1){retireFlight(f);f.e.state='gone';flying.splice(i,1);continue;}
    const lift=Math.min(1,t/.32),orbit=t*t*(3-2*t),h=(.4+t*10.6)*visualScale;
    const a=f.angle+t*(5.4+f.phase*.25),r=(f.distance*(1-orbit)*.65+(.8+t*2.5)*visualScale)*(1-t*.28);
    const ox=center.x+Math.cos(a)*r,oz=center.z+Math.sin(a)*r;
    f.mesh.position.set(THREE.MathUtils.lerp(f.e.x,ox,lift),.37+h*(t<.15?t/.15:1),THREE.MathUtils.lerp(f.e.z,oz,lift));
    f.mesh.rotation.set(t*3.5+Math.sin(f.phase)*t,f.e.yaw+t*5,t*2.7);
    const shrink=t<.65?1-t*.55:Math.max(.001,(1-t)/.35*.64);
    f.mesh.scale.setScalar(f.e.scale*shrink);
  }
}
function updateEffects(dt) {
  const boosting=game.boostLeft>0;
  tornado.position.copy(center);tornado.scale.setScalar(visualScale);
  tornadoMat.uniforms.uTime.value=elapsed;tornadoMat.uniforms.uBoost.value=boosting?1:0;
  tornadoMat.uniforms.uFever.value=game.feverLeft>0?1:0;
  windRibbons.forEach((m,i)=>{m.rotation.y=elapsed*(i%2?.65:1.3)+i*.35;m.material.opacity=.48+(boosting?.25:0);m.material.color.set(game.feverLeft>0?(i%2?'#fff31f':'#ff8ede'):'#fff8dd');});
  radiusRing.position.x=center.x;radiusRing.position.z=center.z;
  radiusRing.scale.setScalar(game.absorbRadius);radiusRing.visible=game.phase!=='ready';
  radiusRing.material.opacity=boosting?.65:.24;
  groundShadow.position.x=center.x;groundShadow.position.z=center.z;groundShadow.scale.set(visualScale*12,visualScale*8,1);
  for(let i=0;i<dustCount;i++) {
    const d=dustSeeds[i];d.age=(d.age+dt*.43*d.speed)%1;
    const a=d.phase+elapsed*(1.7+(i%3)*.3),r=(1.6+d.age*3.4)*visualScale*(boosting?1.2:1);
    dummy.position.set(center.x+Math.cos(a)*r,1+d.age*d.height*visualScale*.6,center.z+Math.sin(a)*r);
    dummy.quaternion.copy(camera.quaternion);dummy.rotateZ(d.phase+elapsed*.3);
    const s=d.size*(.7+d.age)*visualScale;dummy.scale.set(s,s*.78,1);dummy.updateMatrix();dustMesh.setMatrixAt(i,dummy.matrix);
    dustAlpha[i]=Math.sin(d.age*Math.PI)*(.15+(boosting?.13:0))*(reducedMotion?.6:1);
  }
  dustMesh.instanceMatrix.needsUpdate=true;dustGeo.attributes.aAlpha.needsUpdate=true;
  for(let i=0;i<chipCount;i++) {
    const c=chips[i];if(c.life>0) {
      c.life-=dt;const dx=center.x-c.x,dz=center.z-c.z,r=Math.hypot(dx,dz)+.01;
      c.vx+=(dx/r*7-dz/r*12)*dt;c.vz+=(dz/r*7+dx/r*12)*dt;c.vy-=dt*3.5;
      c.x+=c.vx*dt;c.z+=c.vz*dt;c.y+=c.vy*dt;
      dummy.position.set(c.x,Math.max(.5,c.y),c.z);dummy.rotation.set(elapsed*3+c.phase,elapsed*2,elapsed*4+c.phase);
      dummy.scale.setScalar(c.size*Math.min(1,Math.max(0,c.life)*2));
    } else dummy.scale.setScalar(0);
    dummy.updateMatrix();chipMesh.setMatrixAt(i,dummy.matrix);
  }
  chipMesh.instanceMatrix.needsUpdate=true;
  towerBeacon.visible=!game.collected.has(entities.find(e=>e.landmark).id);
  targetHalo.visible=towerBeacon.visible;targetHalo.rotation.z=elapsed*.25;
  const haloScale=1+Math.sin(elapsed*2)*.025;targetHalo.scale.setScalar(haloScale);
  towerBeacon.material.opacity=game.level===5?.37:.13;
  waterMat.uniforms.uTime.value=elapsed;
  clouds.position.x=Math.sin(elapsed*.014)*5;
  for(const ring of impactRings){if(ring.life>0){ring.life-=dt;const t=1-Math.max(0,ring.life)/ring.max;ring.mesh.scale.setScalar(reducedMotion?ring.size*.5:2+(1-Math.pow(1-t,3))*ring.size);ring.mesh.material.opacity=(1-t)*.8;ring.mesh.visible=ring.life>0;}}
}
function updateCamera(dt) {
  if(game.phase==='ready') {
    desiredCamera.set(16,72,112);cameraTarget.lerp(v3.set(-45,2,21),1-Math.exp(-dt*2));
  } else {
    const rig=cameraRig(visualScale,camera.aspect);
    cameraTarget.lerp(v3.set(center.x,rig.focusY,center.z),1-Math.exp(-dt*4));
    desiredCamera.set(center.x+rig.x,rig.focusY+rig.y,center.z+rig.z);
  }
  camera.position.lerp(desiredCamera,1-Math.exp(-dt*3));
  camera.lookAt(cameraTarget);
  const impact=reducedMotion?0:juice.trauma*juice.trauma;
  const targetFov=48-(reducedMotion?0:juice.zoom*4+(game.boostLeft>0?1:0));
  if(Math.abs(camera.fov-targetFov)>.015){camera.fov=targetFov;camera.updateProjectionMatrix();}
  if(impact>.002)camera.setViewOffset(innerWidth,innerHeight,Math.sin(elapsed*61)*impact*18,Math.cos(elapsed*47)*impact*12,innerWidth,innerHeight);
  else if(camera.view?.enabled)camera.clearViewOffset();
  sun.position.set(center.x+65,110,center.z+45);sun.target.position.set(center.x,0,center.z);sun.target.updateMatrixWorld();
}
function drawMap() {
  mini.clearRect(0,0,300,300);mini.drawImage(baseMap,0,0);
  for(const e of entities) {
    if(e.landmark)continue;
    mini.fillStyle=e.state!=='idle'?'#846b4d':e.tier>game.level+1?'#b5c2af':'#fff0c0';
    const s=e.tier>2?Math.max(5,e.size*1.4):2.2;
    mini.fillRect(mapPoint(e.x)-s/2,mapPoint(e.z)-s/2,s,s);
  }
  if(!game.won){mini.fillStyle='#ffdd6a';mini.save();mini.translate(150,150);mini.rotate(Math.PI/4);mini.fillRect(-6,-6,12,12);mini.restore();}
  const x=mapPoint(game.x),z=mapPoint(game.z);
  mini.strokeStyle='#f8f4d3';mini.lineWidth=2;mini.beginPath();mini.arc(x,z,game.stats.radius/204*300,0,TAU);mini.stroke();
  mini.fillStyle='#173f4a';mini.beginPath();mini.arc(x,z,7,0,TAU);mini.fill();mini.fillStyle='#fff6d9';mini.beginPath();mini.arc(x,z,4.3,0,TAU);mini.fill();
}
function updateHUD() {
  ui.level.textContent=`サイズ ${game.level+1}`;ui.levelName.textContent=game.stats.name;
  ui.xp.style.width=`${game.progress*100}%`;ui.xp.parentElement.setAttribute('aria-valuenow',Math.round(game.progress*100));
  ui.target.textContent=`巻き込めるもの：${game.level===5?'街のすべて':game.stats.target}`;
  ui.destroyed.textContent=game.destroyed.toFixed(1);
  ui.timer.textContent=game.phase==='free'?'自由':`${Math.floor(Math.ceil(game.remaining)/60)}:${String(Math.ceil(game.remaining)%60).padStart(2,'0')}`;
  ui.timer.classList.toggle('urgent',game.phase!=='free'&&game.remaining<20);
  ui.boost.disabled=game.cooldown>0;ui.boostText.textContent=game.cooldown>0?`${Math.ceil(game.cooldown)}秒`:'突風';ui.boostKey.textContent=game.cooldown>0?'回復中':coarse?'タップ':'SPACE';
  canvas.dataset.phase=game.phase;canvas.dataset.level=game.level+1;canvas.dataset.xp=game.xp;canvas.dataset.absorbed=game.count;
  canvas.dataset.x=game.x.toFixed(2);canvas.dataset.z=game.z.toFixed(2);canvas.dataset.remaining=game.remaining.toFixed(2);
  canvas.dataset.drawCalls=renderer.info.render.calls;canvas.dataset.triangles=renderer.info.render.triangles;canvas.dataset.flying=flying.length;
  canvas.dataset.frameMs=(frameTimes.reduce((a,b)=>a+b,0)/Math.max(1,frameTimes.length)).toFixed(2);
  $('combo').hidden=game.combo<2&&game.feverLeft<=0;
  $('comboCount').textContent=game.combo>=2?`${game.combo}連続！`:'FEVER!!';
  $('comboMode').textContent=game.feverLeft>0?`フィーバー ${Math.ceil(game.feverLeft)}秒！ 吸引・速度UP`:'続けて巻き込め！';
  $('chainFill').style.transform=`scaleX(${game.feverLeft>0?game.feverLeft/7:game.chainLeft/2.5})`;
  $('game').classList.toggle('fever',game.feverLeft>0);
  canvas.dataset.combo=game.combo;canvas.dataset.maxCombo=game.maxCombo;canvas.dataset.fever=game.feverLeft.toFixed(2);canvas.dataset.feverCount=game.feverCount;
  canvas.dataset.audioState=sound.ctx?.state||'not-started';canvas.dataset.audioVoices=sound.voices.size;canvas.dataset.audioEnabled=sound.enabled;
  const rig=cameraRig(visualScale,camera.aspect);
  canvas.dataset.cameraDistance=rig.distance.toFixed(2);canvas.dataset.cameraPitch=(rig.pitch*180/Math.PI).toFixed(1);
}
function startGame() {
  game.start();$('intro').hidden=true;$('hud').hidden=false;canvas.focus({preventScroll:true});
  showToast('まずは木や街灯から','近づくだけで巻き込める',2.8);
  sound.reset();if(sound.enabled){sound.init();sound.levelUp();}juice.celebrate('start');
}
function focusModal() {
  $('hud').inert=true;canvas.inert=true;$('modal').hidden=false;
  $('resume').focus({preventScroll:true});keys.clear();releasePointer();
}
function closeModal() { $('modal').hidden=true;$('hud').inert=false;canvas.inert=false;canvas.focus({preventScroll:true}); }
function pauseGame() {
  if(!['playing','free'].includes(game.phase))return;
  game.pause();$('modalEyebrow').textContent='ひと休み';$('modalTitle').textContent='一時停止';$('modalBody').textContent='時間もここで止まっています。';
  $('resultStats').hidden=true;$('resume').textContent='つづける →';focusModal();if(sound.enabled)sound.setWind(0);
}
function finishGame() {
  $('modalEyebrow').textContent=game.won?'目標達成':'今回の記録';
  $('modalTitle').textContent=game.won?'時計塔をのみこんだ！':'タイムアップ';
  $('modalBody').textContent=game.won?'まだまだ街を巻き込めます。': '時間制限なしで、この街を続けられます。';
  const stats=$('resultStats');stats.hidden=false;stats.replaceChildren();
  for(const [label,value] of [['街の破壊率',`${game.destroyed.toFixed(1)}%`],['巻き込んだ数',game.count],['最高コンボ',`${game.maxCombo}連続`]]) {
    const div=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=value;span.textContent=label;div.append(strong,span);stats.append(div);
  }
  $('resume').textContent='この街でつづける →';focusModal();if(sound.enabled)sound.setWind(0);
}
function resetRound() {
  game.reset();keys.clear();releasePointer();juice.reset();for(const ring of impactRings){ring.life=0;ring.mesh.visible=false;}
  for(const f of flying)retireFlight(f);flying.length=0;
  for(const e of entities){e.state='idle';setEntityMatrix(e);}
  for(const c of chips)c.life=0;
  for(let i=0;i<360;i++){dummy.scale.setScalar(0);dummy.updateMatrix();trail.setMatrixAt(i,dummy.matrix);}trail.instanceMatrix.needsUpdate=true;trailCursor=0;
  center.set(game.x,0,game.z);visualScale=1;endingDelay=0;previousPhase='ready';closeModal();startGame();updateHUD();drawMap();
}
function updateSoundButton(){const b=$('sound');b.textContent=sound.enabled?'音あり':'音なし';const label=sound.enabled?'音をオフにする':'音をオンにする';b.setAttribute('aria-label',label);b.title=label;b.setAttribute('aria-pressed',sound.enabled);}
$('sound').addEventListener('click',()=>{sound.mute(sound.enabled);updateSoundButton();});
$('start').addEventListener('click',startGame);
$('pause').addEventListener('click',pauseGame);
$('boost').addEventListener('click',requestBoost);
$('resume').addEventListener('click',()=>{if(game.phase==='paused')game.resume();else game.freePlay();closeModal();});
$('retry').addEventListener('click',resetRound);
function releasePointer() {pointer.id=null;pointer.dx=pointer.dy=0;$('joystick').hidden=true;$('stick').style.transform='';}
canvas.addEventListener('pointerdown',e=>{
  if(!['playing','free'].includes(game.phase)||pointer.id!==null)return;
  pointer.id=e.pointerId;pointer.x=e.clientX;pointer.y=e.clientY;pointer.dx=pointer.dy=0;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
  $('joystick').hidden=false;$('joystick').style.left=e.clientX+'px';$('joystick').style.top=e.clientY+'px';
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer.id)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,l=Math.max(45,Math.hypot(dx,dy));pointer.dx=dx/l;pointer.dy=dy/l;
  $('stick').style.transform=`translate(${pointer.dx*34}px,${pointer.dy*34}px)`;
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer.id)releasePointer();});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape') {
    if(game.phase==='paused'){game.resume();closeModal();}else pauseGame();e.preventDefault();return;
  }
  if($('modal').hidden&&['playing','free'].includes(game.phase)&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
    e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)requestBoost();
  }
  if(!$('modal').hidden&&e.code==='Tab') {
    const controls=[$('resume'),$('retry')],i=controls.indexOf(document.activeElement);
    e.preventDefault();controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();
  }
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();releasePointer();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pauseGame();$('error').hidden=false;$('errorDetail').textContent='3D描画が中断されました。もう一度開くと最初から遊べます。';});
function resize() {renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.clearViewOffset();camera.updateProjectionMatrix();juice.resize();renderDirty=true;}
window.addEventListener('resize',resize);resize();drawMap();updateSoundButton();
camera.position.copy(v3.set(16,72,112));camera.lookAt(cameraTarget);
let perfPrevious=performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const frameStart=performance.now(),rawDt=(now-lastTime)/1000,dt=Math.min(.05,Math.max(0,rawDt));lastTime=now;
  const frozen=game.phase==='paused'||(game.phase==='ended'&&!$('modal').hidden);
  if(!frozen) {
    elapsed+=dt;
    input.x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+pointer.dx;
    input.y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+pointer.dy;
    game.step(dt,input.x,input.y);
    if(game.phase!=='ready')center.lerp(v3.set(game.x,0,game.z),1-Math.exp(-dt*13));
    visualScale=THREE.MathUtils.lerp(visualScale,game.phase==='ready'?2.3:game.stats.scale,1-Math.exp(-dt*3.4));
    juice.update(dt);scanAbsorption();updateFlying(dt);updateCamera(dt);updateEffects(dt);
    if(toastLeft>0){toastLeft-=dt;if(toastLeft<=0)$('toast').classList.remove('visible');}
    if(pickupLeft>0){pickupLeft-=dt;if(pickupLeft<=0)$('pickup').classList.remove('visible');}
    if(game.phase==='ended'&&previousPhase!=='ended'&&!game.won)endingDelay=.35;
    if(game.phase==='ended'&&$('modal').hidden){endingDelay-=dt;if(endingDelay<=0)finishGame();}
    if(sound.enabled)sound.setWind(['playing','free'].includes(game.phase)?.35+game.level*.06:0);
  }
  previousPhase=game.phase;
  hudClock+=dt;mapClock+=dt;
  if(hudClock>.09){updateHUD();hudClock=0;}
  if(mapClock>.15){drawMap();mapClock=0;}
  if(renderDirty||(!frozen&&!document.hidden&&(game.phase!=='ready'||now-lastDrawTime>=1000/30))){
    renderer.render(scene,camera);
    juice.draw({active:['playing','free'].includes(game.phase),boost:game.boostLeft>0,fever:game.feverLeft>0});
    renderDirty=false;lastDrawTime=now;
  }
  sound.tick(['playing','free'].includes(game.phase),game.feverLeft>0);
  if(rawDt<.3){frameTimes.push((now-perfPrevious));if(frameTimes.length>90)frameTimes.shift();}perfPrevious=now;
  canvas.dataset.renderMs=(performance.now()-frameStart).toFixed(2);
}
requestAnimationFrame(frame);
