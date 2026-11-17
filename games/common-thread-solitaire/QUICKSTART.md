# Common Thread Solitaire — Quick Start

## Play the Game

### Option 1: Development Server
```bash
cd games/common-thread-solitaire
npm install
npm run dev
```
Opens at `http://localhost:5180`

### Option 2: From Workspace Root
```bash
npm run dev:common-thread
```

### Option 3: Production Build
```bash
cd games/common-thread-solitaire
npm run build
```
Open `../../dist/games/common-thread-solitaire/index.html` in browser

## Game Rules (30 seconds)

1. **Find the connection** — Each level has 3 categories
2. **Drag cards** into slots to group them
3. **Complete sets** — 4 matching cards reveal the category
4. **Win** when all slots are complete

## Controls

- **Mouse/Touch**: Drag cards to move them
- **Keyboard**:
  - `Ctrl/Cmd + Z` — Undo
  - `H` — Hint
  - `Ctrl/Cmd + R` — Restart

## Features

✅ 3 levels with increasing difficulty  
✅ Unlimited undo  
✅ Smart hints  
✅ Audio feedback  
✅ Progress saved automatically  
✅ Star rating (1-3 based on moves)  
✅ Fully accessible  

## File Tour (2 minutes)

```
src/
├── main.ts              ← Game controller (start here)
├── styles.css           ← All visual styles
├── game/
│   ├── types.ts         ← TypeScript interfaces
│   ├── levels.ts        ← Level definitions (add more here!)
│   ├── state.ts         ← Game logic (pure functions)
│   └── storage.ts       ← Save/load to localStorage
├── ui/
│   ├── render.ts        ← DOM updates
│   └── interaction.ts   ← Drag/drop + keyboard
└── audio/
    └── sound.ts         ← Web Audio API
```

## Add a New Level (1 minute)

Edit `src/game/levels.ts`:

```typescript
{
  id: 4,
  name: 'Level 4',
  cards: [
    // Category 1: 4 cards
    { id: 'c37', content: 'Item1', type: 'word', category: 'Category1' },
    { id: 'c38', content: 'Item2', type: 'word', category: 'Category1' },
    { id: 'c39', content: 'Item3', type: 'word', category: 'Category1' },
    { id: 'c40', content: 'Item4', type: 'word', category: 'Category1' },
    // Category 2: 4 cards
    { id: 'c41', content: 'Item5', type: 'word', category: 'Category2' },
    // ... (8 more cards, 2 more categories)
  ],
  slots: [
    { id: 's37', x: 50, y: 100, category: 'Category1' },
    // ... (11 more slots in 3 rows)
  ],
  minMoves: 10,
}
```

Save, refresh — new level appears!

## Customize Colors (30 seconds)

Edit `src/styles.css` at top:

```css
:root {
  --thread: #e8a33d;     /* Golden accent */
  --table-2: #173a42;    /* Background */
  --success: #478060;    /* Complete color */
  /* ... change any color variable */
}
```

## Debug

- Open browser DevTools (F12)
- Check Console for errors
- Use `localStorage.clear()` to reset progress
- TypeScript: `npx tsc --noEmit`

## Deploy

```bash
npm run build
```

Upload `dist/games/common-thread-solitaire/` to any static host:
- Netlify (drag & drop)
- Vercel (zero config)
- GitHub Pages
- Any CDN

No server required — pure static HTML/CSS/JS!

## Get Help

- Read `README.md` — Full documentation
- Read `IMPROVEMENTS.md` — What changed
- Read `MIGRATION_COMPLETE.md` — Technical details
- Check TypeScript errors: `npx tsc --noEmit`
- Check console for runtime errors

## Common Issues

**"Module not found"**  
→ Run `npm install`

**"Port already in use"**  
→ Change port in `vite.config.ts`

**Cards won't drag**  
→ Check browser console for JS errors

**No sound**  
→ Click sound button, or interact with page first (Web Audio API requires user gesture)

**Progress not saving**  
→ Check localStorage is enabled in browser

---

That's it! You're ready to play, modify, and deploy Common Thread Solitaire. 🎮
