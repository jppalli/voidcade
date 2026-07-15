// A dashed horizontal line spanning the play area that marks the next
// powerup-choice floor, so the player can see it coming as the tower climbs.
// Kept deliberately understated - a faint wayfinding cue, not a big deal.
import { Container, Graphics, Text } from 'pixi.js';

const DASH_W = 12;
const DASH_GAP = 9;
const LINE_COLOR = 0x9a9ab0; // muted slate, not bright/white
const LINE_ALPHA = 0.28;
const LABEL_ALPHA = 0.4;

export class MilestoneMarker extends Container {
  constructor() {
    super();
    this.gfx = new Graphics();
    this.addChild(this.gfx);

    this.label = new Text({
      text: '',
      style: {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: 11,
        fontWeight: '600',
        fill: LINE_COLOR,
        letterSpacing: 1,
      },
    });
    this.label.alpha = LABEL_ALPHA;
    this.label.anchor.set(0.5, 1);
    this.addChild(this.label);

    this.visible = false;
  }

  /** Redraw the dashed line to span `width`, and set the floor number label. */
  setSpan(width, floorNumber) {
    this.gfx.clear();
    let x = 0;
    while (x < width) {
      const w = Math.min(DASH_W, width - x);
      this.gfx.rect(x, 0, w, 1.5).fill({ color: LINE_COLOR, alpha: LINE_ALPHA });
      x += DASH_W + DASH_GAP;
    }
    this.label.text = `FLOOR ${floorNumber}`;
    this.label.x = width / 2;
    this.label.y = -6;
  }
}
