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

(() => {
  const PROMO_CODE = 'KANMINE2026';
  const modal = document.getElementById('shopModal');
  const congrats = document.getElementById('congrats');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const variantList = document.getElementById('variantList');
  const promoInput = document.getElementById('promoInput');
  const promoHint = document.getElementById('promoHint');
  const applyPromo = document.getElementById('applyPromo');
  const totalPrice = document.getElementById('totalPrice');
  const discountLine = document.getElementById('discountLine');
  const checkoutButton = document.getElementById('checkoutButton');
  const closeCongrats = document.getElementById('closeCongrats');
  const modalClose = document.querySelector('.modal-close');
  const paymentButtons = [...document.querySelectorAll('.payment-option')];

  const packs = {
    potions: {
      title: 'Элитные зелья KanMine',
      description: 'Открой алхимический арсенал: выбери одно зелье или целый набор для PvP, рейдов и быстрых побегов.',
      items: [
        { emoji: '💪', name: 'Зелье силы II', desc: 'Увеличивает урон — идеальный выбор для жёсткого PvP.', price: 149 },
        { emoji: '⚡', name: 'Зелье скорости II', desc: 'Молниеносные рывки, быстрый фарм и побеги от врагов.', price: 129 },
        { emoji: '❤️', name: 'Зелье исцеления', desc: 'Мгновенно возвращает здоровье в самый опасный момент.', price: 119 },
        { emoji: '✨', name: 'Зелье регенерации', desc: 'Плавно восстанавливает здоровье в затяжных боях.', price: 169 },
        { emoji: '🔥', name: 'Зелье огнестойкости', desc: 'Лава и огонь больше не ломают твои планы.', price: 139 }
      ]
    },
    resources: {
      title: 'Ресурсы и стартовые наборы',
      description: 'Выбери ресурсный буст: от алмазного старта до набора строителя для большой базы.',
      items: [
        { emoji: '💎', name: 'Алмазный кит', desc: 'Алмазы, зачарованная броня и инструменты для мощного старта.', price: 349 },
        { emoji: '🧱', name: 'Кит строителя', desc: 'Редкие блоки, стекло, фонари и декор для стильной базы.', price: 249 },
        { emoji: '⛏️', name: 'Шахтёрский набор', desc: 'Кирки, факелы, еда и ресурсы для глубокого фарма.', price: 199 },
        { emoji: '🌾', name: 'Фермерский буст', desc: 'Семена, спавн-яйца, еда и всё для прибыльной фермы.', price: 179 }
      ]
    },
    keys: {
      title: 'Ключи от кейсов',
      description: 'Открывай кейсы и выбивай редкие ресурсы, косметику и привилегии.',
      items: [
        { emoji: '🗝️', name: '3 обычных ключа', desc: 'Быстрый шанс на полезный лут каждый день.', price: 99 },
        { emoji: '🔑', name: '5 редких ключей', desc: 'Больше шансов на ценные предметы и усиления.', price: 299 },
        { emoji: '👑', name: 'Легендарный ключ', desc: 'Премиум-кейс с самым сочным дропом.', price: 499 },
        { emoji: '🎁', name: 'Микс ключей', desc: 'Обычные, редкие и легендарный ключ в одном наборе.', price: 699 }
      ]
    },
    kits: {
      title: 'Боевые киты',
      description: 'Подбери готовый комплект под задачу: арена, рейд, выживание или зачистка данжей.',
      items: [
        { emoji: '⚔️', name: 'PvP кит', desc: 'Меч, броня, яблоки и зелья для уверенной дуэли.', price: 399 },
        { emoji: '🛡️', name: 'Рейдовый кит', desc: 'Взрывной набор, броня и расходники для штурма баз.', price: 549 },
        { emoji: '🏕️', name: 'Кит выживания', desc: 'Еда, инструменты, броня и полезные мелочи для старта.', price: 229 },
        { emoji: '🐉', name: 'Данж-мастер', desc: 'Сильная экипировка и расходники для опасных приключений.', price: 649 }
      ]
    }
  };

  let currentItems = [];
  let selectedIndex = 0;
  let discountApplied = false;
  let selectedPayment = 'СБП';

  function formatPrice(value) {
    return `${value.toLocaleString('ru-RU')} руб.`;
  }

  function getSelectedItem() {
    return currentItems[selectedIndex] || currentItems[0];
  }

  function updateTotal() {
    const item = getSelectedItem();
    if (!item) return;

    if (discountApplied) {
      totalPrice.textContent = '0 руб.';
      discountLine.textContent = `Промокод KanMine2026: −${formatPrice(item.price)}`;
      checkoutButton.textContent = 'Забрать бесплатно';
      return;
    }

    totalPrice.textContent = formatPrice(item.price);
    discountLine.textContent = 'Скидка не применена';
    checkoutButton.textContent = `Перейти к оплате: ${selectedPayment}`;
  }

  function resetPromo() {
    discountApplied = false;
    promoInput.value = '';
    promoHint.className = 'promo-hint';
    promoHint.innerHTML = 'Промокод <strong>KanMine2026</strong> даёт скидку 100%.';
  }

  function renderVariants(items) {
    variantList.innerHTML = '';
    currentItems = items;
    selectedIndex = 0;

    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = `variant-card${index === 0 ? ' active' : ''}`;
      button.type = 'button';
      button.innerHTML = `
        <span class="variant-emoji">${item.emoji || '✦'}</span>
        <span><strong>${item.name}</strong><small>${item.desc}</small></span>
        <span class="variant-price">${formatPrice(item.price)}</span>
      `;
      button.addEventListener('click', () => {
        selectedIndex = index;
        document.querySelectorAll('.variant-card').forEach(card => card.classList.remove('active'));
        button.classList.add('active');
        updateTotal();
      });
      variantList.appendChild(button);
    });

    updateTotal();
  }

  function openModal({ title, description, items }) {
    modalTitle.textContent = title;
    modalDescription.textContent = description;
    resetPromo();
    renderVariants(items);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => promoInput.focus({ preventScroll: true }), 120);
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showCongrats() {
    congrats.classList.add('active');
    congrats.setAttribute('aria-hidden', 'false');
    launchConfetti();
  }

  function hideCongrats() {
    congrats.classList.remove('active');
    congrats.setAttribute('aria-hidden', 'true');
  }

  function launchConfetti() {
    const colors = ['#ffffff', '#e0e0e0', '#b0b0b0', '#f7f7f7'];
    for (let i = 0; i < 90; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.35}s`;
      piece.style.setProperty('--confetti-x', `${(Math.random() - 0.5) * 240}px`);
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 3200);
    }
  }

  document.querySelectorAll('.js-buy').forEach(button => {
    button.addEventListener('click', () => {
      const product = button.dataset.product;
      const price = Number(button.dataset.price);
      openModal({
        title: `Покупка ранга ${product}`,
        description: 'Выбери удобную оплату: СБП, карта, крипта или кошелёк. После оплаты ранг активируется на аккаунте.',
        items: [{ emoji: '👑', name: product, desc: 'Премиум-привилегия KanMine с мощными бонусами и статусом.', price }]
      });
    });
  });

  document.querySelectorAll('.js-open-pack').forEach(button => {
    button.addEventListener('click', () => {
      const pack = packs[button.dataset.pack];
      if (pack) {
        openModal({ title: pack.title, description: pack.description, items: pack.items });
      }
    });
  });

  paymentButtons.forEach(button => {
    button.addEventListener('click', () => {
      paymentButtons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      selectedPayment = button.dataset.payment;
      updateTotal();
    });
  });

  applyPromo.addEventListener('click', () => {
    const value = promoInput.value.trim().toUpperCase();
    if (value === PROMO_CODE) {
      discountApplied = true;
      promoHint.className = 'promo-hint success';
      promoHint.textContent = 'Готово! Скидка 100% применена. Это чистый ванильный jackpot!';
      updateTotal();
      showCongrats();
      return;
    }

    discountApplied = false;
    promoHint.className = 'promo-hint error';
    promoHint.textContent = 'Промокод не найден. Проверь написание: KanMine2026';
    updateTotal();
  });

  promoInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      applyPromo.click();
    }
  });

  checkoutButton.addEventListener('click', () => {
    if (discountApplied) {
      showCongrats();
      return;
    }

    const item = getSelectedItem();
    promoHint.className = 'promo-hint success';
    promoHint.textContent = `Выбран способ «${selectedPayment}» для товара «${item.name}». Здесь подключается реальная оплата.`;
  });

  modalClose.addEventListener('click', closeModal);
  closeCongrats.addEventListener('click', hideCongrats);

  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  congrats.addEventListener('click', event => {
    if (event.target === congrats) hideCongrats();
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal();
      hideCongrats();
    }
  });
})();
