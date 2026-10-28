# 新动效模板

往动效库里加一个新动效时，按这个结构来。

## 目录

```
effects/NN-英文名/
├── 英文名.js      # 可复用的部分：导出函数 / 组件，不写具体内容和时间
├── index.html     # 演示：搭内容 + 写时间轴 + 登记音效
├── README.md      # 看点、动作拆解、用法、音效搭配、提示词
├── preview.mp4    # 1080p 成片（harness/render.mjs --publish 生成）
├── preview.webp   # 640px 动图预览
└── cover.jpg      # 封面
```

## 页面约定

`core/mg.js` 的 `mount()` 会帮你挂好下面这些，渲染器和预览器都依赖它们：

| 名称 | 含义 |
|---|---|
| `window.DURATION` | 总时长（秒） |
| `window.renderAt(t)` | 画出 t 时刻。**必须是纯函数**：只看 t，不依赖上一帧，这样才能跳帧、并行渲染 |
| `window.CUES` | 音效时间点：用 `cue(t, 类型, 参数)` 登记，类型见 `audio/sfx.py` 的 `FX` |
| `window.ready` | 字体、图片、预计算都完成后 resolve |

## 写法要点

1. **时间用 `seg(t, a, b, ease)`**：返回 t 在 [a, b] 区间里的进度（0–1），所有动画都由它驱动。
2. **随机用 `rng(seed)`**：不要用 `Math.random()`，否则每次渲染的结果都不一样。
3. **大量粒子用 canvas**（`makeCanvas`），文字和卡片用 DOM（清晰、好排版）。发光用 `glowSprite` 配合 `lighter` 叠加，不要用 `shadowBlur`。
4. **音效在动作"落地"的那一帧登记**，不是在动作开始时。比如 `fromTo(scale: 2 → 1, 0.22s)` 从 1.5s 开始，砸地声就登记在 1.72s。
5. **光标要点到元素**：在 `prepare` 里用 `getBoundingClientRect()` 量出元素位置再生成路径；元素在世界坐标里时用 `toScreen`。
6. **数据要真实**：讲数据的动效，演示时用"示例数据"并在画面上写明；正式视频换成核实过的数据。

## 流程

```bash
node harness/render.mjs effects/NN-名字 --stills 1,3,5          # 先出几张静帧看构图
node harness/render.mjs effects/NN-名字 --scale 0.6667           # 720p 草稿
node harness/render.mjs effects/NN-名字 --publish --cover 3.2    # 1080p 成片 + 封面 + 动图预览
python3 harness/sync_check.py effects/NN-名字/out/video.mp4 effects/NN-名字/out/sfx.wav effects/NN-名字/out/cues.json effects/NN-名字/out
```
