// Falling cut-off block fragments. Low count at any time, so plain
// Graphics-based sprites (with physics + rotation) are fine here;
// the high-volume "perfect" celebration uses the GPU ParticleBurst instead.
import { Container, Graphics } from 'pixi.js';
import { hslToHex } from './utils.js';

class DebrisPiece extends Container {
  constructor(w, h, hue) {
    super();
    const g = new Graphics();
    g.rect(-w / 2, -h / 2, w, h).fill({ color: hslToHex(hue, 75, 50) });
    this.addChild(g);
    this.vy = -2;
    this.vx = 0;
    this.rotVel = 0;
    this.life = 1;
  }
}

export class DebrisField {
  constructor() {
    this.container = new Container();
    this.pieces = [];
  }

  spawn(x, y, w, h, hue, dirBias) {
    const piece = new DebrisPiece(w, h, hue);
    piece.x = x + w / 2;
    piece.y = y + h / 2;
    piece.vx = (dirBias || (Math.random() < 0.5 ? -1 : 1)) * (1.5 + Math.random() * 1.5);
    piece.vy = -2;
    piece.rotVel = (Math.random() - 0.5) * 0.2;
    this.container.addChild(piece);
    this.pieces.push(piece);
  }

  update(floorScreenYCutoff) {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const d = this.pieces[i];
      d.vy += 0.35;
      d.x += d.vx;
      d.y += d.vy;
      d.rotation += d.rotVel;
      d.life -= 0.012;
      d.alpha = Math.max(0, d.life);
      if (d.life <= 0 || d.y > floorScreenYCutoff) {
        this.container.removeChild(d);
        d.destroy({ children: true });
        this.pieces.splice(i, 1);
      }
    }
  }
}
