/**
 * Generate favicon.ico (32px PNG-in-ICO) and apple-touch-icon.png (180px)
 * from the brand monogram — dark tile, gold "A". No image deps needed.
 *
 * Usage: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [10, 10, 10, 255];
const BORDER = [42, 42, 42, 255];
const GOLD = [200, 169, 110, 255];

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Render the monogram at a given size into an RGBA buffer. */
function renderMonogram(size) {
  const s = size / 64; // design space is 64x64
  const stroke = 5.5 * s;
  const radius = 13 * s;
  // Segments in design space: A legs + crossbar (same as favicon.svg)
  const segs = [
    [16, 51, 32, 13],
    [32, 13, 48, 51],
    [23, 37.5, 41, 37.5]
  ].map((g) => g.map((v) => v * s));

  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded-rect tile mask
      const rx = Math.max(0, Math.max(radius - x, x - (size - 1 - radius)));
      const ry = Math.max(0, Math.max(radius - y, y - (size - 1 - radius)));
      const cornerDist = Math.hypot(rx, ry);
      if (cornerDist > radius) {
        px[i + 3] = 0; // transparent outside rounded corners
        continue;
      }
      let c = BG;
      if (cornerDist > radius - 1.5 * s) c = BORDER;
      let d = Infinity;
      for (const [x1, y1, x2, y2] of segs) {
        d = Math.min(d, distToSegment(x + 0.5, y + 0.5, x1, y1, x2, y2));
      }
      const half = stroke / 2;
      if (d < half + 0.75) {
        const a = Math.max(0, Math.min(1, half + 0.75 - d)); // soft edge
        c = [
          Math.round(GOLD[0] * a + c[0] * (1 - a)),
          Math.round(GOLD[1] * a + c[1] * (1 - a)),
          Math.round(GOLD[2] * a + c[2] * (1 - a)),
          255
        ];
      }
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = c[3];
    }
  }
  return px;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Raw scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function encodeIco(pngBuffers) {
  // ICO with PNG-compressed entries (supported since Windows Vista / all browsers)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(pngBuffers.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngBuffers.length;
  for (const { size, png } of pngBuffers) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.png)]);
}

const root = path.join(__dirname, '..');
const png32 = encodePng(32, renderMonogram(32));
const png16 = encodePng(16, renderMonogram(16));
const png180 = encodePng(180, renderMonogram(180));

fs.writeFileSync(path.join(root, 'favicon.ico'), encodeIco([
  { size: 16, png: png16 },
  { size: 32, png: png32 }
]));
fs.writeFileSync(path.join(root, 'apple-touch-icon.png'), png180);
console.log('Wrote favicon.ico (16+32) and apple-touch-icon.png (180)');
