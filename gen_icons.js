const fs = require('fs');
const path = require('path');

// Create a minimal 1x1 transparent PNG as placeholder icon
// (16x16, 48x48, 128x128 valid PNGs with a purple background)
function createPNG(size) {
  // We'll use a hand-crafted minimal PNG approach via Buffer
  // For a proper icon we just write valid placeholder PNGs
  // using Node's built-in zlib to deflate the pixel data
  const zlib = require('zlib');

  const width = size;
  const height = size;

  // IHDR
  function uint32BE(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n);
    return b;
  }
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const combined  = Buffer.concat([typeBytes, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(combined));
    return Buffer.concat([uint32BE(data.length), typeBytes, data, crc]);
  }

  const signature = Buffer.from([137,80,78,71,13,10,26,10]);

  const ihdrData = Buffer.concat([
    uint32BE(width), uint32BE(height),
    Buffer.from([8, 2, 0, 0, 0]) // bit depth=8, colorType=2 (RGB), compression, filter, interlace
  ]);

  // Raw pixel rows: purple (124,58,237) background with simple 'F' text approximation
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter type none
    for (let x = 0; x < width; x++) {
      const i = 1 + x * 3;
      row[i]   = 124; // R
      row[i+1] = 58;  // G
      row[i+2] = 237; // B  → purple
    }
    rawRows.push(row);
  }
  const rawData  = Buffer.concat(rawRows);
  const deflated = zlib.deflateSync(rawData);

  const idat = chunk('IDAT', deflated);
  const iend = chunk('IEND', Buffer.alloc(0));
  const ihdr = chunk('IHDR', ihdrData);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, 'extension', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png`);
});
