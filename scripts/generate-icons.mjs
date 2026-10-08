// PWAアイコンとfaviconを生成するスクリプト（node scripts/generate-icons.mjs）。
// 外部の画像ライブラリを使わず、Node標準のzlibだけでPNGを直接組み立てる。
// 図形は src/components/BrandMark.tsx の SVG（168×168 の座標系）と揃えてある。
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const BG = [37, 99, 235]; // #2563eb
const FG = [255, 255, 255];
const TRACK_ALPHA = 0.3; // リングの下地（未経過部分）の白の濃さ
const SUPERSAMPLE = 4; // 1ピクセルあたり 4×4 点で塗りを判定してアンチエイリアスする

// BrandMark.tsx の座標系（168×168）での寸法
const UNIT = 168;
const CORNER = 38;
const RING_R = 40;
const RING_W = 12;
const DOT_R = 8;
const ARC_END = Math.PI * 1.5; // 12時から時計回りに 9時まで

function crcOf(buf) {
  // node:zlib の crc32 は符号なし32bit整数を返す
  return crc32(buf) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcOf(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function insideRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** 1点（UNIT座標）の色を [r, g, b, a(0..1)] で返す */
function sample(x, y, rounded) {
  if (x < 0 || y < 0 || x > UNIT || y > UNIT) return [0, 0, 0, 0];
  if (rounded && !insideRoundedSquare(x, y, UNIT, CORNER)) return [0, 0, 0, 0];

  const c = UNIT / 2;
  const dx = x - c;
  const dy = y - c;
  const dist = Math.hypot(dx, dy);
  const half = RING_W / 2;

  const white = [...FG, 1];
  if (dist <= DOT_R) return white;

  // 経過した部分の円弧と、両端の丸いキャップ
  const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
  const onRing = Math.abs(dist - RING_R) <= half;
  if (onRing && angle <= ARC_END) return white;
  const capStart = Math.hypot(x - c, y - (c - RING_R)) <= half;
  const capEnd = Math.hypot(x - (c - RING_R), y - c) <= half;
  if (capStart || capEnd) return white;

  if (onRing) {
    return BG.map((v, i) => v + (FG[i] - v) * TRACK_ALPHA).concat(1);
  }
  return [...BG, 1];
}

function generatePng(n, { rounded = true } = {}) {
  const raw = Buffer.alloc(n * (1 + n * 4));
  const scale = UNIT / n;
  const step = 1 / SUPERSAMPLE;

  for (let py = 0; py < n; py++) {
    const rowStart = py * (1 + n * 4);
    raw[rowStart] = 0; // フィルタタイプ: none
    for (let px = 0; px < n; px++) {
      // 透明部分の色が縁に混ざらないよう、アルファで重み付けして平均する
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const [cr, cg, cb, ca] = sample(
            (px + (sx + 0.5) * step) * scale,
            (py + (sy + 0.5) * step) * scale,
            rounded,
          );
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const idx = rowStart + 1 + px * 4;
      raw[idx] = a ? Math.round(r / a) : 0;
      raw[idx + 1] = a ? Math.round(g / a) : 0;
      raw[idx + 2] = a ? Math.round(b / a) : 0;
      raw[idx + 3] = Math.round((a / (SUPERSAMPLE * SUPERSAMPLE)) * 255);
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(n, 0);
  ihdrData.writeUInt32BE(n, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk("IHDR", ihdrData);
  const idat = chunk("IDAT", deflateSync(raw));
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

/** PNGをそのまま埋め込んだICOを組み立てる（Vista以降のブラウザ・OSが対応） */
function generateIco(sizes) {
  const pngs = sizes.map((s) => generatePng(s));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);

  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, generatePng(size));
  console.log(`generated public/icons/icon-${size}.png`);
}
// iOS は透明部分を黒で塗りつぶし、角丸のマスクも自分でかけるため、角丸なしの正方形にする
writeFileSync("public/icons/apple-touch-icon.png", generatePng(180, { rounded: false }));
console.log("generated public/icons/apple-touch-icon.png");
writeFileSync("src/app/favicon.ico", generateIco([16, 32, 48]));
console.log("generated src/app/favicon.ico");
