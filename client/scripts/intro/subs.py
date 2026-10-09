import subprocess, numpy as np, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SRC, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 1280, 720, 30
FONT = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 26)
FONT_TAG = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 28)
WHITE, MAGENTA = (236, 236, 244), (255, 43, 214)
# frame range, Thai box to hide (x0, y0, x1, y1), English line, border colour
SUBS = [
    (18, 146, (358, 586, 915, 669), "Once upon a time, every dimension lived in peace.", WHITE),
    (170, 353, (350, 586, 920, 669), "The Rift Core kept each world apart.", WHITE),
    (565, 632, (436, 580, 860, 675), "“Every world... is an error.”", MAGENTA),
    (800, 899, (428, 586, 840, 669), "The walls between worlds have fallen.", WHITE),
]
TAG_START, TAG_BOX = 1690, (262, 424, 1018, 520)
TAG_LINES = ["The dimensions are shattered.", "Who will be the last one standing?"]

def typed(text, t, secs=0.8):
    return text[: max(0, min(len(text), int(len(text) * t / secs + 1)))]

def draw_sub(img, f, f0, f1, box, text, col):
    d = ImageDraw.Draw(img, "RGBA")
    tw = d.textlength(text, font=FONT)
    cx = (box[0] + box[2]) / 2
    x0 = min(box[0], cx - tw / 2 - 30); x1 = max(box[2], cx + tw / 2 + 30)
    y0, y1 = box[1], box[3]
    d.rectangle((x0, y0, x1, y1), fill=(20, 15, 32, 255))
    # the original's bracket: a light frame down the left side, half way along the top and bottom
    half = x0 + (x1 - x0) * 0.42
    d.rectangle((x0, y0, half, y0 + 2), fill=col)
    d.rectangle((x0, y1 - 2, half, y1), fill=col)
    d.rectangle((x0, y0, x0 + 2, y1), fill=col)
    s = typed(text, (f - f0) / FPS)
    d.text((cx - tw / 2, (y0 + y1) / 2 - 16), s, font=FONT, fill=(255, 255, 255, 255))

plate = None
p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", OUT], stdin=subprocess.PIPE)
# feathered mask for the tagline plate
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).rounded_rectangle(TAG_BOX, 30, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(10))
f = 0
while True:
    b = p.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    img = Image.frombuffer("RGB", (W, H), b)
    if f == TAG_START - 1: plate = img.copy()
    for f0, f1, box, text, col in SUBS:
        if f0 <= f < f1: draw_sub(img, f, f0, f1, box, text, col)
    if f >= TAG_START and plate is not None:
        img = Image.composite(plate, img, mask)
        d = ImageDraw.Draw(img, "RGBA")
        t = (f - TAG_START) / FPS
        for i, line in enumerate(TAG_LINES):
            s = typed(line, t - i * 0.7, 0.7)
            tw = d.textlength(line, font=FONT_TAG)
            d.text((W / 2 - tw / 2, 436 + i * 40), s, font=FONT_TAG, fill=(245, 240, 255, 255))
    enc.stdin.write(img.tobytes())
    f += 1
enc.stdin.close(); enc.wait()
print("frames", f)
