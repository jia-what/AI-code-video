# 动效库 Motion Library

从参考视频（B 站 UP 主 WorkFisher 讲“大肥鱼”的一期视频）里学到的四种动效，整理成可复用的代码。

只学习风格和动效手法，没有使用原视频的任何素材、文字或数据。所有画面都由代码生成：HTML、Canvas、SVG。音效也由代码合成。

| | 动效 | 适合 | 时长 |
|---|---|---|---|
| <a href="effects/01-infinite-canvas"><img src="effects/01-infinite-canvas/preview.webp" width="320"></a> | **[01 · 无限画布](effects/01-infinite-canvas)**<br>浅灰点阵白板，相机在内容之间平移缩放，光标聚光，节点连线 | 讲流程、讲关系 | 10.5s |
| <a href="effects/02-comment-morph"><img src="effects/02-comment-morph/preview.webp" width="320"></a> | **[02 · 评论形变](effects/02-comment-morph)**<br>一条评论 → 评论砖墙 → 透视倾倒 → 椭圆 → 重组成鲸鱼 → 炸开 | 开头钩子、“很多个 X 组成一个现象” | 6.6s |
| <a href="effects/03-media-wall"><img src="effects/03-media-wall/preview.webp" width="320"></a> | **[03 · 封面墙筛选](effects/03-media-wall)**<br>120 张封面波浪浮现，标签筛选褪灰 / 点亮，缩成光点 | 交代样本、分类筛选 | 7.2s |
| <a href="effects/04-iso-dot-stats"><img src="effects/04-iso-dot-stats/preview.webp" width="320"></a> | **[04 · 立体点阵统计](effects/04-iso-dot-stats)**<br>3D 点阵（1 点 = 1 条），发光彗尾，运镜转正视，发光折线图 | 占比、趋势 | 10s |

四个动效首尾可以直接相接：02 白闪到浅灰 → 01 浅灰画布 → 03 结尾散成光点 → 04 从光点归位开始。

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

## 目录

```
motion-library/
├── core/
│   ├── mg.js          # 运行时：缓动、时间段 seg()、可复现随机数、逐字浮现 Reveal、blurIn、光标 Cursor、
│   │                  #         点阵网格 drawDotGrid、光晕、发光精灵、音效登记 cue()、页面挂载 mount()
│   └── tokens.css     # 设计变量、字体、通用组件样式
├── effects/NN-名字/   # 每个动效：可复用模块 .js + 演示 index.html + 说明 README.md + 预览
├── audio/sfx.py       # 音效合成库（28 种：mouse、air、sparkle、boom、tickroll……），按 cues.json 合成
├── harness/
│   ├── render.mjs     # 逐帧渲染 → 合成音效 → MP4 / 封面 / 动图预览
│   ├── preview.html   # 浏览器里拖时间轴预览
│   ├── sync_check.py  # 音画同步检查
│   └── contact.py     # 静帧联系表
├── assets/            # 演示用素材
└── template.md        # 新增动效的模板和写法要点
```

## 快速开始

需要 Node.js、Python 3（numpy、Pillow）、FFmpeg 和 Playwright（Chromium）。

```bash
cd motion-library
npm install
python3 -m http.server 8000      # 打开 http://localhost:8000/harness/preview.html 拖时间轴预览
node harness/render.mjs effects/02-comment-morph --stills 1,2.5,4           # 出静帧
node harness/render.mjs effects/02-comment-morph --publish --cover 3.8      # 出 1080p 成片 + 封面 + 动图预览
```

## 在新视频里复用

每个动效都拆成了“可复用模块”和“演示时间轴”两部分。在新视频里只引入模块，内容和时间自己写：

```html
<link rel="stylesheet" href="../../motion-library/core/tokens.css">
<script type="module">
import { mount, cue, seg, Reveal, Cursor } from '../../motion-library/core/mg.js';
import { CommentMorph } from '../../motion-library/effects/02-comment-morph/comment-morph.js';
// ……搭内容，写 render(t)，用 cue() 登记音效
mount({ duration: 8, render });
</script>
```

所有动效都是纯函数 `renderAt(t)`：给定时间就能画出那一帧，所以能跳帧、并行渲染，音效时间点和画面用同一条时间轴。

## 素材与许可

| 内容 | 说明 |
|---|---|
| 代码、文档 | 本仓库原创 |
| 字体 | Inter、Noto Sans SC，均为 SIL OFL 1.1，通过 npm `@fontsource/*` 安装，不放进仓库 |
| `assets/whalegirl.png` | 用户提供的鲸鱼娘立绘（社区二创形象），只用于演示，授权由提供者负责 |
| 封面墙的封面 | `drawCover()` 程序化生成，不含任何真实视频封面 |
| 04 的数字 | 示例数据，不是真实统计 |
| 鲸鱼剪影 | 原创路径，不是 DeepSeek 官方 Logo |
| 音效 | `audio/sfx.py` 合成，原创 |
| 动效风格 | 学习自 B 站 UP 主 WorkFisher 的视频；目录组织方式参考了 [Vincentwei1021/mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) |
