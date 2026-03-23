import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select, col
from server_py.models import Hardware, Config, Setting, ChatSettings
from server_py.db import engine
from openai import OpenAI
import os

class AiService:
    def __init__(self, session: Session):
        from server_py.models import User # Added import here for convenience or at top
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
        
        # 仅检索已激活且属于核心类别的硬件，避免全表扫描
        target_categories = list(ratios.keys())
        statement = select(Hardware).where(
            Hardware.status == "active",
            Hardware.category.in_(target_categories)
        )
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
            
            # 每个类别最多扩充到 15 个候选项，确保 AI 有得选
            spots_left = 15 - len(forced_cat_items)
            selected = forced_cat_items.copy()
            
            if spots_left > 0 and normal_cat_items:
                # 均匀采样
                step = max(1, len(normal_cat_items) // spots_left)
                sampled_normals = normal_cat_items[::step][:spots_left]
                selected.extend(sampled_normals)
            
            for item in selected:
                hw_specs = self._get_inferred_specs(item)
                # 补充物理尺寸参数用于兼容性校验
                important_keys = ['memoryType', 'socket', 'formFactor', 'maxGpuLength', 'maxCoolerHeight', 'length', 'height']
                final_list.append({
                    "id": item.id,
                    "category": item.category,
                    "brand": item.brand,
                    "model": item.model,
                    "price": item.price,
                    "memoryType": hw_specs.get('memoryType'),
                    "socket": hw_specs.get('socket'),
                    "formFactor": hw_specs.get('formFactor'),
                    "maxGpuLength": hw_specs.get('maxGpuLength'),
                    "maxCoolerHeight": hw_specs.get('maxCoolerHeight'),
                    "length": hw_specs.get('length'),
                    "height": hw_specs.get('height'),
                    "specs": ", ".join(f"{k}: {v}" for k, v in hw_specs.items() if v and k not in important_keys)
                })
        return final_list

    def find_reference_configs(self, budget: int, user_prompt: str) -> tuple:
        from ..models import User
        """
        寻找匹配的最佳单套配置作为模板（包含推荐配置和主播配置）
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
        if any(kw in prompt_lower for kw in ["游戏", "吃鸡", "fps", "帧数"]):
            mapped_tags.extend(["游戏", "电竞"])

        min_price, max_price = budget * 0.7, budget * 1.3
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        # 2. 查询范围扩大：同时包含官方推荐配置 + 主播用户发布的配置
        # 第一优先级：官方推荐配置（最近30天内）
        stmt_recommended = select(Config, User.role).join(User, Config.userId == User.id, isouter=True).where(
            Config.status == "published",
            Config.isRecommended == True,
            Config.totalPrice >= min_price,
            Config.totalPrice <= max_price,
            Config.createdAt >= thirty_days_ago
        ).order_by(Config.likes.desc()).limit(30)
        recommended_results = self.session.exec(stmt_recommended).all()

        # 第二优先级：主播(streamer)角色用户的配置（最近30天内）
        from sqlmodel import or_
        stmt_streamer = select(Config, User.role).join(User, Config.userId == User.id).where(
            Config.status == "published",
            Config.totalPrice >= min_price,
            Config.totalPrice <= max_price,
            Config.createdAt >= thirty_days_ago,
            User.role == "streamer"
        ).order_by(Config.likes.desc()).limit(20)
        streamer_results = self.session.exec(stmt_streamer).all()
        
        # 合并候选，去重并记录 role
        seen_ids = set()
        all_candidates = []
        config_roles = {} # Map config.id -> authorRole
        
        for c, role in recommended_results:
            if c.id not in seen_ids:
                seen_ids.add(c.id)
                all_candidates.append(c)
                config_roles[c.id] = role or 'admin'
        
        for c, role in streamer_results:
            if c.id not in seen_ids:
                seen_ids.add(c.id)
                all_candidates.append(c)
                config_roles[c.id] = role or 'user'

        if not all_candidates:
            return None, 'admin'

        # 评分机制挑选最符合的模板
        best_config = None
        best_score = -1

        for c in all_candidates:
            score = c.likes * 2  # 点赞权重加倍  
            config_text = f"{c.title} {c.tags} {c.description or ''}".lower()

            # 官方推荐配置额外加分
            if c.isRecommended:
                score += 80
            # 主播配置额外加分
            if config_roles.get(c.id) == 'streamer':
                score += 60

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
            return None, 'admin'
        
        role = config_roles.get(best_config.id, 'admin')

        # 解析配置骨架
        comp_details = []
        fan_count = 0
        config_items = best_config.items
        if isinstance(config_items, str):
            try:
                config_items = json.loads(config_items)
            except:
                config_items = {}
        if isinstance(config_items, dict):
            for cat, item_data in config_items.items():
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

        source_label = "主播推荐配置" if role == 'streamer' else "官方推荐配置"
        
        result_metadata = {
            "title": best_config.title,
            "price": best_config.totalPrice,
            "tags": best_config.tags,
            "logic": "; ".join(comp_details) if comp_details else "通用搭配",
            "fan_count": fan_count,
            "source": source_label,
            "author": best_config.userName or ""
        }
        
        return result_metadata, role

    def generate_build(self, user_prompt: str) -> Dict:
        if not self.client:
            return {"error": "AI Service not configured or disabled"}

        import re
        budget_match = re.search(r'(\d{4,6})', user_prompt)
        budget = int(budget_match.group(1)) if budget_match else 6000
        
        usage = 'gaming'
        if any(kw in user_prompt for kw in ["办公", "生产力", "剪辑", "设计", "代码"]): usage = 'work'
            
        inventory = self.retrieve_candidates(budget, usage)
        best_template_data = self.find_reference_configs(budget, user_prompt)
        best_template, template_role = best_template_data if best_template_data else (None, 'admin')
        
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
**最高优先级绝对红线：无条件服从点名！** 如果客户在需求里明确点名了某个在【库存清单】中存在的硬件型号（如指定要“玩嘉 风琴 黑”机箱、“七彩虹 战斧5050”显卡或具体的内存主板等），你**必须100%原封不动地选用该库存硬件**，绝对不允许以任何理由（如性价比、品牌偏好、预算）替换成其他型号！哪怕搭配很奇怪也要按照用户的来！

"""
        if best_template:
            system_prompt += f"""除用户强制点名的配件外，我已经在【高级装机库】中找到了最符合用户需求的满分模板配置单：
模板来源：{best_template['source']} ({best_template['author']})
模板名称：{best_template['title']}
骨架组合：{best_template['logic']}
模板风扇数：{best_template['fan_count']} 把。

**你必须将这套模板作为基础骨架（优先抄作业）：**
1. **最高优先级冲突解决**：你的首要任务是满足用户点名的配件。只有在用户没有点名该部位配件时，才去参考这个模板！如果模板是13400F，用户点名5600X，你必须换成5600X。
2. 平替寻找：如果模板中的某个配件在当前的【库存清单】中找不到原型号，请在库存中寻找同级别的平替。
3. 补全风扇：如果模板包含明确的风扇数量，请你在库存中选一款合适的机箱风扇并将数量设为 {best_template['fan_count']}。
4. **一致性检查**：你输出的 `description` 描述文字中提到的型号，必须和你 `items` JSON 字段中返回的 `id` 对应的型号**完全一致**。禁止说一套做一套！
"""
        else:
            system_prompt += "没有找到任何相似的完美模板，请遵循下方的【专家级装机规则】，在满足用户点名配件的前提下，自行从库存中搭配出最优解。"

        system_prompt += f"""

**你的说话风格：**
{persona_text}

**你的配单策略：**
{strategy_text}

**⚠️ 专家级装机指令（强制红线规则）：**
1. **精准解读客户配置单**：客户的发文可能是一段杂乱且连词成句的配件清单文本（如："CPUi5-14600kf盒装 主板华硕重炮手IID5显卡万丽5070硬盘宏碁GM71T..."）。你需要极其敏锐地拆解出每一项配件的真实型号，并在【库存清单】中寻找最匹配的商品。如果客户给的型号在库存中实在找不到，请寻找同级别平替，并在 description 中向客户说明。
2. **基础兼容**：CPU 的 socket 必须与主板的 socket 匹配。主板支持 DDR4 就必须搭 DDR4 内存，DDR5 同理。
3. **物理尺寸兼容（极度重要）**：
   - **主板与机箱**：ATX 主板绝对不能装进只支持 M-ATX/ITX 的机箱！如果主板是 ATX (formFactor)，机箱必须支持 ATX。如果机箱只写了 M-ATX，则不能选 ATX 主板。
   - **显卡限长**：显卡的 length (如 336mm) 绝对不能大于机箱的 maxGpuLength (如 330mm)！
   - **风冷限高**：风冷散热器的 height (如 165mm) 绝对不能大于机箱的 maxCoolerHeight (如 160mm)！
4. **严禁机械硬盘**：禁止使用机械硬盘(HDD)做系统主盘。预算 > 3000 元必须优先选择 1TB 及以上的 NVMe PCIe 固态硬盘(SSD)。
5. **电源冗余底线**：电源额定功率必须大于 `(CPU TDP功耗 + GPU TDP功耗) * 1.5 + 50W`，绝不选刚好压线的电源！不确定具体数值就往上多留 100W。
6. **散热器精准化**：中低端 CPU（如 i3/i5/i7非K/R5非X）强制首选【风冷散热器】以节省预算；只有遇到高端高发热 CPU（i7-K/i9/R9），或是客户明确要求“海景房/全白/必须上水冷”时，才可使用【240/360 水冷】。
7. **显示器去留**：默认情况**绝对不选显示器**(将 monitor 返回 null)。唯一的例外是用户在需求里明确说出“包含一台电脑屏幕”之类的需求。

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
                response_format={"type": "json_object"},
                timeout=60.0
            )
        except Exception as e:
            # Handle timeout specifically for OpenAI
            if "timeout" in str(e).lower():
                print(f"ERROR: AI Timeout after 60s. Query: {user_prompt[:50]}...")
                raise Exception("AI Error: 云端算力节点响应超时（60s），请稍后再试。")
            raise e
            
        content = response.choices[0].message.content
        print(f"DEBUG: AI Output: {content[:200]}...") # Log start of output
            
        raw_result = None
        try:
            raw_result = json.loads(content)
        except json.JSONDecodeError:
                import re
                # Try Markdown code block first
                json_match = re.search(r"```(?:json)?\s*(.*?)\s*```", content, re.DOTALL)
                if json_match:
                    try:
                        raw_result = json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        pass
                
                # If still failed, try raw curly brace extraction
                if not raw_result:
                    json_match = re.search(r"(\{.*\})", content, re.DOTALL)
                    if json_match:
                        try:
                            raw_result = json.loads(json_match.group(1))
                        except json.JSONDecodeError:
                            pass
            
        if not raw_result:
            print(f"ERROR: Failed to parse JSON from AI. Raw content: {content}")
            raise Exception("AI Error: Failed to parse LLM output as JSON.")
            
            
        # --- 后端自动修正逻辑 (Auto-Fix) ---
        actual_total = 0
        resolved_items = {}
        
        # Ensure description exists
        if "description" not in raw_result:
            raw_result["description"] = "配置详情生成中..."
            
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
                    raw_result['description'] = raw_result.get('description', '') + f" (注意：主板支持 {target_type}，已自动将内存更换为兼容型号)"

            # --- 物理尺寸兼容性硬校验 ---
            case_item = resolved_items.get('case')
            if case_item:
                c_specs = case_item['specs']
                desc_appends = []

                # 1. 主板板型校验
                if mb:
                    mb_ff = mb['specs'].get('formFactor', '').upper()
                    case_ff = c_specs.get('formFactor', '').upper()
                    # 简化逻辑：如果主板是ATX，但机箱规格里没有明确写支持ATX（比如只写了M-ATX/ITX），则换机箱
                    if 'ATX' in mb_ff and 'M-ATX' not in mb_ff and 'MICRO' not in mb_ff: 
                        if case_ff and 'ATX' not in case_ff.replace('M-ATX', '').replace('MICRO-ATX', ''):
                            # 主板太大，尝试换兼容的大机箱
                            alt_case = self._find_compatible_hardware('case', {}, case_item['price'] * 1.2) # 只要是别的机箱就行，后端查找逻辑尽量放宽
                            if alt_case:
                                resolved_items['case'] = alt_case
                                desc_appends.append("主板板型较大，已自动更换为空间更充裕的机箱")
                                case_item = alt_case
                                c_specs = alt_case['specs']

                # 2. 显卡限长校验
                gpu = resolved_items.get('gpu')
                if gpu and gpu['specs'].get('length') and c_specs.get('maxGpuLength'):
                    import re
                    try:
                        g_len = float(re.search(r'\d+', str(gpu['specs']['length'])).group())
                        c_max_g = float(re.search(r'\d+', str(c_specs['maxGpuLength'])).group())
                        if g_len > c_max_g:
                            alt_case = self._find_compatible_hardware('case', {}, case_item['price'] * 1.2)
                            if alt_case:
                                resolved_items['case'] = alt_case
                                desc_appends.append(f"显卡长度({g_len}mm)超出原机箱限长，已自动更换大机箱")
                                case_item = alt_case
                                c_specs = alt_case['specs']
                    except Exception:
                        pass # 无法解析数字就算了

                # 3. 散热限高校验
                cooler = resolved_items.get('cooling')
                if cooler and cooler['specs'].get('height') and c_specs.get('maxCoolerHeight'):
                    import re
                    try:
                        c_height = float(re.search(r'\d+', str(cooler['specs']['height'])).group())
                        c_max_c = float(re.search(r'\d+', str(c_specs['maxCoolerHeight'])).group())
                        if c_height > c_max_c:
                            alt_case = self._find_compatible_hardware('case', {}, case_item['price'] * 1.2)
                            if alt_case:
                                resolved_items['case'] = alt_case
                                desc_appends.append(f"散热器高度({c_height}mm)超出原机箱限高，已自动更换机箱")
                    except Exception:
                        pass
                
                if desc_appends:
                    raw_result['description'] = raw_result.get('description', '') + " (兼容性修正：" + "，".join(desc_appends) + ")"

            # 确保 evaluation 结构完整
            if "evaluation" not in raw_result:
                raw_result["evaluation"] = {"score": 85, "verdict": "完成", "pros": [], "cons": [], "summary": "AI 自动生成"}
            else:
                eval_data = raw_result["evaluation"]
                if not isinstance(eval_data, dict):
                    raw_result["evaluation"] = {"score": 85, "verdict": "完成", "pros": [], "cons": [], "summary": "AI 自动生成"}
                else:
                    # 补齐缺字段
                    if "score" not in eval_data: eval_data["score"] = 85
                    if "pros" not in eval_data: eval_data["pros"] = []
                    if "cons" not in eval_data: eval_data["cons"] = []
            
            # 重新计算并同步总价 (Ensuring frontend gets the real price after auto-fix)
            actual_total = sum(i['price'] for i in resolved_items.values() if i)
            raw_result["items"] = resolved_items
            raw_result["totalPrice"] = actual_total
            
        return raw_result
        

    def _get_inferred_specs(self, hardware: Hardware) -> Dict:
        """Helper to get specs with name-based inference"""
        specs = hardware.specs or {}
        if isinstance(specs, str):
            try: specs = json.loads(specs)
            except: specs = {}
        
        specs = {**specs}
        model_upper = hardware.model.upper()
        
        # 1. 插槽推断
        if hardware.category == 'mainboard' and not specs.get('socket'):
            if any(chip in model_upper for chip in ['X870', 'B850', 'B840', 'B650', 'X670', 'A620']): specs['socket'] = 'AM5'
            elif any(chip in model_upper for chip in ['B550', 'X570', 'B450', 'A520', 'A320']): specs['socket'] = 'AM4'
            elif any(chip in model_upper for chip in ['Z890', 'B860', 'H810']): specs['socket'] = 'LGA1851'
            elif any(chip in model_upper for chip in ['Z790', 'B760', 'Z690', 'B660', 'H610', 'Z590', 'B560', 'H510']): specs['socket'] = 'LGA1700'
            elif any(chip in model_upper for chip in ['Z490', 'B460', 'H410']): specs['socket'] = 'LGA1200'
        
        # 2. 内存类型推断
        if not specs.get('memoryType'):
            if 'DDR5' in model_upper or 'D5' in model_upper: specs['memoryType'] = 'DDR5'
            elif 'DDR4' in model_upper or 'D4' in model_upper: specs['memoryType'] = 'DDR4'
            elif hardware.category == 'mainboard':
                # 根据插槽兜底推断
                soc = specs.get('socket')
                if soc in ['AM5', 'LGA1851']: specs['memoryType'] = 'DDR5'  # AM5 和 LGA1851 只支持 DDR5
                elif soc in ['AM4', 'LGA1200']: specs['memoryType'] = 'DDR4'
                # LGA1700 比较尴尬，既有 D4 也有 D5，如果不带 D5 标识通常默认为 D4
                elif soc == 'LGA1700' and 'D5' not in model_upper: specs['memoryType'] = 'DDR4'
        
        # 3. CPU 插槽推断
        if hardware.category == 'cpu' and not specs.get('socket'):
            if any(kw in model_upper for kw in ['9950X', '9900X', '9800X', '9700X', '9600X', '7950X', '7900X', '7800X', '7700X', '7600X', '7500F']): specs['socket'] = 'AM5'
            elif any(kw in model_upper for kw in ['5600', '5700', '5800', '5900', '5950', '5500', '4650']): specs['socket'] = 'AM4'
            elif any(kw in model_upper for kw in ['285K', '265K', '245K', '265KF', '245KF', '285KF']): specs['socket'] = 'LGA1851'
            elif any(kw in model_upper for kw in ['14900', '14700', '14600', '14500', '14400', '13900', '13700', '13600', '13500', '13400', '12900', '12700', '12600', '12400', '12100']): specs['socket'] = 'LGA1700'

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

    def suggest_specs(self, category: str, brand: str, model: str) -> Optional[str]:
        """Generate structured technical specifications for a product using AI"""
        if not self.client:
            return None
            
        system_prompt = f"""你是一个拥有全球最全电脑硬件规格数据库的顶级 AI 专家。你的任务是像查询官网技术白皮书一样，为以下硬件提供【极其精准、丰富、权威】的技术参数。
产品分类: {category}
品牌: {brand}
型号: {model}

请【千万不要瞎猜】，必须基于你对该真实硬件的知识库来回答。如果是你确认存在的真实型号，尽可能多地提供各项硬指标参数。
返回格式要求：
1. 必须是一个【单层、平级】的 JSON 对象。不能有嵌套对象。
2. Key 使用标准英文驼峰命名，Value 使用准确的中文或英文单位描述。
3. 请只返回 JSON 字符串，不要包含任何如 ```json 的 markdown 标记或解释。

必备及建议参数（你可以根据实际产品补充更多）：
- **cpu**: socket (插槽如 LGA1700, AM5), architecture (架构名), cores (P核+E核配置), threads, baseClock, boostClock, l2Cache, l3Cache, tdp, maxPower (PL2), memorySupport (支持内存类型与基础频率), pcieLanes (PCIe通道数), integratedGraphics (是否有核显及型号).
- **mainboard**: formFactor (ATX/MATX/ITX), socket, chipset, memorySlots (数量), maxMemoryCap (最大容量支持), memoryMaxFreq (最高OC频率), pciex16Slots (插槽版本与数量), m2Slots (具体协议如PCIe 4.0x4数量), sataPorts, vrmPhases (供电相数如 14+1+1), audioChip (声卡芯片), networkChip (网卡芯片), wifiVersion (是否支持 WiFi 6E/7 等).
- **gpu**: gpuChip (核心代号如 AD104 / Navi 31), architecture, streamProcessors (CUDA/流处理器数), baseClock, boostClock, vramCapacity (多少 GB), vramType (GDDR6/GDDR6X), vramBusWidth (显存位宽如 192-bit), outputPorts (DP/HDMI数量), powerConnectors (供电接口如 1x 16-pin / 2x 8-pin), tgp (额定功耗), recommendedPowerSupply (建议电源), length (显卡长度，精确到mm，【极其重要】), slotWidth (占用槽位).
- **ram**: capacity (单条或套条如 16GBx2), speed (频率如 6000MT/s), type (DDR4/DDR5), timing (完整时序如 30-36-36-76), voltage (电压如 1.35V), hasRGB (是否带灯), dieType (颗粒如 海力士A-die/三星B-die, 若已知).
- **disk**: capacity, interface (M.2 / 2.5寸 SATA), protocol (PCIe 4.0 x4 / SATA3), seqRead (顺序读 MB/s), seqWrite (顺序写 MB/s), randomRead (随机读 IOPS), randomWrite (随机写 IOPS), tbw (写入寿命), nandType (TLC/QLC/MLC), controller (主控芯片).
- **case**: formFactor (支持最大主板体型), maxGpuLength (显卡限长 mm), maxCoolerHeight (CPU散热器限高 mm), maxPsuLength (电源限长 mm), fanSupport (各位置风扇支持详情), radiatorSupport (冷排支持详情，如顶部支持360水冷), dimensions (长宽高), ioPorts (前置接口如 Type-C 10G).
- **power**: wattage (额定瓦数), efficiency (80 Plus 认证等级如金牌/白金), formFactor (ATX / SFX), cabling (全模组/半模组/直出), capacitorType (是否全日系电容), protection (OVP/OPP等), fanSize (风扇尺寸), atxVersion (是否支持 ATX 3.0/3.1, PCIe 5.0).
- **cooling**: type (风冷：单塔/双塔/下压，水冷：240/360等), dimension (长宽高 mm), compatibleSockets (兼容平台), fanSpeed (风扇转速区间), airFlow (风量 CFM), noiseLevel (噪音 dBA), tdpCapacity (解热功耗), pumpSpeed (如果是水冷，冷头转速)."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"请给出关于这件真实产品的详尽技术参数: {brand} {model}"}
                ],
                temperature=0.1,  # 降低温度，提高专业数据的确定性
                max_tokens=1500  # 增加 token 以应对更丰富的参数
            )
            content = response.choices[0].message.content.strip()
            import re
            
            # === 第 0 步: 剥离 DeepSeek <think>...</think> 思考过程 ===
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
            
            # === 第 1 步: 提取第一个 { 和最后一个 } 之间的内容 ===
            json_match = re.search(r'(\{.*\})', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            else:
                # 如果没找到完整的 {}，可能 JSON 在末尾被截断了
                # 尝试找到 { 开头的部分
                brace_start = content.find('{')
                if brace_start >= 0:
                    content = content[brace_start:]
                    # 尝试修复截断：补上 }
                    content = content.rstrip().rstrip(',')
                    # 如果最后一个值是截断的字符串，关闭它
                    if content.count('"') % 2 != 0:
                        content += '"'
                    content += '}'
                else:
                    print(f"AI suggest_specs: No JSON found in response")
                    return None
            
            # === 第 2 步: 基础清洗 ===
            content = re.sub(r'//.*', '', content)  # 移除单行注释
            content = re.sub(r'```json\s*', '', content)  # 移除 markdown 标记
            content = re.sub(r'```\s*', '', content)
            
            # === 第 3 步: 修复常见 JSON 错误 ===
            content = re.sub(r',\s*\}', '}', content)  # 移除末尾多余逗号
            content = re.sub(r',\s*\]', ']', content)
            # 修复遗漏逗号
            content = re.sub(r'("\s*\n\s*")', r'",\n"', content)
            content = re.sub(r'(\d\s*\n\s*")', r',\n"', content)
            content = re.sub(r'(true|false|null)\s*\n\s*"', r'\1,\n"', content)
            
            # === 第 4 步: 尝试解析，失败则修复截断 ===
            try:
                parsed = json.loads(content)
                print(f"AI suggest_specs OK: {len(parsed)} keys for {brand} {model}")
                return json.dumps(parsed, ensure_ascii=False)
            except json.JSONDecodeError as e:
                # 最后手段：尝试逐步修复截断的 JSON
                # 常见截断场景："key":"value 截断在此
                fixed = content.rstrip()
                # 移除最后一个不完整的 key-value 对
                last_comma = fixed.rfind(',')
                if last_comma > 0:
                    candidate = fixed[:last_comma] + '}'
                    candidate = re.sub(r',\s*\}', '}', candidate)
                    try:
                        parsed = json.loads(candidate)
                        print(f"AI suggest_specs RECOVERED (truncation): {len(parsed)} keys for {brand} {model}")
                        return json.dumps(parsed, ensure_ascii=False)
                    except:
                        pass
                
                print(f"AI suggest_specs JSON parse error: {e}")
                print(f"--- FAILED CONTENT START ---\n{content[:500]}\n--- FAILED CONTENT END ---")
                return None
        except Exception as e:
            print(f"AI suggest_specs error: {e}")
            return None

    def suggest_image_url(self, brand: str, model: str) -> Optional[str]:
        """Generate a Bing search URL focused on e-commerce (JD) for the product."""
        import urllib.parse
        
        # 优化搜索关键词：加上"京东"或"官网"字眼能更容易搜到高质量带白底图的商品页
        query = f"{brand} {model} 京东 详情图"
        encoded_query = urllib.parse.quote(query)
        
        # https://www.bing.com/images/search?q=...
        return f"https://www.bing.com/images/search?q={encoded_query}&FORM=HDRSC2"

    def generate_marketing_content(self, daily_data: Dict[str, Any], external_news: str) -> Optional[Dict[str, str]]:
        """
        基于当日真实的硬件价格浮动和用户输入的今日行业快讯，生成用于四端分发的营销文案集合。
        """
        system_prompt = """你是一个全网拥有百万粉丝的硬核数码装机博主，人称“蒋哥”。
你的任务是根据我提供的【今日硬件价格盘点数据】以及【行业最新快讯（选填）】，生成一套用于全网矩阵分发的“今日搞机快报”。

**你的语言风格极其强硬、接地气，且数据敏感。**
你坚决不说废话，开场直接报最具震撼力的硬件降价或涨价。
你经常使用数码圈黑话来调动情绪，例如：
- 划算/溢价 -> “真香”、“太臭了”
- 暴跌 -> “跳水”、“成了空中飞人”
- 新品降价背刺 -> “老用户直接被背刺的妈都不认识”
- 虚假涨价/假打折 -> “这纯属是狼来了，别做大冤种接盘侠”
- 遇到好价 -> “别犹豫，闭眼冲，这是绝杀”

**你必须分别生成 4 种平台的专属文案（严格以 JSON 格式返回）：**
- `article_title`: 适用于图文版式的一个极具吸引力的标题。
- `official_account`: 最详实、排版精细的 Markdown 深度评析长文，适合发公众号或网站新闻。将价格跳水原因结合行业快讯剖析透彻，评出今日红黑榜，最后给出一套适应行情的配置推荐。
- `moments`: 微信朋友圈短缩版，极致浓缩为3句话内，指明大盘最关键的利好或雷区，引导来私聊。要有煽动力。
- `xiaohongshu`: 小红书文风，自带标题、满屏情绪化Emoji表情、使用项目符号、必须带上至少 5 个 #硬件 #装机 标签。
- `video_script`: 面向B站和抖音的口语化出镜/解说文本。开头必须包含诸如 `【画面：直接全屏展示红绿相间的今日大盘Excel表】` 的视觉分镜指导！解说不能太干，要有主播连麦聊天的网感，语速快干货密。

**你只能返回一个包含上述五个字段的纯 JSON 对象（不要包装 ```json）：**
{
    "article_title": "...",
    "official_account": "...",
    "moments": "...",
    "xiaohongshu": "...",
    "video_script": "..."
}
"""
        import json
        import re
        
        data_context = f"【今日内部大盘真实价格浮动数据】\n{json.dumps(daily_data, ensure_ascii=False, indent=2)}\n\n"
        if external_news and external_news.strip():
            data_context += f"【全网今日行业硬核快讯（必须揉碎进分析中）】\n{external_news}\n"
        
        user_prompt = f"{data_context}\n\n请根据以上数据立刻帮我产出 4 端矩阵分发文案，必须直接返回带 5 个字段的 JSON！"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.6,
                max_tokens=3000
            )
            content = response.choices[0].message.content.strip()
            
            # 清洗思考过程
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
            
            # 提取 JSON 对象
            json_match = re.search(r'(\{.*\})', content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            
            return json.loads(content)
        except Exception as e:
            print(f"generate_marketing_content error: {e}\nRaw Content: {content if 'content' in locals() else 'None'}")
            return None
