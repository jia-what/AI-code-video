#!/usr/bin/env node
// 逐帧渲染器：页面 → PNG 帧 → 合成音效 → MP4（+ 封面 + 动图预览）
//
// 用法（在 motion-library 目录下）：
//   node harness/render.mjs effects/01-infinite-canvas --stills 1.2,3.5,6     静帧 → <效果>/out/still-*.png
//   node harness/render.mjs effects/01-infinite-canvas                        1080p 成片 → <效果>/out/video.mp4
//   选项：--scale 0.6667（720p 草稿） --workers 3（并行页面数） --cover 2.5（封面时间点）
//         --publish（把成片、封面、动图预览复制到效果目录：preview.mp4 / cover.jpg / preview.webp）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;

const argv = process.argv.slice(2);
const opt = { _: [] };
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) opt[argv[i].slice(2)] = true; else { opt[argv[i].slice(2)] = n; i++; } }
  else opt._.push(argv[i]);
}
const effDir = path.resolve(ROOT, opt._[0]);
const rel = path.relative(ROOT, effDir).split(path.sep).join('/');
const outDir = path.join(effDir, 'out');
fs.mkdirSync(outDir, { recursive: true });
const scale = +(opt.scale || 1);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${rel}/index.html`;

const browser = await chromium.launch();
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  page.on('pageerror', e => console.error('[page]', e.message));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}

const shot = (page, t, file) => page.evaluate(t => window.renderAt(t), t).then(() => page.screenshot({ path: file }));

if (opt.stills) {
  const page = await openPage();
  for (const t of String(opt.stills).split(',')) await shot(page, +t, path.join(outDir, `still-${t}s.png`));
  console.log('stills →', path.relative(ROOT, outDir));
} else {
  const workers = +(opt.workers || 3);
  const pages = await Promise.all(Array.from({ length: workers }, openPage));
  const duration = await pages[0].evaluate(() => window.DURATION);
  const cues = await pages[0].evaluate(() => window.CUES);
  const total = Math.round(duration * FPS);
  const frames = path.join(outDir, 'frames');
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames);
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(pages.map(async page => {
    while (next < total) {
      const f = next++;
      await shot(page, f / FPS, path.join(frames, `${String(f).padStart(5, '0')}.png`));
      if (++done % 60 === 0) console.log(`${done}/${total} 帧  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  fs.writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify(cues, null, 1));
  const wav = path.join(outDir, 'sfx.wav');
  execFileSync('python3', ['-I', path.join(ROOT, 'audio/sfx.py'), path.join(outDir, 'cues.json'), wav, String(duration)], { stdio: 'inherit' });
  const mp4 = path.join(outDir, scale === 1 ? 'video.mp4' : `draft-${Math.round(1080 * scale)}p.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, '%05d.png'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', scale === 1 ? '17' : '22', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  console.log('video →', path.relative(ROOT, mp4));
  if (opt.publish) {
    const cover = String(opt.cover || duration / 2);
    fs.copyFileSync(mp4, path.join(effDir, 'preview.mp4'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', cover, '-i', mp4, '-frames:v', '1', '-q:v', '3', path.join(effDir, 'cover.jpg')]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', 'fps=15,scale=640:-1:flags=lanczos', '-c:v', 'libwebp_anim',
      '-q:v', '62', '-loop', '0', '-an', path.join(effDir, 'preview.webp')]);
    console.log('published → preview.mp4 / cover.jpg / preview.webp');
  }
}
await browser.close();
server.close();
