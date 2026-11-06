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

console.log('Web assets and high-resolution logo copied to www/.');
