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

All logic lives in `game.js` (a single classic script, `'use strict'`, no modules). State is module-level `let` globals (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`, …) reset by `resetState()`; `init()` (called by the Jugar/Reiniciar button) resets and starts the loop.

- **Board**: `ROWS × COLS` matrix; `0` = empty, `1–8` = piece type (1–7 are the standard tetrominoes, 8 is the "tuerca": a 3×3 ring with an empty center, a challenge piece drawn with the same probability as the others). The same number indexes `PIECES` and `COLORS` (both have `null` at index 0), so piece shape cells store their own type id, and merging a piece just copies cell values into the board.
- **Pieces**: square matrices; rotation is `rotateCW` (clockwise only) and `tryRotate` applies simple horizontal kicks `[0, -1, 1, -2, 2]`, not SRS.
- **Collision**: `collide(shape, x, y)` is the single source of truth for movement, rotation, ghost (`ghostY`), drops and spawn/game-over detection. Rows above the board (`y < 0`) are allowed.
- **Loop**: `requestAnimationFrame` loop accumulates `dt` into `dropAccum` and steps gravity when it reaches `dropInterval`. Pause and game over stop the loop with `cancelAnimationFrame(animId)`; `resume()` restarts it by calling `loop()`.
- **Lock flow**: `lockPiece()` → `merge()` → `clearLines()` (updates score/lines/level/speed) → `spawn()` (promotes `next`, rolls a new one, ends the game if the spawned piece collides, redraws the preview).
- **Scoring/speed**: `LINE_SCORES[cleared] × level`; soft drop +1 per row, hard drop +2 per row; level = `startLevel + floor(lines / 10)`; `dropInterval = speedFor(level)` = `max(100, 1000 − (level − 1) × 90)` ms. `startLevel` (1–`MAX_START_LEVEL`) comes from the `#start-level` select in the overlay and only applies on the next `init()` (on the start screen it also updates the HUD).
- **DOM coupling**: `game.js` looks up elements by id (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, `resume-btn`, `controls-btn`, `menu-controls`, `start-level`, `theme-toggle`, `skin-select`, `record-msg`, `record-form`, `player-name`, `records`, `records-body`, `best-combo`, `max-lines`, `reset-records-btn`); renaming any in `index.html` breaks it.
- **Overlay / menu**: shared by the start screen, PAUSA and GAME OVER via `showOverlay(mode, title, text)` / `hideOverlay()` (`hidden` class; inner elements use the `hidden` attribute). `data-mode="start"|"pause"|"gameover"` on `#overlay`: `.pause-only` items (Reanudar, Ver controles, controls list) only show in pause; the records table shows everywhere except pause. `P`/`Escape` call `togglePause()` (`pause()`/`resume()`); Escape first closes the controls list if open. While the overlay is open no key reaches the game, and on `resume()`/`init()` every key still held (`heldKeys`) is copied to `blockedKeys` and ignored until its `keyup`, so a key held across the menu doesn't move the piece.
- **Start screen**: on load `resetState()` prepares a game but `started` stays `false` (input ignored) until the Jugar/Reiniciar button calls `init()`.
- **Records**: `localStorage` key `tetris-records` = `{ top: [{name, score, lines, combo}] (max 5, desc), bestCombo, maxLines }`, plus `tetris-player` (last typed name). All storage access is wrapped in try/catch. `endGame()` updates bestCombo/maxLines and, if the score qualifies, keeps it in `pendingEntry` until saved (form submit, or automatically by `init()` on restart). Combo = consecutive locked pieces that clear lines.

- **Theming**: colors live in CSS variables (`:root` = dark default, `[data-theme="light"]` override). `setTheme()` in `game.js` sets `data-theme` and calls `applyVisuals()`, which swaps `palette` (the skin's `dark`/`light` array), caches `--grid` for `drawGrid()` and repaints with `draw()`/`drawNext()` (needed while paused/game over). The choice is not persisted.
- **Skins**: `SKINS` in `game.js` maps a name (`retro`, `neon`, `pastel`, `pixel`) to `{ dark, light, draw }`; `drawBlock()` delegates to the active skin's `draw(context, px, py, size, color)` inside `save()`/`restore()` (so `shadowBlur` etc. don't leak). `setSkin()` sets `data-skin` on `<html>` (CSS uses it, e.g. Neon forces black canvases), persists to `localStorage` (`tetris-skin`) and calls `applyVisuals()`, which both `setSkin` and `setTheme` use to pick the palette (theme × skin), re-read `--grid` and repaint.

## Gotchas

- Canvas sizes are hard-coded in `index.html`: `#board` must be `COLS × BLOCK` by `ROWS × BLOCK` (300×600), and `#next-canvas` (120×120) assumes a 4×4 preview grid of 30 px cells (`NB` in `drawNext`). Change both together.
- Piece generation is plain `Math.random()` (no 7-bag), and there is no hold piece or lock delay.
