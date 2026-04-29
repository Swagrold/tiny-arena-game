const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const healthEl = document.getElementById('health');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const relicsEl = document.getElementById('relics');
const statusEl = document.getElementById('status');

const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

const state = {
  mode: 'start', // start, playing, gameover, victory
  score: 0,
  wave: 1,
  relics: 0,
  waveKills: 0,
  relicGoal: 3,
  particles: [],
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 13,
  speed: 3,
  health: 100,
  fireCooldown: 0,
};

let playerShots = [];
let enemies = [];
let enemyShots = [];
let pickups = [];

// ---- Input ----
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (e.key === 'Enter' && state.mode === 'start') startGame();
  if (key === 'r' && (state.mode === 'gameover' || state.mode === 'victory')) startGame();
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.mode === 'playing') shootEmber();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
});

canvas.addEventListener('mousedown', () => {
  mouse.down = true;
  if (state.mode === 'playing') shootEmber();
});
window.addEventListener('mouseup', () => (mouse.down = false));

function startGame() {
  state.mode = 'playing';
  state.score = 0;
  state.wave = 1;
  state.relics = 0;
  state.waveKills = 0;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = 100;
  player.fireCooldown = 0;
  playerShots = [];
  enemies = [];
  enemyShots = [];
  pickups = [];
  state.particles = [];
  spawnWave();
  setStatus('Wave 1 begins. Defend the shrine.');
  updateHud();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateHud() {
  healthEl.textContent = Math.max(0, Math.floor(player.health));
  scoreEl.textContent = state.score;
  waveEl.textContent = state.wave;
  relicsEl.textContent = state.relics;
}

// ---- Player movement and shooting ----
function updatePlayer() {
  const up = keys['w'] || keys['arrowup'];
  const down = keys['s'] || keys['arrowdown'];
  const left = keys['a'] || keys['arrowleft'];
  const right = keys['d'] || keys['arrowright'];

  let vx = 0;
  let vy = 0;
  if (up) vy -= 1;
  if (down) vy += 1;
  if (left) vx -= 1;
  if (right) vx += 1;

  if (vx || vy) {
    const len = Math.hypot(vx, vy) || 1;
    player.x += (vx / len) * player.speed;
    player.y += (vy / len) * player.speed;
  }

  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  player.fireCooldown = Math.max(0, player.fireCooldown - 1);
  if (mouse.down && player.fireCooldown === 0) shootEmber();
}

function shootEmber() {
  if (player.fireCooldown > 0) return;
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 7;

  playerShots.push({
    x: player.x,
    y: player.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    radius: 4,
    life: 70,
  });

  player.fireCooldown = 8;
  spawnParticles(player.x, player.y, '#fb923c', 5, 1.8);
}

// ---- Enemy spawning and waves ----
function spawnWave() {
  const count = 3 + state.wave * 2;
  for (let i = 0; i < count; i++) {
    const typeRoll = Math.random();
    let type = 'guard';
    if (typeRoll > 0.7) type = 'archer';
    if (typeRoll > 0.9) type = 'scout';
    enemies.push(createEnemy(type));
  }
}

function createEnemy(type) {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = Math.random() * canvas.width;
    y = -20;
  } else if (edge === 1) {
    x = canvas.width + 20;
    y = Math.random() * canvas.height;
  } else if (edge === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + 20;
  } else {
    x = -20;
    y = Math.random() * canvas.height;
  }

  if (type === 'archer') {
    return { type, x, y, r: 14, speed: 1, hp: 36, shootTimer: 80 };
  }
  if (type === 'scout') {
    return { type, x, y, r: 9, speed: 2.5 + state.wave * 0.1, hp: 10, shootTimer: 0 };
  }
  return { type: 'guard', x, y, r: 12, speed: 1.6 + state.wave * 0.05, hp: 18, shootTimer: 0 };
}

// ---- Enemy AI ----
function updateEnemies() {
  for (const e of enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.type === 'archer' && dist < 180) {
      e.x -= (dx / dist) * 0.5;
      e.y -= (dy / dist) * 0.5;
    } else {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
    }

    if (dist < e.r + player.radius) {
      player.health -= e.type === 'scout' ? 0.45 : 0.35;
      spawnParticles(player.x, player.y, '#22d3ee', 2, 1);
    }

    if (e.type === 'archer') {
      e.shootTimer -= 1;
      if (e.shootTimer <= 0) {
        shootDarkBolt(e);
        e.shootTimer = Math.max(40, 90 - state.wave * 4);
      }
    }
  }
}

function shootDarkBolt(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  enemyShots.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / len) * 3.5,
    vy: (dy / len) * 3.5,
    r: 5,
    life: 130,
  });
  spawnParticles(enemy.x, enemy.y, '#a78bfa', 4, 1.2);
}

// ---- Collisions ----
function updateProjectiles() {
  for (const b of playerShots) {
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;
  }
  for (const b of enemyShots) {
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;
  }

  playerShots = playerShots.filter((b) => b.life > 0 && inBounds(b.x, b.y, 20));
  enemyShots = enemyShots.filter((b) => b.life > 0 && inBounds(b.x, b.y, 20));

  for (let i = playerShots.length - 1; i >= 0; i--) {
    const b = playerShots[i];
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.r) {
        e.hp -= 10;
        hit = true;
        spawnParticles(e.x, e.y, '#fb7185', 5, 1.6);
        if (e.hp <= 0) killEnemy(j);
        break;
      }
    }
    if (hit) playerShots.splice(i, 1);
  }

  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const b = enemyShots[i];
    if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.radius) {
      player.health -= 7;
      enemyShots.splice(i, 1);
      spawnParticles(player.x, player.y, '#22d3ee', 8, 2);
    }
  }
}

function killEnemy(i) {
  const e = enemies[i];
  state.score += e.type === 'archer' ? 30 : e.type === 'scout' ? 15 : 20;
  state.waveKills += 1;
  spawnParticles(e.x, e.y, '#f59e0b', 12, 2.4);

  if (Math.random() < 0.23) {
    pickups.push({ x: e.x, y: e.y, r: 7, type: 'relic' });
  }
  enemies.splice(i, 1);
}

// ---- Pickups ----
function updatePickups() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (Math.hypot(p.x - player.x, p.y - player.y) < p.r + player.radius) {
      player.health = Math.min(100, player.health + 14);
      state.relics += 1;
      pickups.splice(i, 1);
      setStatus('Relic recovered. Shrine energy rises.');
      spawnParticles(player.x, player.y, '#84cc16', 14, 2.2);
    }
  }
}

function checkWaveProgress() {
  if (enemies.length === 0) {
    state.wave += 1;
    state.waveKills = 0;
    if (state.wave > 6 && state.relics >= state.relicGoal) {
      state.mode = 'victory';
      setStatus('Shrine unlocked! You have survived the Ember Arena. Press R to play again.');
      return;
    }
    spawnWave();
    if (state.wave >= 4) {
      setStatus('Relic objective active: gather 3 relics to unlock shrine.');
    } else {
      setStatus(`Wave ${state.wave} begins.`);
    }
  }
}

// ---- Particles ----
function spawnParticles(x, y, color, amount, speed) {
  for (let i = 0; i < amount; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 25, color });
  }
}

function updateParticles() {
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= 1;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function inBounds(x, y, pad = 0) {
  return x >= -pad && y >= -pad && x <= canvas.width + pad && y <= canvas.height + pad;
}

// ---- Game states and frame update ----
function update() {
  if (state.mode !== 'playing') return;

  updatePlayer();
  updateEnemies();
  updateProjectiles();
  updatePickups();
  updateParticles();
  checkWaveProgress();

  if (player.health <= 0) {
    state.mode = 'gameover';
    setStatus(`Game Over. Final Score: ${state.score}. Press R to restart.`);
  }

  updateHud();
}

function drawArena() {
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // subtle stone/grid pattern
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const ang = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(ang);

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // small blade / aim direction marker
  ctx.fillStyle = '#a5f3fc';
  ctx.fillRect(player.radius - 1, -3, 14, 6);
  ctx.restore();
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.type === 'guard') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'archer') {
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
    } else {
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.r);
      ctx.lineTo(e.x + e.r, e.y);
      ctx.lineTo(e.x, e.y + e.r);
      ctx.lineTo(e.x - e.r, e.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawProjectiles() {
  for (const b of playerShots) {
    const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 8);
    g.addColorStop(0, '#fde68a');
    g.addColorStop(1, '#f97316');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#7c3aed';
  for (const b of enemyShots) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups() {
  for (const p of pickups) {
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 11);
    g.addColorStop(0, '#fef08a');
    g.addColorStop(1, '#65a30d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + Math.sin(Date.now() * 0.01) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 25);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawOverlays() {
  if (state.mode === 'start') {
    ctx.fillStyle = 'rgba(3, 7, 18, 0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Hashashin Ember Arena', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '22px Arial';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('WASD move. Mouse aim. Click shoot. Survive the shrine.', canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Press Enter to begin', canvas.width / 2, canvas.height / 2 + 45);
  }

  if (state.mode === 'gameover' || state.mode === 'victory') {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = state.mode === 'victory' ? '#86efac' : '#fca5a5';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(state.mode === 'victory' ? 'Shrine Unlocked' : 'Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 60);
  }
}

function draw() {
  drawArena();
  drawPickups();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawOverlays();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

setStatus('Press Enter to begin.');
updateHud();
requestAnimationFrame(loop);
