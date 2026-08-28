"use strict";
(function(){
if(window.__arbolesGlobalesCargado)return;
window.__arbolesGlobalesCargado=!0;
const p={
overpassUrls:["/arboles","https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter"],overpassTimeoutS:15,alturaMinimaM:2,alturaEstimadaSinDatoM:6,radioCopaPorDefectoM:2.2,maxArbolesEnPantalla:1e3,maxArbolesConSombra:250,loteSombraSize:20,sincroSombraMs:6e4,esperaMoveendMs:500,maxLadoConsultaKm:2.5,cacheCeldasGrados:.01,esperaMapaMs:15e3,alturaPorDefectoEdificioM:8,maxEdificiosEvaluadosPorArbol:12,maxEdificiosCacheMs:8e3
}
,z={
palmera:{
keywords:["phoenix","washingtonia","palma","palm","date palm","datilera"],alturaMediaM:10,radioCopaMedioM:2,forma:"palmera",color:"#7a9b4a"
}
,pino:{
keywords:["pinus","pino","pine","cedrus","cedro","cedar","cipr\xE9s","cypress","cupressus","abeto","fir"],alturaMediaM:14,radioCopaMedioM:3,forma:"conica",color:"#2d5a3d"
}
,encina_roble:{
keywords:["quercus","encina","roble","oak","alcornoque","cork oak","quejigo"],alturaMediaM:10,radioCopaMedioM:6,forma:"ancha_redondeada",color:"#4f7a35"
}
,olivo:{
keywords:["olea","olivo","olive","acebuche"],alturaMediaM:8,radioCopaMedioM:4,forma:"ancha_irregular",color:"#6b8c42"
}
,citrico:{
keywords:["citrus","naranjo","limonero","orange","lemon","mandarino","pomelo"],alturaMediaM:5,radioCopaMedioM:2.8,forma:"redondeada",color:"#5a8a3a"
}
,platanero:{
keywords:["platanus","pl\xE1tano","platano","plane","sicomoro"],alturaMediaM:16,radioCopaMedioM:5.5,forma:"ancha_redondeada",color:"#4a8a3f"
}
,eucalipto:{
keywords:["eucalyptus","eucalipto","gum"],alturaMediaM:18,radioCopaMedioM:3,forma:"oval_alargada",color:"#3d6b4a"
}
,olmo:{
keywords:["ulmus","olmo","elm"],alturaMediaM:12,radioCopaMedioM:5,forma:"ancha_redondeada",color:"#5a8f3d"
}
,chopo:{
keywords:["populus","chopo","poplar","\xE1lamo","alamo"],alturaMediaM:15,radioCopaMedioM:4,forma:"oval_alargada",color:"#4f9a45"
}
,generico:{
alturaMediaM:p.alturaEstimadaSinDatoM,radioCopaMedioM:p.radioCopaPorDefectoM,forma:"redondeada",color:"#7fb069"
}

}
;
function A(u,v){
for(const h of v){
const y=u?.[h];
if(y==null||y==="")continue;
const w=parseFloat(String(y).replace(",","."));
if(!Number.isNaN(w)&&w>0)return w
}
return null
}
function R(){
return new Promise(u=>{
"requestIdleCallback"in window?requestIdleCallback(()=>u(),{
timeout:120
}
):setTimeout(u,0)
}
)
}
(function(){
return new Promise((u,v)=>{
const h=Date.now();
(function y(){
return window.manolitAireMap?u(window.manolitAireMap):Date.now()-h>p.esperaMapaMs?v(new Error('No se ha encontrado window.manolitAireMap \u2014 a\xF1ade "window.manolitAireMap = map;" justo despu\xE9s de crear el mapa en manolit-aire.js')):void setTimeout(y,200)
}
)()
}
)
}
)().then(async function(u){
function v(){
u.getSource("arboles-globales-sombra")||(u.addSource("arboles-globales-sombra",{
type:"geojson",data:turf.featureCollection([])
}
),u.addLayer({
id:"capa-sombra-arboles-globales",type:"fill",source:"arboles-globales-sombra",paint:{
"fill-color":"#0b1220","fill-opacity":.26
}

}
,(function(){
const e=(u.getStyle().layers||[]).find(r=>r.type==="fill-extrusion"&&/building/i.test(r.id));
return e?e.id:void 0
}
)())),u.getSource("arboles-globales-copas")||(u.addSource("arboles-globales-copas",{
type:"geojson",data:turf.featureCollection([])
}
),u.addLayer({
id:"capa-arboles-globales-3d",type:"fill-extrusion",source:"arboles-globales-copas",paint:{
"fill-extrusion-color":["case",["==",["get","tipo"],"tronco"],"#8b5a2b",["==",["get","tipo"],"copa"],["case",["has","color"],["get","color"],["interpolate",["linear"],["get","altura"],3,"#7fb069",8,"#4f8a3d",15,"#2f5d2a"]],"#7fb069"],"fill-extrusion-base":["get","baseM"],"fill-extrusion-height":["get","alturaTotalM"],"fill-extrusion-opacity":.92
}

}
))
}
u.loaded()?v():u.once("load",v);
let h=!0,y=0,w=0;
function J(){
const e=document.getElementById("rsBtnArboles");
return!e||e.dataset.listo==="1"?!1:(e.dataset.listo="1",delete e.dataset.cargando,e.textContent=typeof window.getMessages=="function"&&window.getMessages().treesBtn||"\xC1rboles",e.classList.add("rs-activo"),e.addEventListener("click",async()=>{
if(h=!h,e.classList.toggle("rs-activo",h),["capa-arboles-globales-3d","capa-sombra-arboles-globales"].forEach(r=>{
u.getLayer(r)&&u.setLayoutProperty(r,"visibility",h?"visible":"none")
}
),h){
e.textContent="Cargando \xE1rboles\u2026";
try{
await O(),E()
}
finally{
e.textContent=typeof window.getMessages=="function"&&window.getMessages().treesBtn||"\xC1rboles"
}

}

}
),!0)
}
document.addEventListener("langChanged",()=>{
const e=document.getElementById("rsBtnArboles");
e&&typeof window.getMessages=="function"&&(e.textContent=window.getMessages().treesBtn||"\xC1rboles")
}
),(function e(r){
J()||r>0&&setTimeout(()=>e(r-1),400)
}
)(50);
let N=[];
const j=new Set;
let L=!1,_=null,T=null,D=0,F=null;
function Q(e){
if(F!==null)return F;
try{
const r=(e.getStyle().layers||[]).find(o=>o.type==="fill-extrusion"&&/building/i.test(o.id));
return F=r?r.id:null
}
catch{
return null
}

}
function V(e){
return e?e.type==="Polygon"?e.coordinates:e.type==="MultiPolygon"?e.coordinates[0]:null:null
}
function Z(e,r){
const o=Date.now();
if(_&&T&&o-D<p.maxEdificiosCacheMs&&turf.booleanWithin(turf.bboxPolygon(r),turf.bboxPolygon(T)))return _;
const t=Q(e);
if(!t)return _=[],T=r,D=o,[];
try{
const s=e.queryRenderedFeatures({
layers:[t]
}
),f=(Array.isArray(s)?s:[]).map(n=>{
const i=V(n.geometry),c=parseFloat(n.properties.height||n.properties.render_height)||p.alturaPorDefectoEdificioM;
return i?{
polygon:turf.polygon(i),alturaM:c
}
:null
}
).filter(Boolean);
return _=f,T=r,D=o,f
}
catch{
return _=[],T=r,D=o,[]
}

}
function calcularZonaBloqueoEdificio(e,r,o){
const t=e.alturaM/(1e3*o);
if(!isFinite(t)||t<=0)return null;
const s=e.polygon.geometry.coordinates[0],f=[];
for(let n=0;
n<s.length-1;
n++){
const i=turf.point(s[n]);
f.push(i),f.push(turf.transformTranslate(i,t,r,{units:"kilometers"}))
}
try{
const n=turf.convex(turf.featureCollection(f));
if(n&&n.geometry&&n.geometry.coordinates&&n.geometry.coordinates.length)return n
}
catch{}
return null
}
function X(e,r,o,t,s,f){
if(!s||s.length===0)return e;
let n=e;
for(const i of s){
try{
const c=calcularZonaBloqueoEdificio(i,t,f);
if(!c||!c.geometry)continue;
const l=turf.bbox(n),a=turf.bbox(c);
if(l[0]>a[2]||l[2]<a[0]||l[1]>a[3]||l[3]<a[1])continue;
const d=turf.difference(n,c);
d&&d.geometry&&(n=d)
}
catch{}
}
return n
}
function Y(e){
if(e.type!=="node"||e.lat==null||e.lon==null)return null;
const r=e.tags||{

}
,o=(function(n){
const i=[n.species||"",n["species:es"]||"",n["species:en"]||"",n.genus||"",n.taxon||"",n.name||"",n.leaf_type||""].join(" ").toLowerCase();
for(const[c,l]of Object.entries(z))if(c!=="generico"){
for(const a of l.keywords)if(i.includes(a.toLowerCase()))return{
tipo:c,...l
}

}
return{
tipo:"generico",...z.generico
}

}
)(r),{
altura:t,radioCopaM:s
}
=(function(n,i){
let c=A(n,["height","maxheight"]),l=A(n,["diameter_crown","crown_diameter"]);
if(c==null){
const a=A(n,["circumference","circumference_dbh","dbh"]);
if(a){
const d=i.forma==="conica"?2.8:i.forma==="palmera"?5:2;
c=Math.max(3,a/Math.PI*d)
}
else c=i.alturaMediaM
}
if(l==null){
const a=A(n,["circumference","circumference_dbh","dbh"]);
l=a?a/Math.PI:c*({
palmera:.22,conica:.3,oval_alargada:.32,ancha_redondeada:.75,ancha_irregular:.65,redondeada:.55
}
[i.forma]||.5)
}
return i.forma==="palmera"&&(l=Math.min(l,3.5),c=Math.max(c,6)),{
altura:c,radioCopaM:Math.max(.6,l/2)
}

}
)(r,o);
if(t<=p.alturaMinimaM)return null;
const f=r.species||r["species:es"]||r.genus||o.tipo||"\xC1rbol";
return{
punto:turf.point([e.lon,e.lat]),altura:t,radioCopaM:s,nombre:f,forma:o.forma,color:o.color,tipo:o.tipo
}

}
async function O(){
if(!h||L)return;
const e=u.getBounds();
if((function(o){
return turf.distance(turf.point([o.getWest(),o.getCenter?o.getCenter().lat:(o.getNorth()+o.getSouth())/2]),turf.point([o.getEast(),o.getCenter?o.getCenter().lat:(o.getNorth()+o.getSouth())/2]),{
units:"kilometers"
}
)
}
)(e)>p.maxLadoConsultaKm)return;
const r=(function(o){
const t=p.cacheCeldasGrados,s=[],f=Math.floor(o.getSouth()/t)*t,n=Math.ceil(o.getNorth()/t)*t,i=Math.floor(o.getWest()/t)*t,c=Math.ceil(o.getEast()/t)*t;
for(let l=f;
l<n;
l+=t)for(let a=i;
a<c;
a+=t)s.push(`${
l.toFixed(3)
}


,${
a.toFixed(3)
}


`);
return s
}
)(e).filter(o=>!j.has(o));
if(r.length)if(Date.now()<y)I();
else{
r.forEach(o=>j.add(o)),L=!0;
try{
const o=[e.getSouth(),e.getWest(),e.getNorth(),e.getEast()],t=await(async function(f){
if(Date.now()<y)throw new Error("Overpass en cooldown por errores recientes");
const n=`[out:json][timeout:${
p.overpassTimeoutS
}


];


(node["natural"="tree"](${
f.join(",")
}


);


);


out body;


`;
let i=null;
for(let l=0;
l<p.overpassUrls.length;
l++){
const a=p.overpassUrls[l];
try{
const d=new AbortController,m=setTimeout(()=>d.abort(),1e3*p.overpassTimeoutS+3e3),g=await fetch(a,{
method:"POST",headers:{
"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"
}
,body:"data="+encodeURIComponent(n),signal:d.signal
}
);
if(clearTimeout(m),!g.ok)throw new Error(`HTTP ${
g.status
}


`);
const b=await g.json(),M=b?.osm3s?.timestamp_osm_base;
if(Array.isArray(b?.elements)&&b.elements.length===0&&typeof M=="string"&&M!==""&&!M.includes("T"))throw new Error("Espejo Overpass con datos corruptos");
if(!b||!Array.isArray(b.elements))throw new Error("Respuesta Overpass inv\xE1lida");
return w=0,b
}
catch(d){
i=d,l<p.overpassUrls.length-1&&await new Promise(m=>setTimeout(m,700*(l+1)));
continue
}

}
w++;
const c=Math.min(9e4,4e3*Math.pow(2,w-1));
throw y=Date.now()+c,console.warn(`[arboles-globales] Overpass fall\xF3 ${
w
}


 veces seguidas. Cooldown ${
(c/1e3).toFixed(0)
}


 s.`),i||new Error("Overpass no disponible")
}
)(o),s=t.elements||[];
for(const f of s){
const n=Y(f);
n&&N.push(n),N.length%200==0&&await R()
}

}
catch(o){
console.warn("[arboles-globales] Overpass no disponible ahora mismo:",o.message),r.forEach(t=>j.delete(t))
}
finally{
L=!1
}
I(),(function(o){
clearInterval(H),o&&E(),H=setInterval(E,p.sincroSombraMs)
}
)(!0)
}
else I()
}
function I(){
if(!u.getSource("arboles-globales-copas")||!h)return[];
const e=u.getBounds(),r=N.filter(t=>{
const[s,f]=t.punto.geometry.coordinates;
return s>=e.getWest()&&s<=e.getEast()&&f>=e.getSouth()&&f<=e.getNorth()
}
).slice(0,p.maxArbolesEnPantalla),o=[];
for(const t of r){
const s=t.forma||"redondeada",[f,n]=t.punto.geometry.coordinates;
let i=.35,c=.4,l=.25;
s==="palmera"?(i=.8,c=.15,l=.05):s==="conica"?(i=.45,c=.35,l=.2):s==="oval_alargada"?(i=.5,c=.3,l=.2):s==="ancha_redondeada"?(i=.3,c=.45,l=.25):s==="ancha_irregular"&&(i=.32,c=.43,l=.25);
const a=Math.max(1,t.altura*i),d=t.altura*c,m=(Math.max(.5,t.altura*l),Math.max(.15,t.radioCopaM*(s==="palmera"?.1:.15))),g=turf.circle(t.punto,m/1e3,{
units:"kilometers",steps:8
}
);
g.properties={
altura:t.altura,baseM:0,alturaTotalM:a,nombre:t.nombre,tipo:"tronco",forma:s,color:t.color
}
,o.push(g);
const b=s==="palmera"?.9*t.radioCopaM:t.radioCopaM,M=$(t.punto,b/1e3,s,f,n);
M.properties={
altura:t.altura,baseM:a,alturaTotalM:a+d,nombre:t.nombre,tipo:"copa",forma:s,color:t.color
}
,o.push(M);
const C=s==="palmera"?.8*t.radioCopaM:.65*t.radioCopaM,S=s==="palmera"?"palmera":s==="conica"?"conica":"redondeada",k=$(t.punto,C/1e3,S,f,n+1e-4);
k.properties={
altura:t.altura,baseM:a+d,alturaTotalM:t.altura,nombre:t.nombre,tipo:"copa",forma:s,color:t.color
}
,o.push(k)
}
return u.getSource("arboles-globales-copas").setData(turf.featureCollection(o)),r
}
function G(e,r,o){
const t=43758.5453*Math.sin(12.9898*e+78.233*r+o);
return t-Math.floor(t)
}
function $(e,r,o,t,s){
const f={
palmera:28,conica:14,oval_alargada:18,ancha_redondeada:22,ancha_irregular:26,redondeada:18
}
[o]||18,n=[];
for(let i=0;
i<f;
i++){
const c=360*i/f,l=c*Math.PI/180;
let a=1;
switch(o){
case"ancha_redondeada":a=1+.22*Math.cos(2*l);
break;
case"ancha_irregular":a=.92+.28*Math.cos(2*l)+.18*G(t,s,i+50);
break;
case"conica":a=.82+.12*Math.cos(2*l);
break;
case"oval_alargada":a=.88+.18*Math.cos(2*l);
break;
case"palmera":a=i%4==0?1.55:.72
}
a*=.82+.3*G(t,s,i);
const d=Math.max(1e-6,r*a),m=turf.transformTranslate(e,d,c,{
units:"kilometers"
}
).geometry.coordinates;
n.push(m)
}
return n.push(n[0]),turf.polygon([n])
}
function q(e,r){
try{
const o=turf.union(turf.featureCollection([e,r]));
if(o)return o
}
catch{

}
try{
const o=turf.union(e,r);
if(o)return o
}
catch{

}
return e
}
function ee(e,r,o,t,s){
const f=e.forma||"redondeada",n=(o+90)%360,i=Math.max(e.radioCopaM*(f==="palmera"?.08:.12),.25)/1e3,c=e.radioCopaM/1e3,[l,a]=e.punto.geometry.coordinates,d=turf.transformTranslate(e.punto,r,o,{
units:"kilometers"
}
),m=$(d,f==="palmera"?.85*c:c,f,l,a);
let g;
if(f==="palmera")g=q(m,turf.circle(e.punto,i,{
units:"kilometers",steps:8
}
));
else{
const b=turf.transformTranslate(e.punto,i,n,{
units:"kilometers"
}
).geometry.coordinates,M=turf.transformTranslate(e.punto,i,(n+180)%360,{
units:"kilometers"
}
).geometry.coordinates,C={
ancha_redondeada:.9,ancha_irregular:.85,redondeada:.75,conica:.55,oval_alargada:.6
}
[f]||.75,S=turf.transformTranslate(d,c*C,n,{
units:"kilometers"
}
).geometry.coordinates,k=turf.transformTranslate(d,c*C,(n+180)%360,{
units:"kilometers"
}
).geometry.coordinates;
let B;
try{
B=turf.polygon([[b,S,k,M,b]])
}
catch{
return m
}
const x=turf.circle(e.punto,i,{
units:"kilometers",steps:8
}
);
g=q(q(B,m),x)
}
return t&&s?X(g,e,r,o,t,s):g
}
let U=0;
async function E(){
if(!u.getSource("arboles-globales-sombra")||!h)return;
if(!(function(){
const a=document.getElementById("rsToggleSombras");
return!a||a.checked
}
)())return void u.getSource("arboles-globales-sombra").setData(turf.featureCollection([]));
const e=++U,r=(function(a){
if(typeof window.manolitAireCentroSol=="function")try{
const m=window.manolitAireCentroSol();
if(m&&typeof m.lat=="number"&&typeof m.lon=="number")return m
}
catch{

}
const d=a.getCenter();
return{
lat:d.lat,lon:d.lng
}

}
)(u),o=SunCalc.getPosition((function(){
if(typeof window.manolitAireHoraEfectiva=="function")try{
const a=window.manolitAireHoraEfectiva();
if(a instanceof Date&&!isNaN(a))return a
}
catch{

}
return new Date
}
)(),r.lat,r.lon);
if(o.altitude<=0)return void u.getSource("arboles-globales-sombra").setData(turf.featureCollection([]));
const t=(180*o.azimuth/Math.PI+180+180)%360,s=I().slice(0,p.maxArbolesConSombra),f=Math.tan(o.altitude);
if(!f)return;
const n=u.getBounds(),i=[n.getWest(),n.getSouth(),n.getEast(),n.getNorth()],c=Z(u,i),l=[];
for(let a=0;
a<s.length;
a+=p.loteSombraSize){
if(e!==U)return;
const d=s.slice(a,a+p.loteSombraSize);
for(const m of d){
const g=m.altura/f;
if(!isFinite(g)||g<=0)continue;
const b=ee(m,g/1e3,t,c,f);
b&&l.push(b)
}
if(e!==U)return;
u.getSource("arboles-globales-sombra")?.setData(turf.featureCollection(l)),a+p.loteSombraSize<s.length&&await R()
}

}
let H=null,K=null;
u.on("moveend",()=>{
clearTimeout(K),K=setTimeout(()=>{
O(),E()
}
,p.esperaMoveendMs)
}
),window.manolitAireRecalcularArboles=E,await O(),E()
}
).catch(u=>console.warn("[arboles-globales]",u.message))
}
)();
