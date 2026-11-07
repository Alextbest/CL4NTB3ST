import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const webDir = resolve(root, 'www');
await mkdir(webDir, { recursive: true });

for (const file of ['index.html', 'app.js', 'styles.css', 'supabaseClient.js', 'manifest.webmanifest', 'sw.js']) {
  await copyFile(resolve(root, file), resolve(webDir, file));
}

await copyFile(resolve(root, 'assets/brand-logo.png'), resolve(webDir, 'logo.png'));
await copyFile(resolve(root, 'assets/icon-192.png'), resolve(webDir, 'icon-192.png'));
await copyFile(resolve(root, 'assets/icon-512.png'), resolve(webDir, 'icon-512.png'));

const audioDir = resolve(webDir, 'audio');
await mkdir(audioDir, { recursive: true });
await copyFile(resolve(root, 'audio/world-series-i.mp3'), resolve(audioDir, 'world-series-i.mp3'));

console.log('Web assets copied to www/. Bundling app dependencies is handled by the build:web script.');