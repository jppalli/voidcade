/**
 * The first file the page runs. It reads the list of delivered art (art/manifest.json) and only
 * then starts the game, so every part of the game knows from the start which pictures to use.
 */
import { loadArtManifest } from './artdom';

void loadArtManifest().then(() => import('./main'));
