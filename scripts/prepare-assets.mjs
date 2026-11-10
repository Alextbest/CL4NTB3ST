import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const assets = resolve(root, 'assets');
await mkdir(assets, { recursive: true });

const source = resolve(root, 'launcher-icon.png');
const dark = { r: 21, g: 21, b: 21, alpha: 1 };

// Existing clan artwork remains the source of truth; generate large,
// lossless source images for Android and PWA icon variants.
const logo1024 = await sharp(source)
  .rotate()
  .resize(1024, 1024, { fit: 'contain', background: dark, kernel: 'lanczos3' })
  .png()
  .toBuffer();

await sharp(logo1024).png().toFile(resolve(assets, 'brand-logo.png'));
await sharp(logo1024).png().toFile(resolve(assets, 'icon-only.png'));

await sharp(source)
  .rotate()
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
  .png()
  .toFile(resolve(assets, 'icon-foreground.png'));

await sharp({ create: { width: 1024, height: 1024, channels: 4, background: dark } })
  .png().toFile(resolve(assets, 'icon-background.png'));

for (const size of [192, 512]) {
  await sharp(logo1024).resize(size, size, { fit: 'contain', background: dark, kernel: 'lanczos3' })
    .png().toFile(resolve(assets, `icon-${size}.png`));
}

await sharp({ create: { width: 2732, height: 2732, channels: 4, background: dark } })
  .composite([{
    input: await sharp(source).resize(1350, 1350, { fit: 'contain', background: dark, kernel: 'lanczos3' }).png().toBuffer(),
    gravity: 'center'
  }])
  .png()
  .toFile(resolve(assets, 'splash.png'));

console.log('Prepared 1024px logo, PWA icons, Android adaptive icon layers and 2732px splash.');
