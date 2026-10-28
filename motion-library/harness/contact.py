# 把多张静帧拼成带标签的联系表：python3 harness/contact.py out.png a.png b.png ... [--cols 3 --w 640]
import sys
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
cols, w = 3, 640
if '--cols' in args: i = args.index('--cols'); cols = int(args[i + 1]); del args[i:i + 2]
if '--w' in args: i = args.index('--w'); w = int(args[i + 1]); del args[i:i + 2]
out, files = args[0], args[1:]
ims = [Image.open(f).convert('RGB') for f in files]
h = round(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (20, 20, 28))
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
d = ImageDraw.Draw(sheet)
for k, (f, im) in enumerate(zip(files, ims)):
    x, y = (k % cols) * w, (k // cols) * h
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y))
    label = f.rsplit('/', 1)[-1].replace('still-', '').replace('.png', '')
    d.rectangle([x, y, x + 12 * len(label) + 12, y + 28], fill=(0, 0, 0))
    d.text((x + 6, y + 3), label, fill=(255, 220, 80), font=font)
sheet.save(out)
