# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris in vanilla JavaScript + HTML5 Canvas + CSS. No dependencies, no `package.json`, no bundler/transpiler, no linter, no tests. The README and UI text are in Spanish; keep user-facing strings in Spanish.

## Running

Open `index.html` directly, or serve the folder statically (recommended):

    python -m http.server 8000      # then http://localhost:8000
    npx serve .

There is no build, lint or test step. Verify changes by playing the game in a browser.

## Architecture

All logic lives in `game.js` (a single classic script, `'use strict'`, no modules). State is module-level `let` globals (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`, …) reset by `init()`, which the restart and "Jugar" buttons call.

- **Board**: `ROWS × COLS` matrix; `0` = empty, `1–8` = piece type (1–7 are the standard tetrominoes, 8 is the "tuerca": a 3×3 ring with an empty center, a challenge piece drawn with the same probability as the others). The same number indexes `PIECES` and `COLORS` (both have `null` at index 0), so piece shape cells store their own type id, and merging a piece just copies cell values into the board.
- **Pieces**: square matrices; rotation is `rotateCW` (clockwise only) and `tryRotate` applies simple horizontal kicks `[0, -1, 1, -2, 2]`, not SRS.
- **Collision**: `collide(shape, x, y)` is the single source of truth for movement, rotation, ghost (`ghostY`), drops and spawn/game-over detection. Rows above the board (`y < 0`) are allowed.
- **Loop**: `requestAnimationFrame` loop accumulates `dt` into `dropAccum` and steps gravity when it reaches `dropInterval`. Pause and game over stop the loop with `cancelAnimationFrame(animId)`; unpausing restarts it by calling `loop()`.
- **Lock flow**: `lockPiece()` → `merge()` → `clearLines()` (updates score/lines/level/speed) → `spawn()` (promotes `next`, rolls a new one, ends the game if the spawned piece collides, redraws the preview).
- **Scoring/speed**: `LINE_SCORES[cleared] × level`; soft drop +1 per row, hard drop +2 per row; level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 − (level − 1) × 90)` ms.
- **DOM coupling**: `game.js` looks up elements by id (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, `theme-toggle`, plus the records ones: `start-screen`, `start-records-table`, `play-btn`, `overlay-records`, `overlay-records-table`, `new-record-msg`, `record-form`, `player-name`, and the class `reset-records-btn`); renaming any in `index.html` breaks it. The overlay is shared by the PAUSA and GAME OVER states and shown/hidden with the `hidden` class; inner record elements use the `hidden` attribute (`[hidden]` forces `display: none`).
- **Records** (`// ---- Records ----` section): stored in `localStorage` under `tetris-records` as `{ top: [{name, score, lines, level, date}], bestCombo, maxLines }` (top 5, sorted by score). `loadRecords()`/`saveRecords()` wrap storage in try/catch and validate/sanitize the data; corrupt or unavailable storage falls back to empty in-memory records. `clearLines()` calls `trackCombo(cleared)` (`combo` = consecutive line-clearing locks, `maxComboThisGame`); scoring is unaffected. On load the game shows `#start-screen` (top 5 + best combo + max lines, "Jugar" calls `init()`) over an empty board instead of auto-starting, so `draw()` tolerates `current` being undefined. `endGame()` calls `onGameOverRecords()`: updates `bestCombo`/`maxLines` always, and if the score qualifies (> 0) shows "¡Nuevo récord!" plus a name form (max 12 chars, default "Jugador"); saving shows the table with the new row highlighted. The input gets focus after a 500 ms delay (so held game keys don't type into it), and restarting without pressing Guardar saves the record under the typed name. Records are re-read from storage before each write (several tabs open at once). "Borrar récords" asks for a second click within 3 s before clearing. The keydown handler ignores game keys while an input has focus or the start screen is visible (`recordsBlocksKeys`). Names are rendered with `textContent` only.

- **Theming**: colors live in CSS variables (`:root` = dark default, `[data-theme="light"]` override). `setTheme()` in `game.js` sets `data-theme`, swaps `palette` (`COLORS` / `COLORS_LIGHT`), caches `--grid` for `drawGrid()` and repaints with `draw()`/`drawNext()` (needed while paused/game over). The choice is not persisted.

## Gotchas

- Canvas sizes are hard-coded in `index.html`: `#board` must be `COLS × BLOCK` by `ROWS × BLOCK` (300×600), and `#next-canvas` (120×120) assumes a 4×4 preview grid of 30 px cells (`NB` in `drawNext`). Change both together.
- Piece generation is plain `Math.random()` (no 7-bag), and there is no hold piece or lock delay.
