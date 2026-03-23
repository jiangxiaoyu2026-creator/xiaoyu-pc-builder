import os
import sys
import json
import argparse
import time
from sqlmodel import Session, select, or_

# Add parent directory to path to import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server_py.db import engine
from server_py.models import Hardware, Setting
from server_py.services.ai_service import AiService

def batch_enrich(category=None, brand=None, model=None, limit=100, force_specs=False, force_images=False, skip_existing_images=True):
    with Session(engine) as session:
        ai_service = AiService(session)
        if not ai_service.client:
            print("错误：AI 服务未配置。请在后台‘系统设置’中配置 AI API Key。")
            return

        # 构建查询
        statement = select(Hardware)
        
        # 增加品牌和型号过滤
        if brand:
            statement = statement.where(Hardware.brand == brand)
        if model:
            statement = statement.where(Hardware.model == model)

        # 默认只查找缺数据的
        if not (brand or model or force_specs or force_images):
            # 默认只查找缺数据的
            conditions = []
            if not force_images:
                conditions.append(Hardware.image == None)
                conditions.append(Hardware.image == "")
            if not force_specs:
                conditions.append(Hardware.specs == "{}")
                conditions.append(Hardware.specs == "")
                conditions.append(Hardware.specs == None)
                conditions.append(Hardware.specsSource == "ai_suggested") # 允许重新覆盖 AI 建议的

            if conditions:
                statement = statement.where(or_(*conditions))
            
        if category and category != 'all':
            statement = statement.where(Hardware.category == category)
            
        statement = statement.limit(limit)
        products = session.exec(statement).all()

        if not products:
            print("没有找到需要补全的产品。")
            return

        print(f"开始批量补全 {len(products)} 个产品的数据...")
        
        success_count = 0
        for i, p in enumerate(products):
            print(f"[{i+1}/{len(products)}] 正在处理: {p.brand} {p.model} ({p.category})")
            
            updated = False
            
            # 1. 补全参数
            needs_specs = force_specs or p.specs in [None, "", "{}", "null"] or p.specsSource == 'ai_suggested'
            if needs_specs:
                print(f"  - 正在抓取参数...")
                suggested_specs = ai_service.suggest_specs(p.category, p.brand, p.model)
                if suggested_specs:
                    p.specs = suggested_specs
                    p.specsSource = 'ai_suggested'
                    updated = True
                    print(f"    [OK] 参数已生成")
            
            # 2. 补全图片
            needs_image = force_images or p.image in [None, "", "null"] or (not skip_existing_images and p.imageSource == 'ai_suggested')
            if needs_image:
                print(f"  - 正在获取图片...")
                url = ai_service.suggest_image_url(p.brand, p.model)
                if url:
                    p.image = url
                    p.imageSource = "ai_suggested"
                    updated = True
                    print(f"    [OK] 图片链接: {url[:50]}...")

            if updated:
                session.add(p)
                # 每处理一个保存一次，防止长时间运行崩溃丢失进度
                session.commit()
                success_count += 1
            
            # 适当留出呼吸时间，避免 API 限流
            time.sleep(1)

        print(f"\n批量处理完成！成功更新了 {success_count} 个产品。")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="小鱼装机 2.0：产品数据批量补全脚本")
    parser.add_argument("--category", type=str, default="all", help="指定分类 (如 cpu, gpu, mainboard)")
    parser.add_argument("--brand", type=str, default=None, help="指定品牌")
    parser.add_argument("--model", type=str, default=None, help="指定型号")
    parser.add_argument("--limit", type=int, default=50, help="处理数量限制 (默认 50)")
    parser.add_argument("--force-specs", action="store_true", help="强制更新所有产品的参数")
    parser.add_argument("--force-images", action="store_true", help="强制更新所有产品的图片")
    
    args = parser.parse_args()
    
    batch_enrich(
        category=args.category,
        brand=args.brand,
        model=args.model,
        limit=args.limit,
        force_specs=args.force_specs,
        force_images=args.force_images
    )
