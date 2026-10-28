// 示例：只覆盖想改的字段，其余沿用 effects/02-comment-morph/config.js 的默认值。
// 渲染：node harness/render.mjs effects/02-comment-morph --config examples/02-custom-shape.js --out examples/out/02-custom-shape
export default {
  titles: ['把很多条内容', '重新拼成<hl>一个形状</hl>'],
  shape: {
    type: 'path', w: 600, h: 540,
    d: ['M300 520 C120 390 20 290 20 170 C20 80 90 20 170 20 C230 20 275 55 300 100 C325 55 370 20 430 20 C510 20 580 80 580 170 C580 290 480 390 300 520 Z'],
  },
  size: 620,
  center: [960, 680],
  colors: { top: '#FFE3EE', bottom: '#FF5D8A' },
  hl: ['#FFC2D6', '#FF5D8A'],
};
