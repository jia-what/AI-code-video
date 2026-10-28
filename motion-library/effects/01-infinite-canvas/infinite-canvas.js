// 01 · 无限画布（Infinite Canvas）
// 浅灰底 + 跟随相机移动的点阵；内容摆在"世界坐标"里，相机在其间平移 / 缩放；
// 光标处有紫色聚光，附近的点会被染色放大。
import { lerp, ease, invLerp, clamp, drawDotGrid, drawGlow, makeCanvas } from '../../core/mg.js';

/**
 * 搭一张无限画布。返回：
 *   world   放内容的 DOM 容器（坐标 = 世界坐标，原点在画布中心）
 *   render(t, { cam, cursor })  画背景点阵、聚光，并把相机变换应用到 world
 */
export function InfiniteCanvas(stage, { gap = 34, dot = '#C3C4D2', spotR = 210 } = {}) {
  const { ctx } = makeCanvas(stage);
  const world = document.createElement('div');
  world.className = 'mg-abs';
  Object.assign(world.style, { left: '0', top: '0', width: '0', height: '0', transformOrigin: '0 0' });
  stage.appendChild(world);
  const vignette = document.createElement('div');
  vignette.className = 'mg-fill';
  vignette.style.background = 'radial-gradient(ellipse 80% 75% at 50% 50%, rgba(239,239,243,0) 55%, rgba(214,214,226,.85) 100%)';
  vignette.style.pointerEvents = 'none';
  stage.appendChild(vignette);

  return {
    world,
    render(t, { cam, cursor }) {
      ctx.clearRect(0, 0, 1920, 1080);
      if (cursor) drawGlow(ctx, cursor.x + 8, cursor.y + 10, 320, '106,91,255', .13);
      drawDotGrid(ctx, { cam, gap, color: dot, spot: cursor ? { x: cursor.x + 8, y: cursor.y + 10, r: spotR, color: '#6A5BFF', k: .9 } : null });
      world.style.transform = `translate(960px,540px) scale(${cam.z}) translate(${-cam.x}px,${-cam.y}px)`;
    },
    /** 世界坐标 → 屏幕坐标（光标要指向世界里的某个元素时用） */
    toScreen(cam, x, y) { return { x: (x - cam.x) * cam.z + 960, y: (y - cam.y) * cam.z + 540 }; },
  };
}

/**
 * 相机路径。keys = [{ t, x, y, z }]；相邻关键帧之间 inOutCubic 过渡，
 * 平移距离较远时中途自动后拉（dip），像在画布上"飞"过去。
 */
export function camPath(keys, { dip = .14, drift = .012 } = {}) {
  return t => {
    let a = keys[0], b = keys[0], p = 0;
    for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t) { a = keys[i]; b = keys[i + 1]; p = invLerp(a.t, b.t, t); }
    if (t >= keys[keys.length - 1].t) { a = b = keys[keys.length - 1]; p = 0; }
    const e = ease.inOutCubic(p);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const d = Math.sin(Math.PI * p) * dip * clamp(dist / 1200);
    const z = lerp(a.z, b.z, e) * (1 - d) * (1 + drift * Math.sin(t * .7));
    return { x: lerp(a.x, b.x, e) + Math.sin(t * .5) * 6, y: lerp(a.y, b.y, e) + Math.cos(t * .4) * 4, z };
  };
}

/** 节点之间的连线：S 形曲线 + 两端圆点，set(p) 从起点画到终点 */
export function Connector(svg, x0, y0, x1, y1, { color = '#2A2550', width = 2.4 } = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(NS, 'path');
  const mx = (x0 + x1) / 2;
  path.setAttribute('d', `M${x0} ${y0} C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`);
  Object.entries({ fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' }).forEach(([k, v]) => path.setAttribute(k, v));
  const dots = [[x0, y0], [x1, y1]].map(([x, y]) => {
    const c = document.createElementNS(NS, 'circle');
    Object.entries({ cx: x, cy: y, r: 6, fill: '#fff', stroke: color, 'stroke-width': 2.4 }).forEach(([k, v]) => c.setAttribute(k, v));
    return c;
  });
  svg.append(path, ...dots);
  const len = path.getTotalLength();
  path.setAttribute('stroke-dasharray', len);
  return p => {
    const e = ease.inOutCubic(clamp(p));
    path.setAttribute('stroke-dashoffset', len * (1 - e));
    dots[0].setAttribute('opacity', clamp(p * 8));
    dots[1].setAttribute('opacity', clamp((e - .92) * 12));
  };
}

/** iOS 风格开关：set(p) 0 关 → 1 开 */
export function Toggle(el) {
  el.innerHTML = '<i></i>';
  Object.assign(el.style, { position: 'relative', width: '52px', height: '30px', borderRadius: '15px', flex: 'none' });
  const knob = el.firstChild;
  Object.assign(knob.style, { position: 'absolute', top: '3px', left: '3px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.25)' });
  return p => {
    const e = ease.outBack(clamp(p), 1.4);
    knob.style.transform = `translateX(${e * 22}px)`;
    el.style.background = `rgb(${Math.round(lerp(70, 106, p))},${Math.round(lerp(70, 91, p))},${Math.round(lerp(84, 255, p))})`;
  };
}
