# 音画同步检查（对成片 MP4 做，不看源文件）
#   1. 声音：把成片解码出的音轨与合成的原始音效轨做互相关
#      - 整体偏移：编码 / 封装有没有让声音整体提前或滞后
#      - 逐个音效：每个音效在成片里的实际位置与设计时间点的偏差（重叠的音效也能准确对齐）
#   2. 画面：把每个"撞击类"音效时间点前后各 1 帧抽出来拼成联系表，人工核对动作落点
#   3. 输出一张总览图：上面是声音包络，下面是画面变化量，竖线是音效时间点
# 用法：python3 sync_check.py video.mp4 sfx.wav cues.json 输出目录
import json
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS, SR = 30, 48000
mp4, ref_wav, cues_path, outdir = sys.argv[1:5]
cues = sorted(json.load(open(cues_path)), key=lambda c: c['t'])
FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'

pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
dec = np.frombuffer(pcm, np.float32).astype(np.float64)
with wave.open(ref_wav) as w:
    ref = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, w.getnchannels()).mean(axis=1) / 32768

# 1a 整体偏移
n = 1 << int(np.ceil(np.log2(len(ref) + len(dec))))
xc = np.fft.irfft(np.fft.rfft(dec, n) * np.conj(np.fft.rfft(ref, n)), n)
maxlag = int(0.2 * SR)
lags = np.r_[np.arange(0, maxlag), np.arange(-maxlag, 0)]
vals = np.r_[xc[:maxlag], xc[-maxlag:]]
global_ms = lags[np.argmax(vals)] / SR * 1000

# 1b 逐个音效
rows = []
for c in cues:
    i0, i1 = int((c['t'] - 0.01) * SR), int((c['t'] + 0.25) * SR)
    seg = ref[i0:i1]
    best, lag_best = -1, 0
    for lag in range(-int(0.06 * SR), int(0.06 * SR) + 1, 12):
        d = dec[i0 + lag:i1 + lag]
        if len(d) != len(seg):
            continue
        r = np.dot(seg, d) / (np.linalg.norm(seg) * np.linalg.norm(d) + 1e-12)
        if r > best:
            best, lag_best = r, lag
    for lag in range(lag_best - 12, lag_best + 13):      # 细化到单个采样
        d = dec[i0 + lag:i1 + lag]
        r = np.dot(seg, d) / (np.linalg.norm(seg) * np.linalg.norm(d) + 1e-12)
        if r > best:
            best, lag_best = r, lag
    rows.append((c, lag_best / SR * 1000, best))

# 画面变化量
W, H = 192, 108
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-vf', f'scale={W}:{H}', '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
motion = np.r_[0, np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))]

# 2 撞击类音效的前后帧联系表
IMPACT = {'slam', 'hit', 'pop', 'thud', 'lock', 'ding', 'flip', 'boing', 'tick', 'click', 'zip'}
pick = [c for c in cues if c['type'] in IMPACT] or cues[:6]      # 没有撞击类音效时，取前几个音效
TW, TH = 320, 180
font = ImageFont.truetype(FONT, 22)
sheet = Image.new('RGB', (TW * 3 + 220, TH * len(pick)), (12, 16, 40))
dr = ImageDraw.Draw(sheet)
for r, c in enumerate(pick):
    f = round(c['t'] * FPS)
    for k, ff in enumerate((f - 1, f, f + 1)):
        png = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-vf', f'select=eq(n\\,{ff}),scale={TW}:{TH}', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'],
                             capture_output=True, check=True).stdout
        im = Image.open(__import__('io').BytesIO(png))
        sheet.paste(im, (220 + k * TW, r * TH))
        if k == 1:
            dr.rectangle([220 + TW, r * TH, 220 + 2 * TW - 1, (r + 1) * TH - 1], outline=(255, 213, 74), width=3)
    dr.text((12, r * TH + 50), f"{c['t']:.2f}s  {c['type']}", fill=(242, 245, 255), font=font)
    dr.text((12, r * TH + 85), f"帧 {f - 1} / {f} / {f + 1}", fill=(140, 155, 203), font=font)
sheet.save(os.path.join(outdir, 'sync-frames.png'))

# 3 总览图
CW, CH = 2000, 520
img = Image.new('RGB', (CW, CH), (12, 16, 40))
d = ImageDraw.Draw(img)
dur = len(frames) / FPS
X = lambda t: 40 + (CW - 80) * t / dur
step = int(SR / 100)
envd = np.array([np.abs(dec[i:i + step]).max() for i in range(0, len(dec), step)])
for i, v in enumerate(envd):
    x = X(i / 100)
    d.line([x, 200, x, 200 - 160 * v / envd.max()], fill=(77, 107, 254))
mm = motion / motion.max()
pts = [(X(f / FPS), 480 - 220 * m) for f, m in enumerate(mm)]
d.line(pts, fill=(196, 220, 245), width=2)
for c in cues:
    d.line([X(c['t']), 20, X(c['t']), 490], fill=(255, 213, 74), width=1)
for s in range(int(dur) + 1):
    d.text((X(s) - 8, 495), f'{s}s', fill=(140, 155, 203), font=ImageFont.truetype(FONT, 16))
d.text((48, 18), '声音包络（成片解码）', fill=(242, 245, 255), font=font)
d.text((48, 230), '画面变化量（逐帧差）   黄色竖线 = 音效时间点', fill=(242, 245, 255), font=font)
img.save(os.path.join(outdir, 'sync-overview.png'))

# 报告
errs = [abs(e) for _, e, _ in rows]
lines = ['# 音画同步检查报告', '',
         f'- 文件：`{os.path.basename(mp4)}`；视频 {len(frames)} 帧 = {len(frames) / FPS:.3f} 秒；音轨 {len(dec) / SR:.3f} 秒',
         f'- 声音整体偏移（成片音轨 vs 原始音效轨）：**{global_ms:+.2f} ms**',
         f'- 逐个音效的位置偏差：最大 **{max(errs):.2f} ms**，平均 {np.mean(errs):.2f} ms（{len(rows)} 个音效，判定标准 ≤ 20 ms）',
         f'- 画面：{len(pick)} 个撞击类音效的前后帧见 `sync-frames.png`（中间黄框 = 音效所在帧）；总览见 `sync-overview.png`', '',
         '| 时间点 | 帧 | 音效 | 成片中实际位置偏差 | 波形相关度 | 结论 |', '|---|---|---|---|---|---|']
for c, e, r in rows:
    lines.append(f"| {c['t']:.2f}s | {round(c['t'] * FPS)} | {c['type']} | {e:+.2f} ms | {r:.3f} | {'✅' if abs(e) <= 20 else '⚠️'} |")
ok = sum(abs(e) <= 20 for e in errs)
lines += ['', f'**声音位置：{ok}/{len(rows)} 个通过。**']
open(os.path.join(outdir, 'sync-report.md'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines[2:6]))
print(f'pass {ok}/{len(rows)}')
