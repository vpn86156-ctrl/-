const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let resizeTimer;
let animationId;

const pointer = {
  x: -9999,
  y: -9999,
  active: false
};

function particleCount() {
  if (reducedMotion) return 42;
  if (window.innerWidth < 520) return 72;
  if (window.innerWidth < 900) return 96;
  return 130;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticle() {
  return {
    x: random(0, width),
    y: random(0, height),
    vx: random(-0.34, 0.34),
    vy: random(-0.34, 0.34),
    radius: random(1.1, 3.2),
    alpha: random(0.24, 0.86),
    pulse: random(0, Math.PI * 2)
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
  particles = Array.from({ length: particleCount() }, createParticle);
}

function updateParticle(particle, time) {
  particle.x += particle.vx;
  particle.y += particle.vy;

  const dx = particle.x - pointer.x;
  const dy = particle.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const influence = pointer.active ? 150 : 105;

  if (distance < influence) {
    const force = (1 - distance / influence) * 1.8;
    const angle = Math.atan2(dy, dx);
    particle.x += Math.cos(angle) * force;
    particle.y += Math.sin(angle) * force;
  }

  particle.vx += Math.sin(time * 0.0004 + particle.pulse) * 0.003;
  particle.vy += Math.cos(time * 0.0005 + particle.pulse) * 0.003;
  particle.vx *= 0.995;
  particle.vy *= 0.995;

  if (particle.x < -20) particle.x = width + 20;
  if (particle.x > width + 20) particle.x = -20;
  if (particle.y < -20) particle.y = height + 20;
  if (particle.y > height + 20) particle.y = -20;
}

function drawParticle(particle, time) {
  const glow = 0.74 + Math.sin(time * 0.002 + particle.pulse) * 0.26;
  const radius = particle.radius * glow;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowColor = 'rgba(88, 220, 255, 0.95)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = `rgba(205, 247, 255, ${particle.alpha})`;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConnections() {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i];
      const b = particles[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < 115) {
        const alpha = (1 - distance / 115) * 0.16;
        ctx.strokeStyle = `rgba(88, 220, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function render(time = 0) {
  ctx.clearRect(0, 0, width, height);

  for (const particle of particles) {
    if (!reducedMotion) updateParticle(particle, time);
    drawParticle(particle, time);
  }

  if (!reducedMotion) drawConnections();
  animationId = requestAnimationFrame(render);
}

function typeText(element, text, speed = 48) {
  return new Promise(resolve => {
    element.textContent = '';
    let index = 0;

    const tick = () => {
      element.textContent = text.slice(0, index);
      index += 1;

      if (index <= text.length) {
        window.setTimeout(tick, speed + Math.random() * 24);
      } else {
        resolve();
      }
    };

    tick();
  });
}

async function bootTyping() {
  const kicker = document.querySelector('.kicker');
  const name = document.getElementById('typedName');
  const meta = document.getElementById('typedMeta');
  const status = document.getElementById('typedStatus');

  if (reducedMotion) {
    kicker.textContent = kicker.dataset.type;
    name.textContent = name.dataset.text;
    meta.textContent = meta.dataset.text;
    status.textContent = status.dataset.text;
    return;
  }

  await typeText(kicker, kicker.dataset.type, 28);
  await typeText(name, name.dataset.text, 72);
  await typeText(meta, meta.dataset.text, 30);
  await typeText(status, status.dataset.text, 44);
}

function createFlash(x, y) {
  const flash = document.createElement('span');
  flash.className = 'flash-ring';
  flash.style.left = `${x}px`;
  flash.style.top = `${y}px`;
  document.body.appendChild(flash);
  window.setTimeout(() => flash.remove(), 760);
}

function initSocialFlash() {
  document.querySelectorAll('.social-link').forEach(link => {
    link.addEventListener('click', event => {
      createFlash(event.clientX, event.clientY);
    });
  });
}

function initEasterEgg() {
  const button = document.getElementById('nameButton');
  const toast = document.getElementById('easterToast');
  let clicks = 0;
  let resetTimer;

  button.addEventListener('click', event => {
    clicks += 1;
    createFlash(event.clientX, event.clientY);
    window.clearTimeout(resetTimer);

    if (clicks >= 5) {
      clicks = 0;
      toast.classList.add('active');
      window.setTimeout(() => toast.classList.remove('active'), 3200);
      document.body.animate(
        [
          { filter: 'brightness(1)' },
          { filter: 'brightness(1.45) saturate(1.4)' },
          { filter: 'brightness(1)' }
        ],
        { duration: 520, easing: 'ease-out' }
      );
      return;
    }

    resetTimer = window.setTimeout(() => {
      clicks = 0;
    }, 1800);
  });
}

window.addEventListener('mousemove', event => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});

window.addEventListener('mouseleave', () => {
  pointer.active = false;
  pointer.x = -9999;
  pointer.y = -9999;
});

window.addEventListener('touchstart', event => {
  const touch = event.touches[0];
  if (!touch) return;
  pointer.x = touch.clientX;
  pointer.y = touch.clientY;
  pointer.active = true;
}, { passive: true });

window.addEventListener('touchmove', event => {
  const touch = event.touches[0];
  if (!touch) return;
  pointer.x = touch.clientX;
  pointer.y = touch.clientY;
}, { passive: true });

window.addEventListener('touchend', () => {
  pointer.active = false;
}, { passive: true });

window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    cancelAnimationFrame(animationId);
    resize();
    render();
  }, 140);
});

resize();
render();
bootTyping();
initSocialFlash();
initEasterEgg();
