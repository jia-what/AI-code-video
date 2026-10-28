# 把用户提供的鲸鱼娘图（白底）抠成透明 PNG：四边泛洪去白底 + 去掉发丝间封闭的白色空洞
import sys
from collections import deque
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
HOLES = [(330, 226, 343, 259), (339, 275, 350, 302), (101, 240, 114, 264), (92, 292, 98, 307)]  # 发丝空洞的包围盒

im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()
bg = set()

def flood(seeds, thr):
    q = deque(seeds)
    while q:
        p = q.popleft()
        if p in bg or min(px[p]) < thr:
            continue
        bg.add(p)
        x, y = p
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= n[0] < W and 0 <= n[1] < H and n not in bg:
                q.append(n)

flood([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)], 236)
for x0, y0, x1, y1 in HOLES:
    flood([(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) if min(px[x, y]) >= 240], 236)

a = Image.new('L', (W, H), 255)
for p in bg:
    a.putpixel(p, 0)
a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
out = im.convert('RGBA')
out.putalpha(a)
out = out.crop(out.getbbox())
out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS)
out.save(dst)
print(dst, out.size)

# 贴纸描边：把 alpha 膨胀出一圈白边，垫在原图下面
R = 12
pad = R + 4
alpha = Image.new('L', (out.width + pad * 2, out.height + pad * 2), 0)
alpha.paste(out.getchannel('A').point(lambda v: 255 if v > 40 else 0), (pad, pad))
ring = alpha.filter(ImageFilter.MaxFilter(2 * R + 1)).filter(ImageFilter.GaussianBlur(1.2))
st = Image.new('RGBA', alpha.size, (0, 0, 0, 0))
st.paste(Image.new('RGBA', alpha.size, (255, 250, 242, 255)), (0, 0), ring)
st.alpha_composite(out, (pad, pad))
st.save(dst.replace('.png', '-sticker.png'))
print('sticker', st.size)
