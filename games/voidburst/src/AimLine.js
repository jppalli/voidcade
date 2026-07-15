import { Graphics } from 'pixi.js';

const DOT_SPACING = 18; // pixels between dots
const DOT_R       = 3;  // dot radius

/**
 * Dotted aim trajectory line with wall-bounce reflections.
 * Drawn in world-space, cleared and redrawn each pointer move.
 */
export class AimLine {
  constructor(stage) {
    this.gfx = new Graphics();
    stage.addChild(this.gfx);
    this.visible = false;
  }

  /**
   * Draw the aim line.
   * @param {number} startX      Cannon muzzle X
   * @param {number} startY      Cannon muzzle Y
   * @param {number} angle       Angle in radians (0 = right, -PI/2 = straight up)
   * @param {number} bounces     Number of wall bounces to show
   * @param {number} left        Left wall X
   * @param {number} right       Right wall X
   * @param {number} top         Top wall Y (stop at this)
   * @param {number} stopY       Stop drawing dots below this Y (near cannon)
   */
  draw(startX, startY, angle, bounces, left, right, top, stopY) {
    this.gfx.clear();
    if (!this.visible) return;

    let x = startX, y = startY;
    let dx = Math.cos(angle), dy = Math.sin(angle);
    // Normalize direction to always go upward
    if (dy > 0) { dy = -dy; }

    const points = [];
    const speed = DOT_SPACING;
    let remaining = bounces + 1; // segments left to draw
    let traveled = 0;
    const maxDist = (stopY - top) * 4; // safety cap

    while (remaining > 0 && traveled < maxDist) {
      // How far until we hit a wall?
      let txLeft = dx < 0 ? (left - x) / dx : Infinity;
      let txRight = dx > 0 ? (right - x) / dx : Infinity;
      let tyTop = dy < 0 ? (top - y) / dy : Infinity;

      const tHit = Math.min(txLeft, txRight, tyTop);
      const segLen = Math.sqrt((dx * tHit) ** 2 + (dy * tHit) ** 2);

      // Generate dots along this segment
      let localT = speed - (traveled % speed);
      while (localT <= segLen) {
        const px = x + dx * localT;
        const py = y + dy * localT;
        if (py < top) break;
        points.push({ px, py });
        localT += speed;
      }
      traveled += segLen;

      x += dx * tHit;
      y += dy * tHit;

      if (tHit === tyTop) { remaining = 0; break; } // hit top wall, done

      // Wall bounce: reflect X direction
      dx = -dx;
      remaining--;
    }

    // Draw dots with alpha falloff
    const total = points.length;
    points.forEach(({ px, py }, i) => {
      const alpha = 0.7 * (1 - i / total * 0.7);
      this.gfx.circle(px, py, DOT_R).fill({ color: 0x7dffd4, alpha });
    });
  }

  show() { this.visible = true; }
  hide() { this.visible = false; this.gfx.clear(); }
}
