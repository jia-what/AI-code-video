// 用法：
//   node render.js stills 1.9 10.2 14.2      渲染指定秒数的单帧
//   node render.js video 720|1080            逐帧渲染 + 合成音效 + 输出 MP4
//   node render.js video 720 --reuse-frames  复用已渲染的帧，只重做音效并重新封装
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 30;
const [mode, ...args] = process.argv.slice(2);
const out = path.join(__dirname, 'out');

(async () => {
  const height = mode === 'video' ? +(args[0] || 1080) : 1080;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: height / 1080 });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => window.ready);
  fs.mkdirSync(out, { recursive: true });

  if (mode === 'stills') {
    for (const t of args) {
      await page.evaluate(t => window.renderAt(t), +t);
      await page.screenshot({ path: path.join(out, `still-${t}s.png`) });
    }
  } else {
    const dir = path.join(out, `frames${height}`);
    const reuse = args.includes('--reuse-frames');   // 画面没改、只改了音效时用
    if (!reuse) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const total = await page.evaluate(() => window.DURATION) * FPS;
    for (let f = 0; f < total && !reuse; f++) {
      await page.evaluate(t => window.renderAt(t), f / FPS);
      await page.screenshot({ path: path.join(dir, `${String(f).padStart(4, '0')}.png`) });
    }
    fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify(await page.evaluate(() => window.CUES), null, 1));
    execFileSync('python3', ['-I', path.join(__dirname, 'sfx.py'), path.join(out, 'cues.json'), path.join(out, 'sfx.wav'), String(total / FPS)], { stdio: 'inherit' });
    const mp4 = path.join(out, height === 1080 ? 'video.mp4' : `draft-${height}p.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'), '-i', path.join(out, 'sfx.wav'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', height === 1080 ? '16' : '22', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
    console.log('wrote', mp4);
  }
  await browser.close();
})();
