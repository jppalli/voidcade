/** Particle bursts, shockwave rings, and floating score text. */
export class Particles {
  constructor() {
    this.sparks = [];
    this.rings = [];
    this.texts = [];
  }

  clear() {
    this.sparks.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
  }

  burst(x, y, color, count = 12, speed = 220) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.85);
      this.sparks.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 60,
        r: 1.5 + Math.random() * 3.2,
        life: 0.45 + Math.random() * 0.35,
        t: 0,
        color: Math.random() < 0.25 ? '#ffffff' : color,
      });
    }
  }

  ring(x, y, color) {
    this.rings.push({ x, y, color, t: 0, life: 0.35 });
  }

  text(x, y, str, { size = 16, color = '#ffffff' } = {}) {
    this.texts.push({ x, y, str, size, color, t: 0, life: 1.0 });
  }

  update(dt) {
    for (const p of this.sparks) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 700 * dt;
      p.vx *= 1 - 1.6 * dt;
    }
    this.sparks = this.sparks.filter((p) => p.t < p.life);

    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);

    for (const t of this.texts) {
      t.t += dt;
      t.y -= 34 * dt;
    }
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  render(ctx) {
    for (const p of this.sparks) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const r of this.rings) {
      const k = r.t / r.life;
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - k);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8 + k * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.t / t.life;
      const scale = k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1;
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.font = `900 ${Math.round(t.size * scale)}px "Nunito", "Segoe UI", sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(7, 10, 26, 0.7)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
