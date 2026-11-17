# Play Common Thread Solitaire

## URLs

### Development (Hot Reload)
```
http://localhost:5180
```
Start with:
```bash
cd games/common-thread-solitaire
npm run dev
```

Or from workspace root:
```bash
npm run dev:common-thread
```

### Production Build (Optimized)
After building:
```bash
npm run build  # from workspace root
```

The game is at:
```
dist/games/common-thread-solitaire/index.html
```

### On Voidcade Landing Page
After `npm run build`, the game appears in:
- Hero rail carousel (rotating game cards)
- Main game grid (with description)

Direct link:
```
/games/common-thread-solitaire/
```

## Quick Test

```bash
# Option 1: Dev server (fastest)
cd games/common-thread-solitaire
npm run dev
# Opens at http://localhost:5180

# Option 2: Full site with landing page
cd ../..  # back to root
npm run build
npm run preview
# Opens at http://localhost:4173
# Click on Common Thread card

# Option 3: Static file
npm run build
# Open: dist/games/common-thread-solitaire/index.html in browser
```

## What You'll See

1. **Title Screen**
   - Golden thread logo
   - "Common Thread Solitaire" title
   - Play button
   - How to Play button
   - Sound toggle

2. **Game Screen** (after clicking Play)
   - 3 rows of slots (4 slots each = 12 total)
   - Cards scattered on right side (stock area)
   - Drag cards to slots
   - When 4 matching cards fill a slot → completes with category label
   - Complete all 3 sets → Win modal

3. **Win Modal**
   - Trophy icon
   - Move count
   - Time taken
   - Star rating (1-3)
   - Next Level button

## Controls Reminder

- **Drag & Drop**: Move cards with mouse/touch
- **Ctrl+Z / Cmd+Z**: Undo
- **H**: Hint (highlights 2 matching cards)
- **Ctrl+R / Cmd+R**: Restart level

## Troubleshooting

**Port 5180 already in use?**
```bash
# Kill the process or change port in vite.config.ts
```

**No sound?**
- Click the sound button in top-right
- Or click anywhere (Web Audio requires user gesture)

**Cards won't drag?**
- Check browser console (F12) for errors
- Make sure JavaScript is enabled

**Progress not saving?**
- Check localStorage is enabled
- Open DevTools → Application → Local Storage
- Look for `common-thread-solitaire-save`

**Want to reset progress?**
```javascript
// In browser console:
localStorage.removeItem('common-thread-solitaire-save');
location.reload();
```

## File Size Check

After build:
```bash
cd dist/games/common-thread-solitaire
ls -lh assets/*.{js,css}
```

Should see:
- JS: ~18KB (~6KB gzipped)
- CSS: ~19KB (~5KB gzipped)
- Total: ~11KB gzipped (very small!)

---

✅ The game is now **live on Voidcade** and ready to play!
