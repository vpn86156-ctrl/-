const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const nextEl = document.getElementById('next');
const over = document.getElementById('over');
const finalEl = document.getElementById('final');

const W = 720;
const H = 920;
const bestKey = 'merge-mania-best-v2';
const fruits = [
  { e: '🍒', r: 22, s: 10, c: '#ff5b7f' },
  { e: '🍓', r: 28, s: 25, c: '#ff4b63' },
  { e: '🍊', r: 36, s: 55, c: '#ff9f3f' },
  { e: '🍋', r: 44, s: 110, c: '#ffd84d' },
  { e: '🍏', r: 54, s: 220, c: '#7de26f' },
  { e: '🫐', r: 66, s: 430, c: '#6d7cff' },
  { e: '🍑', r: 80, s: 820, c: '#ff9fb4' },
  { e: '🍍', r: 96, s: 1600, c: '#ffc74f' },
  { e: '🍉', r: 116, s: 3200, c: '#42c96f' }
];

let balls = [];
let fx = [];
let score = 0;
let next = 0;
let dropX = W / 2;
let canDrop = true;
let state = 'play';
let danger = 0;
let last = 0;
let shake = 0;
let mergeStreak = 0;
let mergeTimer = 0;
let audio;

function best() { return +(localStorage.getItem(bestKey) || 0); }
function saveBest() { if (score > best()) localStorage.setItem(bestKey, Math.floor(score)); }
function fmt(n) { return Math.floor(n).toLocaleString('ru-RU'); }
function pick() { return Math.random() < .56 ? 0 : Math.random() < .78 ? 1 : Math.random() < .93 ? 2 : 3; }
function beep(freq = 440, duration = .045, gain = .025) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = freq;
    o.type = 'triangle';
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + duration);
  } catch {}
}

function reset() {
  balls = [];
  fx = [];
  score = 0;
  next = pick();
  dropX = W / 2;
  canDrop = true;
  state = 'play';
  danger = 0;
  shake = 0;
  mergeStreak = 0;
  mergeTimer = 0;
  over.classList.remove('show');
  updateHud();
}

function updateHud() {
  scoreEl.textContent = fmt(score);
  bestEl.textContent = fmt(best());
  nextEl.textContent = fruits[next].e;
}

function drop() {
  if (!canDrop || state !== 'play') return;
  const f = fruits[next];
  balls.push({ x: dropX, y: 78, vx: 0, vy: 0, l: next, r: f.r, merge: .05, born: .12 });
  next = pick();
  canDrop = false;
  setTimeout(() => { canDrop = true; }, 260);
  beep(280, .035, .018);
  updateHud();
}

function addFx(type, data) { fx.push({ type, life: data.life || .75, max: data.life || .75, ...data }); }
function burst(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 260;
    addFx('particle', { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 2 + Math.random() * 5, color, life: .35 + Math.random() * .45 });
  }
}
function text(x, y, value, color = '#24180d') { addFx('text', { x, y, value, color, life: .9 }); }
function ring(x, y, color, radius) { addFx('ring', { x, y, color, radius, life: .45 }); }

function merge(a, b) {
  const level = Math.min(a.l + 1, fruits.length - 1);
  const f = fruits[level];
  a.dead = true;
  b.dead = true;
  mergeStreak = mergeTimer > 0 ? mergeStreak + 1 : 1;
  mergeTimer = 1.15;
  const mult = 1 + Math.min(2.5, (mergeStreak - 1) * .18);
  const gained = Math.floor(f.s * mult);
  balls.push({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    vx: (a.vx + b.vx) / 2,
    vy: -90 - Math.min(90, mergeStreak * 7),
    l: level,
    r: f.r,
    merge: .16,
    born: .2
  });
  score += gained;
  shake = Math.min(14, 4 + level * .8);
  burst((a.x + b.x) / 2, (a.y + b.y) / 2, f.c, 12 + level * 3);
  ring((a.x + b.x) / 2, (a.y + b.y) / 2, f.c, f.r + 16);
  text(a.x, a.y, `${mergeStreak > 1 ? 'x' + mergeStreak + ' ' : ''}+${gained}`, f.c);
  beep(360 + level * 70, .055, .026);
  updateHud();
}

function step(dt) {
  if (state !== 'play') return;
  mergeTimer = Math.max(0, mergeTimer - dt);
  if (mergeTimer <= 0) mergeStreak = 0;

  for (const b of balls) {
    b.vy += 900 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vx *= .995;
    if (b.x - b.r < 34) { b.x = 34 + b.r; b.vx = Math.abs(b.vx) * .52; }
    if (b.x + b.r > W - 34) { b.x = W - 34 - b.r; b.vx = -Math.abs(b.vx) * .52; }
    if (b.y + b.r > H - 34) { b.y = H - 34 - b.r; b.vy = -Math.abs(b.vy) * .32; b.vx *= .84; }
    if (b.merge > 0) b.merge -= dt;
    if (b.born > 0) b.born -= dt;
  }

  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        if (a.dead || b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const min = a.r + b.r;
        if (d < min) {
          if (a.l === b.l && a.merge <= 0 && b.merge <= 0 && d < min * 1.02) { merge(a, b); continue; }
          const nx = dx / d, ny = dy / d;
          const push = (min - d) / 2;
          a.x -= nx * push; b.x += nx * push; a.y -= ny * push; b.y += ny * push;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const imp = -rv * .46;
            a.vx -= nx * imp; b.vx += nx * imp; a.vy -= ny * imp; b.vy += ny * imp;
          }
        }
      }
    }
    balls = balls.filter(b => !b.dead);
  }

  const high = balls.some(b => b.y - b.r < 145 && Math.abs(b.vy) < 35 && b.born <= 0);
  danger = high ? danger + dt : Math.max(0, danger - dt * 2.2);
  if (danger > 2.5) end();

  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    f.life -= dt;
    if (f.type === 'particle') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 220 * dt; f.vx *= .96; }
    if (f.type === 'text') f.y -= 62 * dt;
    if (f.life <= 0) fx.splice(i, 1);
  }
  if (fx.length > 160) fx.splice(0, fx.length - 160);
}

function end() {
  state = 'over';
  saveBest();
  finalEl.textContent = `${fmt(score)} очков`;
  over.classList.add('show');
  updateHud();
}

function fruitAt(x, y, b, preview = false) {
  const f = fruits[b.l ?? next];
  const scale = b.born > 0 ? 1 + b.born * 1.4 : 1;
  const r = (b.r || f.r) * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = preview ? .78 : 1;
  ctx.fillStyle = 'rgba(36,24,13,.16)';
  ctx.beginPath(); ctx.ellipse(0, r * .65, r * .78, r * .22, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(-r * .35, -r * .45, r * .1, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.23, f.c); g.addColorStop(1, f.c);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#24180d'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(-r * .32, -r * .38, r * .18, 0, Math.PI * 2); ctx.fill();
  ctx.font = `${r * 1.08}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.e, 0, 2);
  ctx.restore();
}

function drawFx() {
  for (const f of fx) {
    const a = Math.max(0, f.life / f.max);
    ctx.save(); ctx.globalAlpha = a;
    if (f.type === 'particle') { ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    if (f.type === 'ring') { ctx.strokeStyle = f.color; ctx.lineWidth = 5 * a; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * (1.7 - a), 0, Math.PI * 2); ctx.stroke(); }
    if (f.type === 'text') { ctx.fillStyle = f.color; ctx.font = '900 28px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(f.value, f.x, f.y); ctx.fillText(f.value, f.x, f.y); }
    ctx.restore();
  }
}

function draw() {
  ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .86; }
  ctx.clearRect(-40, -40, W + 80, H + 80);
  ctx.fillStyle = '#fff7cf'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#9ee8ff'; ctx.fillRect(0, 0, W, 115);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((i * 97 + performance.now() * .012) % W, 34 + (i % 3) * 24, 16 + (i % 2) * 8, 0, Math.PI * 2); ctx.fill(); }

  ctx.strokeStyle = '#ff5b5b'; ctx.lineWidth = 5; ctx.setLineDash([16, 12]);
  ctx.beginPath(); ctx.moveTo(34, 145); ctx.lineTo(W - 34, 145); ctx.stroke(); ctx.setLineDash([]);
  if (danger > 0) { ctx.fillStyle = `rgba(255,91,91,${Math.min(.35, danger / 6)})`; ctx.fillRect(0, 0, W, 145); }

  ctx.fillStyle = '#f2c46d'; ctx.fillRect(34, H - 34, W - 68, 18);
  ctx.strokeStyle = '#24180d'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(34, 90); ctx.lineTo(34, H - 30); ctx.lineTo(W - 34, H - 30); ctx.lineTo(W - 34, 90); ctx.stroke();

  ctx.strokeStyle = 'rgba(36,24,13,.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(dropX, 20); ctx.lineTo(dropX, H - 34); ctx.stroke();
  fruitAt(dropX, 72, { l: next, r: fruits[next].r * .72 }, true);

  for (const b of balls) fruitAt(b.x, b.y, b);
  drawFx();

  if (mergeTimer > 0 && mergeStreak > 1) {
    ctx.fillStyle = '#ff8a34'; ctx.font = '900 34px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeText(`CHAIN x${mergeStreak}`, W / 2, 132); ctx.fillText(`CHAIN x${mergeStreak}`, W / 2, 132);
  }
  ctx.restore();
}

function loop(t = 0) { const dt = Math.min(.033, (t - last) / 1000 || .016); last = t; step(dt); draw(); requestAnimationFrame(loop); }
function setX(clientX) { const rect = canvas.getBoundingClientRect(); dropX = Math.max(60, Math.min(W - 60, (clientX - rect.left) / rect.width * W)); }

canvas.addEventListener('pointermove', e => setX(e.clientX));
canvas.addEventListener('pointerdown', e => { setX(e.clientX); drop(); });
document.getElementById('restart').onclick = reset;
document.getElementById('again').onclick = reset;
addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') dropX -= 34; if (e.key === 'ArrowRight' || e.key === 'd') dropX += 34; if (e.key === ' ' || e.key === 'Enter') drop(); dropX = Math.max(60, Math.min(W - 60, dropX)); });

reset();
loop();
