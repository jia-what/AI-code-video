// 03 · 封面墙筛选（Media Wall）
// 一整面视频封面按对角线波浪浮现；点顶部标签做筛选：未选中的褪成灰，选中的"点亮"；
// 最后整面墙缩成光点、散成粒子（可以直接接 04 立体点阵统计）。
import { clamp, lerp, ease, seg, rng } from '../../core/mg.js';

// ---------- 程序化封面（无版权素材） ----------
const PALETTE = {
  ai:    [['#1B2A6B', '#6A5BFF'], ['#0D1530', '#2F7BFF'], ['#22104A', '#B04BFF'], ['#0B2238', '#19C2D6'], ['#F2F3F8', '#9AA3C8']],
  food:  [['#7A2E0E', '#FF9B42'], ['#5C1A12', '#F0524A'], ['#8A5A12', '#FFD06A']],
  game:  [['#0E2A1A', '#38E08A'], ['#1A0E3A', '#E040FB'], ['#101820', '#56CCF2']],
  fun:   [['#FFE14D', '#FF7AA8'], ['#FFB020', '#FF5D5D'], ['#B8F25A', '#2ECC71']],
  life:  [['#F6D7C3', '#E8A0BF'], ['#CFE8F6', '#9FC6E6'], ['#E9F2D9', '#BFD8A0']],
};
const WORDS = {
  ai: ['AI 实测', '大模型', '三分钟看懂', 'AI 写代码', 'Agent', 'Vibe Coding', '开源了', '深度思考', '本地部署', '显卡', '评测', '教程', '提示词', '全网首发'],
  food: ['深夜食堂', '探店', '一人食', '烤肉', '家常菜', '甜品'],
  game: ['通关', '新版本', '速通', '开黑', '攻略', '抽卡'],
  fun: ['笑不活了', '名场面', '整活', '离谱', '鬼畜'],
  life: ['日常 vlog', '搬家', '旅行', '租房', '上班'],
};

/** 画一张 16:9 的假封面到 canvas（尺寸 w×h，像素） */
export function drawCover(c, cat, seed) {
  const r = rng(seed * 7919 + 13);
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const [c0, c1] = PALETTE[cat][Math.floor(r() * PALETTE[cat].length)];
  const lg = g.createLinearGradient(0, 0, w * (r() < .5 ? 1 : .2), h);
  lg.addColorStop(0, c0); lg.addColorStop(1, c1);
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 3; k++) {                                   // 光斑
    const x = r() * w, y = r() * h, rr = (.3 + r() * .5) * w;
    const rg = g.createRadialGradient(x, y, 0, x, y, rr);
    rg.addColorStop(0, `rgba(255,255,255,${.08 + r() * .18})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }
  const kind = r();
  const dark = parseInt(c0.slice(1, 3), 16) < 128;
  if (kind < .55) {                                                // 人物剪影
    const px = w * (.25 + r() * .5), s = h * (.32 + r() * .14);
    g.fillStyle = dark ? 'rgba(255,230,210,.92)' : 'rgba(60,40,40,.85)';
    g.beginPath(); g.arc(px, h * .52, s * .55, 0, 7); g.fill();
    g.fillStyle = dark ? 'rgba(30,30,50,.9)' : 'rgba(255,255,255,.85)';
    g.beginPath(); g.ellipse(px, h * 1.05, s * 1.25, s * .75, 0, 0, 7); g.fill();
    g.fillStyle = dark ? '#1a1a2a' : '#3a2a2a';
    g.beginPath(); g.arc(px - s * .18, h * .5, s * .06, 0, 7); g.arc(px + s * .18, h * .5, s * .06, 0, 7); g.fill();
  } else if (kind < .8) {                                          // 物件（设备 / 盘子 / 手柄）
    g.fillStyle = 'rgba(255,255,255,.88)';
    const bw = w * (.3 + r() * .2), bh = h * (.3 + r() * .25);
    g.beginPath(); g.roundRect(w * .5 - bw / 2 + (r() - .5) * w * .3, h * .55 - bh / 2, bw, bh, h * .08); g.fill();
    g.fillStyle = c1; g.globalAlpha = .7;
    g.beginPath(); g.arc(w * .5, h * .55, bh * .28, 0, 7); g.fill(); g.globalAlpha = 1;
  } else {                                                         // 大色块排版
    g.fillStyle = 'rgba(0,0,0,.25)';
    for (let k = 0; k < 4; k++) g.fillRect(w * .08, h * (.55 + k * .1), w * (.3 + r() * .5), h * .05);
  }
  const words = WORDS[cat];
  const word = words[Math.floor(r() * words.length)];
  const fs = h * (.2 + r() * .1);
  g.font = `900 ${fs}px NSC`;
  g.textBaseline = 'top';
  const tx = w * .06, ty = r() < .5 ? h * .07 : h * .62;
  g.lineJoin = 'round'; g.lineWidth = fs * .22; g.strokeStyle = '#111';
  g.strokeText(word, tx, ty);
  g.fillStyle = r() < .5 ? '#FFFFFF' : '#FFE14D';
  g.fillText(word, tx, ty);
  g.font = `600 ${h * .1}px Inter`;                              // 时长角标
  const dur = `${1 + Math.floor(r() * 24)}:${String(Math.floor(r() * 60)).padStart(2, '0')}`;
  const dw = g.measureText(dur).width + h * .08;
  g.fillStyle = 'rgba(0,0,0,.55)';
  g.beginPath(); g.roundRect(w - dw - h * .05, h - h * .19, dw, h * .14, h * .03); g.fill();
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(dur, w - dw - h * .01, h - h * .12);
}

/**
 * 封面墙。opts:
 *   cols, rows, w, h, gap, top          网格
 *   cats: { ai: 80, food: 10, ... }     各类别数量（总和 = cols×rows）
 * 返回 { thumbs, render(t, state) }，state 由页面时间轴决定：
 *   inT        浮现开始时间
 *   sel(cat)   该类别"被选中"的进度 0–1（null 表示还没开始筛选）
 *   toDots     收缩成光点的进度 0–1；scatter 散开进度 0–1
 */
export function MediaWall(parent, { cols = 12, rows = 10, w = 132, h = 74, gap = 12, top = 160, cats, seed = 5 } = {}) {
  const left = (1920 - (cols * w + (cols - 1) * gap)) / 2;
  const r = rng(seed);
  const order = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) order.push({ i, j, k: j + r() * 3.2 });
  order.sort((a, b) => a.k - b.k);
  const catList = [];
  for (const [cat, n] of Object.entries(cats)) for (let k = 0; k < n; k++) catList.push(cat);
  const rest = catList.slice(cats.ai).sort(() => r() - .5);   // 非 AI 类别打散
  const assigned = [...catList.slice(0, cats.ai), ...rest];
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
    paint() { thumbs.forEach(t => drawCover(t.c, t.cat, t.seed)); void dpr; },
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
