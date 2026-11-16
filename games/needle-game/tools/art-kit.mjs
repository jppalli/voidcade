// Packs everything the art team needs into one folder and a zip. Run: npm run art:kit
//   art/kit/                       ART_BRIEF.md, art-slots.csv, reference/ and an empty incoming/ to fill in
//   art/needle-art-kit.zip         the same, zipped (made with PowerShell on Windows or `zip` elsewhere)
// It runs art:spec and art:reference first, so the kit is always up to date.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DIRS, FOLDERS, ROOT } from './art-lib.mjs';

const run = script => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', script)], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`${script} failed`); process.exit(1); }
};
run('art-spec.mjs');
run('art-reference.mjs');

fs.rmSync(DIRS.kit, { recursive: true, force: true });
fs.mkdirSync(DIRS.kit, { recursive: true });
fs.copyFileSync(DIRS.brief, path.join(DIRS.kit, 'ART_BRIEF.md'));
fs.copyFileSync(DIRS.csv, path.join(DIRS.kit, 'art-slots.csv'));
const template = path.join(ROOT, 'art', 'REQUEST_TEMPLATE.md');
if (fs.existsSync(template)) fs.copyFileSync(template, path.join(DIRS.kit, 'REQUEST_TEMPLATE.md'));
const list = path.join(ROOT, 'art', 'ART_LIST.md');
if (fs.existsSync(list)) fs.copyFileSync(list, path.join(DIRS.kit, 'ART_LIST.md'));
const adobe = path.join(ROOT, 'art', 'ADOBE_PROMPTS.md');
if (fs.existsSync(adobe)) fs.copyFileSync(adobe, path.join(DIRS.kit, 'ADOBE_PROMPTS.md'));
if (fs.existsSync(DIRS.reference)) fs.cpSync(DIRS.reference, path.join(DIRS.kit, 'reference'), { recursive: true });
for (const f of FOLDERS) {
  const dir = path.join(DIRS.kit, 'incoming', f);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'PUT_FILES_HERE.txt'), `Put the finished ${f} files here, named exactly as in ART_BRIEF.md.\n`);
}

const zip = path.join(ROOT, 'art', 'needle-art-kit.zip');
fs.rmSync(zip, { force: true });
const r = process.platform === 'win32'
  ? spawnSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${DIRS.kit}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' })
  : spawnSync('zip', ['-r', zip, '.'], { cwd: DIRS.kit, stdio: 'inherit' });
console.log(r.status === 0 && fs.existsSync(zip) ? `\nKit ready: ${path.relative(process.cwd(), zip)}` : `\nThe folder ${path.relative(process.cwd(), DIRS.kit)} is ready. Zip it by hand (the zip tool was not available).`);
