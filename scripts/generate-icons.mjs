import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const sizes = [
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

mkdirSync("icons", { recursive: true });

for (const [filename, size] of sizes) {
  const rows = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y += 1) {
    rows[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const index = y * (size * 4 + 1) + 1 + x * 4;
      const pixel = iconPixel(x, y, size);
      rows[index] = pixel[0];
      rows[index + 1] = pixel[1];
      rows[index + 2] = pixel[2];
      rows[index + 3] = 255;
    }
  }

  writeFileSync(`icons/${filename}`, png(size, size, rows));
}

function iconPixel(x, y, size) {
  const scale = size / 512;
  const center = size / 2;
  const distance = Math.hypot(x - center, y - center);
  const diagonal = (x + y) / (size * 2);
  const background = [
    Math.round(107 + (23 - 107) * diagonal),
    Math.round(145 + (72 - 145) * diagonal),
    Math.round(255 + (189 - 255) * diagonal),
  ];

  const ring = distance >= 129 * scale && distance <= 163 * scale;
  const innerCircle = distance <= 58 * scale;
  const centerCircle = distance <= 25 * scale;
  const horizontal = Math.abs(y - center) <= 17 * scale && Math.abs(x - center) >= 106 * scale && Math.abs(x - center) <= 174 * scale;
  const vertical = Math.abs(x - center) <= 17 * scale && Math.abs(y - center) >= 106 * scale && Math.abs(y - center) <= 174 * scale;

  if (centerCircle) return [23, 32, 51];
  if (ring || innerCircle || horizontal || vertical) return [255, 255, 255];
  return background;
}

function png(width, height, data) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(data)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
