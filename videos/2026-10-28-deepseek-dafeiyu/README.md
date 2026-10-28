# B站被蓝色大肥鱼攻陷了！

![封面](cover.png)

20 秒中文知识讲解动画的开头，讲最近的热点：B 站评论区涌进大批由 DeepSeek 驱动的 AI 账号，也就是网友口中的“蓝色大肥鱼”。

- 成片：[`video.mp4`](video.mp4)，1920×1080，30fps，20 秒，H.264 + AAC
- 受众：乐子人，看热闹的观众
- 声音：只有音效，没有配音、音乐和字幕
- 分镜：[`storyboard.md`](storyboard.md)
- 音画同步检查：[`sync-report.md`](sync-report.md)、[`sync-overview.png`](sync-overview.png)

## 五个镜头

| 镜头 | 时间 | 内容 |
|---|---|---|
| 1 钩子 | 0–3.3s | 评论流被大肥鱼刷屏，鲸鱼娘冲上画面，大字“B站被蓝色大肥鱼攻陷了！” |
| 2 物种图鉴 | 3.3–7.5s | 真身是 DeepSeek 驱动的 AI 账号：找视频 → 读字幕 → 按人设发评论 |
| 3 外号由来 | 7.5–12s | AI 识图把蓝鲸认成“蓝色大肥鱼”，鲸鱼娘从照片里炸出来 |
| 4 网友反击 | 12–16.2s | 开源插件“大肥鱼消除计划”锁定大肥鱼，白饭加特林把它们赶回家吃白饭 |
| 5 悬念 | 16.2–20s | 鱼又冒了出来，引出问题：“评论区里，谁才是人？” |

## 怎么重新生成

需要 Node.js、Python 3（numpy、Pillow）、FFmpeg 和 Playwright（Chromium）。

```bash
npm install
npm run stills      # 渲染 3 张关键帧到 out/
npm run draft       # 720p 草稿：out/draft-720p.mp4
npm run build       # 1080p 成片，并复制为 video.mp4
python3 sync_check.py out/video.mp4 out/sfx.wav out/cues.json out   # 音画同步检查
```

| 文件 | 作用 |
|---|---|
| `index.html` | 全部画面：HTML/SVG + GSAP 时间轴。音效时间点也写在这里（`cue()`），画面和声音共用一份时间轴 |
| `render.js` | 用 Playwright 逐帧定位到指定时间并截图，再用 FFmpeg 合成 MP4 |
| `sfx.py` | 按时间轴导出的 `cues.json` 用代码合成全部音效（不用外部音频素材） |
| `sync_check.py` | 对成片做音画同步检查 |
| `cutout.py` | 把鲸鱼娘立绘的白底抠掉，再加一圈白色贴纸边 |

## 素材与许可

| 素材 | 来源 | 许可 |
|---|---|---|
| 鲸鱼娘立绘（`assets/whalegirl*.png`） | 用户提供（社区二创形象） | 由提供者负责授权 |
| 迷你鲸鱼娘表情、白饭加特林、插件图标 | [liyupi/dafeiyu-cleaner](https://github.com/liyupi/dafeiyu-cleaner) | MIT，见 `assets/LICENSE-dafeiyu-cleaner.txt` |
| 得意黑 Smiley Sans | npm `@fontpkg/smiley-sans` | SIL OFL 1.1 |
| 思源黑体、JetBrains Mono | npm `@fontsource/*` | SIL OFL 1.1 |
| 音效 | `sfx.py` 合成 | 原创 |

DeepSeek 名称归其所有者。本视频不是 DeepSeek 或 B 站官方内容。画面里的鲸鱼是通用简笔画，不是官方 Logo。评论文案是按插件 README 描述的大肥鱼特征写的示意，不对应真实账号。
