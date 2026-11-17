# Common Thread Solitaire

A relaxing card-matching puzzle game where you find connections between themed items.

## Overview

Sort cards into sets of 4 that share a common theme or category. Each level presents 12 cards (3 sets) that must be organized into their correct groups.

## Features

- **Modern Architecture**: TypeScript + Vite, inspired by Kittydoku's clean structure
- **Improved Graphics**: Smooth animations, card flip effects, and polished UI
- **Audio System**: Procedural sound effects for actions and events
- **Progression**: localStorage save system tracks completed levels and best moves
- **Accessibility**: Keyboard controls, screen reader support, reduced motion
- **Drag & Drop**: Intuitive pointer-based card movement with visual feedback

## Controls

### Mouse/Touch
- **Drag cards** to move them between slots
- **Drop on slot** to group cards by category
- **Drop in empty space** to place freely

### Keyboard
- `Ctrl/Cmd + Z` — Undo last move
- `H` — Show hint
- `Ctrl/Cmd + R` — Restart level

### Buttons
- **Undo** — Take back the last move (unlimited)
- **Hint** — Highlight 2 cards from the same set
- **Restart** — Start the level over

## Game Rules

1. Each level has 3 categories with 4 cards each
2. Group all 4 cards of the same category into a slot
3. When a slot contains 4 matching cards, it completes
4. Complete all slots to finish the level

## Scoring

Stars are awarded based on efficiency:
- ⭐⭐⭐ **3 stars**: Minimum moves (perfect!)
- ⭐⭐ **2 stars**: Within 50% of minimum
- ⭐ **1 star**: Level complete

## Development

```bash
npm install           # Install dependencies
npm run dev           # Start dev server (port 5180)
npm run build         # Build for production
npx tsc --noEmit      # Type check
```

## Technical Stack

- **TypeScript** — Type-safe game logic
- **Vite** — Fast build tool and dev server
- **Web Audio API** — Procedural sound synthesis
- **CSS3** — Modern animations and transitions
- **localStorage** — Progress persistence

## Architecture

```
src/
├── game/
│   ├── types.ts       # TypeScript interfaces
│   ├── levels.ts      # Level definitions
│   ├── state.ts       # Game state management
│   └── storage.ts     # Save/load system
├── ui/
│   ├── render.ts      # DOM rendering
│   └── interaction.ts # Drag/drop + keyboard
├── audio/
│   └── sound.ts       # Audio engine
├── styles.css         # Global styles
└── main.ts            # Application entry point
```

## Credits

Inspired by word association and set-matching games. Completely rewritten from the original single-file jQuery version with modern tooling, improved visuals, and enhanced UX.
