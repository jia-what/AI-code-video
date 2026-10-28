// 03 · 封面墙筛选：默认占位内容。套用时复制本文件，只改需要的字段。
export default {
  duration: 7.2,

  // 开场先模糊消失的一句话（上一段的收尾）；不需要就设为 null
  intro: '先看<hl>样本</hl>从哪里来',

  grid: { cols: 12, rows: 10 },          // 数量之和要等于 cols × rows

  // 第一个标签是“全部”；之后每个类别依次被光标点击。第一个类别点击后，其余类别先褪灰，再逐个点亮
  all: '全部 120',
  categories: [
    { key: 'a', label: '类别 A', count: 80 },
    { key: 'b', label: '类别 B', count: 10 },
    { key: 'c', label: '类别 C', count: 10 },
    { key: 'd', label: '类别 D', count: 10 },
    { key: 'e', label: '类别 E', count: 10 },
  ],

  // 可选：用自己的图片做封面（循环使用），例如 ['../../my-assets/1.jpg', ...]；null 用占位封面
  images: null,
};
