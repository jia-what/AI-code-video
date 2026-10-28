// 02 · 评论形变（Comment Morph）
// 一张内容卡 → 复制成铺满屏幕的卡片墙 → 向后倾倒成透视平面 → 收缩成椭圆 → 重组成任意形状 → 径向炸开。
// 每个粒子从头到尾都是"同一张卡片"：卡片形态 ↔ 短线形态之间连续变形。
import { clamp, lerp, ease, seg, rng, noise1, mixHex, glowSprite } from '../../core/mg.js';

/**
 * 把目标形状画成一张遮罩（白色 = 形状内部）。shape 支持三种：
 *   { type: 'text',  text: 'MOTION', font: '800 300px Inter' }
 *   { type: 'path',  w, h, d: ['SVG path', ...], eye?: [x, y], spout?: [x, y] }
 *   { type: 'image', src, w, h, mode: 'alpha' | 'dark' }   // alpha：不透明处为形状；dark：深色处为形状
 */
export async function makeMask(shape) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  if (shape.type === 'text') {
    g.font = shape.font;
    const m = g.measureText(shape.text);
    const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 20;
    c.width = Math.ceil(m.width) + 20; c.height = h;
    g.font = shape.font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.fillText(shape.text, 10, m.actualBoundingBoxAscent + 10);
  } else if (shape.type === 'path') {
    c.width = shape.w; c.height = shape.h;
    g.fillStyle = '#fff';
    for (const d of [].concat(shape.d)) g.fill(new Path2D(d));
  } else {
    const img = new Image();
    img.src = shape.src;
    await img.decode();
    c.width = shape.w || img.naturalWidth; c.height = shape.h || img.naturalHeight;
    g.drawImage(img, 0, 0, c.width, c.height);
    if (shape.mode === 'dark') {
      const id = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < id.data.length; i += 4) {
        const l = (id.data[i] + id.data[i + 1] + id.data[i + 2]) / 3;
        id.data[i + 3] = id.data[i + 3] > 128 && l < 128 ? 255 : 0;
      }
      g.putImageData(id, 0, 0);
    }
  }
  const data = g.getImageData(0, 0, c.width, c.height).data;
  return { w: c.width, h: c.height, inside: (x, y) => { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < c.width && y < c.height && data[(y * c.width + x) * 4 + 3] > 128; } };
}

/** 把遮罩按"一行行文字"的样子采样成短线（屏幕单位：行距 rowGap，短线长 6–18px） */
export function sampleDashes(mask, scale, { rowGap = 9.5, seed = 7 } = {}) {
  const r = rng(seed), out = [];
  const step = rowGap / scale;
  for (let y = step / 2; y < mask.h; y += step) {
    let x = r() * 8 / scale;
    while (x < mask.w) {
      const w = (6 + r() * 12) / scale;
      if (mask.inside(x, y) && mask.inside(x + w, y) && mask.inside(x + w / 2, y)) out.push({ x: x + w / 2, y: y + (r() - .5) * 1.5 / scale, w });
      x += w + (3 + r() * 5) / scale;
    }
  }
  return out;
}

/**
 * 形变系统。opts:
 *   mask, eye?, spout?               目标形状（makeMask 的结果）和可选的"眼睛 / 喷射点"（形状坐标）
 *   center: [x, y], size              形状在屏幕上的中心与宽度（px）
 *   colors: { top, bottom }           短线颜色（按高度渐变）
 *   T = { wall, tilt, collapse, form, burst }   各阶段 [开始, 结束] 秒
 *   zoom(t)                           卡片墙阶段的相机缩放
 */
export function CommentMorph(ctx, opts) {
  const { mask, center = [960, 650], size = 1250, T, colors = { top: '#F3F1FF', bottom: '#8E7DFF' } } = opts;
  const scale = size / mask.w;
  const dashes = sampleDashes(mask, scale);
  const r = rng(3);

  // 卡片墙：按离中心的距离排序，越近越先出现
  const CW = 150, CH = 44, GX = 14, GY = 14;
  const cells = [];
  for (let j = -40; j <= 40; j++) for (let i = -26; i <= 26; i++) {
    const x = i * (CW + GX) + (j & 1 ? (CW + GX) / 2 : 0), y = j * (CH + GY);
    cells.push({ x, y, d: Math.hypot(x, y * 1.6) });
  }
  cells.sort((a, b) => a.d - b.d);
  const N = Math.min(dashes.length, cells.length);

  const P = dashes.slice(0, N).map((dsh, i) => {
    const cell = cells[i];
    const a = r() * Math.PI * 2, rr = Math.sqrt(r());
    return {
      wx: cell.x, wy: cell.y, wd: cell.d,
      dim: r() < .16,
      ex: Math.cos(a) * rr, ey: Math.sin(a) * rr,
      tx: center[0] + (dsh.x - mask.w / 2) * scale, ty: center[1] + (dsh.y - mask.h / 2) * scale, tw: dsh.w * scale * .82,
      col: mixHex(colors.top, colors.bottom, clamp(dsh.y / mask.h * .95)),
      lag: r(), ph: r() * 10, line: r(),
    };
  });
  const maxD = P[N - 1].wd;
  const toScreen = p => p && [center[0] + (p[0] - mask.w / 2) * scale, center[1] + (p[1] - mask.h / 2) * scale];
  const eye = toScreen(opts.eye), spout = toScreen(opts.spout);
  const bh = parseInt(colors.bottom.slice(1), 16);
  const glowRGB = [16, 8, 0].map(k => Math.round(((bh >> k) & 255) * .55)).join(',');
  const glow = glowSprite('142,125,255', 64), white = glowSprite('255,255,255', 64);
  const tmp = document.createElement('canvas');
  tmp.width = ctx.canvas.width; tmp.height = ctx.canvas.height;
  const tctx = tmp.getContext('2d');

  function card(x, y, w, h, alpha, dim, detail) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = dim ? '#5D5D6B' : '#F4F4F8';
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(h / 2, Math.max(1.5, h * .18))); ctx.fill();
    if (detail > .02 && w > 26) {
      ctx.globalAlpha = alpha * detail;
      ctx.fillStyle = dim ? '#7A7A88' : '#7B6BFF';
      ctx.beginPath(); ctx.arc(x - w / 2 + h * .45, y - h * .12, h * .2, 0, 7); ctx.fill();
      ctx.fillStyle = dim ? '#8A8A96' : '#C9CBD8';
      ctx.fillRect(x - w / 2 + h * .8, y - h * .26, w * .22, h * .1);
      ctx.fillStyle = dim ? '#8A8A96' : '#A9ABC0';
      ctx.fillRect(x - w / 2 + h * .25, y + h * .1, w * .7, h * .1);
    }
  }

  return {
    N,
    render(t) {
      const z = opts.zoom(t);
      const tiltP = seg(t, T.tilt[0], T.tilt[1], ease.inOutCubic);
      const tilt = tiltP * 1.12;
      const col = seg(t, T.collapse[0], T.collapse[1]);
      const form = seg(t, T.form[0], T.form[1]);
      const burst = seg(t, T.burst[0], T.burst[1]);
      const wallIn = seg(t, T.wall[0], T.wall[1]);
      const F = 1500, cosA = Math.cos(tilt), sinA = Math.sin(tilt);
      const horizon = lerp(0, 160, tiltP);
      const ell = { x: center[0], y: center[1] + 10, rx: Math.min(430, size * .34), ry: 74 };

      const glowA = form * (1 - burst);
      if (glowA > 0) {                                   // 背后的氛围光：取形状底色、压暗
        const g = ctx.createRadialGradient(center[0], center[1] + 40, 0, center[0], center[1] + 40, 900);
        g.addColorStop(0, `rgba(${glowRGB},${.42 * glowA})`); g.addColorStop(1, `rgba(${glowRGB},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      }

      for (let i = 0; i < N; i++) {
        const p = P[i];
        const appear = clamp((wallIn * maxD * 1.08 - p.wd) / 260);
        if (appear <= 0 && col === 0) continue;
        // ① 卡片墙（含倾倒透视）
        const x3 = p.wx * z, y3 = p.wy * z;
        const yy = y3 * cosA, zz = y3 * sinA;
        const s = F / (F + zz);
        const wx = 960 + x3 * s, wy = 540 + yy * s + horizon;
        const ww = CW * z * s, wh = CH * z * s * lerp(1, cosA, .85);
        const fog = clamp(1 - Math.max(0, -zz) / 2600) * clamp(1 - Math.max(0, zz) / 4200);
        // ② 椭圆（外圈先动）
        const c = ease.inOutCubic(clamp(col * 1.35 - (1 - p.wd / maxD) * .35));
        const ex = ell.x + p.ex * ell.rx, ey = ell.y + p.ey * ell.ry;
        // ③ 目标形状（错峰 + 中途打旋）
        const f = ease.outCubic(clamp(form * 1.45 - p.lag * .45));
        const swirl = Math.sin(f * Math.PI) * 60;
        const fx = lerp(ex, p.tx, f) + Math.sin(p.ph + f * 4) * swirl * .5;
        const fy = lerp(ey, p.ty, f) + Math.cos(p.ph + f * 3) * swirl * .35;
        const breathe = form > .99 ? Math.sin(p.tx * .008 - t * 2.2) * 3 : 0;

        const x = lerp(wx, fx, c), y = lerp(wy, fy, c) + breathe;
        const w = lerp(ww, lerp(9, p.tw, f), c), h = lerp(wh, 3.6, c);
        let alpha = lerp(appear * fog, 1, c);
        if (form > .99) alpha *= .72 + .28 * noise1(t * 3 + p.ph, i);

        // ④ 炸开：沿离心方向加速飞散，画成拖影
        if (burst > 0) {
          const dx = x - center[0], dy = (y - center[1]) * 1.4, d = Math.hypot(dx, dy) + 1;
          const k = ease.inExpo(clamp(burst * 1.2 - p.lag * .2)) * (900 + p.line * 1400);
          const k0 = ease.inExpo(clamp((burst - .06) * 1.2 - p.lag * .2)) * (900 + p.line * 1400);
          ctx.globalAlpha = 1 - burst * .8;
          ctx.strokeStyle = p.col; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x + dx / d * k0, y + dy / d * k0); ctx.lineTo(x + dx / d * k + 1, y + dy / d * k); ctx.stroke();
          continue;
        }
        if (c < .5) card(x, y, w, h, alpha, p.dim, 1 - c * 2);
        else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = f >= 1 ? p.col : mixHex(p.dim ? '#5D5D6B' : '#F4F4F8', p.col, f);
          ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 辉光：整帧模糊后叠加（短线阶段）
      if (col > .6) {
        tctx.setTransform(1, 0, 0, 1, 0, 0);
        tctx.clearRect(0, 0, tmp.width, tmp.height);
        tctx.drawImage(ctx.canvas, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.filter = `blur(${10 * (window.devicePixelRatio || 1)}px)`;
        ctx.globalAlpha = .55 * (col - .6) / .4;
        ctx.drawImage(tmp, 0, 0);
        ctx.restore();
      }
      // 可选：眼睛（脉动亮点）+ 喷射粒子
      if ((eye || spout) && form > .85 && burst < .3) {
        const a = seg(form, .85, 1) * (1 - burst / .3);
        ctx.globalCompositeOperation = 'lighter';
        if (eye) {
          const pulse = 1 + .25 * Math.sin(t * 5);
          ctx.globalAlpha = a; ctx.drawImage(glow, eye[0] - 40 * pulse, eye[1] - 40 * pulse, 80 * pulse, 80 * pulse);
          ctx.drawImage(white, eye[0] - 14, eye[1] - 14, 28, 28);
        }
        if (spout) for (let k = 0; k < 14; k++) {
          const q = (t * .9 + k / 14) % 1;
          ctx.globalAlpha = a * (1 - q) * .8;
          ctx.drawImage(white, spout[0] + Math.sin(k * 7.3) * 18 * q - 5, spout[1] - q * 120 - 5, 10, 10);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    },
  };
}
