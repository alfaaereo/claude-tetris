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

All logic lives in `game.js` (a single classic script, `'use strict'`, no modules). State is module-level `let` globals (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`, …) reset by `init()`, which the restart button also calls.

- **Board**: `ROWS × COLS` matrix; `0` = empty, `1–8` = piece type (1–7 are the standard tetrominoes, 8 is the "tuerca": a 3×3 ring with an empty center, a challenge piece drawn with the same probability as the others). The same number indexes `PIECES` and `COLORS` (both have `null` at index 0), so piece shape cells store their own type id, and merging a piece just copies cell values into the board.
- **Pieces**: square matrices; rotation is `rotateCW` (clockwise only) and `tryRotate` applies simple horizontal kicks `[0, -1, 1, -2, 2]`, not SRS.
- **Collision**: `collide(shape, x, y)` is the single source of truth for movement, rotation, ghost (`ghostY`), drops and spawn/game-over detection. Rows above the board (`y < 0`) are allowed.
- **Loop**: `requestAnimationFrame` loop accumulates `dt` into `dropAccum` and steps gravity when it reaches `dropInterval`. Pause and game over stop the loop with `cancelAnimationFrame(animId)`; unpausing restarts it by calling `loop()`.
- **Lock flow**: `lockPiece()` → `merge()` → `clearLines()` (updates score/lines/level/speed) → `spawn()` (promotes `next`, rolls a new one, ends the game if the spawned piece collides, redraws the preview).
- **Scoring/speed**: `LINE_SCORES[cleared] × level`; soft drop +1 per row, hard drop +2 per row; level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 − (level − 1) × 90)` ms.
- **DOM coupling**: `game.js` looks up elements by id (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, `theme-toggle`, `skin-select`); renaming any in `index.html` breaks it. The overlay is shared by the PAUSA and GAME OVER states and shown/hidden with the `hidden` class.

- **Theming**: colors live in CSS variables (`:root` = dark default, `[data-theme="light"]` override). `setTheme()` in `game.js` sets `data-theme` and calls `applyAppearance()`. The light/dark choice is not persisted.
- **Skins** (`// ---- Skins ----` section): `SKINS` has `retro`, `neon`, `pastel`, `pixel`; each has `colors` (`{ dark, light? }` arrays indexed like `PIECES`, missing `light` falls back to `dark`) and `drawBlock(context, px, py, size, color, alpha)` in pixels, which must leave the context clean (`globalAlpha = 1`, no shadow). The global `drawBlock(context, x, y, colorIndex, size, alpha)` is only a dispatcher to the active skin. `setSkin()` sets `data-skin` on `<html>`, syncs `#skin-select`, saves to `localStorage` key `tetris-skin` (try/catch; invalid/missing → `retro`) and calls `applyAppearance()`, the single place where `palette = f(skin, theme)` is chosen, `--grid` is cached for `drawGrid()` and `draw()`/`drawNext()` repaint (needed while paused/game over). Canvas background/grid per skin are CSS overrides of `--canvas-bg`/`--grid` under `html[data-skin="…"]` (neon is black in both themes). The select is blurred after a change and swallows game keys so they never change it.

## Gotchas

- Canvas sizes are hard-coded in `index.html`: `#board` must be `COLS × BLOCK` by `ROWS × BLOCK` (300×600), and `#next-canvas` (120×120) assumes a 4×4 preview grid of 30 px cells (`NB` in `drawNext`). Change both together.
- Piece generation is plain `Math.random()` (no 7-bag), and there is no hold piece or lock delay.
