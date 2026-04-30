import base64
import os

def create_pixel_svg(matrix, color="currentColor"):
    width = len(matrix[0])
    height = len(matrix)
    rects = []
    for y, row in enumerate(matrix):
        for x, char in enumerate(row):
            if char == '1':
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{color}"/>')
    
    svg_content = ''.join(rects)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" shape-rendering="crispEdges">{svg_content}</svg>'
    
    encoded = base64.b64encode(svg.encode('utf-8')).decode('utf-8')
    return f"data:image/svg+xml;base64,{encoded}"

# 12x12 Pixel Grids
icon_definitions = {
    "avatar": [
        "000011110000",
        "000111111000",
        "000110011000",
        "000111111000",
        "000011110000",
        "000001100000",
        "001111111100",
        "011111111110",
        "111100001111",
        "111000000111",
        "111000000111",
        "111111111111"
    ],
    "box": [
        "000000000000",
        "001111111100",
        "011111111110",
        "010001100010",
        "011111111110",
        "011000000110",
        "011000000110",
        "011000000110",
        "011111111110",
        "001111111100",
        "000000000000",
        "000000000000"
    ],
    "tool": [
        "000000001111",
        "000000011101",
        "000000011111",
        "000000111110",
        "000001100000",
        "000011000000",
        "000110000000",
        "001100000000",
        "011000000000",
        "111000000000",
        "110000000000",
        "000000000000"
    ],
    "recycle": [
        "000111111000",
        "001100001100",
        "011001100110",
        "010011110010",
        "010011110010",
        "010001100010",
        "010000000010",
        "011000000110",
        "001100001100",
        "000111111000",
        "000000000000",
        "000000000000"
    ],
    "chat": [
        "000000000000",
        "001111111100",
        "011111111110",
        "111000000111",
        "111000000111",
        "111000000111",
        "111111111111",
        "011111111110",
        "001111111000",
        "000111000000",
        "000010000000",
        "000000000000"
    ],
    "phone": [
        "000011110000",
        "000111111000",
        "001100001100",
        "011000000110",
        "110000000011",
        "110000000011",
        "110000000011",
        "110000000011",
        "011000000110",
        "001100001100",
        "000111111000",
        "000011110000"
    ],
    "search": [
        "000011110000",
        "000110011000",
        "001100001100",
        "001100001100",
        "000110011000",
        "000011110000",
        "000000011000",
        "000000001100",
        "000000000110",
        "000000000011",
        "000000000001",
        "000000000000"
    ],
    "empty": [
        "000000000000",
        "000111111000",
        "001100001100",
        "011000000110",
        "011111111110",
        "011001100110",
        "011111111110",
        "011000000110",
        "011000000110",
        "001111111100",
        "000000000000",
        "000000000000"
    ]
}

# Color variants: gray for default, primary for active
colors = {
    "white": "#FFFFFF",
    "gray": "#8E8E93",
    "primary": "#0A84FF"
}

output_ts = "/** Generated Pixel Icons */\n\nexport const PixelIcons = {\n"

for name, matrix in icon_definitions.items():
    output_ts += f"  {name}: {{\n"
    for cname, chex in colors.items():
        svg_base64 = create_pixel_svg(matrix, chex)
        output_ts += f"    {cname}: '{svg_base64}',\n"
    output_ts += "  },\n"

output_ts += "}\n"

with open("/Users/mac/new/miniprogram/src/utils/pixelIcons.ts", "w") as f:
    f.write(output_ts)

print("Icons generated at src/utils/pixelIcons.ts")
