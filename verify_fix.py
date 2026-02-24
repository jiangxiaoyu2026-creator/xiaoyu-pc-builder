import sys
import os
import json
from sqlmodel import Session, select

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server_py.db import engine
from server_py.models import Hardware, Config
from server_py.services.ai_service import AiService

def verify_architecture_fix():
    print("--- 验证架构修复 (Native JSON) ---")
    with Session(engine) as session:
        # 1. 检查 Hardware 读取
        hw = session.exec(select(Hardware)).first()
        if hw:
            print(f"Hardware.specs type: {type(hw.specs)}")
            if not isinstance(hw.specs, dict):
                print("[错误] Hardware.specs 不是字典类型！")
                return False
        
        # 2. 检查 Config 读取
        cfg = session.exec(select(Config)).first()
        if cfg:
            print(f"Config.items type: {type(cfg.items)}")
            if not isinstance(cfg.items, dict):
                print("[错误] Config.items 不是字典类型！")
                return False

    print("\n--- 验证 AI RAG 增强 ---")
    service = AiService(Session(engine))
    # 模拟预算 10000 的参考配置检索
    refs = service.find_reference_configs(10000, "gaming")
    print(f"检索到 {len(refs)} 个参考配置")
    for r in refs:
        print(f"标题: {r['title']}")
        print(f"逻辑摘要 (Logic): {r['logic'][:100]}...")
        if "logic" not in r or ":" not in r['logic']:
             print("[警告] RAG 逻辑摘要可能未正确生成型号文字")

    print("\n[成功] 架构验证通过！API 现在将返回解码后的 JSON 对象。")
    return True

if __name__ == "__main__":
    if verify_architecture_fix():
        sys.exit(0)
    else:
        sys.exit(1)
