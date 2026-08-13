const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const select = document.getElementById('categorySelect');
const spinBtn = document.getElementById('spinBtn');
const resetBtn = document.getElementById('resetBtn');
const removeAfterSpin = document.getElementById('removeAfterSpin');
const resultName = document.getElementById('resultName');
const resultHint = document.getElementById('resultHint');
const categoryCount = document.getElementById('categoryCount');
const categoryTotal = document.getElementById('categoryTotal');
const totalGames = document.getElementById('totalGames');
const legend = document.getElementById('legend');
const toast = document.getElementById('toast');
const helpModal = document.getElementById('helpModal');

const state = {
  rotation: 0,
  spinning: false,
  currentGames: [],
  savedData: structuredClone(GAME_DATA)
};

function fmt(n) {
  return new Intl.NumberFormat('ru-RU').format(n);
}

function populateCategories() {
  select.innerHTML = '';
  for (const [category, games] of Object.entries(state.savedData)) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = `${category} (${games.length})`;
    select.appendChild(option);
  }
  updateCurrentCategory();
}

function currentCategory() {
  return select.value;
}

function updateCurrentCategory() {
  state.currentGames = [...(state.savedData[currentCategory()] || [])];
  resultName.textContent = '—';
  resultHint.textContent = 'Здесь появится выбранная игра';
  categoryTotal.textContent = state.currentGames.length;
  categoryCount.textContent = `${fmt(state.currentGames.length)} вариантов`;
  updateGlobalTotal();
  drawWheel();
}

function updateGlobalTotal() {
  const count = Object.values(state.savedData).reduce((sum, games) => sum + games.length, 0);
  totalGames.textContent = fmt(count);
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function palette(index, count) {
  const hue = Math.round((index / Math.max(count, 1)) * 360 + 150) % 360;
  const light = 28 + (index % 3) * 5;
  return `hsl(${hue} 52% ${light}%)`;
}

function drawWheel() {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth || 760;
  if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;
  ctx.clearRect(0, 0, size, size);

  if (!state.currentGames.length) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1b2422';
    ctx.fill();
    ctx.strokeStyle = '#5f756e';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const n = state.currentGames.length;
  const step = Math.PI * 2 / n;
  const start = state.rotation - Math.PI / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0);

  for (let i = 0; i < n; i++) {
    const a0 = start + i * step;
    const a1 = a0 + step;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, a0, a1);
    ctx.closePath();
    ctx.fillStyle = palette(i, n);
    ctx.fill();
    ctx.strokeStyle = 'rgba(235,243,240,.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Only put labels on slices that have enough room.
    ctx.save();
    ctx.rotate(a0 + step / 2);
    const mid = (radius * 0.59);
    ctx.translate(mid, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#f4faf7';
    ctx.font = `700 ${Math.max(11, Math.min(17, 220 / n))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = state.currentGames[i];
    const short = label.length > 20 ? `${label.slice(0, 18)}…` : label;
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = 3;
    ctx.fillText(short, 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#b6d5cb';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function buildLegend() {
  legend.innerHTML = '';
  const games = state.currentGames;
  const frag = document.createDocumentFragment();
  games.forEach((game, i) => {
    const el = document.createElement('div');
    el.className = 'legend-item';
    el.innerHTML = `<span class="swatch" style="background:${palette(i, games.length)}"></span><span>${escapeHtml(game)}</span>`;
    frag.appendChild(el);
  });
  legend.appendChild(frag);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function spin() {
  if (state.spinning) return;
  const games = state.currentGames;
  if (!games.length) {
    showToast('В этой категории нет игр.');
    return;
  }

  state.spinning = true;
  spinBtn.disabled = true;
  spinBtn.textContent = 'КРУТИМ…';
  resultName.textContent = '…';
  resultHint.textContent = 'Колесо выбирает игру';

  const n = games.length;
  const winner = Math.floor(Math.random() * n);
  const step = Math.PI * 2 / n;
  // Pointer is at the top. Slice center should end at -PI/2.
  const target = -(winner * step + step / 2);
  const twoPi = Math.PI * 2;
  const normalized = ((state.rotation % twoPi) + twoPi) % twoPi;
  let delta = target - normalized;
  while (delta < 0) delta += twoPi;
  const turns = 6 + Math.floor(Math.random() * 3);
  const from = state.rotation;
  const to = state.rotation + delta + turns * twoPi;
  const duration = 5100;
  const startTime = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 4);
    state.rotation = from + (to - from) * eased;
    drawWheel();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      state.rotation %= twoPi;
      resultName.textContent = games[winner];
      resultHint.textContent = `Категория: ${currentCategory()}`;
      state.spinning = false;
      spinBtn.disabled = false;
      spinBtn.textContent = 'КРУТИТЬ';
      if (removeAfterSpin.checked) {
        state.savedData[currentCategory()] = games.filter((_, i) => i !== winner);
        updateCurrentCategory();
        buildLegend();
        if (!state.currentGames.length) showToast('Это была последняя игра в категории.');
      }
    }
  }
  requestAnimationFrame(frame);
}

function reset() {
  state.savedData = structuredClone(GAME_DATA);
  populateCategories();
  state.rotation = 0;
  drawWheel();
  buildLegend();
  showToast('Список игр восстановлен.');
}

select.addEventListener('change', () => {
  state.rotation = 0;
  updateCurrentCategory();
  buildLegend();
});
spinBtn.addEventListener('click', spin);
resetBtn.addEventListener('click', reset);
document.getElementById('allCategoriesBtn').addEventListener('click', () => {
  const all = Object.values(state.savedData).flat();
  if (!all.length) return;
  state.savedData['Все игры'] = all;
  const opts = Array.from(select.options);
  if (!opts.some(o => o.value === 'Все игры')) {
    const o = document.createElement('option');
    o.value = 'Все игры';
    o.textContent = `Все игры (${all.length})`;
    select.appendChild(o);
  } else {
    select.querySelector('option[value="Все игры"]').textContent = `Все игры (${all.length})`;
  }
  select.value = 'Все игры';
  state.rotation = 0;
  updateCurrentCategory();
  buildLegend();
  showToast(`Добавлены все игры: ${all.length}`);
});

document.getElementById('editDataBtn').addEventListener('click', () => helpModal.classList.remove('hidden'));
document.getElementById('closeModal').addEventListener('click', () => helpModal.classList.add('hidden'));
helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.add('hidden'); });
window.addEventListener('resize', drawWheel);

populateCategories();
buildLegend();
