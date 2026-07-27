const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const comboEl = document.getElementById('combo');
const bestEl = document.getElementById('best');
const menu = document.getElementById('menu');
const result = document.getElementById('result');
const resultText = document.getElementById('resultText');
const resultTitle = document.getElementById('resultTitle');

let W = 0, H = 0, DPR = 1, last = 0, raf = 0;
let state = 'menu';
const keys = new Set();
const touchKeys = new Set();
const bestKey = 'neon-courier-best-v1';
const world = { w: 2600, h: 2600, blocks: [], roads: [] };
let game;

function rnd(a, b) { return Math.random() * (b - a) + a; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function best() { return +(localStorage.getItem(bestKey) || 0); }
function saveBest(v) { if (v > best()) localStorage.setItem(bestKey, Math.floor(v)); bestEl.textContent = best().toLocaleString('ru-RU'); }
function onRoad(x, y) { return Math.abs((x % 420) - 210) < 64 || Math.abs((y % 420) - 210) < 64; }
function roadPoint() { let x, y; do { x = rnd(120, world.w - 120); y = rnd(120, world.h - 120); } while (!onRoad(x, y)); return { x, y }; }

function makeWorld() {
  world.blocks.length = 0;
  for (let x = 70; x < world.w - 180; x += 420) {
    for (let y = 70; y < world.h - 180; y += 420) {
      world.blocks.push({ x, y, w: 250, h: 250, c: Math.random() < .5 ? '#10172c' : '#121933' });
    }
  }
}

function reset() {
  makeWorld();
  const p = roadPoint();
  game = {
    score: 0,
    time: 90,
    combo: 1,
    comboTimer: 0,
    carrying: false,
    delivery: roadPoint(),
    package: roadPoint(),
    message: 'Забери посылку!',
    msgTime: 2,
    shake: 0,
    policeSpawn: 0,
    trafficSpawn: 0,
    nitro: 100,
    particles: [],
    police: [],
    traffic: [],
    car: { x: p.x, y: p.y, a: -Math.PI / 2, v: 0, r: 16 }
  };
  for (let i = 0; i < 5; i++) spawnTraffic();
}

function resize() {
  DPR = Math.min(devicePixelRatio || 1, 1.25);
  W = innerWidth; H = innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function spawnPolice() {
  const c = game.car;
  const side = Math.floor(rnd(0, 4));
  const d = 520;
  const p = side === 0 ? { x: c.x + rnd(-d, d), y: c.y - d } : side === 1 ? { x: c.x + d, y: c.y + rnd(-d, d) } : side === 2 ? { x: c.x + rnd(-d, d), y: c.y + d } : { x: c.x - d, y: c.y + rnd(-d, d) };
  game.police.push({ x: clamp(p.x, 30, world.w - 30), y: clamp(p.y, 30, world.h - 30), a: 0, v: rnd(80, 125), hit: 0 });
}
function spawnTraffic() {
  const p = roadPoint();
  const horizontal = Math.abs((p.y % 420) - 210) < 64;
  game.traffic.push({ x: p.x, y: p.y, a: horizontal ? 0 : Math.PI / 2, v: rnd(60, 120), r: 18, c: Math.random() < .5 ? '#ff45c7' : '#ffe36d' });
}
function burst(x, y, c, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(40, 210);
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.25, .8), c });
  }
  if (game.particles.length > 90) game.particles.splice(0, game.particles.length - 90);
}
function flash(msg) { game.message = msg; game.msgTime = 1.8; }

function hitBlock(x, y, r = 14) {
  return world.blocks.find(b => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h);
}
function drawCar(x, y, a, color, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.fillRect(-12 * scale, -22 * scale, 24 * scale, 44 * scale); ctx.strokeRect(-12 * scale, -22 * scale, 24 * scale, 44 * scale);
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-7 * scale, -14 * scale, 14 * scale, 10 * scale);
  ctx.fillStyle = '#5de8ff'; ctx.fillRect(-8 * scale, 17 * scale, 16 * scale, 4 * scale);
  ctx.restore();
}

function update(dt) {
  if (state !== 'play') return;
  const c = game.car;
  game.time -= dt;
  game.comboTimer -= dt;
  game.msgTime -= dt;
  game.nitro = Math.min(100, game.nitro + dt * 16);
  if (game.comboTimer <= 0) game.combo = Math.max(1, game.combo - dt * .65);

  const left = keys.has('arrowleft') || keys.has('a') || touchKeys.has('left');
  const right = keys.has('arrowright') || keys.has('d') || touchKeys.has('right');
  const gas = keys.has('arrowup') || keys.has('w') || touchKeys.has('up');
  const brake = keys.has('arrowdown') || keys.has('s');
  const nitro = (keys.has(' ') || touchKeys.has('nitro')) && game.nitro > 1;

  const steer = (right ? 1 : 0) - (left ? 1 : 0);
  c.a += steer * dt * (2.7 + Math.min(1, Math.abs(c.v) / 230));
  c.v += (gas ? 360 : 120) * dt;
  if (brake) c.v -= 430 * dt;
  if (nitro) { c.v += 620 * dt; game.nitro -= 55 * dt; burst(c.x - Math.cos(c.a) * 18, c.y - Math.sin(c.a) * 18, '#5de8ff', 2); }
  c.v *= Math.pow(onRoad(c.x, c.y) ? .988 : .965, dt * 60);
  c.v = clamp(c.v, -120, nitro ? 520 : 390);
  const oldX = c.x, oldY = c.y;
  c.x += Math.sin(c.a) * c.v * dt;
  c.y -= Math.cos(c.a) * c.v * dt;
  c.x = clamp(c.x, 24, world.w - 24); c.y = clamp(c.y, 24, world.h - 24);
  if (hitBlock(c.x, c.y, c.r)) { c.x = oldX; c.y = oldY; c.v *= -.32; game.shake = 9; burst(c.x, c.y, '#ff4e66', 12); }

  const target = game.carrying ? game.delivery : game.package;
  const dTarget = Math.hypot(c.x - target.x, c.y - target.y);
  if (dTarget < 38) {
    if (!game.carrying) { game.carrying = true; game.delivery = roadPoint(); flash('Посылка в машине — доставь!'); burst(c.x, c.y, '#ffe36d', 18); }
    else {
      const speedBonus = Math.max(50, Math.floor(900 * game.combo + game.time * 8));
      game.score += speedBonus; game.combo += .55; game.comboTimer = 7; game.time += 5;
      game.carrying = false; game.package = roadPoint(); game.delivery = roadPoint();
      flash(`Доставка +${speedBonus}`); burst(c.x, c.y, '#7dff9b', 26);
    }
  }

  game.policeSpawn -= dt;
  if (game.policeSpawn <= 0) { if (game.police.length < 6 + Math.floor(game.score / 4000)) spawnPolice(); game.policeSpawn = Math.max(1.8, 4.2 - game.score / 12000); }
  game.trafficSpawn -= dt;
  if (game.trafficSpawn <= 0) { if (game.traffic.length < 12) spawnTraffic(); game.trafficSpawn = rnd(2.5, 4.5); }

  for (const p of game.police) {
    const a = Math.atan2(c.x - p.x, -(c.y - p.y));
    let diff = ((a - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    p.a += clamp(diff, -2.1 * dt, 2.1 * dt);
    p.v += 100 * dt; p.v = Math.min(p.v, 300 + game.score / 900);
    p.x += Math.sin(p.a) * p.v * dt; p.y -= Math.cos(p.a) * p.v * dt;
    if (hitBlock(p.x, p.y, p.r)) p.v *= -.25;
    if (Math.hypot(p.x - c.x, p.y - c.y) < 34 && p.hit <= 0) {
      p.hit = 1.2; game.time -= 7; game.combo = 1; game.shake = 16; c.v *= .35; burst(c.x, c.y, '#ff4e66', 28); flash('-7 сек. Уходи от полиции!');
    }
    p.hit -= dt;
  }
  game.police = game.police.filter(p => Math.hypot(p.x - c.x, p.y - c.y) < 1300);

  for (const t of game.traffic) {
    t.x += Math.sin(t.a) * t.v * dt; t.y -= Math.cos(t.a) * t.v * dt;
    if (t.x < 20 || t.x > world.w - 20 || t.y < 20 || t.y > world.h - 20 || hitBlock(t.x, t.y, t.r)) t.a += Math.PI;
    if (Math.hypot(t.x - c.x, t.y - c.y) < 32) { game.time -= 3; c.v *= .55; burst(c.x, c.y, t.c, 14); t.a += Math.PI; }
  }

  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; if (p.life <= 0) game.particles.splice(i, 1);
  }
  if (game.time <= 0) end();
}

function draw() {
  if (!game) return;
  const c = game.car;
  const camX = clamp(c.x - W / 2, 0, world.w - W);
  const camY = clamp(c.y - H / 2, 0, world.h - H);
  ctx.save();
  if (game.shake > 0) { ctx.translate(rnd(-game.shake, game.shake), rnd(-game.shake, game.shake)); game.shake *= .86; }
  ctx.clearRect(-40, -40, W + 80, H + 80);
  ctx.translate(-camX, -camY);

  ctx.fillStyle = '#070a16'; ctx.fillRect(camX, camY, W, H);
  ctx.strokeStyle = 'rgba(93,232,255,.16)'; ctx.lineWidth = 88;
  for (let x = 210; x < world.w; x += 420) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.h); ctx.stroke(); }
  for (let y = 210; y < world.h; y += 420) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.w, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
  for (let x = 210; x < world.w; x += 420) { ctx.setLineDash([18, 22]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, world.h); ctx.stroke(); }
  for (let y = 210; y < world.h; y += 420) { ctx.setLineDash([18, 22]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(world.w, y); ctx.stroke(); }
  ctx.setLineDash([]);

  for (const b of world.blocks) {
    if (b.x + b.w < camX || b.x > camX + W || b.y + b.h < camY || b.y > camY + H) continue;
    ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(93,232,255,.18)'; ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,.055)';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) ctx.fillRect(b.x + 28 + i * 38, b.y + 34 + j * 42, 16, 18);
  }

  const target = game.carrying ? game.delivery : game.package;
  ctx.strokeStyle = game.carrying ? '#7dff9b' : '#ffe36d'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(target.x, target.y, 34 + Math.sin(performance.now() / 150) * 5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = game.carrying ? 'rgba(125,255,155,.25)' : 'rgba(255,227,109,.25)'; ctx.beginPath(); ctx.arc(target.x, target.y, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = game.carrying ? '#7dff9b' : '#ffe36d'; ctx.font = '900 22px Inter'; ctx.textAlign = 'center'; ctx.fillText(game.carrying ? 'DROP' : 'BOX', target.x, target.y + 8);

  for (const t of game.traffic) drawCar(t.x, t.y, t.a, t.c, .85);
  for (const p of game.police) drawCar(p.x, p.y, p.a, '#ff4e66', .95);
  drawCar(c.x, c.y, c.a, '#5de8ff', 1.05);

  for (const p of game.particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.restore();

  const dx = target.x - c.x, dy = target.y - c.y;
  const a = Math.atan2(dx, -dy);
  ctx.save(); ctx.translate(W / 2, 76); ctx.rotate(a);
  ctx.fillStyle = game.carrying ? '#7dff9b' : '#ffe36d';
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(12, 12); ctx.lineTo(0, 6); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill(); ctx.restore();

  if (game.msgTime > 0) { ctx.fillStyle = '#fff'; ctx.font = '900 24px Inter'; ctx.textAlign = 'center'; ctx.fillText(game.message, W / 2, 128); }
  ctx.fillStyle = 'rgba(93,232,255,.85)'; ctx.fillRect(18, H - 24, Math.max(0, game.nitro) * 1.6, 8);
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.strokeRect(18, H - 24, 160, 8);

  scoreEl.textContent = Math.floor(game.score).toLocaleString('ru-RU');
  timeEl.textContent = Math.max(0, Math.ceil(game.time));
  comboEl.textContent = `x${game.combo.toFixed(game.combo < 10 ? 1 : 0)}`;
  bestEl.textContent = best().toLocaleString('ru-RU');
}

function loop(t=0) {
  if (state !== 'play') return;
  const dt = Math.min(.035, (t - last) / 1000 || .016); last = t;
  update(dt); draw(); raf = requestAnimationFrame(loop);
}
function start() { reset(); state='play'; menu.classList.remove('active'); result.classList.remove('active'); last=performance.now(); loop(last); }
function end() { state='over'; cancelAnimationFrame(raf); saveBest(game.score); resultTitle.textContent = game.score > best() ? 'Новый рекорд!' : 'Финиш'; resultText.textContent = `Ты набрал ${Math.floor(game.score).toLocaleString('ru-RU')} очков. Доставки дают время и комбо — попробуй держать маршрут быстрее.`; result.classList.add('active'); }
function pause() { if (state === 'play') { state='pause'; cancelAnimationFrame(raf); flash('Пауза'); menu.classList.add('active'); } }

addEventListener('resize', resize);
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.key === 'Escape') state === 'play' ? pause() : null; });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
for (const btn of document.querySelectorAll('[data-key]')) {
  const k = btn.dataset.key;
  btn.addEventListener('touchstart', e => { e.preventDefault(); touchKeys.add(k === 'nitro' ? 'nitro' : k); }, {passive:false});
  btn.addEventListener('touchend', e => { e.preventDefault(); touchKeys.delete(k === 'nitro' ? 'nitro' : k); }, {passive:false});
  btn.addEventListener('mousedown', () => touchKeys.add(k === 'nitro' ? 'nitro' : k));
  btn.addEventListener('mouseup', () => touchKeys.delete(k === 'nitro' ? 'nitro' : k));
}
document.getElementById('play').onclick = start;
document.getElementById('again').onclick = start;
document.getElementById('toMenu').onclick = () => { result.classList.remove('active'); menu.classList.add('active'); state='menu'; };
document.getElementById('help').onclick = () => alert('Это игра про скорость и маршруты. Забери BOX, доставь в DROP, держи комбо и избегай полиции. На ПК: WASD/стрелки, Space — нитро. На телефоне: кнопки снизу.');
resize(); reset(); draw(); bestEl.textContent = best().toLocaleString('ru-RU');
