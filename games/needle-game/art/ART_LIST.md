# Needle in a Haystack: the list of pictures, with what to draw

This is the creative companion to `ART_BRIEF.md` (which has the technical rules and the exact sizes). For every picture it says **what to draw** and **what the result must look like**. The `reference/` folder shows what each picture looks like today: use it for size and proportions, then draw your own version.

Order of work: **Batch 1** (icons and one set of items) first, then batch 2 (the other item sets), then batch 3 (scenery, one world at a time).

---

## How the results must look (for every picture)

- **Friendly and clear.** Soft, rounded shapes. Warm, slightly pastel colours. One small highlight. Light from the top left.
- **Readable when small.** Items are about 46 px wide in the game. If the shape cannot be recognised when you shrink the file to 48 x 48 px, simplify it.
- **Items must stand out from golden hay.** Do not use golden-yellow or tan as the main colour of an item. Use clean, strong colours. Where an object is naturally golden (wheat, straw hat, gold things), add a clear dark-brown outline and a contrasting second colour (a red ribbon, a green leaf).
- **No text, no frame, no background, no drop shadow** (items and icons). The game adds its own soft shadow.
- **Rarity shows in the care taken, not in the size.** Common items: simple and bold. Uncommon: one extra detail. Rare: a little more detail and a small shine. Treasure (the golden or magical one at the end of each set): the most special, with a clear sparkle or glow *painted into the object*. All must be about the same size in the file.
- **Long objects** (needle, feather, key, spyglass, wheat, candle, pin, nail) may be drawn on the diagonal so they fill the square.
- **A set must look like one family**: same outline weight, same level of detail, same light.

---

# BATCH 1

## 1A. Icons: 13 pictures, delivered all together

Shown small (24 to 64 px), inside a cream or white round plate on buttons and cards. One simple, bold object each, on a transparent background. PNG 128 x 128 or SVG (viewBox 0 0 64 64). **All 13 must look like the same family** (same outline weight, level of detail and light), because the game switches all icons at once.

| File | What to draw | Where it is used |
|---|---|---|
| `icons/detector` | A metal detector: a round blue-grey search coil lying on the ground, an angled pole and a handle. Red accents (the helper button is red). | Detector helper button, the "new helper" card, the shop |
| `icons/fan` | A small friendly desk fan seen from the front: a round grey-blue wire guard, a blue five-petal flower-shaped blade with a gold centre, and a round base. Blue accents (the helper button is blue). | Fan helper button, card, shop |
| `icons/vacuum` | A small cute purple vacuum cleaner on wheels, with a curved hose and a nozzle, and a few little blue wind lines. Purple accents (the helper button is purple). | Vacuum helper button, card, shop |
| `icons/cells` | Three green battery cells standing side by side, with shiny highlights (no bolt: the single cell has the bolt). | Shop row that sells cells |
| `icons/cell` | One green battery cell with a white lightning bolt and a small cap. | Rewards, the daily gift |
| `icons/shop` | A small shop front: a striped red-and-cream awning, a window with goods behind it, a wooden door and a little coin sign. | Shop button in the top bar |
| `icons/gift` | A gift box in coral-red with a yellow ribbon and bow. | The daily gift |
| `icons/map` | A folded paper map with a green map pin, a dotted red path and a red X. | "Levels" button |
| `icons/book` | A thick blue book with a star on the cover and a ribbon bookmark. | "Collection" button |
| `icons/calendar` | A tear-off calendar page with a sun on it. | "Today" button |
| `icons/hay` | A golden dome-shaped haystack with curved straw lines. The one place golden is fine, with a darker golden outline. | Today screen, rewards |
| `icons/scroll` | A sheet of paper with a curled top corner, a few lines of writing shown as bars, and a green check mark (the list of daily tasks). | Today screen (quests) |
| `icons/barn` | A small red barn with a white X on the door and a hayloft window. | "Barn" button |

## 1B. Items: "The Sewing Box" (a grandmother's basket), 7 pictures

PNG 256 x 256, transparent, thin warm-brown outline (about #76502b), no shadow.

| File | Rarity | What to draw | Colour hint |
|---|---|---|---|
| `items/button` | common | A round sewing button with a raised rim and four holes. | Coral or teal with a cream rim |
| `items/spool` | common | A wooden spool of thread, thread wound on it, a loose end hanging. | Bright thread (red or blue), wood ends |
| `items/thimble` | common | A metal thimble seen from the side, with rows of tiny dimples. | Silver-blue, not gold |
| `items/scissors` | uncommon | Small embroidery scissors, slightly open, with curved blades and loop handles. | Pink or red handles, silver blades |
| `items/pincushion` | uncommon | A tomato-shaped pin cushion with a few colourful pins stuck in it. | Red, with a green cap |
| `items/brooch` | rare | A vintage round brooch with a small gem and a delicate edge. | Silver and pink, one bright gem |
| `items/goldneedle` | treasure | A golden sewing needle with a big eye, on the diagonal, with a sparkle. | Rich gold with strong outline and a white shine |

---

# BATCH 2: the other item sets (deliver one set at a time)

Same rules as 1B. Each set has 3 common, 2 uncommon, 1 rare and 1 treasure item (the seasonal sets have 4).

## The Farmhouse Drawer (odds and ends from the barnyard)

| File | Rarity | What to draw | Colour hint |
|---|---|---|---|
| `items/feather` | common | A single soft feather with a curved quill, on the diagonal. | Blue-grey or white with teal |
| `items/egg` | common | A farm egg with a few speckles. | White or pale blue, not tan |
| `items/wheat` | common | An ear of wheat on a short stalk tied with a ribbon. | Golden grains with a dark outline, a red ribbon and a green leaf |
| `items/key` | uncommon | An old iron key with a round ornate bow, on the diagonal. | Dark slate with a copper highlight |
| `items/horseshoe` | uncommon | A horseshoe with nail holes, open end up (lucky). | Dark blue-grey with a light edge |
| `items/lantern` | rare | A small barn lantern: glass chimney, wire handle, a warm little flame. | Dark iron body, warm glow |
| `items/goldegg` | treasure | A golden egg with a shine and a few sparkles. | Rich gold, strong outline, white shine |

## The Orchard Basket (windfalls and a pot of honey)

| File | Rarity | What to draw | Colour hint |
|---|---|---|---|
| `items/acorn` | common | An acorn with a textured cap and a small stem. | Chestnut brown with a green-brown cap |
| `items/leaf` | common | An autumn maple leaf with visible veins. | Red-orange |
| `items/apple` | common | A red apple with a stem and one leaf. | Red with a green leaf |
| `items/pear` | uncommon | A pear with a stem and a leaf. | Green, not yellow |
| `items/cherries` | uncommon | Two cherries joined by their stems. | Deep red, green stem |
| `items/honeypot` | rare | A honey pot with honey dripping over the edge and a wooden dipper. | Cream ceramic, amber honey |
| `items/goldapple` | treasure | A golden apple with a leaf and a sparkle. | Rich gold, strong outline, white shine |

## The Winter Cabin (cosy things for a snowy day)

| File | Rarity | What to draw | Colour hint |
|---|---|---|---|
| `items/mitten` | common | A knitted mitten with a patterned cuff. | Red with a white pattern |
| `items/snowflake` | common | A six-armed crystal snowflake. | Icy blue with white highlights |
| `items/candle` | common | A lit candle in a small holder, on the diagonal or upright. | Red or cream candle, small bright flame |
| `items/mug` | uncommon | A mug of cocoa with steam and two marshmallows. | Blue or red enamel mug |
| `items/holly` | uncommon | A sprig of holly with two or three leaves and red berries. | Dark green leaves, red berries |
| `items/snowglobe` | rare | A snow globe with a tiny cabin inside and a wooden base. | Clear blue glass, wooden base |
| `items/iceheart` | treasure | A heart-shaped crystal of ice with a sparkle. | Pale blue with white shine, clear outline |

## The Night Sky (keepsakes from under the stars)

| File | Rarity | What to draw | Colour hint |
|---|---|---|---|
| `items/star` | common | A fallen star, five rounded points, with a small shine. | Pale lemon or silvery with a dark outline |
| `items/moon` | common | A little crescent moon. | Cream and soft silver-blue |
| `items/jar` | common | A glass jar with a lid and a few glowing fireflies inside. | Clear glass, glowing yellow-green dots |
| `items/compass` | uncommon | A pocket compass with its lid open and a red needle. | Brass body with a blue-white dial |
| `items/spyglass` | uncommon | A small brass telescope with a leather band, on the diagonal. | Brass with dark leather and a blue lens |
| `items/crystalball` | rare | A crystal ball on a small stand with a swirl of colour inside. | Purple and blue swirl |
| `items/starstone` | treasure | A star-shaped gemstone, faceted, with sparkles. | Deep blue-violet, white shine |

## Harvest Festival (seasonal, 4 pictures)

| File | Rarity | What to draw | Colour hint |
|---|---|---|---|
| `items/pumpkin` | common | A small round pumpkin with a stem and a curled vine. | Orange with a green stem |
| `items/corn` | uncommon | A corn cob with the green husk peeled back. | Yellow kernels with a dark outline, green husk |
| `items/strawhat` | uncommon | A straw hat with a wide brim and a ribbon. | Straw with a **red or blue band** and a dark outline |
| `items/pie` | rare | An apple pie in a tin with a lattice crust and a little steam. | Golden crust with a dark outline, red apples showing, a blue-and-white tin |

## Festive Season (seasonal, 4 pictures)

| File | Rarity | What to draw | Colour hint |
|---|---|---|---|
| `items/ornament` | common | A round bauble with a cap and a loop. | Red with a white swirl and a silver cap |
| `items/gingerbread` | uncommon | A gingerbread man with white icing, buttons and a smile. | Brown with white icing (strong outline) |
| `items/stocking` | uncommon | A Christmas stocking with a white cuff and a candy cane peeking out. | Red with white cuff |
| `items/wreath` | rare | A holly wreath with a red bow and berries. | Green with a red bow |

## The two look-alikes of the needle (2 pictures)

These are hidden in the hay to look like the needle. Tapping one is harmless. **Drawn lying flat, horizontal, with the head on the right.**

| File | What to draw | Colour hint |
|---|---|---|
| `items/pin` | A straight sewing pin with a small round head, as thin as the needle. | Silver with a red round head |
| `items/nail` | A short iron nail with a flat head. | Grey iron |

---

# BATCH 3: scenery props (deliver one world at a time)

Flat shapes with a little shading, in the soft colours of each world. Most have **no outline**; a thin soft edge is fine where it helps (the butterfly and the fence have one). A soft ground shadow (a flat ellipse, about 20% opacity) under the object is welcome. They are decoration in the margins of the level map and behind the board, so they must be calm and not draw the eye away from the haystack. PNG or SVG; sizes are in `ART_BRIEF.md`. The game moves them very gently (a slow bob or sway), so deliver one still picture, upright.

## World 1: The Meadow (5)

| File | What to draw |
|---|---|
| `props/windmill` | A small cream wooden windmill with a rust-red cap, a small door and four paddle blades on wooden arms (the blades will not turn). |
| `props/sunflower` | One tall sunflower with a green stem and two leaves. |
| `props/daisies` | A low cluster of three white daisies with yellow centres. |
| `props/bush` | A round green bush with a few red berries. |
| `props/butterfly` | A yellow butterfly seen from above, **wings open and flat** (the game flaps it). |

## World 2: The Barnyard (4)

| File | What to draw |
|---|---|
| `props/barn` | A red barn with a white X on the double door, a hayloft window and a curved roof. |
| `props/fence` | A short section of white-washed wooden picket fence. |
| `props/chicken` | A white hen standing, seen from the side. |
| `props/haystack` | A round golden haystack (the one place golden is right, with soft shading). |

## World 3: The Orchard (4)

| File | What to draw |
|---|---|
| `props/autumn_tree` | A tree with a round orange-red crown and a brown trunk. |
| `props/pumpkin` | An orange pumpkin with a green stem. |
| `props/scarecrow` | A friendly scarecrow on a pole, with a straw hat and patched clothes. |
| `props/leaf_pile` | A low heap of red, orange and gold leaves. |

## World 4: The Snowy Farm (3)

| File | What to draw |
|---|---|
| `props/pine` | A pine tree with snow on its branches. |
| `props/snowman` | A three-ball snowman with a hat, a scarf and a carrot nose. |
| `props/cabin` | A log cabin with a snowy roof, a chimney and a lit window. |

## World 5: Starry Night (4)

| File | What to draw |
|---|---|
| `props/tent_fire` | A small tent next to a campfire with a bright flame (the widest prop). |
| `props/moon` | A large, calm, pale moon with soft craters. |
| `props/owl` | A round, friendly brown owl with big eyes, perched on a branch. |
| `props/mushrooms` | Two red mushrooms with white spots, one bigger than the other. |

---

## Not yet requested (later phases)

The barn picture and its improvements, the backgrounds of the five worlds, buttons and panels, the haystack straws and ground, the title screen, characters, and sound. Each will get its own brief like this one.
