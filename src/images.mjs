/**
 * Image sniffing and embedding.
 *
 * We deliberately avoid image libraries: reading the PNG/JPEG/WebP/SVG header
 * is enough to validate dimensions and alpha, and data URLs keep rendering
 * fully local (no temp asset files, no network).
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import { sha256Buffer, shortPath } from './utils.mjs';

const MIME_BY_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export function imageData(file, baseDir, role, { warn = console.warn } = {}) {
  if (!file) throw new Error(`Missing ${role} path.`);
  const abs = isAbsolute(file) ? file : resolve(baseDir, file);
  if (!existsSync(abs)) throw new Error(`${role} not found: ${abs}`);

  const buffer = readFileSync(abs);
  const extension = extname(abs).toLowerCase();
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) {
    throw new Error(
      `Unsupported ${role} format "${extension || 'unknown'}" (${abs}). Use PNG, JPEG, WebP or SVG.`,
    );
  }

  const info = imageInfo(buffer);
  if (!info) throw new Error(`Could not read ${role} dimensions: ${abs}`);
  if (role === 'screenshot' && (info.width < 320 || info.height < 320)) {
    warn(`${shortPath(abs)} is only ${info.width}×${info.height}; the result may look soft.`);
  }
  if (role === 'screenshot' && info.alpha) {
    warn(`${shortPath(abs)} has an alpha channel; flatten transparent edges before publishing.`);
  }

  return {
    path: abs,
    width: info.width,
    height: info.height,
    alpha: info.alpha,
    sha256: sha256Buffer(buffer),
    dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
  };
}

/** Read width, height and alpha presence from an image buffer (no decoding). */
export function imageInfo(buffer) {
  // SVG (logos, vector artwork)
  if (buffer.length > 32) {
    const head = buffer.toString('utf8', 0, Math.min(buffer.length, 4096));
    if (/<svg[\s>]/i.test(head)) {
      const tag = head.match(/<svg[\s\S]*?>/i)?.[0] || '';
      const num = (name) => {
        const match = tag.match(new RegExp(name + "\\s*=\\s*[\"']([0-9.]+)", 'i'));
        return match ? Number(match[1]) : null;
      };
      let width = num('width');
      let height = num('height');
      if (!width || !height) {
        const viewBox = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
        if (viewBox) {
          width = width || Number(viewBox[1]);
          height = height || Number(viewBox[2]);
        }
      }
      if (width && height) {
        return { width: Math.round(width), height: Math.round(height), alpha: true, format: 'svg' };
      }
    }
  }

  // PNG
  if (buffer.length > 26 && buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const colorType = buffer[25];
    let alpha = colorType === 4 || colorType === 6;
    for (let offset = 8; offset + 8 <= buffer.length;) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      if (type === 'tRNS') {
        alpha = true;
        break;
      }
      if (type === 'IDAT' || type === 'IEND') break;
      offset += 12 + length;
    }
    return { width, height, alpha, format: 'png' };
  }

  // JPEG
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = buffer.readUInt16BE(offset + 2);
      const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isStartOfFrame) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
          alpha: false,
          format: 'jpeg',
        };
      }
      offset += 2 + length;
    }
  }

  // WebP
  if (buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
        alpha: Boolean(buffer[20] & 0x10),
        format: 'webp',
      };
    }
    if (chunk === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
        alpha: false,
        format: 'webp',
      };
    }
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
        alpha: Boolean((bits >> 28) & 1),
        format: 'webp',
      };
    }
  }

  return null;
}

export function fileInfo(file) {
  if (!existsSync(file)) return null;
  return imageInfo(readFileSync(file));
}
