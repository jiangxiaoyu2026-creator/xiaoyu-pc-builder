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
        self.persona = "balanced"
        self.strategy = "balanced"
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
                    self.persona = config.get("persona", "balanced")
                    self.strategy = config.get("strategy", "balanced")
                    
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
        """
        ratios = {
            'gpu': (0.3, 0.5), 'cpu': (0.15, 0.3), 'mainboard': (0.08, 0.15),
            'ram': (0.05, 0.1), 'disk': (0.05, 0.1), 'power': (0.05, 0.1),
            'cooling': (0.03, 0.08), 'case': (0.03, 0.08)
        }
        
        statement = select(Hardware).where(Hardware.status == "active")
        all_hardware = self.session.exec(statement).all()
        
        categories = {}
        for item in all_hardware:
            cat = item.category
            if cat not in categories: categories[cat] = []
            
            if cat in ratios:
                min_ratio, max_ratio = ratios[cat]
                tolerance = 1.3 if cat in ['gpu', 'cpu'] else 1.1
                if item.price > (budget * max_ratio * tolerance): continue
                if item.price < (budget * min_ratio * 0.4): continue
                
            categories[cat].append(item)
            
        final_list = []
        for cat, items in categories.items():
            if not items:
                all_cat_items = [i for i in all_hardware if i.category == cat]
                all_cat_items.sort(key=lambda x: x.price)
                items = all_cat_items[:2]

            items.sort(key=lambda x: x.price)
            selected = items[::len(items)//8 + 1][:8] if len(items) > 8 else items
            
            for item in selected:
                # 架构升级后 item.specs 已经是 dict
                specs_text = ", ".join(f"{k}: {v}" for k, v in item.specs.items() if v) if isinstance(item.specs, dict) else str(item.specs)
                final_list.append({
                    "id": item.id,
                    "category": item.category,
                    "brand": item.brand,
                    "model": item.model,
                    "price": item.price,
                    "specs": specs_text
                })
        return final_list

    def find_reference_configs(self, budget: int, usage: str) -> List[Dict]:
        """
        寻找并解析相似的高质量社区配置，提取“装机逻辑”供 AI 学习。
        """
        min_price, max_price = budget * 0.8, budget * 1.2
        statement = select(Config).where(
            Config.status == "published",
            Config.isRecommended == True,
            Config.totalPrice >= min_price,
            Config.totalPrice <= max_price
        ).order_by(Config.likes.desc()).limit(3)
        
        configs = self.session.exec(statement).all()
        refs = []
        for c in configs:
            # 强化 RAG：提取推荐配置的核心硬件型号文字，让 AI 理解“搭配精髓”
            comp_details = []
            if isinstance(c.items, dict):
                for cat, item_id in c.items.items():
                    if item_id:
                        hw = self.session.get(Hardware, item_id)
                        if hw: comp_details.append(f"{cat}: {hw.brand} {hw.model}")
            
            refs.append({
                "title": c.title,
                "price": c.totalPrice,
                "tags": c.tags,
                "logic": ", ".join(comp_details) if comp_details else "通用搭配"
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
        
        # Build persona instruction
        persona_instructions = {
            'toxic': '你说话风格犀利毒舌，带有幽默讽刺感。敢于吐槽用户的不合理需求，但最终会给出靠谱方案。评价中大胆指出不足，不要说废话套话。',
            'professional': '你说话风格专业严谨，像一个资深硬件评测编辑。用数据和参数说话，给出客观冷静的分析。评价要有理有据。',
            'enthusiastic': '你说话风格热情活泼，像一个真心帮忙的朋友。多用感叹号和语气词，让用户感受到你的热心。评价积极正面但也要说真话。',
            'balanced': '你说话风格温和理性，用通俗易懂的语言解释专业内容。评价要公允中立，优缺点都要提到。'
        }
        
        strategy_instructions = {
            'performance': '配单策略：【性能至上】。在预算范围内最大化硬件性能，优先选择跑分更高、性能更强的配件。CPU和显卡占预算比例可以适当调高。',
            'budget': '配单策略：【极致省钱】。在满足基本需求的前提下尽可能压低总价。优先选择性价比高的型号，可以选择稍旧一代但性价比更高的配件。',
            'aesthetic': '配单策略：【颜值优先】。优先选择全白、RGB、海景房风格的配件。在预算允许的情况下选择外观设计出色的型号。',
            'balanced': '配单策略：【均衡配置】。在性能、价格、品牌和散热之间取得平衡。优先选择大品牌、口碑好的型号。'
        }
        
        persona_text = persona_instructions.get(self.persona, persona_instructions['balanced'])
        strategy_text = strategy_instructions.get(self.strategy, strategy_instructions['balanced'])
        
        system_prompt = f"""你是一个顶级的电脑装机大师（小鱼装机AI）。
你的任务是根据用户的需求，从【库存清单】中精准勾选硬件，组成一台电脑主机。

**重要学习任务：**
- 参考【推荐方案】中的搭配逻辑（例如 CPU 与显卡的档次比例、散热器的选择）。
- 注意【推荐方案】可能使用旧型号或已下架产品，请在【库存清单】中寻找当前最合适的替代品，保持配单的“灵魂”一致。

**你的说话风格：**
{persona_text}

**你的配单策略：**
{strategy_text}

**⚠️ 兼容性铁律（输出前请务必自检）：**
1. **接口匹配**：CPU 的 Socket 必须与主板一致。
2. **频率/类型匹配**：主板支持的内存类型（如 DDR4/DDR5）必须与内存条一致。
3. **功耗冗余**：电源额定功率必须大于 (CPU功耗 + 显卡功耗 + 100W) 的 1.2 倍。
4. **物理限制**：机箱必须能装下主板及其选定的散热器高度。

**⚠️ 预算与业务红线：**
1. **严格预算控制**：总价【绝对不能】超过用户预算 ({budget} 元)。
2. **价格真实性**：直接使用清单中的 `price`。
3. **ID 唯一性**：只能使用清单中的 `id`。

【库存清单】：
{json.dumps(inventory, ensure_ascii=False)}

【推荐参考方案】：
{json.dumps(references, ensure_ascii=False)}

输出严格 JSON 格式：
{{
  "items": {{ "cpu": "id", "mainboard": "id", "gpu": "id", "ram": "id", "disk": "id", "power": "id", "cooling": "id", "case": "id", "fan": "id", "monitor": "id" }},
  "totalPrice": (数字),
  "description": "200字配单心路历程，解释你如何参考推荐方案并结合当前预算做出的调整。",
  "evaluation": {{
    "score": (1-100),
    "verdict": "一句话神评",
    "pros": ["优点"],
    "cons": ["不足"],
    "summary": "专业点评。必须包含对兼容性（接口、功耗、散热）的确认。"
  }}
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
