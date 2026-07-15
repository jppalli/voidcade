// Generates small reusable render textures (particle dot, soft glow sprite)
// so we avoid creating new Graphics per-particle at runtime.
import { Graphics } from 'pixi.js';

export function createParticleTexture(renderer) {
  const g = new Graphics();
  g.circle(8, 8, 8).fill({ color: 0xffffff });
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

export function createSoftGlowTexture(renderer) {
  const g = new Graphics();
  // radial-ish falloff approximated with layered circles
  const steps = 6;
  for (let i = steps; i > 0; i--) {
    const r = (i / steps) * 32;
    const alpha = 0.12 * (1 - i / steps + 0.15);
    g.circle(32, 32, r).fill({ color: 0xffffff, alpha });
  }
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}
