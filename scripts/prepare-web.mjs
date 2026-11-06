import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const webDir = resolve(root, 'www');
await mkdir(webDir, { recursive: true });

const files = [
  'index.html',
  'app.js',
  'styles.css',
  'supabaseClient.js',
  'logo.png'
];

for (const file of files) {
  await copyFile(resolve(root, file), resolve(webDir, file));
}

console.log('Web assets copied to www/.');
