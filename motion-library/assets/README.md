# assets

放你自己的素材（头像、封面、形状图片等），然后在配置文件里引用，例如：

```js
card: { avatar: '../../assets/my-avatar.png' },        // 01 / 02 的头像
images: ['../../assets/covers/1.jpg', '...'],          // 03 的封面
shape: { type: 'image', src: '../../assets/logo.png', w: 800, h: 400, mode: 'alpha' },   // 02 的目标形状
```

路径相对于各动效的 `index.html`（即 `effects/NN-名字/`）。请只使用你有权使用的素材。
