const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score'),bestEl=document.getElementById('best'),nextEl=document.getElementById('next'),over=document.getElementById('over'),finalEl=document.getElementById('final');
const fruits=[
 {e:'🍒',r:22,s:10,c:'#ff5b7f'}, {e:'🍓',r:28,s:25,c:'#ff4b63'}, {e:'🍊',r:36,s:55,c:'#ff9f3f'}, {e:'🍋',r:44,s:110,c:'#ffd84d'},
 {e:'🍏',r:54,s:220,c:'#7de26f'}, {e:'🫐',r:66,s:430,c:'#6d7cff'}, {e:'🍑',r:80,s:820,c:'#ff9fb4'}, {e:'🍍',r:96,s:1600,c:'#ffc74f'}, {e:'🍉',r:116,s:3200,c:'#42c96f'}
];
let W=720,H=920,balls=[],score=0,next=0,dropX=W/2,canDrop=true,state='play',danger=0,last=0;
const bestKey='merge-mania-best-v1';
function best(){return +(localStorage.getItem(bestKey)||0)}function saveBest(){if(score>best())localStorage.setItem(bestKey,Math.floor(score))}
function pick(){return Math.random()<.55?0:Math.random()<.78?1:Math.random()<.92?2:3}
function reset(){balls=[];score=0;next=pick();dropX=W/2;canDrop=true;state='play';danger=0;over.classList.remove('show');updateHud()}
function updateHud(){scoreEl.textContent=Math.floor(score).toLocaleString('ru-RU');bestEl.textContent=best().toLocaleString('ru-RU');nextEl.textContent=fruits[next].e}
function drop(){if(!canDrop||state!=='play')return;const f=fruits[next];balls.push({x:dropX,y:78,vx:0,vy:0,l:next,r:f.r,merge:0});next=pick();canDrop=false;setTimeout(()=>canDrop=true,330);updateHud()}
function merge(a,b){const level=Math.min(a.l+1,fruits.length-1);a.dead=b.dead=true;const f=fruits[level];balls.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,vx:(a.vx+b.vx)/2,vy:-60,l:level,r:f.r,merge:.12});score+=f.s;pop(a.x,a.y,`+${f.s}`);updateHud()}
function pop(x,y,t){ctx.save();ctx.fillStyle='#24180d';ctx.font='900 26px Inter';ctx.textAlign='center';ctx.fillText(t,x,y);ctx.restore()}
function step(dt){if(state!=='play')return;for(const b of balls){b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=.995;if(b.x-b.r<34){b.x=34+b.r;b.vx=Math.abs(b.vx)*.55}if(b.x+b.r>W-34){b.x=W-34-b.r;b.vx=-Math.abs(b.vx)*.55}if(b.y+b.r>H-34){b.y=H-34-b.r;b.vy=-Math.abs(b.vy)*.35;b.vx*=.86}if(b.merge>0)b.merge-=dt}
 for(let k=0;k<3;k++)for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j];if(a.dead||b.dead)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,min=a.r+b.r;if(d<min){if(a.l===b.l&&a.merge<=0&&b.merge<=0&&d<min*.98){merge(a,b);continue}let push=(min-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*push;b.x+=nx*push;a.y-=ny*push;b.y+=ny*push;let rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){let imp=-rv*.45;a.vx-=nx*imp;b.vx+=nx*imp;a.vy-=ny*imp;b.vy+=ny*imp}}}
 balls=balls.filter(b=>!b.dead);const high=balls.some(b=>b.y-b.r<145&&Math.abs(b.vy)<35);danger=high?danger+dt:Math.max(0,danger-dt*2);if(danger>2.4)end()}
function end(){state='over';saveBest();finalEl.textContent=`${Math.floor(score).toLocaleString('ru-RU')} очков`;over.classList.add('show');updateHud()}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff7cf';ctx.fillRect(0,0,W,H);ctx.fillStyle='#9ee8ff';ctx.fillRect(0,0,W,115);ctx.strokeStyle='#ff5b5b';ctx.lineWidth=5;ctx.setLineDash([16,12]);ctx.beginPath();ctx.moveTo(34,145);ctx.lineTo(W-34,145);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#24180d';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(34,90);ctx.lineTo(34,H-30);ctx.lineTo(W-34,H-30);ctx.lineTo(W-34,90);ctx.stroke();ctx.strokeStyle='#24180d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(dropX,22);ctx.lineTo(dropX,72);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(dropX,72,fruits[next].r*.72,0,Math.PI*2);ctx.fill();ctx.font=`${fruits[next].r}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fruits[next].e,dropX,74);
 for(const b of balls){ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle=fruits[b.l].c;ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#24180d';ctx.stroke();ctx.font=`${b.r*1.12}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fruits[b.l].e,0,2);ctx.restore()}if(danger>0){ctx.fillStyle=`rgba(255,91,91,${Math.min(.35,danger/7)})`;ctx.fillRect(0,0,W,H)}}
function loop(t=0){let dt=Math.min(.033,(t-last)/1000||.016);last=t;step(dt);draw();requestAnimationFrame(loop)}
function setX(clientX){const rect=canvas.getBoundingClientRect();dropX=Math.max(60,Math.min(W-60,(clientX-rect.left)/rect.width*W))}
canvas.addEventListener('pointermove',e=>setX(e.clientX));canvas.addEventListener('pointerdown',e=>{setX(e.clientX);drop()});document.getElementById('restart').onclick=reset;document.getElementById('again').onclick=reset;addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')dropX-=34;if(e.key==='ArrowRight'||e.key==='d')dropX+=34;if(e.key===' '||e.key==='Enter')drop();dropX=Math.max(60,Math.min(W-60,dropX))});
reset();loop();
