'use strict';
const $ = id => document.getElementById(id);
const N=24, SIZE=N**3, L=8, H=L/N;
const vector=()=>[new Float32Array(SIZE),new Float32Array(SIZE),new Float32Array(SIZE)];
let B=vector(), V=vector(), nextB=vector(), nextV=vector();
const neighbors=Array.from({length:6},()=>new Int32Array(SIZE));
const coords=vector();
const index=(x,y,z)=>((z+N)%N*N+(y+N)%N)*N+(x+N)%N;
for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 const i=index(x,y,z);coords[0][i]=x*H-L/2;coords[1][i]=y*H-L/2;coords[2][i]=z*H-L/2;
 [index(x+1,y,z),index(x-1,y,z),index(x,y+1,z),index(x,y-1,z),index(x,y,z+1),index(x,y,z-1)].forEach((v,k)=>neighbors[k][i]=v);
}
const [xp,xm,yp,ym,zp,zm]=neighbors;
function hopf(x,y,z){const a=1.15;x/=a;y/=a;z/=a;const d=3/(1+x*x+y*y+z*z)**3;return [d*2*(x*z-y),d*2*(y*z+x),d*(1-x*x-y*y+z*z)];}
function sample(f,x,y,z){
 x=((x+L/2)/H%N+N)%N;y=((y+L/2)/H%N+N)%N;z=((z+L/2)/H%N+N)%N;
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
 const out=[0,0,0];
 for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
  const i=index(ix+dx,iy+dy,iz+dz),w=(dx?fx:1-fx)*(dy?fy:1-fy)*(dz?fz:1-fz);
  for(let c=0;c<3;c++)out[c]+=w*f[c][i];
 }return out;
}
let pressure=new Float32Array(SIZE), temp=new Float32Array(SIZE), divergence=new Float32Array(SIZE);
function project(f){
 pressure.fill(0);
 // Forward divergence and backward gradient compose the seven-point Laplacian.
 for(let i=0;i<SIZE;i++)divergence[i]=(f[0][xp[i]]-f[0][i]+f[1][yp[i]]-f[1][i]+f[2][zp[i]]-f[2][i])/H;
 for(let k=0;k<36;k++){
  for(let i=0;i<SIZE;i++)temp[i]=(pressure[xp[i]]+pressure[xm[i]]+pressure[yp[i]]+pressure[ym[i]]+pressure[zp[i]]+pressure[zm[i]]-H*H*divergence[i])/6;
  [pressure,temp]=[temp,pressure];
 }
 for(let i=0;i<SIZE;i++){f[0][i]-=(pressure[i]-pressure[xm[i]])/H;f[1][i]-=(pressure[i]-pressure[ym[i]])/H;f[2][i]-=(pressure[i]-pressure[zm[i]])/H;}
}
let t=0, running=false, analytic=true, dirty=true, traces=[], history=[], ticks=0;
function reset(){
 t=0;ticks=0;analytic=true;running=false;B=vector();V=vector();history=[];
 for(let i=0;i<SIZE;i++){
  const x=coords[0][i],y=coords[1][i],z=coords[2][i],b=hopf(x,y,z);
  for(let c=0;c<3;c++){B[c][i]=b[c];V[c][i]=$('initial').value==='aligned'?b[c]:0;}
  if($('initial').value==='swirl'){const a=Math.exp(-(x*x+y*y+z*z)/3);V[0][i]=-y*a;V[1][i]=x*a;}
 }
 dirty=true;updateState();diagnostics();
}
function simulate(){
 if(analytic){project(B);project(V);analytic=false;}
 let max=0;for(let i=0;i<SIZE;i++)max=Math.max(max,Math.hypot(V[0][i],V[1][i],V[2][i])+Math.hypot(B[0][i],B[1][i],B[2][i]));
 const eta=+$('eta').value,nu=+$('nu').value,dt=Math.min(.018,.18*H/(max+.001),.12*H*H/Math.max(eta,nu,.001));
 for(let i=0;i<SIZE;i++){
  const x=coords[0][i]-dt*V[0][i],y=coords[1][i]-dt*V[1][i],z=coords[2][i]-dt*V[2][i];
  const vb=sample(V,x,y,z),bb=sample(B,x,y,z);
  for(let c=0;c<3;c++){
   let stretch=0,tension=0,lapV=0,lapB=0;
   for(let d=0;d<3;d++){
    const p=neighbors[d*2][i],m=neighbors[d*2+1][i];
    stretch+=B[d][i]*(V[c][p]-V[c][m])/(2*H);tension+=B[d][i]*(B[c][p]-B[c][m])/(2*H);
    lapV+=(V[c][p]+V[c][m]-2*V[c][i])/(H*H);lapB+=(B[c][p]+B[c][m]-2*B[c][i])/(H*H);
   }
   nextV[c][i]=vb[c]+dt*(tension+nu*lapV);nextB[c][i]=bb[c]+dt*(stretch+eta*lapB);
  }
 }
 [B,nextB]=[nextB,B];[V,nextV]=[nextV,V];project(V);project(B);t+=dt;ticks++;dirty=true;
 if(ticks%4===0)diagnostics();
}
function kick(){
 for(let i=0;i<SIZE;i++){
  const x=coords[0][i]-.65,y=coords[1][i],z=coords[2][i],a=1.8*Math.exp(-(x*x+y*y+z*z)/1.5);
  V[0][i]+=-z*a;V[2][i]+=x*a;
 }project(V);diagnostics();
}
function diagnostics(){
 let eb=0,ev=0;for(let i=0;i<SIZE;i++)for(let c=0;c<3;c++){eb+=B[c][i]**2;ev+=V[c][i]**2;}
 eb*=.5*H**3;ev*=.5*H**3;
 if(!Number.isFinite(eb+ev)){running=false;$('status').textContent='NUMERICAL LIMIT · RESET';$('play').textContent='▶ Evolve';return;}
 $('magnetic').textContent=eb.toFixed(3);$('kinetic').textContent=ev.toFixed(3);
 history.push([eb,ev]);if(history.length>160)history.shift();
 const cv=$('energy'),ctx=cv.getContext('2d');cv.width=Math.round(cv.clientWidth*devicePixelRatio);cv.height=65*devicePixelRatio;
 const max=Math.max(.01,...history.flat());ctx.clearRect(0,0,cv.width,cv.height);
 ['#6fe4d5','#eb9edb'].forEach((color,c)=>{ctx.strokeStyle=color;ctx.lineWidth=1.5*devicePixelRatio;ctx.beginPath();history.forEach((e,i)=>{const x=i/159*cv.width,y=cv.height-5-e[c]/max*(cv.height-10);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();});
}
function field(p){return analytic?hopf(...p):sample(B,...p);}
function direction(p){const b=field(p),n=Math.hypot(...b);return n<1e-7?null:b.map(v=>v/n);}
function trace(){
 traces=[];const count=+$('lines').value;
 for(let k=0;k<count;k++){
  const phi=k*2.39996323,r=.55+1.05*((k%12)/11),seed=[r*Math.cos(phi),r*Math.sin(phi),0];
  let p=seed.slice(),points=[p];
  for(let j=0;j<470;j++){
   const d=direction(p);if(!d)break;const mid=p.map((v,c)=>v+.035*d[c]),d2=direction(mid);if(!d2)break;
   p=p.map((v,c)=>v+.07*d2[c]);if(p.some(v=>Math.abs(v)>3.85))break;points.push(p);
   if(j>35&&Math.hypot(...p.map((v,c)=>v-seed[c]))<.065){points.push(seed);break;}
  }
  traces.push({points,color:`hsl(${165+k/count*155},80%,70%)`});
 }dirty=false;
}
const canvas=$('view'),ctx=canvas.getContext('2d'),rotation=new ViewRotation();let w=0,h=0,zoom=.68,drag=null;
function resize(){const rect=canvas.getBoundingClientRect();w=rect.width;h=rect.height;canvas.width=w*Math.min(2,devicePixelRatio);canvas.height=h*Math.min(2,devicePixelRatio);ctx.setTransform(Math.min(2,devicePixelRatio),0,0,Math.min(2,devicePixelRatio),0,0);}
new ResizeObserver(resize).observe(canvas);
function screen(p){const [x,z,depth]=rotation.apply(p),s=Math.min(w,h)*.24*zoom*8/(8+depth);return [w/2+x*s,h/2-z*s,depth];}
function render(now){
 ctx.clearRect(0,0,w,h);
 // A quiet reference floor and coordinate triad help reveal the orbit.
 ctx.lineWidth=.6;ctx.strokeStyle='#25374a';ctx.globalAlpha=.4;
 for(let a=-3;a<=3;a++){for(const pair of [[[a,-3,-2.2],[a,3,-2.2]],[[-3,a,-2.2],[3,a,-2.2]]]){const p=screen(pair[0]),q=screen(pair[1]);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}}
 ctx.globalAlpha=1;
 for(const line of traces){
  const pts=line.points.map(screen);ctx.strokeStyle=line.color;ctx.lineWidth=1.15;ctx.globalAlpha=.65;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
  if(pts.length){const p=pts[Math.floor(now*.018)%pts.length];ctx.globalAlpha=.95;ctx.fillStyle=line.color;ctx.beginPath();ctx.arc(p[0],p[1],2,0,Math.PI*2);ctx.fill();}
 }
 ctx.globalAlpha=1;
 $('time').textContent=`t = ${t.toFixed(3)}`;
}
function updateState(){$('play').textContent=running?'Ⅱ Pause':'▶ Evolve';$('status').textContent=running?'EVOLVING':analytic?'INITIAL HOPF FIELD':'PAUSED';}
$('play').onclick=()=>{running=!running;updateState();};$('reset').onclick=reset;$('kick').onclick=kick;$('step').onclick=()=>{running=false;simulate();diagnostics();updateState();};
for(const id of ['eta','nu','speed','lines']){const update=()=>{$(id+'Out').value=id==='speed'?$('speed').value+'×':$(id).value;if(id==='lines')dirty=true;};$(id).oninput=update;update();}
canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!drag)return;rotation.drag(e.clientX-drag[0],e.clientY-drag[1],e.shiftKey);drag=[e.clientX,e.clientY];};
canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>drag=null;
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.4,Math.min(2.6,zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
window.onkeydown=e=>{if(['INPUT','SELECT','BUTTON','SUMMARY'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('play').click();}if(e.key.toLowerCase()==='r')reset();};
let last=0,lastTrace=0;
function frame(now){
 const elapsed=Math.min(50,now-last);last=now;
 if(running){for(let s=0;s<+$('speed').value;s++){simulate();if(!running)break;}updateState();}
 if(dirty&&(now-lastTrace>90||!running)){trace();lastTrace=now;}
 if($('rotate').checked&&!drag)rotation.orbit(elapsed*.00009);
 render(now);requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
