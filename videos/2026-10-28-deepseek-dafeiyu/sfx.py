# 按 cues.json（由动画时间轴导出）合成全部音效，输出 48kHz 立体声 WAV
# 用法：python3 sfx.py cues.json out.wav 时长秒
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(5)


def t_(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.002, d=0.1):
    """快起、指数衰减的包络"""
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    k = int(a * SR)
    if k:
        e[:k] *= np.linspace(0, 1, k)
    return e


def sweep(f0, f1, d, curve=1.0):
    t = t_(d)
    f = f0 + (f1 - f0) * (t / d) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def lowpass(x, cut):
    """一阶低通，cut 可以是常数或逐样本数组"""
    cut = np.broadcast_to(np.asarray(cut, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s)
        y[i] = s
    return y


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


# ---------- 各种音效 ----------
def blip(pitch=1.0, **_):
    d = 0.09
    x = sweep(620 * pitch, 1250 * pitch, d, 0.6)
    return 0.45 * x * env(len(x), 0.001, 0.035)


def pop(pitch=1.0, **_):
    d = 0.14
    x = sweep(900 * pitch, 180 * pitch, d, 0.35)
    c = noise(0.006) * 0.6
    x[:len(c)] += c
    return 0.7 * x * env(len(x), 0.0005, 0.05)


def whoosh(dur=0.5, **_):
    n = noise(dur)
    t = np.linspace(0, 1, len(n))
    cut = 300 + 3200 * np.sin(np.pi * t) ** 2
    y = lowpass(n, cut) - lowpass(n, cut * 0.25)
    e = np.sin(np.pi * t) ** 1.5
    return 1.6 * y * e


def swish(**_):
    return whoosh(0.28) * 0.8


def boing(**_):
    d = 0.42
    t = t_(d)
    f = 170 + 160 * (1 - np.exp(-t / 0.05)) + 38 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / 0.15)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return 0.55 * x * env(len(x), 0.002, 0.16)


def hit(pitch=1.0, **_):
    d = 0.22
    body = np.sin(2 * np.pi * np.cumsum(np.linspace(160 * pitch, 70 * pitch, int(d * SR))) / SR)
    crack = lowpass(noise(d), 2500)
    return (0.7 * body + 0.9 * crack) * env(int(d * SR), 0.0005, 0.06)


def slam(soft=False, **_):
    d = 0.75
    sub = np.sin(2 * np.pi * np.cumsum(np.linspace(70, 38, int(d * SR))) / SR) * env(int(d * SR), 0.001, 0.22)
    crack = lowpass(noise(d), 1800) * env(int(d * SR), 0.0005, 0.05)
    x = np.tanh(2.2 * (1.0 * sub + 1.2 * crack))
    return x * (0.55 if soft else 0.95)


def shine(dur=0.8, **_):
    out = np.zeros(int(dur * SR) + SR // 2)
    for k in range(9):
        t0 = int(k / 9 * dur * SR)
        f = 2400 + 300 * k + rng.uniform(-100, 100)
        p = np.sin(2 * np.pi * f * t_(0.25)) * env(int(0.25 * SR), 0.001, 0.07)
        out[t0:t0 + len(p)] += p * 0.16
    return out


def tick(pitch=1.0, **_):
    d = 0.08
    t = t_(d)
    x = np.sin(2 * np.pi * 1100 * pitch * t) + 0.4 * np.sin(2 * np.pi * 2650 * pitch * t)
    return 0.5 * x * env(len(x), 0.0005, 0.018)


def flip(**_):
    out = np.zeros(int(0.2 * SR))
    for t0 in (0.0, 0.07):
        b = lowpass(noise(0.05), 3500) * env(int(0.05 * SR), 0.001, 0.012)
        i = int(t0 * SR)
        out[i:i + len(b)] += b * 2.2
    return out


def click(**_):
    out = np.zeros(int(0.12 * SR))
    for t0, g in ((0.0, 1.0), (0.045, 0.7)):
        b = noise(0.012) * env(int(0.012 * SR), 0.0002, 0.003)
        i = int(t0 * SR)
        out[i:i + len(b)] += b * g
    return out * 0.9


def scan(dur=1.2, **_):
    t = t_(dur)
    f = 700 + 500 * np.abs(np.sin(np.pi * t / (dur / 2)))
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5
    x = lowpass(x, 1800)
    e = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.1)
    return 0.22 * x * e


def ding(soft=False, **_):
    d = 1.1
    t = t_(d)
    x = sum(a * np.sin(2 * np.pi * 1320 * m * t) * np.exp(-t / dd) for m, a, dd in ((1, 1, .45), (2.76, .5, .25), (5.4, .25, .12)))
    return x * env(len(t), 0.001, 10) * (0.22 if soft else 0.35)


def inflate(dur=0.4, **_):
    t = t_(dur)
    f = 180 + 750 * (t / dur) ** 1.6
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.75 + 0.25 * np.sin(2 * np.pi * 30 * t))
    breath = lowpass(noise(dur), 1200) * 0.6
    return 0.45 * (x + breath) * np.minimum(1, t / 0.03)


def bubbles(n=6, gap=0.05, **_):
    out = np.zeros(int((n * gap + 0.2) * SR))
    for k in range(n):
        f0 = 280 + rng.uniform(0, 260)
        b = sweep(f0, f0 * 2.6, 0.06, 1.5) * env(int(0.06 * SR), 0.001, 0.025) * 0.35
        i = int(k * gap * SR)
        out[i:i + len(b)] += b
    return out


def thud(soft=False, **_):
    d = 0.35
    body = np.sin(2 * np.pi * np.cumsum(np.linspace(95, 45, int(d * SR))) / SR)
    x = (body + 0.6 * lowpass(noise(d), 600)) * env(int(d * SR), 0.0005, 0.08)
    return (0.45 if soft else 0.9) * np.tanh(1.5 * x)


def lock(pitch=1.0, **_):
    out = np.zeros(int(0.16 * SR))
    for t0, f in ((0.0, 1800), (0.07, 2400)):
        b = np.sign(np.sin(2 * np.pi * f * pitch * t_(0.05))) * env(int(0.05 * SR), 0.001, 0.02)
        i = int(t0 * SR)
        out[i:i + len(b)] += lowpass(b, 5000) * 0.22
    return out


def gatling(dur=0.26, **_):
    out = np.zeros(int((dur + 0.1) * SR))
    k = 0
    while k * 0.035 < dur:
        b = lowpass(noise(0.03), 3000) * env(int(0.03 * SR), 0.0003, 0.008) * 1.4
        b += np.sin(2 * np.pi * 140 * t_(0.03)) * env(int(0.03 * SR), 0.0003, 0.01) * 0.6
        i = int(k * 0.035 * SR)
        out[i:i + len(b)] += b
        k += 1
    return 0.8 * np.tanh(out)


def zip_(**_):
    x = sweep(1500, 380, 0.2, 0.7)
    return 0.35 * x * env(len(x), 0.001, 0.08)


FX = dict(blip=blip, pop=pop, whoosh=whoosh, swish=swish, boing=boing, hit=hit, slam=slam, shine=shine, tick=tick,
          flip=flip, click=click, scan=scan, ding=ding, inflate=inflate, bubbles=bubbles, thud=thud, lock=lock,
          gatling=gatling, zip=zip_)


def main():
    cues = json.load(open(sys.argv[1]))
    total = float(sys.argv[3])
    mix = np.zeros((int(total * SR), 2))
    for c in cues:
        x = FX[c['type']](**{k: v for k, v in c.items() if k not in ('t', 'type')})
        i = int(round(c['t'] * SR))
        x = x[: max(0, len(mix) - i)]
        pan = 0.0
        mix[i:i + len(x), 0] += x * (1 - pan)
        mix[i:i + len(x), 1] += x * (1 + pan)
    peak = np.abs(mix).max()
    mix = np.tanh(mix / peak * 1.3) / np.tanh(1.3) * 0.89   # 软限幅，峰值约 -1 dBFS
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print(f'sfx: {len(cues)} cues -> {sys.argv[2]}')


if __name__ == '__main__':
    main()
