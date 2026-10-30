/** Genera icone PWA e splash iOS (PNG) senza dipendenze: rasterizzazione SDF + zlib. Uso: npm run icons */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const BG: [number, number, number] = [11, 11, 15];
const GREEN: [number, number, number] = [48, 209, 88];

function crc32(buf: Uint8Array): number {
  let c: number;
  let crc = ~0;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    Buffer.from(rgb.subarray(y * width * 3, (y + 1) * width * 3)).copy(
      raw,
      y * (width * 3 + 1) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** Copertura (0..1) del logo "Q" in un punto, coordinate normalizzate nel riquadro `size`. */
function coverage(x: number, y: number, size: number): number {
  const u = x / size - 0.5;
  const v = y / size - 0.5;
  const ring = Math.abs(Math.hypot(u, v + 0.02) - 0.23) < 0.043 ? 1 : 0;
  // coda: segmento da (0.06, 0.06) a (0.22, 0.22)
  const px = u - 0.06;
  const py = v - 0.06;
  const t = Math.max(0, Math.min(1, (px + py) / 0.32));
  const tail = Math.hypot(px - t * 0.16, py - t * 0.16) < 0.043 ? 1 : 0;
  return ring || tail ? 1 : 0;
}

function render(width: number, height: number, logoSize: number, rounded: boolean): Uint8Array {
  const out = new Uint8Array(width * height * 3);
  const samples = 3;
  const ox = (width - logoSize) / 2;
  const oy = (height - logoSize) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let cov = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const fx = x + (sx + 0.5) / samples - ox;
          const fy = y + (sy + 0.5) / samples - oy;
          if (fx >= 0 && fy >= 0 && fx < logoSize && fy < logoSize)
            cov += coverage(fx, fy, logoSize);
        }
      }
      cov /= samples * samples;
      const i = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(BG[c]! + (GREEN[c]! - BG[c]!) * cov);
    }
  }
  void rounded; // iOS applica da solo gli angoli arrotondati: l'icona resta a pieno quadrato
  return out;
}

const dir = 'public';
mkdirSync(dir, { recursive: true });
const icon = (name: string, size: number): void =>
  writeFileSync(join(dir, name), png(size, size, render(size, size, size * 0.9, false)));
icon('icon-192.png', 192);
icon('icon-512.png', 512);
icon('apple-touch-icon.png', 180);

// Splash iOS (portrait): iPhone 16 / 15 / 14 Pro, 16 Pro, 16 Pro Max
const splashes: Array<[string, number, number]> = [
  ['splash-1179x2556.png', 1179, 2556],
  ['splash-1206x2622.png', 1206, 2622],
  ['splash-1320x2868.png', 1320, 2868],
];
for (const [name, w, h] of splashes)
  writeFileSync(join(dir, name), png(w, h, render(w, h, Math.round(w * 0.32), false)));
console.log('icone e splash generate in public/');
