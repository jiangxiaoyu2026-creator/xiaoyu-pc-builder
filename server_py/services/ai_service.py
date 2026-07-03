import json
import re
from typing import List, Dict, Any, Optional, Set, Tuple
from sqlmodel import Session, select
from server_py.models import Hardware, Setting, ChatSettings
from server_py.db import engine
from openai import OpenAI
import os

class AiService:
    def __init__(self, session: Session):
        from server_py.models import User # Added import here for convenience or at top
        self.session = session
        self.client = None
        self.provider = "deepseek"
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
                    self.provider = config.get("provider", "deepseek")
                    api_key = config.get("apiKey")
                    base_url = config.get("baseUrl")
                    self.model = config.get("model", "deepseek-chat")
                    self.persona = config.get("persona", "balanced")
                    self.strategy = config.get("strategy", "balanced")
                    
                    if api_key:
                        default_base_urls = {
                            "deepseek": "https://api.deepseek.com",
                            "openai": "https://api.openai.com/v1",
                        }
                        self.client = OpenAI(
                            api_key=api_key,
                            base_url=base_url if base_url else default_base_urls.get(self.provider, "https://api.deepseek.com")
                        )
            except Exception as e:
                print(f"Error loading AI settings: {e}")

    def _load_pricing_strategy(self) -> Dict[str, Any]:
        setting = self.session.get(Setting, "pricingStrategy")
        if not setting:
            return {"serviceFeeRate": 0.06, "discountTiers": []}
        try:
            value = json.loads(setting.value)
            if isinstance(value, dict):
                return value
        except Exception:
            pass
        return {"serviceFeeRate": 0.06, "discountTiers": []}

    def _parse_budget_from_prompt(self, prompt: str) -> Optional[int]:
        text = prompt or ""
        explicit = re.search(r'(?:预算|budget|控制在|不超过|以内|花)\s*(\d{2,6})', text, re.I)
        if explicit:
            return int(explicit.group(1))
        explicit = re.search(r'(\d{2,6})\s*(?:元|块|左右|以内|上下|预算)', text)
        if explicit:
            return int(explicit.group(1))
        chinese_numbers = {
            "三千": 3000, "四千": 4000, "五千": 5000, "六千": 6000,
            "七千": 7000, "八千": 8000, "九千": 9000,
            "一万": 10000, "两万": 20000, "三万": 30000
        }
        for word, value in chinese_numbers.items():
            if word in text:
                return value
        return None

    def _parse_usage(self, prompt: str, fallback: Optional[str]) -> str:
        text = prompt or ""
        if any(kw in text for kw in ["直播", "推流", "录制", "OBS", "obs"]):
            return "streaming"
        if any(kw in text for kw in ["办公", "设计", "剪辑", "渲染", "生产力", "代码", "编程", "工作"]):
            return "work"
        if fallback in {"gaming", "work", "streaming"}:
            return fallback
        return "gaming"

    def _parse_appearance(self, prompt: str, fallback: Optional[str]) -> str:
        text = prompt or ""
        if any(kw in text for kw in ["白", "海景", "雪", "纯白"]):
            return "white"
        if any(kw in text for kw in ["RGB", "rgb", "灯", "光", "炫", "跑马灯"]):
            return "rgb"
        if fallback in {"black", "white", "rgb"}:
            return fallback
        return "black"

    def _parse_include_monitor(self, prompt: str, fallback: bool) -> bool:
        text = prompt or ""
        if any(kw in text for kw in ["不要显示器", "不带显示器", "不含显示器", "不包含显示器", "只要主机"]):
            return False
        if any(kw in text for kw in ["带显示器", "含显示器", "包含显示器", "显示器", "屏幕", "带屏"]):
            return True
        return bool(fallback)

    def _budget_numbers(self, prompt: str) -> Set[str]:
        numbers = set()
        for match in re.finditer(r'(?:预算|budget|控制在|不超过|以内|花)\s*(\d{2,6})', prompt or "", re.I):
            numbers.add(match.group(1))
        for match in re.finditer(r'(\d{2,6})\s*(?:元|块|左右|以内|上下|预算)', prompt or ""):
            numbers.add(match.group(1))
        return numbers

    def _model_signatures(self, item: Hardware) -> Set[str]:
        model = self._normalize_prompt(item.model)
        signatures = set()
        for pattern in [
            r'(?:RTX|GTX)\d{3,4}(?:TI|TIS|SUPER)?',
            r'RX\d{3,4}(?:XT|XTX)?',
            r'I[3579]\d{4,5}[A-Z]{0,3}',
            r'R[3579]\d{4}[A-Z0-9]{0,4}',
            r'\d{4,5}(?:X3D|KF|K|F|XT|XTX|TI|TIS|SUPER)?',
        ]:
            for match in re.finditer(pattern, model, re.I):
                token = match.group(0).lower()
                if len(token) >= 4:
                    signatures.add(token)
        if len(model) >= 8:
            signatures.add(model)
        return signatures

    def _find_user_requested_map(self, all_hardware: List[Hardware], user_prompt: str) -> Dict[str, List[Hardware]]:
        prompt_clean = self._normalize_prompt(user_prompt)
        budget_numbers = self._budget_numbers(user_prompt)
        requested: Dict[str, List[Hardware]] = {}
        seen: Set[str] = set()

        for item in all_hardware:
            matched = False
            for sig in self._model_signatures(item):
                if sig.isdigit() and sig in budget_numbers:
                    continue
                if sig.isdigit():
                    if item.category not in {"cpu", "gpu"}:
                        continue
                    if re.search(rf'(?<!\d){re.escape(sig)}(?!\d)', user_prompt or ""):
                        matched = True
                        break
                    continue
                if sig and sig in prompt_clean:
                    matched = True
                    break
            if matched and item.id not in seen:
                requested.setdefault(item.category, []).append(item)
                seen.add(item.id)

        return requested

    def _extract_requested_terms(self, user_prompt: str) -> List[Dict[str, str]]:
        terms: List[Dict[str, str]] = []
        text = user_prompt or ""
        budget_numbers = self._budget_numbers(text)
        patterns = [
            ("gpu", r'\b(?:RTX|GTX)\s*\d{3,4}\s*(?:TI\s*SUPER|TI|SUPER|TIS)?\b'),
            ("gpu", r'\bRX\s*\d{3,4}\s*(?:XT|XTX)?\b'),
            ("gpu", r'(?<!\d)(?:30|40|50|60|70|90)\d{2}\s*(?:TI\s*SUPER|TI|SUPER|TIS)?(?!\d)'),
            ("cpu", r'\bI[3579]\s*-?\s*\d{4,5}[A-Z]{0,3}\b'),
            ("cpu", r'\bR[3579]\s*-?\s*\d{4}[A-Z0-9]{0,4}\b'),
            ("cpu", r'\b(?:RYZEN|锐龙)\s*[3579]\s*\d{4}[A-Z0-9]{0,4}\b'),
        ]
        seen = set()
        for category, pattern in patterns:
            for match in re.finditer(pattern, text, re.I):
                label = re.sub(r'\s+', ' ', match.group(0).strip())
                normalized = self._normalize_prompt(label)
                if len(normalized) < 4:
                    continue
                if normalized.isdigit() and normalized in budget_numbers:
                    continue
                key = (category, normalized)
                if key not in seen:
                    terms.append({"category": category, "term": label, "normalized": normalized})
                    seen.add(key)
        filtered = []
        for term in terms:
            if term["normalized"].isdigit():
                has_prefixed = any(
                    other["category"] == term["category"]
                    and other["normalized"] != term["normalized"]
                    and term["normalized"] in other["normalized"]
                    for other in terms
                )
                if has_prefixed:
                    continue
            filtered.append(term)
        return filtered

    def _active_sellable_hardware(self, include_monitor: bool) -> List[Hardware]:
        categories = ["cpu", "mainboard", "gpu", "ram", "disk", "power", "cooling", "case", "fan"]
        if include_monitor:
            categories.append("monitor")
        statement = select(Hardware).where(
            Hardware.status == "active",
            Hardware.price > 0,
            Hardware.category.in_(categories)
        )
        return self.session.exec(statement).all()

    def _critical_missing_reasons(self, item: Hardware) -> List[str]:
        specs = self._get_inferred_specs(item)
        missing = []
        category_keys = {
            "cpu": ["socket"],
            "mainboard": ["socket", "memoryType", "formFactor"],
            "ram": ["memoryType"],
            "gpu": ["length"],
            "case": ["formFactor", "maxGpuLength", "maxCoolerHeight"],
            "power": ["wattage"],
            "monitor": ["resolution"],
        }
        for key in category_keys.get(item.category, []):
            if self._spec_value(specs, key, "ram_type" if key == "memoryType" else key) in (None, ""):
                missing.append(key)
        if item.category == "cooling":
            cooler_type = str(self._spec_value(specs, "type", "coolerType") or "")
            if "水" not in cooler_type and "aio" not in cooler_type.lower():
                if self._spec_value(specs, "height") in (None, ""):
                    missing.append("height")
        return missing

    def _is_auto_usable(self, item: Hardware) -> bool:
        return len(self._critical_missing_reasons(item)) == 0

    def get_build_data_health(self) -> Dict[str, Any]:
        categories = ["cpu", "mainboard", "gpu", "ram", "disk", "power", "cooling", "case", "fan", "monitor"]
        rows = self.session.exec(select(Hardware).where(Hardware.status == "active", Hardware.price > 0)).all()
        result = []
        for category in categories:
            items = [item for item in rows if item.category == category]
            missing: Dict[str, int] = {}
            usable = 0
            for item in items:
                reasons = self._critical_missing_reasons(item)
                if not reasons:
                    usable += 1
                for reason in reasons:
                    missing[reason] = missing.get(reason, 0) + 1
            result.append({
                "category": category,
                "total": len(items),
                "usable": usable,
                "blocked": len(items) - usable,
                "missing": missing
            })
        return {
            "categories": result,
            "rules": [
                "只使用 active 且价格大于 0 的商品",
                "预算按最终成交价反推硬件预算",
                "点名配件只从用户原始输入识别",
                "CPU/主板/内存/机箱/电源按硬规则校验"
            ]
        }

    def _normalize_prompt(self, text: str) -> str:
        return (text or "").lower().replace(" ", "").replace("-", "").replace("_", "")

    def _spec_value(self, specs: Dict[str, Any], *keys: str) -> Any:
        for key in keys:
            value = specs.get(key)
            if value not in (None, ""):
                return value
        return None

    def _ratio_plan(self, usage: str, include_monitor: bool) -> Dict[str, float]:
        if usage == "work":
            ratios = {
                "cpu": 0.24, "gpu": 0.25, "mainboard": 0.11, "ram": 0.11,
                "disk": 0.09, "power": 0.07, "cooling": 0.05, "case": 0.06, "fan": 0.02
            }
        elif usage == "streaming":
            ratios = {
                "cpu": 0.22, "gpu": 0.34, "mainboard": 0.10, "ram": 0.09,
                "disk": 0.07, "power": 0.07, "cooling": 0.05, "case": 0.04, "fan": 0.02
            }
        else:
            ratios = {
                "cpu": 0.18, "gpu": 0.40, "mainboard": 0.10, "ram": 0.08,
                "disk": 0.07, "power": 0.07, "cooling": 0.04, "case": 0.04, "fan": 0.02
            }
        if include_monitor:
            monitor_share = 0.16
            ratios = {k: v * (1 - monitor_share) for k, v in ratios.items()}
            ratios["monitor"] = monitor_share
        return ratios

    def _performance_value(self, item: Hardware) -> float:
        specs = self._get_inferred_specs(item)
        return (
            self._extract_number(self._spec_value(specs, "master_lu_score", "ludashiScore", "score"))
            or self._extract_number(self._spec_value(specs, "wattage", "power_draw"))
            or float(item.price or 0)
        )

    def _appearance_bonus(self, item: Hardware, appearance: str) -> float:
        text = f"{item.brand} {item.model}".lower()
        if appearance == "white" and any(kw in text for kw in ["白", "雪", "ice", "white"]):
            return 16
        if appearance == "rgb" and any(kw in text for kw in ["rgb", "argb", "灯", "光"]):
            return 10
        return 0

    def _candidate_matches_criteria(self, item: Hardware, criteria: Dict[str, Any]) -> bool:
        specs = self._get_inferred_specs(item)
        for key, expected in criteria.items():
            if expected in (None, ""):
                continue
            if key == "supportsFormFactor":
                if not self._form_factor_fits(self._spec_value(specs, "formFactor", "form_factor"), expected):
                    return False
            elif key == "minMaxGpuLength":
                value = self._extract_number(self._spec_value(specs, "maxGpuLength"))
                if value and value < float(expected):
                    return False
            elif key == "minMaxCoolerHeight":
                value = self._extract_number(self._spec_value(specs, "maxCoolerHeight", "maxCpuHeight"))
                if value and value < float(expected):
                    return False
            elif key == "minWattage":
                value = self._extract_number(self._spec_value(specs, "wattage", "ratedPower"))
                if not value or value < float(expected):
                    return False
            else:
                if key == "memoryType":
                    value = self._spec_value(specs, "memoryType", "ram_type", "type")
                else:
                    value = self._spec_value(specs, key, "socket_type" if key == "socket" else key)
                if str(value).upper() != str(expected).upper():
                    return False
        return True

    def _select_best_item(
        self,
        items_by_category: Dict[str, List[Hardware]],
        category: str,
        target_price: float,
        criteria: Optional[Dict[str, Any]],
        usage: str,
        appearance: str,
        requested: Optional[List[Hardware]] = None,
        max_price: Optional[float] = None
    ) -> Optional[Dict]:
        requested_ids = {item.id for item in (requested or [])}
        source = requested if requested else items_by_category.get(category, [])
        candidates = [
            item for item in source
            if self._is_auto_usable(item)
            and (max_price is None or item.price <= max_price or item.id in requested_ids)
            and self._candidate_matches_criteria(item, criteria or {})
        ]
        if not candidates and requested:
            candidates = [
                item for item in items_by_category.get(category, [])
                if self._is_auto_usable(item)
                and (max_price is None or item.price <= max_price)
                and self._candidate_matches_criteria(item, criteria or {})
            ]
        if not candidates:
            return None

        max_perf = max(self._performance_value(item) for item in candidates) or 1
        max_value = max(self._performance_value(item) / max(float(item.price or 1), 1) for item in candidates) or 1
        strategy = self.strategy if self.strategy in {"performance", "budget", "balanced", "aesthetic"} else "balanced"

        def score(item: Hardware) -> float:
            price = float(item.price or 0)
            perf_norm = self._performance_value(item) / max_perf
            value_norm = (self._performance_value(item) / max(price, 1)) / max_value
            price_fit = max(0.0, 1 - abs(price - target_price) / max(target_price, 1))
            if strategy == "budget":
                base = value_norm * 46 + price_fit * 30 + perf_norm * 12
            elif strategy == "performance":
                base = perf_norm * 44 + price_fit * 24 + value_norm * 16
            else:
                base = perf_norm * 28 + value_norm * 26 + price_fit * 28
            if item.id in requested_ids:
                base += 120
            if item.isRecommended:
                base += 12
            if item.isDiscount:
                base += 8
            if strategy == "aesthetic" or appearance in {"white", "rgb"}:
                base += self._appearance_bonus(item, appearance)
            return base

        best = max(candidates, key=score)
        return self._hardware_to_result(best)

    def _repair_platform_if_needed(
        self,
        selected: Dict[str, Optional[Dict]],
        items_by_category: Dict[str, List[Hardware]],
        requested_by_category: Dict[str, List[Hardware]],
        hardware_budget: float,
        usage: str,
        appearance: str,
        ratios: Dict[str, float]
    ) -> List[str]:
        if selected.get("ram"):
            return []
        if requested_by_category.get("cpu") or requested_by_category.get("mainboard"):
            return []

        best_platform: Optional[Tuple[float, Dict, Dict, Dict]] = None
        cpu_candidates = [
            item for item in items_by_category.get("cpu", [])
            if self._is_auto_usable(item) and item.price <= hardware_budget * 0.28
        ]
        cpu_candidates.sort(key=lambda item: (item.price, -self._performance_value(item)))

        for cpu_item in cpu_candidates[:18]:
            cpu = self._hardware_to_result(cpu_item)
            socket = self._spec_value(cpu.get("specs", {}), "socket", "socket_type")
            mb = self._select_best_item(
                items_by_category,
                "mainboard",
                hardware_budget * ratios.get("mainboard", 0.1),
                {"socket": socket},
                usage,
                appearance,
                max_price=hardware_budget * 0.18,
            )
            if not mb:
                continue
            memory_type = self._spec_value(mb.get("specs", {}), "memoryType", "ram_type", "type")
            ram = self._select_best_item(
                items_by_category,
                "ram",
                hardware_budget * ratios.get("ram", 0.08),
                {"memoryType": memory_type},
                usage,
                appearance,
                max_price=hardware_budget * 0.16,
            )
            if not ram:
                continue
            total = float(cpu["price"]) + float(mb["price"]) + float(ram["price"])
            if best_platform is None or total < best_platform[0]:
                best_platform = (total, cpu, mb, ram)

        if not best_platform:
            return []

        _, cpu, mb, ram = best_platform
        selected["cpu"] = cpu
        selected["mainboard"] = mb
        selected["ram"] = ram
        return ["为保证 CPU、主板和内存能成套购买，已切换到更稳的同预算平台"]

    def _items_by_category(self, all_items: List[Hardware]) -> Dict[str, List[Hardware]]:
        result: Dict[str, List[Hardware]] = {}
        for item in all_items:
            result.setdefault(item.category, []).append(item)
        for items in result.values():
            items.sort(key=lambda item: (float(item.price or 0), item.sortOrder, item.id))
        return result

    def _minimum_needed_for_remaining(self, items_by_category: Dict[str, List[Hardware]], categories: List[str]) -> float:
        total = 0.0
        for category in categories:
            usable = [item for item in items_by_category.get(category, []) if self._is_auto_usable(item)]
            if usable:
                total += min(float(item.price or 0) for item in usable)
        return total

    def _build_result_text(
        self,
        status: str,
        items: Dict[str, Optional[Dict]],
        checks: Dict[str, Any],
        requirement_summary: Dict[str, Any],
        budget_notes: List[str],
        missing_core: List[str],
    ) -> str:
        selected = [item for item in items.values() if item]
        core_names = "、".join(f"{item['brand']} {item['model']}" for item in selected[:4])
        budget = int(requirement_summary["budget"])
        final_price = int(checks["budget"]["finalPrice"])
        lines = []
        if status == "blocked":
            lines.append("这次没有直接给出可成交配置，因为当前库存、预算或点名条件下存在硬性风险。")
        else:
            lines.append(f"按最终成交价预算 ¥{budget} 反推硬件预算后，已从真实库存里选出这套方案。")
        if core_names:
            lines.append(f"核心组合：{core_names}。")
        lines.append(f"当前硬件合计 ¥{int(checks['budget']['hardwareTotal'])}，含服务费后的预计成交价约 ¥{final_price}。")
        if requirement_summary["requestedItems"]:
            kept = [item["name"] for item in checks["requestedItems"]["items"] if item["kept"]]
            missed = [item["name"] for item in checks["requestedItems"]["items"] if not item["kept"]]
            if kept:
                lines.append("已保留点名配件：" + "、".join(kept) + "。")
            if missed:
                lines.append("未能保留：" + "、".join(missed) + "，需要确认库存/预算或接受平替。")
        unmatched = requirement_summary.get("unmatchedRequestedTerms") or []
        if unmatched:
            lines.append("当前库存未找到点名型号：" + "、".join(item["term"] for item in unmatched) + "，已按预算做平替候选。")
        if budget_notes:
            lines.append("预算优化：" + "；".join(budget_notes) + "。")
        if missing_core:
            lines.append("缺少关键品类：" + "、".join(missing_core) + "。")
        issues = checks["compatibility"]["issues"]
        if issues:
            lines.append("兼容风险：" + "；".join(issues) + "。")
        if status == "ready":
            lines.append("预算、点名配件和基础兼容校验均已通过，可以直接作为成交草案。")
        elif status == "needs_confirmation":
            lines.append("这套可以先填入，但建议在成交前确认上面的取舍点。")
        return "\n".join(lines)

    def generate_build(
        self,
        user_prompt: str,
        budget: Optional[int] = None,
        usage: Optional[str] = None,
        appearance: Optional[str] = None,
        include_monitor: bool = False,
        discount_rate: float = 1.0
    ) -> Dict:
        raw_prompt = user_prompt or ""
        parsed_budget = self._parse_budget_from_prompt(raw_prompt)
        budget = int(parsed_budget or budget or 6000)
        usage = self._parse_usage(raw_prompt, usage)
        appearance = self._parse_appearance(raw_prompt, appearance)
        include_monitor = self._parse_include_monitor(raw_prompt, include_monitor)

        pricing = self._load_pricing_strategy()
        service_fee_rate = float(pricing.get("serviceFeeRate") or 0.06)
        safe_discount_rate = float(discount_rate or 1.0)
        if safe_discount_rate <= 0:
            safe_discount_rate = 1.0
        hardware_budget = max(0, budget / ((1 + service_fee_rate) * safe_discount_rate))

        all_hardware = self._active_sellable_hardware(include_monitor)
        items_by_category = self._items_by_category(all_hardware)
        requested_by_category = self._find_user_requested_map(all_hardware, raw_prompt)
        requested_terms = self._extract_requested_terms(raw_prompt)
        unmatched_terms = []
        for term in requested_terms:
            candidates = requested_by_category.get(term["category"], [])
            matched = False
            for item in candidates:
                for sig in self._model_signatures(item):
                    if term["normalized"] in sig or sig in term["normalized"]:
                        matched = True
                        break
                if matched:
                    break
            if not matched:
                unmatched_terms.append({"category": term["category"], "term": term["term"]})
        requested_ids = {item.id for items in requested_by_category.values() for item in items}
        ratios = self._ratio_plan(usage, include_monitor)

        selected: Dict[str, Optional[Dict]] = {
            "cpu": None, "mainboard": None, "gpu": None, "ram": None, "disk": None,
            "power": None, "cooling": None, "case": None, "fan": None, "monitor": None
        }

        order = ["cpu", "gpu", "mainboard", "ram", "disk", "cooling", "case", "power"]
        if include_monitor:
            order.append("monitor")

        for category in order:
            criteria: Dict[str, Any] = {}
            if category == "mainboard" and selected["cpu"]:
                criteria["socket"] = self._spec_value(selected["cpu"].get("specs", {}), "socket", "socket_type")
            elif category == "ram" and selected["mainboard"]:
                criteria["memoryType"] = self._spec_value(selected["mainboard"].get("specs", {}), "memoryType", "ram_type", "type")
            elif category == "case":
                criteria.update(self._case_criteria_from_items(selected))
            elif category == "power":
                required_power = self._estimate_required_power(selected)
                if required_power:
                    criteria["minWattage"] = required_power

            target = hardware_budget * ratios.get(category, 0.05)
            remaining_categories = [c for c in order if c not in selected or selected.get(c) is None]
            min_remaining = self._minimum_needed_for_remaining(items_by_category, [c for c in remaining_categories if c != category])
            max_price = max(target * 1.9, hardware_budget - self._calculate_total(selected) - min_remaining)
            requested = requested_by_category.get(category)
            selected[category] = self._select_best_item(
                items_by_category,
                category,
                target,
                criteria,
                usage,
                appearance,
                requested=requested,
                max_price=max_price,
            )

        platform_notes = self._repair_platform_if_needed(
            selected,
            items_by_category,
            requested_by_category,
            hardware_budget,
            usage,
            appearance,
            ratios,
        )

        fan_requested = requested_by_category.get("fan")
        fan_should_exist = bool(fan_requested or appearance in {"white", "rgb"} or hardware_budget >= 6500)
        if fan_should_exist:
            fan = self._select_best_item(
                items_by_category,
                "fan",
                hardware_budget * ratios.get("fan", 0.02),
                {},
                usage,
                appearance,
                requested=fan_requested,
                max_price=hardware_budget * 0.05,
            )
            if fan:
                fan["count"] = 3 if appearance in {"white", "rgb"} and hardware_budget >= 6500 else 1
                selected["fan"] = fan

        protected_ids = requested_ids
        budget_notes = self._trim_to_budget(selected, hardware_budget, protected_ids)
        budget_notes = platform_notes + budget_notes
        final_checks = self._validate_resolved_build(selected, hardware_budget)

        hardware_total = self._calculate_total(selected)
        final_price = hardware_total * (1 + service_fee_rate) * safe_discount_rate
        final_checks["budget"] = {
            "ok": final_price <= budget,
            "limit": budget,
            "hardwareLimit": hardware_budget,
            "hardwareTotal": hardware_total,
            "actual": hardware_total,
            "finalPrice": final_price,
            "serviceFeeRate": service_fee_rate,
            "discountRate": safe_discount_rate
        }

        requested_summary = []
        for category, items in requested_by_category.items():
            if not items:
                continue
            names = " / ".join(f"{item.brand} {item.model}" for item in items[:3])
            requested_summary.append({
                "id": items[0].id,
                "category": category,
                "name": names,
                "candidateIds": [item.id for item in items]
            })
        requested_status = []
        for requested in requested_summary:
            selected_item = selected.get(requested["category"])
            kept = bool(selected_item and selected_item.get("id") in requested.get("candidateIds", []))
            requested_status.append({**requested, "kept": kept})
        final_checks["requestedItems"] = {
            "ok": all(item["kept"] for item in requested_status) and not unmatched_terms,
            "items": requested_status,
            "unmatched": unmatched_terms
        }

        required_categories = ["cpu", "mainboard", "gpu", "ram", "disk", "power", "cooling", "case"]
        if include_monitor:
            required_categories.append("monitor")
        missing_core = [category for category in required_categories if not selected.get(category)]
        final_checks["completeness"] = {
            "ok": len(missing_core) == 0,
            "missing": missing_core
        }

        if missing_core or not final_checks["compatibility"]["ok"] or not final_checks["budget"]["ok"]:
            status = "blocked"
        elif not final_checks["requestedItems"]["ok"] or budget_notes:
            status = "needs_confirmation"
        else:
            status = "ready"

        alternatives = []
        if not final_checks["budget"]["ok"]:
            alternatives.extend([
                f"把最终预算提高到约 ¥{int(final_price)}",
                "降低显卡/CPU 档位",
                "取消部分外观或显示器要求"
            ])
        if not final_checks["requestedItems"]["ok"]:
            alternatives.append("接受未保留点名配件的同级平替")
        if missing_core:
            alternatives.append("补齐缺失品类的可售商品或关键规格数据")

        requirement_summary = {
            "budget": budget,
            "hardwareBudget": hardware_budget,
            "usage": usage,
            "appearance": appearance,
            "includeMonitor": include_monitor,
            "requestedItems": requested_summary,
            "unmatchedRequestedTerms": unmatched_terms,
        }

        description = self._build_result_text(
            status,
            selected,
            final_checks,
            requirement_summary,
            budget_notes,
            missing_core,
        )

        cons = []
        if not final_checks["budget"]["ok"]:
            cons.append("最终成交价超过预算")
        cons.extend(final_checks["compatibility"]["issues"])
        if not final_checks["requestedItems"]["ok"]:
            cons.append("部分点名配件未能保留")
        if missing_core:
            cons.append("关键品类未选齐")

        score = 96
        if status == "needs_confirmation":
            score = 82
        if status == "blocked":
            score = 55

        return {
            "status": status,
            "items": {} if status == "blocked" else selected,
            "totalPrice": hardware_total,
            "finalPrice": final_price,
            "description": description,
            "alternatives": alternatives,
            "requirementSummary": requirement_summary,
            "checks": final_checks,
            "evaluation": {
                "score": score,
                "verdict": "可直接采用" if status == "ready" else ("需确认" if status == "needs_confirmation" else "不可直接采用"),
                "pros": ["真实库存选件", "按最终成交价控预算", "已执行基础兼容校验"],
                "cons": cons,
                "summary": description.split("\n")[0]
            }
        }
        

    def _get_inferred_specs(self, hardware: Hardware) -> Dict:
        """Helper to get specs with name-based inference"""
        specs = hardware.specs or {}
        for _ in range(2):
            if isinstance(specs, str):
                try:
                    specs = json.loads(specs)
                except:
                    specs = {}
                    break
        if not isinstance(specs, dict):
            specs = {}
        
        specs = {**specs}
        if specs.get('socket_type') and not specs.get('socket'):
            specs['socket'] = specs.get('socket_type')
        if specs.get('ram_type') and not specs.get('memoryType'):
            specs['memoryType'] = specs.get('ram_type')
        if specs.get('form_factor') and not specs.get('formFactor'):
            specs['formFactor'] = specs.get('form_factor')
        if specs.get('maxCpuHeight') and not specs.get('maxCoolerHeight'):
            specs['maxCoolerHeight'] = specs.get('maxCpuHeight')
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

    def _extract_number(self, value: Any) -> Optional[float]:
        if value in (None, ""):
            return None
        match = re.search(r'\d+(?:\.\d+)?', str(value))
        return float(match.group()) if match else None

    def _form_factor_fits(self, case_form_factor: Any, mainboard_form_factor: Any) -> bool:
        if not case_form_factor or not mainboard_form_factor:
            return True
        case_text = str(case_form_factor).upper().replace("MICRO-ATX", "M-ATX").replace("MATX", "M-ATX")
        mb_text = str(mainboard_form_factor).upper().replace("MICRO-ATX", "M-ATX").replace("MATX", "M-ATX")
        case_supports_atx = bool(re.search(r'(?<!M-)ATX', case_text))
        if "E-ATX" in mb_text:
            return "E-ATX" in case_text
        if re.search(r'(?<!M-)ATX', mb_text):
            return case_supports_atx
        if "M-ATX" in mb_text:
            return "M-ATX" in case_text or "ATX" in case_text
        if "ITX" in mb_text:
            return True
        return True

    def _item_total_price(self, item: Optional[Dict]) -> float:
        if not item:
            return 0
        count = item.get("count", 1) if item.get("category") == "fan" else 1
        return float(item.get("price") or 0) * max(1, int(count or 1))

    def _calculate_total(self, items: Dict[str, Optional[Dict]]) -> float:
        return sum(self._item_total_price(item) for item in items.values() if item)

    def _hardware_to_result(self, hardware: Hardware) -> Dict:
        return {
            "id": hardware.id,
            "category": hardware.category,
            "brand": hardware.brand,
            "model": hardware.model,
            "price": hardware.price,
            "specs": self._get_inferred_specs(hardware),
            "image": hardware.image
        }

    def _estimate_required_power(self, items: Dict[str, Optional[Dict]]) -> Optional[float]:
        cpu = items.get("cpu")
        gpu = items.get("gpu")
        if not cpu and not gpu:
            return None
        cpu_power = self._extract_number(self._spec_value(cpu.get("specs", {}) if cpu else {}, "tdp", "wattage", "power_draw", "maxPower")) or 65
        gpu_power = self._extract_number(self._spec_value(gpu.get("specs", {}) if gpu else {}, "tgp", "maxWattage", "power_draw", "wattage")) or 150
        return (cpu_power + gpu_power) * 1.5 + 50

    def _case_criteria_from_items(self, items: Dict[str, Optional[Dict]]) -> Dict[str, Any]:
        criteria: Dict[str, Any] = {}
        mb = items.get("mainboard")
        gpu = items.get("gpu")
        cooler = items.get("cooling")
        if mb:
            mb_ff = self._spec_value(mb.get("specs", {}), "formFactor", "form_factor")
            if mb_ff:
                criteria["supportsFormFactor"] = mb_ff
        if gpu:
            gpu_len = self._extract_number(self._spec_value(gpu.get("specs", {}), "length"))
            if gpu_len:
                criteria["minMaxGpuLength"] = gpu_len
        if cooler:
            cooler_height = self._extract_number(self._spec_value(cooler.get("specs", {}), "height"))
            if cooler_height:
                criteria["minMaxCoolerHeight"] = cooler_height
        return criteria

    def _validate_resolved_build(self, items: Dict[str, Optional[Dict]], budget: int) -> Dict[str, Any]:
        issues = []
        cpu = items.get("cpu")
        mb = items.get("mainboard")
        ram = items.get("ram")
        case_item = items.get("case")
        power = items.get("power")

        if cpu and mb:
            cpu_socket = self._spec_value(cpu.get("specs", {}), "socket", "socket_type")
            mb_socket = self._spec_value(mb.get("specs", {}), "socket", "socket_type")
            if cpu_socket and mb_socket and cpu_socket != mb_socket:
                issues.append(f"CPU接口 {cpu_socket} 与主板接口 {mb_socket} 不匹配")

        if ram and mb:
            ram_type = self._spec_value(ram.get("specs", {}), "memoryType", "ram_type", "type")
            mb_type = self._spec_value(mb.get("specs", {}), "memoryType", "ram_type", "type")
            if ram_type and mb_type and str(ram_type).upper() != str(mb_type).upper():
                issues.append(f"内存 {ram_type} 与主板内存类型 {mb_type} 不匹配")

        if case_item:
            c_specs = case_item.get("specs", {})
            if mb:
                if not self._form_factor_fits(self._spec_value(c_specs, "formFactor", "form_factor"), self._spec_value(mb.get("specs", {}), "formFactor", "form_factor")):
                    issues.append("主板板型与机箱支持规格不匹配")

            gpu = items.get("gpu")
            gpu_len = self._extract_number(self._spec_value(gpu.get("specs", {}) if gpu else {}, "length"))
            case_gpu_len = self._extract_number(self._spec_value(c_specs, "maxGpuLength"))
            if gpu_len and case_gpu_len and gpu_len > case_gpu_len:
                issues.append(f"显卡长度 {gpu_len:g}mm 超过机箱限长 {case_gpu_len:g}mm")

            cooler = items.get("cooling")
            cooler_height = self._extract_number(self._spec_value(cooler.get("specs", {}) if cooler else {}, "height"))
            case_cooler_height = self._extract_number(self._spec_value(c_specs, "maxCoolerHeight", "maxCpuHeight"))
            if cooler_height and case_cooler_height and cooler_height > case_cooler_height:
                issues.append(f"散热器高度 {cooler_height:g}mm 超过机箱限高 {case_cooler_height:g}mm")

        required_power = self._estimate_required_power(items)
        power_watt = self._extract_number(self._spec_value(power.get("specs", {}) if power else {}, "wattage", "ratedPower"))
        if required_power and power_watt and power_watt < required_power:
            issues.append(f"电源额定功率 {power_watt:g}W 低于建议冗余 {required_power:g}W")

        total = self._calculate_total(items)
        return {
            "budget": {"ok": total <= budget, "limit": budget, "actual": total},
            "compatibility": {"ok": len(issues) == 0, "issues": issues}
        }

    def _budget_trim_criteria(self, category: str, items: Dict[str, Optional[Dict]]) -> Dict[str, Any]:
        criteria: Dict[str, Any] = {}
        mb = items.get("mainboard")
        cpu = items.get("cpu")
        ram = items.get("ram")

        if category == "mainboard":
            cpu_socket = self._spec_value(cpu.get("specs", {}) if cpu else {}, "socket", "socket_type")
            ram_type = self._spec_value(ram.get("specs", {}) if ram else {}, "memoryType", "ram_type", "type")
            if cpu_socket:
                criteria["socket"] = cpu_socket
            if ram_type:
                criteria["memoryType"] = ram_type
        elif category == "ram":
            mb_type = self._spec_value(mb.get("specs", {}) if mb else {}, "memoryType", "ram_type", "type")
            if mb_type:
                criteria["memoryType"] = mb_type
        elif category == "cpu":
            mb_socket = self._spec_value(mb.get("specs", {}) if mb else {}, "socket", "socket_type")
            if mb_socket:
                criteria["socket"] = mb_socket
        elif category == "case":
            criteria.update(self._case_criteria_from_items(items))
        elif category == "power":
            required_power = self._estimate_required_power(items)
            if required_power:
                criteria["minWattage"] = required_power

        return criteria

    def _trim_to_budget(
        self,
        items: Dict[str, Optional[Dict]],
        budget: int,
        protected_ids: Set[str]
    ) -> List[str]:
        notes = []
        if self._calculate_total(items) <= budget:
            return notes

        fan = items.get("fan")
        if fan and fan.get("id") not in protected_ids:
            if int(fan.get("count", 1) or 1) > 1:
                fan["count"] = 1
                notes.append("为控制预算，已将机箱风扇数量降为 1 把")
            if self._calculate_total(items) <= budget:
                return notes

        downgrade_order = ["fan", "case", "cooling", "disk", "monitor", "ram", "power", "mainboard", "cpu", "gpu"]
        for _ in range(3):
            changed = False
            for category in downgrade_order:
                current = items.get(category)
                if not current or current.get("id") in protected_ids:
                    continue

                current_price = float(current.get("price") or 0)
                if current_price <= 0:
                    continue

                alt = self._find_compatible_hardware(
                    category,
                    self._budget_trim_criteria(category, items),
                    current_price,
                    price_ceiling=current_price - 1,
                    prefer_cheaper=True
                )
                if alt and alt.get("id") != current.get("id"):
                    items[category] = alt
                    notes.append(f"为压住预算，已将 {category} 从 {current.get('brand')} {current.get('model')} 调整为 {alt.get('brand')} {alt.get('model')}")
                    changed = True
                    if self._calculate_total(items) <= budget:
                        return notes
            if not changed:
                break

        return notes

    def _find_compatible_hardware(
        self,
        category: str,
        criteria: Dict[str, Any],
        max_price: float,
        price_ceiling: Optional[float] = None,
        prefer_cheaper: bool = False
    ) -> Optional[Dict]:
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
                if k == "supportsFormFactor":
                    if not self._form_factor_fits(self._spec_value(cand_specs, "formFactor", "form_factor"), v):
                        match = False
                        break
                    continue
                if k == "minMaxGpuLength":
                    max_len = self._extract_number(self._spec_value(cand_specs, "maxGpuLength"))
                    if max_len and max_len < float(v):
                        match = False
                        break
                    continue
                if k == "minMaxCoolerHeight":
                    max_height = self._extract_number(self._spec_value(cand_specs, "maxCoolerHeight", "maxCpuHeight"))
                    if max_height and max_height < float(v):
                        match = False
                        break
                    continue
                if k == "minWattage":
                    wattage = self._extract_number(self._spec_value(cand_specs, "wattage", "ratedPower"))
                    if not wattage or wattage < float(v):
                        match = False
                        break
                    continue
                cand_value = self._spec_value(cand_specs, k, "socket_type" if k == "socket" else k, "ram_type" if k == "memoryType" else k)
                if str(cand_value).upper() != str(v).upper():
                    match = False
                    break
            if match and (price_ceiling is None or cand.price <= price_ceiling):
                eligible.append(cand)
        
        if not eligible: return None
        
        if prefer_cheaper:
            eligible.sort(key=lambda x: (x.price, x.sortOrder))
        else:
            eligible.sort(key=lambda x: abs(x.price - max_price))
        best = eligible[0]
        return self._hardware_to_result(best)

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
你的任务是根据我提供的【今日硬件真盘数据】以及【行业最新快讯（选填）】，生成一套用于全网矩阵分发的“今日搞机快报”。

**【核心纪律一：数据绝对敏感】**
如果有真实降价数据传入，**绝对不许**说出“今日无大幅变动”、“大盘稳定”这种蠢话！必须在开篇直接报出降幅最大的硬件型号及具体降价金额，营造抢购或崩盘的紧张氛围！使用黑话如“高台跳水”、“大冤种接盘”等。

**【核心纪律二：排版结构强控】**
你必须生成 4 种平台的专属文案（严格以 JSON 格式返回）。
特别注意：现在的图文平台（公众号/小红书）已经进入**读图时代**！绝对禁止长篇大论！

- `video_script`: 抖音/B站口播解说稿。
  - 开头必须带分镜指导，如 `【画面：直接全屏展示红绿相间的今日大盘Excel表】`
  - 如果用户传入了“行业硬核快讯”，你必须把它作为这期视频的**主线剧本或爆点引入**，极其自然地揉进解说词里，与价格跳水行情结合起来谈！

- `official_account`: 微信公众号推文。
  - 必须采用**【极简图文看片模式】**！
  - 结构要求：每次提到一个重点硬件，必须单起一行写上 `[插入图片：具体品牌型号]`，然后在下方配上不超过 3 行的犀利辛辣点评。
  - 最后给出一套适配今天行情的装机配置单推荐。

- `xiaohongshu`: 小红书种草避坑文。
  - 必须采用**【拼图+短评模式】**！
  - 极其夸张的标题，满屏 Emoji。
  - 正文必须使用列表缩进，提到商品同样要用 `[图片：具体品牌型号]` 占位，短评要求情绪化、种草或拔草倾向明显。
  - 必须带至少 5 个 #硬件 #装机 #电脑配置 标签。

- `moments`: 朋友圈速报。极致浓缩为3句话内，引导客户私聊定盘。

- `article_title`: 一个极具吸引力、带点夸张擦边球的爆款标题。

- `relevant_hardware_models`: 【极其重要】请从你写的文案中，提取出你今天着重拉出来“审判”或“种草”的主角级别硬件，输出一个纯字符串数组。我们将用它去后台替你抓取高清去背图。
  - 必须是精确到名字，例如：`["金百达 银爵 3600", "华硕 4070Ti", "AMD 9950X"]`。
  - 最多列出 5 个！

**你只能返回一个包含上述六个字段的纯 JSON 对象（不要包装 ```json）：**
{
    "article_title": "...",
    "official_account": "...",
    "moments": "...",
    "xiaohongshu": "...",
    "video_script": "...",
    "relevant_hardware_models": ["...", "..."]
}
"""
        import json
        import re
        
        data_context = f"【今日内部大盘真实价格浮动数据（请务必仔细审阅降幅列）】\n{json.dumps(daily_data, ensure_ascii=False, indent=2)}\n\n"
        if external_news and external_news.strip():
            data_context += f"【全网今日行业硬核快讯（警告：必须将其作为核心爆点揉入 video_script）】\n{external_news}\n"
        
        user_prompt = f"{data_context}\n\n请严格遵守【图文看片模式】和【数据绝对敏感】纪律，立刻返回包含 6 个字段的 JSON！"
        
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
