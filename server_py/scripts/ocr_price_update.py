"""
OCR 批量改价工具 (ocr_price_update.py)

功能：通过 AI 视觉识别（OCR）从截图/报价图片中提取产品价格，
      并批量更新数据库中对应产品的成本价（costPrice）。

使用方式：
  python3 -m server_py.scripts.ocr_price_update <图片文件路径> [--dry-run] [--profit-type percent] [--profit 15]

参数说明：
  image_path        报价单图片路径（支持 jpg/png/webp）
  --dry-run         仅预览识别结果，不写入数据库
  --profit-type     利润类型：percent（百分比）或 fixed（固定金额），默认 percent
  --profit          利润数值，默认 15（即 15%）
  --category        可选，限定只更新某类别（如 cpu, gpu）
  --force-price-update  跳过 30% 价格安全阈值（人工确认后使用）
"""

import os
import sys
import json
import base64
import argparse
from difflib import SequenceMatcher
from typing import Optional

# 确保可以在项目根目录下直接运行
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlmodel import Session, select
from server_py.models import Hardware
from server_py.db import engine
from server_py.models import Setting
from server_py.services.price_safety import PriceSafetyError, validate_price_change
from openai import OpenAI


def _get_ai_client(session: Session) -> Optional[OpenAI]:
    """从数据库中读取 AI 配置初始化 OpenAI 客户端"""
    setting = session.get(Setting, "aiSettings")
    if not setting:
        print("❌ 未找到 AI 配置，请在管理后台设置 AI Key。")
        return None
    try:
        config = json.loads(setting.value)
        if not config.get("enabled"):
            print("❌ AI 功能未启用。")
            return None
        api_key = config.get("apiKey")
        base_url = config.get("baseUrl", "https://api.deepseek.com")
        model = config.get("model", "deepseek-chat")
        if not api_key:
            print("❌ AI API Key 未配置。")
            return None
        return OpenAI(api_key=api_key, base_url=base_url), model
    except Exception as e:
        print(f"❌ AI 配置加载失败: {e}")
        return None, None


def _encode_image(image_path: str) -> str:
    """将图片文件转化成 base64 字符串"""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _extract_prices_via_ai(client: OpenAI, model: str, image_path: str) -> list:
    """
    调用 AI 视觉接口，从图片中识别品牌、型号和价格。
    返回格式：[{"brand": str, "model": str, "price": float, "confidence": str}, ...]
    """
    print(f"  ✨ 正在使用 AI 识别图片中的报价信息...")
    
    ext = image_path.lower().rsplit(".", 1)[-1]
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
    mime_type = mime_map.get(ext, "image/jpeg")
    
    image_base64 = _encode_image(image_path)
    
    system_prompt = """你是一个专业的硬件报价单识别助手。
请从图片中提取所有的硬件产品（CPU、显卡、主板、内存、固态硬盘等）的信息。
对于每一个识别到的产品，请提取其品牌、型号和价格（以人民币为单位的数字）。

**返回格式（严格 JSON 数组）：**
[
  {"brand": "英特尔", "model": "Core i5-13400F", "price": 899.0, "confidence": "high"},
  {"brand": "华硕", "model": "B760M-K", "price": 599.0, "confidence": "medium"}
]

**规则：**
- price 只保留数字，不含单位
- confidence 是你对这条识别的置信度：high/medium/low
- 如果无法识别，返回空数组 []
- 只返回 JSON，不要任何解释"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": system_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}
                        }
                    ]
                }
            ],
            max_tokens=2048,
            temperature=0.1
        )
        content = response.choices[0].message.content.strip()
        
        # 提取 JSON
        import re
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        return []
    except Exception as e:
        print(f"  ❌ AI 识别失败: {e}")
        return []


def _match_to_database(recognized: dict, products: list) -> Optional[Hardware]:
    """
    将识别结果与数据库产品进行模糊匹配，返回最佳候选。
    匹配逻辑：品牌 × 0.3 + 型号 × 0.7 的综合相似度。
    """
    brand_query = recognized.get("brand", "").lower()
    model_query = recognized.get("model", "").lower()
    
    best_product = None
    best_score = 0.0
    THRESHOLD = 0.55  # 综合匹配阈值
    
    for p in products:
        # 品牌相似度
        brand_sim = SequenceMatcher(None, brand_query, p.brand.lower()).ratio()
        # 型号相似度（重点）
        model_sim = SequenceMatcher(None, model_query, p.model.lower()).ratio()
        # 加权综合分
        score = brand_sim * 0.3 + model_sim * 0.7
        
        if score > best_score:
            best_score = score
            best_product = p
    
    if best_score >= THRESHOLD:
        return best_product, best_score
    return None, 0.0


def run_ocr_price_update(
    image_path: str,
    dry_run: bool = True,
    profit_type: str = "percent",
    profit_value: float = 15.0,
    category_filter: Optional[str] = None,
    force_price_update: bool = False
):
    """主函数"""
    if not os.path.exists(image_path):
        print(f"❌ 图片文件不存在: {image_path}")
        return
    
    print(f"\n{'🔍 [预览模式]' if dry_run else '✅ [执行模式]'} OCR 批量改价工具")
    print(f"  📷 图片: {image_path}")
    print(f"  💰 利润设置: {profit_type} / {profit_value}{'%' if profit_type == 'percent' else '元'}")
    if force_price_update:
        print("  ⚠️ 已开启强制价格写入，将跳过 30% 安全阈值")
    if category_filter:
        print(f"  🔧 仅更新分类: {category_filter}")
    print("-" * 60)

    with Session(engine) as session:
        client, model = _get_ai_client(session)
        if not client:
            return
        
        # Step 1: 查询数据库中的所有产品
        stmt = select(Hardware).where(Hardware.status == "active")
        if category_filter:
            stmt = stmt.where(Hardware.category == category_filter)
        all_products = session.exec(stmt).all()
        print(f"  📦 数据库中有效产品: {len(all_products)} 件\n")

        # Step 2: AI OCR 识别
        recognized_items = _extract_prices_via_ai(client, model, image_path)
        
        if not recognized_items:
            print("⚠️ 未能从图片中识别到任何产品信息。")
            return
        
        print(f"  🎯 AI 识别到 {len(recognized_items)} 条报价记录\n")
        
        # Step 3: 匹配 & 更新
        updated_count = 0
        skipped_count = 0
        
        for item in recognized_items:
            confidence = item.get("confidence", "low")
            brand = item.get("brand", "")
            model_name = item.get("model", "")
            new_cost = item.get("price")
            
            if not new_cost or new_cost <= 0:
                print(f"  ⚠️ 跳过 [{brand} {model_name}]：价格无效 ({new_cost})")
                skipped_count += 1
                continue
            
            matched, score = _match_to_database(item, all_products)
            
            if matched:
                # 计算新售价
                if profit_type == "percent":
                    new_price = new_cost * (1 + profit_value / 100)
                else:
                    new_price = new_cost + profit_value

                try:
                    validate_price_change(matched.price, new_price, force=force_price_update)
                except PriceSafetyError as e:
                    print(f"  ⚠️ 跳过 [{matched.brand} {matched.model}]：{e}")
                    skipped_count += 1
                    continue
                
                action_str = (
                    f"  ✅ [{confidence.upper()}] {brand} {model_name}\n"
                    f"     → 匹配: {matched.brand} {matched.model} (相似度: {score:.0%})\n"
                    f"     → 成本价: ¥{matched.costPrice or 0} => ¥{new_cost:.2f}\n"
                    f"     → 售  价: ¥{matched.price:.2f} => ¥{new_price:.2f}"
                )
                print(action_str)
                
                if not dry_run:
                    matched.costPrice = new_cost
                    matched.profitType = profit_type
                    matched.profitValue = profit_value
                    matched.price = round(new_price, 2)
                    session.add(matched)
                updated_count += 1
            else:
                print(f"  ❓ 未找到匹配件: 【{brand} {model_name}】 (¥{new_cost}) — 已跳过")
                skipped_count += 1
        
        # Step 4: 提交
        if not dry_run and updated_count > 0:
            session.commit()
            print(f"\n🏁 完成！已更新 {updated_count} 件，跳过 {skipped_count} 件。")
        else:
            print(f"\n{'🔍 预览完成（未写入数据库）' if dry_run else '⚡ 无更改'}")
            print(f"   匹配成功: {updated_count} 件  |  跳过: {skipped_count} 件")
            if dry_run:
                print("   如需实际写入，请去掉 --dry-run 参数重新运行。")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OCR 批量改价工具 - 从图片中识别价格并更新成本价")
    parser.add_argument("image_path", help="报价单图片路径")
    parser.add_argument("--dry-run", action="store_true", default=True, help="预览模式（默认开启）")
    parser.add_argument("--execute", action="store_true", help="实际执行写入数据库")
    parser.add_argument("--profit-type", choices=["percent", "fixed"], default="percent", help="利润类型")
    parser.add_argument("--profit", type=float, default=15.0, help="利润数值（百分比或固定金额）")
    parser.add_argument("--category", default=None, help="限定分类（如 cpu, gpu）")
    parser.add_argument("--force-price-update", action="store_true", help="跳过 30% 价格安全阈值")
    
    args = parser.parse_args()
    
    # --execute 会覆盖默认的 dry-run
    is_dry_run = not args.execute
    
    run_ocr_price_update(
        image_path=args.image_path,
        dry_run=is_dry_run,
        profit_type=args.profit_type,
        profit_value=args.profit,
        category_filter=args.category,
        force_price_update=args.force_price_update
    )
