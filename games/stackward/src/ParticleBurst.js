// GPU-backed particle burst for "perfect drop" celebrations.
// Uses PixiJS v8 ParticleContainer + Particle for cheap large-count bursts.
import { ParticleContainer, Particle } from 'pixi.js';

class ActiveParticle {
  constructor(particle) {
    this.p = particle;
    this.vx = 0;
    this.vy = 0;
    this.life = 1;
    this.decay = 0.02;
  }
}

export class ParticleBurst {
  constructor(texture) {
    this.texture = texture;
    this.container = new ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: false,
        color: true,
        vertex: false,
      },
    });
    this.active = [];
  }

  burst(x, y, tint, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 3.2;
      const size = 3 + Math.random() * 4;
      const particle = new Particle({
        texture: this.texture,
        x,
        y,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: size / 16,
        scaleY: size / 16,
        tint,
        alpha: 1,
      });
      const ap = new ActiveParticle(particle);
      ap.vx = Math.cos(angle) * speed;
      ap.vy = Math.sin(angle) * speed - 1.2;
      ap.decay = 0.018 + Math.random() * 0.014;
      this.container.addParticle(particle);
      this.active.push(ap);
    }
  }

  update() {
    if (this.active.length === 0) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ap = this.active[i];
      ap.vy += 0.12;
      ap.p.x += ap.vx;
      ap.p.y += ap.vy;
      ap.life -= ap.decay;
      ap.p.alpha = Math.max(0, ap.life);
      if (ap.life <= 0) {
        this.container.removeParticle(ap.p);
        this.active.splice(i, 1);
      }
    }
  }
}
