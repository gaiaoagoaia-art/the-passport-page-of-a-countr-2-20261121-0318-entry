// draw.ts — procedural passport renderer. Node stdlib only, fully deterministic.
// The Republic of Talverra: an invented island republic in the Northern Sea,
// capital Haldenvik. Holder: Mara Elise Ilves, born Haldenvik 14 Jun 1991.
// Passport issued 12 Mar 2024, expires 11 Mar 2034. Every stamp is dated
// after issue and before the competition deadline, in one plausible trip order.

import { glyphFor, textWidth, GLYPH_W, GLYPH_H } from "./font.ts";
import { encodePNG } from "./png.ts";

export const W = 1024;
export const H = 1024;

export type RGB = [number, number, number];

export const NAVY: RGB = [29, 58, 95];
export const TEAL: RGB = [15, 91, 82];
export const DARK_TEAL: RGB = [13, 56, 51];
export const CREAM: RGB = [243, 237, 220];
export const CREAM_DARK: RGB = [232, 224, 198];
export const INK: RGB = [32, 40, 48];
export const GOLD: RGB = [176, 138, 58];
export const STAMP_BLUE: RGB = [42, 77, 143];
export const STAMP_RED: RGB = [163, 51, 39];
export const STAMP_PURPLE: RGB = [91, 58, 122];
export const STAMP_GREEN: RGB = [46, 107, 52];
export const GUILLOCHE: RGB = [205, 196, 168];
export const GUILLOCHE_BLUE: RGB = [198, 210, 214];
export const SKIN: RGB = [230, 189, 147];
export const HAIR: RGB = [74, 50, 38];
export const JACKET: RGB = [46, 95, 90];

/** Deterministic PRNG (mulberry32) — fixed seed, no Date/random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Canvas {
  data: Buffer;
  rng: () => number;
  w: number;
  h: number;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 3, 255);
    this.rng = mulberry32(20261121);
  }

  px(x: number, y: number, c: RGB): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const o = (yi * this.w + xi) * 3;
    this.data[o] = c[0];
    this.data[o + 1] = c[1];
    this.data[o + 2] = c[2];
  }

  fill(c: RGB): void {
    for (let i = 0; i < this.w * this.h; i++) {
      this.data[i * 3] = c[0];
      this.data[i * 3 + 1] = c[1];
      this.data[i * 3 + 2] = c[2];
    }
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const o = (yy * this.w + xx) * 3;
        this.data[o] = c[0];
        this.data[o + 1] = c[1];
        this.data[o + 2] = c[2];
      }
    }
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }

  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    this.fillRect(Math.min(x0, x1), y, Math.abs(x1 - x0), t, c);
  }

  vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
    this.fillRect(x, Math.min(y0, y1), t, Math.abs(y1 - y0), c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      if (t <= 1) this.px(ax, ay, c);
      else this.fillRect(ax - Math.floor(t / 2), ay - Math.floor(t / 2), t, t, c);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ax += sx;
      }
      if (e2 < dx) {
        err += dx;
        ay += sy;
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: RGB, t = 1): void {
    for (let a = 0; a < 360; a += 0.5) {
      const rad = (a * Math.PI) / 180;
      const x = cx + Math.cos(rad) * r;
      const y = cy + Math.sin(rad) * r;
      if (t <= 1) this.px(x, y, c);
      else this.fillRect(x - t / 2, y - t / 2, t, t, c);
    }
  }

  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      const half = Math.sqrt(Math.max(0, r * r - y * y));
      this.fillRect(cx - half, cy + y, half * 2, 1, c);
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let y = -ry; y <= ry; y++) {
      const half = (rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))) | 0;
      this.fillRect(cx - half, cy + y, half * 2, 1, c);
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let a = 0; a < 360; a += 0.5) {
      const rad = (a * Math.PI) / 180;
      this.px(cx + Math.cos(rad) * rx, cy + Math.sin(rad) * ry, c);
    }
  }

  poly(points: [number, number][], c: RGB): void {
    // Scanline fill, even-odd.
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.fillRect(xs[k], y, xs[k + 1] - xs[k], 1, c);
      }
    }
  }

  polyLine(points: [number, number][], c: RGB, t = 1): void {
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      this.line(x0, y0, x1, y1, c, t);
    }
  }

  // ---- text ----
  text(
    x: number,
    y: number,
    str: string,
    scale: number,
    c: RGB,
    opts: { spacing?: number; bold?: boolean; angle?: number; cx?: number; cy?: number; worn?: boolean } = {},
  ): void {
    const spacing = opts.spacing ?? 1;
    const angle = opts.angle ?? 0;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rcx = opts.cx ?? x;
    const rcy = opts.cy ?? y;
    let cursor = 0;
    for (const ch of str) {
      const g = glyphFor(ch);
      for (let row = 0; row < GLYPH_H; row++) {
        for (let col = 0; col < GLYPH_W; col++) {
          if (g[row][col] !== "1") continue;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              let dx = cursor + col * scale + sx;
              let dy = row * scale + sy;
              if (opts.bold) dx += 1;
              let wx = x + dx;
              let wy = y + dy;
              if (angle !== 0) {
                const rx = wx - rcx;
                const ry = wy - rcy;
                wx = rcx + rx * cos - ry * sin;
                wy = rcy + rx * sin + ry * cos;
              }
              if (opts.worn && this.rng() < 0.14) continue;
              this.px(wx, wy, c);
            }
          }
        }
      }
      cursor += GLYPH_W * scale + spacing;
    }
  }

  textCentered(
    cx: number,
    y: number,
    str: string,
    scale: number,
    c: RGB,
    opts: { spacing?: number; bold?: boolean } = {},
  ): void {
    const w = textWidth(str, scale, opts.spacing ?? 1);
    this.text(cx - w / 2, y, str, scale, c, opts);
  }

  /** Word-wrap a string to maxWidth; returns lines. */
  wrap(str: string, scale: number, maxWidth: number, spacing = 1): string[] {
    const words = str.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const trial = cur ? cur + " " + word : word;
      if (textWidth(trial, scale, spacing) <= maxWidth || !cur) {
        cur = trial;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  textWrapped(
    x: number,
    y: number,
    str: string,
    scale: number,
    c: RGB,
    maxWidth: number,
    lineHeight: number,
    opts: { spacing?: number; bold?: boolean } = {},
  ): number {
    const lines = this.wrap(str, scale, maxWidth, opts.spacing ?? 1);
    lines.forEach((ln, i) => this.text(x, y + i * lineHeight, ln, scale, c, opts));
    return y + lines.length * lineHeight;
  }

  textCenteredWrapped(
    cx: number,
    y: number,
    str: string,
    scale: number,
    c: RGB,
    maxWidth: number,
    lineHeight: number,
    opts: { spacing?: number; bold?: boolean } = {},
  ): number {
    const lines = this.wrap(str, scale, maxWidth, opts.spacing ?? 1);
    lines.forEach((ln, i) => this.textCentered(cx, y + i * lineHeight, ln, scale, c, opts));
    return y + lines.length * lineHeight;
  }
}

/** Star polygon points (8-point compass star). */
export function starPoints(cx: number, cy: number, rOuter: number, rInner: number, points = 8): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

// ---- MRZ (ICAO TD3, check digits computed properly) ----
const MRZ_WEIGHTS = [7, 3, 1];
function mrzCharValue(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return 0; // "<"
}
export function mrzCheck(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += mrzCharValue(s[i]) * MRZ_WEIGHTS[i % 3];
  return sum % 10;
}

export function mrzLines(): [string, string] {
  const doc = "TV482917<"; // 9-char document field
  const docC = String(mrzCheck(doc));
  const dob = "910614";
  const dobC = String(mrzCheck(dob));
  const exp = "340311";
  const expC = String(mrzCheck(exp));
  const opt = "<<<<<<<<<<<<<<"; // 14 chars, no personal number
  const optC = "0";
  const line1name = "ILVES<<MARA<ELISE".padEnd(39, "<");
  const line1 = "P<TVA" + line1name;
  const composite = mrzCheck(doc + docC + dob + dobC + exp + expC + opt + optC);
  const line2 = doc + docC + "TVA" + dob + dobC + "F" + exp + expC + opt + optC + String(composite);
  return [line1, line2];
}

// ---- guilloché background: faint sine waves + rosettes ----
export function guilloche(cv: Canvas, x0: number, y0: number, x1: number, y1: number, color: RGB): void {
  for (let y = y0 + 14; y < y1; y += 22) {
    let prevX = x0;
    let prevY = y;
    for (let x = x0 + 8; x <= x1; x += 8) {
      const yy = y + Math.sin((x / 46 + y / 30) * Math.PI * 2) * 3;
      cv.line(prevX, prevY, x, yy, color, 1);
      prevX = x;
      prevY = yy;
    }
  }
}

export function rosette(cv: Canvas, cx: number, cy: number, r: number, color: RGB): void {
  for (let rr = r; rr > 4; rr -= 7) cv.circle(cx, cy, rr, color, 1);
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    cv.line(cx + Math.cos(rad) * 6, cy + Math.sin(rad) * 6, cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, color, 1);
  }
  cv.fillCircle(cx, cy, 3, color);
}

// ---- coat of arms: shield, 8-point star, three waves, motto ribbon ----
export function coatOfArms(cv: Canvas, cx: number, cy: number, s: number, withMotto: boolean): void {
  // s = shield half-width scale; shield ~ 2.4s tall
  const w = s;
  const top = cy - s * 1.1;
  const mid = cy + s * 0.15;
  const bot = cy + s * 1.3;
  // shield outline
  const pts: [number, number][] = [
    [cx - w, top],
    [cx + w, top],
    [cx + w, mid],
    [cx, bot],
    [cx - w, mid],
  ];
  cv.poly(pts, NAVY);
  cv.polyLine(pts, GOLD, 2);
  // gold band across middle
  cv.poly(
    [
      [cx - w + 3, mid - s * 0.28],
      [cx + w - 3, mid - s * 0.28],
      [cx + w - 3, mid - s * 0.1],
      [cx - w + 3, mid - s * 0.1],
    ],
    GOLD,
  );
  // star on the upper field
  cv.poly(starPoints(cx, top + (mid - top) * 0.42, s * 0.52, s * 0.2), [240, 214, 140]);
  // waves on the lower field
  for (let i = 0; i < 3; i++) {
    const wy = mid + s * 0.28 + i * s * 0.26;
    let px0 = cx - w * 0.72;
    let py0 = wy;
    for (let x = cx - w * 0.72; x <= cx + w * 0.72; x += 6) {
      const yy = wy + Math.sin(((x - cx) / (w * 0.5)) * Math.PI) * s * 0.09;
      cv.line(px0, py0, x, yy, [235, 240, 235], 2);
      px0 = x;
      py0 = yy;
    }
  }
  if (withMotto) {
    const ry = bot + 14;
    // ribbon
    cv.fillRect(cx - s * 1.05, ry, s * 2.1, 20, TEAL);
    cv.poly(
      [
        [cx - s * 1.05, ry],
        [cx - s * 1.3, ry + 10],
        [cx - s * 1.05, ry + 20],
      ],
      DARK_TEAL,
    );
    cv.poly(
      [
        [cx + s * 1.05, ry],
        [cx + s * 1.3, ry + 10],
        [cx + s * 1.05, ry + 20],
      ],
      DARK_TEAL,
    );
    cv.textCentered(cx, ry + 3, "MERI JA MAA", 2, [245, 240, 220], { bold: true });
  }
}

// ---- portrait: flat vector photo of Mara Ilves, 34, dark hair in a bun ----
export function portrait(cv: Canvas, x: number, y: number, w: number, h: number): void {
  // background: pale blue-grey with faint arcs
  for (let i = 0; i < w; i++) {
    const t = i / w;
    const r = Math.round(205 + 12 * t);
    const g = Math.round(216 + 8 * t);
    const b = Math.round(222 + 6 * t);
    cv.fillRect(x + i, y, 1, h, [r, g, b]);
  }
  cv.circle(x + w / 2, y + h * 0.42, 52, [190, 202, 210], 1);
  cv.circle(x + w / 2, y + h * 0.42, 40, [190, 202, 210], 1);
  const cx = x + w / 2;
  const cy = y + h * 0.42;
  // shoulders / jacket
  cv.poly(
    [
      [x + 4, y + h],
      [x + 4, y + h * 0.82],
      [cx - 26, y + h * 0.72],
      [cx + 26, y + h * 0.72],
      [x + w - 4, y + h * 0.82],
      [x + w - 4, y + h],
    ],
    JACKET,
  );
  // white shirt collar
  cv.poly(
    [
      [cx - 16, y + h * 0.72],
      [cx, y + h * 0.86],
      [cx + 16, y + h * 0.72],
      [cx + 9, y + h * 0.7],
      [cx, y + h * 0.76],
      [cx - 9, y + h * 0.7],
    ],
    [245, 244, 238],
  );
  // neck
  cv.fillRect(cx - 11, cy + 26, 22, 22, [222, 178, 134]);
  // ears
  cv.fillEllipse(cx - 33, cy + 2, 6, 9, SKIN);
  cv.fillEllipse(cx + 33, cy + 2, 6, 9, SKIN);
  // head
  cv.fillEllipse(cx, cy, 33, 41, SKIN);
  // hair: cap over the top + sides down to the jaw, bun on top
  cv.poly(
    [
      [cx - 34, cy - 6],
      [cx - 34, cy - 26],
      [cx - 20, cy - 40],
      [cx, cy - 43],
      [cx + 20, cy - 40],
      [cx + 34, cy - 26],
      [cx + 34, cy - 6],
      [cx + 28, cy - 18],
      [cx + 14, cy - 30],
      [cx, cy - 32],
      [cx - 14, cy - 30],
      [cx - 28, cy - 18],
    ],
    HAIR,
  );
  cv.fillCircle(cx, cy - 44, 11, HAIR);
  // face: brows, eyes, nose, lips
  cv.line(cx - 20, cy - 8, cx - 8, cy - 9, HAIR, 2);
  cv.line(cx + 8, cy - 9, cx + 20, cy - 8, HAIR, 2);
  cv.fillEllipse(cx - 14, cy - 2, 4, 2, [40, 32, 28]);
  cv.fillEllipse(cx + 14, cy - 2, 4, 2, [40, 32, 28]);
  cv.line(cx, cy + 2, cx - 2, cy + 14, [190, 140, 100], 2);
  cv.line(cx - 7, cy + 22, cx + 7, cy + 22, [150, 70, 60], 2);
  // soft cheek shading
  cv.fillEllipse(cx - 22, cy + 12, 5, 4, [226, 172, 128]);
  cv.fillEllipse(cx + 22, cy + 12, 5, 4, [226, 172, 128]);
}

// ---- stamps ----
// Rotated multi-line stamp text, centered on (cx, cy), with worn ink.
export function stampText(
  cv: Canvas,
  cx: number,
  cy: number,
  lines: string[],
  scale: number,
  color: RGB,
  angle: number,
  lineGap: number,
): void {
  const totalH = lines.length * GLYPH_H * scale + (lines.length - 1) * lineGap;
  let y = cy - totalH / 2;
  for (const ln of lines) {
    const w = textWidth(ln, scale, 1);
    cv.text(cx - w / 2, y, ln, scale, color, { angle, cx, cy, worn: true, bold: true });
    y += GLYPH_H * scale + lineGap;
  }
}

export function ovalStamp(
  cv: Canvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: RGB,
  angle: number,
  lines: string[],
  scale: number,
): void {
  // Rotated ellipse outline is approximated by drawing the ellipse then
  // rotating the text; the outline stays axis-aligned (small angles read fine).
  cv.ellipse(cx, cy, rx, ry, color);
  cv.ellipse(cx, cy, rx - 5, ry - 5, color);
  stampText(cv, cx, cy, lines, scale, color, angle, 5);
}

export function rectStamp(
  cv: Canvas,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: RGB,
  angle: number,
  lines: string[],
  scale: number,
): void {
  // Draw a rotated rectangle outline by rotating its corners.
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rot = (dx: number, dy: number): [number, number] => [
    cx + dx * cos - dy * sin,
    cy + dx * sin + dy * cos,
  ];
  const hw = w / 2;
  const hh = h / 2;
  const corners = [rot(-hw, -hh), rot(hw, -hh), rot(hw, hh), rot(-hw, hh)];
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = corners[i];
    const [x1, y1] = corners[(i + 1) % 4];
    cv.line(x0, y0, x1, y1, color, 2);
  }
  const inset = 6;
  const inner = [rot(-hw + inset, -hh + inset), rot(hw - inset, -hh + inset), rot(hw - inset, hh - inset), rot(-hw + inset, hh - inset)];
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = inner[i];
    const [x1, y1] = inner[(i + 1) % 4];
    cv.line(x0, y0, x1, y1, color, 1);
  }
  stampText(cv, cx, cy, lines, scale, color, angle, 4);
}

// ---- the spread ----
export function renderPassport(): Canvas {
  const cv = new Canvas(W, H);

  // Passport cover showing around the open spread.
  cv.fill(DARK_TEAL);
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(cv.rng() * W);
    const y = Math.floor(cv.rng() * H);
    cv.px(x, y, cv.rng() < 0.5 ? [18, 66, 60] : [10, 46, 42]);
  }

  // Two pages.
  cv.fillRect(24, 40, 484, 944, CREAM);
  cv.fillRect(516, 40, 484, 944, CREAM);
  cv.rect(24, 40, 484, 944, [190, 178, 146], 2);
  cv.rect(516, 40, 484, 944, [190, 178, 146], 2);
  // Gutter shadow between the pages.
  cv.fillRect(508, 40, 8, 944, [214, 206, 182]);
  cv.vline(511, 40, 984, [180, 168, 136], 2);

  // Faint guilloché wash on both pages.
  guilloche(cv, 30, 46, 502, 300, GUILLOCHE);
  guilloche(cv, 522, 46, 994, 300, GUILLOCHE);
  guilloche(cv, 30, 700, 502, 978, GUILLOCHE);
  guilloche(cv, 522, 640, 994, 978, GUILLOCHE);
  rosette(cv, 484, 70, 18, GUILLOCHE_BLUE);
  rosette(cv, 540, 70, 18, GUILLOCHE_BLUE);

  // ================= LEFT PAGE: data page =================
  const LX = 264; // left page centre
  coatOfArms(cv, LX, 92, 24, false);
  cv.textCentered(LX, 128, "REPUBLIC OF TALVERRA", 3, NAVY, { bold: true });
  cv.textCentered(LX, 156, "PASSPORT - PASSPOART", 2, TEAL, { bold: true });
  cv.hline(48, 480, 176, GOLD, 2);
  cv.hline(48, 480, 180, GOLD, 1);

  // Photo box.
  cv.fillRect(48, 196, 144, 196, [205, 216, 222]);
  portrait(cv, 54, 202, 132, 184);
  cv.rect(48, 196, 144, 196, NAVY, 2);
  cv.rect(52, 200, 136, 188, NAVY, 1);

  // Data fields, right of the photo.
  const FX = 208;
  const field = (y: number, label: string, value: string, vscale = 3): void => {
    cv.text(FX, y, label, 1, [90, 100, 110], { bold: true });
    cv.text(FX, y + 14, value, vscale, INK, { bold: true });
  };
  field(200, "SURNAME", "ILVES");
  field(248, "GIVEN NAMES", "MARA ELISE");
  field(296, "NATIONALITY", "TALVERRAN");
  field(344, "DATE OF BIRTH", "14 JUN 1991");
  field(392, "PLACE OF BIRTH", "HALDENVIK");

  // Lower data rows, full width.
  const row = (y: number, x: number, label: string, value: string): void => {
    cv.text(x, y, label, 1, [90, 100, 110], { bold: true });
    cv.text(x, y + 14, value, 2, INK, { bold: true });
  };
  row(452, 48, "SEX", "F");
  row(452, 150, "HEIGHT", "168 CM");
  row(452, 300, "EYES", "GREY-BLUE");
  row(514, 48, "DATE OF ISSUE", "12 MAR 2024");
  row(514, 280, "DATE OF EXPIRY", "11 MAR 2034");
  row(576, 48, "ISSUING AUTHORITY", "HALDENVIK PASSPORT OFFICE");
  // Passport number + holder's signature.
  cv.text(48, 638, "PASSPORT NO.", 1, [90, 100, 110], { bold: true });
  cv.text(48, 652, "TV 482 917", 3, INK, { bold: true });
  // Signature squiggle.
  let sx = 300;
  let sy = 662;
  for (let i = 0; i < 44; i++) {
    const nx = sx + 4;
    const ny = 662 + Math.sin(i * 0.9) * 6 - i * 0.12;
    cv.line(sx, sy, nx, ny, INK, 2);
    sx = nx;
    sy = ny;
  }
  cv.hline(300, 484, 676, INK, 1);
  cv.textCentered(392, 682, "HOLDER'S SIGNATURE", 1, [90, 100, 110]);

  // Remarks.
  cv.hline(48, 480, 716, [190, 178, 146], 1);
  cv.text(48, 728, "REMARKS", 1, [90, 100, 110], { bold: true });
  cv.textWrapped(
    48,
    742,
    "BEARER IS ENTITLED TO THE PROTECTION OF THE REPUBLIC OF TALVERRA AND TO CONSULAR ASSISTANCE IN ALL STATES.",
    1,
    INK,
    432,
    12,
  );

  // Machine-readable zone (real check digits, see mrzLines).
  const [mrz1, mrz2] = mrzLines();
  cv.hline(48, 480, 836, [190, 178, 146], 1);
  cv.text(42, 852, mrz1, 2, INK, { spacing: 0 });
  cv.text(42, 876, mrz2, 2, INK, { spacing: 0 });
  cv.text(48, 916, "TVA", 1, [90, 100, 110]);
  cv.text(468, 916, "12", 1, [90, 100, 110]);

  // ================= RIGHT PAGE: visas and stamps =================
  const RX = 762; // right page centre
  cv.textCentered(RX, 66, "VISAS", 4, NAVY, { bold: true });
  cv.textCentered(RX, 100, "STAMPS AND ENDORSEMENTS", 2, TEAL, { bold: true });
  cv.hline(540, 984, 124, GOLD, 2);

  // Nordmark short-stay visa sticker — the telling detail:
  // Talverra is an island; the visa lets the holder in BY SEA FROM HALDENVIK ONLY.
  cv.fillRect(548, 146, 240, 190, [222, 232, 221]);
  cv.rect(548, 146, 240, 190, TEAL, 2);
  cv.rect(553, 151, 230, 180, TEAL, 1);
  cv.textCentered(668, 160, "NORDMARK", 3, STAMP_BLUE, { bold: true });
  cv.textCentered(668, 186, "SHORT-STAY VISA - C", 2, STAMP_BLUE, { bold: true });
  cv.hline(562, 774, 206, STAMP_BLUE, 1);
  cv.textWrapped(
    562,
    216,
    "CONDITION 14 - SINGLE ENTRY BY SEA FROM HALDENVIK ONLY. VALID 90 DAYS. FEE 40 NMK PAID.",
    1,
    INK,
    212,
    12,
  );
  cv.textCentered(648, 268, "ISSUED HALDENVIK", 1, INK);
  cv.textCentered(648, 282, "12 MAR 2024", 1, INK, { bold: true });

  // Fee-paid stamp inside the visa's lower-right corner.
  const feeCx = 746;
  const feeCy = 300;
  cv.circle(feeCx, feeCy, 34, STAMP_RED, 2);
  cv.circle(feeCx, feeCy, 28, STAMP_RED, 1);
  const feeLine = (y: number, s: string, scale: number): void => {
    const w = textWidth(s, scale, 1);
    cv.text(feeCx - w / 2, y, s, scale, STAMP_RED, { angle: -12, cx: feeCx, cy: feeCy, worn: true, bold: true });
  };
  feeLine(feeCy - 18, "FEE PAID", 1);
  feeLine(feeCy - 5, "40 NMK", 2);

  // Endorsements box.
  cv.rect(824, 146, 160, 190, NAVY, 1);
  cv.textCentered(904, 160, "ENDORSEMENTS", 1, NAVY, { bold: true });
  cv.hline(834, 974, 176, NAVY, 1);
  cv.textWrapped(
    834,
    186,
    "BEARER MAY TRAVEL WITH ONE MINOR CHILD UNDER 12. SEAMAN'S BOOK NO. TV-77-014.",
    1,
    INK,
    140,
    12,
  );
  cv.circle(904, 306, 15, NAVY, 1);
  cv.poly(starPoints(904, 306, 10, 4, 5), NAVY);
  cv.textCentered(904, 326, "HALDENVIK", 1, NAVY);

  // Travel history — every stamp after the 12 MAR 2024 issue, in trip order:
  // out of Talverra 06 MAY 2024, Nordmark in 08 MAY, Ostara out 21 JUN 2024,
  // Veldorra in 03 OCT 2025, Karsten Isles in 17 FEB 2026.
  ovalStamp(cv, 654, 415, 100, 52, STAMP_BLUE, -8, ["NORDMARK", "ARRIVAL", "08 MAY 2024"], 2);
  rectStamp(cv, 884, 415, 190, 100, STAMP_RED, 6, ["OSTARA", "DEPARTURE", "21 JUN 2024"], 2);
  ovalStamp(cv, 654, 555, 100, 52, STAMP_PURPLE, -5, ["VELDORRA", "ARRIVAL", "03 OCT 2025"], 2);
  rectStamp(cv, 884, 555, 190, 100, STAMP_GREEN, 4, ["KARSTEN ISLES", "ENTRY", "17 FEB 2026"], 2);

  // Talverra exit stamp (home departure that starts the trip).
  cv.circle(612, 712, 42, STAMP_BLUE, 2);
  cv.circle(612, 712, 36, STAMP_BLUE, 1);
  const exitLine = (y: number, s: string, scale: number): void => {
    const w = textWidth(s, scale, 1);
    cv.text(612 - w / 2, y, s, scale, STAMP_BLUE, { angle: -10, cx: 612, cy: 712, worn: true, bold: true });
  };
  exitLine(712 - 22, "TALVERRA", 1);
  exitLine(712 - 8, "EXIT", 2);
  exitLine(712 + 10, "06 MAY 2024", 1);

  // Coat of arms, large, bottom right.
  coatOfArms(cv, 862, 726, 52, true);

  // Footer.
  cv.textCentered(
    RX,
    908,
    "THIS PASSPORT REMAINS THE PROPERTY OF THE REPUBLIC OF TALVERRA.",
    1,
    [90, 100, 110],
  );
  cv.textCentered(RX, 924, "IF FOUND PLEASE RETURN TO THE NEAREST TALVERRAN CONSULATE.", 1, [90, 100, 110]);
  cv.text(968, 948, "13", 1, [90, 100, 110]);

  return cv;
}

/** Render the entry and return PNG bytes. Deterministic. */
export function render(): Buffer {
  const cv = renderPassport();
  return encodePNG(W, H, cv.data);
}
