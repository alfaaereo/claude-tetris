'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - light blue
  '#ffb74d', // L - orange
  '#b0bec5', // N - tuerca (gris metálico)
];

// Paleta más saturada para fondo claro (mismo orden que COLORS)
const COLORS_LIGHT = [
  null,
  '#00acc1', // I
  '#f9a825', // O
  '#8e24aa', // T
  '#43a047', // S
  '#e53935', // Z
  '#1e88e5', // J
  '#fb8c00', // L
  '#607d8b', // N
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (reto): hueco central
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// ---- Skins ----
// Cada skin define sus paletas (por tema; si falta 'light' se usa 'dark') y su
// función de dibujo de bloque. El fondo y la rejilla de los canvas se definen en
// CSS con html[data-skin="..."] (variables --canvas-bg y --grid).
// drawBlock(context, px, py, size, color, alpha): px/py en píxeles. Debe dejar
// el contexto como estaba (globalAlpha = 1, sin sombra).

// Rectángulo con esquinas redondeadas trazado a mano (sin roundRect, por compatibilidad)
function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

const SKINS = {
  retro: {
    // Aspecto clásico: bloques cuadrados, colores planos y franja de brillo
    colors: { dark: COLORS, light: COLORS_LIGHT },
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },
  neon: {
    // Fondo negro en ambos temas: misma paleta fluorescente
    colors: {
      dark: [
        null,
        '#00f0ff', // I
        '#fff200', // O
        '#ff2bd6', // T
        '#39ff14', // S
        '#ff1744', // Z
        '#2979ff', // J
        '#ff9100', // L
        '#d0d8ff', // N - tuerca
      ],
    },
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.shadowColor = color;
      context.shadowBlur = size * 0.5;
      // Contorno luminoso con glow
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 3, py + 3, size - 6, size - 6);
      // Núcleo translúcido
      context.shadowBlur = 0;
      context.globalAlpha = alpha * 0.35;
      context.fillStyle = color;
      context.fillRect(px + 4, py + 4, size - 8, size - 8);
      // Restablecer el contexto para los demás dibujos
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    },
  },
  pastel: {
    colors: {
      dark: [
        null,
        '#a8e6ef', // I
        '#fff1a8', // O
        '#d7b8f3', // T
        '#b5ead7', // S
        '#ffb7b2', // Z
        '#b8d8ff', // J
        '#ffd8a8', // L
        '#d5dbe1', // N - tuerca
      ],
      light: [
        null,
        '#7fd3df', // I
        '#f7dc6f', // O
        '#c39bd3', // T
        '#88d8b0', // S
        '#ff9aa2', // Z
        '#8fbff0', // J
        '#ffc48a', // L
        '#b8c2cc', // N - tuerca
      ],
    },
    drawBlock(context, px, py, size, color, alpha) {
      const r = size * 0.25;
      context.globalAlpha = alpha;
      roundedRectPath(context, px + 2, py + 2, size - 4, size - 4, r);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = 'rgba(0,0,0,0.12)';
      context.lineWidth = 1;
      context.stroke();
      // Brillo suave en la esquina superior
      roundedRectPath(context, px + 5, py + 5, size * 0.4, size * 0.2, size * 0.1);
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fill();
      context.globalAlpha = 1;
    },
  },
  pixel: {
    colors: { dark: COLORS, light: COLORS_LIGHT },
    drawBlock(context, px, py, size, color, alpha) {
      const p = Math.max(1, Math.floor(size / 10)); // tamaño de un "píxel"
      const x = px + 1, y = py + 1, s = size - 2;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(x, y, s, s);
      // Bisel pixelado: luz arriba/izquierda, sombra abajo/derecha
      context.fillStyle = 'rgba(255,255,255,0.4)';
      context.fillRect(x, y, s, p);
      context.fillRect(x, y, p, s);
      context.fillStyle = 'rgba(0,0,0,0.35)';
      context.fillRect(x, y + s - p, s, p);
      context.fillRect(x + s - p, y, p, s);
      // Tramado (dither) en damero dentro del bloque
      context.fillStyle = 'rgba(0,0,0,0.14)';
      const inner = s - 2 * p;
      for (let j = 0; j * p < inner; j++)
        for (let i = (j % 2); i * p < inner; i += 2)
          context.fillRect(x + p + i * p, y + p + j * p,
            Math.min(p, inner - i * p), Math.min(p, inner - j * p));
      context.globalAlpha = 1;
    },
  },
};

const DEFAULT_SKIN = 'retro';
const SKIN_STORAGE_KEY = 'tetris-skin';

function loadSkin() {
  try {
    const saved = localStorage.getItem(SKIN_STORAGE_KEY);
    if (saved && Object.prototype.hasOwnProperty.call(SKINS, saved)) return saved;
  } catch (e) { /* localStorage no disponible */ }
  return DEFAULT_SKIN;
}

function saveSkin(name) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, name);
  } catch (e) { /* localStorage no disponible */ }
}

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

let palette = COLORS;
let skinName = DEFAULT_SKIN;
let gridColor = '#22222e';
let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

// Delega en la función de dibujo de la skin activa (x/y en celdas)
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  SKINS[skinName].drawBlock(context, x * size, y * size, size, palette[colorIndex], alpha ?? 1);
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  // endGame() cancela animId, pero dentro del frame en curso eso no tiene efecto:
  // si la partida terminó en este paso, no reprogramar el bucle
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function setTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = light ? 'Modo oscuro' : 'Modo claro';
  themeBtn.setAttribute('aria-pressed', String(light));
  applyAppearance();
}

// ---- Skins: aplicar ----
// Único punto donde la paleta y la rejilla se eligen en función de (skin, tema)
function applyAppearance() {
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const colors = SKINS[skinName].colors;
  palette = colors[theme] || colors.dark;
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
  // En pausa o game over el bucle está detenido: repintar manualmente
  if (current && next) {
    draw();
    drawNext();
  }
}

function setSkin(name) {
  skinName = Object.prototype.hasOwnProperty.call(SKINS, name) ? name : DEFAULT_SKIN;
  document.documentElement.dataset.skin = skinName;
  skinSelect.value = skinName;
  saveSkin(skinName);
  applyAppearance();
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

themeBtn.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  themeBtn.blur(); // evita que Space active el botón durante la partida
});

// Teclas del juego: no deben cambiar el selector de skin si tiene el foco
const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX', 'KeyP'];

skinSelect.addEventListener('change', () => {
  setSkin(skinSelect.value);
  skinSelect.blur(); // evita que Space y las flechas actúen sobre el selector durante la partida
});

skinSelect.addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code)) {
    e.preventDefault(); // la tecla sigue llegando al manejador del juego en document
    skinSelect.blur();
  }
});

setSkin(loadSkin());
setTheme('dark');
init();
