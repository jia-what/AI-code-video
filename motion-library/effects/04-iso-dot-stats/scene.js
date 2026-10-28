// 04 · 立体点阵统计：时间轴。内容全部来自 config（见 config.js）。
import { cue, seg, ease, lerp, blurIn, Cursor, makeCanvas } from '../../core/mg.js';
import { rich } from '../../core/player.js';
import { DotBlocks, drawLineChart, drawSpace, lerpCam } from './iso-dot-stats.js';

export default function scene(stage, cfg) {
  const { ctx } = makeCanvas(stage);
  stage.insertBefore(ctx.canvas, stage.firstChild);
  const el = (id, html) => { const e = document.createElement('div'); e.id = id; e.innerHTML = html; stage.appendChild(e); return e; };
  const legend = el('legend', rich(cfg.legend).replace('<span class="hl">', '<span class="hl"><i></i>'));
  const num = el('num', ''), pill = el('pill', rich(cfg.intro.note)), cap = el('cap', rich(cfg.caption));
  const DATA = cfg.data, n = DATA.length;
  const fmt = v => v.toFixed(cfg.decimals) + cfg.unit;

  const blocks = DotBlocks(ctx, DATA, { spacing: Math.min(200, 1300 / n) });
  const camA = { tx: 0, ty: 0, tz: 0, dist: 1600, yaw: -.62, pitch: -.95, f: 1500, sx: 1000, sy: 560 };
  const camA2 = { ...camA, yaw: -.53, dist: 1500 };
  const camB = { tx: 0, ty: 0, tz: 0, dist: 1600, yaw: 0, pitch: -.52, f: 1500, sx: 960, sy: 870 };
  const cam = t => (t < 3.9 ? lerpCam(camA, camA2, seg(t, 0, 3.9, ease.inOutSine)) : lerpCam(camA2, camB, seg(t, 3.9, 5.0, ease.inOutCubic)));
  const IGN = k => 1.7 + k * (2.0 / n);
  const HEAD = [5.0, 8.2];
  const head = t => { const h = seg(t, HEAD[0], HEAD[1]) * (n - 1); const i = Math.floor(h); return Math.min(n - 1, i + ease.inOutSine(h - i)); };
  const maxV = Math.max(...DATA.map(d => d.value), 1e-6);
  const cursor = Cursor(stage, { theme: 'dark' });
  let points, drops, base, path;

  cue(.1, 'air', { dur: .8 });
  cue(.2, 'shimmer', { dur: 1.3 }); cue(.3, 'tickroll', { dur: 1.0, n: 36 });
  cue(.9, 'air', { dur: .5, gain: .4 });
  DATA.forEach((d, k) => { if (d.value > 0) cue(IGN(k), 'sparkle', { pitch: .9 + k * .08, n: Math.min(6, Math.max(1, Math.round(d.value))) }); });
  cue(1.95, 'tick', { pitch: .8 });
  cue(3.85, 'air', { dur: 1.3 });
  for (let i = 0; i < n; i++) cue(HEAD[0] + i * (HEAD[1] - HEAD[0]) / (n - 1), 'tick', { pitch: 1 + i * .12 });
  cue(HEAD[0], 'tickroll', { dur: HEAD[1] - HEAD[0], n: 60 });
  cue(HEAD[1] - .05, 'boom', { gain: .6 }); cue(HEAD[1], 'sparkle', { pitch: 1.2 });

  return {
    duration: 10,
    prepare() {
      const c = cam(6);
      points = DATA.map((d, k) => { const a = blocks.anchor(c, k); return { x: a.x, y: a.y - 170 - d.value / maxV * 360, label: fmt(d.value) }; });
      drops = DATA.map((d, k) => { const a = blocks.anchor(c, k); return { x: a.x, y: a.y - 30 }; });
      base = Math.max(...drops.map(d => d.y)) - 20;
      const a0 = blocks.anchor(cam(2), 0), aN = blocks.anchor(cam(3.4), n - 1);
      path = [{ t: 1.4, x: 300, y: 980 }, { t: 2.1, x: a0.x + 10, y: a0.y + 20 }, { t: 2.9, x: a0.x + 30, y: a0.y + 30 }, { t: 3.6, x: aN.x, y: aN.y }];
      points.forEach((p, i) => path.push({ t: HEAD[0] + i * (HEAD[1] - HEAD[0]) / (n - 1), x: p.x + 6, y: p.y + 6 }));
      path.push({ t: 10, x: points[n - 1].x + 30, y: points[n - 1].y + 40 });
    },
    render(t) {
      const c = cam(t);
      drawSpace(ctx, t);
      blocks.render(t, c, { gather: seg(t, .1, 1.5), ignite: k => seg(t, IGN(k), IGN(k) + .35) });
      if (t > 4.9) {
        const h = head(t);
        ctx.globalAlpha = seg(t, 4.9, 5.1);
        drawLineChart(ctx, points, h, { base, drops, labelP: i => seg(h, i, i + .3) });
        ctx.globalAlpha = 1;
      }
      blurIn(legend, seg(t, .8, 1.3), { y: -8 });
      legend.style.transform = `translateX(-50%) ${legend.style.transform}`;
      if (t < 4.6) {
        num.className = 'zero'; num.textContent = cfg.intro.counter;
        blurIn(num, seg(t, 1.9, 2.3) * (1 - seg(t, 3.7, 4.1)));
        blurIn(pill, seg(t, 2.1, 2.5) * (1 - seg(t, 3.7, 4.1)), { y: 8 });
        cap.style.opacity = 0;
      } else {
        const h = head(t), i = Math.floor(h);
        const v = i >= n - 1 ? DATA[n - 1].value : lerp(DATA[i].value, DATA[i + 1].value, h - i);
        num.className = ''; num.textContent = fmt(v);
        blurIn(num, seg(t, 4.9, 5.3)); blurIn(cap, seg(t, 5.1, 5.5), { y: 8 });
        pill.style.opacity = 0;
      }
      cursor.at(t, path);
    },
  };
}
