// プレースホルダーのPWAアイコンを生成するスクリプト。
// 外部の画像ライブラリを使わず、Node標準のzlibだけでPNGを直接組み立てる。
// 本番用のアイコンに差し替える際は public/icons/ 以下のファイルを置き換えればよい。
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const BG = [37, 99, 235]; // #2563eb
const FG = [255, 255, 255];

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

function roundedSquareAlpha(x, y, n, radius) {
  const inXBand = x >= radius && x <= n - 1 - radius;
  const inYBand = y >= radius && y <= n - 1 - radius;
  if (inXBand || inYBand) return true;
  const cx = x < radius ? radius : n - 1 - radius;
  const cy = y < radius ? radius : n - 1 - radius;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function generatePng(n) {
  const radius = Math.round(n * 0.22);
  const raw = Buffer.alloc(n * (1 + n * 4));

  // 「スワイプして確定」を象徴する、右にずれた白い円+薄い軌跡
  const trackY = n * 0.5;
  const ballR = n * 0.16;
  const ballCx = n * 0.62;
  const trailStartX = n * 0.24;

  for (let y = 0; y < n; y++) {
    let rowStart = y * (1 + n * 4);
    raw[rowStart] = 0; // フィルタタイプ: none
    for (let x = 0; x < n; x++) {
      const idx = rowStart + 1 + x * 4;
      const insideSquare = roundedSquareAlpha(x, y, n, radius);
      let r = 0, g = 0, b = 0, a = 0;
      if (insideSquare) {
        r = BG[0]; g = BG[1]; b = BG[2]; a = 255;

        // 軌跡（トラック）: 中央の横帯を薄い白で
        const trackHalf = n * 0.06;
        if (Math.abs(y - trackY) <= trackHalf && x >= trailStartX && x <= ballCx) {
          const t = 60; // 薄いオーバーレイ
          r = Math.round(r + (FG[0] - r) * (t / 255));
          g = Math.round(g + (FG[1] - g) * (t / 255));
          b = Math.round(b + (FG[2] - b) * (t / 255));
        }

        // ハンドル（円）: くっきり白
        const dx = x - ballCx;
        const dy = y - trackY;
        if (dx * dx + dy * dy <= ballR * ballR) {
          r = FG[0]; g = FG[1]; b = FG[2];
        }
      }
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
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

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, generatePng(size));
  console.log(`generated public/icons/icon-${size}.png`);
}
// Apple touch icon (iOS はマスク処理されるため角丸なしの正方形でも可)
writeFileSync("public/icons/apple-touch-icon.png", generatePng(180));
console.log("generated public/icons/apple-touch-icon.png");
