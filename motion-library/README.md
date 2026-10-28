# 动效库 Motion Library

四种**无主题**的 MG 动效模板。动效和内容分开：动效逻辑写在 `scene.js` 里，文字、图片、形状、数据都放在 `config.js` 里。定下主题或备好素材后，写一份自己的配置就能套用，不用改动效代码。

| | 动效 | 适合 | 时长 |
|---|---|---|---|
| <a href="effects/01-infinite-canvas"><img src="effects/01-infinite-canvas/preview.webp" width="320"></a> | **[01 · 无限画布](effects/01-infinite-canvas)**<br>浅灰点阵白板，相机在内容之间平移缩放，光标聚光，节点连线 | 讲流程、讲关系 | 10.5s |
| <a href="effects/02-comment-morph"><img src="effects/02-comment-morph/preview.webp" width="320"></a> | **[02 · 评论形变](effects/02-comment-morph)**<br>一张卡片 → 卡片墙 → 透视倾倒 → 椭圆 → 重组成任意形状 → 炸开 | 开头钩子、“很多个 X 汇成一个 Y” | 6.6s |
| <a href="effects/03-media-wall"><img src="effects/03-media-wall/preview.webp" width="320"></a> | **[03 · 封面墙筛选](effects/03-media-wall)**<br>一面封面波浪浮现，标签筛选褪灰 / 点亮，缩成光点 | 交代样本、分类筛选 | 7.2s |
| <a href="effects/04-iso-dot-stats"><img src="effects/04-iso-dot-stats/preview.webp" width="320"></a> | **[04 · 立体点阵统计](effects/04-iso-dot-stats)**<br>3D 点阵（1 点 = 1 个样本），发光彗尾，运镜转正视，发光折线图 | 占比、趋势 | 10s |

四个动效首尾可以直接相接：02 白闪到浅灰 → 01 浅灰画布 → 03 结尾散成光点 → 04 从光点归位开始。

## 套用：三步

**1. 复制默认配置**，只保留你要改的字段（其余自动沿用默认值）：

```js
// my-configs/opening.js
export default {
  titles: ['第一行标题', '第二行里的<hl>关键词</hl>'],     // <hl>…</hl> = 重点词（渐变色）
  shape: { type: 'text', text: '2026', font: '800 360px Inter' },
  colors: { top: '#E8FFF6', bottom: '#19C2A0' },
};
```

**2. 预览**：在 `motion-library` 目录运行 `python3 -m http.server 8000`，打开
`http://localhost:8000/harness/preview.html?effect=02-comment-morph&config=/my-configs/opening.js`，拖时间轴检查。

**3. 渲染**：

```bash
node harness/render.mjs effects/02-comment-morph --config my-configs/opening.js --out out/opening
```

输出 `out/opening/video.mp4`（1080p、30fps、带音效）。每个动效的配置字段见各自的 README。[`examples/02-custom-shape.js`](examples/02-custom-shape.js) 是一个完整示例。

素材（头像、封面、形状图片）放进 [`assets/`](assets/)，在配置里引用即可。

## 共同的视觉语言

| 项目 | 规格 |
|---|---|
| 强调色 | 蓝紫 `#6A5BFF`，渐变亮端 `#A99EFF`；深色场景的发光用 `#8E7DFF` |
| 浅色场景 | 底 `#EFEFF3`，点阵 `#C3C4D2`（间距 34px），文字 `#15151C`，白卡片加柔和投影 |
| 深色场景 | 底 `#06060B`，左侧紫色氛围光，淡点阵，斜向流光 |
| 字体 | Inter（数字、英文），思源黑体 Noto Sans SC（中文） |
| 出场方式 | 一律从模糊中浮现：模糊 → 清晰，同时轻微上移、放大；文字逐字浮现，重点词用渐变 |
| 光标 | 带紫色光晕；点击时箭头微缩，放出一圈光环；附近点阵被染紫 |
| 缓动 | 移动用 inOutCubic，出现用 outCubic，形变用 inOutQuint，炸开用 inExpo |

想换整体配色：改 `core/tokens.css` 里的变量，以及各动效里的颜色参数。

## 目录

```
motion-library/
├── core/
│   ├── mg.js          # 运行时：缓动、时间段 seg()、可复现随机数、逐字浮现 Reveal、blurIn、光标 Cursor、
│   │                  #         点阵网格 drawDotGrid、光晕、发光精灵、音效登记 cue()、页面挂载 mount()
│   ├── player.js      # 加载器：默认配置 + ?config= 覆盖（深合并）；文案 <hl> 标记；首字母头像
│   └── tokens.css     # 设计变量、字体、通用组件样式
├── effects/NN-名字/
│   ├── config.js      # 默认占位内容 ← 套用时改这里（复制一份）
│   ├── scene.js       # 时间轴：按配置搭画面、登记音效
│   ├── 名字.js         # 可复用组件（自己搭新时间轴时用）
│   ├── index.html     # 加载页
│   ├── README.md      # 配置字段、看点、动作拆解、提示词
│   └── preview.mp4 / preview.webp / cover.jpg
├── examples/          # 套用示例配置
├── assets/            # 放你自己的素材
├── audio/sfx.py       # 音效合成库（28 种：mouse、air、sparkle、boom、tickroll……），按 cues.json 合成
├── harness/
│   ├── render.mjs     # 逐帧渲染 → 合成音效 → MP4 / 封面 / 动图预览（支持 --config）
│   ├── preview.html   # 浏览器里拖时间轴预览（支持 ?config=）
│   ├── sync_check.py  # 音画同步检查
│   └── contact.py     # 静帧联系表
└── template.md        # 新增动效的模板和写法要点
```

## 环境

需要 Node.js、Python 3（numpy、Pillow）、FFmpeg 和 Playwright（Chromium）。在 `motion-library` 目录运行 `npm install` 安装字体。

所有动效都是纯函数 `renderAt(t)`：给定时间就能画出那一帧，所以能跳帧、并行渲染；音效时间点和画面共用同一条时间轴。

## 素材与许可

| 内容 | 说明 |
|---|---|
| 代码、文档 | 本仓库原创 |
| 字体 | Inter、Noto Sans SC，均为 SIL OFL 1.1，通过 npm `@fontsource/*` 安装，不放进仓库 |
| 默认画面 | 全部由代码生成：首字母头像、抽象占位封面、文字形状；不含任何第三方图片 |
| 04 的数字 | 示例数据，不是真实统计 |
| 音效 | `audio/sfx.py` 合成，原创 |
| 动效风格 | 学习自 B 站 UP 主 WorkFisher 一期视频的动效手法（只学手法，未使用其素材、文字或数据）；目录组织参考了 [Vincentwei1021/mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) |
