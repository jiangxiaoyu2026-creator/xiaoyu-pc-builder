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
                # Relaxed tolerance (1.5x) to allow high-end parts in inventory even for tight budgets
                tolerance = 1.6 if cat in ['gpu', 'cpu'] else 1.4
                if item.price > (budget * max_ratio * tolerance): continue
                if item.price < (budget * min_ratio * 0.3): continue
                
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
                # Ensure specs is a dict
                specs = item.specs
                if isinstance(specs, str):
                    try: specs = json.loads(specs)
                    except: specs = {}
                
                # Inference helper (reusing logic from generator but for inventory prep)
                model_upper = item.model.upper()
                memory_type = specs.get('memoryType')
                socket = specs.get('socket')
                
                if not memory_type:
                    if 'DDR5' in model_upper or 'D5' in model_upper: memory_type = 'DDR5'
                    elif 'DDR4' in model_upper or 'D4' in model_upper: memory_type = 'DDR4'
                
                if item.category == 'mainboard' and not socket:
                    if any(chip in model_upper for chip in ['X870', 'B650', 'X670', 'A620']): socket = 'AM5'
                    elif any(chip in model_upper for chip in ['B550', 'X570', 'B450', 'A320']): socket = 'AM4'
                    elif any(chip in model_upper for chip in ['Z790', 'B760', 'Z690', 'B660']): socket = 'LGA1700'

                final_list.append({
                    "id": item.id,
                    "category": item.category,
                    "brand": item.brand,
                    "model": item.model,
                    "price": item.price,
                    "memoryType": memory_type, # Top level for AI clarity
                    "socket": socket,           # Top level for AI clarity
                    "specs": ", ".join(f"{k}: {v}" for k, v in specs.items() if v)
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
                        if hw:
                            hw_specs = self._get_inferred_specs(hw)
                            spec_str = f"({hw_specs.get('socket', '')}, {hw_specs.get('memoryType', '')})" if hw_specs else ""
                            comp_details.append(f"{cat}: {hw.brand} {hw.model} {spec_str}")
            
            refs.append({
                "title": c.title,
                "price": c.totalPrice,
                "tags": c.tags,
                "logic": "; ".join(comp_details) if comp_details else "通用搭配"
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
- 注意【推荐方案】可能使用旧型号或已下架产品，请在【库存清单】中寻找当前最合适的替代品。

**你的说话风格：**
{persona_text}

**你的配单策略：**
{strategy_text}

**⚠️ 兼容性指令（强制执行）：**
1. **核对 socket**：CPU 的 `socket` 必须与主板的 `socket` 完全一致。
2. **核对 memoryType**：主板的 `memoryType` 必须与内存的 `memoryType` 完全一致。如果不一致，优先保证主板，更换内存型号。
3. **核对功耗**：电源功率需留有冗余。

【库存清单】：
{json.dumps(inventory, ensure_ascii=False)}

【推荐参考方案】：
{json.dumps(references, ensure_ascii=False)}

输出严格 JSON 格式：
{{
  "items": {{ "cpu": "id", "mainboard": "id", "gpu": "id", "ram": "id", "disk": "id", "power": "id", "cooling": "id", "case": "id", "fan": "id", "monitor": "id" }},
  "totalPrice": (数字),
  "description": "200字配单思路。",
  "evaluation": {{ "score": 90, "verdict": "神评", "pros": [], "cons": [], "summary": "点评" }}
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
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            raw_result = json.loads(content)
            
            # --- 后端自动修正逻辑 (Auto-Fix) ---
            actual_total = 0
            resolved_items = {}
            if "items" in raw_result:
                # 1. 第一遍解析
                for cat, item_id in raw_result["items"].items():
                    if not item_id or not isinstance(item_id, str):
                        resolved_items[cat] = None
                        continue
                    
                    hw = self.session.get(Hardware, item_id)
                    if hw:
                        # 注入推断逻辑得到的 specs
                        hw.specs = self._get_inferred_specs(hw)
                        resolved_items[cat] = {
                            "id": hw.id, "category": hw.category, "brand": hw.brand, "model": hw.model, 
                            "price": hw.price, "specs": hw.specs, "image": hw.image
                        }
                    else:
                        resolved_items[cat] = None

                # 2. 兼容性校验与自动替换 (X870 + DDR4 终结者)
                cpu = resolved_items.get('cpu')
                mb = resolved_items.get('mainboard')
                ram = resolved_items.get('ram')
                
                # 检查插槽
                if cpu and mb and cpu['specs'].get('socket') != mb['specs'].get('socket'):
                    # 尝试寻找兼容当前主板的备选 CPU
                    alt_cpu = self._find_compatible_hardware('cpu', {'socket': mb['specs'].get('socket')}, budget*0.3)
                    if alt_cpu: 
                        resolved_items['cpu'] = alt_cpu
                        raw_result['description'] += " (注意：原选 CPU 接口不匹配，已自动更换为兼容型号)"

                # 检查内存 (用户主要痛点)
                if ram and mb and ram['specs'].get('memoryType') != mb['specs'].get('memoryType'):
                    # 尝试寻找兼容当前主板的备选内存
                    target_type = mb['specs'].get('memoryType')
                    alt_ram = self._find_compatible_hardware('ram', {'memoryType': target_type}, budget*0.1)
                    if alt_ram:
                        resolved_items['ram'] = alt_ram
                        raw_result['description'] += f" (注意：主板支持 {target_type}，已自动将内存更换为兼容型号)"

                # 重新计算总价
                actual_total = sum(i['price'] for i in resolved_items.values() if i)
                raw_result["items"] = resolved_items
                raw_result["totalPrice"] = actual_total
                
            return raw_result
            
        except Exception as e:
            print(f"LLM Error: {e}")
            raise e

    def _get_inferred_specs(self, hardware: Hardware) -> Dict:
        """Helper to get specs with name-based inference"""
        specs = hardware.specs
        if isinstance(specs, str):
            try: specs = json.loads(specs)
            except: specs = {}
        
        specs = {**specs}
        model_upper = hardware.model.upper()
        
        if not specs.get('memoryType'):
            if 'DDR5' in model_upper or 'D5' in model_upper: specs['memoryType'] = 'DDR5'
            elif 'DDR4' in model_upper or 'D4' in model_upper: specs['memoryType'] = 'DDR4'
        
        if hardware.category == 'mainboard' and not specs.get('socket'):
            if any(chip in model_upper for chip in ['X870', 'B650', 'X670', 'A620']): specs['socket'] = 'AM5'
            elif any(chip in model_upper for chip in ['B550', 'X570', 'B450', 'A320']): specs['socket'] = 'AM4'
            elif any(chip in model_upper for chip in ['Z790', 'B760', 'Z690', 'B660']): specs['socket'] = 'LGA1700'
        return specs

    def _find_compatible_hardware(self, category: str, criteria: Dict[str, Any], max_price: float) -> Optional[Dict]:
        """寻找满足特定条件的硬件"""
        # 获取所有该类别的激活硬件
        stmt = select(Hardware).where(Hardware.category == category, Hardware.status == "active")
        candidates = self.session.exec(stmt).all()
        
        eligible = []
        for cand in candidates:
            cand_specs = self._get_inferred_specs(cand)
            match = True
            for k, v in criteria.items():
                if cand_specs.get(k) != v:
                    match = False
                    break
            if match:
                eligible.append(cand)
        
        if not eligible: return None
        
        # 选个价格接近或低于 max_price 的
        eligible.sort(key=lambda x: abs(x.price - max_price))
        best = eligible[0]
        return {
            "id": best.id, "category": best.category, "brand": best.brand, "model": best.model, 
            "price": best.price, "specs": self._get_inferred_specs(best), "image": best.image
        }
