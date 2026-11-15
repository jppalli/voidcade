/**
 * The pictures of the items, drawn with canvas strokes in the game's colours (64 x 64 each).
 * Every one has a soft brown outline and a shadow, and a colour that stands out from hay.
 */
type C = CanvasRenderingContext2D;
type Pt = [number, number];
const TAU = Math.PI * 2;
const INK = '#76502b';

function base(c: C) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.shadowColor = '#35261288';
  c.shadowBlur = 3;
  c.shadowOffsetY = 3;
  c.strokeStyle = INK;
  c.lineWidth = 3;
}
const flat = (c: C) => {
  c.shadowColor = 'transparent';
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
};
const arc = (c: C, x: number, y: number, r: number) => {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
};
const oval = (c: C, x: number, y: number, rx: number, ry: number, rot = 0) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
};
const box = (c: C, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};
const shape = (c: C, pts: Pt[]) => {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
};
/** Fills the current path and outlines it. */
const paint = (c: C, fill: string | CanvasGradient) => {
  c.fillStyle = fill;
  c.fill();
  c.stroke();
};
const line = (c: C, x1: number, y1: number, x2: number, y2: number, color: string, w: number) => {
  c.save();
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
  c.restore();
};
/** A thick stroke with an outline: outline first, colour on top. */
const rod = (c: C, x1: number, y1: number, x2: number, y2: number, color: string, w: number) => {
  line(c, x1, y1, x2, y2, INK, w + 3);
  line(c, x1, y1, x2, y2, color, w);
};
const dot = (c: C, x: number, y: number, r: number, color: string) => {
  arc(c, x, y, r);
  c.fillStyle = color;
  c.fill();
};
const gloss = (c: C, x1: number, y1: number, x2: number, y2: number) => line(c, x1, y1, x2, y2, '#ffffffb0', 2.4);
const sparkle = (c: C, x: number, y: number, r: number) => {
  c.save();
  flat(c);
  c.fillStyle = '#fffbd0';
  c.strokeStyle = '#e0a526';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
  c.stroke();
  c.restore();
};
const grad = (c: C, x1: number, y1: number, x2: number, y2: number, stops: [number, string][]) => {
  const g = c.createLinearGradient(x1, y1, x2, y2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
};
const GOLD: [number, string][] = [[0, '#fff2a0'], [0.45, '#f0c23c'], [1, '#b98a1b']];
/** Draws several shapes as one blob: one outline around the lot, no lines where they overlap. */
const merge = (c: C, parts: (() => void)[], fill: string) => {
  c.save();
  c.lineWidth = 6;
  for (const p of parts) {
    p();
    c.fillStyle = INK;
    c.fill();
    c.stroke();
  }
  flat(c);
  for (const p of parts) {
    p();
    c.fillStyle = fill;
    c.fill();
  }
  c.restore();
};
const applePath = (c: C) => {
  c.beginPath();
  c.moveTo(32, 22);
  c.bezierCurveTo(22, 14, 10, 22, 12, 36);
  c.bezierCurveTo(14, 52, 26, 56, 32, 52);
  c.bezierCurveTo(38, 56, 50, 52, 52, 36);
  c.bezierCurveTo(54, 22, 42, 14, 32, 22);
  c.closePath();
};
const eggPath = (c: C) => oval(c, 32, 34, 15, 20);

const ART: Record<string, (c: C) => void> = {
  // ---- The Sewing Box
  button(c) {
    c.fillStyle = '#cc7756';
    c.beginPath();
    c.arc(32, 32, 19, 0, TAU);
    c.fill();
    c.stroke();
    c.shadowColor = 'transparent';
    c.strokeStyle = '#edb58c';
    c.beginPath();
    c.arc(32, 32, 14, 0, TAU);
    c.stroke();
    c.fillStyle = '#67442a';
    for (const x of [27, 37])
      for (const y of [27, 37]) {
        c.beginPath();
        c.arc(x, y, 2.5, 0, TAU);
        c.fill();
      }
  },
  spool(c) {
    c.fillStyle = '#9b7794';
    c.fillRect(21, 17, 22, 31);
    c.strokeRect(21, 17, 22, 31);
    c.strokeStyle = '#d1aac1';
    c.lineWidth = 2;
    for (let y = 21; y < 48; y += 4) {
      c.beginPath();
      c.moveTo(22, y);
      c.lineTo(42, y - 1);
      c.stroke();
    }
    c.fillStyle = '#cf9b5d';
    c.strokeStyle = INK;
    for (const y of [12, 46]) {
      c.beginPath();
      c.roundRect(15, y, 34, 8, 4);
      c.fill();
      c.stroke();
    }
  },
  thimble(c) {
    c.beginPath();
    c.moveTo(18, 50);
    c.lineTo(21, 28);
    c.quadraticCurveTo(32, 10, 43, 28);
    c.lineTo(46, 50);
    c.closePath();
    paint(c, '#cfd6dc');
    flat(c);
    for (const [x, y] of [[27, 24], [37, 24], [24, 31], [32, 31], [40, 31], [25, 38], [33, 38], [41, 38]] as Pt[]) dot(c, x, y, 1.7, '#8a96a0');
    box(c, 16, 45, 32, 10, 4);
    paint(c, '#aeb8c0');
    gloss(c, 24, 28, 25, 40);
  },
  scissors(c) {
    rod(c, 31, 38, 17, 9, '#dfe5ea', 5);
    rod(c, 33, 38, 47, 9, '#c4ccd3', 5);
    for (const x of [22, 42]) {
      arc(c, x, 47, 9);
      c.save();
      c.lineWidth = 8;
      c.stroke();
      c.strokeStyle = '#e0604a';
      c.lineWidth = 4.5;
      c.stroke();
      c.restore();
    }
    dot(c, 32, 38, 3, '#6b7680');
  },
  pincushion(c) {
    for (const [x, tx, ty, col] of [[24, 18, 10, '#ffffff'], [32, 32, 7, '#f3cf5a'], [41, 46, 10, '#58a6e8']] as [number, number, number, string][]) {
      line(c, x, 32, tx, ty, '#aab4bc', 2.2);
      dot(c, tx, ty, 3.6, col);
      c.save();
      arc(c, tx, ty, 3.6);
      c.lineWidth = 1.6;
      c.stroke();
      c.restore();
    }
    oval(c, 32, 40, 20, 14);
    paint(c, '#d9604a');
    flat(c);
    c.save();
    c.beginPath();
    c.moveTo(13, 40);
    c.quadraticCurveTo(32, 52, 51, 40);
    c.strokeStyle = '#f6dca4';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
    gloss(c, 22, 33, 28, 31);
  },
  brooch(c) {
    arc(c, 32, 33, 20);
    paint(c, '#e8c64a');
    flat(c);
    for (let k = 0; k < 10; k++) dot(c, 32 + Math.cos((k * TAU) / 10) * 16, 33 + Math.sin((k * TAU) / 10) * 16, 1.9, '#fff3a8');
    arc(c, 32, 33, 11);
    paint(c, '#4a7fd1');
    gloss(c, 27, 28, 30, 26);
    sparkle(c, 46, 16, 5);
  },
  goldneedle(c) {
    rod(c, 9, 55, 49, 15, '#f0c23c', 5);
    line(c, 11, 53, 46, 18, '#fff4b0', 1.6);
    c.save();
    c.translate(51, 13);
    c.rotate(0.78);
    oval(c, 0, 0, 3.8, 8);
    paint(c, grad(c, -4, -8, 4, 8, GOLD));
    flat(c);
    oval(c, 0, 0, 1.4, 4.6);
    c.fillStyle = '#7a5a20';
    c.fill();
    c.restore();
    sparkle(c, 16, 24, 6);
    sparkle(c, 50, 44, 5);
    sparkle(c, 10, 40, 3.5);
  },
  // ---- The Farmhouse Drawer
  feather(c) {
    c.fillStyle = '#e8d6ad';
    c.beginPath();
    c.moveTo(13, 52);
    c.bezierCurveTo(8, 25, 28, 7, 48, 10);
    c.bezierCurveTo(57, 35, 34, 49, 13, 52);
    c.fill();
    c.stroke();
    c.strokeStyle = '#ab8e61';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(10, 56);
    c.lineTo(45, 14);
    for (let i = 0; i < 4; i++) {
      c.moveTo(20 + i * 6, 43 - i * 7);
      c.lineTo(17 + i * 5, 28 - i * 5);
    }
    c.stroke();
  },
  egg(c) {
    eggPath(c);
    paint(c, '#f6eedc');
    flat(c);
    for (const [x, y] of [[27, 40], [37, 44], [34, 32], [26, 30], [40, 36], [31, 49]] as Pt[]) dot(c, x, y, 1.7, '#b79a73');
    gloss(c, 25, 24, 24, 33);
  },
  wheat(c) {
    rod(c, 32, 58, 32, 14, '#d6a93f', 3);
    for (let i = 0; i < 4; i++) {
      const y = 22 + i * 8;
      oval(c, 24, y, 6, 3, -0.7);
      paint(c, '#e7bd4d');
      oval(c, 40, y, 6, 3, 0.7);
      paint(c, '#e7bd4d');
    }
    oval(c, 32, 12, 3.4, 7);
    paint(c, '#e7bd4d');
  },
  key(c) {
    c.strokeStyle = '#b7a05d';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(20, 22, 10, 0, TAU);
    c.moveTo(27, 30);
    c.lineTo(47, 50);
    c.moveTo(39, 42);
    c.lineTo(44, 36);
    c.moveTo(46, 49);
    c.lineTo(51, 43);
    c.stroke();
    c.shadowColor = 'transparent';
    c.lineWidth = 2;
    c.strokeStyle = '#e2cf91';
    c.beginPath();
    c.moveTo(27, 28);
    c.lineTo(48, 49);
    c.stroke();
  },
  horseshoe(c) {
    c.strokeStyle = '#817b64';
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(16, 15);
    c.lineTo(14, 33);
    c.bezierCurveTo(11, 60, 53, 60, 50, 33);
    c.lineTo(48, 15);
    c.stroke();
    c.shadowColor = 'transparent';
    c.strokeStyle = '#b9af8d';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#514b3d';
    for (const [x, y] of [[16, 23], [15, 35], [23, 47], [41, 47], [49, 35], [48, 23]]) {
      c.beginPath();
      c.arc(x, y, 2, 0, TAU);
      c.fill();
    }
  },
  lantern(c) {
    c.beginPath();
    c.arc(32, 17, 9, Math.PI, 0);
    c.lineWidth = 3;
    c.stroke();
    shape(c, [[22, 23], [42, 23], [39, 16], [25, 16]]);
    paint(c, '#4f5560');
    box(c, 22, 23, 20, 26, 3);
    paint(c, '#ffe9a8');
    flat(c);
    line(c, 32, 23, 32, 49, '#4f5560', 2);
    c.beginPath();
    c.moveTo(32, 30);
    c.bezierCurveTo(39, 36, 37, 44, 32, 44);
    c.bezierCurveTo(27, 44, 25, 36, 32, 30);
    c.fillStyle = '#f08a2a';
    c.fill();
    c.beginPath();
    c.moveTo(32, 36);
    c.bezierCurveTo(35, 39, 34, 43, 32, 43);
    c.bezierCurveTo(30, 43, 29, 39, 32, 36);
    c.fillStyle = '#ffe07a';
    c.fill();
    box(c, 20, 48, 24, 8, 3);
    c.lineWidth = 3;
    paint(c, '#4f5560');
  },
  goldegg(c) {
    eggPath(c);
    paint(c, grad(c, 18, 14, 46, 54, GOLD));
    flat(c);
    gloss(c, 25, 24, 24, 33);
    sparkle(c, 46, 16, 6);
    sparkle(c, 16, 44, 4);
  },
  // ---- The Orchard Basket
  acorn(c) {
    c.fillStyle = '#b37a36';
    c.beginPath();
    c.moveTo(17, 27);
    c.bezierCurveTo(13, 43, 25, 54, 32, 57);
    c.bezierCurveTo(42, 52, 51, 38, 47, 27);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#80613c';
    c.beginPath();
    c.ellipse(32, 26, 19, 11, 0, 0, TAU);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(32, 16);
    c.lineTo(35, 9);
    c.stroke();
    c.shadowColor = 'transparent';
    c.strokeStyle = '#a58a55';
    c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(18 + i * 6, 20);
      c.lineTo(23 + i * 5, 32);
      c.stroke();
    }
  },
  leaf(c) {
    c.beginPath();
    c.moveTo(12, 52);
    c.bezierCurveTo(10, 24, 30, 10, 54, 12);
    c.bezierCurveTo(56, 36, 40, 54, 12, 52);
    c.closePath();
    paint(c, '#e0852e');
    flat(c);
    line(c, 12, 52, 46, 19, '#9a4f17', 2);
    for (const [x, y, tx, ty] of [[24, 40, 24, 28], [32, 33, 35, 22], [20, 45, 31, 44]] as number[][]) line(c, x, y, tx, ty, '#9a4f17', 1.6);
    line(c, 12, 52, 7, 58, INK, 3);
  },
  apple(c) {
    applePath(c);
    paint(c, '#d9453d');
    flat(c);
    gloss(c, 19, 28, 18, 38);
    line(c, 32, 22, 35, 11, '#6b4a2a', 4);
    oval(c, 42, 14, 7, 3.2, -0.5);
    paint(c, '#6fae3a');
  },
  pear(c) {
    c.beginPath();
    c.moveTo(32, 14);
    c.bezierCurveTo(40, 14, 38, 26, 44, 36);
    c.bezierCurveTo(50, 50, 40, 58, 32, 58);
    c.bezierCurveTo(22, 58, 12, 50, 20, 36);
    c.bezierCurveTo(26, 26, 24, 14, 32, 14);
    c.closePath();
    paint(c, '#b7cf4a');
    flat(c);
    gloss(c, 22, 42, 24, 50);
    line(c, 32, 14, 35, 6, '#6b4a2a', 3.5);
    oval(c, 42, 10, 6.5, 3, -0.4);
    paint(c, '#6fae3a');
  },
  cherries(c) {
    c.beginPath();
    c.moveTo(22, 44);
    c.quadraticCurveTo(24, 20, 38, 9);
    c.moveTo(43, 46);
    c.quadraticCurveTo(42, 22, 38, 9);
    c.lineWidth = 3;
    c.stroke();
    oval(c, 44, 13, 7, 3.2, -0.3);
    paint(c, '#6fae3a');
    for (const [x, y] of [[21, 45], [43, 47]] as Pt[]) {
      arc(c, x, y, 9.5);
      paint(c, '#c8283a');
      flat(c);
      dot(c, x - 3.5, y - 3.5, 2.2, '#ffffffa0');
      c.shadowColor = '#35261288';
      c.shadowBlur = 3;
      c.shadowOffsetY = 3;
    }
  },
  honeypot(c) {
    c.beginPath();
    c.moveTo(18, 25);
    c.bezierCurveTo(8, 36, 11, 54, 22, 57);
    c.lineTo(42, 57);
    c.bezierCurveTo(53, 54, 56, 36, 46, 25);
    c.closePath();
    paint(c, '#e8a93a');
    flat(c);
    box(c, 22, 36, 20, 13, 3);
    c.fillStyle = '#fff3d0';
    c.fill();
    c.strokeStyle = '#a56c30';
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(24, 25);
    c.bezierCurveTo(24, 33, 28, 33, 28, 26);
    c.fillStyle = '#f2c24a';
    c.fill();
    box(c, 18, 15, 28, 11, 4);
    paint(c, '#8a6a3a');
    gloss(c, 21, 42, 20, 50);
  },
  goldapple(c) {
    applePath(c);
    paint(c, grad(c, 12, 16, 52, 54, GOLD));
    flat(c);
    gloss(c, 19, 28, 18, 38);
    line(c, 32, 22, 35, 11, '#6b4a2a', 4);
    oval(c, 42, 14, 7, 3.2, -0.5);
    paint(c, '#7fbd3e');
    sparkle(c, 48, 20, 6);
    sparkle(c, 14, 48, 4);
  },
  // ---- The Winter Cabin
  mitten(c) {
    c.beginPath();
    c.moveTo(20, 56);
    c.lineTo(18, 30);
    c.bezierCurveTo(18, 10, 44, 10, 45, 30);
    c.lineTo(46, 56);
    c.closePath();
    paint(c, '#d9453d');
    oval(c, 16, 38, 6, 10, -0.45);
    paint(c, '#d9453d');
    flat(c);
    for (const [x, y] of [[32, 20], [27, 30], [37, 30], [32, 39]] as Pt[]) dot(c, x, y, 2.2, '#fff5dc');
    box(c, 17, 47, 30, 11, 4);
    c.shadowColor = '#35261288';
    c.shadowBlur = 3;
    c.shadowOffsetY = 3;
    paint(c, '#fff5dc');
  },
  snowflake(c) {
    c.save();
    c.translate(32, 32);
    for (const [col, w] of [['#4d7ea8', 8], ['#eef9ff', 4]] as [string, number][]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      for (let k = 0; k < 6; k++) {
        c.save();
        c.rotate((k * TAU) / 6);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, -23);
        c.moveTo(0, -13);
        c.lineTo(-6, -19);
        c.moveTo(0, -13);
        c.lineTo(6, -19);
        c.stroke();
        c.restore();
      }
    }
    flat(c);
    dot(c, 0, 0, 3.4, '#ffffff');
    c.restore();
  },
  candle(c) {
    oval(c, 32, 55, 18, 5);
    paint(c, '#d2a45c');
    box(c, 24, 27, 16, 28, 3);
    paint(c, '#fff1cf');
    flat(c);
    oval(c, 40, 33, 2.2, 5);
    c.fillStyle = '#fff1cf';
    c.fill();
    line(c, 32, 27, 32, 22, INK, 2);
    c.shadowColor = '#35261288';
    c.shadowBlur = 3;
    c.shadowOffsetY = 3;
    c.beginPath();
    c.moveTo(32, 6);
    c.bezierCurveTo(41, 14, 39, 23, 32, 23);
    c.bezierCurveTo(25, 23, 23, 14, 32, 6);
    paint(c, '#f7a63a');
    flat(c);
    c.beginPath();
    c.moveTo(32, 13);
    c.bezierCurveTo(36, 17, 35, 21, 32, 21);
    c.bezierCurveTo(29, 21, 28, 17, 32, 13);
    c.fillStyle = '#ffe38a';
    c.fill();
  },
  mug(c) {
    c.save();
    c.beginPath();
    c.arc(46, 38, 8, -1.3, 1.3);
    c.lineWidth = 8;
    c.stroke();
    c.strokeStyle = '#e8806a';
    c.lineWidth = 4;
    c.stroke();
    c.restore();
    box(c, 15, 22, 31, 31, 7);
    paint(c, '#e8806a');
    flat(c);
    oval(c, 30.5, 23, 15, 5);
    c.fillStyle = '#6b4328';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.stroke();
    for (const x of [25, 34]) {
      box(c, x - 3, 18, 6, 6, 2);
      c.fillStyle = '#fffaf0';
      c.fill();
    }
    for (const x of [24, 36]) {
      c.beginPath();
      c.moveTo(x, 14);
      c.quadraticCurveTo(x + 4, 9, x, 5);
      c.strokeStyle = '#ffffffcc';
      c.lineWidth = 2.4;
      c.stroke();
    }
    gloss(c, 21, 33, 21, 46);
  },
  holly(c) {
    for (const rot of [-0.75, 0.75]) {
      c.save();
      c.translate(32, 36);
      c.rotate(rot);
      c.translate(0, -10);
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k * TAU) / 10,
          r = k % 2 ? 7 : 12;
        c.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 1.25);
      }
      c.closePath();
      paint(c, '#2f7d3a');
      flat(c);
      line(c, 0, -13, 0, 13, '#7fc17a', 1.6);
      c.restore();
      c.shadowColor = '#35261288';
      c.shadowBlur = 3;
      c.shadowOffsetY = 3;
    }
    for (const [x, y] of [[32, 34], [26, 40], [38, 40]] as Pt[]) {
      arc(c, x, y, 5);
      paint(c, '#d9302e');
      dot(c, x - 1.6, y - 1.6, 1.3, '#ffffffb0');
    }
  },
  snowglobe(c) {
    box(c, 15, 47, 34, 10, 4);
    paint(c, '#8a5a34');
    arc(c, 32, 30, 19);
    paint(c, '#d7efff');
    flat(c);
    shape(c, [[32, 22], [40, 40], [24, 40]]);
    c.fillStyle = '#3f8a4a';
    c.fill();
    shape(c, [[32, 30], [43, 46], [21, 46]]);
    c.fillStyle = '#3f8a4a';
    c.fill();
    oval(c, 32, 46, 14, 3.5);
    c.fillStyle = '#ffffff';
    c.fill();
    for (const [x, y] of [[22, 22], [40, 18], [44, 32], [18, 34], [30, 14]] as Pt[]) dot(c, x, y, 1.6, '#ffffff');
    c.save();
    c.beginPath();
    c.arc(32, 30, 14, Math.PI * 1.1, Math.PI * 1.45);
    c.strokeStyle = '#ffffffd0';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  },
  iceheart(c) {
    c.beginPath();
    c.moveTo(32, 57);
    c.bezierCurveTo(8, 40, 10, 14, 24, 14);
    c.bezierCurveTo(30, 14, 32, 20, 32, 20);
    c.bezierCurveTo(32, 20, 34, 14, 40, 14);
    c.bezierCurveTo(54, 14, 56, 40, 32, 57);
    c.closePath();
    paint(c, grad(c, 12, 14, 52, 56, [[0, '#f4fdff'], [0.5, '#a9dcf5'], [1, '#6fb6e6']]));
    flat(c);
    for (const [x1, y1, x2, y2] of [[32, 20, 32, 52], [32, 36, 16, 24], [32, 36, 48, 24], [22, 20, 32, 36], [42, 20, 32, 36]] as number[][]) line(c, x1, y1, x2, y2, '#ffffffb0', 1.6);
    sparkle(c, 46, 14, 6);
    sparkle(c, 14, 46, 4);
  },
  // ---- The Night Sky
  star(c) {
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5,
        r = k % 2 ? 9 : 22;
      c.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r);
    }
    c.closePath();
    paint(c, '#ffd24a');
    flat(c);
    gloss(c, 27, 24, 31, 17);
  },
  moon(c) {
    arc(c, 28, 34, 21);
    c.fillStyle = '#f6e7a0';
    c.fill();
    c.stroke();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    arc(c, 39, 28, 17);
    c.fill();
    c.restore();
    c.save();
    arc(c, 28, 34, 21);
    c.clip();
    arc(c, 39, 28, 17);
    c.lineWidth = 3;
    c.stroke();
    c.restore();
    flat(c);
    dot(c, 15, 38, 2, '#d8c36d');
    dot(c, 20, 47, 1.6, '#d8c36d');
  },
  jar(c) {
    box(c, 17, 21, 30, 35, 9);
    paint(c, '#e6f5ff');
    flat(c);
    for (const [x, y] of [[27, 33], [38, 30], [33, 43], [25, 47], [40, 46]] as Pt[]) {
      dot(c, x, y, 5.5, '#ffe14a44');
      dot(c, x, y, 2.8, '#ffe14a');
    }
    gloss(c, 22, 27, 22, 47);
    box(c, 19, 12, 26, 10, 3);
    c.shadowColor = '#35261288';
    c.shadowBlur = 3;
    c.shadowOffsetY = 3;
    paint(c, '#a67c3d');
  },
  compass(c) {
    arc(c, 32, 11, 5);
    c.save();
    c.lineWidth = 3;
    c.stroke();
    c.restore();
    arc(c, 32, 36, 20);
    paint(c, '#d1a845');
    flat(c);
    arc(c, 32, 36, 15);
    c.fillStyle = '#fff8e4';
    c.fill();
    c.strokeStyle = '#a56c30';
    c.lineWidth = 1.6;
    c.stroke();
    for (const [x1, y1, x2, y2] of [[32, 22, 32, 25], [32, 47, 32, 50], [18, 36, 21, 36], [43, 36, 46, 36]] as number[][]) line(c, x1, y1, x2, y2, '#a56c30', 2);
    shape(c, [[32, 25], [36, 36], [28, 36]]);
    c.fillStyle = '#d9453d';
    c.fill();
    shape(c, [[32, 47], [36, 36], [28, 36]]);
    c.fillStyle = '#5a6678';
    c.fill();
    dot(c, 32, 36, 2, '#fff');
  },
  spyglass(c) {
    c.save();
    c.translate(32, 33);
    c.rotate(-0.62);
    box(c, -29, -4.5, 14, 9, 2);
    paint(c, '#c9a043');
    box(c, -16, -7, 18, 14, 2);
    paint(c, '#8a5a34');
    box(c, 1, -9.5, 21, 19, 3);
    paint(c, '#c9a043');
    flat(c);
    line(c, 6, -9, 6, 9, '#8a5a34', 2);
    oval(c, 23, 0, 3.4, 9);
    c.fillStyle = '#9fd6f0';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  },
  crystalball(c) {
    shape(c, [[19, 58], [45, 58], [41, 47], [23, 47]]);
    paint(c, '#c9a043');
    arc(c, 32, 31, 19);
    const g = c.createRadialGradient(26, 24, 3, 32, 31, 19);
    g.addColorStop(0, '#f6efff');
    g.addColorStop(0.5, '#a58ae6');
    g.addColorStop(1, '#5a3ca8');
    paint(c, g);
    flat(c);
    sparkle(c, 36, 34, 6);
    sparkle(c, 26, 40, 3);
    c.save();
    c.beginPath();
    c.arc(32, 31, 14, Math.PI * 1.1, Math.PI * 1.45);
    c.strokeStyle = '#ffffffc0';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  },
  starstone(c) {
    shape(c, [[21, 12], [43, 12], [56, 27], [32, 56], [8, 27]]);
    paint(c, grad(c, 10, 12, 54, 56, [[0, '#fff7c4'], [0.5, '#f4c13d'], [1, '#c98a1a']]));
    flat(c);
    for (const [x1, y1, x2, y2] of [[8, 27, 56, 27], [21, 12, 26, 27], [43, 12, 38, 27], [26, 27, 32, 56], [38, 27, 32, 56]] as number[][]) line(c, x1, y1, x2, y2, '#ffffffa0', 1.6);
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5,
        r = k % 2 ? 3.4 : 8;
      c.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = '#fff';
    c.fill();
    sparkle(c, 52, 12, 6);
    sparkle(c, 12, 46, 4);
  },
  // ---- Harvest Festival
  pumpkin(c) {
    merge(c, [() => oval(c, 21, 37, 11, 15), () => oval(c, 43, 37, 11, 15), () => oval(c, 32, 37, 12.5, 17)], '#f08a2a');
    flat(c);
    for (const x of [26, 38]) {
      c.beginPath();
      c.moveTo(x, 24);
      c.quadraticCurveTo(x - 3, 38, x, 52);
      c.strokeStyle = '#c4601a';
      c.lineWidth = 2;
      c.stroke();
    }
    c.shadowColor = '#35261288';
    c.shadowBlur = 3;
    c.shadowOffsetY = 3;
    box(c, 29, 12, 7, 11, 2);
    paint(c, '#5b8c2e');
  },
  corn(c) {
    c.save();
    c.translate(32, 33);
    c.rotate(0.25);
    oval(c, 0, -2, 10, 22);
    paint(c, '#f6d247');
    flat(c);
    for (let y = -16; y <= 14; y += 6) for (let x = -6; x <= 6; x += 6) dot(c, x + (y % 12 ? 0 : 3), y, 1.8, '#d9a92a');
    c.restore();
    for (const m of [1, -1]) {
      c.beginPath();
      c.moveTo(32, 58);
      c.bezierCurveTo(32 - m * 24, 52, 32 - m * 22, 28, 32 - m * 8, 20);
      c.bezierCurveTo(32 - m * 6, 32, 32 - m * 3, 46, 32, 58);
      c.shadowColor = '#35261288';
      c.shadowBlur = 3;
      c.shadowOffsetY = 3;
      paint(c, '#7fb249');
    }
  },
  strawhat(c) {
    oval(c, 32, 42, 26, 10);
    paint(c, '#e6c06a');
    c.beginPath();
    c.moveTo(17, 40);
    c.bezierCurveTo(16, 12, 48, 12, 47, 40);
    c.closePath();
    paint(c, '#efcf7a');
    flat(c);
    c.beginPath();
    c.moveTo(17.5, 34);
    c.quadraticCurveTo(32, 40, 46.5, 34);
    c.strokeStyle = '#d9453d';
    c.lineWidth = 6;
    c.stroke();
    for (const [x1, y1, x2, y2] of [[22, 24, 24, 30], [30, 20, 31, 28], [38, 22, 37, 29]] as number[][]) line(c, x1, y1, x2, y2, '#c9a043', 1.6);
  },
  pie(c) {
    c.beginPath();
    c.moveTo(9, 36);
    c.lineTo(12, 47);
    c.bezierCurveTo(24, 58, 40, 58, 52, 47);
    c.lineTo(55, 36);
    c.closePath();
    paint(c, '#d18a3a');
    oval(c, 32, 36, 23, 14);
    paint(c, '#e6a24a');
    flat(c);
    c.save();
    oval(c, 32, 36, 21, 12);
    c.clip();
    for (let k = -4; k <= 4; k++) {
      line(c, 32 + k * 8 - 14, 22, 32 + k * 8 + 14, 50, '#a8661f', 3);
      line(c, 32 + k * 8 + 14, 22, 32 + k * 8 - 14, 50, '#a8661f', 3);
    }
    c.restore();
    for (const x of [24, 36]) {
      c.beginPath();
      c.moveTo(x, 20);
      c.quadraticCurveTo(x + 4, 14, x, 8);
      c.strokeStyle = '#ffffffc0';
      c.lineWidth = 2.4;
      c.stroke();
    }
  },
  // ---- Festive Season
  ornament(c) {
    box(c, 27, 8, 10, 7, 2);
    paint(c, '#d9b84a');
    c.beginPath();
    c.arc(32, 7, 4, Math.PI, 0);
    c.lineWidth = 2;
    c.stroke();
    arc(c, 32, 37, 19);
    paint(c, '#d9453d');
    flat(c);
    c.save();
    arc(c, 32, 37, 19);
    c.clip();
    c.beginPath();
    c.moveTo(10, 37);
    c.quadraticCurveTo(32, 50, 54, 37);
    c.strokeStyle = '#f3cf5a';
    c.lineWidth = 6;
    c.stroke();
    c.restore();
    gloss(c, 22, 28, 25, 24);
  },
  gingerbread(c) {
    const parts: (() => void)[] = [
      () => arc(c, 32, 15, 9),
      () => box(c, 23, 23, 18, 22, 6),
      () => oval(c, 15, 31, 10, 4.6, -0.35),
      () => oval(c, 49, 31, 10, 4.6, 0.35),
      () => box(c, 22, 40, 9, 18, 4),
      () => box(c, 33, 40, 9, 18, 4),
    ];
    merge(c, parts, '#b8793d');
    flat(c);
    dot(c, 29, 13, 1.5, '#fff');
    dot(c, 35, 13, 1.5, '#fff');
    c.beginPath();
    c.arc(32, 16, 4, 0.2, Math.PI - 0.2);
    c.strokeStyle = '#fff';
    c.lineWidth = 1.8;
    c.stroke();
    for (const y of [30, 37]) dot(c, 32, y, 2, '#e8604a');
    for (const [x, y] of [[11, 31], [53, 31], [27, 55], [37, 55]] as Pt[]) dot(c, x, y, 1.8, '#fff');
  },
  stocking(c) {
    c.beginPath();
    c.moveTo(24, 10);
    c.lineTo(41, 10);
    c.lineTo(41, 36);
    c.bezierCurveTo(54, 38, 55, 52, 45, 56);
    c.bezierCurveTo(34, 60, 24, 55, 24, 42);
    c.closePath();
    paint(c, '#d9453d');
    flat(c);
    oval(c, 46, 52, 7, 5, -0.3);
    c.fillStyle = '#2f7d3a';
    c.fill();
    oval(c, 28, 46, 4, 5);
    c.fillStyle = '#2f7d3a';
    c.fill();
    c.shadowColor = '#35261288';
    c.shadowBlur = 3;
    c.shadowOffsetY = 3;
    box(c, 21, 7, 23, 11, 4);
    paint(c, '#fff5dc');
  },
  wreath(c) {
    for (let k = 0; k < 16; k++) {
      const a = (k * TAU) / 16;
      oval(c, 32 + Math.cos(a) * 18, 31 + Math.sin(a) * 18, 8, 4.4, a + Math.PI / 2 + 0.3);
      paint(c, k % 2 ? '#4f9a3e' : '#6fb24a');
    }
    flat(c);
    for (const k of [1, 4, 7, 10, 13]) dot(c, 32 + Math.cos((k * TAU) / 16) * 18, 31 + Math.sin((k * TAU) / 16) * 18, 3, '#d9302e');
    c.shadowColor = '#35261288';
    c.shadowBlur = 3;
    c.shadowOffsetY = 3;
    for (const m of [-1, 1]) {
      oval(c, 32 + m * 8, 53, 8, 4.6, m * -0.5);
      paint(c, '#d9302e');
    }
    arc(c, 32, 52, 3.6);
    paint(c, '#a8201e');
  },
  // ---- Look-alikes of the needle
  pin(c) {
    rod(c, 6, 32, 50, 32, '#d5dce2', 3.4);
    arc(c, 55, 32, 6.5);
    paint(c, '#d9453d');
    gloss(c, 53, 30, 55, 28);
  },
  nail(c) {
    rod(c, 6, 32, 50, 32, '#6e757c', 5);
    box(c, 49, 22, 8, 20, 2);
    paint(c, '#8c949b');
  },};

/** Ids of everything that has a picture. */
export const ART_IDS = Object.keys(ART);

/** Draws item `id` into a 64 x 64 canvas. */
export function drawItem(id: string, c: C) {
  base(c);
  (ART[id] ?? ART.button)(c);
}
