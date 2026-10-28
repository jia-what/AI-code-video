// 01 · 无限画布：默认占位内容。套用时复制本文件，只改需要的字段。
// 文案里用 <hl>…</hl> 标出重点词（渐变色）。头像 avatar 填图片地址；留空则显示首字母圆头像。
export default {
  duration: 10.5,

  // 场景 A：开场标题 + 一张内容卡（光标会点击这张卡）
  title: '这里是一句<hl>主标题</hl>',
  card: { name: '名称', tag: 'TAG', text: '一段说明文字放在这里，可以换成任何内容', meta: '补充信息 · 12 · 标签', initial: 'A', avatar: null },

  // 场景 B：节点图（来源 → 处理节点 → 结果），光标会打开处理节点的最后一个开关
  graph: {
    source: { label: '来源', initial: 'S', avatar: null },
    hub: { title: '处理节点', status: '运行中', rows: ['步骤一', '步骤二', '步骤三'] },
    result: { name: '结果', tag: 'OUT', text: '输出的结果放在这里', meta: '刚刚 · 结果说明', initial: 'R', avatar: null },
    tag: '标签',
    caption: '这一段的<hl>结论</hl>写在这里',
  },

  // 拉远后在画布其它角落出现的小卡片（营造"无限"的感觉）
  extras: [
    { kind: 'note', title: '笔记标题', sub: '一行补充说明' },
    { kind: 'bars', title: '趋势', values: [20, 28, 24, 46, 70, 100] },
    { kind: 'image', src: null },
    { kind: 'dark', text: '深色卡片' },
    { kind: 'pill', text: '步骤一 → 步骤二 → 步骤三' },
    { kind: 'quote', text: '“关键词一” “关键词二” “关键词三”' },
  ],

  // 结尾：镜头推到下一个问题
  ending: '下一个<hl>问题</hl>是什么？',
};
