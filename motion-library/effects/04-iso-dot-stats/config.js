// 04 · 立体点阵统计：默认占位内容（示例数据）。套用时复制本文件，换成你核实过的数据。
export default {
  duration: 10,

  // 顶部图例，<hl>…</hl> 前会自动加一个发光圆点
  legend: '每一点 = 1 个样本 · 每块 100 个 · <hl>发光 = 命中</hl> · 示例数据',

  // 每组 = 一块 10×10 点阵；value = 每 100 个里命中几个（同时是折线图的数值）。建议 5–8 组
  data: [
    { label: '第 1 组', value: 0 },
    { label: '第 2 组', value: .6 },
    { label: '第 3 组', value: .3 },
    { label: '第 4 组', value: 1.1 },
    { label: '第 5 组', value: 2.2 },
    { label: '第 6 组', value: 3.5 },
    { label: '第 7 组', value: 5.2 },
  ],
  unit: '%',
  decimals: 1,

  // 斜俯视阶段：光标停在第一组时显示的计数和说明
  intro: { counter: '0', note: '第 1 组：一个命中都没有' },
  // 正视阶段：大号数字下面的说明
  caption: '每 100 个样本里的命中数（示例数据）',
};
