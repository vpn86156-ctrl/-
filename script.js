const canvas = document.getElementById('orbCanvas');
const ctx = canvas.getContext('2d');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PARTICLE_COUNT = 28;
let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let animationFrame;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function point() {
  const padding = 120;
  return {
    x: random(-padding, width + padding),
    y: random(-padding, height + padding)
  };
}

function createParticle(index) {
  const start = point();
  const end = point();

  return {
    index,
    radius: random(10, 80),
    alpha: random(0.08, 0.22),
    glow: random(14, 34),
    duration: random(12000, 26000),
    delay: random(-18000, 0),
    start,
    controlOne: point(),
    controlTwo: point(),
    end,
    drift: random(0.0004, 0.0012),
    phase: random(0, Math.PI * 2)
  };
}

function cubicBezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => createParticle(index));
}

function drawOrb(x, y, radius, alpha, glow) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 1.6})`);
  gradient.addColorStop(0.42, `rgba(255, 255, 255, ${alpha})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.72)';
  ctx.shadowBlur = glow;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render(time = 0) {
  ctx.clearRect(0, 0, width, height);

  for (const particle of particles) {
    const raw = ((time + particle.delay) % particle.duration) / particle.duration;
    const t = raw < 0 ? raw + 1 : raw;
    const eased = 0.5 - Math.cos(t * Math.PI * 2) / 2;
    const pos = cubicBezier(eased, particle.start, particle.controlOne, particle.controlTwo, particle.end);
    const floatX = Math.sin(time * particle.drift + particle.phase) * 24;
    const floatY = Math.cos(time * particle.drift * 1.3 + particle.phase) * 18;
    const breath = 0.86 + Math.sin(t * Math.PI * 2 + particle.phase) * 0.14;

    drawOrb(pos.x + floatX, pos.y + floatY, particle.radius * breath, particle.alpha, particle.glow);
  }

  if (!prefersReducedMotion) {
    animationFrame = requestAnimationFrame(render);
  }
}

resize();
render();
window.addEventListener('resize', () => {
  cancelAnimationFrame(animationFrame);
  resize();
  render();
});
