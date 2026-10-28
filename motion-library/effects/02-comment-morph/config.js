// 02 · 评论形变：默认占位内容。套用时复制本文件，只改需要的字段。
export default {
  duration: 6.6,

  // 开场的主角卡（之后会被复制成整面卡片墙）
  card: { name: '名称', tag: 'TAG', text: '一条内容的占位文字', initial: 'A', avatar: null },

  // 两行标题，第二行的 <hl>…</hl> 会被光标点击
  titles: ['这里是第一行标题', '第二行里的<hl>关键词</hl>'],

  // 卡片最后重组成的形状：
  //   { type: 'text', text, font }
  //   { type: 'path', w, h, d: ['SVG path', ...], eye?: [x, y], spout?: [x, y] }   eye / spout 可选：脉动亮点、上升的喷射粒子
  //   { type: 'image', src, w, h, mode: 'alpha' | 'dark' }
  shape: { type: 'text', text: 'MOTION', font: '800 300px Inter' },
  size: 1300,            // 形状在屏幕上的宽度（px）
  center: [960, 650],    // 形状中心
  colors: { top: '#F3F1FF', bottom: '#8E7DFF' },
  hl: ['#C9C2FF', '#7B6BFF'],   // 标题重点词的渐变色
};
