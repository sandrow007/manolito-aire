import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://unpkg.com/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.180.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://unpkg.com/three@0.180.0/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.180.0/examples/jsm/environments/RoomEnvironment.js';

const mount = document.getElementById('manolitModelo3D') || document.body;
const width = () => Math.max(1, mount.clientWidth || innerWidth);
const height = () => Math.max(1, mount.clientHeight || innerHeight);
const SEED = 26032026;
function mulberry32(a) { return function () { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = mulberry32(SEED);
const C = { red: 0xff244d, gold: 0xffc400, cyan: 0x00eaff, blue: 0x3478ff, violet: 0xa06cff, pink: 0xff4fa8 };
const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.FogExp2(0x010207, 0.026);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(width(), height());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'Modelo 3D interactivo de Manolit∞');
mount.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.1, 160);
const home = new THREE.Vector3(5.8, 4.1, 10.8);
camera.position.copy(home);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.35, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 6;
controls.maxDistance = 19;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minPolarAngle = Math.PI * 0.18;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.52, 0.42, 0.62);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0x718dcc, 0x050308, 0.75));
const key = new THREE.DirectionalLight(0xc7dcff, 3.1);
key.position.set(5, 9, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 8; key.shadow.camera.bottom = -4;
scene.add(key);
const rim = new THREE.PointLight(C.pink, 45, 15, 2); rim.position.set(-4, 4, -2); scene.add(rim);
const fill = new THREE.PointLight(C.cyan, 40, 15, 2); fill.position.set(4, 2, 2); scene.add(fill);

const ground = new THREE.Mesh(new THREE.CircleGeometry(100, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x03050b, metalness: 0.78, roughness: 0.32 }));
ground.position.y = -0.32; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(90, 90, 0x10233d, 0x07101e); grid.position.y = -0.305; grid.material.transparent = true; grid.material.opacity = 0.42; scene.add(grid);

const stage = new THREE.Group(); scene.add(stage);
const darkMetal = new THREE.MeshPhysicalMaterial({ color: 0x090d16, metalness: 0.92, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
const base = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.35, 0.34, 96, 1), darkMetal);
base.position.y = -0.12; base.castShadow = true; base.receiveShadow = true; stage.add(base);
const top = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 3.05, 0.09, 96), new THREE.MeshPhysicalMaterial({ color: 0x101a29, metalness: 0.85, roughness: 0.14, clearcoat: 1 }));
top.position.y = 0.095; stage.add(top);

function emissive(color, intensity = 4, opacity = 1) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity * 0.58, metalness: 0.18, roughness: 0.22, transparent: opacity < 1, opacity }); }
function ring(radius, tube, color, y, intensity = 3) { const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 128), emissive(color, intensity)); m.rotation.x = Math.PI / 2; m.position.y = y; stage.add(m); return m; }
const rings = [ring(3.09, 0.025, C.cyan, 0.02, 5), ring(3.28, 0.018, C.violet, -0.08, 4), ring(2.25, 0.014, C.blue, 0.15, 3), ring(1.45, 0.012, C.pink, 0.16, 3)];

const monument = new THREE.Group(); monument.position.y = 2.62; scene.add(monument);
const logo = new THREE.Group(); monument.add(logo);
const pt = (x, y, z = 0) => new THREE.Vector3((x - 100) / 100, (290 - y) / 100, z);
function cubic(a, b, c, d) { return new THREE.CubicBezierCurve3(pt(...a), pt(...b), pt(...c), pt(...d)); }
function quad(a, b, c) { return new THREE.QuadraticBezierCurve3(pt(...a), pt(...b), pt(...c)); }
function tube(curve, radius, color, intensity = 4.5, segments = 100) { const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 10, false), emissive(color, intensity)); return mesh; }

const shieldPath = new THREE.CurvePath();
shieldPath.add(cubic([100,30],[30,110],[30,210],[100,290]));
shieldPath.add(cubic([100,290],[170,210],[170,110],[100,30]));
const shieldShape = new THREE.Shape();
shieldShape.moveTo(...pt(100,30).toArray().slice(0,2));
shieldShape.bezierCurveTo(...pt(30,110).toArray().slice(0,2), ...pt(30,210).toArray().slice(0,2), ...pt(100,290).toArray().slice(0,2));
shieldShape.bezierCurveTo(...pt(170,210).toArray().slice(0,2), ...pt(170,110).toArray().slice(0,2), ...pt(100,30).toArray().slice(0,2));

const echoes = [];
const echoData = [ [C.pink,-0.48,-0.36], [C.violet,-0.24,-0.20], [C.blue,0.24,-0.20], [C.cyan,0.48,-0.36] ];
echoData.forEach(([color, angle, z], i) => {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.035, bevelEnabled: false }), new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.45, transparent: true, opacity: 0.075, roughness: 0.15, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  g.add(glass);
  g.add(tube(shieldPath, 0.018, color, 2.9, 120));
  g.rotation.y = angle; g.position.z = z; g.scale.setScalar(1.035 + i * 0.008);
  logo.add(g); echoes.push(g);
});

const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3 }), new THREE.MeshPhysicalMaterial({ color: 0x240611, emissive: 0x240008, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.08, transmission: 0.35, transparent: true, opacity: 0.76, thickness: 0.35, clearcoat: 1, side: THREE.DoubleSide }));
glass.position.z = -0.06; logo.add(glass);
logo.add(tube(shieldPath, 0.034, C.red, 5.8, 160));
const circle = new THREE.EllipseCurve(0, (290-150)/100, 0.45, 0.45, 0, Math.PI*2).getPoints(100).map(p => new THREE.Vector3(p.x,p.y,0.075));
logo.add(tube(new THREE.CatmullRomCurve3(circle, true), 0.022, C.gold, 5.2, 120));
const heart = new THREE.CurvePath();
heart.add(cubic([100,146],[75,121],[75,171],[100,146]));
heart.add(cubic([100,146],[125,121],[125,171],[100,146]));
const heartMesh = tube(heart, 0.041, C.red, 6.2, 120); heartMesh.position.z = 0.095; logo.add(heartMesh);
const wave1 = new THREE.CurvePath(); wave1.add(quad([60,165],[80,155],[100,165])); wave1.add(quad([100,165],[120,175],[140,165]));
const wave2 = new THREE.CurvePath(); wave2.add(quad([65,175],[82.5,167],[100,175])); wave2.add(quad([100,175],[117.5,183],[135,175]));
const w1 = tube(wave1, 0.027, C.cyan, 5.8); w1.position.z = 0.10; logo.add(w1);
const w2 = tube(wave2, 0.021, C.cyan, 5.3); w2.position.z = 0.10; logo.add(w2);
logo.scale.setScalar(1.48);

const haloGroup = new THREE.Group(); haloGroup.position.set(0,2.62,-0.75); scene.add(haloGroup);
const haloColors = [C.cyan,C.violet,C.pink,C.blue];
for (let i=0;i<4;i++) {
  const arc = new THREE.Mesh(new THREE.TorusGeometry(2.55+i*0.15,0.009,6,100,Math.PI*(0.44+i*0.05)),emissive(haloColors[i],2.4,0.8));
  arc.rotation.z = i*Math.PI/2+0.25; haloGroup.add(arc);
}

const particleCount = 150;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount*3), colors = new Float32Array(particleCount*3);
const palette = [C.cyan,C.blue,C.violet,C.pink,C.red,C.gold].map(c=>new THREE.Color(c));
for(let i=0;i<particleCount;i++) { const a=rand()*Math.PI*2,r=3.2+rand()*7; positions[i*3]=Math.cos(a)*r; positions[i*3+1]=rand()*6.5; positions[i*3+2]=Math.sin(a)*r-1; const c=palette[Math.floor(rand()*palette.length)]; colors.set([c.r,c.g,c.b],i*3); }
particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3)); particleGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
const particles = new THREE.Points(particleGeo,new THREE.PointsMaterial({size:0.025,vertexColors:true,transparent:true,opacity:0.65,blending:THREE.AdditiveBlending,depthWrite:false})); scene.add(particles);

// Fine luminous ticks make the base feel engineered rather than decorative.
for(let i=0;i<48;i++) { const a=i/48*Math.PI*2; const tick=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.012,i%4===0?0.22:0.09),emissive(i%4===0?C.cyan:C.blue,i%4===0?2.2:0.8)); tick.position.set(Math.cos(a)*2.67,0.16,Math.sin(a)*2.67); tick.rotation.y=-a; stage.add(tick); }

const DURATION = 12;
let autoSpin = true, surgeStart = -100, simT = 0;
function sample(t) {
  const phase=t/DURATION*Math.PI*2;
  const surge=Math.max(0,1-(t-surgeStart)/2.4);
  monument.position.y=2.62+Math.sin(phase)*0.075;
  monument.rotation.y=autoSpin?Math.sin(phase)*0.16:monument.rotation.y;
  haloGroup.rotation.z=phase;
  particles.rotation.y=phase;
  const pulse=1+Math.sin(phase*3)*0.07+surge*0.9;
  bloom.strength=0.52*pulse;
  heartMesh.material.emissiveIntensity=2.8*pulse;
  w1.material.emissiveIntensity=2.7*pulse;
  w2.material.emissiveIntensity=2.5*pulse;
  rings.forEach((r,i)=>{r.material.emissiveIntensity=(1.6+i*0.1)*(1+Math.sin(phase*2+i)*0.15+surge);});
  echoes.forEach((e,i)=>{e.position.z=-0.20-Math.abs(echoData[i][1])*0.75-surge*0.18;});
}
const clock=new THREE.Clock(); const STEP=1/60; let acc=0,paused=false;
function draw(){controls.update();composer.render();document.getElementById('hud').textContent=`${renderer.info.render.calls} llamadas · ${Math.round(renderer.info.render.triangles/1000)}k triángulos`;}
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),0.1);if(!paused){acc+=dt;while(acc>=STEP){acc-=STEP;simT+=STEP;}sample(simT);}draw();});
window.__seek=(t)=>{paused=true;acc=0;simT=Number.isFinite(Number(t))&&Number(t)>0?Number(t):0;sample(simT);controls.update();composer.render();};
window.__play=()=>{paused=false;clock.getDelta();};
const resizeModel = () => { camera.aspect = width() / height(); camera.updateProjectionMatrix(); renderer.setSize(width(), height()); composer.setSize(width(), height()); };
addEventListener('resize', resizeModel);
if (window.ResizeObserver) new ResizeObserver(resizeModel).observe(mount);
document.getElementById('spin').addEventListener('click',e=>{autoSpin=!autoSpin;e.currentTarget.classList.toggle('active',autoSpin);});
document.getElementById('surge').addEventListener('click',()=>{surgeStart=simT;});
document.getElementById('reset').addEventListener('click',()=>{camera.position.copy(home);controls.target.set(0,2.35,0);controls.update();});
sample(0);draw();const T_PARAM=new URLSearchParams(location.search).get('t');if(T_PARAM!==null)window.__seek(T_PARAM);window.__SCENE_READY__=true;
