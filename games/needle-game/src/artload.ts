/**
 * Loads the delivered pictures of items and look-alikes into the game (Phaser). Anything that has
 * no file, or whose file fails to load, keeps the picture the game draws itself.
 * Icons and props are handled in artdom.ts.
 */
import type Phaser from 'phaser';
import { ART_SPEC, artKey, artSlots } from './artslots';
import { itemArtUrl } from './artdom';

/** Queues every delivered item picture. Call it from a scene's preload(). */
export function artPreload(scene: Phaser.Scene) {
  for (const s of artSlots()) {
    if (s.folder !== 'items') continue;
    const url = itemArtUrl(s.id);
    if (url) scene.load.image(artKey(s.id), url);
  }
}

/** True when a delivered picture for this slot is loaded. */
export const hasArt = (scene: Phaser.Scene, id: string) => scene.textures.exists(artKey(id));

/** Size of the picture the game keeps in memory for a delivered item. */
export const ART_TEXTURE = ART_SPEC.item.texture;

/**
 * Draws a delivered picture into a square canvas the way the game draws its own: the same soft
 * shadow below it, and a little room around so the shadow is not cut off.
 */
export function drawArt(c: CanvasRenderingContext2D, img: CanvasImageSource, size: number) {
  const pad = size * 0.03,
    k = size / 64;
  c.clearRect(0, 0, size, size);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.shadowColor = '#35261288';
  c.shadowBlur = 3 * k;
  c.shadowOffsetY = 3 * k;
  c.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
  c.shadowColor = 'transparent';
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
}
