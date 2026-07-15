// A single stacked/moving block. Flat-color body with a simple top
// highlight and bottom shade strip to fake a bevel (cheap + reliable,
// avoids Pixi v8 FillGradient rendering issues seen with Graphics fills).
import { Container, Graphics } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import gsap from 'gsap';
import { hslToHex } from './utils.js';

const BLOCK_H = 40;
// Blocks are drawn slightly taller than their logical stacking height and
// shifted down so each one overlaps the block below by a hair. This kills
// any 1px anti-aliasing seam between stacked blocks under WebGL.
const OVERLAP = 1;

export class Block extends Container {
  constructor({ x, y, w, hue }) {
    super();
    this.blockW = w;
    this.hue = hue;
    this.x = x;
    this.y = y;

    this.gfx = new Graphics();
    this.addChild(this.gfx);

    // Separate overlay used for the perfect/close flash pulse so we can
    // tween its alpha without touching the base fill.
    this.flashGfx = new Graphics();
    this.addChild(this.flashGfx);
    this.flashGfx.alpha = 0;

    this.redraw();

    this._glow = null;
  }

  redraw() {
    const w = Math.max(this.blockW, 1);
    const hue = this.hue;
    const bodyColor = hslToHex(hue, 70, 56);
    const highlightColor = hslToHex(hue, 85, 74);

    this.gfx.clear();
    // Plain rect (no corner rounding) so adjacent blocks butt up against
    // each other with zero visual seam - rounded corners on stacked rects
    // expose the background at each touching edge. Drawn OVERLAP px taller
    // than the logical stacking height (extending below y=0) so it always
    // overdraws into the block beneath it, hiding any 1px AA seam.
    this.gfx.rect(0, -BLOCK_H, w, BLOCK_H + OVERLAP).fill({ color: bodyColor });
    // thin top highlight only, to read as a subtle bevel without a heavy
    // contrasting band that made the stack look segmented
    this.gfx.rect(0, -BLOCK_H, w, 3).fill({ color: highlightColor, alpha: 0.7 });

    this.flashGfx.clear();
    this.flashGfx.rect(0, -BLOCK_H, w, BLOCK_H + OVERLAP).fill({ color: 0xffffff });
  }

  setWidth(w) {
    this.blockW = w;
    this.redraw();
  }

  /** Bright white pulse for a perfect drop. */
  flashPerfect() {
    gsap.killTweensOf(this.flashGfx);
    this.flashGfx.tint = 0xffffff;
    this.flashGfx.alpha = 0.85;
    gsap.to(this.flashGfx, { alpha: 0, duration: 0.35, ease: 'power2.out' });
  }

  /** Softer amber pulse for a close-but-not-perfect drop. */
  flashClose() {
    gsap.killTweensOf(this.flashGfx);
    this.flashGfx.tint = 0xffb35c;
    this.flashGfx.alpha = 0.5;
    gsap.to(this.flashGfx, { alpha: 0, duration: 0.3, ease: 'power2.out' });
  }

  setGlow(enabled) {
    if (enabled && !this._glow) {
      this._glow = new GlowFilter({
        distance: 14,
        outerStrength: 2.2,
        innerStrength: 0,
        color: hslToHex(this.hue, 100, 65),
        quality: 0.25,
      });
      this.filters = [this._glow];
    } else if (!enabled && this._glow) {
      this._glow = null;
      this.filters = [];
    } else if (enabled && this._glow) {
      this._glow.color = hslToHex(this.hue, 100, 65);
    }
  }
}

export const BLOCK_HEIGHT = BLOCK_H;
