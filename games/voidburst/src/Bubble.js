import { Container, Graphics } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

// Neon color palette for bubbles — 6 hue-spaced colors.
// Stone bubbles use a special gray palette entry.
export const COLORS = [
  { hue: 0,   label: 'red',    hex: 0xff4d4d, glow: 0xff2222 },
  { hue: 200, label: 'cyan',   hex: 0x4dddff, glow: 0x00ccff },
  { hue: 280, label: 'purple', hex: 0xb04dff, glow: 0x8822ff },
  { hue: 50,  label: 'gold',   hex: 0xffd93d, glow: 0xffb800 },
  { hue: 140, label: 'green',  hex: 0x4dff88, glow: 0x00ff55 },
  { hue: 20,  label: 'orange', hex: 0xff8844, glow: 0xff5500 },
];

export const STONE_COLOR = { label: 'stone', hex: 0x888899, glow: 0x666677 };

export const BUBBLE_R = 18; // radius in pixels

export class Bubble extends Container {
  /**
   * @param {number} colorIdx  — index into COLORS, or -1 for stone
   * @param {boolean} glowing  — whether to attach GlowFilter (moving ball)
   */
  constructor(colorIdx, glowing = false) {
    super();
    this.colorIdx = colorIdx;
    this.isStone = colorIdx === -1;
    this.gfx = new Graphics();
    this.addChild(this.gfx);
    this._glow = null;
    this._drawBubble();
    if (glowing) this.setGlow(true);
  }

  _drawBubble() {
    const g = this.gfx;
    g.clear();
    const col = this.isStone ? STONE_COLOR : COLORS[this.colorIdx % COLORS.length];
    const r = BUBBLE_R;

    // Main filled circle
    g.circle(0, 0, r).fill({ color: col.hex });
    // Inner highlight: small bright circle offset up-left
    g.circle(-r * 0.28, -r * 0.28, r * 0.28).fill({ color: 0xffffff, alpha: 0.35 });
    // Outer ring
    g.circle(0, 0, r).stroke({ color: col.hex, width: 1.5, alpha: 0.6 });

    // Stone gets a crack pattern
    if (this.isStone) {
      g.moveTo(-6, -4).lineTo(0, 2).lineTo(6, -2)
        .stroke({ color: 0xaaaacc, width: 1, alpha: 0.5 });
    }
  }

  setGlow(on) {
    if (on && !this._glow) {
      const col = this.isStone ? STONE_COLOR : COLORS[this.colorIdx % COLORS.length];
      this._glow = new GlowFilter({ distance: 10, outerStrength: 2, innerStrength: 0, color: col.glow, quality: 0.25 });
      this.filters = [this._glow];
    } else if (!on && this._glow) {
      this._glow = null;
      this.filters = [];
    }
  }

  /** Brief scale-pop animation when a bubble is cleared. */
  popAnimation(onDone) {
    // Quick scale up then fade out
    const g = this.gfx;
    let t = 0;
    const ticker = (dt) => {
      t += dt * 0.06;
      this.scale.set(1 + t * 1.5);
      this.alpha = Math.max(0, 1 - t * 3);
      if (t >= 0.35) {
        onDone();
      }
    };
    return ticker;
  }
}
