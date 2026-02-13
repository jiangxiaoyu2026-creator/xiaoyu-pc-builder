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
        Retrieve relevant hardware candidates from database based on budget and usage.
        Limit to Top ~30-50 items to fit context window.
        """
        # Simple heuristic: filter by price range relative to budget distribution
        # e.g. GPU ~30-50% of budget
        min_gpu_price = budget * 0.2
        max_gpu_price = budget * 0.6
        
        min_cpu_price = budget * 0.1
        max_cpu_price = budget * 0.4
        
        # Fetch active hardware
        statement = select(Hardware).where(Hardware.status == "active")
        all_hardware = self.session.exec(statement).all()
        
        candidates = []
        
        # Group by category
        categories = {}
        for item in all_hardware:
            cat = item.category
            if cat not in categories: categories[cat] = []
            
            # Context filtering
            if cat == 'gpu':
                if item.price < min_gpu_price * 0.5 or item.price > max_gpu_price * 1.5: continue
            elif cat == 'cpu':
                if item.price < min_cpu_price * 0.5 or item.price > max_cpu_price * 1.5: continue
                
            categories[cat].append(item)
            
        # Select representative items for context (lowest price, highest price, popular ones)
        # For simplicity, take random sample or sort by price
        final_list = []
        for cat, items in categories.items():
            # Sort by price
            items.sort(key=lambda x: x.price)
            # Take up to 5 items: cheapest, mostly expensive, middle ones
            if len(items) > 5:
                step = len(items) // 5
                selected = [items[i] for i in range(0, len(items), step)][:5]
            else:
                selected = items
            
            for item in selected:
                final_list.append({
                    "id": item.id,
                    "category": item.category,
                    "brand": item.brand,
                    "model": item.model,
                    "price": item.price,
                    "specs": item.specs # Important for compatibility
                })
                
        return final_list

    def find_reference_configs(self, budget: int, usage: str) -> List[Dict]:
        """
        Find similar high-quality community configs.
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
            # Need to resolve item names? or just return ID and title?
            # LLM needs names.
            # We can just pass the title and summary for "Style" reference.
            refs.append({
                "title": c.title,
                "price": c.totalPrice,
                "components": c.items # JSON of IDs
            })
        return refs

    def generate_build(self, user_prompt: str) -> Dict:
        if not self.client:
            return {"error": "AI Service not configured or disabled"}

        # 1. Parse basics (can rely on LLM for this too, but helper is good)
        budget = 6000
        usage = 'gaming'
        if "办公" in user_prompt or "生产力" in user_prompt: usage = 'work'
        # ... logic similar to frontend for defaults, or let LLM decide
        
        # Let LLM do the heavy lifting of understanding intent
        
        # 2. Retrieve Inventory (RAG)
        # We need a rough budget estimate to filter inventory.
        # Let's ask LLM to extract budget first? Or regex.
        import re
        budget_match = re.search(r'(\d{4,5})', user_prompt)
        if budget_match:
            budget = int(budget_match.group(1))
            
        inventory = self.retrieve_candidates(budget, usage)
        references = self.find_reference_configs(budget, usage)
        
        # 3. Construct System Prompt
        system_prompt = """你是一个专业的电脑装机大师（小鱼装机AI）。
你的任务是根据用户的需求，从给定的【库存清单】中选择最合适的硬件，组成一台电脑主机。

**严格遵守以下规则：**
1. 只能使用【库存清单】中存在的硬件 ID。不要捏造不存在的硬件。
2. 确保兼容性：
   - CPU 和主板接口必须匹配 (如 LGA1700, AM5)。
   - 内存代数必须匹配主板 (DDR4/DDR5)。
3. 总价控制在用户预算的 +10% / -10% 范围内。
4. 输出必须是严格的 JSON 格式，不包含 markdown 代码块。

JSON 格式示例：
{
  "items": {
    "cpu": "cpu_id_123",
    "gpu": "gpu_id_456",
    ... (所有组件)
  },
  "totalPrice": 12345,
  "description": "配置分析文案..."
}

【库存清单】：
""" + json.dumps(inventory, ensure_ascii=False) + """

【参考方案】：
""" + json.dumps(references, ensure_ascii=False)

        user_msg = f"用户需求：{user_prompt}\n预算参考：{budget}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
            
        except Exception as e:
            print(f"LLM Error: {e}")
            return {"error": str(e)}
