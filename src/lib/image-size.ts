import fs from "node:fs";

/**
 * Read an image's pixel dimensions from its header, at build time.
 *
 * WHY THIS EXISTS. Gallery photos come off phones in whatever shape the phone
 * produced — portrait, landscape, square, and in JPEG, PNG, WebP, AVIF or HEIC.
 * Two things need the real dimensions:
 *
 *   1. Rendering each photo at its true aspect ratio, so a portrait is not
 *      cropped into a landscape box.
 *   2. `next/image`, which needs width and height to reserve space and to
 *      resize — that resizing is what stops a 5MB phone photo being served at
 *      5MB.
 *
 * Doing it here rather than adding an image-size dependency keeps with the rest
 * of the project: no package to keep patched on a site that will go unmaintained
 * for stretches. Only headers are read — a few hundred bytes, not the file.
 *
 * Returns null for anything it cannot parse, and callers fall back to a fixed
 * aspect box. An unreadable file must never break a page.
 */

export interface Dimensions {
  width: number;
  height: number;
}

/* ------------------------------------------------------------------ PNG --- */

function png(buf: Buffer): Dimensions | null {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/* ----------------------------------------------------------------- JPEG --- */

function jpeg(buf: Buffer): Dimensions | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset < buf.length - 9) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];

    // SOF0–SOF15, excluding the DHT/JPG/DAC markers that share the range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

/* ----------------------------------------------------------------- WebP --- */

function webp(buf: Buffer): Dimensions | null {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;

  const format = buf.toString("ascii", 12, 16);
  if (format === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (format === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === "VP8X") {
    return {
      width: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }
  return null;
}

/* ------------------------------------------------------- AVIF and HEIC --- */

/**
 * Both are ISOBMFF containers. Dimensions live in an `ispe` box nested inside
 * meta → iprp → ipco. Rather than walking the box tree properly, scan for the
 * `ispe` fourCC — it appears once per image item, and the first is the primary
 * image in every file a phone or an export tool produces.
 */
function isobmff(buf: Buffer): Dimensions | null {
  const brand = buf.toString("ascii", 8, 12);
  const isImage = ["avif", "avis", "heic", "heix", "hevc", "mif1", "msf1"].includes(brand);
  if (!isImage && buf.toString("ascii", 4, 8) !== "ftyp") return null;

  const index = buf.indexOf("ispe", 0, "ascii");
  if (index === -1 || index + 12 > buf.length) return null;

  // ispe: 4 fourCC + 4 version/flags, then width and height as uint32.
  const width = buf.readUInt32BE(index + 8);
  const height = buf.readUInt32BE(index + 12);
  if (!width || !height) return null;
  return { width, height };
}

/* ----------------------------------------------------------------- read --- */

export function imageSize(absolutePath: string): Dimensions | null {
  let fd: number | undefined;
  try {
    fd = fs.openSync(absolutePath, "r");
    // Enough for every header above; ispe can sit a little way into an AVIF.
    const buf = Buffer.alloc(65536);
    const read = fs.readSync(fd, buf, 0, 65536, 0);
    const head = buf.subarray(0, read);

    return png(head) ?? jpeg(head) ?? webp(head) ?? isobmff(head);
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
