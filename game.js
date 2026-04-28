const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

const keys = {};
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

canvas.focus();

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
  canvas.focus();
  requestAnimationFrame(loop);
}

function setKey(e, isDown) {
  const key = e.key.toLowerCase();
  keys[key] = isDown;

  // Keep Safari from scrolling if arrow keys or space are pressed.
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
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
  canvas.focus();

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
  // iPad-friendly ESDF movement:
  // E = up, D = down, S = left, F = right.
  if (keys.e) player.y -= player.speed;
  if (keys.d) player.y += player.speed;
  if (keys.s) player.x -= player.speed;
  if (keys.f) player.x += player.speed;

  // Arrow keys still work on browsers that allow them, but ESDF is the main iPad control.
  if (keys.arrowup) player.y -= player.speed;
  if (keys.arrowdown) player.y += player.speed;
  if (keys.arrowleft) player.x -= player.speed;
  if (keys.arrowright) player.x += player.speed;

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
      return;
    }
  }

  fireballs.forEach((f) => {
    f.x += f.vx;
    f.y += f.vy;
  });

  if (gameOver) return;

  for (let i = fireballs.length - 1; i >= 0; i--) {
    const f = fireballs[i];
    const out =
      f.x < -10 || f.x > canvas.width + 10 || f.y < -10 || f.y > canvas.height + 10;

    if (out) {
      fireballs.splice(i, 1);
      continue;
    }

    if (enemy.alive) {
      const hit = Math.hypot(f.x - enemy.x, f.y - enemy.y) < f.r + enemy.r;
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

  fireballs.forEach((f) => drawCircle(f.x, f.y, f.r, '#fb923c'));
}

function loop() {
  if (gameOver) {
    draw();
    return;
  }

  update();
  draw();

  if (!gameOver && enemy.alive) {
    requestAnimationFrame(loop);
  }
}

requestAnimationFrame(loop);
