#!/usr/bin/env python3
"""测试脚本：检查路由是否正确注册"""

import sys
sys.path.insert(0, '.')

from main import app

print("=== 已注册的路由 ===")
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        print(f"{route.methods} {route.path}")
