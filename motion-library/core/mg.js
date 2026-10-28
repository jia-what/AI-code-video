// 动效库运行时：所有动效都是"纯函数时间轴"——给定时间 t，直接算出这一帧。
// 不依赖播放状态，所以可以随意跳帧、逐帧渲染、拼接到别的视频里。
//
// 页面约定（harness/render.mjs 依赖）：
//   window.DURATION  总时长（秒）
//   window.renderAt(t)  画出 t 时刻
//   window.CUES     音效时间点 [{ t, type, ...参数 }]
//   window.ready    Promise，字体 / 图片 / 预计算完成后 resolve

// ---------- 数学 ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = p => p * p * (3 - 2 * p);

export const ease = {
  linear: p => p,
  inQuad: p => p * p,
  outQuad: p => 1 - (1 - p) ** 2,
  inCubic: p => p ** 3,
  outCubic: p => 1 - (1 - p) ** 3,
  inOutCubic: p => (p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  outQuint: p => 1 - (1 - p) ** 5,
  inOutQuint: p => (p < .5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2),
  outExpo: p => (p === 1 ? 1 : 1 - 2 ** (-10 * p)),
  inExpo: p => (p === 0 ? 0 : 2 ** (10 * p - 10)),
  inOutSine: p => -(Math.cos(Math.PI * p) - 1) / 2,
  outBack: (p, s = 1.70158) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
  outElastic: p => (p === 0 || p === 1 ? p : 2 ** (-10 * p) * Math.sin((p * 10 - .75) * (2 * Math.PI) / 3) + 1),
};

/** t 在 [a, b] 区间内的进度（0–1），可选缓动 */
export const seg = (t, a, b, e = ease.linear) => e(invLerp(a, b, t));

/** 可复现的随机数（mulberry32） */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 平滑一维噪声（用于呼吸、抖动） */
export function noise1(x, seed = 0) {
  const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i;
  return lerp(h(i), h(i + 1), smooth(f)) * 2 - 1;
}

/** 颜色插值：'#rrggbb' → 'rgb()' */
export function mixColor(c0, c1, p) {
  const a = parseInt(c0.slice(1), 16), b = parseInt(c1.slice(1), 16);
  const ch = s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, p));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** 颜色插值，返回 '#rrggbb'（结果还能继续参与插值） */
export function mixHex(c0, c1, p) {
  const a = parseInt(c0.slice(1), 16), b = parseInt(c1.slice(1), 16);
  const ch = s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, p));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

// ---------- 音效时间点 ----------
export const CUES = [];
export const cue = (t, type, opt = {}) => CUES.push({ t: +t.toFixed(3), type, ...opt });

// ---------- 页面挂载 ----------
export function mount({ duration, render, prepare }) {
  window.DURATION = duration;
  window.CUES = CUES;
  window.renderAt = t => render(Math.max(0, Math.min(duration, t)));
  const fonts = ['500 40px NSC', '700 40px NSC', '900 40px NSC', '500 40px Inter', '700 40px Inter', '800 40px Inter']
    .map(f => document.fonts.load(f, '标题关键词内容示例0123456789%'));
  const imgs = [...document.images].map(i => i.decode().catch(() => {}));
  window.ready = Promise.all([...fonts, ...imgs, prepare ? prepare() : null])
    .then(() => document.fonts.ready).then(() => { window.renderAt(0); return true; });
}

// ---------- 画布 ----------
/** 创建与舞台等大的高清 canvas（按 devicePixelRatio 放大像素） */
export function makeCanvas(parent, cls = 'mg-fill') {
  const c = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  c.width = 1920 * dpr; c.height = 1080 * dpr; c.className = cls;
  parent.appendChild(c);
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas: c, ctx, dpr };
}

/** 预渲染的柔光圆点精灵：drawImage 比 shadowBlur 快几十倍 */
export function glowSprite(color = '142,125,255', size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  r.addColorStop(0, `rgba(${color},1)`);
  r.addColorStop(.25, `rgba(${color},.45)`);
  r.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  return c;
}

// ---------- 点阵网格（无限画布 / 星空底） ----------
/**
 * 画一张跟随相机移动的点阵网格。
 * cam = { x, y, z }：相机看向的世界坐标与缩放；spot = { x, y, r, color, k }：光标聚光（屏幕坐标）
 */
export function drawDotGrid(ctx, { cam = { x: 0, y: 0, z: 1 }, gap = 34, r = 1.6, color = '#C3C4D2', spot = null, alpha = 1 } = {}) {
  const W = 1920, H = 1080, z = cam.z;
  const step = gap * z;
  if (step < 6) return;
  const x0 = Math.floor((cam.x - W / 2 / z) / gap) - 1, x1 = Math.ceil((cam.x + W / 2 / z) / gap) + 1;
  const y0 = Math.floor((cam.y - H / 2 / z) / gap) - 1, y1 = Math.ceil((cam.y + H / 2 / z) / gap) + 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const rr = Math.max(.6, r * Math.sqrt(z));
  const hot = [];
  ctx.beginPath();
  for (let i = x0; i <= x1; i++) {
    for (let j = y0; j <= y1; j++) {
      const sx = (i * gap - cam.x) * z + W / 2, sy = (j * gap - cam.y) * z + H / 2;
      if (spot) {
        const d = Math.hypot(sx - spot.x, sy - spot.y);
        if (d < spot.r) { hot.push([sx, sy, 1 - d / spot.r]); continue; }
      }
      ctx.moveTo(sx + rr, sy); ctx.arc(sx, sy, rr, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  for (const [sx, sy, f] of hot) {          // 聚光范围内的点：变色、变大
    const k = f * f * (spot.k ?? 1);
    ctx.fillStyle = mixColor(color, spot.color || '#6A5BFF', Math.min(1, k * 1.4));
    ctx.beginPath(); ctx.arc(sx, sy, rr * (1 + k * 1.3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** 屏幕中一大团柔和的径向光（光标光晕 / 氛围光） */
export function drawGlow(ctx, x, y, r, color = '106,91,255', a = .18) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${a})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- 文字：逐字模糊浮现 ----------
/**
 * 把元素里的文字拆成单字。带 class="hl" 的部分是重点词，按位置取渐变色。
 * 返回 reveal(p, opt)：p = 0 全隐，1 全显；opt.out = true 时反向（模糊消失）。
 */
export function Reveal(el, { blur = 14, rise = .28, spread = 7, hl = ['#A99EFF', '#6A5BFF'] } = {}) {
  const chars = [];
  const walk = (node, inHl) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const ch of n.textContent) {
          const s = document.createElement('span');
          s.className = 'c'; s.textContent = ch === ' ' ? ' ' : ch;
          frag.appendChild(s); chars.push({ s, hl: inHl });
        }
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n, inHl || n.classList.contains('hl'));
    }
  };
  walk(el, false);
  const hlChars = chars.filter(c => c.hl);
  hlChars.forEach((c, i) => { c.s.style.color = mixColor(hl[0], hl[1], hlChars.length > 1 ? i / (hlChars.length - 1) : 1); });
  const n = chars.length;
  return (p, { out = false } = {}) => {
    chars.forEach((c, i) => {
      const q = clamp((p * (n + spread) - (out ? n - 1 - i : i)) / spread);
      const v = out ? 1 - q : q;
      const e = ease.outCubic(v);
      c.s.style.opacity = e.toFixed(3);
      c.s.style.filter = e > .995 ? 'none' : `blur(${((1 - e) * blur).toFixed(2)}px)`;
      c.s.style.transform = e > .995 ? 'none' : `translateY(${((1 - e) * rise).toFixed(3)}em)`;
    });
  };
}

/** 整块元素模糊进出：p 0→1 出现。用于卡片、图片、面板 */
export function blurIn(el, p, { blur = 18, y = 14, scale = .97 } = {}) {
  const e = ease.outCubic(clamp(p));
  el.style.opacity = e.toFixed(3);
  el.style.filter = e > .995 ? 'none' : `blur(${((1 - e) * blur).toFixed(2)}px)`;
  el.style.transform = `translate3d(0,${((1 - e) * y).toFixed(2)}px,0) scale(${lerp(scale, 1, e).toFixed(4)})`;
  el.style.visibility = e < .002 ? 'hidden' : 'visible';
}

// ---------- 光标 ----------
const ARROW = (fill, edge) => `<svg width="40" height="40" viewBox="0 0 40 40"><path d="M6 3 L6 31 L13.5 24.2 L18.6 35.6 L23.4 33.4 L18.4 22.4 L28.4 22.4 Z" fill="${fill}" stroke="${edge}" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

/**
 * 带光晕的光标。path = [{ t, x, y, click? }]，两个关键帧之间用 inOutCubic 移动；
 * click: true 的关键帧会在该时刻按下并放出一圈光环。
 */
export function Cursor(parent, { theme = 'light' } = {}) {
  const el = document.createElement('div');
  el.className = 'mg-cursor';
  el.innerHTML = `<div class="glow"></div><div class="ring"></div>${theme === 'dark' ? ARROW('#EDEBFF', '#4B3FD1') : ARROW('#2A2550', '#FFFFFF')}`;
  parent.appendChild(el);
  const ring = el.querySelector('.ring'), arrow = el.querySelector('svg');
  return {
    el,
    at(t, path) {
      let x = path[0].x, y = path[0].y;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        if (t >= a.t && t <= b.t) { const p = ease.inOutCubic(invLerp(a.t, b.t, t)); x = lerp(a.x, b.x, p); y = lerp(a.y, b.y, p); }
        if (t > b.t) { x = b.x; y = b.y; }
      }
      const vis = path[0].hidden ? 0 : clamp((t - path[0].t + .3) / .3);
      let press = 1, ringP = -1;
      for (const k of path) if (k.click) {
        const d = t - k.t;
        if (d > -.08 && d < .12) press = 1 - .14 * Math.sin(clamp((d + .08) / .2) * Math.PI);
        if (d >= 0 && d < .6) ringP = d / .6;
      }
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      el.style.opacity = vis;
      arrow.style.transform = `scale(${press})`;
      arrow.style.transformOrigin = '6px 3px';
      if (ringP >= 0) {
        ring.style.opacity = (1 - ringP) * .9;
        ring.style.transform = `scale(${.4 + ease.outCubic(ringP) * 1.2})`;
      } else ring.style.opacity = 0;
      return { x, y };
    },
  };
}

/** 两点之间的 S 形贝塞尔连线路径（节点图） */
export function sCurve(x0, y0, x1, y1) {
  const mx = (x0 + x1) / 2;
  return `M${x0} ${y0} C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
}
