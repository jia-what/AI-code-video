// 03 · 封面墙筛选（Media Wall）
// 一整面视频封面按对角线波浪浮现；点顶部标签做筛选：未选中的褪成灰，选中的"点亮"；
// 最后整面墙缩成光点、散成粒子（可以直接接 04 立体点阵统计）。
import { clamp, lerp, ease, seg, rng } from '../../core/mg.js';

// ---------- 程序化占位封面（无主题、无版权素材） ----------
// 每个类别一组色系（按类别顺序取），图案是抽象的人物 / 物件 / 色块，标题用白色圆角条占位。
const HUES = [[250, 280], [200, 225], [20, 45], [140, 165], [320, 345], [50, 70], [180, 200]];

/** 画一张 16:9 的占位封面到 canvas。catIndex 决定色系，seed 决定图案 */
export function drawCover(c, catIndex, seed) {
  const r = rng(seed * 7919 + 13);
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const [h0, h1] = HUES[catIndex % HUES.length];
  const light = r() < .25;
  const lg = g.createLinearGradient(0, 0, w * (r() < .5 ? 1 : .2), h);
  lg.addColorStop(0, `hsl(${h0} ${light ? 40 : 60}% ${light ? 88 : 22 + r() * 12}%)`);
  lg.addColorStop(1, `hsl(${h1} ${light ? 55 : 80}% ${light ? 72 : 52 + r() * 12}%)`);
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 3; k++) {
    const x = r() * w, y = r() * h, rr = (.3 + r() * .5) * w;
    const rg = g.createRadialGradient(x, y, 0, x, y, rr);
    rg.addColorStop(0, `rgba(255,255,255,${.06 + r() * .16})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }
  const kind = r();
  const ink = light ? 'rgba(40,40,70,.75)' : 'rgba(255,255,255,.88)';
  if (kind < .45) {                                                // 人物轮廓
    const px = w * (.3 + r() * .45), s = h * (.3 + r() * .14);
    g.fillStyle = ink;
    g.beginPath(); g.arc(px, h * .5, s * .55, 0, 7); g.fill();
    g.beginPath(); g.ellipse(px, h * 1.05, s * 1.2, s * .72, 0, 0, 7); g.fill();
  } else if (kind < .75) {                                         // 物件
    g.fillStyle = ink;
    const bw = w * (.28 + r() * .2), bh = h * (.3 + r() * .25), bx = w * .5 - bw / 2 + (r() - .5) * w * .3;
    g.beginPath(); g.roundRect(bx, h * .56 - bh / 2, bw, bh, h * .08); g.fill();
    g.fillStyle = `hsl(${h1} 80% 60%)`;
    g.beginPath(); g.arc(bx + bw / 2, h * .56, bh * .26, 0, 7); g.fill();
  } else {                                                         // 几何色块
    g.fillStyle = ink;
    g.beginPath(); g.arc(w * (.6 + r() * .25), h * .45, h * .28, 0, 7); g.fill();
    g.fillStyle = `hsla(${h0} 80% 60% / .8)`;
    g.beginPath(); g.moveTo(w * .1, h); g.lineTo(w * .45, h * .35); g.lineTo(w * .8, h); g.fill();
  }
  const ty = r() < .5 ? h * .1 : h * .64;                         // 标题占位：两根圆角条
  g.fillStyle = light ? 'rgba(30,30,60,.85)' : '#fff';
  g.beginPath(); g.roundRect(w * .07, ty, w * (.32 + r() * .3), h * .11, h * .05); g.fill();
  g.globalAlpha = .7;
  g.beginPath(); g.roundRect(w * .07, ty + h * .15, w * (.2 + r() * .2), h * .07, h * .035); g.fill();
  g.globalAlpha = 1;
  g.font = `600 ${h * .1}px Inter`;                              // 时长角标
  const dur = `${1 + Math.floor(r() * 24)}:${String(Math.floor(r() * 60)).padStart(2, '0')}`;
  const dw = g.measureText(dur).width + h * .08;
  g.fillStyle = 'rgba(0,0,0,.5)';
  g.beginPath(); g.roundRect(w - dw - h * .05, h - h * .19, dw, h * .14, h * .03); g.fill();
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(dur, w - dw - h * .01, h - h * .12);
}

/** 用真实图片做封面（裁成 16:9 铺满） */
export function drawImageCover(c, img) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
  g.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

/**
 * 封面墙。opts:
 *   cols, rows, w, h, gap, top          网格
 *   cats: { a: 80, b: 10, ... }        各类别数量（总和 = cols×rows），第一个类别会集中在上方
 *   images: [url, ...]                 可选：用这些图片做封面（循环使用），不传则用占位封面
 * 返回 { thumbs, render(t, state) }，state 由页面时间轴决定：
 *   inT        浮现开始时间
 *   sel(cat)   该类别"被选中"的进度 0–1（null 表示还没开始筛选）
 *   toDots     收缩成光点的进度 0–1；scatter 散开进度 0–1
 */
export function MediaWall(parent, { cols = 12, rows = 10, w = 132, h = 74, gap = 12, top = 160, cats, images = null, seed = 5 } = {}) {
  const left = (1920 - (cols * w + (cols - 1) * gap)) / 2;
  const r = rng(seed);
  const order = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) order.push({ i, j, k: j + r() * 3.2 });
  order.sort((a, b) => a.k - b.k);
  const catList = [];
  for (const [cat, n] of Object.entries(cats)) for (let k = 0; k < n; k++) catList.push(cat);
  const keys = Object.keys(cats), lead = cats[keys[0]];
  const rest = catList.slice(lead).sort(() => r() - .5);        // 第一个类别靠上，其余打散
  const assigned = [...catList.slice(0, lead), ...rest];
  const dpr = window.devicePixelRatio || 1;
  const thumbs = order.map((o, n) => {
    const c = document.createElement('canvas');
    c.width = Math.round(w * 2); c.height = Math.round(h * 2);
    Object.assign(c.style, { position: 'absolute', left: left + o.i * (w + gap) + 'px', top: top + o.j * (h + gap) + 'px', width: w + 'px', height: h + 'px',
      borderRadius: '8px', boxShadow: '0 6px 16px rgba(20,20,50,.12)' });
    parent.appendChild(c);
    return { c, i: o.i, j: o.j, cat: assigned[n], seed: n, cx: left + o.i * (w + gap) + w / 2, cy: top + o.j * (h + gap) + h / 2,
      dx: (r() - .5) * 2, dy: (r() - .5) * 2, lag: r() };
  });
  return {
    thumbs,
    async paint() {
      if (images && images.length) {
        const imgs = await Promise.all(images.map(src => { const im = new Image(); im.src = src; return im.decode().then(() => im); }));
        thumbs.forEach((t, n) => drawImageCover(t.c, imgs[n % imgs.length]));
      } else thumbs.forEach(t => drawCover(t.c, keys.indexOf(t.cat), t.seed));
      void dpr;
    },
    render(t, { inT = 0, sel = null, toDots = 0, scatter = 0 }) {
      for (const th of thumbs) {
        const d = th.i * .035 + th.j * .05;
        const p = ease.outCubic(seg(t, inT + d, inT + d + .55));
        let filter = p < .995 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : '';
        let op = p, sc = lerp(.86, 1, p), x = 0, y = (1 - p) * 10;
        if (sel) {
          const s = sel(th.cat, th);
          if (s !== null) {                                       // 0 = 褪灰，1 = 点亮
            filter += ` grayscale(${(1 - s).toFixed(2)}) brightness(${lerp(1.18, 1, s).toFixed(2)})`;
            op *= lerp(.28, 1, s);
            sc *= 1 + .1 * Math.sin(clamp(s) * Math.PI) * (s < 1 ? 1 : 0);
          }
        }
        if (toDots > 0) {                                         // 缩成光点
          const q = ease.inOutCubic(clamp(toDots * 1.3 - th.lag * .3));
          sc *= lerp(1, .07, q);
          th.c.style.borderRadius = `${lerp(8, 60, q)}px`;
          filter += ` brightness(${lerp(1, 2.6, q).toFixed(2)}) saturate(${lerp(1, .2, q).toFixed(2)})`;
          op = lerp(op, 1, q);
          const s2 = ease.inOutCubic(clamp(scatter * 1.2 - th.lag * .2));
          x = th.dx * 260 * s2 + (960 - th.cx) * .25 * s2; y += th.dy * 160 * s2 + (560 - th.cy) * .2 * s2;
        }
        th.c.style.opacity = op.toFixed(3);
        th.c.style.filter = filter.trim() || 'none';
        th.c.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(4)})`;
        th.c.style.boxShadow = toDots > .2 ? `0 0 ${30 * toDots}px rgba(169,158,255,${.9 * toDots})` : '0 6px 16px rgba(20,20,50,.12)';
      }
    },
  };
}

/** 顶部分类标签栏：tabs = [{ label, key }]，返回 { el, set(key, p) } */
export function TabBar(parent, tabs, { top = 60 } = {}) {
  const bar = document.createElement('div');
  Object.assign(bar.style, { position: 'absolute', left: '50%', top: top + 'px', transform: 'translateX(-50%)', display: 'flex', gap: '6px', padding: '8px',
    borderRadius: '22px', background: '#1B1B22', boxShadow: '0 16px 40px rgba(20,20,50,.25)', whiteSpace: 'nowrap' });
  const els = {};
  for (const tb of tabs) {
    const e = document.createElement('div');
    e.textContent = tb.label;
    Object.assign(e.style, { height: '52px', lineHeight: '52px', padding: '0 24px', borderRadius: '15px', font: '600 26px Inter, NSC', color: '#A4A6B8' });
    if (tb.first) Object.assign(e.style, { background: '#2E2E3A', color: '#fff', font: '700 28px Inter, NSC' });
    bar.appendChild(e); els[tb.key] = e;
  }
  parent.appendChild(bar);
  return {
    el: bar, els,
    set(key, p) {
      const e = els[key];
      e.style.background = p > 0 ? `rgba(106,91,255,${p.toFixed(3)})` : 'transparent';
      e.style.color = p > .5 ? '#fff' : '#A4A6B8';
      e.style.transform = `scale(${1 + .08 * Math.sin(clamp(p) * Math.PI)})`;
    },
  };
}
