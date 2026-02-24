import sys
import os
import json
from sqlmodel import Session, select

# 确保可以导入项目模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server_py.db import engine
from server_py.models import Hardware, Config

def check_json_data():
    errors = 0
    with Session(engine) as session:
        print("--- 检查 Hardware.specs ---")
        items = session.exec(select(Hardware)).all()
        for item in items:
            if isinstance(item.specs, str):
                try:
                    json.loads(item.specs)
                except Exception as e:
                    print(f"[错误] Hardware ID: {item.id}, Model: {item.model} - 并非有效 JSON: {item.specs}")
                    errors += 1
            else:
                print(f"[提示] Hardware ID: {item.id} 已经是 {type(item.specs)}")

        print("\n--- 检查 Config.items/tags/evaluation ---")
        configs = session.exec(select(Config)).all()
        for c in configs:
            for field in ['items', 'tags', 'evaluation']:
                val = getattr(c, field)
                if isinstance(val, str):
                    try:
                        json.loads(val)
                    except Exception as e:
                        print(f"[错误] Config ID: {c.id}, Field: {field} - 并非有效 JSON: {val}")
                        errors += 1
    
    if errors == 0:
        print("\n[成功] 所有 JSON 字段预检通过！可以安全进行架构升级。")
    else:
        print(f"\n[失败] 发现 {errors} 处数据格式错误，请先修复。")
    return errors

if __name__ == "__main__":
    sys.exit(check_json_data())
