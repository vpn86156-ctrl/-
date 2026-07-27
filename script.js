const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const levelEl = document.getElementById('level');
const menu = document.getElementById('menu');
const pausePanel = document.getElementById('pausePanel');
const upgradePanel = document.getElementById('upgradePanel');
const upgradeGrid = document.getElementById('upgradeGrid');
const gameOverPanel = document.getElementById('gameOver');
const finalText = document.getElementById('finalText');
const recordsEl = document.getElementById('records');
const soundBtn = document.getElementById('soundBtn');

const isTouch = matchMedia('(hover: none)').matches;
if (isTouch) document.documentElement.classList.add('mobile');

let w = 0, h = 0, dpr = 1, last = 0, raf = 0;
let state = 'menu';
let muted = true;
let audioCtx = null;
const keys = new Set();
const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false, lastTap: 0 };

const recordsKey = 'neon-core-records-v1';
const upgrades = [
  { id: 'blade', icon: '✦', title: '+1 клинок', desc: 'Ещё один орбитальный клинок вокруг ядра.' },
  { id: 'speed', icon: '➜', title: 'Скорость', desc: 'Ядро быстрее разгоняется и лучше уходит от угроз.' },
  { id: 'magnet', icon: '◎', title: 'Магнит', desc: 'Энергия притягивается с большего расстояния.' },
  { id: 'shield', icon: '⬡', title: 'Щит', desc: 'Один удар врага будет поглощён.' },
  { id: 'dash', icon: '↯', title: 'Рывок+', desc: 'Рывок быстрее перезаряжается.' },
  { id: 'score', icon: '×', title: 'Комбо+', desc: 'Комбо растёт дольше и приносит больше очков.' }
];

let game;
function resetGame() {
  game = {
    time: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    level: 1,
    xp: 0,
    xpNeed: 8,
    hp: 3,
    shield: 0,
    shake: 0,
    spawn: 0,
    shardSpawn: 0,
    dashCd: 0,
    dashPower: 1,
    magnet: 95,
    speed: 1,
    blades: 2,
    particles: [],
    enemies: [],
    shards: [],
    texts: [],
    player: { x: w / 2, y: h / 2, vx: 0, vy: 0, r: 15, angle: 0 }
  };
}

function resize() {
  dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.45 : 2);
  w = innerWidth; h = innerHeight;
  canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (game) {
    game.player.x = Math.min(w - 30, Math.max(30, game.player.x));
    game.player.y = Math.min(h - 30, Math.max(30, game.player.y));
  }
}

function rand(a, b) { return Math.random() * (b - a) + a; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function records() { return JSON.parse(localStorage.getItem(recordsKey) || '[]'); }
function saveRecord(score) {
  const list = records();
  list.push({ score: Math.floor(score), date: new Date().toLocaleDateString('ru-RU') });
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(recordsKey, JSON.stringify(list.slice(0, 5)));
}
function renderRecords() {
  const list = records();
  recordsEl.innerHTML = list.length ? `<b>Лучшие забеги</b><ol>${list.map(r => `<li>${r.score.toLocaleString('ru-RU')} · ${r.date}</li>`).join('')}</ol>` : '<b>Рекордов пока нет — стань первым.</b>';
}

function beep(freq = 420, type = 'sine', dur = 0.06, gain = 0.04) {
  if (muted) return;
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq; o.type = type;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
}

function spawnEnemy() {
  const side = Math.floor(rand(0, 4));
  const p = side === 0 ? { x: rand(0, w), y: -30 } : side === 1 ? { x: w + 30, y: rand(0, h) } : side === 2 ? { x: rand(0, w), y: h + 30 } : { x: -30, y: rand(0, h) };
  const fast = Math.random() < Math.min(0.28, game.time / 90000);
  game.enemies.push({
    ...p,
    vx: 0, vy: 0,
    r: fast ? rand(10, 15) : rand(14, 24),
    speed: (fast ? rand(95, 145) : rand(52, 92)) + game.level * 3,
    hp: fast ? 1 : Math.ceil(rand(1, 2 + game.level / 5)),
    color: fast ? '#ff4fd8' : '#ff526d',
    rot: rand(0, Math.PI)
  });
}

function spawnShard(x = rand(40, w - 40), y = rand(90, h - 90), value = 1) {
  game.shards.push({ x, y, vx: rand(-20, 20), vy: rand(-20, 20), r: 7, value, pulse: rand(0, 7) });
}

function burst(x, y, color = '#62e9ff', count = 16) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), s = rand(40, 240);
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.25, .8), max: .8, r: rand(1.5, 4), color });
  }
}
function textPop(text, x, y, color = '#fff') { game.texts.push({ text, x, y, life: .8, color }); }

function dash() {
  if (state !== 'playing' || game.dashCd > 0) return;
  const p = game.player;
  let ax = 0, ay = 0;
  if (keys.has('w') || keys.has('arrowup')) ay -= 1;
  if (keys.has('s') || keys.has('arrowdown')) ay += 1;
  if (keys.has('a') || keys.has('arrowleft')) ax -= 1;
  if (keys.has('d') || keys.has('arrowright')) ax += 1;
  if (!ax && !ay) { ax = pointer.x - p.x; ay = pointer.y - p.y; }
  const len = Math.hypot(ax, ay) || 1;
  p.vx += ax / len * 760 * game.dashPower;
  p.vy += ay / len * 760 * game.dashPower;
  game.dashCd = Math.max(.55, 1.25 - game.dashPower * .1);
  game.shake = 6;
  burst(p.x, p.y, '#ffffff', 24);
  beep(180, 'sawtooth', .08, .035);
}

function damage() {
  if (game.shield > 0) { game.shield--; textPop('ЩИТ', game.player.x, game.player.y - 30, '#67ffb0'); beep(260, 'square', .08); return; }
  game.hp--;
  game.combo = 1; game.comboTimer = 0; game.shake = 18;
  burst(game.player.x, game.player.y, '#ff526d', 34);
  beep(90, 'sawtooth', .18, .06);
  if (game.hp <= 0) endGame();
}

function chooseUpgrade() {
  state = 'upgrade';
  const picks = [...upgrades].sort(() => Math.random() - .5).slice(0, 3);
  upgradeGrid.innerHTML = picks.map(u => `<button class="upgrade" data-up="${u.id}"><i>${u.icon}</i><b>${u.title}</b><span>${u.desc}</span></button>`).join('');
  upgradePanel.classList.add('active');
  document.querySelectorAll('[data-up]').forEach(btn => btn.onclick = () => {
    applyUpgrade(btn.dataset.up);
    upgradePanel.classList.remove('active');
    state = 'playing';
    last = performance.now();
    loop(last);
  });
}
function applyUpgrade(id) {
  if (id === 'blade') game.blades++;
  if (id === 'speed') game.speed += .14;
  if (id === 'magnet') game.magnet += 38;
  if (id === 'shield') game.shield += 1;
  if (id === 'dash') game.dashPower += .18;
  if (id === 'score') game.combo += 1;
  textPop('UPGRADE', game.player.x, game.player.y - 45, '#ffe985');
  beep(620, 'triangle', .12, .045);
}

function update(dt) {
  game.time += dt * 1000;
  game.spawn -= dt; game.shardSpawn -= dt; game.dashCd = Math.max(0, game.dashCd - dt); game.shake *= .9;
  if (game.spawn <= 0) { spawnEnemy(); game.spawn = Math.max(.18, .9 - game.level * .035 - game.time / 170000); }
  if (game.shardSpawn <= 0) { spawnShard(); game.shardSpawn = rand(.45, .95); }

  const p = game.player;
  let tx = p.x, ty = p.y;
  let kx = 0, ky = 0;
  if (keys.has('w') || keys.has('arrowup')) ky -= 1;
  if (keys.has('s') || keys.has('arrowdown')) ky += 1;
  if (keys.has('a') || keys.has('arrowleft')) kx -= 1;
  if (keys.has('d') || keys.has('arrowright')) kx += 1;
  if (kx || ky) { const l = Math.hypot(kx, ky); p.vx += kx / l * 620 * game.speed * dt; p.vy += ky / l * 620 * game.speed * dt; }
  else if (pointer.active || isTouch) { tx = pointer.x; ty = pointer.y; p.vx += (tx - p.x) * 4.8 * dt * game.speed; p.vy += (ty - p.y) * 4.8 * dt * game.speed; }
  p.vx *= Math.pow(.035, dt); p.vy *= Math.pow(.035, dt);
  p.x = clamp(p.x + p.vx * dt, 24, w - 24); p.y = clamp(p.y + p.vy * dt, 82, h - 26);
  p.angle += dt * (2.8 + game.blades * .18);

  game.comboTimer -= dt;
  if (game.comboTimer <= 0) game.combo = Math.max(1, game.combo - dt * 1.5);

  for (const e of game.enemies) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    e.vx += Math.cos(a) * e.speed * dt * 2.2; e.vy += Math.sin(a) * e.speed * dt * 2.2;
    e.vx *= Math.pow(.08, dt); e.vy *= Math.pow(.08, dt);
    e.x += e.vx * dt; e.y += e.vy * dt; e.rot += dt * 2;
  }

  const bladePositions = [];
  for (let i = 0; i < game.blades; i++) {
    const a = p.angle + i / game.blades * Math.PI * 2;
    bladePositions.push({ x: p.x + Math.cos(a) * 54, y: p.y + Math.sin(a) * 54, r: 13 });
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    let hit = false;
    for (const b of bladePositions) if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) hit = true;
    if (hit) {
      e.hp--;
      burst(e.x, e.y, e.color, 8);
      if (e.hp <= 0) {
        game.enemies.splice(i, 1);
        const gain = Math.floor(10 * game.combo);
        game.score += gain; game.combo += .18; game.comboTimer = 3.4; game.xp += 1;
        textPop(`+${gain}`, e.x, e.y, '#fff');
        if (Math.random() < .45) spawnShard(e.x, e.y, 2);
        beep(420 + Math.min(500, game.combo * 18), 'triangle', .04, .025);
      }
      continue;
    }
    if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
      game.enemies.splice(i, 1);
      damage();
    }
  }

  for (let i = game.shards.length - 1; i >= 0; i--) {
    const s = game.shards[i];
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < game.magnet) { s.vx += (p.x - s.x) / (d || 1) * 560 * dt; s.vy += (p.y - s.y) / (d || 1) * 560 * dt; }
    s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .96; s.vy *= .96; s.pulse += dt * 5;
    if (d < p.r + s.r + 4) {
      game.shards.splice(i, 1);
      game.xp += s.value; game.score += Math.floor(4 * game.combo); game.comboTimer = 3.2;
      burst(s.x, s.y, '#ffe985', 8); beep(760, 'sine', .035, .02);
    }
  }

  if (game.xp >= game.xpNeed) {
    game.xp -= game.xpNeed; game.level++; game.xpNeed = Math.ceil(game.xpNeed * 1.35 + 3);
    chooseUpgrade(); return;
  }

  for (let i = game.particles.length - 1; i >= 0; i--) { const q = game.particles[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .96; q.vy *= .96; if (q.life <= 0) game.particles.splice(i, 1); }
  for (let i = game.texts.length - 1; i >= 0; i--) { const t = game.texts[i]; t.life -= dt; t.y -= 34 * dt; if (t.life <= 0) game.texts.splice(i, 1); }
}

function draw() {
  ctx.save();
  if (game?.shake > 0) ctx.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
  ctx.clearRect(-50, -50, w + 100, h + 100);

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 80; i++) {
    const x = (i * 137.5 + game.time * .012) % (w + 120) - 60;
    const y = (i * 91.7 + Math.sin(game.time * .0005 + i) * 40) % (h + 120) - 60;
    ctx.fillStyle = `rgba(98,233,255,${0.04 + (i % 5) * .015})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + (i % 4), 0, Math.PI * 2); ctx.fill();
  }

  for (const s of game.shards) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.pulse);
    ctx.shadowColor = '#ffe985'; ctx.shadowBlur = 18; ctx.fillStyle = '#ffe985';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, 0); ctx.lineTo(0, 9); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  for (const e of game.enemies) {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
    ctx.shadowColor = e.color; ctx.shadowBlur = 20; ctx.strokeStyle = e.color; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const rr = i % 2 ? e.r * .72 : e.r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  const p = game.player;
  ctx.strokeStyle = `rgba(98,233,255,${.18 + game.xp / game.xpNeed * .24})`; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(p.x, p.y, 66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (game.xp / game.xpNeed)); ctx.stroke();

  for (let i = 0; i < game.blades; i++) {
    const a = p.angle + i / game.blades * Math.PI * 2;
    const bx = p.x + Math.cos(a) * 54, by = p.y + Math.sin(a) * 54;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a + Math.PI / 4);
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25; ctx.fillStyle = '#ffffff';
    ctx.fillRect(-13, -4, 26, 8); ctx.fillStyle = '#62e9ff'; ctx.fillRect(-4, -13, 8, 26); ctx.restore();
  }

  ctx.save(); ctx.translate(p.x, p.y);
  ctx.shadowColor = game.shield > 0 ? '#67ffb0' : '#62e9ff'; ctx.shadowBlur = 34;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = game.shield > 0 ? '#67ffb0' : '#62e9ff'; ctx.beginPath(); ctx.arc(0, 0, p.r * .58, 0, Math.PI * 2); ctx.fill();
  if (game.shield > 0) { ctx.strokeStyle = '#67ffb0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, p.r + 13, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();

  for (const q of game.particles) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.shadowColor = q.color; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const t of game.texts) { ctx.fillStyle = t.color; ctx.font = '900 18px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = t.color; ctx.shadowBlur = 18; ctx.fillText(t.text, t.x, t.y); }
  ctx.restore();

  scoreEl.textContent = Math.floor(game.score).toLocaleString('ru-RU');
  comboEl.textContent = `x${Math.max(1, game.combo).toFixed(game.combo < 10 ? 1 : 0)}`;
  levelEl.textContent = `${game.level} · ❤${game.hp} ${game.shield ? `⬡${game.shield}` : ''}`;
}

function loop(t = 0) {
  if (state !== 'playing') return;
  const dt = Math.min(.033, (t - last) / 1000 || .016); last = t;
  update(dt); draw();
  if (state === 'playing') raf = requestAnimationFrame(loop);
}
function start() { resetGame(); state = 'playing'; menu.classList.remove('active'); gameOverPanel.classList.remove('active'); pausePanel.classList.remove('active'); last = performance.now(); loop(last); }
function endGame() { state = 'over'; cancelAnimationFrame(raf); saveRecord(game.score); renderRecords(); finalText.textContent = `Ты набрал ${Math.floor(game.score).toLocaleString('ru-RU')} очков, дошёл до ${game.level} уровня и разогнал комбо до x${Math.floor(game.combo)}.`; gameOverPanel.classList.add('active'); }
function pause() { if (state !== 'playing') return; state = 'pause'; cancelAnimationFrame(raf); pausePanel.classList.add('active'); }
function resume() { if (state !== 'pause') return; state = 'playing'; pausePanel.classList.remove('active'); last = performance.now(); loop(last); }

addEventListener('resize', resize);
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.code === 'Space') { e.preventDefault(); dash(); } if (e.key === 'Escape') state === 'pause' ? resume() : pause(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('mousemove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; });
addEventListener('mousedown', dash);
addEventListener('touchstart', e => { const touch = e.touches[0]; if (!touch) return; pointer.x = touch.clientX; pointer.y = touch.clientY; pointer.active = true; const n = performance.now(); if (n - pointer.lastTap < 280) dash(); pointer.lastTap = n; }, { passive: true });
addEventListener('touchmove', e => { const touch = e.touches[0]; if (!touch) return; pointer.x = touch.clientX; pointer.y = touch.clientY; pointer.active = true; }, { passive: true });
addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

document.getElementById('startBtn').onclick = start;
document.getElementById('restartBtn').onclick = start;
document.getElementById('resumeBtn').onclick = resume;
document.getElementById('menuBtn').onclick = () => { gameOverPanel.classList.remove('active'); menu.classList.add('active'); state = 'menu'; };
document.getElementById('howBtn').onclick = () => alert('Двигай ядро, собирай жёлтую энергию и не подпускай врагов к центру. Бело-голубые клинки вокруг тебя уничтожают врагов. Space/клик/двойной тап — рывок. На каждом уровне выбирай усиление.');
soundBtn.onclick = () => { muted = !muted; soundBtn.textContent = muted ? '🔇' : '🔊'; beep(520); };

resize(); resetGame(); draw(); renderRecords();
