#!/usr/bin/env python3
"""生成 81x81 极简苹果风格 Tab 图标 (PNG)"""

import struct, zlib, os

BASE = '/Users/mac/new/miniprogram/src/assets/tabs'
SIZE = 81  # 微信标准尺寸
STROKE = 2

def make_png(size, draw_func):
    """生成极简 RGBA PNG"""
    pixels = bytearray(size * size * 4)
    draw_func(pixels, size)
    
    # 构建 PNG
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    
    raw = b''
    for y in range(size):
        raw += b'\x00'  # filter none
        raw += bytes(pixels[y*size*4:(y+1)*size*4])
    
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    
    return header + ihdr + idat + iend

def set_px(pixels, size, x, y, r, g, b, a=255):
    if 0 <= x < size and 0 <= y < size:
        idx = (y * size + x) * 4
        pixels[idx] = r
        pixels[idx+1] = g
        pixels[idx+2] = b
        pixels[idx+3] = a

def draw_circle(pixels, size, cx, cy, radius, r, g, b, a=255, fill=False):
    for y in range(max(0, cy-radius-1), min(size, cy+radius+2)):
        for x in range(max(0, cx-radius-1), min(size, cx+radius+2)):
            dist = ((x-cx)**2 + (y-cy)**2) ** 0.5
            if fill:
                if dist <= radius + 0.5:
                    aa = min(255, max(0, int((radius + 0.5 - dist) * 255)))
                    set_px(pixels, size, x, y, r, g, b, min(a, aa))
            else:
                edge = abs(dist - radius)
                if edge < 1.2:
                    aa = min(255, max(0, int((1.2 - edge) * 255)))
                    set_px(pixels, size, x, y, r, g, b, min(a, aa))

def draw_rect(pixels, size, x1, y1, x2, y2, r, g, b, a=255, fill=False, radius=0):
    for y in range(max(0, y1), min(size, y2+1)):
        for x in range(max(0, x1), min(size, x2+1)):
            if radius > 0:
                # rounded corners
                corners = [(x1+radius, y1+radius), (x2-radius, y1+radius),
                           (x1+radius, y2-radius), (x2-radius, y2-radius)]
                in_corner = False
                for cx, cy in corners:
                    if (x < x1+radius or x > x2-radius) and (y < y1+radius or y > y2-radius):
                        dist = ((x-cx)**2 + (y-cy)**2) ** 0.5
                        if dist > radius + 0.5:
                            in_corner = True
                        elif not fill and dist > radius - 1.2:
                            aa = min(255, int((radius + 0.5 - dist) * 255))
                            set_px(pixels, size, x, y, r, g, b, min(a, aa))
                            in_corner = True
                if in_corner:
                    continue
            
            if fill:
                set_px(pixels, size, x, y, r, g, b, a)
            else:
                on_edge = (x <= x1+1 or x >= x2-1 or y <= y1+1 or y >= y2-1)
                if on_edge:
                    set_px(pixels, size, x, y, r, g, b, a)

def draw_line(pixels, size, x1, y1, x2, y2, r, g, b, a=255, thickness=2):
    steps = max(abs(x2-x1), abs(y2-y1), 1) * 2
    for i in range(steps+1):
        t = i / steps
        px = x1 + (x2-x1) * t
        py = y1 + (y2-y1) * t
        for dy in range(-thickness, thickness+1):
            for dx in range(-thickness, thickness+1):
                dist = (dx*dx + dy*dy) ** 0.5
                if dist <= thickness * 0.6:
                    ix, iy = int(px+dx), int(py+dy)
                    aa = min(255, max(0, int((thickness*0.6 - dist + 0.5) * 255)))
                    set_px(pixels, size, ix, iy, r, g, b, min(a, aa))

# ===== HOME: 简约小房子 =====
def draw_home(color):
    def draw(px, sz):
        r, g, b = color
        cx, cy = sz//2, sz//2
        m = sz // 6  # margin
        # 屋顶三角
        draw_line(px, sz, m+4, cy-2, cx, m+6, r, g, b)
        draw_line(px, sz, cx, m+6, sz-m-4, cy-2, r, g, b)
        # 房身
        bx1, by1 = m+10, cy-2
        bx2, by2 = sz-m-10, sz-m-6
        draw_line(px, sz, bx1, by1, bx1, by2, r, g, b)
        draw_line(px, sz, bx2, by1, bx2, by2, r, g, b)
        draw_line(px, sz, bx1, by2, bx2, by2, r, g, b)
        # 门
        dx1 = cx - 5
        dx2 = cx + 5
        draw_line(px, sz, dx1, by2, dx1, cy+6, r, g, b)
        draw_line(px, sz, dx2, by2, dx2, cy+6, r, g, b)
        draw_line(px, sz, dx1, cy+6, dx2, cy+6, r, g, b)
    return draw

# ===== BUILDER: CPU 芯片 =====
def draw_builder(color):
    def draw(px, sz):
        r, g, b = color
        m = sz // 5
        # 主方块
        draw_rect(px, sz, m+2, m+2, sz-m-2, sz-m-2, r, g, b, radius=4)
        # 内核
        im = m + 10
        draw_rect(px, sz, im, im, sz-im, sz-im, r, g, b, radius=2)
        # 引脚 (上下左右各2条短线)
        pins_h = [sz//3, sz*2//3]
        for p in pins_h:
            draw_line(px, sz, p, m-4, p, m+2, r, g, b, 1)
            draw_line(px, sz, p, sz-m-2, p, sz-m+4, r, g, b, 1)
        pins_v = [sz//3, sz*2//3]
        for p in pins_v:
            draw_line(px, sz, m-4, p, m+2, p, r, g, b, 1)
            draw_line(px, sz, sz-m-2, p, sz-m+4, p, r, g, b, 1)
    return draw

# ===== DATA: 柱状图 =====
def draw_data(color):
    def draw(px, sz):
        r, g, b = color
        m = sz // 5
        bottom = sz - m
        # 三根柱子
        bw = 8  # bar width
        bars = [(sz//4-2, 0.4), (sz//2, 0.7), (sz*3//4+2, 0.5)]
        for bx, h in bars:
            top = int(bottom - (bottom - m) * h)
            draw_rect(px, sz, bx-bw//2, top, bx+bw//2, bottom, r, g, b, fill=True, radius=2)
        # 底线
        draw_line(px, sz, m-2, bottom+1, sz-m+2, bottom+1, r, g, b, 1)
    return draw

# ===== RECYCLE: 循环箭头 =====
def draw_recycle(color):
    def draw(px, sz):
        r, g, b = color
        cx, cy = sz//2, sz//2
        rad = sz//3
        import math
        # 画弧线 (3段)
        for seg in range(3):
            start = seg * 2.094 - 0.5  # 120° segments
            end = start + 1.6
            steps = 40
            for i in range(steps):
                t = start + (end-start) * i / steps
                x = int(cx + rad * math.cos(t))
                y = int(cy + rad * math.sin(t))
                set_px(px, sz, x, y, r, g, b)
                set_px(px, sz, x+1, y, r, g, b)
                set_px(px, sz, x, y+1, r, g, b)
            # 箭头
            ex = cx + rad * math.cos(end)
            ey = cy + rad * math.sin(end)
            a1 = end + 2.3
            a2 = end + 0.8
            ax1 = int(ex + 6 * math.cos(a1))
            ay1 = int(ey + 6 * math.sin(a1))
            ax2 = int(ex + 6 * math.cos(a2))
            ay2 = int(ey + 6 * math.sin(a2))
            draw_line(px, sz, int(ex), int(ey), ax1, ay1, r, g, b, 1)
            draw_line(px, sz, int(ex), int(ey), ax2, ay2, r, g, b, 1)
    return draw

# ===== USER: 人形 =====
def draw_user(color):
    def draw(px, sz):
        r, g, b = color
        cx = sz // 2
        # 头
        draw_circle(px, sz, cx, sz//3-2, 10, r, g, b)
        # 身体弧
        import math
        body_y = sz//3 + 14
        body_r = sz//3 + 2
        for angle_d in range(-70, 71):
            angle = math.radians(angle_d)
            x = int(cx + body_r * math.sin(angle))
            y = int(body_y + body_r * (1 - math.cos(angle)) * 0.55)
            if y < sz - sz//6:
                set_px(px, sz, x, y, r, g, b)
                set_px(px, sz, x+1, y, r, g, b)
                set_px(px, sz, x, y+1, r, g, b)
    return draw

# 颜色
INACTIVE = (142, 142, 147)   # #8E8E93
ACTIVE = (10, 132, 255)      # #0A84FF

icons = {
    'home': draw_home,
    'builder': draw_builder,
    'data': draw_data,
    'recycle': draw_recycle,
    'user': draw_user,
}

os.makedirs(BASE, exist_ok=True)

for name, draw_fn in icons.items():
    # Inactive
    png = make_png(SIZE, draw_fn(INACTIVE))
    with open(f'{BASE}/{name}.png', 'wb') as f:
        f.write(png)
    # Active
    png = make_png(SIZE, draw_fn(ACTIVE))
    with open(f'{BASE}/{name}-active.png', 'wb') as f:
        f.write(png)
    print(f'  ✓ {name}.png + {name}-active.png')

print('Done! 10 icons generated at 81x81.')
