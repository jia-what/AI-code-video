// 02 · 评论形变（Comment Morph）
// 一张评论卡 → 复制成铺满屏幕的评论砖墙 → 向后倾倒成透视平面 → 收缩成椭圆 → 重组成任意剪影（默认鲸鱼）→ 径向炸开。
// 每个粒子从头到尾都是"同一条评论"：卡片形态 ↔ 短线形态之间连续变形。
import { clamp, lerp, ease, seg, rng, noise1, mixHex, glowSprite } from '../../core/mg.js';

/** 原创鲸鱼剪影（1000×400 坐标系，头朝左） */
export const WHALE = {
  w: 1000, h: 400,
  body: 'M40 190 C40 92 160 42 330 46 C520 52 700 92 822 150 L882 176 C906 130 934 92 988 62 C962 122 950 160 942 190 C958 222 978 270 992 322 C936 292 906 252 882 212 L822 230 C700 292 520 332 330 332 C160 332 40 290 40 190 Z',
  fin: 'M292 318 C318 366 372 392 428 398 C404 364 384 338 372 322 Z',
  eye: [118, 176],
  spout: [262, 46],
};

/**
 * 把剪影按"一行行评论"的样子采样成短线：每行间隔 rowGap，短线长度、间距随机。
 * 返回 [{ x, y, w }]（剪影坐标）
 */
export function sampleDashes(shape, { rowGap = 9.5, seed = 7 } = {}) {
  const c = document.createElement('canvas');
  c.width = shape.w; c.height = shape.h;
  const g = c.getContext('2d');
  const p1 = new Path2D(shape.body), p2 = shape.fin ? new Path2D(shape.fin) : null;
  const inside = (x, y) => g.isPointInPath(p1, x, y) || (p2 && g.isPointInPath(p2, x, y));
  const r = rng(seed), out = [];
  for (let y = 4; y < shape.h; y += rowGap) {
    let x = r() * 8;
    while (x < shape.w) {
      const w = 6 + r() * 12;
      if (inside(x + w / 2, y) && inside(x, y) && inside(x + w, y)) out.push({ x: x + w / 2, y: y + (r() - .5) * 1.5, w });
      x += w + 3 + r() * 5;
    }
  }
  return out;
}

/**
 * 形变系统。opts:
 *   shape, center:[x,y], scale       目标剪影与它在屏幕上的位置 / 大小
 *   T = { wall:[a,b], tilt:[a,b], collapse:[a,b], form:[a,b], burst:[a,b] }   各阶段时间
 *   zoom(t)                          砖墙阶段的相机缩放
 */
export function CommentMorph(ctx, opts) {
  const { shape = WHALE, center = [960, 650], scale = 1.25, T } = opts;
  const dashes = sampleDashes(shape);
  const N = dashes.length;
  const r = rng(3);

  // 砖墙：按离中心的距离排序，越近越先出现
  const CW = 150, CH = 44, GX = 14, GY = 14;
  const cells = [];
  for (let j = -32; j <= 32; j++) for (let i = -22; i <= 22; i++) {
    const x = i * (CW + GX) + (j & 1 ? (CW + GX) / 2 : 0), y = j * (CH + GY);
    cells.push({ x, y, d: Math.hypot(x, y * 1.6) });
  }
  cells.sort((a, b) => a.d - b.d);

  const P = dashes.map((dsh, i) => {
    const cell = cells[i];
    const a = r() * Math.PI * 2, rr = Math.sqrt(r());
    return {
      wx: cell.x, wy: cell.y, wd: cell.d,
      dim: r() < .16,                                                     // 少数灰色卡片
      ex: Math.cos(a) * rr, ey: Math.sin(a) * rr,                         // 椭圆内的位置（单位圆）
      tx: center[0] + (dsh.x - shape.w / 2) * scale, ty: center[1] + (dsh.y - shape.h / 2) * scale, tw: dsh.w * scale * .82,
      col: mixHex('#F3F1FF', '#8E7DFF', clamp(dsh.y / shape.h * .95)),
      lag: r(), ph: r() * 10, line: r(),
    };
  });
  const maxD = P[N - 1].wd;
  const eye = [center[0] + (shape.eye[0] - shape.w / 2) * scale, center[1] + (shape.eye[1] - shape.h / 2) * scale];
  const spout = [center[0] + (shape.spout[0] - shape.w / 2) * scale, center[1] + (shape.spout[1] - shape.h / 2) * scale];
  const glow = glowSprite('142,125,255', 64), white = glowSprite('255,255,255', 64);
  const tmp = document.createElement('canvas');
  tmp.width = ctx.canvas.width; tmp.height = ctx.canvas.height;
  const tctx = tmp.getContext('2d');

  function card(x, y, w, h, alpha, dim, detail) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = dim ? '#5D5D6B' : '#F4F4F8';
    const rad = Math.min(h / 2, Math.max(1.5, h * .18));
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, rad); ctx.fill();
    if (detail > .02 && w > 26) {
      ctx.globalAlpha = alpha * detail;
      ctx.fillStyle = dim ? '#7A7A88' : '#4A5BC8';
      ctx.beginPath(); ctx.arc(x - w / 2 + h * .45, y - h * .12, h * .2, 0, 7); ctx.fill();
      ctx.fillStyle = dim ? '#8A8A96' : '#C9CBD8';
      ctx.fillRect(x - w / 2 + h * .8, y - h * .26, w * .22, h * .1);
      ctx.fillStyle = dim ? '#8A8A96' : '#A9ABC0';
      ctx.fillRect(x - w / 2 + h * .25, y + h * .1, w * .7, h * .1);
    }
  }

  return {
    N,
    eye, spout,
    render(t) {
      const z = opts.zoom(t);
      const tilt = seg(t, T.tilt[0], T.tilt[1], ease.inOutCubic) * 1.12;      // 弧度
      const col = seg(t, T.collapse[0], T.collapse[1]);
      const form = seg(t, T.form[0], T.form[1]);
      const burst = seg(t, T.burst[0], T.burst[1]);
      const wallIn = seg(t, T.wall[0], T.wall[1]);
      const F = 1500, cosA = Math.cos(tilt), sinA = Math.sin(tilt);
      const horizon = lerp(0, 160, seg(t, T.tilt[0], T.tilt[1], ease.inOutCubic));
      const ell = { x: center[0], y: center[1] + 10, rx: 430, ry: 74 };

      // 鲸鱼成形后的辉光底
      const glowA = form * (1 - burst);
      if (glowA > 0) {
        const g = ctx.createRadialGradient(center[0], center[1] + 40, 0, center[0], center[1] + 40, 900);
        g.addColorStop(0, `rgba(74,58,190,${.42 * glowA})`); g.addColorStop(1, 'rgba(74,58,190,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      }

      for (let i = 0; i < N; i++) {
        const p = P[i];
        // ① 砖墙（含倾倒透视）
        const appear = clamp((wallIn * maxD * 1.08 - p.wd) / 260);
        if (appear <= 0 && col === 0) continue;
        const x3 = p.wx * z, y3 = p.wy * z;
        const yy = y3 * cosA, zz = y3 * sinA;
        const s = F / (F + zz);
        const wx = 960 + x3 * s, wy = 540 + yy * s + horizon;
        const ww = CW * z * s, wh = CH * z * s * lerp(1, cosA, .85);
        const fog = clamp(1 - Math.max(0, -zz) / 2600) * clamp(1 - Math.max(0, zz) / 4200);

        // ② 椭圆（错峰收拢：外圈先动）
        const c = ease.inOutCubic(clamp(col * 1.35 - (1 - p.wd / maxD) * .35));
        const ex = ell.x + p.ex * ell.rx, ey = ell.y + p.ey * ell.ry;
        // ③ 剪影（错峰散开 + 中途打旋）
        const f = ease.outCubic(clamp(form * 1.45 - p.lag * .45));
        const swirl = Math.sin(f * Math.PI) * 60;
        const fx = lerp(ex, p.tx, f) + Math.sin(p.ph + f * 4) * swirl * .5;
        const fy = lerp(ey, p.ty, f) + Math.cos(p.ph + f * 3) * swirl * .35;
        const breathe = form > .99 ? Math.sin(p.tx * .008 - t * 2.2) * 3 : 0;

        let x = lerp(wx, fx, c), y = lerp(wy, fy, c) + breathe;
        let w = lerp(ww, lerp(9, p.tw, f), c), h = lerp(wh, 3.6, c);
        let alpha = lerp(appear * fog, 1, c);
        if (form > .99) alpha *= .72 + .28 * noise1(t * 3 + p.ph, i);     // 闪烁

        // ④ 炸开：沿离心方向加速飞散，画成拖影
        if (burst > 0) {
          const dx = x - center[0], dy = (y - center[1]) * 1.4, d = Math.hypot(dx, dy) + 1;
          const k = ease.inExpo(clamp(burst * 1.2 - p.lag * .2)) * (900 + p.line * 1400);
          const k0 = ease.inExpo(clamp((burst - .06) * 1.2 - p.lag * .2)) * (900 + p.line * 1400);
          const x1 = x + dx / d * k, y1 = y + dy / d * k;
          ctx.globalAlpha = (1 - burst * .8);
          ctx.strokeStyle = p.col; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x + dx / d * k0, y + dy / d * k0); ctx.lineTo(x1 + 1, y1); ctx.stroke();
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

      // 辉光：整帧模糊后叠加（只在短线阶段）
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
      // 眼睛 + 喷水
      if (form > .85 && burst < .3) {
        const a = seg(form, .85, 1) * (1 - burst / .3);
        const pulse = 1 + .25 * Math.sin(t * 5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a; ctx.drawImage(glow, eye[0] - 40 * pulse, eye[1] - 40 * pulse, 80 * pulse, 80 * pulse);
        ctx.drawImage(white, eye[0] - 14, eye[1] - 14, 28, 28);
        for (let k = 0; k < 14; k++) {
          const q = ((t * .9 + k / 14) % 1);
          const sx = spout[0] + Math.sin(k * 7.3) * 18 * q, sy = spout[1] - q * 120;
          ctx.globalAlpha = a * (1 - q) * .8;
          ctx.drawImage(white, sx - 5, sy - 5, 10, 10);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    },
  };
}
