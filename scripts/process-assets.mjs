import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve('..');
const assetsDir = path.join(root, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

const fullSrc = path.join(root, 'ChatGPT Image Jul 3, 2026, 12_27_00 PM.png');
const markSrc = path.join(root, 'ChatGPT Image Jul 3, 2026, 12_53_58 PM.png');

function cleanPixels(rawBuffer, info, { white = 248, minRed = 120 } = {}) {
  const data = Buffer.from(rawBuffer);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;

    if (r >= white && g >= white && b >= white) {
      data[i + 3] = 0;
      continue;
    }

    if (spread < 28 && max > 170) {
      const fade = Math.min(255, Math.round((max - 170) * 4));
      data[i + 3] = Math.min(data[i + 3], Math.max(0, 255 - fade));
      continue;
    }

    if (r < minRed || spread < 18) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

async function processLogo(input, outputName, { hero = false } = {}) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .trim({ threshold: 10 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const outPath = path.join(assetsDir, outputName);
  await cleanPixels(data, info, { white: hero ? 242 : 246, minRed: 95 })
    .trim({ threshold: 10 })
    .sharpen({ sigma: hero ? 0.6 : 0.4, m1: 0.5, m2: 0.25 })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log(`Created ${outputName}: ${meta.width}x${meta.height}`);
}

async function createFavicon(input) {
  const outPath = path.join(assetsDir, 'favicon.png');
  await sharp(input)
    .trim({ threshold: 10 })
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log('Created favicon.png');
}

await processLogo(fullSrc, 'logo-full.png');
await processLogo(markSrc, 'logo-mark.png');
await processLogo(fullSrc, 'logo-hero.png', { hero: true });
await createFavicon(markSrc);
