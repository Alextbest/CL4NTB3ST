import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const assets = resolve(root, 'assets');
await mkdir(assets, { recursive: true });

const source = resolve(root, 'logo.png');
const background = { r: 16, g: 11, b: 24, alpha: 1 };

// Keep the existing clan artwork and create large, losslessly stored source
// canvases for Android adaptive icons and the native launch screen.
await sharp(source)
  .resize(1024, 1024, { fit: 'contain', background })
  .png()
  .toFile(resolve(assets, 'icon-only.png'));

await sharp(source)
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(resolve(assets, 'icon-foreground.png'));

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background }
}).png().toFile(resolve(assets, 'icon-background.png'));

await sharp({
  create: { width: 2732, height: 2732, channels: 4, background }
})
  .composite([{
    input: await sharp(source).resize(1350, 1350, { fit: 'contain' }).png().toBuffer(),
    gravity: 'center'
  }])
  .png()
  .toFile(resolve(assets, 'splash.png'));

console.log('High-resolution Capacitor icon and splash source images prepared.');
