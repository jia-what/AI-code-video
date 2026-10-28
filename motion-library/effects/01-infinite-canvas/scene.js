// 01 · 无限画布：时间轴。内容全部来自 config（见 config.js）。
import { cue, seg, Reveal, blurIn, Cursor } from '../../core/mg.js';
import { rich, avatar } from '../../core/player.js';
import { InfiniteCanvas, camPath, Connector, Toggle } from './infinite-canvas.js';

export default function scene(stage, cfg) {
  const ic = InfiniteCanvas(stage);
  const W = ic.world;
  const put = (html, x, y, cls = '') => {
    const o = document.createElement('div');
    o.className = 'node';
    Object.assign(o.style, { left: x + 'px', top: y + 'px', transform: 'translate(-50%,-50%)' });
    o.innerHTML = `<div class="in ${cls}">${html}</div>`;
    W.appendChild(o);
    return o.firstChild;
  };
  const cardHTML = c => `${avatar({ src: c.avatar, initial: c.initial, hue: 250 }, 64)}<div><div class="nm">${rich(c.name)}${c.tag ? `<span class="lv">${rich(c.tag)}</span>` : ''}</div>` +
    `<div class="tx">${rich(c.text)}</div>${c.meta ? `<div class="meta">${rich(c.meta)}</div>` : ''}</div>`;

  // 场景 A
  const titleA = put(`<div class="mg-title" style="font-size:84px">${rich(cfg.title)}</div>`, 0, -170);
  const revA = Reveal(titleA.firstChild);
  const cardA = put(cardHTML(cfg.card), 0, 70, 'mg-card ccard');

  // 场景 B
  const g = cfg.graph, BX = 1640, BY = 290;
  const src = put(`${avatar({ src: g.source.avatar, initial: g.source.initial, hue: 200 }, 150).replace('class="mg-av"', 'class="mg-av avnode"')}<div class="label">${rich(g.source.label)}</div>`, BX - 470, BY - 150);
  const hub = put(`<h4>${rich(g.hub.title)}</h4><div class="sub"><i></i>${rich(g.hub.status)}</div>` +
    g.hub.rows.map((r, i) => `<div class="row">${rich(r)}<span class="sw" data-i="${i}"></span></div>`).join(''), BX - 470, BY + 170, 'mg-card dark agent');
  const cardB = put(cardHTML(g.result), BX + 330, BY + 10, 'mg-card ccard');
  cardB.style.width = '640px';
  const pill = put(`<span class="mg-pill pill-accent">${rich(g.tag)}</span>`, BX + 330, BY + 150);
  const capB = put(`<div class="mg-title" style="font-size:60px">${rich(g.caption)}</div>`, BX, BY + 430);
  const revB = Reveal(capB.firstChild);
  const sw = [...hub.querySelectorAll('.sw')].map(Toggle);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
  W.insertBefore(svg, W.firstChild);
  const link1 = Connector(svg, BX - 470 + 82, BY - 170, BX, BY - 5);
  const link2 = Connector(svg, BX - 470 + 168, BY + 170, BX, BY + 25);

  // 场景 C：画布其它角落
  const SPOTS = [[-760, -560], [2700, -360], [-820, 520], [700, -600], [2650, 720], [300, 640]];
  const extras = cfg.extras.slice(0, SPOTS.length).map((e, i) => {
    const [x, y] = SPOTS[i];
    if (e.kind === 'note') return put(`<div style="font:700 26px NSC">${rich(e.title)}</div><div style="font:500 18px NSC;color:#9DA0B8;margin-top:6px">${rich(e.sub)}</div>`, x, y, 'mg-card mini');
    if (e.kind === 'bars') { const m = Math.max(...e.values); return put(`<div>${rich(e.title)}</div><div class="bars">${e.values.map((v, k) => `<i class="${k >= e.values.length - 2 ? 'on' : ''}" style="height:${v / m * 100}%"></i>`).join('')}</div>`, x, y, 'mg-card mini'); }
    if (e.kind === 'image') return put(e.src ? `<div style="width:230px;height:230px;border-radius:18px;background:url('${e.src}') center/cover"></div>` : '<div class="ph-img"></div>', x, y, 'mg-card');
    if (e.kind === 'dark') return put(`<span>${rich(e.text)}</span>`, x, y, 'mg-card dark mini');
    if (e.kind === 'pill') return put(`<span class="mg-pill" style="background:#fff;box-shadow:0 8px 20px rgba(30,30,70,.08)">${rich(e.text)}</span>`, x, y);
    return put(`<div style="font:600 22px NSC;color:#6B6E80">${rich(e.text)}</div>`, x, y, 'mg-card mini');
  });

  // 场景 D：结尾问题
  const DX = 900, DY = 1250;
  const titleD = put(`<div class="mg-title" style="font-size:100px">${rich(cfg.ending)}</div>`, DX, DY);
  const revD = Reveal(titleD.firstChild);

  const cam = camPath([
    { t: 0, x: 0, y: -40, z: 1.28 }, { t: 2.9, x: 0, y: -30, z: 1.14 },
    { t: 4.1, x: BX - 60, y: BY + 60, z: 1.16 }, { t: 7.0, x: BX - 40, y: BY + 70, z: 1.2 },
    { t: 8.2, x: 950, y: 260, z: .42 }, { t: 8.5, x: 950, y: 260, z: .42 },
    { t: 9.5, x: DX, y: DY, z: 1.04 }, { t: 10.5, x: DX, y: DY, z: 1.1 },
  ]);
  const s = (x, y, t) => ic.toScreen(cam(t), x, y);
  const lastRow = g.hub.rows.length - 1;
  const tg = { x: BX - 470 + 115, y: BY + 184 + 23 * g.hub.rows.length };     // 最后一个开关的世界坐标（卡片高度随行数变化）
  const cursorPath = [
    { t: .9, x: 1560, y: 980 }, { t: 1.9, x: 1220, y: 700 },
    { t: 2.5, ...s(150, 70, 2.6) }, { t: 2.65, ...s(150, 70, 2.65), click: true },
    { t: 4.3, x: 1100, y: 760 }, { t: 5.4, ...s(tg.x, tg.y, 5.5) }, { t: 5.55, ...s(tg.x, tg.y, 5.55), click: true },
    { t: 6.5, x: 1240, y: 760 }, { t: 8.3, x: 1000, y: 640 }, { t: 9.6, x: 1180, y: 700 },
  ];
  const cursor = Cursor(stage);

  cue(.15, 'air', { dur: .9 });
  cue(1.3, 'air', { dur: .6, gain: .6 });
  cue(2.65, 'mouse');
  cue(2.95, 'air', { dur: 1.2 });
  [3.8, 4.15, 4.5].forEach((t, i) => cue(t, 'tick', { pitch: 1 + i * .2 }));
  cue(4.7, 'air', { dur: .7, gain: .5 });
  cue(5.55, 'mouse'); cue(5.6, 'tick', { pitch: 1.6 });
  cue(5.85, 'sparkle');
  cue(6.35, 'pop', { pitch: 1.3 });
  cue(6.6, 'air', { dur: .8, gain: .7 });
  cue(7.1, 'air', { dur: 1.2 });
  cue(7.6, 'shimmer', { dur: 1.2 });
  cue(8.4, 'air', { dur: 1.1 });
  cue(9.2, 'swell', { dur: .5 }); cue(9.7, 'boom', { gain: .55 });

  return {
    duration: 10.5,
    render(t) {
      ic.render(t, { cam: cam(t), cursor: cursor.at(t, cursorPath) });
      revA(seg(t, .1, 1.2));
      blurIn(cardA, seg(t, 1.25, 1.9));
      cardA.style.boxShadow = t > 2.65 && t < 3.3 ? `0 0 0 ${3 * (1 - seg(t, 2.65, 3.3))}px rgba(106,91,255,.6), 0 18px 50px rgba(30,30,70,.10)` : '';
      blurIn(src, seg(t, 3.75, 4.35));
      blurIn(hub, seg(t, 4.1, 4.7));
      link1(seg(t, 4.6, 5.3));
      sw.forEach((f, i) => f(i < lastRow ? 1 : seg(t, 5.55, 5.8)));
      link2(seg(t, 5.65, 6.2));
      blurIn(cardB, seg(t, 5.8, 6.4));
      blurIn(pill, seg(t, 6.3, 6.75), { y: 0, scale: .7 });
      revB(seg(t, 6.55, 7.4));
      extras.forEach((e, i) => blurIn(e, seg(t, 7.3 + i * .09, 7.9 + i * .09)));
      revD(seg(t, 9.1, 10.1));
    },
  };
}
