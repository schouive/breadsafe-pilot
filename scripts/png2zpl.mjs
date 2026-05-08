import sharp from 'sharp';
import fs from 'fs';

async function pngToZpl(path, targetWidth) {
  // Resize to target width, convert to grayscale, then threshold to 1-bit
  const { data, info } = await sharp(path)
    .resize({ width: targetWidth, withoutEnlargement: false })
    .flatten({ background: '#ffffff' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const bytesPerRow = Math.ceil(w / 8);
  const total = bytesPerRow * h;
  const buf = Buffer.alloc(total, 0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = data[y * w + x];
      // black pixel = bit 1
      if (px < 128) {
        const byteIdx = y * bytesPerRow + (x >> 3);
        buf[byteIdx] |= 0x80 >> (x & 7);
      }
    }
  }

  const hex = buf.toString('hex').toUpperCase();
  return { gfa: `^GFA,${total},${total},${bytesPerRow},${hex}`, width: w, height: h };
}

const targets = [
  { path: 'src/assets/logo-breadshop.png', width: 200, key: 'BREADSHOP' },
  { path: 'src/assets/label-triman.png', width: 90, key: 'TRIMAN' },
  { path: 'src/assets/label-logo-m.png', width: 90, key: 'RECYCLE' },
];

const out = {};
for (const t of targets) {
  const r = await pngToZpl(t.path, t.width);
  out[t.key] = r;
  console.error(`${t.key}: ${r.width}x${r.height}, ${r.gfa.length} chars`);
}

fs.writeFileSync('/tmp/zpl-logos.json', JSON.stringify(out, null, 2));
console.error('Written /tmp/zpl-logos.json');
