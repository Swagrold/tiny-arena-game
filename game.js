const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const debugEl = document.getElementById('debug');

const keys = {};
let lastKey = 'none';
let score = 0;
let gameOver = false;

const player = {
  x: 120,
  y: 200,
  r: 12,
  speed: 2.6,
  health: 100,
};

const enemy = {
  x: 520,
  y: 200,
  r: 14,
  speed: 1.2,
  alive: true,
};

const fireballs = [];

function updateDebug() {
  const active = Object.keys(keys).filter((key) => keys[key]).join(', ') || 'none';
  debugEl.textContent = `ESDF test build | Last key: ${lastKey} | Active: ${active} | Player: ${Math.round(player.x)}, ${Math.round(player.y)}`;
}

function focusGame() {
  canvas.focus();
  updateDebug();
}

focusGame();
window.addEventListener('load', focusGame);
document.body.addEventListener('pointerdown', focusGame);
canvas.addEventListener('pointerdown', focusGame);

function resetGame() {
  score = 0;
  gameOver = false;
  player.x = 120;
  player.y = 200;
  player.health = 100;
  enemy.x = 520;
  enemy.y = 200;
  enemy.alive = true;
  fireballs.length = 0;
  scoreEl.textContent = score;
  healthEl.textContent = player.health;
  statusEl.textContent = '';
  restartBtn.hidden = true;
  focusGame();
  requestAnimationFrame(loop);
}

function setKey(e, isDown) {
  const key = e.key.toLowerCase();
  keys[key] = isDown;
  lastKey = `${key} ${isDown ? 'down' : 'up'}`;
  updateDebug();

  if (['e', 's', 'd', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

window.addEventListener('keydown', (e) => setKey(e, true), { capture: true });
window.addEventListener('keyup', (e) => setKey(e, false), { capture: true });
document.addEventListener('keydown', (e) => setKey(e, true), { capture: true });
document.addEventListener('keyup', (e) => setKey(e, false), { capture: true });
canvas.addEventListener('keydown', (e) => setKey(e, true));
canvas.addEventListener('keyup', (e) => setKey(e, false));

window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

canvas.addEventListener('pointerdown', (e) => {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  const dx = mx - player.x;
  const dy = my - player.y;
  const len = Math.hypot(dx, dy) || 1;

  fireballs.push({
    x: player.x,
    y: player.y,
    vx: (dx / len) * 5,
    vy: (dy / len) * 5,
    r: 5,
  });
});

restartBtn.addEventListener('click', resetGame);

function update() {
  // Pure ESDF only:
  // E = up, D = down, S = left, F = right.
  if (keys.e) player.y -= player.speed;
  if (keys.d) player.y += player.speed;
  if (keys.s) player.x -= player.speed;
  if (keys.f) player.x += player.speed;

  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));

  if (enemy.alive) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / len) * enemy.speed;
    enemy.y += (dy / len) * enemy.speed;

    const touchDist = player.r + enemy.r;
    if (Math.hypot(dx, dy) < touchDist) {
      player.health -= 0.5;
      healthEl.textContent = Math.max(0, Math.floor(player.health));
    }

    if (player.health <= 0) {
      gameOver = true;
      statusEl.textContent = 'Game Over!';
      restartBtn.hidden = false;
      updateDebug();
      return;
    }
  }

  fireballs.forEach((fireball) => {
    fireball.x += fireball.vx;
    fireball.y += fireball.vy;
  });

  if (gameOver) return;

  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fireball = fireballs[i];
    const out =
      fireball.x < -10 ||
      fireball.x > canvas.width + 10 ||
      fireball.y < -10 ||
      fireball.y > canvas.height + 10;

    if (out) {
      fireballs.splice(i, 1);
      continue;
    }

    if (enemy.alive) {
      const hit = Math.hypot(fireball.x - enemy.x, fireball.y - enemy.y) < fireball.r + enemy.r;
      if (hit) {
        enemy.alive = false;
        fireballs.splice(i, 1);
        score += 1;
        scoreEl.textContent = score;
        statusEl.textContent = 'Enemy defeated! You win. Press Restart to play again.';
        restartBtn.hidden = false;
      }
    }
  }

  updateDebug();
}

function drawCircle(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCircle(player.x, player.y, player.r, '#38bdf8');

  if (enemy.alive) {
    drawCircle(enemy.x, enemy.y, enemy.r, '#ef4444');
  }

  fireballs.forEach((fireball) => drawCircle(fireball.x, fireball.y, fireball.r, '#fb923c'));
}

function loop() {
  if (gameOver) {
    draw();
    return;
  }

  update();
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
