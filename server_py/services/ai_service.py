import json
import random
from datetime import datetime, timedelta
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

    def retrieve_candidates(self, budget: int, usage: str, user_prompt: str = "") -> List[Dict]:
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
        
        # 提取用户可能点名的硬件
        user_prompt_lower = user_prompt.lower()
        import re
        # 提取用户输入中的“纯字母数字”片段作为强匹配因子
        prompt_segments = set(re.findall(r'[a-zA-Z0-9]{3,}', user_prompt_lower))
        
        forced_items = []
        for item in all_hardware:
            model_lower = item.model.lower()
            model_clean = model_lower.replace(" ", "").replace("-", "")
            brand_lower = item.brand.lower()
            
            # 1. 完整型号名包含匹配
            prompt_clean = user_prompt_lower.replace(" ", "").replace("-", "")
            if len(model_clean) > 4 and model_clean in prompt_clean:
                forced_items.append(item)
                continue
                
            # 2. 品牌匹配 + 关键型号匹配
            if brand_lower in user_prompt_lower or (len(brand_lower) > 2 and brand_lower in prompt_clean):
                # 提取型号中的数字或英文核心代号
                model_segments = re.findall(r'[a-zA-Z0-9]{3,}', model_lower)
                # 如果这些代号出现在用户的提示词中，则认为命中（比如 5600X, 4060, A520）
                if any(seg in user_prompt_lower for seg in model_segments):
                    forced_items.append(item)
                    continue
            
            # 3. 如果用户输入了极其具体的片段（如 Ti600），哪怕品牌没写对也算
            if any(seg in model_lower for seg in prompt_segments if len(seg) >= 4):
                forced_items.append(item)

        categories = {}
        for item in all_hardware:
            cat = item.category
            if cat not in categories: categories[cat] = []
            
            # 如果是用户点名的，直接跳过预算限制纳入候选
            if item in forced_items:
                categories[cat].append(item)
                continue
                
            if cat in ratios:
                min_ratio, max_ratio = ratios[cat]
                # 稍微放宽容差以支持更高预算
                tolerance = 1.8 if cat in ['gpu', 'cpu'] else 1.5
                if item.price > (budget * max_ratio * tolerance): continue
                if item.price < (budget * min_ratio * 0.2): continue
                
            categories[cat].append(item)
            
        final_list = []
        for cat, items in categories.items():
            if not items:
                all_cat_items = [i for i in all_hardware if i.category == cat]
                all_cat_items.sort(key=lambda x: x.price)
                items = all_cat_items[:2]

            # 分离出用户强制点名的和普通的
            forced_cat_items = []
            seen_ids = set()
            for i in items:
                if i in forced_items and i.id not in seen_ids:
                    forced_cat_items.append(i)
                    seen_ids.add(i.id)
            
            normal_cat_items = [i for i in items if i.id not in seen_ids]
            normal_cat_items.sort(key=lambda x: x.price)
            
            # 每个类别最多扩充到 12 个候选项，确保 AI 有得选
            spots_left = 12 - len(forced_cat_items)
            selected = forced_cat_items.copy()
            
            if spots_left > 0 and normal_cat_items:
                # 均匀采样
                step = max(1, len(normal_cat_items) // spots_left)
                sampled_normals = normal_cat_items[::step][:spots_left]
                selected.extend(sampled_normals)
            
            for item in selected:
                hw_specs = self._get_inferred_specs(item)
                final_list.append({
                    "id": item.id,
                    "category": item.category,
                    "brand": item.brand,
                    "model": item.model,
                    "price": item.price,
                    "memoryType": hw_specs.get('memoryType'),
                    "socket": hw_specs.get('socket'),
                    "specs": ", ".join(f"{k}: {v}" for k, v in hw_specs.items() if v and k not in ['memoryType', 'socket'])
                })
        return final_list

    def find_reference_configs(self, budget: int, user_prompt: str) -> Optional[Dict]:
        """
        寻找匹配的最佳单套神评配置作为模板
        """
        # 1. 标签映射
        mapped_tags = []
        prompt_lower = user_prompt.lower()
        if any(kw in prompt_lower for kw in ["实用", "便宜", "划算", "有限", "性价比"]):
            mapped_tags.extend(["性价比", "性价比策略"])
        if any(kw in prompt_lower for kw in ["小钢炮", "桌面台式机", "小主机", "占空间", "itx"]):
            mapped_tags.extend(["ITX", "办公"])
        if any(kw in prompt_lower for kw in ["生产力", "视频剪辑", "编程", "设计", "工作"]):
            mapped_tags.extend(["设计", "剪辑", "工作"])
        if any(kw in prompt_lower for kw in ["海景房", "好看", "发光", "白"]):
            mapped_tags.extend(["海景房", "白色"])

        min_price, max_price = budget * 0.7, budget * 1.3
        now = datetime.utcnow()
        one_year_ago = now - timedelta(days=365)
        
        statement = select(Config).where(
            Config.status == "published",
            Config.isRecommended == True,
            Config.totalPrice >= min_price,
            Config.totalPrice <= max_price,
            Config.createdAt >= one_year_ago
        ).order_by(Config.likes.desc()).limit(30)
        
        recent_configs = self.session.exec(statement).all()
        if not recent_configs:
            return None

        # 评分机制挑选最符合的模板
        best_config = None
        best_score = -1

        for c in recent_configs:
            score = c.likes
            config_text = f"{c.title} {c.tags}".lower()
            
            for tag in mapped_tags:
                if tag.lower() in config_text:
                    score += 50
            
            for word in user_prompt.split():
                if len(word) > 1 and word.lower() in config_text:
                    score += 30

            # 加上一个很小的随机数避免分数一模一样的时候总是固定的那个
            score += random.uniform(0, 5)

            if score > best_score:
                best_score = score
                best_config = c
                
        if not best_config:
            return None

        comp_details = []
        fan_count = 0
        if isinstance(best_config.items, dict):
            for cat, item_data in best_config.items.items():
                if cat == 'fan':
                    if isinstance(item_data, dict) and 'count' in item_data:
                        fan_count = item_data['count']
                    elif isinstance(item_data, list):
                        fan_count = sum(i.get('count', 1) if isinstance(i, dict) else 1 for i in item_data)

                item_id = item_data.get('id') if isinstance(item_data, dict) else item_data
                if item_id and isinstance(item_id, str):
                    hw = self.session.get(Hardware, item_id)
                    if hw:
                        hw_specs = self._get_inferred_specs(hw)
                        spec_str = f"({hw_specs.get('socket', '')}, {hw_specs.get('memoryType', '')})" if hw_specs else ""
                        comp_details.append(f"{cat}: {hw.brand} {hw.model} {spec_str}")
        
        return {
            "title": best_config.title,
            "price": best_config.totalPrice,
            "tags": best_config.tags,
            "logic": "; ".join(comp_details) if comp_details else "通用搭配",
            "fan_count": fan_count
        }

    def generate_build(self, user_prompt: str) -> Dict:
        if not self.client:
            return {"error": "AI Service not configured or disabled"}

        import re
        budget_match = re.search(r'(\d{4,6})', user_prompt)
        budget = int(budget_match.group(1)) if budget_match else 6000
        
        usage = 'gaming'
        if any(kw in user_prompt for kw in ["办公", "生产力", "剪辑", "设计", "代码"]): usage = 'work'
            
        inventory = self.retrieve_candidates(budget, usage)
        best_template = self.find_reference_configs(budget, user_prompt)
        
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
你的任务是根据用户的需求，从【库存清单】中精准挑选硬件，组成一台电脑主机。

**【当前配单匹配策略】：**
"""
        if best_template:
            system_prompt += f"""我已经在【高分配置广场】中找到了最符合用户需求的满分模板配置单：
模板名称：{best_template['title']}
骨架组合：{best_template['logic']}
模板风扇数：{best_template['fan_count']} 把。

**你必须将这套模板作为基础骨架（优先抄作业）：**
1. **最高优先级**：如果用户点名要求了具体的配件（哪怕只有一个），你**必须优先满足用户的点名**，而不是盲从模板（例如模板是13400F，用户点名5600X，你必须换成5600X）。
2. 如果模板中的某个配件在当前的【库存清单】中找不到原型号，请在库存中寻找同级别的平替。
3. 如果模板包含明确的风扇数量，请你在库存中选一款合适的机箱风扇并将数量设为 {best_template['fan_count']}。
4. **一致性检查**：你输出的 `description` 描述文字中提到的型号，必须和你 `items` JSON 字段中返回的 `id` 对应的型号**完全一致**。禁止说一套做一套！
"""
        else:
            system_prompt += "没有找到任何相似的完美模板，请遵循下方的【专家级装机规则】，自行从库存中搭配出最优解。"

        system_prompt += f"""

**你的说话风格：**
{persona_text}

**你的配单策略：**
{strategy_text}

**⚠️ 专家级装机指令（强制红线规则）：**
1. **基础兼容**：CPU 的 socket 必须与主板的 socket 匹配。主板支持 DDR4 就必须搭 DDR4 内存，DDR5 同理。
2. **严禁机械硬盘**：禁止使用机械硬盘(HDD)做系统主盘。预算 > 3000 元必须优先选择 1TB 及以上的 NVMe PCIe 固态硬盘(SSD)。
3. **电源冗余底线**：电源额定功率必须大于 `(CPU TDP功耗 + GPU TDP功耗) * 1.5 + 50W`，绝不选刚好压线的电源！不确定具体数值就往上多留 100W。
4. **散热器精准化**：中低端 CPU（如 i3/i5/i7非K/R5非X）强制首选【风冷散热器】以节省预算；只有遇到高端高发热 CPU（i7-K/i9/R9），或是客户明确要求“海景房/全白/必须上水冷”时，才可使用【240/360 水冷】。
5. **显示器去留**：默认情况**绝对不选显示器**(将 monitor 返回 null)。唯一的例外是用户在需求里明确说出“包含一台电脑屏幕”之类的需求。
6. **无条件服从点名**：如果客户在需求里明确点名了某个在【库存清单】中存在的硬件型号（如指定要“玩嘉 风琴 黑”机箱、“七彩虹 战斧5050”显卡或具体的内存主板等），你**必须100%原封不动地选用该库存硬件**，绝对不允许以任何理由（如性价比、品牌偏好、预算）替换成其他型号！哪怕搭配很奇怪也要按照用户的来！

【库存清单】：
{json.dumps(inventory, ensure_ascii=False)}

输出严格 JSON 格式：
{{
  "items": {{ "cpu": "id", "mainboard": "id", "gpu": "id", "ram": "id", "disk": "id", "power": "id", "cooling": "id", "case": "id", "fan": {{ "id": "fan_id_or_null", "count": 数字 }}, "monitor": "id_or_null" }},
  "totalPrice": (数字),
  "description": "200字配单详细思路。必须向用户解释清楚【为什么】这样选。如果用户有点名需求，请在描述开头明确表示‘已按照您的要求选择了XXX’。如果使用了配置广场的骨架，也提一嘴参考了高分作业。体现你的专业性。如果是为了兼容性做了自动替换（如主板插槽不匹配），也请详细说明。",
  "evaluation": {{ "score": 90, "verdict": "神评总结词", "pros": [], "cons": [], "summary": "一句话点评" }}
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
                for cat, item_data in raw_result["items"].items():
                    if not item_data:
                        resolved_items[cat] = None
                        continue
                        
                    item_id = item_data
                    fan_count = 1
                    
                    if cat == 'fan' and isinstance(item_data, dict):
                        item_id = item_data.get('id')
                        fan_count = item_data.get('count', 1)
                        
                    if not item_id or not isinstance(item_id, str):
                        resolved_items[cat] = None
                        continue

                    hw = self.session.get(Hardware, item_id)
                    if hw:
                        # 注入推断逻辑得到的 specs
                        hw.specs = self._get_inferred_specs(hw)
                        resolved_item = {
                            "id": hw.id, "category": hw.category, "brand": hw.brand, "model": hw.model, 
                            "price": hw.price, "specs": hw.specs, "image": hw.image
                        }
                        if cat == 'fan':
                            resolved_item['count'] = fan_count
                            resolved_item['price'] = hw.price * fan_count
                        resolved_items[cat] = resolved_item
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
        
        # 1. 插槽推断
        if hardware.category == 'mainboard' and not specs.get('socket'):
            if any(chip in model_upper for chip in ['X870', 'B650', 'X670', 'A620']): specs['socket'] = 'AM5'
            elif any(chip in model_upper for chip in ['B550', 'X570', 'B450', 'A520', 'A320']): specs['socket'] = 'AM4'
            elif any(chip in model_upper for chip in ['Z790', 'B760', 'Z690', 'B660', 'H610', 'Z590', 'B560', 'H510']): specs['socket'] = 'LGA1700'
            elif any(chip in model_upper for chip in ['Z490', 'B460', 'H410']): specs['socket'] = 'LGA1200'
        
        # 2. 内存类型推断
        if not specs.get('memoryType'):
            if 'DDR5' in model_upper or 'D5' in model_upper: specs['memoryType'] = 'DDR5'
            elif 'DDR4' in model_upper or 'D4' in model_upper: specs['memoryType'] = 'DDR4'
            elif hardware.category == 'mainboard':
                # 根据插槽兜底推断
                soc = specs.get('socket')
                if soc == 'AM5': specs['memoryType'] = 'DDR5'
                elif soc in ['AM4', 'LGA1200']: specs['memoryType'] = 'DDR4'
                # LGA1700 比较尴尬，既有 D4 也有 D5，如果不带 D5 标识通常默认为 D4 (或由具体品牌决定)
                elif soc == 'LGA1700' and 'D5' not in model_upper: specs['memoryType'] = 'DDR4'

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
                if not v: continue # 假如某项标准是 None，不参与强杀
                if cand_specs.get(k) != v:
                    match = False
                    break
            if match:
                eligible.append(cand)
        
        if not eligible: return None
        
        # 选个价格价格差距最小的
        eligible.sort(key=lambda x: abs(x.price - max_price))
        best = eligible[0]
        return {
            "id": best.id, "category": best.category, "brand": best.brand, "model": best.model, 
            "price": best.price, "specs": self._get_inferred_specs(best), "image": best.image
        }
