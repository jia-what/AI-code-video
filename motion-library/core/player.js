// 动效加载器：把"动效逻辑（scene）"和"内容（config）"分开。
//
//   effects/NN/index.html 只需要：  play(scene, defaults)
//   套用自己的内容：  index.html?config=../../my-configs/xxx.js   （或渲染器 --config my-configs/xxx.js）
//   自定义配置文件只写想改的字段，其余沿用默认值（深合并；数组整体替换）。
import { mount } from './mg.js';

export function deepMerge(base, over) {
  if (Array.isArray(over) || over === null || typeof over !== 'object') return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null ? deepMerge(base[k], v) : v;
  return out;
}

export async function play(scene, defaults) {
  const q = new URLSearchParams(location.search).get('config');
  const user = q ? (await import(new URL(q, location.href).href)).default : {};
  const cfg = deepMerge(defaults, user);
  const s = await scene(document.getElementById('stage'), cfg);
  mount({ duration: cfg.duration ?? s.duration, render: s.render, prepare: s.prepare });
}

/** 文案里的 <hl>…</hl> 变成重点词，其余字符转义 */
export function rich(text = '') {
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return text.split(/(<hl>.*?<\/hl>)/).map(p => (p.startsWith('<hl>') ? `<span class="hl">${esc(p.slice(4, -5))}</span>` : esc(p))).join('');
}

/** 头像：有图片用图片，没有就用渐变圆 + 首字母 */
export function avatar({ src = null, initial = 'A', hue = 250 } = {}, size = 64) {
  const base = `width:${size}px;height:${size}px;border-radius:50%;flex:none;`;
  if (src) return `<div class="mg-av" style="${base}background:#ccc url('${src}') center/cover no-repeat"></div>`;
  return `<div class="mg-av" style="${base}display:grid;place-items:center;background:linear-gradient(135deg,hsl(${hue} 90% 72%),hsl(${hue + 25} 75% 52%));` +
    `color:#fff;font:700 ${Math.round(size * .42)}px Inter,NSC">${initial}</div>`;
}
