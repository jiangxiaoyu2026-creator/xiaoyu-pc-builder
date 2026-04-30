import os
from PIL import Image
import shutil

src_dir = "/Users/mac/new/Gaming FPS_1"
dest_dir = "/Users/mac/new/public/images/games/icons"

# Ensure destination exists
os.makedirs(dest_dir, exist_ok=True)

# Mapping from raw filenames to system names (from scratch_copy_icons.py)
mapping = {
    "黑神话悟空.png": "黑神话：悟空.png",
    "赛博朋克.png": "赛博朋克 2077.png",
    "绝地求生.png": "绝地求生.png",
    "无畏契约 (1).png": "无畏契约.png",
    "CSGO.png": "反恐精英 2.png",
    "无畏契约 (2).png": "英雄联盟.png",
    "apex.png": "Apex 英雄.png",
    "荒野大镖客.png": "荒野大镖客：救赎 2.png",
    "三角洲行动.png": "三角洲行动.png",
    "DOTA2.png": "刀塔 2.png",
    "GTA5.png": "侠盗猎车手 5.png",
    "埃尔登法环.png": "艾尔登法环.png",
    "守望先锋2.png": "守望先锋 2.png",
    "使命召唤.png": "使命召唤：战区 2.0.png",
    "我的世界.png": "我的世界.png",
    "魔兽世界.png": "魔兽世界.png",
    "逃离塔克夫.png": "逃离塔科夫.png",
    "彩虹6号.png": "彩虹六号：围攻.png",
    "堡垒之夜.png": "堡垒之夜.png",
    "命运2.png": "命运 2.png",
    "修改图片尺寸 (6).png": "腐蚀.png",
    "火箭联盟.png": "火箭联盟.png"
}

MAX_SIZE = (256, 256)

print(f"Optimizing images from {src_dir} to {dest_dir}...")

optimized_count = 0
for src_name, target_name in mapping.items():
    src_path = os.path.join(src_dir, src_name)
    target_path = os.path.join(dest_dir, target_name)
    
    if os.path.exists(src_path):
        try:
            with Image.open(src_path) as img:
                # Convert to RGB if necessary (though icons are usually RGBA)
                # Keep original format (PNG) but resize
                img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
                img.save(target_path, "PNG", optimize=True)
                
                orig_size = os.path.getsize(src_path) / 1024
                new_size = os.path.getsize(target_path) / 1024
                print(f"✅ Optimized {src_name} -> {target_name} ({orig_size:.1f}KB -> {new_size:.1f}KB)")
                optimized_count += 1
        except Exception as e:
            print(f"❌ Error processing {src_name}: {e}")
    else:
        print(f"⚠️ Missing source file: {src_name}")

print(f"\nDone! Optimized {optimized_count} images.")
