// 03 · 封面墙筛选：时间轴。内容全部来自 config（见 config.js）。
import { cue, seg, ease, Reveal, blurIn, Cursor, makeCanvas, drawDotGrid, drawGlow, mixHex } from '../../core/mg.js';
import { rich } from '../../core/player.js';
import { MediaWall, TabBar } from './media-wall.js';

export default function scene(stage, cfg) {
  const { ctx } = makeCanvas(stage);
  stage.insertBefore(ctx.canvas, stage.firstChild);
  let rq = null;
  if (cfg.intro) {
    const q = document.createElement('div');
    q.className = 'mg-title mg-abs';
    Object.assign(q.style, { left: '960px', top: '540px', transform: 'translate(-50%,-50%)', fontSize: '100px' });
    q.innerHTML = rich(cfg.intro);
    stage.appendChild(q);
    rq = Reveal(q);
  }
  const layer = document.createElement('div');
  layer.className = 'mg-fill';
  stage.appendChild(layer);
  const cats = Object.fromEntries(cfg.categories.map(c => [c.key, c.count]));
  const wall = MediaWall(layer, { cols: cfg.grid.cols, rows: cfg.grid.rows, cats, images: cfg.images });
  const bar = TabBar(stage, [{ key: 'all', label: cfg.all, first: true }, ...cfg.categories.map(c => ({ key: c.key, label: `${c.label} ${c.count}` }))], { top: 58 });
  const cursor = Cursor(stage);

  // 点击时间：第一个类别 2.2s，其余均匀排到 4.5s
  const keys = cfg.categories.map(c => c.key);
  const CLICK = Object.fromEntries(keys.map((k, i) => [k, i === 0 ? 2.2 : 2.85 + (i - 1) * (1.65 / Math.max(1, keys.length - 2))]));
  let path = [];
  let now = 0;

  cue(.2, 'air', { dur: .5, gain: .5 });
  cue(.5, 'tickroll', { dur: 1.1, n: 44 });
  cue(.55, 'air', { dur: .8, gain: .6 });
  keys.forEach((k, i) => { cue(CLICK[k], 'mouse'); cue(CLICK[k] + .05, 'tick', { pitch: 1 + i * .15 }); if (i) cue(CLICK[k] + .08, 'sparkle', { pitch: 1 + i * .1, n: 3 }); });
  cue(2.25, 'air', { dur: .6, gain: .35 });
  cue(5.3, 'swell', { dur: .9 });
  cue(6.2, 'boom', { gain: .45 }); cue(6.2, 'shimmer', { dur: 1 });

  const sel = (cat, th) => {
    if (now < CLICK[keys[0]]) return null;
    if (cat === keys[0]) return 1;
    const grey = seg(now, 2.25 + th.lag * .25, 2.6 + th.lag * .25);
    const light = seg(now, CLICK[cat] + th.lag * .12, CLICK[cat] + .35 + th.lag * .12);
    return Math.max(1 - grey, light);
  };

  return {
    duration: 7.2,
    async prepare() {
      await document.fonts.ready;
      await wall.paint();
      const c = k => { const b = bar.els[k].getBoundingClientRect(); return { x: b.x + b.width * .5, y: b.y + b.height * .62 }; };
      path = [{ t: 1.5, x: 1560, y: 1000 }];
      for (const k of keys) path.push({ t: CLICK[k] - .12, ...c(k) }, { t: CLICK[k], ...c(k), click: true });
      path.push({ t: 5.2, x: 1300, y: 640 });
    },
    render(t) {
      now = t;
      const dark = seg(t, 5.5, 6.4, ease.inOutCubic);
      ctx.fillStyle = mixHex('#EFEFF3', '#06060B', dark);
      ctx.fillRect(0, 0, 1920, 1080);
      const cur = cursor.at(t, path);
      if (dark < 1) drawGlow(ctx, cur.x + 8, cur.y + 10, 300, '106,91,255', .12 * (1 - dark));
      drawDotGrid(ctx, { gap: 34, color: mixHex('#C3C4D2', '#1C1C2A', dark), spot: dark < .5 ? { x: cur.x + 8, y: cur.y + 10, r: 200, color: '#6A5BFF', k: .9 * (1 - dark * 2) } : null });
      if (rq) rq(seg(t, .15, .6), { out: true });
      blurIn(bar.el, seg(t, .5, 1.1), { y: -16 });
      bar.el.style.transform = `translateX(-50%) ${bar.el.style.transform}`;
      bar.el.style.opacity = Math.min(+bar.el.style.opacity, 1 - seg(t, 5.3, 5.7));
      bar.els.all.style.background = '#2E2E3A';
      for (const k of keys) bar.set(k, seg(t, CLICK[k], CLICK[k] + .2));
      wall.render(t, { inT: .5, sel, toDots: seg(t, 5.4, 6.3), scatter: seg(t, 6.0, 7.2) });
      cursor.el.style.opacity = Math.min(+cursor.el.style.opacity, 1 - seg(t, 5.2, 5.6));
    },
  };
}
