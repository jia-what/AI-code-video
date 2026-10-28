// 04 · 立体点阵统计（Iso Dot Stats）
// 每一点 = 1 条数据，每块 10×10 = 100 条；发光的点 = 命中（如"鱼"）。
// 点阵块躺在 3D 地面上，相机可从斜俯视平滑转到低机位正视；正视时在点阵上方画折线图。
import { clamp, lerp, ease, seg, rng, noise1, glowSprite } from '../../core/mg.js';

/** 简易透视相机：target 看向的世界点，dist 距离，yaw / pitch（弧度），f 焦距，screen 目标点落在屏幕的位置 */
export function project(cam, x, y, z) {
  let dx = x - cam.tx, dy = y - cam.ty, dz = z - cam.tz;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  [dx, dz] = [dx * cy - dz * sy, dx * sy + dz * cy];
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  [dy, dz] = [dy * cp - dz * sp, dy * sp + dz * cp];
  const d = dz + cam.dist;
  const k = cam.f / d;
  return { x: cam.sx + dx * k, y: cam.sy - dy * k, k };
}

export const lerpCam = (a, b, p) => Object.fromEntries(Object.keys(a).map(k => [k, lerp(a[k], b[k], p)]));

/**
 * 点阵块。data = [{ label, value }]（value = 每 100 条里命中几条），
 * 返回 { blocks, render(t, cam, state) }。state:
 *   gather   粒子从四处飞来组成点阵的进度 0–1
 *   ignite(k) 第 k 块发光点的点亮进度 0–1
 */
export function DotBlocks(ctx, data, { gap = 15, spacing = 200, seed = 4 } = {}) {
  const r = rng(seed);
  const glow = glowSprite('150,130,255', 64), core = glowSprite('255,255,255', 32);
  const blocks = data.map((d, k) => {
    const cx = (k - (data.length - 1) / 2) * spacing;
    const dots = [];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++)
      dots.push({ x: cx + (i - 4.5) * gap, z: (j - 4.5) * gap, sx: r() * 1920, sy: r() * 1080, lag: r(), fish: false, ph: r() * 9 });
    const n = d.value > 0 ? Math.max(1, Math.round(d.value)) : 0;
    const pick = [...dots].sort(() => r() - .5).slice(0, n);
    pick.forEach((p, i) => { p.fish = true; p.order = i; });
    return { ...d, cx, dots, fishN: n };
  });

  return {
    blocks,
    /** 第 k 块中心（地面上）的屏幕坐标 */
    anchor(cam, k, y = 0) { return project(cam, blocks[k].cx, y, 0); },
    render(t, cam, { gather = 1, ignite = () => 1, labels = 1 }) {
      // 先画灰点，再叠发光点
      for (const b of blocks) for (const d of b.dots) {
        const p = project(cam, d.x, 0, d.z);
        const g = ease.inOutCubic(clamp(gather * 1.4 - d.lag * .4));
        const x = lerp(d.sx, p.x, g), y = lerp(d.sy, p.y, g);
        const rad = lerp(1.6, Math.max(1.2, 2.3 * p.k * 1.15), g);
        ctx.globalAlpha = lerp(.5, .9, g);
        ctx.fillStyle = '#8B8CA6';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      blocks.forEach((b, k) => {
        const ig = ignite(k);
        for (const d of b.dots) if (d.fish) {
          const q = clamp(ig * b.fishN - d.order);
          if (q <= 0 || gather < 1) continue;
          const p = project(cam, d.x, 0, d.z);
          const fl = .75 + .25 * noise1(t * 4 + d.ph, d.ph);
          const pop = 1 + .8 * Math.max(0, 1 - q * 3);
          const s = 46 * p.k * pop * fl;
          ctx.globalAlpha = Math.min(1, q * 2);
          ctx.drawImage(glow, p.x - s / 2, p.y - s / 2, s, s);
          ctx.drawImage(core, p.x - s * .18, p.y - s * .18, s * .36, s * .36);
          // 彗尾：向上的一道光
          const L = 46 * p.k * (.8 + .4 * noise1(t * 2 + d.ph, 3));
          const gr = ctx.createLinearGradient(p.x, p.y, p.x + L * .25, p.y - L);
          gr.addColorStop(0, 'rgba(200,190,255,.9)'); gr.addColorStop(1, 'rgba(200,190,255,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = 2.2 * p.k; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + L * .25, p.y - L); ctx.stroke();
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = labels * gather;
      ctx.fillStyle = '#E6E6F0';
      ctx.textAlign = 'center';
      blocks.forEach(b => {
        const p = project(cam, b.cx, 0, -7 * gap);
        ctx.font = `600 ${Math.round(26 * Math.min(1.25, p.k))}px Inter, NSC`;
        ctx.fillText(b.label, p.x, p.y + 44 * p.k);
      });
      ctx.globalAlpha = 1;
    },
  };
}

/**
 * 折线图：points = [{ x, y, label }]（屏幕坐标），head = 画到第几个点（可为小数）。
 * base = 面积填充的底线 y；drops = 每个点到点阵块的虚线终点 [{ x, y }]
 */
export function drawLineChart(ctx, points, head, { base, drops = [], labelP = () => 1 } = {}) {
  const n = points.length;
  const h = clamp(head, 0, n - 1);
  const hi = Math.floor(h), hf = h - hi;
  const pts = points.slice(0, hi + 1);
  if (hi < n - 1) pts.push({ x: lerp(points[hi].x, points[hi + 1].x, hf), y: lerp(points[hi].y, points[hi + 1].y, hf) });
  // 面积
  const ag = ctx.createLinearGradient(0, Math.min(...points.map(p => p.y)), 0, base);
  ag.addColorStop(0, 'rgba(120,100,255,.32)'); ag.addColorStop(1, 'rgba(120,100,255,0)');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.moveTo(pts[0].x, base);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, base); ctx.closePath(); ctx.fill();
  // 虚线
  ctx.setLineDash([5, 7]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(170,160,255,.45)';
  points.forEach((p, i) => { if (i <= h && drops[i]) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(drops[i].x, drops[i].y); ctx.stroke(); } });
  ctx.setLineDash([]);
  // 线：外发光 + 实线
  for (const [w, c] of [[14, 'rgba(120,100,255,.18)'], [7, 'rgba(150,130,255,.35)'], [3.2, '#D9D3FF']]) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
  }
  // 节点 + 数值
  ctx.textAlign = 'center';
  points.forEach((p, i) => {
    if (i > h + .001) return;
    const lp = labelP(i);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill();
    ctx.globalAlpha = lp;
    ctx.font = '600 34px Inter';
    ctx.fillText(p.label, p.x, p.y - 26 - (1 - lp) * 10);
    ctx.globalAlpha = 1;
  });
  return pts[pts.length - 1];
}

/** 背景：斜向流光 + 淡点阵 + 左侧紫色氛围光 */
export function drawSpace(ctx, t, { seed = 9, glowX = 520, glowY = 620 } = {}) {
  ctx.fillStyle = '#06060B'; ctx.fillRect(0, 0, 1920, 1080);
  const g = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 1100);
  g.addColorStop(0, 'rgba(60,46,170,.42)'); g.addColorStop(1, 'rgba(60,46,170,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = 'rgba(120,120,160,.16)';
  for (let x = 20; x < 1920; x += 42) for (let y = 20; y < 1080; y += 42) ctx.fillRect(x, y, 2, 2);
  const r = rng(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const sp = 120 + r() * 260, len = 30 + r() * 90, a = .04 + r() * .12;
    const x0 = r() * 2400 - 200, y0 = r() * 1400;
    const d = (t * sp + r() * 2000) % 1600;
    const x = x0 - d * .35, y = (y0 + d) % 1300 - 100;
    ctx.strokeStyle = `rgba(190,190,230,${a})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * .35, y - len); ctx.stroke();
  }
}
