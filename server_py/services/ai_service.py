import json
import random
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select, col
from ..models import Hardware, Config, Setting, ChatSettings
from ..db import engine
from openai import OpenAI
import os

class AiService:
    def __init__(self, session: Session):
        self.session = session
        self.client = None
        self.model = "gpt-3.5-turbo"
        self._init_client()

    def _init_client(self):
        # Load AI settings from DB
        setting = self.session.get(Setting, "aiSettings")
        if setting:
            try:
                config = json.loads(setting.value)
                if config.get("enabled"):
                    api_key = config.get("apiKey")
                    base_url = config.get("baseUrl")
                    self.model = config.get("model", "deepseek-chat")
                    
                    if api_key:
                        self.client = OpenAI(
                            api_key=api_key,
                            base_url=base_url if base_url else "https://api.deepseek.com"
                        )
            except Exception as e:
                print(f"Error loading AI settings: {e}")

    def retrieve_candidates(self, budget: int, usage: str) -> List[Dict]:
        """
        根据预算和用途从数据库中检索相关的硬件候选列表。
        收缩过滤范围，防止 AI 选择超出预算过多的硬件。
        """
        # 硬件预算比例分配参考
        ratios = {
            'gpu': (0.3, 0.5), # 显卡占比 30%-50%
            'cpu': (0.15, 0.3), # CPU 占比 15%-30%
            'mainboard': (0.08, 0.15),
            'ram': (0.05, 0.1),
            'disk': (0.05, 0.1),
            'power': (0.05, 0.1),
            'cooling': (0.03, 0.08),
            'case': (0.03, 0.08)
        }
        
        # 获取所有上架硬件
        statement = select(Hardware).where(Hardware.status == "active")
        all_hardware = self.session.exec(statement).all()
        
        candidates = []
        categories = {}
        for item in all_hardware:
            cat = item.category
            if cat not in categories: categories[cat] = []
            
            # 根据比例初步过滤，允许一定的上下浮动
            if cat in ratios:
                min_ratio, max_ratio = ratios[cat]
                tolerance = 1.3 if cat in ['gpu', 'cpu'] else 1.1
                if item.price > (budget * max_ratio * tolerance):
                    continue
                if item.price < (budget * min_ratio * 0.4):
                    continue
                
            categories[cat].append(item)
            
        final_list = []
        for cat, items in categories.items():
            # 兜底逻辑：如果该类别过滤后为空，则提供该类别最便宜的 2 个硬件
            if not items:
                all_cat_items = [i for i in all_hardware if i.category == cat]
                all_cat_items.sort(key=lambda x: x.price)
                items = all_cat_items[:2]

            items.sort(key=lambda x: x.price)
            # 每个类别最多提供 8 个候选，涵盖不同价位段
            if len(items) > 8:
                step = len(items) // 8
                selected = [items[i] for i in range(0, len(items), step)][:8]
            else:
                selected = items
            
            for item in selected:
                final_list.append({
                    "id": item.id,
                    "category": item.category,
                    "brand": item.brand,
                    "model": item.model,
                    "price": item.price,
                    "specs": item.specs
                })
                
        return final_list

    def find_reference_configs(self, budget: int, usage: str) -> List[Dict]:
        """
        寻找相似的高质量社区配置。
        """
        min_price = budget * 0.8
        max_price = budget * 1.2
        
        statement = select(Config).where(
            Config.status == "published",
            Config.isRecommended == True,
            Config.totalPrice >= min_price,
            Config.totalPrice <= max_price
        ).order_by(Config.likes.desc()).limit(3)
        
        configs = self.session.exec(statement).all()
        
        refs = []
        for c in configs:
            refs.append({
                "title": c.title,
                "price": c.totalPrice,
                "components": c.items
            })
        return refs

    def generate_build(self, user_prompt: str) -> Dict:
        if not self.client:
            return {"error": "AI Service not configured or disabled"}

        import re
        budget_match = re.search(r'(\d{4,6})', user_prompt)
        budget = int(budget_match.group(1)) if budget_match else 6000
        
        usage = 'gaming'
        if any(kw in user_prompt for kw in ["办公", "生产力", "剪辑", "设计", "代码"]): usage = 'work'
            
        inventory = self.retrieve_candidates(budget, usage)
        references = self.find_reference_configs(budget, usage)
        
        system_prompt = f"""你是一个顶级的电脑装机大师（小鱼装机AI）。
你的任务是根据用户的需求，从【库存清单】中精准勾选硬件，组成一台电脑主机。

**⚠️ 极其重要的铁律：**
1. **严格预算控制**：总价【绝对不能】超过用户预算的 100%（即 {budget} 元）。除非你能在说明中给出极强的理由（如大幅提升性能），但即便如此也严禁超过 {budget * 1.1} 元。
2. **价格真实性**：必须直接使用【库存清单】中给出的 `price` 进行计算。严禁自己编造或假设价格。
3. **计算准确性**：你必须在回复前仔细心算所有配件的总价。如果你的 JSON 中 `totalPrice` 与配件单价之和不符，系统会报错。
4. **ID 唯一性**：只能使用清单中的 `id`。
5. **硬件完整性**：必须包含 CPU、主板、显卡、内存、硬盘、电源、散热、机箱。

【库存清单】：
{json.dumps(inventory, ensure_ascii=False)}

【参考方案】：
{json.dumps(references, ensure_ascii=False)}

输出格式：
严格输出 JSON 格式（不要包含 markdown 代码块）：
{{
  "items": {{
    "cpu": "id",
    "mainboard": "id",
    "gpu": "id",
    "ram": "id",
    "disk": "id",
    "power": "id",
    "cooling": "id",
    "case": "id",
    "fan": "id (可选)",
    "monitor": "id (可选)"
  }},
  "totalPrice": (所有 items 真实单价之和),
  "description": "配置分析文案。"
}}
"""

        user_msg = f"用户需求：{user_prompt}\n预算上限：{budget} 元"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                temperature=0.3, # 降低随机性，提高逻辑严谨性
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            raw_result = json.loads(content)
            
            # 强制后端核算价格，不信 AI 的口算
            actual_total = 0
            resolved_items = {}
            if "items" in raw_result:
                for cat, item_id in raw_result["items"].items():
                    if not item_id or not isinstance(item_id, str):
                        resolved_items[cat] = None
                        continue
                        
                    hardware = self.session.get(Hardware, item_id)
                    if hardware:
                        actual_total += hardware.price
                        resolved_items[cat] = {
                            "id": hardware.id,
                            "category": hardware.category,
                            "brand": hardware.brand,
                            "model": hardware.model,
                            "price": hardware.price,
                            "specs": hardware.specs,
                            "image": hardware.image,
                            "status": hardware.status,
                            "isRecommended": hardware.isRecommended,
                            "isDiscount": hardware.isDiscount,
                            "isNew": hardware.isNew
                        }
                    else:
                        resolved_items[cat] = None
                
                raw_result["items"] = resolved_items
                raw_result["totalPrice"] = actual_total
                
            return raw_result
            
        except Exception as e:
            print(f"LLM Error: {e}")
            raise e
