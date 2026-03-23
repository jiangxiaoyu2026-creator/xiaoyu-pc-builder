import os
import sys
import json
import time
import asyncio
from typing import List, Optional
from sqlmodel import Session, select, create_engine, or_

# Add parent directory to path to import server modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from server_py.models import Hardware
from server_py.services.ai_service import AiService
from server_py.db import engine

def enrich_hardware_batch(limit: int = 50, force: bool = False):
    """
    批量补全硬件信息（图片和参数）
    :param limit: 每次运行处理的数量上限
    :param force: 是否强制重刷已有数据的记录
    """
    print(f"🚀 开始执行硬件数据自动化补齐任务 (Limit: {limit}, Force: {force})")
    
    with Session(engine) as session:
        # 1. 筛选需要补全的对象
        if force:
            statement = select(Hardware).limit(limit)
        else:
            # 筛选图片缺失 或 参数为空/默认值 的记录
            statement = select(Hardware).where(
                or_(
                    Hardware.image == None,
                    Hardware.image == "",
                    Hardware.image.contains("bing.com"), # 之前自动生成的搜索链接也视为待优化项
                    Hardware.specs == {},
                    Hardware.specs == None
                )
            ).limit(limit)
        
        items = session.exec(statement).all()
        if not items:
            print("✅ 没有发现需要补全的硬件记录。")
            return

        print(f"📦 本次待处理记录数: {len(items)}")
        
        ai_service = AiService(session)
        success_count = 0
        fail_count = 0

        for idx, item in enumerate(items):
            print(f"[{idx+1}/{len(items)}] 正在处理: {item.brand} {item.model} ({item.category})")
            
            try:
                # --- 补全图片 ---
                if not item.image or "bing.com" in item.image or force:
                    print(f"  🔍 正在抓取图片...")
                    new_image = ai_service.suggest_image_url(item.brand, item.model)
                    if new_image and "http" in new_image:
                        item.image = new_image
                        item.imageSource = "ai_suggested"
                        print(f"  ✨ 图片已更新: {new_image[:50]}...")
                
                # --- 补全参数 ---
                if not item.specs or item.specs == {} or force:
                    print(f"  ⚙️ 正在生成技术参数...")
                    specs_json = ai_service.suggest_specs(item.category, item.brand, item.model)
                    if specs_json:
                        try:
                            item.specs = json.loads(specs_json)
                            item.specsSource = "ai_suggested"
                            print(f"  📝 参数已补全 ({len(item.specs)} 项)")
                        except:
                            print(f"  ⚠️ 参数 JSON 解析失败")
                
                session.add(item)
                session.commit()
                success_count += 1
                
                # 智能限频：避免触发 AI 接口并发限制
                time.sleep(0.5) 
                
            except Exception as e:
                print(f"  ❌ 处理失败: {str(e)}")
                session.rollback()
                fail_count += 1
        
        print(f"\n🏁 任务完成！成功: {success_count}, 失败: {fail_count}")

if __name__ == "__main__":
    # 可以通过命令行参数控制数量
    batch_limit = 20
    if len(sys.argv) > 1:
        batch_limit = int(sys.argv[1])
    
    enrich_hardware_batch(limit=batch_limit)
