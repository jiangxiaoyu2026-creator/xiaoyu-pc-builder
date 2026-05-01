import os
from PIL import Image

def compress_folder(folder_path, max_size=100):
    for filename in os.listdir(folder_path):
        if filename.endswith('.jpg') or filename.endswith('.png'):
            filepath = os.path.join(folder_path, filename)
            with Image.open(filepath) as img:
                img.thumbnail((max_size, max_size))
                if filename.endswith('.jpg'):
                    img.save(filepath, 'JPEG', quality=85, optimize=True)
                elif filename.endswith('.png'):
                    img.save(filepath, 'PNG', optimize=True)
            print(f"Compressed {filename}")

print("Compressing covers to max 100x100...")
compress_folder('public/images/games/covers', max_size=100)

print("Compressing icons to max 100x100...")
compress_folder('public/images/games/icons', max_size=100)

print("Compression finished.")
