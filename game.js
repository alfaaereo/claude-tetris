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

let palette = COLORS;
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
  trackCombo(cleared);
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

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = palette[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
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

  // Antes de la primera partida (pantalla de inicio) no hay pieza activa
  if (!current) return;

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
  onGameOverRecords();
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
  palette = light ? COLORS_LIGHT : COLORS;
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
  // En pausa o game over el bucle está detenido: repintar manualmente
  // (en la pantalla de inicio solo existe el tablero vacío)
  if (board) draw();
  if (next) drawNext();
}

// ---- Records ----
// Tabla de récords local en localStorage: top 5 + mejor combo + líneas máximas.
// Toda lectura/escritura va en try/catch: si el almacenamiento falla o está
// corrupto se usan récords vacíos (en memoria) y el juego sigue funcionando.

const RECORDS_KEY = 'tetris-records';
const RECORDS_TOP = 5;
const NAME_MAX = 12;
const DEFAULT_NAME = 'Jugador';
const RESET_CONFIRM_MS = 3000;
const NAME_FOCUS_DELAY_MS = 500; // margen para que las teclas de juego aún pulsadas no escriban en el nombre

const startScreen = document.getElementById('start-screen');
const startRecordsTable = document.getElementById('start-records-table');
const playBtn = document.getElementById('play-btn');
const overlayRecords = document.getElementById('overlay-records');
const overlayRecordsTable = document.getElementById('overlay-records-table');
const newRecordMsg = document.getElementById('new-record-msg');
const recordForm = document.getElementById('record-form');
const playerNameInput = document.getElementById('player-name');
const resetRecordBtns = document.querySelectorAll('.reset-records-btn');

let records = loadRecords();
let combo = 0;              // bloqueos consecutivos que han limpiado líneas
let maxComboThisGame = 0;
let pendingRecord = null;   // puntuación que entra en el top, a la espera del nombre
let highlightEntry = null;  // fila recién guardada (para resaltarla)
let lastPlayerName = DEFAULT_NAME;
let nameFocusTimer = null;

playerNameInput.maxLength = NAME_MAX;

function emptyRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function toNonNegInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function sanitizeName(name) {
  const s = typeof name === 'string' ? name.trim().slice(0, NAME_MAX) : '';
  return s || DEFAULT_NAME;
}

function sortTop(top) {
  return top.sort((a, b) => b.score - a.score).slice(0, RECORDS_TOP);
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return emptyRecords();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return emptyRecords();
    const top = Array.isArray(data.top)
      ? data.top
          .filter(e => e && typeof e === 'object')
          .map(e => ({
            name: sanitizeName(e.name),
            score: toNonNegInt(e.score),
            lines: toNonNegInt(e.lines),
            level: Math.max(1, toNonNegInt(e.level)),
            date: typeof e.date === 'string' ? e.date.slice(0, 32) : '',
          }))
      : [];
    return {
      top: sortTop(top),
      bestCombo: toNonNegInt(data.bestCombo),
      maxLines: toNonNegInt(data.maxLines),
    };
  } catch {
    return emptyRecords();
  }
}

function saveRecords() {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Sin almacenamiento disponible: los récords quedan solo en memoria
  }
}

// Llamada desde clearLines() tras cada bloqueo de pieza
function trackCombo(cleared) {
  combo = cleared ? combo + 1 : 0;
  if (combo > maxComboThisGame) maxComboThisGame = combo;
}

function qualifiesForTop(points) {
  if (points <= 0) return false;
  const top = records.top;
  return top.length < RECORDS_TOP || points > top[top.length - 1].score;
}

function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('es-ES');
}

// Construye la tabla con DOM + textContent (los nombres nunca pasan por innerHTML)
function renderRecords(container) {
  container.replaceChildren();
  if (!records.top.length) {
    const empty = document.createElement('p');
    empty.className = 'records-empty';
    empty.textContent = 'Sin récords todavía';
    container.appendChild(empty);
  } else {
    const table = document.createElement('table');
    table.className = 'records-table';
    const head = table.createTHead().insertRow();
    for (const [text, cls] of [['#', ''], ['NOMBRE', 'col-name'], ['PUNTOS', ''], ['LÍNEAS', ''], ['NIVEL', '']]) {
      const th = document.createElement('th');
      th.textContent = text;
      if (cls) th.className = cls;
      head.appendChild(th);
    }
    const body = table.createTBody();
    records.top.forEach((entry, i) => {
      const row = body.insertRow();
      if (entry === highlightEntry) row.className = 'highlight';
      row.title = formatDate(entry.date);
      const cells = [i + 1, entry.name, entry.score.toLocaleString(), entry.lines, entry.level];
      cells.forEach((value, j) => {
        const td = row.insertCell();
        td.textContent = String(value);
        if (j === 1) td.className = 'col-name';
      });
    });
    container.appendChild(table);
  }
  const stats = document.createElement('p');
  stats.className = 'records-stats';
  const addStat = (label, value) => {
    stats.append(label);
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    stats.appendChild(strong);
  };
  addStat('Mejor combo: ', records.bestCombo);
  stats.append(' · ');
  addStat('Líneas máx.: ', records.maxLines);
  container.appendChild(stats);
}

function renderAllRecords() {
  renderRecords(startRecordsTable);
  renderRecords(overlayRecordsTable);
}

function showStartScreen() {
  board = createBoard();
  draw();
  renderRecords(startRecordsTable);
  startScreen.classList.remove('hidden');
  playBtn.focus(); // Enter/Space inician la partida
}

// Llamada desde init(): limpia el estado de récords de la partida anterior
function resetRecordsState() {
  // Si se reinicia sin pulsar Guardar, el récord se guarda con el nombre escrito
  if (pendingRecord) savePendingRecord();
  clearTimeout(nameFocusTimer);
  resetRecordBtns.forEach(disarmResetBtn);
  combo = 0;
  maxComboThisGame = 0;
  pendingRecord = null;
  highlightEntry = null;
  overlayRecords.hidden = true;
  newRecordMsg.hidden = true;
  recordForm.hidden = true;
  startScreen.classList.add('hidden');
}

// Llamada desde endGame()
function onGameOverRecords() {
  records = loadRecords(); // releer por si otra pestaña los cambió
  records.bestCombo = Math.max(records.bestCombo, maxComboThisGame);
  records.maxLines = Math.max(records.maxLines, lines);
  saveRecords();

  highlightEntry = null;
  const isNew = qualifiesForTop(score);
  pendingRecord = isNew ? { score, lines, level } : null;
  newRecordMsg.hidden = !isNew;
  recordForm.hidden = !isNew;
  overlayRecordsTable.hidden = isNew; // la tabla aparece tras guardar el nombre
  renderRecords(overlayRecordsTable);
  overlayRecords.hidden = false;
  if (isNew) {
    playerNameInput.value = lastPlayerName;
    // Foco diferido: si el jugador sigue pulsando Space/X al perder, no sobrescribe el nombre
    clearTimeout(nameFocusTimer);
    nameFocusTimer = setTimeout(() => {
      if (!pendingRecord) return;
      playerNameInput.focus();
      playerNameInput.select();
    }, NAME_FOCUS_DELAY_MS);
  }
}

function savePendingRecord() {
  if (!pendingRecord) return;
  const name = sanitizeName(playerNameInput.value);
  lastPlayerName = name;
  const entry = { name, ...pendingRecord, date: new Date().toISOString() };
  pendingRecord = null;
  clearTimeout(nameFocusTimer);
  records = loadRecords(); // releer por si otra pestaña los cambió
  records.top.push(entry);
  records.top = sortTop(records.top);
  highlightEntry = entry;
  saveRecords();
  recordForm.hidden = true;
  playerNameInput.blur();
  overlayRecordsTable.hidden = false;
  renderAllRecords();
}

// Ignora las teclas del juego mientras se escribe el nombre o en la pantalla de inicio
function recordsBlocksKeys(e) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return true;
  return !startScreen.classList.contains('hidden');
}

recordForm.addEventListener('submit', e => {
  e.preventDefault();
  savePendingRecord();
});

playBtn.addEventListener('click', () => {
  playBtn.blur(); // evita que Space vuelva a activar el botón durante la partida
  init();
});

// Borrado en dos pasos: el primer clic pide confirmación durante unos segundos
const RESET_LABEL = 'Borrar récords';
const resetTimers = new Map();

function disarmResetBtn(btn) {
  clearTimeout(resetTimers.get(btn));
  delete btn.dataset.confirm;
  btn.textContent = RESET_LABEL;
}

resetRecordBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!btn.dataset.confirm) {
      btn.dataset.confirm = '1';
      btn.textContent = '¿Seguro? Pulsa otra vez';
      resetTimers.set(btn, setTimeout(() => disarmResetBtn(btn), RESET_CONFIRM_MS));
      return;
    }
    disarmResetBtn(btn);
    btn.blur();
    records = emptyRecords();
    highlightEntry = null;
    saveRecords();
    renderAllRecords();
  });
});

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
  resetRecordsState();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (recordsBlocksKeys(e)) return;
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

restartBtn.addEventListener('click', () => {
  restartBtn.blur(); // evita que Space vuelva a activar el botón durante la partida
  init();
});

themeBtn.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  themeBtn.blur(); // evita que Space active el botón durante la partida
});

setTheme('dark');
showStartScreen();
