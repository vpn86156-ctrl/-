const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const levelEl = document.getElementById('level');
const missionEl = document.getElementById('mission');
const menu = document.getElementById('menu');
const pausePanel = document.getElementById('pausePanel');
const upgradePanel = document.getElementById('upgradePanel');
const upgradeGrid = document.getElementById('upgradeGrid');
const gameOverPanel = document.getElementById('gameOver');
const finalText = document.getElementById('finalText');
const recordsEl = document.getElementById('records');
const soundBtn = document.getElementById('soundBtn');
const skillBtn = document.getElementById('skillBtn');
const bossBar = document.getElementById('bossBar');
const bossFill = document.getElementById('bossFill');
const bossName = document.getElementById('bossName');

const isTouch = matchMedia('(hover: none)').matches;
if (isTouch) document.documentElement.classList.add('mobile');

let w = 0, h = 0, dpr = 1, last = 0, raf = 0;
const PERFORMANCE_MODE = true;
const TARGET_FRAME = 1000 / 45;
function lowPower() { return PERFORMANCE_MODE || isTouch || w < 1200; }
function glow(v) { return lowPower() ? 0 : v; }
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
  { id: 'score', icon: '×', title: 'Комбо+', desc: 'Комбо растёт дольше и приносит больше очков.' },
  { id: 'gun', icon: '◆', title: 'Пушка+', desc: 'Неоновый выстрел стреляет быстрее и сильнее.' }
];

const missionPool = [
  { type: 'kills', label: 'Уничтожь врагов', goal: 18 },
  { type: 'shards', label: 'Собери энергию', goal: 22 },
  { type: 'cuts', label: 'Разруби пули', goal: 8 },
  { type: 'dash', label: 'DASH KILL', goal: 4 },
  { type: 'survive', label: 'Продержись', goal: 35 }
];

let game;
function resetGame() {
  game = {
    time: 0,
    score: 0,
    kills: 0,
    shardsCollected: 0,
    bulletsCut: 0,
    dashKills: 0,
    pulse: 20,
    missionIndex: 0,
    mission: null,
    bossLevel: 0,
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
    hazardSpawn: 0,
    idle: 0,
    idleWarn: 0,
    dashCd: 0,
    dashTime: 0,
    dashPower: 1,
    shotCd: 0,
    fireRate: .34,
    shotPower: 1,
    magnet: 95,
    speed: 1,
    blades: 2,
    particles: [],
    enemies: [],
    bullets: [],
    shots: [],
    zones: [],
    shards: [],
    texts: [],
    player: { x: w / 2, y: h / 2, vx: 0, vy: 0, r: 15, angle: 0, lastX: w / 2, lastY: h / 2 }
  };
  startMission();
}

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 1);
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

function startMission() {
  const base = missionPool[game.missionIndex % missionPool.length];
  const bonus = Math.floor(game.level / 3);
  const goal = base.type === 'survive' ? base.goal + bonus * 8 : base.goal + bonus * 5;
  game.mission = { ...base, goal, start: missionValue(base.type), done: false };
}
function missionValue(type) {
  if (type === 'kills') return game.kills;
  if (type === 'shards') return game.shardsCollected;
  if (type === 'cuts') return game.bulletsCut;
  if (type === 'dash') return game.dashKills;
  if (type === 'survive') return Math.floor(game.time / 1000);
  return 0;
}
function missionProgress() {
  if (!game?.mission) return 0;
  return Math.max(0, missionValue(game.mission.type) - game.mission.start);
}
function checkMission() {
  if (!game.mission || game.mission.done) return;
  const progress = missionProgress();
  if (progress >= game.mission.goal) {
    game.mission.done = true;
    game.score += 750 + game.level * 120;
    game.shield += 1;
    game.pulse = Math.min(100, game.pulse + 35);
    textPop('МИССИЯ + ЩИТ', game.player.x, game.player.y - 58, '#ffe985');
    beep(880, 'triangle', .16, .04);
    game.missionIndex++;
    startMission();
  }
}
function addPulse(value) { game.pulse = Math.min(100, game.pulse + value); }
function pulseBlast() {
  if (state !== 'playing' || game.pulse < 100) return;
  game.pulse = 0;
  const p = game.player;
  let destroyed = game.bullets.length;
  game.bullets.length = 0;
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 210) {
      e.hp -= e.type === 'boss' ? 6 : 4;
      burst(e.x, e.y, '#62e9ff', 14);
      if (e.hp <= 0) {
        game.enemies.splice(i, 1);
        game.kills++;
        game.score += e.type === 'boss' ? 2500 : 120;
      }
    }
  }
  burst(p.x, p.y, '#62e9ff', 40);
  textPop(`ИМПУЛЬС ${destroyed ? '+' + destroyed : ''}`, p.x, p.y - 70, '#62e9ff');
  beep(120, 'sawtooth', .18, .06);
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

function spawnEnemy(forcedType = '') {
  const side = Math.floor(rand(0, 4));
  const p = side === 0 ? { x: rand(0, w), y: -30 } : side === 1 ? { x: w + 30, y: rand(0, h) } : side === 2 ? { x: rand(0, w), y: h + 30 } : { x: -30, y: rand(0, h) };
  const roll = Math.random();
  const late = Math.min(1, game.time / 90000 + game.level / 18);
  let type = forcedType || 'chaser';
  if (!forcedType) {
    if (roll < 0.12 + late * 0.12) type = 'piercer';
    else if (roll < 0.24 + late * 0.18) type = 'shooter';
    else if (roll < 0.34 + late * 0.12) type = 'tank';
    else if (roll < 0.48) type = 'runner';
  }
  const config = {
    chaser: { r: rand(14, 22), speed: rand(58, 92), hp: Math.ceil(rand(1, 2 + game.level / 6)), color: '#ff526d' },
    runner: { r: rand(9, 14), speed: rand(125, 175), hp: 1, color: '#ff4fd8' },
    tank: { r: rand(24, 33), speed: rand(32, 52), hp: 4 + Math.floor(game.level / 3), color: '#ff9f43' },
    shooter: { r: rand(15, 20), speed: rand(42, 66), hp: 2 + Math.floor(game.level / 6), color: '#a66bff' },
    piercer: { r: rand(11, 16), speed: rand(88, 126), hp: 2, color: '#67ffb0' },
    boss: { r: 48, speed: 38 + game.level * 1.5, hp: 34 + game.level * 8, color: '#62e9ff' }
  }[type];
  game.enemies.push({
    ...p,
    type,
    vx: 0, vy: 0,
    r: config.r,
    speed: config.speed + game.level * 2.2,
    hp: config.hp,
    color: config.color,
    rot: rand(0, Math.PI),
    shoot: type === 'boss' ? .7 : rand(.8, 1.8),
    phase: type === 'piercer',
    phaseTimer: type === 'piercer' ? 1.25 : 0
  });
}

function spawnShard(x = rand(40, w - 40), y = rand(90, h - 90), value = 1) {
  game.shards.push({ x, y, vx: rand(-20, 20), vy: rand(-20, 20), r: 7, value, pulse: rand(0, 7) });
}

function spawnZone(x, y, r = 54) {
  game.zones.push({ x, y, r, life: 2.1, max: 2.1, hot: .85 });
}

function fireBullet(enemy) {
  const a = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  const speed = 200 + game.level * 4;
  game.bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, life: 4.5, color: enemy.color });
  beep(220, 'square', .035, .015);
}

function burst(x, y, color = '#62e9ff', count = 16) {
  count = Math.min(lowPower() ? 5 : 18, Math.ceil(count * (lowPower() ? 0.25 : 0.65)));
  const maxParticles = lowPower() ? 45 : 140;
  if (game.particles.length > maxParticles) game.particles.splice(0, game.particles.length - maxParticles);
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), s = rand(40, 240);
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.25, .8), max: .8, r: rand(1.5, 4), color });
  }
}
function textPop(text, x, y, color = '#fff') { game.texts.push({ text, x, y, life: .8, color }); }

function nearestEnemy() {
  let best = null, bestD = Infinity;
  for (const e of game.enemies) {
    const d = Math.hypot(e.x - game.player.x, e.y - game.player.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}
function fireShot() {
  if (state !== 'playing' || game.shotCd > 0) return;
  const p = game.player;
  let tx = pointer.x, ty = pointer.y;
  if (!pointer.active) { const e = nearestEnemy(); if (e) { tx = e.x; ty = e.y; } }
  let a = Math.atan2(ty - p.y, tx - p.x);
  if (!Number.isFinite(a)) a = p.angle;
  const speed = 520;
  game.shots.push({ x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, life: .9, dmg: game.shotPower, color: '#ffffff' });
  game.shotCd = game.fireRate;
}

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
  game.dashTime = .22;
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
  if (id === 'blade') { if (game.blades < 5) game.blades++; else { game.player.r += .8; game.score += 250; textPop('КЛИНКИ MAX', game.player.x, game.player.y - 60, '#ffe985'); } }
  if (id === 'speed') game.speed += .14;
  if (id === 'magnet') game.magnet += 38;
  if (id === 'shield') game.shield += 1;
  if (id === 'dash') game.dashPower += .18;
  if (id === 'score') game.combo += 1;
  if (id === 'gun') { game.fireRate = Math.max(.16, game.fireRate - .045); game.shotPower += .35; }
  textPop('UPGRADE', game.player.x, game.player.y - 45, '#ffe985');
  beep(620, 'triangle', .12, .045);
}

function update(dt) {
  game.time += dt * 1000;
  game.spawn -= dt; game.shardSpawn -= dt; game.dashCd = Math.max(0, game.dashCd - dt); game.shotCd = Math.max(0, game.shotCd - dt); game.dashTime = Math.max(0, game.dashTime - dt); game.shake *= .9;
  if (game.spawn <= 0) { if (game.enemies.length < (lowPower() ? 22 : 54)) spawnEnemy(); game.spawn = Math.max(lowPower() ? .62 : .3, 1.15 - game.level * .026 - game.time / 260000); }
  if (game.shardSpawn <= 0) { if (game.shards.length < (lowPower() ? 34 : 70)) spawnShard(); game.shardSpawn = rand(lowPower() ? .8 : .5, lowPower() ? 1.35 : 1.0); }
  if (game.enemies.length) fireShot();

  const p = game.player;
  let tx = p.x, ty = p.y;
  let kx = 0, ky = 0;
  if (keys.has('w') || keys.has('arrowup')) ky -= 1;
  if (keys.has('s') || keys.has('arrowdown')) ky += 1;
  if (keys.has('a') || keys.has('arrowleft')) kx -= 1;
  if (keys.has('d') || keys.has('arrowright')) kx += 1;
  if (kx || ky) { const l = Math.hypot(kx, ky); p.vx += kx / l * 620 * game.speed * dt; p.vy += ky / l * 620 * game.speed * dt; }
  else if (pointer.active || isTouch) { tx = pointer.x; ty = pointer.y; const follow = isTouch ? 9.2 : 6.2; p.vx += (tx - p.x) * follow * dt * game.speed; p.vy += (ty - p.y) * follow * dt * game.speed; }
  p.vx *= Math.pow(.035, dt); p.vy *= Math.pow(.035, dt);
  p.x = clamp(p.x + p.vx * dt, 24, w - 24); p.y = clamp(p.y + p.vy * dt, 82, h - 26);
  p.angle += dt * (2.8 + game.blades * .18);

  game.comboTimer -= dt;
  if (game.comboTimer <= 0) game.combo = Math.max(1, game.combo - dt * 1.5);

  const moved = Math.hypot(p.x - p.lastX, p.y - p.lastY);
  const pointerDemand = pointer.active && Math.hypot(pointer.x - p.x, pointer.y - p.y) > 12;
  const hasInput = kx || ky || pointerDemand;
  if (moved < 1.8 && !hasInput) game.idle += dt;
  else game.idle = Math.max(0, game.idle - dt * 2.5);
  p.lastX = p.x; p.lastY = p.y;
  if (game.idle > 1.15) {
    game.hazardSpawn -= dt;
    game.combo = Math.max(1, game.combo - dt * 3.2);
    if (game.hazardSpawn <= 0) {
      spawnZone(p.x + rand(-18, 18), p.y + rand(-18, 18), rand(46, 70));
      if (Math.random() < .45) spawnEnemy('piercer');
      textPop('ДВИГАЙСЯ!', p.x, p.y - 42, '#ff526d');
      game.hazardSpawn = 1.05;
    }
  }

  for (const e of game.enemies) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    let desired = a;
    let accel = e.speed * 2.2;
    if (e.type === 'shooter') {
      if (d < 230) desired = a + Math.PI;
      else if (d < 320) accel *= .25;
      e.shoot -= dt;
      if (e.shoot <= 0 && d < 620) { fireBullet(e); e.shoot = Math.max(.75, 1.65 - game.level * .035); }
    }
    if (e.type === 'boss') {
      if (d < 190) desired = a + Math.PI;
      else if (d < 300) accel *= .18;
      e.shoot -= dt;
      if (e.shoot <= 0) {
        for (let k = 0; k < 7; k++) {
          const ang = a + (k - 3) * .22;
          const speed = 180 + game.level * 4;
          game.bullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 7, life: 4.5, color: e.color });
        }
        spawnZone(p.x + rand(-80, 80), p.y + rand(-80, 80), rand(45, 62));
        e.shoot = Math.max(.85, 1.55 - game.level * .025);
      }
    }
    e.vx += Math.cos(desired) * accel * dt; e.vy += Math.sin(desired) * accel * dt;
    e.vx *= Math.pow(.08, dt); e.vy *= Math.pow(.08, dt);
    e.x += e.vx * dt; e.y += e.vy * dt; e.rot += dt * (e.type === 'piercer' ? 5 : 2);
    if (e.phaseTimer > 0) { e.phaseTimer -= dt; if (e.phaseTimer <= 0) e.phase = false; }
  }

  const bladePositions = [];
  for (let i = 0; i < game.blades; i++) {
    const a = p.angle + i / game.blades * Math.PI * 2;
    bladePositions.push({ x: p.x + Math.cos(a) * 54, y: p.y + Math.sin(a) * 54, r: 13 });
  }

  for (let i = game.shots.length - 1; i >= 0; i--) {
    const s = game.shots[i];
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.life <= 0 || s.x < -50 || s.x > w + 50 || s.y < -50 || s.y > h + 50) { game.shots.splice(i, 1); continue; }
    let consumed = false;
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const e = game.enemies[j];
      if (Math.hypot(s.x - e.x, s.y - e.y) < s.r + e.r) {
        e.hp -= s.dmg;
        consumed = true;
        burst(s.x, s.y, '#ffffff', 5);
        if (e.hp <= 0) {
          game.enemies.splice(j, 1);
          const gain = Math.floor((e.type === 'boss' ? 380 : 18) * Math.min(game.combo, 35));
          game.score += gain; game.combo = Math.min(45, game.combo + .12); game.comboTimer = 3.2;
          game.xp += e.type === 'boss' ? 8 : 1; game.kills++; addPulse(e.type === 'boss' ? 45 : 4);
          textPop(e.type === 'boss' ? 'BOSS DOWN' : `+${gain}`, e.x, e.y, e.type === 'boss' ? '#62e9ff' : '#fff');
          if (Math.random() < .35) spawnShard(e.x, e.y, 2);
        }
        break;
      }
    }
    if (consumed) game.shots.splice(i, 1);
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    let hit = false;
    for (const b of bladePositions) if (!e.phase && Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) hit = true;
    if (hit) {
      e.hp--;
      burst(e.x, e.y, e.color, 8);
      if (e.hp <= 0) {
        game.enemies.splice(i, 1);
        const gain = Math.floor(6 * Math.min(game.combo, 35));
        game.score += gain; game.combo += .14; game.comboTimer = 3.4; game.xp += e.type === 'boss' ? 8 : 1; game.kills++; addPulse(e.type === 'boss' ? 45 : 5);
        textPop(`+${gain}`, e.x, e.y, '#fff');
        if (Math.random() < .45) spawnShard(e.x, e.y, 2);
        beep(420 + Math.min(500, game.combo * 18), 'triangle', .04, .025);
      }
      continue;
    }
    if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
      if (game.dashTime > 0) {
        game.enemies.splice(i, 1);
        const gain = Math.floor(18 * Math.min(game.combo, 30));
        game.score += gain; game.combo = Math.min(40, game.combo + .35); game.comboTimer = 3.4; game.xp += 2; game.kills++; game.dashKills++; addPulse(8);
        burst(e.x, e.y, '#67ffb0', 18);
        textPop('DASH KILL', e.x, e.y, '#67ffb0');
        beep(680, 'triangle', .06, .025);
      } else {
        game.enemies.splice(i, 1);
        damage();
      }
    }
  }

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -40 || b.x > w + 40 || b.y < -40 || b.y > h + 40) { game.bullets.splice(i, 1); continue; }

    let cut = false;
    for (const blade of bladePositions) {
      if (Math.hypot(b.x - blade.x, b.y - blade.y) < b.r + blade.r + 7) { cut = true; break; }
    }
    if (cut) {
      game.bullets.splice(i, 1);
      game.score += Math.floor(3 * Math.min(game.combo, 25));
      game.bulletsCut++; addPulse(2);
      game.combo = Math.min(40, game.combo + .06);
      game.comboTimer = Math.max(game.comboTimer, 1.4);
      burst(b.x, b.y, '#62e9ff', 10);
      if (!lowPower()) textPop('CUT', b.x, b.y, '#62e9ff');
      beep(540, 'triangle', .035, .018);
      continue;
    }

    if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) { game.bullets.splice(i, 1); damage(); continue; }
  }

  for (let i = game.zones.length - 1; i >= 0; i--) {
    const z = game.zones[i];
    z.life -= dt;
    if (z.life <= 0) { game.zones.splice(i, 1); continue; }
    if (z.life < z.hot && Math.hypot(z.x - p.x, z.y - p.y) < z.r + p.r) { game.zones.splice(i, 1); damage(); }
  }

  for (let i = game.shards.length - 1; i >= 0; i--) {
    const s = game.shards[i];
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < game.magnet) { s.vx += (p.x - s.x) / (d || 1) * 560 * dt; s.vy += (p.y - s.y) / (d || 1) * 560 * dt; }
    s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .96; s.vy *= .96; s.pulse += dt * 5;
    if (d < p.r + s.r + 4) {
      game.shards.splice(i, 1);
      game.xp += s.value; game.shardsCollected += s.value; addPulse(.8 * s.value); game.score += Math.floor(4 * game.combo); game.comboTimer = 3.2;
      burst(s.x, s.y, '#ffe985', 8); beep(760, 'sine', .035, .02);
    }
  }

  checkMission();

  if (game.xp >= game.xpNeed) {
    game.xp -= game.xpNeed; game.level++; game.xpNeed = Math.ceil(game.xpNeed * 1.35 + 3);
    if (game.level % 4 === 0 && game.bossLevel !== game.level) { game.bossLevel = game.level; spawnEnemy('boss'); textPop('БОСС ВЫШЕЛ', game.player.x, game.player.y - 76, '#62e9ff'); }
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
  const starCount = lowPower() ? 8 : 48;
  for (let i = 0; i < starCount; i++) {
    const x = (i * 137.5 + game.time * .012) % (w + 120) - 60;
    const y = (i * 91.7 + Math.sin(game.time * .0005 + i) * 40) % (h + 120) - 60;
    ctx.fillStyle = `rgba(98,233,255,${0.04 + (i % 5) * .015})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + (i % 4), 0, Math.PI * 2); ctx.fill();
  }

  for (const z of game.zones) {
    const ready = z.life < z.hot;
    ctx.globalAlpha = ready ? .36 : .16;
    ctx.fillStyle = ready ? '#ff526d' : '#ffe985';
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 + Math.sin(game.time * .01) * .04), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ready ? '#ff526d' : '#ffe985'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
  }

  for (const s of game.shards) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.pulse);
    ctx.shadowColor = '#ffe985'; ctx.shadowBlur = glow(18); ctx.fillStyle = '#ffe985';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, 0); ctx.lineTo(0, 9); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  for (const e of game.enemies) {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
    ctx.shadowColor = e.color; ctx.shadowBlur = glow(20); ctx.strokeStyle = e.color; ctx.lineWidth = lowPower() ? 2 : 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const rr = i % 2 ? e.r * .72 : e.r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke();
    if (e.type === 'piercer') { ctx.globalAlpha = e.phase ? .26 : .62; ctx.fillStyle = e.phase ? '#67ffb0' : 'rgba(103,255,176,.45)'; ctx.fill(); ctx.globalAlpha = 1; }
    if (e.type === 'boss') { ctx.globalAlpha = .18; ctx.fillStyle = '#62e9ff'; ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(-e.r, -e.r - 12, e.r * 2 * Math.max(0, e.hp / (34 + game.level * 8)), 4); }
    ctx.restore();
  }

  for (const s of game.shots) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }

  for (const b of game.bullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }

  const p = game.player;
  ctx.strokeStyle = `rgba(98,233,255,${.18 + game.xp / game.xpNeed * .24})`; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(p.x, p.y, 66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (game.xp / game.xpNeed)); ctx.stroke();

  for (let i = 0; i < game.blades; i++) {
    const a = p.angle + i / game.blades * Math.PI * 2;
    const bx = p.x + Math.cos(a) * 54, by = p.y + Math.sin(a) * 54;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a + Math.PI / 4);
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = glow(25); ctx.fillStyle = '#ffffff';
    ctx.fillRect(-13, -4, 26, 8); ctx.fillStyle = '#62e9ff'; ctx.fillRect(-4, -13, 8, 26); ctx.restore();
  }

  ctx.save(); ctx.translate(p.x, p.y);
  ctx.shadowColor = game.shield > 0 ? '#67ffb0' : '#62e9ff'; ctx.shadowBlur = glow(34);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = game.shield > 0 ? '#67ffb0' : '#62e9ff'; ctx.beginPath(); ctx.arc(0, 0, p.r * .58, 0, Math.PI * 2); ctx.fill();
  if (game.shield > 0) { ctx.strokeStyle = '#67ffb0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, p.r + 13, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();

  for (const q of game.particles) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color; ctx.shadowColor = q.color; ctx.shadowBlur = glow(16); ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const t of game.texts) { ctx.fillStyle = t.color; ctx.font = '900 18px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = t.color; ctx.shadowBlur = glow(18); ctx.fillText(t.text, t.x, t.y); }
  ctx.restore();

  scoreEl.textContent = Math.floor(game.score).toLocaleString('ru-RU');
  comboEl.textContent = `x${Math.max(1, game.combo).toFixed(game.combo < 10 ? 1 : 0)}`;
  levelEl.textContent = `${game.level} · ❤${game.hp} ${game.shield ? `⬡${game.shield}` : ''}`;
  if (game.mission) missionEl.textContent = `${game.mission.label} ${Math.min(game.mission.goal, Math.floor(missionProgress()))}/${game.mission.goal}`;
  skillBtn.textContent = game.pulse >= 100 ? '⚡' : `⚡${Math.floor(game.pulse)}`;
  skillBtn.classList.toggle('ready', game.pulse >= 100);
  const boss = game.enemies.find(e => e.type === 'boss');
  bossBar.classList.toggle('active', Boolean(boss));
  if (boss) { const maxHp = 34 + game.level * 8; bossName.textContent = `БОСС УРОВЕНЬ ${game.level}`; bossFill.style.width = `${Math.max(0, Math.min(100, boss.hp / maxHp * 100))}%`; }
}

function loop(t = 0) {
  if (state !== 'playing') return;
  if (t - last < TARGET_FRAME) { raf = requestAnimationFrame(loop); return; }
  const dt = Math.min(.045, (t - last) / 1000 || .022); last = t;
  update(dt); draw();
  if (state === 'playing') raf = requestAnimationFrame(loop);
}
function start() { resetGame(); state = 'playing'; menu.classList.remove('active'); gameOverPanel.classList.remove('active'); pausePanel.classList.remove('active'); last = performance.now(); loop(last); }
function endGame() { state = 'over'; cancelAnimationFrame(raf); saveRecord(game.score); renderRecords(); finalText.textContent = `Ты набрал ${Math.floor(game.score).toLocaleString('ru-RU')} очков, дошёл до ${game.level} уровня и разогнал комбо до x${Math.floor(game.combo)}.`; gameOverPanel.classList.add('active'); }
function pause() { if (state !== 'playing') return; state = 'pause'; cancelAnimationFrame(raf); pausePanel.classList.add('active'); }
function resume() { if (state !== 'pause') return; state = 'playing'; pausePanel.classList.remove('active'); last = performance.now(); loop(last); }

addEventListener('resize', resize);
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (e.code === 'Space') { e.preventDefault(); dash(); } if (e.key.toLowerCase() === 'e') pulseBlast(); if (e.key === 'Escape') state === 'pause' ? resume() : pause(); });
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
document.getElementById('howBtn').onclick = () => alert('Двигайся постоянно: стоять на месте нельзя — игра создаёт опасные зоны и пробивателей клинков. Фиолетовые враги стреляют, но пули можно ломать клинками. Зелёные первые секунды проходят через клинки: пережди мигание или убей их рывком, оранжевые танки живучие. Выполняй миссии, бей боссов, авто-пушка стреляет в курсор/палец, заряжай импульс клавишей E/кнопкой ⚡.');
soundBtn.onclick = () => { muted = !muted; soundBtn.textContent = muted ? '🔇' : '🔊'; beep(520); };
skillBtn.onclick = pulseBlast;

resize(); resetGame(); draw(); renderRecords();
