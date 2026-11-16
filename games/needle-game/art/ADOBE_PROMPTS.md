# Making every picture with Adobe Firefly and Illustrator

Prompts and steps for all 78 pictures the game uses today, plus drafts for the parts that are not in the game yet. It works with `ART_BRIEF.md` (sizes and rules) and `ART_LIST.md` (what each picture is). The menu names in Adobe's tools change from time to time, so read them as a guide.

**Which Adobe tool for which picture**

| Pictures | Tool | You get | Why |
|---|---|---|---|
| Icons (13), items (43) and look-alikes (2) | **Firefly "Text to Vector"** (firefly.adobe.com) or **Illustrator "Text to Vector Graphic"** | A real vector (SVG) you can edit | Clean flat shapes with a consistent outline, and a transparent background with nothing to cut out |
| Scenery props (20) | The same, type **Subject** | SVG | Same reason |
| Only if the vector result looks wrong | Firefly **Text to Image**, then **Remove background** (transparent) | PNG | A second choice. It tends to look painted or 3D, which does not match the icons |

In Illustrator's Text to Vector Graphic, choose type **Icon** for the 13 icons and **Subject** for items and props. Items are delivered as PNG: build them as vectors, then export a 256 x 256 PNG (step 5).

---

## 1. Do this first: the style anchor (once)

All the pictures must look like one family. Firefly does not remember a style between prompts, so we fix one with a reference picture.

1. Generate **five** test pieces with the master prompt below: `icons/barn`, `items/button`, `items/apple`, `props/windmill` and `items/key`.
2. Generate four variations of each, pick the best, and clean it up (step 4). Show them to the art director and **get approval**.
3. From then on, upload the approved pieces in the **Reference image / Style** setting of every new prompt (use the approved piece of the same kind: an icon for icons, an item for items, a prop for props). Keep the same model and the same style strength every time.

This is what keeps 78 pictures consistent. Do not skip it.

## 2. The master prompt (paste at the start of every prompt)

> Cozy flat vector illustration for a casual game, soft rounded shapes, warm pastel colours, one small white highlight, light from the top left, single centred object, plain white background, no shadow, no text.

Adobe's own advice: use simple, direct language and at least three words. Keep the object description short. If the tool has an **Exclude** (negative) box, add: `text, letters, extra objects, scenery, background, frame, shadow, people`.

Then add the **kind suffix**, then the **object prompt** from the tables in section 6.

| Kind | Add after the master prompt |
|---|---|
| Icon | `bold simple shape, thin warm dark-brown outline, readable when very small, shown inside a round cream plate` |
| Item | `thin warm dark-brown outline, strong colours that stand out from golden hay, readable when very small` |
| Prop | `flat shapes with soft shading, no outline, a soft flat ground shadow under it` |
| Look-alike | `drawn lying flat and horizontal, head on the right, thin and simple` |

**Colour rule for items:** the hay is golden-yellow and tan. Never use golden or beige as the main colour of an item. If the object is golden (wheat, straw hat, gold treasures), give it a clear dark-brown outline and a second contrasting colour.

## 3. How to generate each picture

1. Paste: master prompt + kind suffix + the object prompt.
2. Generate. Look at all variations. **Reject** any with text, letters, extra objects, a scene behind it, a thick black outline, or a very thin object that will vanish when small.
3. If it is close but not right, change only the object words and generate again. Do not make the prompt longer and longer.
4. Pick one, and clean it up (step 4).

## 4. Cleaning up in Illustrator (every picture)

1. Open the SVG. Make sure it is **one object**: delete any background rectangle, shadow, frame, text or stray shapes (select all, ungroup, remove what should not be there).
2. Set the **artboard** to the size in the tables (icons 64 x 64, items 256 x 256, props the width x height in the table). Centre the object and scale it so it fills the artboard (see section 5 for the free space).
3. Check the outline looks the same weight as the approved anchor pieces. Fix it with Object > Path > Offset or by redrawing the thin parts if it is too fine.
4. Look at it at **48 x 48 px**. If you cannot tell what it is, simplify it.
5. Put it on a golden background (#d9b24f) to see if it stands out. If it does not, change the colours.

## 5. Exporting

| Kind | File | Artboard | Space around the object | How to export |
|---|---|---|---|---|
| Icon | `icons/<name>.svg` | 64 x 64 | 4 px of the artboard | File > Export > Export As > SVG. Options: Styling "Presentation Attributes", Fonts "Convert to outline", Images "Embed" (there should be none), Object IDs "Minimal", **Responsive** ticked (it keeps the viewBox) |
| Item and look-alike | `items/<name>.png` | 256 x 256 | **at least 10 px** on every side, and the object is 50% to 96% of the artboard | File > Export > Export for Screens > PNG, 1x, transparent background. **No shadow** |
| Prop | `props/<name>.svg` | as in the table (for example 100 x 140) | 1 px | Same as icons |

Name each file **exactly** as in the tables, in lower case. Put the files in the folders `incoming/items`, `incoming/icons` and `incoming/props`. Then the developer runs the checker, which tests size, transparent background, space around the object, weight and name, and says what to fix.

## 6. The prompts

Paste the **object prompt** after the master prompt and the kind suffix. The text in brackets is a hint for you, not part of the prompt.

### Icons (13): Illustrator type Icon, artboard 64 x 64, delivered all together

| File | Object prompt |
|---|---|
| `icons/detector` | metal detector with a round blue-grey search coil lying on the ground, an angled pole and a handle, red accents |
| `icons/fan` | small desk fan seen from the front, round grey-blue wire guard, blue five-petal flower-shaped blade with a gold centre, round base |
| `icons/vacuum` | small cute purple vacuum cleaner on wheels with a curved hose and a nozzle, a few blue wind lines |
| `icons/cells` | three green battery cells standing side by side with shiny highlights |
| `icons/cell` | one green battery cell with a white lightning bolt and a small cap |
| `icons/shop` | small shop front with a striped red and cream awning, a window with goods, a wooden door and a little coin sign |
| `icons/gift` | coral red gift box with a yellow ribbon and bow |
| `icons/map` | folded paper map with a green map pin, a dotted red path and a red X |
| `icons/book` | thick blue book with a gold star on the cover and a red ribbon bookmark |
| `icons/calendar` | tear-off calendar page with a sun on it |
| `icons/hay` | golden dome-shaped haystack with curved straw lines, darker golden outline |
| `icons/scroll` | sheet of paper with a curled top corner, a few lines of writing and a green check mark |
| `icons/barn` | small red barn with a white X on the door and a round hayloft window |

### Items (43) and look-alikes (2): type Subject, artboard 256 x 256, export PNG

**The Sewing Box**

| File | Object prompt |
|---|---|
| `items/button` | round sewing button with a raised cream rim and four holes, teal or coral |
| `items/spool` | wooden spool of bright red thread with a loose thread end |
| `items/thimble` | metal sewing thimble with rows of tiny dimples, silver-blue, side view |
| `items/scissors` | small embroidery scissors, slightly open, curved silver blades, big pink loop handles |
| `items/pincushion` | red tomato-shaped pin cushion with three colourful pins and a small green cap |
| `items/brooch` | vintage round silver brooch with one pink gem and a scalloped edge |
| `items/goldneedle` | golden sewing needle with a large eye, on the diagonal, thick and bold, dark brown outline, one small white sparkle [must be thick enough to see in the hay] |

**The Farmhouse Drawer**

| File | Object prompt |
|---|---|
| `items/feather` | single soft blue-grey feather with a curved quill, on the diagonal |
| `items/egg` | white farm egg with a few brown speckles |
| `items/wheat` | ear of wheat on a short stalk tied with a red ribbon and one green leaf, strong dark outline |
| `items/key` | old iron key with a round ornate bow, dark slate with a copper highlight, on the diagonal |
| `items/horseshoe` | iron horseshoe with nail holes, open end up, dark blue-grey |
| `items/lantern` | small old barn lantern with a glass chimney, a wire handle and a warm flame, dark iron |
| `items/goldegg` | golden egg with a white shine and small sparkles, strong dark outline |

**The Orchard Basket**

| File | Object prompt |
|---|---|
| `items/acorn` | chestnut brown acorn with a textured green-brown cap |
| `items/leaf` | red-orange autumn maple leaf with visible veins |
| `items/apple` | red apple with a short stem and one green leaf |
| `items/pear` | green pear with a short stem and a leaf |
| `items/cherries` | two deep red cherries joined by green stems |
| `items/honeypot` | cream ceramic honey pot with amber honey dripping over the edge and a wooden dipper |
| `items/goldapple` | golden apple with a leaf, white shine and small sparkles, strong dark outline |

**The Winter Cabin**

| File | Object prompt |
|---|---|
| `items/mitten` | red knitted mitten with a white snowflake pattern and a cuff |
| `items/snowflake` | six-armed icy blue crystal snowflake with white highlights |
| `items/candle` | lit red candle in a small brass holder with a small bright flame |
| `items/mug` | blue enamel mug of cocoa with steam and two marshmallows |
| `items/holly` | sprig of holly with three dark green leaves and red berries |
| `items/snowglobe` | snow globe with a tiny log cabin inside and a wooden base |
| `items/iceheart` | heart-shaped crystal of pale blue ice with a white sparkle |

**The Night Sky**

| File | Object prompt |
|---|---|
| `items/star` | fallen five-point star with rounded points, pale lemon with a small shine and a dark outline |
| `items/moon` | little cream crescent moon with soft silver-blue shading |
| `items/jar` | glass jar with a lid and glowing yellow-green fireflies inside |
| `items/compass` | brass pocket compass with the lid open, a blue-white dial and a red needle |
| `items/spyglass` | small brass telescope with a dark leather band and a blue lens, on the diagonal |
| `items/crystalball` | crystal ball on a small stand with a purple and blue swirl inside |
| `items/starstone` | faceted star-shaped gemstone, deep blue-violet, with white sparkles |

**Harvest Festival (seasonal)**

| File | Object prompt |
|---|---|
| `items/pumpkin` | small round orange pumpkin with a green stem and a curled vine |
| `items/corn` | corn cob with yellow kernels and the green husk peeled back, dark outline |
| `items/strawhat` | straw hat with a wide brim and a red band, strong dark outline |
| `items/pie` | apple pie in a blue and white tin with a lattice crust and a little steam |

**Festive Season (seasonal)**

| File | Object prompt |
|---|---|
| `items/ornament` | red round bauble with a white swirl and a silver cap with a loop |
| `items/gingerbread` | gingerbread man with white icing, buttons and a smile, strong dark outline |
| `items/stocking` | red Christmas stocking with a white cuff and a candy cane peeking out |
| `items/wreath` | green holly wreath with a red bow and red berries |

**Look-alikes of the needle** (use the "Look-alike" suffix)

| File | Object prompt |
|---|---|
| `items/pin` | straight silver sewing pin with a small round red head, horizontal, head on the right |
| `items/nail` | short grey iron nail with a flat head, horizontal, head on the right |

### Scenery props (20): type Subject, flat, no outline, export SVG at the artboard size shown

**World 1: The Meadow**

| File | Artboard | Object prompt |
|---|---|---|
| `props/windmill` | 100 x 140 | small cream wooden windmill with a rust-red cap, a small door and four paddle blades on wooden arms |
| `props/sunflower` | 70 x 130 | one tall sunflower with a green stem and two leaves |
| `props/daisies` | 110 x 72 | low cluster of three white daisies with yellow centres and green leaves |
| `props/bush` | 120 x 80 | round green bush with a few red berries |
| `props/butterfly` | 30 x 24 | yellow butterfly seen from above, wings open and flat, thin dark outline |

**World 2: The Barnyard**

| File | Artboard | Object prompt |
|---|---|---|
| `props/barn` | 160 x 140 | red barn with a white X on the double door, a hayloft window and a curved roof |
| `props/fence` | 150 x 70 | short section of white-washed wooden picket fence |
| `props/chicken` | 70 x 70 | white hen standing, side view, red comb |
| `props/haystack` | 120 x 110 | round golden haystack with soft shading |

**World 3: The Orchard**

| File | Artboard | Object prompt |
|---|---|---|
| `props/autumn_tree` | 140 x 170 | tree with a round orange-red crown and a brown trunk |
| `props/pumpkin` | 90 x 76 | orange pumpkin with a green stem |
| `props/scarecrow` | 110 x 170 | friendly scarecrow on a pole with a straw hat, a red plaid shirt and patched clothes |
| `props/leaf_pile` | 130 x 56 | low heap of red, orange and gold autumn leaves |

**World 4: The Snowy Farm**

| File | Artboard | Object prompt |
|---|---|---|
| `props/pine` | 100 x 160 | pine tree with snow on its branches |
| `props/snowman` | 80 x 120 | three-ball snowman with a dark blue hat, a red scarf, stick arms and a carrot nose |
| `props/cabin` | 170 x 140 | log cabin with a snowy roof, a chimney and a lit window |

**World 5: Starry Night**

| File | Artboard | Object prompt |
|---|---|---|
| `props/tent_fire` | 210 x 120 | small orange tent next to a campfire with a bright flame |
| `props/moon` | 120 x 120 | large pale cream moon with soft craters and a soft glow |
| `props/owl` | 90 x 110 | round friendly brown owl with big eyes, perched on a branch |
| `props/mushrooms` | 100 x 70 | two red mushrooms with white spots, one bigger than the other |

---

## 7. Checks before sending

- [ ] Same outline weight and colour feel as the approved anchor pieces.
- [ ] One object, no text, no background, no frame; items and icons have no shadow.
- [ ] Readable at 48 x 48 px, and clearly visible on a golden background (#d9b24f).
- [ ] Thin things (needle, pin, nail, feather, key) are bold enough to see when small.
- [ ] Exact size, name in lower case, in the right folder.
- [ ] Icons: all 13 sent together. Props: all the pictures of one world sent together.

**Rights.** Check Adobe's current terms for commercial use of generated content, and keep a note of the tool and settings used for each batch. A person on your team should approve every picture.

---

## 8. The rest of the game (drafts: not in the game yet)

These parts still draw themselves with code. They need their own specification (sizes, layers, where each piece sits) before final art is made, so **do not deliver these yet**. Use the prompts below only to explore the look. Each will get the same kind of brief as this one.

| Part | Draft prompt (after the master prompt) |
|---|---|
| **The barn** (front view, in layers) | red gambrel-roof barn seen from the front with a white X on the big door, a hayloft window and a stone base, plain white background |
| Silo, hay pile, bales | tall cream metal silo with a red cap and a ladder; pile of loose golden hay; golden hay bale tied with two straps |
| Barn improvements (6) | hand-painted wooden sign saying HAY; weathervane with a rooster; wooden window boxes with red geraniums; little windmill; dinner bell on a wooden post; iron lamp post with a lantern |
| **World backgrounds** (5, wide) | wide soft landscape of rolling hills and a pale sky, calm, no object in the middle. One each: sunny meadow morning, golden barnyard afternoon, autumn orchard, snowy farm, starry night with fireflies |
| **Buttons and panels** | cream rounded game button with a thick warm brown border and a slight raised look; wooden panel; round coin; these need a designer, because they must stretch to any size |
| **The haystack** (the board) | single straw with a small grain head, in several lengths; dark brown soil texture; wooden board frame |
| **Title screen** | big friendly hand-lettered NEEDLE! logo in cream with a brown outline; a large steel sewing needle on the diagonal |
| **Characters** (later) | friendly older American farm neighbour, bust portrait, warm smile, simple shapes, three expressions (neutral, happy, thinking) |
| **Sound** (later) | not made with Adobe's image tools |
