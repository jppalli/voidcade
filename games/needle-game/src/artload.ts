/**
 * Loads the pictures that artists have delivered (see artslots.ts). Anything that has no file, or
 * whose file fails to load, keeps the picture the game draws itself.
 */
import type Phaser from 'phaser';
import { ART_SPEC, artFile, artKey, type ArtManifest } from './artslots';

const MANIFEST = `./${ART_SPEC.folder}/manifest.json`;
const url = (id: string, v: string) => `./${ART_SPEC.folder}/${artFile(id)}?v=${encodeURIComponent(v)}`;

/** Queues the manifest and then every picture it lists. Call it from a scene's preload(). */
export function artPreload(scene: Phaser.Scene) {
  scene.load.json('art-manifest', MANIFEST);
  scene.load.once('filecomplete-json-art-manifest', (_key: string, _type: string, data: ArtManifest | undefined) => {
    for (const [id, entry] of Object.entries(data?.items ?? {})) {
      if (/^[a-z0-9_-]+$/.test(id) && entry && typeof entry.v === 'string') scene.load.image(artKey(id), url(id, entry.v));
    }
  });
  // A missing manifest or picture is not an error: the game falls back to its own drawings.
}

/** True when a delivered picture for this slot is loaded. */
export const hasArt = (scene: Phaser.Scene, id: string) => scene.textures.exists(artKey(id));

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
