import urllib.request
import os

icons = {
    'home': ('home', 'home'),
    'builder': ('motherboard', 'motherboard'),
    'data': ('bar-chart', 'bar-chart'),
    'recycle': ('recycle-sign', 'recycle-sign'),
    'user': ('user', 'user')
}

base_dir = '/Users/mac/new/miniprogram/src/assets/tabs'
os.makedirs(base_dir, exist_ok=True)

for name, (inactive_icon, active_icon) in icons.items():
    # Inactive: iOS outline style, 8E8E93 color
    url_inactive = f"https://img.icons8.com/ios/100/8E8E93/{inactive_icon}.png"
    # Active: iOS filled style, 0A84FF color
    url_active = f"https://img.icons8.com/ios-filled/100/0A84FF/{active_icon}.png"
    
    urllib.request.urlretrieve(url_inactive, f"{base_dir}/{name}.png")
    urllib.request.urlretrieve(url_active, f"{base_dir}/{name}-active.png")

print("Downloaded Apple-style icons.")
