// 02 · 评论形变：时间轴。内容全部来自 config（见 config.js）。
import { cue, seg, ease, lerp, Reveal, Cursor, makeCanvas, drawDotGrid } from '../../core/mg.js';
import { rich, avatar } from '../../core/player.js';
import { CommentMorph, makeMask } from './comment-morph.js';

export default async function scene(stage, cfg) {
  const { ctx } = makeCanvas(stage);
  stage.insertBefore(ctx.canvas, stage.firstChild);
  const c = cfg.card;
  const hero = document.createElement('div');
  hero.id = 'hero';
  hero.innerHTML = `${avatar({ src: c.avatar, initial: c.initial, hue: 250 }, 78)}<div><div class="nm">${rich(c.name)}${c.tag ? `<span class="lv">${rich(c.tag)}</span>` : ''}</div><div class="tx">${rich(c.text)}</div></div>`;
  stage.appendChild(hero);
  const titles = cfg.titles.map((s, i) => {
    const e = document.createElement('div');
    e.className = 'mg-title ttl';
    e.style.top = 120 + i * 102 + 'px';
    e.innerHTML = rich(s);
    stage.appendChild(e);
    return { e, rev: Reveal(e, { hl: cfg.hl }) };
  });
  const flash = document.createElement('div');
  flash.className = 'mg-fill'; flash.style.background = '#EFEFF3';
  stage.appendChild(flash);
  const cursor = Cursor(stage, { theme: 'dark' });

  await document.fonts.load(cfg.shape.font || '800 300px Inter', cfg.shape.text || 'A');
  const mask = await makeMask(cfg.shape);
  const T = { wall: [.35, 1.35], tilt: [1.25, 1.95], collapse: [1.85, 2.45], form: [2.35, 3.45], burst: [5.6, 6.3] };
  const zoom = t => (t < .45 ? lerp(4, 3.4, ease.outCubic(t / .45)) : lerp(3.4, .42, seg(t, .45, 1.45, ease.inOutQuint)));
  const morph = CommentMorph(ctx, { mask, T, zoom, center: cfg.center, size: cfg.size, colors: cfg.colors, eye: cfg.shape.eye, spout: cfg.shape.spout });

  const REV = [[1.3, 2.0], [2.35, 3.1]];
  let path = [{ t: 0, x: 2200, y: 1200, hidden: true }];

  cue(.05, 'air', { dur: .7, gain: .7 });
  cue(.45, 'tickroll', { dur: .9, n: 30 });
  cue(1.2, 'air', { dur: .9 });
  cue(1.3, 'air', { dur: .6, gain: .4 });
  cue(1.85, 'swish');
  cue(2.35, 'sparkle'); cue(2.4, 'shimmer', { dur: 3 });
  cue(2.4, 'air', { dur: .6, gain: .4 });
  cue(3.35, 'boom', { gain: .6 });
  cue(5.1, 'riser', { dur: .5 });
  cue(5.6, 'boom'); cue(5.6, 'air', { dur: .8 });

  return {
    duration: 6.6,
    async prepare() {
      await document.fonts.ready;
      const hl = titles.length > 1 && titles[1].e.querySelector('.hl');
      if (hl) {
        titles[1].rev(1);
        const b = hl.getBoundingClientRect();
        const p = { x: b.x + b.width * .55, y: b.y + b.height * .7 };
        titles[1].rev(0);
        path = [{ t: 3.3, x: 1560, y: 980 }, { t: 4.1, ...p }, { t: 4.25, ...p, click: true }, { t: 5.4, x: p.x + 40, y: p.y + 30 }];
        cue(4.25, 'mouse');
      }
    },
    render(t) {
      ctx.clearRect(0, 0, 1920, 1080);
      drawDotGrid(ctx, { gap: 30, r: 1.3, color: '#1C1C2A', cam: { x: 0, y: 0, z: 1 } });
      const halo = 1 - seg(t, .3, .9);
      if (halo > 0) {                                   // 主角卡背后的点阵光环
        const R = 330 * zoom(t) / 4;
        ctx.fillStyle = `rgba(142,125,255,${.55 * halo})`;
        for (let k = 0; k < 3; k++) for (let a = 0; a < 72; a++) {
          const ang = a / 72 * Math.PI * 2, rr = R + k * 22;
          ctx.beginPath(); ctx.arc(960 + Math.cos(ang) * rr * 1.5, 540 + Math.sin(ang) * rr, 2, 0, 7); ctx.fill();
        }
      }
      morph.render(t);
      hero.style.transform = `scale(${zoom(t) / 4})`;
      hero.style.opacity = 1 - seg(t, .55, .8);
      titles.forEach(({ rev }, i) => { rev(seg(t, ...REV[i] || REV[1])); if (t > 5.5) rev(seg(t, 5.5, 5.85), { out: true }); });
      cursor.at(t, path);
      cursor.el.style.opacity = Math.min(+cursor.el.style.opacity, 1 - seg(t, 5.6, 5.9));
      flash.style.opacity = seg(t, 5.95, 6.35, ease.inQuad);
    },
  };
}
