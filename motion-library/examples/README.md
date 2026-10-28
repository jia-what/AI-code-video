# 套用示例

每个示例都是一份配置文件，只写要改的字段，其余沿用动效的默认配置。

## 02-custom-shape.js：评论形变 → 心形

| 默认配置 | 套用这份配置后 |
|---|---|
| <img src="../effects/02-comment-morph/preview.webp" width="360"> | <img src="02-custom-shape.webp" width="360"> |

改了 5 个字段：标题、形状（换成心形 SVG 路径）、形状尺寸和位置、短线配色、重点词颜色。动效代码一行没动。

```bash
# 预览（在 motion-library 目录运行 python3 -m http.server 8000）
http://localhost:8000/harness/preview.html?effect=02-comment-morph&config=/examples/02-custom-shape.js
# 渲染
node harness/render.mjs effects/02-comment-morph --config examples/02-custom-shape.js --out examples/out/02-custom-shape
```

成片：[02-custom-shape.mp4](02-custom-shape.mp4)

## 写自己的配置

1. 打开要用的动效的 `effects/NN-名字/config.js`，看有哪些字段（每个字段都有注释，README 里也有字段表）。
2. 新建一个文件，例如 `my-configs/开头.js`，`export default { … }` 里只写要改的字段。
3. 文案里用 `<hl>…</hl>` 标出重点词；图片放进 `assets/`，路径写成 `../../assets/xxx.png`（相对于动效的 `index.html`）。
4. 先在预览器里拖时间轴检查，再用 `--config` 渲染。
